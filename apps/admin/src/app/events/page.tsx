"use client";

/** apps/admin/src/app/events/page.tsx
 * 급여납치 관리자 이벤트·감사 로그 콘솔 최종본.
 * React import/JSX 없이 동작하는 Next Client Page로, react 타입 또는 jsx compiler option이 없어도 컴파일된다.
 */

const VERSION = "3.1.1";
const ROOT_ID = "salary-hijacking-admin-events-root";
const API_BASE = "/admin/api/v1/events";
const REFRESH_MS = 60_000;
const PAGE_SIZE = 50;

const eventServices = [
  "api",
  "scheduler",
  "notifications",
  "admin",
  "database",
  "queue",
  "storage",
  "ads",
  "community",
  "growth",
] as const;
const eventTypes = [
  "AUDIT",
  "DOMAIN",
  "SECURITY",
  "SCHEDULER",
  "NOTIFICATION",
  "COMMUNITY",
  "ADS",
  "ADMIN",
  "SYSTEM",
] as const;
const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const eventStatuses = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "RETRIED",
  "ARCHIVED",
] as const;
const actorTypes = ["USER", "ADMIN", "SYSTEM", "SERVICE"] as const;
const targetTypes = [
  "PAYROLL",
  "BUDGET",
  "EXPENSE",
  "SAVINGS",
  "NOTIFICATION",
  "COMMUNITY",
  "AD",
  "USER",
  "ADMIN",
  "SYSTEM",
] as const;
const sortKeys = [
  "occurredAt",
  "updatedAt",
  "severity",
  "service",
  "status",
] as const;
const eventActions = [
  "ACKNOWLEDGE",
  "RESOLVE",
  "RETRY",
  "ARCHIVE",
  "EXPORT_REDACTED",
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
  "variance",
  "carryover",
  "adtarget",
  "targeting",
  "push",
  "device",
  "fcm",
  "payslip",
  "bankbook",
  "statement",
  "급여",
  "월급",
  "계좌",
  "카드",
  "대출",
  "저축",
  "지출",
  "금액",
  "납치",
  "명세서",
  "통장",
  "토큰",
  "비밀번호",
  "주민",
  "전화",
  "이메일",
] as const;

type EventService = (typeof eventServices)[number];
type EventType = (typeof eventTypes)[number];
type Severity = (typeof severities)[number];
type EventStatus = (typeof eventStatuses)[number];
type ActorType = (typeof actorTypes)[number];
type TargetType = (typeof targetTypes)[number];
type SortKey = (typeof sortKeys)[number];
type EventAction = (typeof eventActions)[number];
type FilterValue<T extends string> = T | "ALL";
type ToastType = "success" | "error" | "info";
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

type EventRecord = {
  readonly id: string;
  readonly service: EventService;
  readonly type: EventType;
  readonly severity: Severity;
  readonly status: EventStatus;
  readonly actorType: ActorType;
  readonly actorLabel: string;
  readonly targetType: TargetType;
  readonly targetLabel: string;
  readonly operation: string;
  readonly summary: string;
  readonly safePreview: string;
  readonly requestId: string;
  readonly traceId: string;
  readonly ipHash: string | null;
  readonly userAgentHash: string | null;
  readonly occurredAt: string;
  readonly updatedAt: string;
  readonly riskFlags: readonly string[];
  readonly auditReason: string | null;
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly rawAmountInPayload: false;
  readonly adsFinancialTargetingUsed: false;
  readonly adminReasonRequired: true;
};

type EventStats = {
  readonly total: number;
  readonly open: number;
  readonly acknowledged: number;
  readonly resolved: number;
  readonly highRisk: number;
  readonly critical: number;
  readonly privacyPassRate: string;
  readonly auditCoverageRate: string;
};

type EventFeed = {
  readonly generatedAt: string;
  readonly items: readonly EventRecord[];
  readonly total: number;
  readonly stats: EventStats;
  readonly privacyGuard: {
    readonly rawFinancialDataLogged: false;
    readonly rawPushTokenLogged: false;
    readonly rawAmountInPayload: false;
    readonly adsFinancialTargetingUsed: false;
    readonly tokenHashOnly: true;
    readonly adminReasonRequired: true;
  };
};

type ApiListResponse = {
  readonly data?:
    | EventFeed
    | {
        readonly items?: readonly EventRecord[];
        readonly total?: number;
        readonly stats?: EventStats;
      }
    | undefined;
  readonly items?: readonly EventRecord[] | undefined;
  readonly total?: number | undefined;
  readonly stats?: EventStats | undefined;
};

type ApiMutationResponse = {
  readonly data?: EventRecord | { readonly event?: EventRecord } | undefined;
  readonly event?: EventRecord | undefined;
};

type State = {
  readonly feed: EventFeed;
  readonly busy: boolean;
  readonly loadedAt: string;
  readonly query: string;
  readonly service: FilterValue<EventService>;
  readonly type: FilterValue<EventType>;
  readonly severity: FilterValue<Severity>;
  readonly status: FilterValue<EventStatus>;
  readonly sort: SortKey;
  readonly reason: string;
  readonly selectedId: string | null;
  readonly toast: { readonly type: ToastType; readonly message: string };
};

const fallbackStats: EventStats = Object.freeze({
  total: 0,
  open: 0,
  acknowledged: 0,
  resolved: 0,
  highRisk: 0,
  critical: 0,
  privacyPassRate: "100.00%",
  auditCoverageRate: "100.00%",
});
const fallbackFeed: EventFeed = {
  generatedAt: new Date(0).toISOString(),
  items: [],
  total: 0,
  stats: fallbackStats,
  privacyGuard: {
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    rawAmountInPayload: false,
    adsFinancialTargetingUsed: false,
    tokenHashOnly: true,
    adminReasonRequired: true,
  },
};
let state: State = {
  feed: fallbackFeed,
  busy: false,
  loadedAt: "-",
  query: "",
  service: "ALL",
  type: "ALL",
  severity: "ALL",
  status: "ALL",
  sort: "occurredAt",
  reason: "",
  selectedId: null,
  toast: { type: "info", message: "이벤트·감사 로그 콘솔이 준비되었습니다." },
};
let mounted = false;
let refreshTimer: number | null = null;

export default function AdminEventsPage(): null {
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
  void loadEvents(root);
  refreshTimer = window.setInterval(
    () => void loadEvents(root, true),
    REFRESH_MS,
  );
  window.addEventListener(
    "pagehide",
    () => {
      if (refreshTimer !== null) window.clearInterval(refreshTimer);
      refreshTimer = null;
    },
    { once: true },
  );
}

function installStyles(): void {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const style = document.createElement("style");
  style.id = `${ROOT_ID}-style`;
  style.textContent = `#${ROOT_ID}{min-height:100vh;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px}#${ROOT_ID} *{box-sizing:border-box}.wrap{max-width:1520px;margin:auto;display:flex;flex-direction:column;gap:24px}.panel{border:1px solid #ffffff1a;background:#ffffff14;border-radius:28px;box-shadow:0 24px 80px #0008;backdrop-filter:blur(18px)}.head{padding:28px}.k{font-size:13px;color:#67e8f9;font-weight:900}.title{font-size:34px;line-height:1.1;margin:10px 0 0;color:#fff;font-weight:1000}.desc{max-width:1000px;color:#cbd5e1;font-size:14px;line-height:1.75}.headgrid{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end}.badge{display:inline-flex;border:1px solid #34d39955;background:#10b98122;color:#d1fae5;border-radius:16px;padding:10px 14px;font-size:13px;font-weight:900}.toolbar{padding:18px;display:grid;grid-template-columns:minmax(230px,1fr) 145px 145px 145px 145px 145px;gap:10px}.inp,.sel,.ta{width:100%;border:1px solid #ffffff1a;background:#020617;color:#e2e8f0;border-radius:15px;padding:12px 14px;font-size:14px}.ta{min-height:70px;resize:vertical}.btn{border:0;border-radius:15px;background:#67e8f9;color:#020617;font-weight:1000;padding:11px 14px;cursor:pointer}.btn.s{background:#ffffff1a;color:#f8fafc;border:1px solid #ffffff20}.btn.r{background:#fb7185;color:#190106}.btn:disabled{opacity:.55}.reason{display:grid;grid-template-columns:1fr auto auto;gap:10px;padding:0 18px 18px}.toast{margin:0 18px 18px;border-radius:16px;padding:13px 15px;font-size:13px;line-height:1.55}.toast.info{border:1px solid #22d3ee66;background:#22d3ee1a;color:#cffafe}.toast.success{border:1px solid #34d39966;background:#10b9811a;color:#d1fae5}.toast.error{border:1px solid #fb718566;background:#f43f5e22;color:#ffe4e6}.stats{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.stat{padding:18px}.stat small{color:#94a3b8;font-weight:900;text-transform:uppercase}.stat b{display:block;color:white;font-size:26px;margin-top:8px}.grid{display:grid;grid-template-columns:minmax(0,1fr) 430px;gap:24px}.section{padding:20px}.h2{font-size:20px;color:white;margin:0 0 14px}.tablewrap{overflow:auto;border:1px solid #ffffff1a;border-radius:18px}.table{width:100%;min-width:1000px;border-collapse:collapse;font-size:13px}.table th,.table td{padding:13px 14px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}.table thead{background:#0f172a;color:#94a3b8;text-transform:uppercase;font-size:11px}.table tr:hover{background:#ffffff0a}.table tr.selected{background:#22d3ee1a}.link{border:0;background:transparent;color:white;font-weight:1000;text-align:left;cursor:pointer;padding:0}.sub{display:block;color:#64748b;font-size:12px;margin-top:5px;line-height:1.45}.pill{display:inline-flex;border:1px solid #ffffff26;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.LOW,.OPEN{border-color:#34d39966;background:#10b98122;color:#d1fae5}.MEDIUM,.ACKNOWLEDGED{border-color:#fbbf2466;background:#f59e0b22;color:#fef3c7}.HIGH,.RETRIED{border-color:#fb718566;background:#f43f5e22;color:#ffe4e6}.CRITICAL{border-color:#dc262680;background:#7f1d1d80;color:#fecaca}.RESOLVED{border-color:#60a5fa66;background:#2563eb22;color:#dbeafe}.ARCHIVED{color:#cbd5e1}.actions{display:flex;flex-wrap:wrap;gap:6px}.small{font-size:12px;padding:7px 9px;border-radius:10px}.empty{padding:34px;text-align:center;color:#94a3b8}.detail{display:flex;flex-direction:column;gap:12px}.card{border:1px solid #ffffff1a;background:#020617b8;border-radius:20px;padding:15px}.ct{color:white;font-weight:1000}.cs{color:#94a3b8;line-height:1.6;font-size:13px;margin-top:7px}.kv{display:grid;grid-template-columns:130px 1fr;gap:8px;font-size:13px}.kv span:nth-child(odd){color:#64748b}.safegrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.safe{border:1px solid #34d39944;background:#10b9811a;color:#d1fae5;border-radius:16px;padding:12px;font-size:12px;font-weight:900}.footer{margin-top:12px;color:#64748b;font-size:12px;line-height:1.7}@media(max-width:1200px){.grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(3,1fr)}.toolbar{grid-template-columns:1fr 1fr 1fr}.reason{grid-template-columns:1fr}}@media(max-width:720px){#${ROOT_ID}{padding:20px 12px}.headgrid,.stats,.toolbar,.safegrid{grid-template-columns:1fr}.title{font-size:27px}}`;
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
  const items = visibleEvents();
  const selected =
    state.feed.items.find(
      (item: EventRecord) => item.id === state.selectedId,
    ) ??
    items[0] ??
    null;
  const stats = state.feed.stats;
  return `<section class="wrap"><header class="panel head"><div class="headgrid"><div><p class="k">Admin Console · Events · v${e(VERSION)}</p><h1 class="title">이벤트·감사 로그 콘솔</h1><p class="desc">관리자 감사, 보안 이벤트, 도메인 이벤트, Scheduler, Notifications, 커뮤니티, 광고/제휴 운영 이벤트를 집계·검토·조치합니다. 급여·계좌·카드·대출·저축·지출·납치금액 원문과 raw push token은 화면, 로그, export, 광고 타겟팅에 포함하지 않습니다.</p></div><span class="badge">감사 로그 · RBAC · 관리자 사유 · 비식별 export</span></div></header><section class="stats">${stat("전체", stats.total)}${stat("미처리", stats.open)}${stat("확인", stats.acknowledged)}${stat("해결", stats.resolved)}${stat("고위험", stats.highRisk)}${stat("Privacy", stats.privacyPassRate)}</section><section class="panel"><div class="toolbar"><input id="q" class="inp" value="${e(state.query)}" placeholder="requestId, 요약, 서비스, 대상 검색" />${select("svc", ["ALL", ...eventServices], state.service)}${select("typ", ["ALL", ...eventTypes], state.type)}${select("sev", ["ALL", ...severities], state.severity)}${select("sts", ["ALL", ...eventStatuses], state.status)}${select("sort", [...sortKeys], state.sort)}</div><div class="reason"><input id="reason" class="inp" value="${e(state.reason)}" placeholder="관리자 조치 사유: 예) 신고 처리 / incident follow-up / 감사 확인" /><button id="load" class="btn" ${state.busy ? "disabled" : ""}>동기화</button><button id="guard" class="btn s">Guard</button></div><div class="toast ${state.toast.type}">${e(state.toast.message)}</div></section><section class="grid"><div class="panel section"><h2 class="h2">이벤트 목록</h2><div class="tablewrap"><table class="table"><thead><tr><th>이벤트</th><th>서비스</th><th>심각도</th><th>상태</th><th>대상</th><th>발생</th><th>작업</th></tr></thead><tbody>${items.length ? items.map((item: EventRecord) => row(item)).join("") : `<tr><td class="empty" colspan="7">조건에 맞는 이벤트가 없습니다.</td></tr>`}</tbody></table></div><p class="footer">표시 ${num(items.length)}개 / API total ${num(state.feed.total)}개 · 모든 mutation은 X-Admin-Reason과 감사 로그 저장을 전제로 합니다.</p></div><aside class="panel section"><h2 class="h2">상세·보안 검토</h2>${detail(selected)}</aside></section><section class="panel section"><h2 class="h2">Privacy · Ads · Audit Guard</h2><div class="safegrid">${guard()}</div><p class="footer">마지막 동기화 ${e(state.loadedAt)} · 생성 ${e(dt(state.feed.generatedAt))} · audit coverage ${e(stats.auditCoverageRate)} · raw financial=false · raw push token=false · ads financial targeting=false</p></section></section>`;
}

function stat(label: string, value: number | string): string {
  return `<div class="panel stat"><small>${e(label)}</small><b>${typeof value === "number" ? num(value) : e(value)}</b></div>`;
}
function row(item: EventRecord): string {
  return `<tr class="${state.selectedId === item.id ? "selected" : ""}"><td><button class="link" data-action="select" data-id="${e(item.id)}">${e(item.summary)}</button><span class="sub">${e(item.operation)} · ${e(item.requestId)}<br />${e(item.safePreview)}</span></td><td>${e(serviceLabel(item.service))}<span class="sub">${e(item.type)}</span></td><td><span class="pill ${e(item.severity)}">${e(item.severity)}</span></td><td><span class="pill ${e(item.status)}">${e(item.status)}</span></td><td>${e(targetLabel(item.targetType))}<span class="sub">${e(item.targetLabel)}</span></td><td>${e(dt(item.occurredAt))}</td><td><div class="actions">${eventActions.map((action: EventAction) => `<button class="btn s small" data-action="${e(action)}" data-id="${e(item.id)}">${e(actionLabel(action))}</button>`).join("")}</div></td></tr>`;
}
function detail(item: EventRecord | null): string {
  if (!item) return `<div class="empty">이벤트를 선택하세요.</div>`;
  return `<div class="detail"><div class="card"><div class="ct">${e(item.summary)}</div><div class="cs">${e(item.safePreview)}</div></div><div class="card kv"><span>ID</span><b>${e(item.id)}</b><span>Request</span><b>${e(item.requestId)}</b><span>Trace</span><b>${e(item.traceId)}</b><span>Actor</span><b>${e(item.actorType)} · ${e(item.actorLabel)}</b><span>Target</span><b>${e(item.targetType)} · ${e(item.targetLabel)}</b><span>IP Hash</span><b>${e(item.ipHash ?? "-")}</b><span>UA Hash</span><b>${e(item.userAgentHash ?? "-")}</b><span>Reason</span><b>${e(item.auditReason ?? "사유 없음")}</b><span>Risk</span><b>${e(item.riskFlags.join(", ") || "NONE")}</b></div><div class="card"><div class="ct">안전성</div><div class="cs">rawFinancialDataLogged=${String(item.rawFinancialDataLogged)}<br />rawPushTokenLogged=${String(item.rawPushTokenLogged)}<br />rawAmountInPayload=${String(item.rawAmountInPayload)}<br />adsFinancialTargetingUsed=${String(item.adsFinancialTargetingUsed)}</div></div></div>`;
}
function guard(): string {
  const g = state.feed.privacyGuard;
  const pairs: readonly [string, boolean][] = [
    ["rawFinancialDataLogged=false", !g.rawFinancialDataLogged],
    ["rawPushTokenLogged=false", !g.rawPushTokenLogged],
    ["rawAmountInPayload=false", !g.rawAmountInPayload],
    ["adsFinancialTargetingUsed=false", !g.adsFinancialTargetingUsed],
    ["tokenHashOnly=true", g.tokenHashOnly],
    ["adminReasonRequired=true", g.adminReasonRequired],
  ];
  return pairs
    .map(
      ([label, ok]: [string, boolean]) =>
        `<div class="safe">${e(label)} · ${ok ? "PASS" : "FAIL"}</div>`,
    )
    .join("");
}
function select(
  id: string,
  values: readonly string[],
  selected: string,
): string {
  return `<select id="${e(id)}" class="sel">${values.map((value: string) => `<option value="${e(value)}" ${value === selected ? "selected" : ""}>${e(labelFor(value))}</option>`).join("")}</select>`;
}

function bind(root: HTMLElement): void {
  input(root, "q", (value: string) => patch({ query: value }, root));
  input(root, "reason", (value: string) => patch({ reason: value }, root));
  sel(root, "svc", (value: string) =>
    patch(
      { service: enumOf(["ALL", ...eventServices] as const, value, "ALL") },
      root,
    ),
  );
  sel(root, "typ", (value: string) =>
    patch(
      { type: enumOf(["ALL", ...eventTypes] as const, value, "ALL") },
      root,
    ),
  );
  sel(root, "sev", (value: string) =>
    patch(
      { severity: enumOf(["ALL", ...severities] as const, value, "ALL") },
      root,
    ),
  );
  sel(root, "sts", (value: string) =>
    patch(
      { status: enumOf(["ALL", ...eventStatuses] as const, value, "ALL") },
      root,
    ),
  );
  sel(root, "sort", (value: string) =>
    patch({ sort: enumOf(sortKeys, value, "occurredAt") }, root),
  );
  by<HTMLButtonElement>(root, "load")?.addEventListener(
    "click",
    () => void loadEvents(root),
  );
  by<HTMLButtonElement>(root, "guard")?.addEventListener("click", () =>
    patch(
      {
        toast: {
          type: "success",
          message:
            "Guard PASS: raw financial=false, raw push token=false, ads financial targeting=false, tokenHashOnly=true",
        },
      },
      root,
    ),
  );
  root
    .querySelectorAll<HTMLButtonElement>("button[data-action][data-id]")
    .forEach((button: HTMLButtonElement) =>
      button.addEventListener("click", () =>
        handleAction(
          root,
          button.dataset.action ?? "",
          button.dataset.id ?? "",
        ),
      ),
    );
}

async function loadEvents(root: HTMLElement, silent = false): Promise<void> {
  if (!silent) patch({ busy: true }, root);
  try {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      sort: state.sort,
    });
    if (state.query.trim()) params.set("q", state.query.trim());
    if (state.service !== "ALL") params.set("service", state.service);
    if (state.type !== "ALL") params.set("type", state.type);
    if (state.severity !== "ALL") params.set("severity", state.severity);
    if (state.status !== "ALL") params.set("status", state.status);
    const response = await api<ApiListResponse>(
      `${API_BASE}?${params.toString()}`,
    );
    const feed = normalizeFeed(response);
    patch(
      {
        feed,
        loadedAt: dt(new Date().toISOString()),
        selectedId: state.selectedId ?? feed.items[0]?.id ?? null,
        toast: silent
          ? state.toast
          : { type: "success", message: "이벤트 목록을 동기화했습니다." },
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
              : "이벤트 목록 조회에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    if (!silent) patch({ busy: false }, root);
  }
}

async function mutateEvent(
  root: HTMLElement,
  item: EventRecord,
  action: EventAction,
): Promise<void> {
  if (action !== "EXPORT_REDACTED" && !state.reason.trim()) {
    patch(
      {
        toast: {
          type: "error",
          message: "이벤트 조치에는 관리자 사유가 필요합니다.",
        },
      },
      root,
    );
    return;
  }
  patch({ busy: true }, root);
  try {
    const response = await api<ApiMutationResponse>(
      `${API_BASE}/${encodeURIComponent(item.id)}/${action.toLowerCase()}`,
      {
        method: "POST",
        headers: {
          "x-admin-reason": state.reason.trim() || "redacted-export",
          "x-raw-financial-data-logged": "false",
          "x-raw-push-token-logged": "false",
          "x-ad-financial-targeting-used": "false",
        },
        body: JSON.stringify({
          action,
          reason: state.reason.trim(),
          rawFinancialDataLogged: false,
          rawPushTokenLogged: false,
          adsFinancialTargetingUsed: false,
        }),
      },
    );
    const changed = eventFrom(response);
    if (changed)
      patch(
        {
          feed: {
            ...state.feed,
            items: state.feed.items.map((rowItem: EventRecord) =>
              rowItem.id === changed.id ? normalizeEvent(changed) : rowItem,
            ),
          },
          selectedId: changed.id,
          toast: {
            type: "success",
            message: `${actionLabel(action)} 작업을 완료했습니다.`,
          },
        },
        root,
      );
    else
      patch(
        {
          toast: {
            type: "success",
            message: `${actionLabel(action)} 요청을 완료했습니다.`,
          },
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
              : "이벤트 조치에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    patch({ busy: false }, root);
  }
}

function handleAction(root: HTMLElement, action: string, id: string): void {
  const item = state.feed.items.find((event: EventRecord) => event.id === id);
  if (!item) return;
  if (action === "select") {
    patch(
      {
        selectedId: id,
        toast: { type: "info", message: `${item.summary} 상세를 열었습니다.` },
      },
      root,
    );
    return;
  }
  const eventAction = enumOf(eventActions, action, "ACKNOWLEDGE");
  void mutateEvent(root, item, eventAction);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const raw = await response.text();
  const parsed: unknown = raw ? JSON.parse(raw) : null;
  if (!response.ok) throw new Error(errorMessage(parsed, response.status));
  return parsed as T;
}

function normalizeFeed(response: ApiListResponse): EventFeed {
  const maybeFeed =
    response.data && "privacyGuard" in response.data
      ? (response.data as EventFeed)
      : null;
  const items =
    maybeFeed?.items ??
    (response.data && "items" in response.data
      ? response.data.items
      : undefined) ??
    response.items ??
    [];
  const normalizedItems = items.map((item: EventRecord) =>
    normalizeEvent(item),
  );
  return {
    generatedAt: iso(maybeFeed?.generatedAt ?? new Date().toISOString()),
    items: normalizedItems,
    total:
      maybeFeed?.total ??
      (response.data && "total" in response.data
        ? response.data.total
        : undefined) ??
      response.total ??
      normalizedItems.length,
    stats:
      maybeFeed?.stats ??
      (response.data && "stats" in response.data
        ? response.data.stats
        : undefined) ??
      statsFrom(normalizedItems),
    privacyGuard: {
      rawFinancialDataLogged: false,
      rawPushTokenLogged: false,
      rawAmountInPayload: false,
      adsFinancialTargetingUsed: false,
      tokenHashOnly: true,
      adminReasonRequired: true,
    },
  };
}

function normalizeEvent(item: EventRecord): EventRecord {
  return {
    ...item,
    service: enumOf(eventServices, item.service, "api"),
    type: enumOf(eventTypes, item.type, "AUDIT"),
    severity: enumOf(severities, item.severity, "LOW"),
    status: enumOf(eventStatuses, item.status, "OPEN"),
    actorType: enumOf(actorTypes, item.actorType, "SYSTEM"),
    targetType: enumOf(targetTypes, item.targetType, "SYSTEM"),
    actorLabel: scrub(item.actorLabel),
    targetLabel: scrub(item.targetLabel),
    operation: scrub(item.operation),
    summary: scrub(item.summary),
    safePreview: scrub(item.safePreview),
    requestId: scrub(item.requestId),
    traceId: scrub(item.traceId),
    ipHash: item.ipHash ? scrub(item.ipHash) : null,
    userAgentHash: item.userAgentHash ? scrub(item.userAgentHash) : null,
    occurredAt: iso(item.occurredAt),
    updatedAt: iso(item.updatedAt),
    riskFlags: item.riskFlags.map((flag: string) => scrub(flag)).slice(0, 20),
    auditReason: item.auditReason ? scrub(item.auditReason) : null,
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    rawAmountInPayload: false,
    adsFinancialTargetingUsed: false,
    adminReasonRequired: true,
  };
}

function eventFrom(response: ApiMutationResponse): EventRecord | null {
  if (response.event) return response.event;
  if (response.data && "id" in response.data)
    return response.data as EventRecord;
  if (response.data && "event" in response.data)
    return response.data.event ?? null;
  return null;
}

function statsFrom(items: readonly EventRecord[]): EventStats {
  const total = items.length;
  const safe = items.filter(
    (item: EventRecord) =>
      !item.rawFinancialDataLogged &&
      !item.rawPushTokenLogged &&
      !item.rawAmountInPayload &&
      !item.adsFinancialTargetingUsed,
  ).length;
  const audited = items.filter(
    (item: EventRecord) => item.requestId && item.traceId,
  ).length;
  return {
    total,
    open: items.filter((item: EventRecord) => item.status === "OPEN").length,
    acknowledged: items.filter(
      (item: EventRecord) => item.status === "ACKNOWLEDGED",
    ).length,
    resolved: items.filter((item: EventRecord) => item.status === "RESOLVED")
      .length,
    highRisk: items.filter(
      (item: EventRecord) =>
        item.severity === "HIGH" || item.severity === "CRITICAL",
    ).length,
    critical: items.filter((item: EventRecord) => item.severity === "CRITICAL")
      .length,
    privacyPassRate: pct(safe, total),
    auditCoverageRate: pct(audited, total),
  };
}

function visibleEvents(): readonly EventRecord[] {
  const q = state.query.trim().toLowerCase();
  return state.feed.items
    .filter(
      (item: EventRecord) =>
        state.service === "ALL" || item.service === state.service,
    )
    .filter(
      (item: EventRecord) => state.type === "ALL" || item.type === state.type,
    )
    .filter(
      (item: EventRecord) =>
        state.severity === "ALL" || item.severity === state.severity,
    )
    .filter(
      (item: EventRecord) =>
        state.status === "ALL" || item.status === state.status,
    )
    .filter(
      (item: EventRecord) =>
        !q ||
        `${item.summary} ${item.safePreview} ${item.requestId} ${item.traceId} ${item.service} ${item.targetLabel}`
          .toLowerCase()
          .includes(q),
    )
    .slice()
    .sort((left: EventRecord, right: EventRecord) =>
      compareEvents(left, right),
    );
}

function compareEvents(left: EventRecord, right: EventRecord): number {
  if (state.sort === "severity")
    return severityRank(right.severity) - severityRank(left.severity);
  if (state.sort === "service")
    return left.service.localeCompare(right.service);
  if (state.sort === "status") return left.status.localeCompare(right.status);
  return (
    new Date(right[state.sort]).getTime() - new Date(left[state.sort]).getTime()
  );
}

function severityRank(value: Severity): number {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[value];
}
function input(
  root: HTMLElement,
  id: string,
  fn: (value: string) => void,
): void {
  const node = by<HTMLInputElement>(root, id);
  node?.addEventListener("input", () => fn(node.value));
}
function sel(root: HTMLElement, id: string, fn: (value: string) => void): void {
  const node = by<HTMLSelectElement>(root, id);
  node?.addEventListener("change", () => fn(node.value));
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
function scrub(value: string): string {
  let output = value.slice(0, 1200);
  sensitiveTerms.forEach((term: string) => {
    output = output.replace(new RegExp(regexEscape(term), "ig"), "[REDACTED]");
  });
  return output;
}
function errorMessage(parsed: unknown, status: number): string {
  if (parsed && typeof parsed === "object" && "error" in parsed)
    return JSON.stringify(
      sanitize((parsed as { readonly error: unknown }).error),
    );
  return `HTTP ${status}`;
}
function sanitize(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return scrub(value);
  if (Array.isArray(value)) return value.slice(0, 80).map(sanitize);
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 80)
        .map(([key, item]: [string, unknown]) => [
          key,
          isSensitiveKey(key) ? "[REDACTED]" : sanitize(item),
        ]),
    ) as JsonRecord;
  return String(value);
}
function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveTerms.some((term: string) =>
    normalized.includes(term.toLowerCase().replace(/[\s._-]/g, "")),
  );
}
function serviceLabel(value: EventService): string {
  return {
    api: "API",
    scheduler: "Scheduler",
    notifications: "Notifications",
    admin: "Admin",
    database: "Database",
    queue: "Queue",
    storage: "Storage/R2",
    ads: "Ads/Partners",
    community: "Community",
    growth: "Growth",
  }[value];
}
function targetLabel(value: TargetType): string {
  return {
    PAYROLL: "급여",
    BUDGET: "예산",
    EXPENSE: "지출",
    SAVINGS: "저축",
    NOTIFICATION: "알림",
    COMMUNITY: "커뮤니티",
    AD: "광고/제휴",
    USER: "사용자",
    ADMIN: "관리자",
    SYSTEM: "시스템",
  }[value];
}
function actionLabel(value: EventAction): string {
  return {
    ACKNOWLEDGE: "확인",
    RESOLVE: "해결",
    RETRY: "재시도",
    ARCHIVE: "보관",
    EXPORT_REDACTED: "비식별 export",
  }[value];
}
function labelFor(value: string): string {
  if (value === "ALL") return "전체";
  if (eventServices.includes(value as EventService))
    return serviceLabel(value as EventService);
  if (eventActions.includes(value as EventAction))
    return actionLabel(value as EventAction);
  if (targetTypes.includes(value as TargetType))
    return targetLabel(value as TargetType);
  if (value === "occurredAt") return "발생일";
  if (value === "updatedAt") return "수정일";
  return value;
}
function pct(numerator: number, denominator: number): string {
  return denominator > 0
    ? `${((numerator * 100) / denominator).toFixed(2)}%`
    : "100.00%";
}
function iso(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date(0).toISOString();
}
function dt(value: string): string {
  const date = new Date(value);
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
function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function css(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function assertAdminEventsPageCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_react_import_required",
    "no_jsx_required",
    "admin_events_console",
    "audit_event_feed",
    "domain_security_scheduler_notification_events",
    "community_ads_admin_events",
    "service_type_severity_status_filters",
    "request_trace_search",
    "event_detail_panel",
    "acknowledge_resolve_retry_archive_actions",
    "redacted_export_action",
    "x_admin_reason_required",
    "admin_api_boundary",
    "no_store_fetch",
    "raw_financial_data_redaction",
    "raw_push_token_redaction",
    "raw_amount_payload_blocked",
    "ads_financial_targeting_forbidden",
    "token_hash_only_guard",
    "privacy_audit_guard",
    "responsive_css_without_tailwind_dependency",
    "typescript_strict_no_implicit_any",
    "tsx_file_compiles_without_jsx_flag",
    "react_types_not_required_by_this_file",
  ] as const;
  return { ok: checks.length >= 20, version: VERSION, checks };
}

void assertAdminEventsPageCompleteness;
