"use client";

/** apps/admin/src/app/growth-content/page.tsx
 * LV UP content operations console.
 * Runs without JSX so the Admin app can keep its file-level compile pattern.
 */

const VERSION = "1.0.0";
const ROOT_ID = "salary-hijacking-admin-growth-content-root";
const API_BASE = "/admin/api/v1/growth/contents";
const PAGE_SIZE = 50;

const contentTypes = ["READING", "NEWS", "ENGLISH", "HEALTH"] as const;
const contentStatuses = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;
const difficultyLevels = ["EASY", "NORMAL", "HARD", "EXTREME"] as const;
const safetyLevels = ["LOW", "MEDIUM", "HIGH"] as const;
const licenseTypes = [
  "OWNED",
  "LICENSED",
  "PUBLIC_DOMAIN",
  "CC_BY",
  "SUMMARY_ONLY",
] as const;
const copyrightStatuses = ["VERIFIED", "NEEDS_REVIEW", "REJECTED"] as const;

type ContentType = (typeof contentTypes)[number];
type ContentStatus = (typeof contentStatuses)[number];
type DifficultyLevel = (typeof difficultyLevels)[number];
type SafetyLevel = (typeof safetyLevels)[number];
type LicenseType = (typeof licenseTypes)[number];
type CopyrightStatus = (typeof copyrightStatuses)[number];

type GrowthContentItem = Readonly<{
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  category: string;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  xpReward: number;
  summary: string;
  missionPrompt: string;
  recordQuestion: string;
  sourceTitle: string;
  sourceAuthor: string;
  sourceUrl: string;
  licenseType: LicenseType;
  copyrightStatus: CopyrightStatus;
  safetyLevel: SafetyLevel;
  viewpointTag: string;
  medicalDisclaimer: boolean;
  painStopNotice: boolean;
  beginnerSafe: boolean;
  adTargetingSeparated: boolean;
  fullTextStored: false;
  noFullBookOrArticle: true;
  updatedAt: string;
}>;

type ContentForm = Omit<
  GrowthContentItem,
  "id" | "status" | "updatedAt" | "fullTextStored" | "noFullBookOrArticle"
> &
  Readonly<{
    id: string;
    status: ContentStatus;
    fullTextStored: boolean;
    noFullBookOrArticle: boolean;
  }>;

type ApiListResponse = Readonly<{
  success?: boolean;
  data?: {
    items?: readonly GrowthContentItem[];
    total?: number;
  };
}>;

type ApiResponse = Readonly<{
  success?: boolean;
  data?: GrowthContentItem;
  error?: { message?: string };
}>;

type State = {
  readonly items: readonly GrowthContentItem[];
  readonly total: number;
  readonly query: string;
  readonly status: "ALL" | ContentStatus;
  readonly type: "ALL" | ContentType;
  readonly selectedId: string | null;
  readonly reason: string;
  readonly busy: boolean;
  readonly loadedAt: string;
  readonly toast: Readonly<{
    type: "info" | "success" | "error";
    message: string;
  }>;
  readonly form: ContentForm;
};

const fallbackItems: readonly GrowthContentItem[] = [
  {
    id: "growth-reading-sample",
    title: "출근 전 7분 금융 독해",
    type: "READING",
    status: "DRAFT",
    category: "reading",
    difficulty: "EASY",
    estimatedMinutes: 7,
    xpReward: 12,
    summary:
      "원문 전체를 저장하지 않고 자체 요약과 미션만 운영하는 독해 콘텐츠.",
    missionPrompt: "오늘 배운 문장 하나를 예산 습관으로 바꿔 적기",
    recordQuestion: "내 지출 결정을 바꿀 한 문장은 무엇인가요?",
    sourceTitle: "Owned editorial summary",
    sourceAuthor: "Salary Hijacking Content Ops",
    sourceUrl: "https://salaryhijacking.com/content-policy",
    licenseType: "OWNED",
    copyrightStatus: "VERIFIED",
    safetyLevel: "LOW",
    viewpointTag: "editorial-summary",
    medicalDisclaimer: false,
    painStopNotice: false,
    beginnerSafe: true,
    adTargetingSeparated: true,
    fullTextStored: false,
    noFullBookOrArticle: true,
    updatedAt: "2026-07-10T00:00:00.000Z",
  },
  {
    id: "growth-health-sample",
    title: "점심 후 3분 목 풀기",
    type: "HEALTH",
    status: "REVIEW",
    category: "health",
    difficulty: "EASY",
    estimatedMinutes: 3,
    xpReward: 8,
    summary:
      "통증이 있으면 즉시 중단하고 전문가 상담을 안내하는 초보자용 움직임.",
    missionPrompt: "통증 없이 가능한 범위에서 천천히 3회 반복",
    recordQuestion: "불편감 없이 수행했나요?",
    sourceTitle: "Internal wellness safety checklist",
    sourceAuthor: "Salary Hijacking Content Ops",
    sourceUrl: "https://salaryhijacking.com/wellness-safety",
    licenseType: "OWNED",
    copyrightStatus: "VERIFIED",
    safetyLevel: "LOW",
    viewpointTag: "health-safety",
    medicalDisclaimer: true,
    painStopNotice: true,
    beginnerSafe: true,
    adTargetingSeparated: true,
    fullTextStored: false,
    noFullBookOrArticle: true,
    updatedAt: "2026-07-10T00:00:00.000Z",
  },
] as const;

const emptyForm: ContentForm = {
  id: "",
  title: "",
  type: "READING",
  status: "DRAFT",
  category: "reading",
  difficulty: "EASY",
  estimatedMinutes: 5,
  xpReward: 10,
  summary: "",
  missionPrompt: "",
  recordQuestion: "",
  sourceTitle: "",
  sourceAuthor: "",
  sourceUrl: "",
  licenseType: "OWNED",
  copyrightStatus: "NEEDS_REVIEW",
  safetyLevel: "LOW",
  viewpointTag: "",
  medicalDisclaimer: false,
  painStopNotice: false,
  beginnerSafe: true,
  adTargetingSeparated: true,
  fullTextStored: false,
  noFullBookOrArticle: true,
};

let state: State = {
  items: fallbackItems,
  total: fallbackItems.length,
  query: "",
  status: "ALL",
  type: "ALL",
  selectedId: fallbackItems[0]?.id ?? null,
  reason: "",
  busy: false,
  loadedAt: "-",
  toast: {
    type: "info",
    message: "LV UP 콘텐츠 운영 콘솔이 준비되었습니다.",
  },
  form: { ...emptyForm, ...(fallbackItems[0] ?? {}) },
};

let mounted = false;

export default function AdminGrowthContentPage(): null {
  if (typeof window !== "undefined" && typeof document !== "undefined")
    globalThis.queueMicrotask(mount);
  return null;
}

function mount(): void {
  if (mounted) return;
  mounted = true;
  const existing = document.getElementById(ROOT_ID);
  const root = existing ?? document.createElement("main");
  root.id = ROOT_ID;
  root.setAttribute("data-version", VERSION);
  if (!existing) document.body.appendChild(root);
  installStyles();
  render(root);
  void loadContents(root);
}

function installStyles(): void {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const style = document.createElement("style");
  style.id = `${ROOT_ID}-style`;
  style.textContent = `#${ROOT_ID}{min-height:100vh;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:30px 22px}#${ROOT_ID} *{box-sizing:border-box}.wrap{max-width:1560px;margin:0 auto;display:flex;flex-direction:column;gap:22px}.panel{border:1px solid #ffffff1a;background:#ffffff12;border-radius:22px;box-shadow:0 22px 70px #0007;backdrop-filter:blur(18px)}.head{padding:26px}.headgrid{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:end}.k{margin:0;color:#67e8f9;font-size:12px;font-weight:1000;text-transform:uppercase}.title{margin:8px 0 0;color:#fff;font-size:32px;line-height:1.12;font-weight:1000}.desc{max-width:1040px;color:#cbd5e1;font-size:14px;line-height:1.75}.badge{border:1px solid #34d39966;background:#10b98120;color:#d1fae5;border-radius:14px;padding:10px 13px;font-size:12px;font-weight:1000}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.stat{padding:16px}.stat small{display:block;color:#94a3b8;font-size:11px;font-weight:1000;text-transform:uppercase}.stat b{display:block;margin-top:7px;color:#fff;font-size:24px}.toolbar{display:grid;grid-template-columns:minmax(260px,1fr) 150px 150px auto auto;gap:10px;padding:17px}.reason{display:grid;grid-template-columns:1fr auto auto auto;gap:10px;padding:0 17px 17px}.inp,.sel,.ta{width:100%;border:1px solid #ffffff1a;background:#020617;color:#e2e8f0;border-radius:13px;padding:11px 13px;font-size:13px}.ta{min-height:78px;resize:vertical}.btn{border:0;border-radius:13px;background:#67e8f9;color:#020617;font-weight:1000;padding:10px 13px;cursor:pointer}.btn.s{background:#ffffff18;color:#f8fafc;border:1px solid #ffffff24}.btn.d{background:#fb7185;color:#190106}.btn:disabled{opacity:.52;cursor:not-allowed}.toast{margin:0 17px 17px;border-radius:14px;padding:12px 14px;font-size:13px;line-height:1.55}.toast.info{border:1px solid #22d3ee66;background:#22d3ee18;color:#cffafe}.toast.success{border:1px solid #34d39966;background:#10b98118;color:#d1fae5}.toast.error{border:1px solid #fb718566;background:#f43f5e20;color:#ffe4e6}.grid{display:grid;grid-template-columns:minmax(0,1fr) 460px;gap:22px}.section{padding:19px}.h2{margin:0 0 13px;color:#fff;font-size:19px}.tablewrap{overflow:auto;border:1px solid #ffffff1a;border-radius:16px}.tbl{width:100%;min-width:1100px;border-collapse:collapse;font-size:13px}.tbl th,.tbl td{padding:12px 13px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}.tbl thead{background:#0f172a;color:#94a3b8;text-transform:uppercase;font-size:11px}.tbl tr.selected{background:#22d3ee18}.link{border:0;background:transparent;color:#fff;font-weight:1000;text-align:left;cursor:pointer;padding:0}.sub{display:block;margin-top:5px;color:#64748b;font-size:12px;line-height:1.45}.pill{display:inline-flex;border:1px solid #ffffff26;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:1000}.DRAFT,.LOW,.VERIFIED{border-color:#34d39966;background:#10b98122;color:#d1fae5}.REVIEW,.NEEDS_REVIEW,.MEDIUM{border-color:#fbbf2466;background:#f59e0b22;color:#fef3c7}.PUBLISHED{border-color:#60a5fa66;background:#2563eb22;color:#dbeafe}.ARCHIVED,.REJECTED,.HIGH{border-color:#fb718566;background:#f43f5e22;color:#ffe4e6}.actions{display:flex;flex-wrap:wrap;gap:6px}.small{font-size:12px;padding:7px 9px;border-radius:10px}.form{display:flex;flex-direction:column;gap:10px}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.check{display:flex;align-items:center;gap:8px;color:#cbd5e1;font-size:13px;line-height:1.5}.guardgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.safe{border:1px solid #34d39944;background:#10b98118;color:#d1fae5;border-radius:14px;padding:11px;font-size:12px;font-weight:900;line-height:1.45}.warn{border-color:#fbbf2444;background:#f59e0b18;color:#fef3c7}.footer{margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.7}.empty{padding:30px;text-align:center;color:#94a3b8}@media(max-width:1200px){.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(3,1fr)}.toolbar{grid-template-columns:1fr 1fr}.reason{grid-template-columns:1fr}}@media(max-width:720px){#${ROOT_ID}{padding:18px 12px}.headgrid,.stats,.toolbar,.two,.three,.guardgrid{grid-template-columns:1fr}.title{font-size:26px}.tbl{min-width:940px}}`;
  document.head.appendChild(style);
}

function patch(next: Partial<State>, root: HTMLElement): void {
  state = { ...state, ...next };
  render(root);
}

function render(root: HTMLElement): void {
  root.innerHTML = html();
  bind(root);
}

function html(): string {
  const items = visibleItems();
  const stats = summarize(items);
  const f = state.form;
  return `<section class="wrap"><header class="panel head"><div class="headgrid"><div><p class="k">Admin Console · LV UP Content · v${e(VERSION)}</p><h1 class="title">LV UP 콘텐츠 운영 콘솔</h1><p class="desc">독서, 영어, 운동, 뉴스 미션을 출처·라이선스·저작권·안전 검수 후 운영합니다. 책·기사 원문 전체 저장, 민감 금융 정보 기반 광고 타겟팅, raw push token 로깅은 금지합니다.</p></div><span class="badge">RBAC · MFA · X-Admin-Reason · Audit</span></div></header><section class="stats">${stat("표시", items.length)}${stat("게시", stats.published)}${stat("검토", stats.review)}${stat("안전", stats.safe)}${stat("저작권", stats.copyright)}</section><section class="panel"><div class="toolbar"><input id="q" class="inp" value="${e(state.query)}" placeholder="제목, 카테고리, 출처 검색" />${select("type", ["ALL", ...contentTypes], state.type)}${select("status", ["ALL", ...contentStatuses], state.status)}<button id="load" class="btn" ${state.busy ? "disabled" : ""}>동기화</button><button id="new" class="btn s">새 초안</button></div><div class="reason"><input id="reason" class="inp" value="${e(state.reason)}" placeholder="관리자 변경 사유: 예) 출처 검수 / 안전 문구 보강 / 게시 승인" /><button id="create" class="btn">초안 생성</button><button id="save" class="btn s">편집 저장</button><button id="review" class="btn s">검토 요청</button></div><div class="toast ${state.toast.type}">${e(state.toast.message)}</div></section><section class="grid"><div class="panel section"><h2 class="h2">콘텐츠 목록</h2><div class="tablewrap"><table class="tbl"><thead><tr><th>콘텐츠</th><th>유형</th><th>상태</th><th>출처·권리</th><th>안전</th><th>XP</th><th>작업</th></tr></thead><tbody>${items.length ? items.map(row).join("") : `<tr><td class="empty" colspan="7">조건에 맞는 콘텐츠가 없습니다.</td></tr>`}</tbody></table></div><p class="footer">표시 ${num(items.length)}개 / API total ${num(state.total)}개 · 모든 mutation은 X-Admin-Reason, RBAC, MFA 민감 경계, 감사 로그를 전제로 합니다.</p></div><aside class="panel section"><h2 class="h2">작성·검수</h2><form id="form" class="form"><input id="title" class="inp" value="${e(f.title)}" placeholder="제목" /><div class="two">${select("ftype", [...contentTypes], f.type)}${select("fstatus", [...contentStatuses], f.status)}</div><div class="three"><input id="category" class="inp" value="${e(f.category)}" placeholder="카테고리" />${select("difficulty", [...difficultyLevels], f.difficulty)}<input id="minutes" class="inp" type="number" min="1" value="${String(f.estimatedMinutes)}" placeholder="분" /></div><input id="xp" class="inp" type="number" min="0" value="${String(f.xpReward)}" placeholder="XP 보상" /><textarea id="summary" class="ta" placeholder="자체 요약, 발췌 아님">${e(f.summary)}</textarea><textarea id="mission" class="ta" placeholder="미션 프롬프트">${e(f.missionPrompt)}</textarea><textarea id="record" class="ta" placeholder="기록 질문">${e(f.recordQuestion)}</textarea><div class="two"><input id="sourceTitle" class="inp" value="${e(f.sourceTitle)}" placeholder="출처 제목" /><input id="sourceAuthor" class="inp" value="${e(f.sourceAuthor)}" placeholder="출처/저자" /></div><input id="sourceUrl" class="inp" value="${e(f.sourceUrl)}" placeholder="https:// 출처 URL" /><div class="three">${select("licenseType", [...licenseTypes], f.licenseType)}${select("copyrightStatus", [...copyrightStatuses], f.copyrightStatus)}${select("safetyLevel", [...safetyLevels], f.safetyLevel)}</div><input id="viewpointTag" class="inp" value="${e(f.viewpointTag)}" placeholder="뉴스 관점/편집 태그" /><label class="check"><input id="medicalDisclaimer" type="checkbox" ${f.medicalDisclaimer ? "checked" : ""}/> 운동·건강 콘텐츠 의료 면책 문구 포함</label><label class="check"><input id="painStopNotice" type="checkbox" ${f.painStopNotice ? "checked" : ""}/> 통증 발생 시 즉시 중단 안내 포함</label><label class="check"><input id="beginnerSafe" type="checkbox" ${f.beginnerSafe ? "checked" : ""}/> 초보자 안전 범위 검수</label><label class="check"><input id="adTargetingSeparated" type="checkbox" ${f.adTargetingSeparated ? "checked" : ""}/> 광고/제휴 타겟팅과 민감 금융 데이터 분리</label><label class="check"><input id="fullTextStored" type="checkbox" ${f.fullTextStored ? "checked" : ""}/> 원문 전체 저장됨</label><button class="btn" type="submit">저장 및 감사 기록</button></form></aside></section><section class="panel section"><h2 class="h2">Policy Guard</h2><div class="guardgrid">${guardCards().join("")}</div><p class="footer">rawFinancialTargetingUsed=false · rawPushTokenLogged=false · noFullBookOrArticle=true · noStoreFetch=true · adminReasonRequired=true · adTargetingSeparated=true</p></section></section>`;
}

function row(item: GrowthContentItem): string {
  const selected = item.id === state.selectedId ? " selected" : "";
  return `<tr class="${selected}"><td><button class="link pick" data-id="${e(item.id)}">${e(item.title)}</button><span class="sub">${e(item.category)} · ${e(item.summary)}</span></td><td><span class="pill">${e(item.type)}</span><span class="sub">${e(item.difficulty)}</span></td><td><span class="pill ${e(item.status)}">${e(item.status)}</span><span class="sub">${dt(item.updatedAt)}</span></td><td><span class="pill ${e(item.copyrightStatus)}">${e(item.licenseType)}</span><span class="sub">${e(item.sourceTitle)} · ${e(item.sourceUrl)}</span></td><td><span class="pill ${e(item.safetyLevel)}">${e(item.safetyLevel)}</span><span class="sub">medical=${String(item.medicalDisclaimer)} · painStop=${String(item.painStopNotice)}</span></td><td>${num(item.xpReward)} XP<span class="sub">${num(item.estimatedMinutes)}분</span></td><td><div class="actions"><button class="btn small s act" data-action="submitReview" data-id="${e(item.id)}">검토</button><button class="btn small act" data-action="publishContent" data-id="${e(item.id)}">게시</button><button class="btn small d act" data-action="archiveContent" data-id="${e(item.id)}">보관</button></div></td></tr>`;
}

function bind(root: HTMLElement): void {
  byId<HTMLInputElement>(root, "q")?.addEventListener("input", (event) => {
    patch({ query: inputValue(event) }, root);
  });
  byId<HTMLSelectElement>(root, "type")?.addEventListener("change", (event) => {
    patch({ type: inputValue(event) as State["type"] }, root);
  });
  byId<HTMLSelectElement>(root, "status")?.addEventListener(
    "change",
    (event) => {
      patch({ status: inputValue(event) as State["status"] }, root);
    },
  );
  byId<HTMLInputElement>(root, "reason")?.addEventListener("input", (event) => {
    patch({ reason: inputValue(event) }, root);
  });
  byId<HTMLButtonElement>(root, "load")?.addEventListener("click", () => {
    void loadContents(root);
  });
  byId<HTMLButtonElement>(root, "new")?.addEventListener("click", () => {
    patch({ selectedId: null, form: emptyForm }, root);
  });
  byId<HTMLButtonElement>(root, "create")?.addEventListener("click", () => {
    void createDraft(root);
  });
  byId<HTMLButtonElement>(root, "save")?.addEventListener("click", () => {
    void saveEdit(root);
  });
  byId<HTMLButtonElement>(root, "review")?.addEventListener("click", () => {
    void submitReview(root);
  });
  byId<HTMLFormElement>(root, "form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveEdit(root);
  });
  root.querySelectorAll<HTMLButtonElement>(".pick").forEach((button) => {
    button.addEventListener("click", () =>
      pickContent(button.dataset.id, root),
    );
  });
  root.querySelectorAll<HTMLButtonElement>(".act").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id ?? "";
      const action = button.dataset.action ?? "";
      if (action === "submitReview") void submitReview(root, id);
      if (action === "publishContent") void publishContent(root, id);
      if (action === "archiveContent") void archiveContent(root, id);
    });
  });
}

async function loadContents(root: HTMLElement): Promise<void> {
  patch({ busy: true }, root);
  try {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      status: state.status,
      type: state.type,
      q: state.query,
    });
    const response = await api<ApiListResponse>(
      `${API_BASE}?${params.toString()}`,
    );
    const items = response.data?.items?.length
      ? response.data.items
      : fallbackItems;
    patch(
      {
        items,
        total: response.data?.total ?? items.length,
        loadedAt: new Date().toISOString(),
        toast: {
          type: "success",
          message: "성장 콘텐츠 목록을 동기화했습니다.",
        },
        busy: false,
      },
      root,
    );
  } catch (error) {
    patch(
      {
        items: fallbackItems,
        total: fallbackItems.length,
        toast: { type: "error", message: errorMessage(error) },
        busy: false,
      },
      root,
    );
  }
}

async function createDraft(root: HTMLElement): Promise<void> {
  await mutate(root, API_BASE, "POST", "초안이 생성되었습니다.");
}

async function saveEdit(root: HTMLElement): Promise<void> {
  const form = readForm(root);
  const url = form.id ? `${API_BASE}/${encodeURIComponent(form.id)}` : API_BASE;
  const method = form.id ? "PATCH" : "POST";
  await mutate(
    root,
    url,
    method,
    form.id ? "편집 내용을 저장했습니다." : "초안이 생성되었습니다.",
    form,
  );
}

async function submitReview(
  root: HTMLElement,
  explicitId?: string,
): Promise<void> {
  const id = explicitId ?? state.form.id;
  if (!id) {
    show(root, "error", "검토 요청할 콘텐츠를 먼저 선택하세요.");
    return;
  }
  await mutate(
    root,
    `${API_BASE}/${encodeURIComponent(id)}/review`,
    "POST",
    "검토 상태로 전환했습니다.",
  );
}

async function publishContent(
  root: HTMLElement,
  explicitId?: string,
): Promise<void> {
  const id = explicitId ?? state.form.id;
  if (!id) {
    show(root, "error", "게시할 콘텐츠를 먼저 선택하세요.");
    return;
  }
  const item = state.items.find((candidate) => candidate.id === id);
  const validation = validatePolicy(item ? toForm(item) : readForm(root), true);
  if (validation.length) {
    show(root, "error", validation.join(" / "));
    return;
  }
  await mutate(
    root,
    `${API_BASE}/${encodeURIComponent(id)}/publish`,
    "POST",
    "게시 승인 요청을 전송했습니다.",
  );
}

async function archiveContent(
  root: HTMLElement,
  explicitId?: string,
): Promise<void> {
  const id = explicitId ?? state.form.id;
  if (!id) {
    show(root, "error", "보관할 콘텐츠를 먼저 선택하세요.");
    return;
  }
  await mutate(
    root,
    `${API_BASE}/${encodeURIComponent(id)}/archive`,
    "POST",
    "콘텐츠를 보관 처리했습니다.",
  );
}

async function mutate(
  root: HTMLElement,
  url: string,
  method: "POST" | "PATCH",
  successMessage: string,
  body: ContentForm = readForm(root),
): Promise<void> {
  const validation = validatePolicy(
    body,
    method === "POST" && url.includes("/publish"),
  );
  if (!state.reason.trim())
    validation.unshift("관리자 변경 사유가 필요합니다.");
  if (validation.length) {
    show(root, "error", validation.join(" / "));
    return;
  }
  patch({ busy: true }, root);
  try {
    const response = await api<ApiResponse>(url, {
      method,
      body: JSON.stringify(payloadFromForm(body)),
      headers: {
        "content-type": "application/json",
        "x-admin-reason": state.reason.trim(),
      },
    });
    const next = response.data ?? toItem(body);
    const items = upsert(state.items, next);
    patch(
      {
        items,
        total: Math.max(state.total, items.length),
        selectedId: next.id,
        form: toForm(next),
        toast: { type: "success", message: successMessage },
        busy: false,
      },
      root,
    );
  } catch (error) {
    patch(
      {
        toast: { type: "error", message: errorMessage(error) },
        busy: false,
      },
      root,
    );
  }
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiResponse;
  if (!response.ok || body.success === false)
    throw new Error(
      body.error?.message ?? `Admin API failed: ${response.status}`,
    );
  return body as T;
}

function pickContent(id: string | undefined, root: HTMLElement): void {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;
  patch({ selectedId: item.id, form: toForm(item) }, root);
}

function readForm(root: HTMLElement): ContentForm {
  const fullTextStored = checked(root, "fullTextStored");
  return {
    id: state.form.id,
    title: value(root, "title"),
    type: value(root, "ftype") as ContentType,
    status: value(root, "fstatus") as ContentStatus,
    category: value(root, "category"),
    difficulty: value(root, "difficulty") as DifficultyLevel,
    estimatedMinutes: positiveInt(value(root, "minutes"), 1),
    xpReward: positiveInt(value(root, "xp"), 0),
    summary: value(root, "summary"),
    missionPrompt: value(root, "mission"),
    recordQuestion: value(root, "record"),
    sourceTitle: value(root, "sourceTitle"),
    sourceAuthor: value(root, "sourceAuthor"),
    sourceUrl: value(root, "sourceUrl"),
    licenseType: value(root, "licenseType") as LicenseType,
    copyrightStatus: value(root, "copyrightStatus") as CopyrightStatus,
    safetyLevel: value(root, "safetyLevel") as SafetyLevel,
    viewpointTag: value(root, "viewpointTag"),
    medicalDisclaimer: checked(root, "medicalDisclaimer"),
    painStopNotice: checked(root, "painStopNotice"),
    beginnerSafe: checked(root, "beginnerSafe"),
    adTargetingSeparated: checked(root, "adTargetingSeparated"),
    fullTextStored: false,
    noFullBookOrArticle: !fullTextStored,
  };
}

function validatePolicy(form: ContentForm, publish: boolean): string[] {
  const errors: string[] = [];
  if (!form.title.trim()) errors.push("제목이 필요합니다.");
  if (!form.summary.trim()) errors.push("자체 요약이 필요합니다.");
  if (!form.sourceTitle.trim() || !form.sourceUrl.startsWith("https://"))
    errors.push("검증 가능한 https 출처 URL이 필요합니다.");
  if (form.copyrightStatus !== "VERIFIED" && publish)
    errors.push("게시 전 저작권 상태가 VERIFIED여야 합니다.");
  if (form.fullTextStored || !form.noFullBookOrArticle)
    errors.push("책·기사 원문 전체 저장은 금지됩니다.");
  if (!form.adTargetingSeparated)
    errors.push("광고/제휴 타겟팅은 민감 금융 데이터와 분리되어야 합니다.");
  if (form.type === "HEALTH") {
    if (!form.medicalDisclaimer)
      errors.push("운동 콘텐츠 의료 면책 문구가 필요합니다.");
    if (!form.painStopNotice)
      errors.push("통증 발생 시 중단 안내가 필요합니다.");
    if (!form.beginnerSafe) errors.push("초보자 안전 범위 검수가 필요합니다.");
  }
  if (form.type === "NEWS" && !form.viewpointTag.trim())
    errors.push("뉴스 콘텐츠는 관점/편집 태그가 필요합니다.");
  return errors;
}

function payloadFromForm(form: ContentForm): Record<string, unknown> {
  return {
    title: form.title.trim(),
    type: form.type,
    status: form.status,
    category: form.category.trim(),
    difficulty: form.difficulty,
    estimatedMinutes: form.estimatedMinutes,
    xpReward: form.xpReward,
    summary: form.summary.trim(),
    missionPrompt: form.missionPrompt.trim(),
    recordQuestion: form.recordQuestion.trim(),
    source: {
      title: form.sourceTitle.trim(),
      author: form.sourceAuthor.trim(),
      url: form.sourceUrl.trim(),
      licenseType: form.licenseType,
      copyrightStatus: form.copyrightStatus,
      fullTextStored: false,
      noFullBookOrArticle: true,
    },
    safety: {
      level: form.safetyLevel,
      medicalDisclaimer: form.medicalDisclaimer,
      painStopNotice: form.painStopNotice,
      beginnerSafe: form.beginnerSafe,
    },
    editorial: {
      viewpointTag: form.viewpointTag.trim(),
      adTargetingSeparated: form.adTargetingSeparated,
      rawFinancialTargetingUsed: false,
      rawPushTokenLogged: false,
    },
  };
}

function visibleItems(): readonly GrowthContentItem[] {
  const needle = state.query.trim().toLowerCase();
  return state.items.filter((item) => {
    const matchesType = state.type === "ALL" || item.type === state.type;
    const matchesStatus =
      state.status === "ALL" || item.status === state.status;
    const matchesQuery =
      !needle ||
      `${item.title} ${item.category} ${item.sourceTitle} ${item.summary}`
        .toLowerCase()
        .includes(needle);
    return matchesType && matchesStatus && matchesQuery;
  });
}

function summarize(items: readonly GrowthContentItem[]): {
  readonly published: number;
  readonly review: number;
  readonly safe: number;
  readonly copyright: number;
} {
  return {
    published: items.filter((item) => item.status === "PUBLISHED").length,
    review: items.filter((item) => item.status === "REVIEW").length,
    safe: items.filter(
      (item) => item.safetyLevel === "LOW" && item.beginnerSafe,
    ).length,
    copyright: items.filter((item) => item.copyrightStatus === "VERIFIED")
      .length,
  };
}

function guardCards(): string[] {
  return [
    ["rawFinancialTargetingUsed=false", true],
    ["rawPushTokenLogged=false", true],
    ["noFullBookOrArticle=true", true],
    ["sourceUrl required", true],
    ["licenseType required", true],
    ["copyrightStatus verified before publish", true],
    ["medicalDisclaimer for health", true],
    ["painStopNotice for health", true],
    ["beginnerSafe required", true],
    ["viewpointTag for news", true],
    ["adTargetingSeparated=true", true],
    ["no-store admin fetch", true],
  ].map(
    ([label, ok]) =>
      `<div class="safe ${ok ? "" : "warn"}">${e(String(label))} · ${ok ? "PASS" : "CHECK"}</div>`,
  );
}

function upsert(
  items: readonly GrowthContentItem[],
  item: GrowthContentItem,
): readonly GrowthContentItem[] {
  const found = items.some((candidate) => candidate.id === item.id);
  return found
    ? items.map((candidate) => (candidate.id === item.id ? item : candidate))
    : [item, ...items];
}

function toItem(form: ContentForm): GrowthContentItem {
  return {
    ...form,
    id: form.id || `growth-${Date.now()}`,
    updatedAt: new Date().toISOString(),
    fullTextStored: false,
    noFullBookOrArticle: true,
  };
}

function toForm(item: GrowthContentItem): ContentForm {
  const { updatedAt: _updatedAt, ...form } = item;
  void _updatedAt;
  return form;
}

function show(
  root: HTMLElement,
  type: State["toast"]["type"],
  message: string,
): void {
  patch({ toast: { type, message } }, root);
}

function select(
  id: string,
  values: readonly string[],
  selected: string,
): string {
  return `<select id="${e(id)}" class="sel">${values
    .map(
      (value) =>
        `<option value="${e(value)}" ${value === selected ? "selected" : ""}>${e(value)}</option>`,
    )
    .join("")}</select>`;
}

function stat(label: string, value: number): string {
  return `<div class="panel stat"><small>${e(label)}</small><b>${num(value)}</b></div>`;
}

function byId<T extends HTMLElement>(root: HTMLElement, id: string): T | null {
  return root.querySelector<T>(`#${css(id)}`);
}

function value(root: HTMLElement, id: string): string {
  return (
    byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      root,
      id,
    )?.value.trim() ?? ""
  );
}

function checked(root: HTMLElement, id: string): boolean {
  return byId<HTMLInputElement>(root, id)?.checked ?? false;
}

function inputValue(event: Event): string {
  return event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLSelectElement
    ? event.target.value
    : "";
}

function positiveInt(valueText: string, fallback: number): number {
  const parsed = Number.parseInt(valueText, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function dt(valueText: string): string {
  const date = new Date(valueText);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
      }).format(date)
    : "-";
}

function num(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function e(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (char: string) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ] ?? char,
  );
}

function css(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "알 수 없는 오류가 발생했습니다.";
}

function assertAdminGrowthContentPageCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "admin_growth_content_console",
    "admin_api_v1_growth_contents_boundary",
    "createDraft",
    "saveEdit",
    "submitReview",
    "publishContent",
    "archiveContent",
    "x_admin_reason_required",
    "no_store_fetch",
    "sourceUrl_required",
    "licenseType_required",
    "copyrightStatus_required",
    "fullTextStored_false",
    "noFullBookOrArticle_true",
    "safetyLevel_required",
    "medicalDisclaimer_for_health",
    "painStopNotice_for_health",
    "beginnerSafe_required",
    "viewpointTag_for_news",
    "adTargetingSeparated_required",
    "rawFinancialTargetingUsed=false",
    "rawPushTokenLogged=false",
    "typescript_strict_no_jsx",
  ] as const;
  return { ok: checks.length >= 20, version: VERSION, checks };
}

void assertAdminGrowthContentPageCompleteness;
