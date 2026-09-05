(function (globalScope) {
  'use strict';

  const STORAGE_KEY = 'salaryHijackingPartnerInquiriesV1';
  const FEATURE_CONTENT = {
    salary: {
      src: 'assets/images/screens/plan-home.webp',
      alt: '급여납치 계획 화면: 급여와 고정지출, 저축 및 생활비 계획을 보여주는 화면',
      kicker: 'PLAN',
      title: '이번 달 계획을 한 번에',
      description: '급여, 고정지출, 저축, 생활비를 한 화면에서 확인합니다.',
      offset: '0px',
    },
    fixed: {
      src: 'assets/images/screens/plan-home.webp',
      alt: '급여납치 계획 화면: 월별 고정지출과 고정저축 계획을 보여주는 화면',
      kicker: 'FIXED MONEY',
      title: '나갈 돈과 지킬 돈을 먼저 분리',
      description: '구독·대출·보험·저축 계획을 월 단위로 관리합니다.',
      offset: '-360px',
    },
    daily: {
      src: 'assets/images/screens/salary-home.webp',
      alt: '급여납치 급여 홈 화면: 일일 사용 예산과 오늘 남은 금액을 보여주는 화면',
      kicker: 'DAILY BUDGET',
      title: '오늘 쓸 수 있는 금액을 바로',
      description: '사용할 때마다 남은 금액과 예산 초과 위험을 재계산합니다.',
      offset: '-555px',
    },
    expense: {
      src: 'assets/images/screens/salary-home.webp',
      alt: '급여납치 급여 홈 화면: 오늘의 변동지출 목록과 빠른 지출 추가 기능을 보여주는 화면',
      kicker: 'EXPENSE',
      title: '기록하는 즉시 잔액에 반영',
      description: '식사·교통·쇼핑 등의 변동지출을 빠르게 추가합니다.',
      offset: '-650px',
    },
    notification: {
      src: 'assets/images/screens/my-home.webp',
      alt: '급여납치 마이페이지 화면: 누적 성과와 알림·계정 관리 진입을 보여주는 화면',
      kicker: 'RESULT',
      title: '한 달의 성과를 놓치지 않게',
      description: '목표 달성, 예산 상태와 누적 기록을 확인합니다.',
      offset: '-430px',
    },
  };

  function normalizeText(value, maxLength = 2000) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
      .slice(0, maxLength);
  }

  function isValidEmail(value) {
    const email = normalizeText(value, 120);
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function validateInquiry(values) {
    const errors = {};
    const companyName = normalizeText(values.companyName, 80);
    const contactName = normalizeText(values.contactName, 40);
    const contactEmail = normalizeText(values.contactEmail, 120);
    const contactPhone = normalizeText(values.contactPhone, 30);
    const inquiryType = normalizeText(values.inquiryType, 40);
    const inquiryMessage = normalizeText(values.inquiryMessage, 2000);

    if (!companyName) errors.companyName = '회사 또는 기관명을 입력해주세요.';
    if (!contactName) errors.contactName = '담당자명을 입력해주세요.';
    if (!contactEmail) errors.contactEmail = '이메일을 입력해주세요.';
    else if (!isValidEmail(contactEmail)) errors.contactEmail = '올바른 이메일 형식으로 입력해주세요.';
    if (contactPhone && !/^[0-9+()\-\s]{7,30}$/.test(contactPhone)) {
      errors.contactPhone = '연락처는 숫자와 하이픈을 사용해 입력해주세요.';
    }
    if (!inquiryType) errors.inquiryType = '문의 유형을 선택해주세요.';
    if (!inquiryMessage) errors.inquiryMessage = '제안 내용을 입력해주세요.';
    else if (inquiryMessage.length < 10) errors.inquiryMessage = '제안 내용을 10자 이상 입력해주세요.';
    if (!values.privacyConsent) errors.privacyConsent = '개인정보 수집·이용 안내에 동의해주세요.';

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      data: {
        companyName,
        contactName,
        contactEmail,
        contactPhone,
        inquiryType,
        inquiryMessage,
        privacyConsent: Boolean(values.privacyConsent),
      },
    };
  }

  function generateInquiryId(date = new Date(), randomValue = Math.random()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const suffix = Math.floor(Math.max(0, Math.min(0.999999, Number(randomValue) || 0)) * 1000000)
      .toString()
      .padStart(6, '0');
    return `SH-${yyyy}${mm}${dd}-${suffix}`;
  }

  function safeJSONParse(raw, fallback) {
    try {
      const parsed = JSON.parse(String(raw || ''));
      return parsed == null ? fallback : parsed;
    } catch (_error) {
      return fallback;
    }
  }

  function saveInquiry(storage, data, now = new Date()) {
    const item = {
      id: generateInquiryId(now),
      ...data,
      createdAt: now.toISOString(),
      storageMode: 'browser-local-prototype',
    };
    const current = safeJSONParse(storage.getItem(STORAGE_KEY), []);
    const list = Array.isArray(current) ? current.slice(-19) : [];
    list.push(item);
    storage.setItem(STORAGE_KEY, JSON.stringify(list));
    return item;
  }

  function getStorage() {
    try {
      const testKey = '__salary_hijacking_storage_test__';
      globalScope.localStorage.setItem(testKey, '1');
      globalScope.localStorage.removeItem(testKey);
      return globalScope.localStorage;
    } catch (_error) {
      const memory = new Map();
      return {
        getItem(key) { return memory.has(key) ? memory.get(key) : null; },
        setItem(key, value) { memory.set(key, String(value)); },
        removeItem(key) { memory.delete(key); },
      };
    }
  }

  function showToast(message) {
    if (typeof document === 'undefined') return;
    const region = document.querySelector('[data-toast-region]');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.textContent = normalizeText(message, 240);
    region.appendChild(toast);
    globalScope.setTimeout(() => toast.remove(), 4200);
  }

  function formatWon(value) {
    return `${Math.round(Number(value) || 0).toLocaleString('ko-KR')}원`;
  }

  function initHeaderAndTopButton() {
    const header = document.querySelector('[data-site-header]');
    const topButton = document.querySelector('[data-back-to-top]');
    const update = () => {
      const scrolled = globalScope.scrollY > 28;
      header?.classList.toggle('is-scrolled', scrolled);
      topButton?.classList.toggle('is-visible', globalScope.scrollY > 560);
    };
    update();
    globalScope.addEventListener('scroll', update, { passive: true });
    topButton?.addEventListener('click', () => globalScope.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function initReveal() {
    document.documentElement.classList.add('reveal-ready');
    const elements = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!elements.length) return;
    if (!('IntersectionObserver' in globalScope)) {
      elements.forEach((element) => element.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    elements.forEach((element) => observer.observe(element));
    globalScope.setTimeout(() => {
      elements.forEach((element) => element.classList.add('is-revealed'));
    }, 2200);
  }

  function initCounters() {
    const counters = Array.from(document.querySelectorAll('[data-counter]'));
    if (!counters.length) return;
    counters.forEach((counter) => {
      counter.textContent = counter.dataset.format === 'won' ? '0원' : '0';
    });
    const animate = (element) => {
      if (element.dataset.counted === 'true') return;
      element.dataset.counted = 'true';
      const target = Number(element.dataset.counter) || 0;
      const duration = 1100;
      const started = performance.now();
      const draw = (time) => {
        const progress = Math.min(1, (time - started) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;
        element.textContent = element.dataset.format === 'won' ? formatWon(current) : Math.round(current).toLocaleString('ko-KR');
        if (progress < 1) globalScope.requestAnimationFrame(draw);
      };
      globalScope.requestAnimationFrame(draw);
    };
    if (!('IntersectionObserver' in globalScope)) {
      counters.forEach(animate);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.55 });
    counters.forEach((counter) => observer.observe(counter));
  }

  function initFeatureShowcase() {
    const items = Array.from(document.querySelectorAll('[data-feature]'));
    const image = document.querySelector('[data-feature-image]');
    const kicker = document.querySelector('[data-feature-kicker]');
    const title = document.querySelector('[data-feature-title]');
    const description = document.querySelector('[data-feature-description]');
    if (!items.length || !image || !kicker || !title || !description) return;

    const activate = (key, activeItem) => {
      const data = FEATURE_CONTENT[key];
      if (!data) return;
      items.forEach((item) => {
        const active = item === activeItem;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      image.src = data.src;
      image.alt = data.alt;
      image.style.transform = `translateY(${data.offset})`;
      kicker.textContent = data.kicker;
      title.textContent = data.title;
      description.textContent = data.description;
    };

    items.forEach((item) => {
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-pressed', String(item.classList.contains('is-active')));
      const run = () => activate(item.dataset.feature, item);
      item.addEventListener('click', run);
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          run();
        }
      });
    });
  }

  function setFieldError(form, name, message) {
    const field = form.elements.namedItem(name);
    const error = form.querySelector(`[data-error-for="${name}"]`);
    if (field && 'setAttribute' in field) field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message || '';
  }

  function initInquiryForm() {
    const form = document.getElementById('partnerInquiryForm');
    if (!form) return;
    const message = form.elements.namedItem('inquiryMessage');
    const counter = form.querySelector('[data-message-count]');
    const resultBox = form.querySelector('[data-form-result]');
    const storage = getStorage();

    const updateCount = () => {
      if (counter && message) counter.textContent = String(String(message.value || '').length);
    };
    message?.addEventListener('input', updateCount);
    updateCount();

    Array.from(form.elements).forEach((element) => {
      if (!element.name) return;
      element.addEventListener('input', () => setFieldError(form, element.name, ''));
      element.addEventListener('change', () => setFieldError(form, element.name, ''));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form).entries());
      values.privacyConsent = Boolean(form.elements.namedItem('privacyConsent')?.checked);
      const validation = validateInquiry(values);
      ['companyName', 'contactName', 'contactEmail', 'contactPhone', 'inquiryType', 'inquiryMessage', 'privacyConsent']
        .forEach((name) => setFieldError(form, name, validation.errors[name] || ''));

      if (!validation.valid) {
        const firstInvalid = form.querySelector('[aria-invalid="true"]');
        firstInvalid?.focus();
        if (resultBox) {
          resultBox.hidden = false;
          resultBox.classList.add('is-error');
          resultBox.textContent = '입력 내용을 확인해주세요. 표시된 항목을 수정하면 임시 저장할 수 있습니다.';
        }
        showToast('문의 양식의 필수 항목을 확인해주세요.');
        return;
      }

      try {
        const saved = saveInquiry(storage, validation.data);
        form.reset();
        updateCount();
        if (resultBox) {
          resultBox.hidden = false;
          resultBox.classList.remove('is-error');
          resultBox.textContent = `문의 시안이 이 브라우저에 임시 저장되었습니다. 접수 예시번호는 ${saved.id}입니다. 실제 발송은 운영 API 연결 후 동작합니다.`;
        }
        showToast('제휴 문의 시안이 브라우저에 임시 저장되었습니다.');
      } catch (_error) {
        if (resultBox) {
          resultBox.hidden = false;
          resultBox.classList.add('is-error');
          resultBox.textContent = '브라우저 저장소를 사용할 수 없어 내용을 저장하지 못했습니다. support@salaryhijacking.com으로 문의해주세요.';
        }
        showToast('임시 저장에 실패했습니다.');
      }
    });
  }

  function initFaq() {
    document.querySelectorAll('[data-faq-toggle]').forEach((button) => {
      const panelId = button.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      if (!panel) return;
      button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!open));
        panel.hidden = open;
      });
    });
  }

  function init() {
    if (typeof document === 'undefined') return;
    initHeaderAndTopButton();
    initReveal();
    initCounters();
    initFeatureShowcase();
    initInquiryForm();
    initFaq();
  }

  const api = {
    STORAGE_KEY,
    normalizeText,
    isValidEmail,
    validateInquiry,
    generateInquiryId,
    safeJSONParse,
    saveInquiry,
    formatWon,
  };

  globalScope.SalaryHijackingSite = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
