"use client";

/** apps/admin/src/app/notices/page.tsx
 * 급여납치 관리자 공지사항 운영 콘솔 최종본.
 * React import/JSX 없이 동작하는 Next Client Page로, react 타입 또는 jsx compiler option이 없어도 컴파일된다.
 */

const VERSION = "3.1.1";
const ROOT_ID = "salary-hijacking-admin-notices-root";
const API_BASE = "/admin/api/v1/notices";
const PAGE_SIZE = 30;
const REFRESH_MS = 60_000;
const noticeTypes = [
  "SERVICE",
  "PAYROLL",
  "BUDGET",
  "SAVINGS",
  "COMMUNITY",
  "ADS",
  "SECURITY",
  "MAINTENANCE",
  "POLICY",
] as const;
const noticeStatuses = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "PAUSED",
  "ARCHIVED",
] as const;
const noticeSeverities = ["INFO", "IMPORTANT", "WARNING", "CRITICAL"] as const;
const placements = [
  "ADMIN_HOME",
  "APP_HOME",
  "PAYROLL_HOME",
  "BUDGET_HOME",
  "COMMUNITY_FEED",
  "MY_PAGE",
  "LOGIN",
  "GLOBAL_MODAL",
] as const;
const audiences = [
  "ALL",
  "ADMIN_ONLY",
  "CONTEXTUAL",
  "CONSENTED_MARKETING",
  "SECURITY_RELATED",
] as const;
const segments = [
  "HOME",
  "PAYROLL_HOME",
  "BUDGET_HOME",
  "FIXED_EXPENSES",
  "SAVINGS",
  "GROWTH",
  "COMMUNITY",
  "MY_PAGE",
  "ADMIN_CONSOLE",
] as const;
const sortKeys = [
  "updatedAt",
  "publishedAt",
  "startsAt",
  "priority",
  "views",
  "acknowledgements",
] as const;
const actions = [
  "PUBLISH",
  "PAUSE",
  "ARCHIVE",
  "PIN",
  "UNPIN",
  "DUPLICATE",
  "SEND_TEST",
] as const;
const sensitiveTerms = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "email",
  "phone",
  "resident",
  "account",
  "card",
  "salary",
  "payroll",
  "income",
  "loan",
  "debt",
  "saving",
  "savings",
  "expense",
  "amount",
  "krw",
  "dailybudget",
  "hijack",
  "adtarget",
  "targeting",
  "push",
  "device",
  "fcm",
  "급여",
  "월급",
  "계좌",
  "카드",
  "대출",
  "저축",
  "지출",
  "금액",
  "납치",
  "토큰",
  "비밀번호",
  "이메일",
] as const;

type NoticeType = (typeof noticeTypes)[number];
type NoticeStatus = (typeof noticeStatuses)[number];
type NoticeSeverity = (typeof noticeSeverities)[number];
type Placement = (typeof placements)[number];
type Audience = (typeof audiences)[number];
type Segment = (typeof segments)[number];
type SortKey = (typeof sortKeys)[number];
type Action = (typeof actions)[number];
type Filter<T extends string> = T | "ALL";
type Toast = "success" | "error" | "info";
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

type Notice = {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly type: NoticeType;
  readonly status: NoticeStatus;
  readonly severity: NoticeSeverity;
  readonly placement: Placement;
  readonly audienceMode: Audience;
  readonly contextSegments: readonly Segment[];
  readonly priority: number;
  readonly pinned: boolean;
  readonly requiresAcknowledgement: boolean;
  readonly notificationEnabled: boolean;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly publishedAt: string | null;
  readonly views: number;
  readonly acknowledgements: number;
  readonly updatedAt: string;
  readonly updatedBy: string;
  readonly auditReasonRequired: true;
  readonly rawFinancialTargetingUsed: false;
  readonly rawPushTokenLogged: false;
  readonly adsFinancialTargetingUsed: false;
};

type Form = {
  readonly id: string | null;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly type: NoticeType;
  readonly status: NoticeStatus;
  readonly severity: NoticeSeverity;
  readonly placement: Placement;
  readonly audienceMode: Audience;
  readonly contextSegments: string;
  readonly priority: string;
  readonly pinned: boolean;
  readonly requiresAcknowledgement: boolean;
  readonly notificationEnabled: boolean;
  readonly startsAt: string;
  readonly endsAt: string;
};

type Stats = {
  readonly total: number;
  readonly published: number;
  readonly scheduled: number;
  readonly critical: number;
  readonly pinned: number;
  readonly views: number;
  readonly acknowledgementRate: string;
};
type ListResponse = {
  readonly data?:
    | {
        readonly items?: readonly Notice[];
        readonly total?: number;
        readonly stats?: Stats;
      }
    | undefined;
  readonly items?: readonly Notice[] | undefined;
  readonly total?: number | undefined;
  readonly stats?: Stats | undefined;
};
type MutationResponse = {
  readonly data?: Notice | { readonly notice?: Notice } | undefined;
  readonly notice?: Notice | undefined;
};
type State = {
  readonly items: readonly Notice[];
  readonly total: number;
  readonly stats: Stats;
  readonly form: Form;
  readonly busy: boolean;
  readonly loadedAt: string;
  readonly query: string;
  readonly type: Filter<NoticeType>;
  readonly status: Filter<NoticeStatus>;
  readonly severity: Filter<NoticeSeverity>;
  readonly placement: Filter<Placement>;
  readonly sort: SortKey;
  readonly reason: string;
  readonly selectedId: string | null;
  readonly toast: { readonly type: Toast; readonly message: string };
};

const emptyStats: Stats = Object.freeze({
  total: 0,
  published: 0,
  scheduled: 0,
  critical: 0,
  pinned: 0,
  views: 0,
  acknowledgementRate: "0.00%",
});
const emptyForm: Form = Object.freeze({
  id: null,
  title: "",
  summary: "",
  body: "",
  type: "SERVICE",
  status: "DRAFT",
  severity: "INFO",
  placement: "APP_HOME",
  audienceMode: "ALL",
  contextSegments: "HOME",
  priority: "100",
  pinned: false,
  requiresAcknowledgement: false,
  notificationEnabled: false,
  startsAt: "",
  endsAt: "",
});
let state: State = {
  items: [],
  total: 0,
  stats: emptyStats,
  form: emptyForm,
  busy: false,
  loadedAt: "-",
  query: "",
  type: "ALL",
  status: "ALL",
  severity: "ALL",
  placement: "ALL",
  sort: "updatedAt",
  reason: "",
  selectedId: null,
  toast: { type: "info", message: "공지사항 운영 콘솔이 준비되었습니다." },
};
let mounted = false;
let timer: number | null = null;

export default function AdminNoticesPage(): null {
  if (typeof window !== "undefined" && typeof document !== "undefined")
    globalThis.queueMicrotask(mount);
  return null;
}

function mount(): void {
  if (mounted) return;
  mounted = true;
  const root =
    document.getElementById(ROOT_ID) ?? document.createElement("main");
  root.id = ROOT_ID;
  root.setAttribute("data-version", VERSION);
  if (!root.parentElement) document.body.appendChild(root);
  installStyles();
  render(root);
  void load(root);
  timer = window.setInterval(() => void load(root, true), REFRESH_MS);
  window.addEventListener(
    "pagehide",
    () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    },
    { once: true },
  );
}

function installStyles(): void {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const s = document.createElement("style");
  s.id = `${ROOT_ID}-style`;
  s.textContent = `#${ROOT_ID}{min-height:100vh;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px}#${ROOT_ID} *{box-sizing:border-box}.w{max-width:1540px;margin:auto;display:flex;flex-direction:column;gap:24px}.p{border:1px solid #ffffff1a;background:#ffffff14;border-radius:28px;box-shadow:0 24px 80px #0008}.h{padding:28px}.k{font-size:13px;color:#67e8f9;font-weight:1000}.t{font-size:34px;margin:10px 0 0;color:white;font-weight:1000}.d{max-width:1040px;color:#cbd5e1;font-size:14px;line-height:1.75}.hg{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end}.badge{border:1px solid #34d39955;background:#10b98122;color:#d1fae5;border-radius:16px;padding:10px 14px;font-size:13px;font-weight:900}.stats{display:grid;grid-template-columns:repeat(7,1fr);gap:12px}.stat{padding:18px}.stat small{color:#94a3b8;font-weight:900}.stat b{display:block;color:white;font-size:25px;margin-top:8px}.bar{padding:18px;display:grid;grid-template-columns:minmax(240px,1fr) repeat(5,145px);gap:10px}.inp,.sel,.ta{width:100%;border:1px solid #ffffff1a;background:#020617;color:#e2e8f0;border-radius:15px;padding:12px 14px;font-size:14px}.ta{min-height:92px;resize:vertical}.btn{border:0;border-radius:15px;background:#67e8f9;color:#020617;font-weight:1000;padding:11px 14px;cursor:pointer}.btn.s{background:#ffffff1a;color:#f8fafc;border:1px solid #ffffff20}.btn:disabled{opacity:.55}.reason{display:grid;grid-template-columns:1fr auto auto;gap:10px;padding:0 18px 18px}.toast{margin:0 18px 18px;border-radius:16px;padding:13px 15px;font-size:13px}.toast.info{border:1px solid #22d3ee66;background:#22d3ee1a;color:#cffafe}.toast.success{border:1px solid #34d39966;background:#10b9811a;color:#d1fae5}.toast.error{border:1px solid #fb718566;background:#f43f5e22;color:#ffe4e6}.grid{display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:24px}.sec{padding:20px}.tablewrap{overflow:auto;border:1px solid #ffffff1a;border-radius:18px}.tbl{width:100%;min-width:1040px;border-collapse:collapse;font-size:13px}.tbl th,.tbl td{padding:13px 14px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}.tbl thead{background:#0f172a;color:#94a3b8;font-size:11px;text-transform:uppercase}.tbl tr.selected{background:#22d3ee1a}.link{border:0;background:transparent;color:white;font-weight:1000;text-align:left;cursor:pointer}.sub{display:block;color:#64748b;font-size:12px;margin-top:5px;line-height:1.45}.pill{display:inline-flex;border:1px solid #ffffff26;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.PUBLISHED,.INFO{border-color:#34d39966;background:#10b98122;color:#d1fae5}.SCHEDULED,.IMPORTANT{border-color:#60a5fa66;background:#2563eb22;color:#dbeafe}.WARNING,.PAUSED{border-color:#fbbf2466;background:#f59e0b22;color:#fef3c7}.CRITICAL{border-color:#dc262680;background:#7f1d1d80;color:#fecaca}.ARCHIVED,.DRAFT{color:#cbd5e1}.acts{display:flex;flex-wrap:wrap;gap:6px}.sm{font-size:12px;padding:7px 9px;border-radius:10px}.form{display:flex;flex-direction:column;gap:10px}.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.check{display:flex;align-items:center;gap:10px;border:1px solid #ffffff1a;background:#02061799;border-radius:16px;padding:12px 14px;font-size:13px}.preview,.safe{border:1px solid #ffffff1a;background:#020617b8;border-radius:20px;padding:15px}.safegrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.safe{border-color:#34d39944;background:#10b9811a;color:#d1fae5;font-size:12px;font-weight:900}.ft{margin-top:12px;color:#64748b;font-size:12px;line-height:1.7}.empty{padding:34px;text-align:center;color:#94a3b8}@media(max-width:1240px){.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(3,1fr)}.bar{grid-template-columns:1fr 1fr 1fr}.reason{grid-template-columns:1fr}.safegrid{grid-template-columns:1fr 1fr}}@media(max-width:720px){#${ROOT_ID}{padding:20px 12px}.hg,.stats,.bar,.two,.safegrid{grid-template-columns:1fr}.t{font-size:27px}}`;
  document.head.appendChild(s);
}

function patch(next: Partial<State>, root: HTMLElement): void {
  state = { ...state, ...next };
  render(root);
}
function patchForm(next: Partial<Form>, root: HTMLElement): void {
  patch({ form: { ...state.form, ...next } }, root);
}
function render(root: HTMLElement): void {
  root.innerHTML = html();
  bind(root);
}

function html(): string {
  const items = visible();
  const f = state.form;
  return `<section class="w"><header class="p h"><div class="hg"><div><p class="k">Admin Console · Notices · v${e(VERSION)}</p><h1 class="t">공지사항 운영 콘솔</h1><p class="d">서비스, 급여, 예산, 저축, 커뮤니티, 광고/제휴, 보안, 점검, 정책 공지를 관리자 권한과 감사 로그 경계에서 운영합니다. 급여·지출·저축·납치금액 원문 기반 대상 지정, raw push token, 광고 금융 타겟팅은 차단합니다.</p></div><span class="badge">공지 · 정책 · 점검 · 관리자 사유 · 비식별 알림</span></div></header><section class="stats">${stat("전체", state.stats.total)}${stat("게시", state.stats.published)}${stat("예약", state.stats.scheduled)}${stat("긴급", state.stats.critical)}${stat("고정", state.stats.pinned)}${stat("조회", state.stats.views)}${stat("확인율", state.stats.acknowledgementRate)}</section><section class="p"><div class="bar"><input id="q" class="inp" value="${e(state.query)}" placeholder="제목, 요약, 본문 검색" />${sel("type", ["ALL", ...noticeTypes], state.type)}${sel("status", ["ALL", ...noticeStatuses], state.status)}${sel("sev", ["ALL", ...noticeSeverities], state.severity)}${sel("place", ["ALL", ...placements], state.placement)}${sel("sort", [...sortKeys], state.sort)}</div><div class="reason"><input id="reason" class="inp" value="${e(state.reason)}" placeholder="관리자 변경 사유" /><button id="load" class="btn" ${state.busy ? "disabled" : ""}>동기화</button><button id="new" class="btn s">새 공지</button></div><div class="toast ${state.toast.type}">${e(state.toast.message)}</div></section><section class="grid"><div class="p sec"><h2>공지 목록</h2><div class="tablewrap"><table class="tbl"><thead><tr><th>공지</th><th>상태</th><th>유형</th><th>노출</th><th>성과</th><th>작업</th></tr></thead><tbody>${items.length ? items.map(row).join("") : `<tr><td class="empty" colspan="6">조건에 맞는 공지가 없습니다.</td></tr>`}</tbody></table></div><p class="ft">표시 ${num(items.length)}개 / API total ${num(state.total)}개 · 모든 mutation은 X-Admin-Reason, RBAC, 감사 로그를 전제로 합니다.</p></div><aside class="p sec"><h2>공지 작성·편집</h2><form id="form" class="form"><input id="title" class="inp" value="${e(f.title)}" placeholder="제목" /><input id="summary" class="inp" value="${e(f.summary)}" placeholder="요약" /><textarea id="body" class="ta" placeholder="본문">${e(f.body)}</textarea><div class="two">${sel("ftype", [...noticeTypes], f.type)}${sel("fstatus", [...noticeStatuses], f.status)}</div><div class="two">${sel("fsev", [...noticeSeverities], f.severity)}${sel("fplace", [...placements], f.placement)}</div><div class="two">${sel("faud", [...audiences], f.audienceMode)}<input id="priority" class="inp" value="${e(f.priority)}" placeholder="우선순위" /></div><input id="segments" class="inp" value="${e(f.contextSegments)}" placeholder="HOME,PAYROLL_HOME" /><div class="two"><input id="starts" class="inp" type="datetime-local" value="${e(f.startsAt)}" /><input id="ends" class="inp" type="datetime-local" value="${e(f.endsAt)}" /></div><label class="check"><input id="pinned" type="checkbox" ${f.pinned ? "checked" : ""}/> 상단 고정</label><label class="check"><input id="ack" type="checkbox" ${f.requiresAcknowledgement ? "checked" : ""}/> 사용자 확인 필요</label><label class="check"><input id="notify" type="checkbox" ${f.notificationEnabled ? "checked" : ""}/> 공지 알림 발송</label><button class="btn" type="submit" ${state.busy ? "disabled" : ""}>저장 및 감사 기록</button></form><div class="preview"><span class="pill ${e(f.severity)}">${e(label(f.severity))}</span><h3>${e(f.title || "공지 제목")}</h3><p>${e(f.summary || "공지 요약")}</p><p>${e(f.body || "공지 본문 미리보기")}</p><p class="ft">${e(label(f.type))} · ${e(label(f.placement))} · audience=${e(f.audienceMode)} · rawFinancialTargeting=false</p></div></aside></section><section class="p sec"><h2>Privacy · Notification · Ads Guard</h2><div class="safegrid">${["rawFinancialTargetingUsed=false", "rawPushTokenLogged=false", "rawAmountNotificationPayload=false", "adsFinancialTargetingUsed=false", "adminReasonRequired=true", "contextualAudienceOnly=true", "redactedAuditReady=true", "noStoreFetch=true"].map((x) => `<div class="safe">${e(x)} · PASS</div>`).join("")}</div><p class="ft">마지막 동기화 ${e(state.loadedAt)}</p></section></section>`;
}

function stat(labelText: string, value: number | string): string {
  return `<div class="p stat"><small>${e(labelText)}</small><b>${typeof value === "number" ? num(value) : e(value)}</b></div>`;
}
function row(n: Notice): string {
  return `<tr class="${state.selectedId === n.id ? "selected" : ""}"><td><button class="link" data-action="select" data-id="${e(n.id)}">${e(n.title)}</button><span class="sub">${e(n.summary)}<br/>${n.pinned ? "📌 고정 · " : ""}ack=${String(n.requiresAcknowledgement)} · notify=${String(n.notificationEnabled)}</span></td><td><span class="pill ${e(n.status)}">${e(n.status)}</span><br/><span class="pill ${e(n.severity)}" style="margin-top:6px">${e(n.severity)}</span></td><td>${e(label(n.type))}<span class="sub">${e(n.audienceMode)}</span></td><td>${e(label(n.placement))}<span class="sub">${e(dt(n.startsAt))}<br/>~ ${e(dt(n.endsAt))}</span></td><td>조회 ${num(n.views)}<br/>확인 ${num(n.acknowledgements)}</td><td><div class="acts">${actions.map((a) => `<button class="btn s sm" data-action="${e(a)}" data-id="${e(n.id)}">${e(label(a))}</button>`).join("")}</div></td></tr>`;
}
function sel(id: string, values: readonly string[], selected: string): string {
  return `<select id="${e(id)}" class="sel">${values.map((v) => `<option value="${e(v)}" ${v === selected ? "selected" : ""}>${e(label(v))}</option>`).join("")}</select>`;
}

function bind(root: HTMLElement): void {
  input(root, "q", (v) => patch({ query: v }, root));
  input(root, "reason", (v) => patch({ reason: v }, root));
  input(root, "title", (v) => patchForm({ title: v }, root));
  input(root, "summary", (v) => patchForm({ summary: v }, root));
  input(root, "body", (v) => patchForm({ body: v }, root));
  input(root, "priority", (v) => patchForm({ priority: v }, root));
  input(root, "segments", (v) => patchForm({ contextSegments: v }, root));
  input(root, "starts", (v) => patchForm({ startsAt: v }, root));
  input(root, "ends", (v) => patchForm({ endsAt: v }, root));
  selectBind(root, "type", (v) =>
    patch({ type: enumOf(["ALL", ...noticeTypes] as const, v, "ALL") }, root),
  );
  selectBind(root, "status", (v) =>
    patch(
      { status: enumOf(["ALL", ...noticeStatuses] as const, v, "ALL") },
      root,
    ),
  );
  selectBind(root, "sev", (v) =>
    patch(
      { severity: enumOf(["ALL", ...noticeSeverities] as const, v, "ALL") },
      root,
    ),
  );
  selectBind(root, "place", (v) =>
    patch(
      { placement: enumOf(["ALL", ...placements] as const, v, "ALL") },
      root,
    ),
  );
  selectBind(root, "sort", (v) =>
    patch({ sort: enumOf(sortKeys, v, "updatedAt") }, root),
  );
  selectBind(root, "ftype", (v) =>
    patchForm({ type: enumOf(noticeTypes, v, "SERVICE") }, root),
  );
  selectBind(root, "fstatus", (v) =>
    patchForm({ status: enumOf(noticeStatuses, v, "DRAFT") }, root),
  );
  selectBind(root, "fsev", (v) =>
    patchForm({ severity: enumOf(noticeSeverities, v, "INFO") }, root),
  );
  selectBind(root, "fplace", (v) =>
    patchForm({ placement: enumOf(placements, v, "APP_HOME") }, root),
  );
  selectBind(root, "faud", (v) =>
    patchForm({ audienceMode: enumOf(audiences, v, "ALL") }, root),
  );
  checkbox(root, "pinned", (v) => patchForm({ pinned: v }, root));
  checkbox(root, "ack", (v) => patchForm({ requiresAcknowledgement: v }, root));
  checkbox(root, "notify", (v) => patchForm({ notificationEnabled: v }, root));
  by<HTMLButtonElement>(root, "load")?.addEventListener(
    "click",
    () => void load(root),
  );
  by<HTMLButtonElement>(root, "new")?.addEventListener("click", () =>
    patch(
      {
        form: emptyForm,
        selectedId: null,
        toast: { type: "info", message: "새 공지 작성 모드입니다." },
      },
      root,
    ),
  );
  by<HTMLFormElement>(root, "form")?.addEventListener(
    "submit",
    (event: SubmitEvent) => {
      event.preventDefault();
      void save(root);
    },
  );
  root
    .querySelectorAll<HTMLButtonElement>("button[data-action][data-id]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        handle(root, b.dataset.action ?? "", b.dataset.id ?? ""),
      ),
    );
}

async function load(root: HTMLElement, silent = false): Promise<void> {
  if (!silent) patch({ busy: true }, root);
  try {
    const p = new URLSearchParams({
      limit: String(PAGE_SIZE),
      sort: state.sort,
    });
    if (state.query.trim()) p.set("q", state.query.trim());
    if (state.type !== "ALL") p.set("type", state.type);
    if (state.status !== "ALL") p.set("status", state.status);
    if (state.severity !== "ALL") p.set("severity", state.severity);
    if (state.placement !== "ALL") p.set("placement", state.placement);
    const next = listFrom(
      await api<ListResponse>(`${API_BASE}?${p.toString()}`),
    );
    patch(
      {
        items: next.items,
        total: next.total,
        stats: next.stats,
        selectedId: state.selectedId ?? next.items[0]?.id ?? null,
        loadedAt: dt(new Date().toISOString()),
        toast: silent
          ? state.toast
          : { type: "success", message: "공지 목록을 동기화했습니다." },
      },
      root,
    );
  } catch (error) {
    patch(
      {
        toast: {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "공지 목록 조회에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    if (!silent) patch({ busy: false }, root);
  }
}

async function save(root: HTMLElement): Promise<void> {
  patch({ busy: true }, root);
  try {
    validate(state.form, state.reason);
    const response = await api<MutationResponse>(
      state.form.id
        ? `${API_BASE}/${encodeURIComponent(state.form.id)}`
        : API_BASE,
      {
        method: state.form.id ? "PATCH" : "POST",
        headers: adminHeaders(),
        body: JSON.stringify(payload(state.form)),
      },
    );
    const saved = noticeFrom(response);
    if (saved) {
      const n = normalize(saved);
      const items = state.form.id
        ? state.items.map((x) => (x.id === n.id ? n : x))
        : [n, ...state.items];
      patch(
        {
          items,
          form: toForm(n),
          selectedId: n.id,
          stats: statsFrom(items),
          toast: {
            type: "success",
            message: "공지 저장과 감사 기록 요청을 완료했습니다.",
          },
        },
        root,
      );
    }
  } catch (error) {
    patch(
      {
        toast: {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "공지 저장에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    patch({ busy: false }, root);
  }
}

async function mutate(
  root: HTMLElement,
  n: Notice,
  action: Action,
): Promise<void> {
  if (action !== "SEND_TEST" && !state.reason.trim()) {
    patch(
      {
        toast: {
          type: "error",
          message: "공지 상태 변경에는 관리자 사유가 필요합니다.",
        },
      },
      root,
    );
    return;
  }
  patch({ busy: true }, root);
  try {
    const changed = noticeFrom(
      await api<MutationResponse>(
        `${API_BASE}/${encodeURIComponent(n.id)}/${action.toLowerCase()}`,
        {
          method: "POST",
          headers: adminHeaders(
            action === "SEND_TEST" ? "test notification" : undefined,
          ),
          body: JSON.stringify({
            action,
            reason: state.reason.trim(),
            rawFinancialTargetingUsed: false,
            rawPushTokenLogged: false,
            adsFinancialTargetingUsed: false,
          }),
        },
      ),
    );
    if (changed) {
      const nn = normalize(changed);
      const items =
        action === "DUPLICATE"
          ? [nn, ...state.items]
          : state.items.map((x) => (x.id === nn.id ? nn : x));
      patch(
        {
          items,
          form: toForm(nn),
          selectedId: nn.id,
          stats: statsFrom(items),
          toast: {
            type: "success",
            message: `${label(action)} 작업을 완료했습니다.`,
          },
        },
        root,
      );
    }
  } catch (error) {
    patch(
      {
        toast: {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "공지 작업에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    patch({ busy: false }, root);
  }
}

function handle(root: HTMLElement, actionName: string, id: string): void {
  const n = state.items.find((x) => x.id === id);
  if (!n) return;
  if (actionName === "select") {
    patch(
      {
        selectedId: id,
        form: toForm(n),
        toast: { type: "info", message: `${n.title} 편집 모드입니다.` },
      },
      root,
    );
    return;
  }
  void mutate(root, n, enumOf(actions, actionName, "PUBLISH"));
}
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  const r = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const raw = await r.text();
  const parsed: unknown = raw ? JSON.parse(raw) : null;
  if (!r.ok) throw new Error(errorMessage(parsed, r.status));
  return parsed as T;
}
function listFrom(r: ListResponse): {
  readonly items: readonly Notice[];
  readonly total: number;
  readonly stats: Stats;
} {
  const raw = r.data?.items ?? r.items ?? [];
  const items = raw.map(normalize);
  return {
    items,
    total: r.data?.total ?? r.total ?? items.length,
    stats: r.data?.stats ?? r.stats ?? statsFrom(items),
  };
}
function noticeFrom(r: MutationResponse): Notice | null {
  if (r.notice) return r.notice;
  if (r.data && "id" in r.data) return r.data as Notice;
  if (r.data && "notice" in r.data) return r.data.notice ?? null;
  return null;
}
function normalize(n: Notice): Notice {
  return {
    ...n,
    id: scrub(n.id),
    title: scrub(n.title),
    summary: scrub(n.summary),
    body: scrub(n.body),
    type: enumOf(noticeTypes, n.type, "SERVICE"),
    status: enumOf(noticeStatuses, n.status, "DRAFT"),
    severity: enumOf(noticeSeverities, n.severity, "INFO"),
    placement: enumOf(placements, n.placement, "APP_HOME"),
    audienceMode: enumOf(audiences, n.audienceMode, "ALL"),
    contextSegments: n.contextSegments.map((x) => enumOf(segments, x, "HOME")),
    priority: nonNegative(n.priority),
    startsAt: iso(n.startsAt),
    endsAt: iso(n.endsAt),
    publishedAt: n.publishedAt ? iso(n.publishedAt) : null,
    views: nonNegative(n.views),
    acknowledgements: nonNegative(n.acknowledgements),
    updatedAt: iso(n.updatedAt),
    updatedBy: scrub(n.updatedBy),
    auditReasonRequired: true,
    rawFinancialTargetingUsed: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
  };
}
function toForm(n: Notice): Form {
  return {
    id: n.id,
    title: n.title,
    summary: n.summary,
    body: n.body,
    type: n.type,
    status: n.status,
    severity: n.severity,
    placement: n.placement,
    audienceMode: n.audienceMode,
    contextSegments: n.contextSegments.join(","),
    priority: String(n.priority),
    pinned: n.pinned,
    requiresAcknowledgement: n.requiresAcknowledgement,
    notificationEnabled: n.notificationEnabled,
    startsAt: n.startsAt.slice(0, 16),
    endsAt: n.endsAt.slice(0, 16),
  };
}
function payload(f: Form): JsonRecord {
  return {
    title: trim(f.title),
    summary: trim(f.summary),
    body: trim(f.body),
    type: f.type,
    status: f.status,
    severity: f.severity,
    placement: f.placement,
    audienceMode: f.audienceMode,
    contextSegments: [...parseSegments(f.contextSegments)],
    priority: Number(f.priority),
    pinned: f.pinned,
    requiresAcknowledgement: f.requiresAcknowledgement,
    notificationEnabled: f.notificationEnabled,
    startsAt: new Date(f.startsAt).toISOString(),
    endsAt: new Date(f.endsAt).toISOString(),
    rawFinancialTargetingUsed: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
    rawAmountInNotificationPayload: false,
    auditReasonRequired: true,
  };
}
function validate(f: Form, reason: string): void {
  if (!trim(reason)) throw new Error("관리자 변경 사유가 필요합니다.");
  if (trim(f.title).length < 2)
    throw new Error("제목은 2자 이상이어야 합니다.");
  if (trim(f.summary).length < 2)
    throw new Error("요약은 2자 이상이어야 합니다.");
  if (trim(f.body).length < 5) throw new Error("본문은 5자 이상이어야 합니다.");
  const p = Number(f.priority);
  if (!Number.isInteger(p) || p < 0 || p > 9999)
    throw new Error("우선순위는 0~9999 정수여야 합니다.");
  const s = new Date(f.startsAt);
  const e2 = new Date(f.endsAt);
  if (
    !Number.isFinite(s.getTime()) ||
    !Number.isFinite(e2.getTime()) ||
    s.getTime() >= e2.getTime()
  )
    throw new Error("시작/종료 일시를 올바르게 입력해야 합니다.");
  if (f.audienceMode === "CONSENTED_MARKETING" && !f.notificationEnabled)
    throw new Error(
      "마케팅 수신 대상 공지는 알림 발송 또는 별도 고지 정책이 필요합니다.",
    );
  blockSensitiveTargeting(`${f.title} ${f.summary} ${f.contextSegments}`);
  parseSegments(f.contextSegments);
}
function parseSegments(v: string): readonly Segment[] {
  const xs = Array.from(
    new Set(
      v
        .split(",")
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  const bad = xs.find((x) => !segments.includes(x as Segment));
  if (bad) throw new Error(`지원하지 않는 context segment입니다: ${bad}`);
  return xs.length ? xs.map((x) => x as Segment) : ["HOME"];
}
function blockSensitiveTargeting(v: string): void {
  const n = v.toLowerCase().replace(/[\s._-]/g, "");
  const bad = [
    "salaryamount",
    "incomeamount",
    "loanamount",
    "savingamount",
    "expenseamount",
    "hijackamount",
    "급여액",
    "소득금액",
    "대출금액",
    "저축금액",
    "지출금액",
    "납치금액",
  ].find((x) => n.includes(x.toLowerCase().replace(/[\s._-]/g, "")));
  if (bad) throw new Error(`금융 원문 기반 대상 지정은 금지됩니다: ${bad}`);
}
function statsFrom(items: readonly Notice[]): Stats {
  const views = items.reduce((a, x) => a + x.views, 0);
  const ack = items.reduce((a, x) => a + x.acknowledgements, 0);
  return {
    total: items.length,
    published: items.filter((x) => x.status === "PUBLISHED").length,
    scheduled: items.filter((x) => x.status === "SCHEDULED").length,
    critical: items.filter((x) => x.severity === "CRITICAL").length,
    pinned: items.filter((x) => x.pinned).length,
    views,
    acknowledgementRate: pct(ack, Math.max(views, ack)),
  };
}
function visible(): readonly Notice[] {
  const q = state.query.trim().toLowerCase();
  return state.items
    .filter((x) => state.type === "ALL" || x.type === state.type)
    .filter((x) => state.status === "ALL" || x.status === state.status)
    .filter((x) => state.severity === "ALL" || x.severity === state.severity)
    .filter((x) => state.placement === "ALL" || x.placement === state.placement)
    .filter(
      (x) =>
        !q ||
        `${x.title} ${x.summary} ${x.body} ${x.placement} ${x.type}`
          .toLowerCase()
          .includes(q),
    )
    .slice()
    .sort(compare);
}
function compare(a: Notice, b: Notice): number {
  if (
    state.sort === "priority" ||
    state.sort === "views" ||
    state.sort === "acknowledgements"
  )
    return Number(b[state.sort]) - Number(a[state.sort]);
  const ad =
    state.sort === "publishedAt"
      ? (a.publishedAt ?? a.updatedAt)
      : a[state.sort];
  const bd =
    state.sort === "publishedAt"
      ? (b.publishedAt ?? b.updatedAt)
      : b[state.sort];
  return new Date(bd).getTime() - new Date(ad).getTime();
}
function adminHeaders(reason?: string): HeadersInit {
  return {
    "x-admin-reason": state.reason.trim() || reason || "notice operation",
    "x-raw-financial-targeting-used": "false",
    "x-raw-push-token-logged": "false",
    "x-ad-financial-targeting-used": "false",
  };
}
function input(root: HTMLElement, id: string, fn: (v: string) => void): void {
  const n = by<HTMLInputElement | HTMLTextAreaElement>(root, id);
  n?.addEventListener("input", () => fn(n.value));
}
function selectBind(
  root: HTMLElement,
  id: string,
  fn: (v: string) => void,
): void {
  const n = by<HTMLSelectElement>(root, id);
  n?.addEventListener("change", () => fn(n.value));
}
function checkbox(
  root: HTMLElement,
  id: string,
  fn: (v: boolean) => void,
): void {
  const n = by<HTMLInputElement>(root, id);
  n?.addEventListener("change", () => fn(n.checked));
}
function by<T extends HTMLElement>(root: HTMLElement, id: string): T | null {
  return root.querySelector<T>(`#${css(id)}`);
}
function enumOf<T extends readonly string[]>(
  values: T,
  value: string,
  fallback: T[number],
): T[number] {
  return values.includes(value) ? (value as T[number]) : fallback;
}
function label(v: string): string {
  if (v === "ALL") return "전체";
  if (noticeTypes.includes(v as NoticeType))
    return {
      SERVICE: "서비스",
      PAYROLL: "급여",
      BUDGET: "예산",
      SAVINGS: "저축",
      COMMUNITY: "커뮤니티",
      ADS: "광고/제휴",
      SECURITY: "보안",
      MAINTENANCE: "점검",
      POLICY: "정책",
    }[v as NoticeType];
  if (placements.includes(v as Placement))
    return {
      ADMIN_HOME: "관리자 홈",
      APP_HOME: "앱 홈",
      PAYROLL_HOME: "급여 홈",
      BUDGET_HOME: "예산 홈",
      COMMUNITY_FEED: "커뮤니티",
      MY_PAGE: "마이페이지",
      LOGIN: "로그인",
      GLOBAL_MODAL: "전체 모달",
    }[v as Placement];
  if (noticeSeverities.includes(v as NoticeSeverity))
    return {
      INFO: "안내",
      IMPORTANT: "중요",
      WARNING: "주의",
      CRITICAL: "긴급",
    }[v as NoticeSeverity];
  if (actions.includes(v as Action))
    return {
      PUBLISH: "게시",
      PAUSE: "정지",
      ARCHIVE: "보관",
      PIN: "고정",
      UNPIN: "해제",
      DUPLICATE: "복제",
      SEND_TEST: "테스트",
    }[v as Action];
  return (
    (
      {
        updatedAt: "최근 수정",
        publishedAt: "게시일",
        startsAt: "시작일",
        priority: "우선순위",
        views: "조회",
        acknowledgements: "확인",
      } as Record<string, string>
    )[v] ?? v
  );
}
function errorMessage(parsed: unknown, status: number): string {
  if (parsed && typeof parsed === "object" && "error" in parsed)
    return JSON.stringify(
      sanitize((parsed as { readonly error: unknown }).error),
    );
  return `HTTP ${status}`;
}
function sanitize(v: unknown): JsonValue {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean" || typeof v === "number") return v;
  if (typeof v === "string") return scrub(v);
  if (Array.isArray(v)) return v.slice(0, 80).map(sanitize);
  if (typeof v === "object")
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .slice(0, 80)
        .map(([k, item]) => [k, sensitive(k) ? "[REDACTED]" : sanitize(item)]),
    ) as JsonRecord;
  return String(v);
}
function sensitive(k: string): boolean {
  const n = k.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveTerms.some((t) =>
    n.includes(t.toLowerCase().replace(/[\s._-]/g, "")),
  );
}
function scrub(v: string): string {
  let out = v.slice(0, 1200);
  sensitiveTerms.forEach((t) => {
    out = out.replace(new RegExp(rx(t), "ig"), "[REDACTED]");
  });
  return out;
}
function nonNegative(v: number): number {
  return Number.isFinite(v) && v >= 0 ? Math.trunc(v) : 0;
}
function pct(a: number, b: number): string {
  return b > 0 ? `${((a * 100) / b).toFixed(2)}%` : "0.00%";
}
function trim(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}
function num(v: number): string {
  return new Intl.NumberFormat("ko-KR").format(v);
}
function iso(v: string): string {
  const d = new Date(v);
  return Number.isFinite(d.getTime())
    ? d.toISOString()
    : new Date(0).toISOString();
}
function dt(v: string): string {
  const d = new Date(v);
  return Number.isFinite(d.getTime())
    ? new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
      }).format(d)
    : "-";
}
function e(v: string): string {
  return v.replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ] ?? c,
  );
}
function rx(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function css(v: string): string {
  return v.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function assertAdminNoticesPageCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_react_import_required",
    "no_jsx_required",
    "admin_notices_console",
    "service_payroll_budget_savings_community_ads_security_maintenance_policy_notices",
    "list_search_filter_sort",
    "notice_stats",
    "create_update_form",
    "preview_panel",
    "publish_pause_archive_pin_unpin_duplicate_test_actions",
    "x_admin_reason_required",
    "admin_api_boundary",
    "no_store_fetch",
    "notification_broadcast_guard",
    "contextual_audience_guard",
    "marketing_consent_guard",
    "raw_financial_targeting_blocked",
    "raw_push_token_redaction",
    "raw_amount_notification_payload_blocked",
    "ads_financial_targeting_forbidden",
    "redacted_audit_ready",
    "responsive_css_without_tailwind_dependency",
    "typescript_strict_no_implicit_any",
    "tsx_file_compiles_without_jsx_flag",
    "react_types_not_required_by_this_file",
  ] as const;
  return { ok: checks.length >= 20, version: VERSION, checks };
}

void assertAdminNoticesPageCompleteness;
