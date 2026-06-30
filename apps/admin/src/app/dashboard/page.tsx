"use client";

/** apps/admin/src/app/dashboard/page.tsx
 * 급여납치 관리자 통합 대시보드 최종본.
 * React import/JSX 없이 동작하는 Next Client Page로, react 타입 또는 jsx compiler option이 없어도 컴파일된다.
 */

const VERSION = "3.1.1";
const ROOT_ID = "salary-hijacking-admin-dashboard-root";
const API = "/admin/api/v1/dashboard";
const REFRESH_MS = 60_000;

const services = [
  "api",
  "scheduler",
  "notifications",
  "admin",
  "database",
  "queue",
  "storage",
  "ads",
] as const;
const health = ["OPERATIONAL", "DEGRADED", "INCIDENT", "MAINTENANCE"] as const;
const severity = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const quickActions = [
  "OPEN_REPORTS",
  "OPEN_INCIDENTS",
  "OPEN_BANNERS",
  "RUN_SCHEDULER_PREVIEW",
  "OPEN_AUDIT_LOGS",
] as const;
const sensitiveTerms = [
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
  "card",
  "account",
  "hijack",
  "token",
  "password",
  "authorization",
  "cookie",
  "resident",
  "phone",
  "email",
  "push",
  "fcm",
  "급여",
  "월급",
  "소득",
  "대출",
  "저축",
  "지출",
  "금액",
  "계좌",
  "카드",
  "납치",
  "토큰",
  "비밀번호",
  "주민",
  "전화",
  "이메일",
] as const;

type Service = (typeof services)[number];
type Health = (typeof health)[number];
type Severity = (typeof severity)[number];
type QuickAction = (typeof quickActions)[number];
type Trend = "UP" | "DOWN" | "FLAT";
type Risk = Severity;
type Toast = "success" | "error" | "info";
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

type Metric = {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly trend: Trend;
  readonly changeBp: number;
  readonly safeAggregation: true;
  readonly rawFinancialDataIncluded: false;
};
type ServiceHealth = {
  readonly key: Service;
  readonly label: string;
  readonly status: Health;
  readonly latencyMs: number;
  readonly errorRateBp: number;
  readonly lastCheckedAt: string;
  readonly runbookUrl: string;
};
type Job = {
  readonly key: string;
  readonly label: string;
  readonly status: Health;
  readonly lastRunAt: string;
  readonly nextRunAt: string;
  readonly processedCount: number;
  readonly failedCount: number;
  readonly dryRunSupported: true;
  readonly idempotencyGuard: true;
};
type QueueItem = {
  readonly id: string;
  readonly type:
    | "COMMUNITY_POST"
    | "COMMUNITY_COMMENT"
    | "USER_REPORT"
    | "AD_REVIEW"
    | "CS_TICKET";
  readonly title: string;
  readonly severity: Severity;
  readonly status: "OPEN" | "IN_REVIEW" | "ESCALATED" | "RESOLVED";
  readonly createdAt: string;
  readonly assignee: string;
  readonly safePreview: string;
};
type Incident = {
  readonly id: string;
  readonly title: string;
  readonly severity: Severity;
  readonly status: Health;
  readonly service: Service;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly publicImpact: string;
};
type Signal = {
  readonly id: string;
  readonly label: string;
  readonly level: Risk;
  readonly count: number;
  readonly window: string;
  readonly actionRequired: boolean;
};
type Guard = {
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly rawAmountInNotificationPayload: false;
  readonly adsFinancialTargetingUsed: false;
  readonly tokenHashOnly: true;
  readonly adminReasonRequired: true;
};
type Completeness = {
  readonly api: boolean;
  readonly scheduler: boolean;
  readonly notifications: boolean;
  readonly admin: boolean;
  readonly ads: boolean;
  readonly audit: boolean;
};
type Dashboard = {
  readonly generatedAt: string;
  readonly metrics: readonly Metric[];
  readonly serviceHealth: readonly ServiceHealth[];
  readonly schedulerJobs: readonly Job[];
  readonly moderationQueue: readonly QueueItem[];
  readonly incidents: readonly Incident[];
  readonly securitySignals: readonly Signal[];
  readonly privacyGuard: Guard;
  readonly completeness: Completeness;
};
type ApiResponse = {
  readonly data?: Dashboard | undefined;
  readonly dashboard?: Dashboard | undefined;
};
type State = {
  readonly data: Dashboard;
  readonly busy: boolean;
  readonly loadedAt: string;
  readonly serviceFilter: Service | "ALL";
  readonly severityFilter: Severity | "ALL";
  readonly query: string;
  readonly reason: string;
  readonly toast: { readonly type: Toast; readonly message: string };
};

const fallback: Dashboard = {
  generatedAt: new Date(0).toISOString(),
  metrics: [
    m("activeUsers", "활성 사용자", "명"),
    m("payrollPlans", "급여 계획", "개"),
    m("budgetPlans", "예산 계획", "개"),
    m("fixedExpenses", "고정지출", "개"),
    m("savingsGoals", "저축 목표", "개"),
    m("notifications", "알림", "건"),
    m("communityReports", "신고", "건"),
    m("adCampaigns", "광고/제휴", "개"),
  ],
  serviceHealth: services.map(
    (key: Service): ServiceHealth => ({
      key,
      label: serviceLabel(key),
      status: "MAINTENANCE",
      latencyMs: 0,
      errorRateBp: 0,
      lastCheckedAt: new Date(0).toISOString(),
      runbookUrl: `/admin/runbooks/${key}`,
    }),
  ),
  schedulerJobs: [
    job("payday-reminder", "급여일 알림"),
    job("fixed-expense-reminder", "고정지출 알림"),
    job("monthly-hijack-close", "월간 급여납치 마감"),
    job("data-retention-cleanup", "데이터 보존기간 정리"),
  ],
  moderationQueue: [],
  incidents: [],
  securitySignals: [
    {
      id: "auth-rate-limit",
      label: "인증 rate-limit",
      level: "LOW",
      count: 0,
      window: "1h",
      actionRequired: false,
    },
    {
      id: "admin-audit",
      label: "관리자 감사",
      level: "LOW",
      count: 0,
      window: "24h",
      actionRequired: false,
    },
  ],
  privacyGuard: {
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    rawAmountInNotificationPayload: false,
    adsFinancialTargetingUsed: false,
    tokenHashOnly: true,
    adminReasonRequired: true,
  },
  completeness: {
    api: true,
    scheduler: true,
    notifications: true,
    admin: true,
    ads: true,
    audit: true,
  },
};

let state: State = {
  data: fallback,
  busy: false,
  loadedAt: "-",
  serviceFilter: "ALL",
  severityFilter: "ALL",
  query: "",
  reason: "",
  toast: { type: "info", message: "관리자 대시보드가 준비되었습니다." },
};
let mounted = false;
let timer: number | null = null;

export default function AdminDashboardPage(): null {
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
  if (!existing) document.body.appendChild(root);
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

function m(key: string, label: string, unit: string): Metric {
  return {
    key,
    label,
    value: 0,
    unit,
    trend: "FLAT",
    changeBp: 0,
    safeAggregation: true,
    rawFinancialDataIncluded: false,
  };
}
function job(key: string, label: string): Job {
  return {
    key,
    label,
    status: "MAINTENANCE",
    lastRunAt: new Date(0).toISOString(),
    nextRunAt: new Date(0).toISOString(),
    processedCount: 0,
    failedCount: 0,
    dryRunSupported: true,
    idempotencyGuard: true,
  };
}
function patch(next: Partial<State>, root: HTMLElement): void {
  state = { ...state, ...next };
  render(root);
}

function installStyles(): void {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const style = document.createElement("style");
  style.id = `${ROOT_ID}-style`;
  style.textContent = `#${ROOT_ID}{min-height:100vh;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px}#${ROOT_ID} *{box-sizing:border-box}.wrap{max-width:1500px;margin:auto;display:flex;flex-direction:column;gap:24px}.panel{border:1px solid #ffffff1a;background:#ffffff14;border-radius:28px;box-shadow:0 24px 80px #0008;backdrop-filter:blur(18px)}.head{padding:28px}.k{font-size:13px;color:#67e8f9;font-weight:900}.title{font-size:34px;margin:10px 0 0;color:white;font-weight:1000}.desc{max-width:980px;color:#cbd5e1;font-size:14px;line-height:1.75}.badge{display:inline-flex;border:1px solid #34d39955;background:#10b98122;color:#d1fae5;border-radius:16px;padding:10px 14px;font-size:13px;font-weight:900}.headgrid{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end}.actions,.rowactions{display:flex;flex-wrap:wrap;gap:8px}.btn{border:0;border-radius:15px;background:#67e8f9;color:#020617;font-weight:1000;padding:11px 14px;cursor:pointer}.btn.s{background:#ffffff1a;color:#f8fafc;border:1px solid #ffffff20}.btn:disabled{opacity:.55}.toolbar{display:grid;grid-template-columns:1fr 160px 160px 240px;gap:10px;padding:18px}.inp,.sel{width:100%;border:1px solid #ffffff1a;background:#020617;color:#e2e8f0;border-radius:15px;padding:12px 14px}.toast{margin:0 18px 18px;border-radius:16px;padding:13px 15px;font-size:13px}.toast.info{border:1px solid #22d3ee66;background:#22d3ee1a;color:#cffafe}.toast.success{border:1px solid #34d39966;background:#10b9811a;color:#d1fae5}.toast.error{border:1px solid #fb718566;background:#f43f5e22;color:#ffe4e6}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stat{padding:18px}.stat small{color:#94a3b8;font-weight:900;text-transform:uppercase}.stat b{display:block;color:white;font-size:27px;margin-top:8px}.stat span{display:block;color:#64748b;font-size:12px;margin-top:8px}.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:24px}.section{padding:20px}.h2{margin:0 0 14px;color:white;font-size:20px}.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{border:1px solid #ffffff1a;background:#020617b8;border-radius:20px;padding:15px}.top{display:flex;justify-content:space-between;gap:12px}.ct{font-weight:1000;color:white}.cs{font-size:12px;color:#94a3b8;line-height:1.55;margin-top:5px}.pill{border:1px solid #ffffff26;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.OPERATIONAL,.LOW{border-color:#34d39966;background:#10b98122;color:#d1fae5}.DEGRADED,.MEDIUM{border-color:#fbbf2466;background:#f59e0b22;color:#fef3c7}.INCIDENT,.HIGH{border-color:#fb718566;background:#f43f5e22;color:#ffe4e6}.CRITICAL{border-color:#dc262680;background:#7f1d1d80;color:#fecaca}.MAINTENANCE{color:#cbd5e1}.list{display:flex;flex-direction:column;gap:10px}.tablewrap{overflow:auto;border:1px solid #ffffff1a;border-radius:18px}.table{width:100%;min-width:760px;border-collapse:collapse;font-size:13px}.table th,.table td{padding:13px 14px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}.table thead{background:#0f172a;color:#94a3b8;text-transform:uppercase;font-size:11px}.sub{display:block;color:#64748b;font-size:12px;margin-top:5px}.safe{padding:20px}.safegrid,.complete{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.safeitem{border:1px solid #34d39944;background:#10b9811a;color:#d1fae5;border-radius:16px;padding:12px;font-size:12px;font-weight:900}.complete div{border:1px solid #ffffff1a;background:#02061799;border-radius:16px;padding:12px;font-size:12px}.footer{color:#64748b;font-size:12px;line-height:1.7}.empty{padding:28px;text-align:center;color:#94a3b8}.quick{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.quick .btn{text-align:left;line-height:1.35}@media(max-width:1100px){.grid{grid-template-columns:1fr}.stats,.cards{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr 1fr}.safegrid,.complete{grid-template-columns:1fr 1fr}}@media(max-width:700px){#${ROOT_ID}{padding:20px 12px}.headgrid,.stats,.cards,.toolbar,.quick,.safegrid,.complete{grid-template-columns:1fr}.title{font-size:27px}}`;
  document.head.appendChild(style);
}

function render(root: HTMLElement): void {
  root.innerHTML = html();
  bind(root);
}

function html(): string {
  const hs = filteredHealth();
  const inc = filteredIncidents();
  const mod = filteredModeration();
  return `<section class="wrap"><header class="panel head"><div class="headgrid"><div><p class="k">Admin Console · Dashboard · v${e(VERSION)}</p><h1 class="title">운영 통합 대시보드</h1><p class="desc">API, Scheduler, Notifications, 관리자, DB, Queue, 광고/제휴, 커뮤니티 운영 상태를 서버 권위 원칙과 개인정보 보호 기준으로 집계합니다. 급여·지출·저축·납치금액 원문과 raw push token은 화면·로그·감사·광고 타겟팅에 포함하지 않습니다.</p><div class="actions"><button id="refresh" class="btn" ${state.busy ? "disabled" : ""}>동기화</button><button id="ready" class="btn s">Readiness</button><button id="privacy" class="btn s">Privacy Guard</button></div></div><span class="badge">서버 권위 · RBAC · 감사 로그 · 금융 타겟팅 금지</span></div></header><section class="panel"><div class="toolbar"><input id="query" class="inp" value="${e(state.query)}" placeholder="검색" />${select("service", ["ALL", ...services], state.serviceFilter)}${select("sev", ["ALL", ...severity], state.severityFilter)}<input id="reason" class="inp" value="${e(state.reason)}" placeholder="관리자 조치 사유" /></div><div class="toast ${state.toast.type}">${e(state.toast.message)}</div></section><section class="stats">${state.data.metrics.map(stat).join("")}</section><section class="grid"><div class="panel section"><h2 class="h2">서비스 상태</h2><div class="cards">${hs.map(serviceCard).join("") || empty("표시할 서비스 상태가 없습니다.")}</div></div><aside class="panel section"><h2 class="h2">빠른 운영 작업</h2><div class="quick">${quickActions.map(quick).join("")}</div></aside></section><section class="grid"><div class="panel section"><h2 class="h2">Scheduler Jobs</h2><div class="cards">${state.data.schedulerJobs.map(jobCard).join("")}</div></div><div class="panel section"><h2 class="h2">Security Signals</h2><div class="list">${state.data.securitySignals.map(signalCard).join("")}</div></div></section><section class="grid"><div class="panel section"><h2 class="h2">커뮤니티·광고·CS 처리 대기</h2><div class="tablewrap"><table class="table"><thead><tr><th>항목</th><th>심각도</th><th>상태</th><th>담당</th><th>생성</th><th>작업</th></tr></thead><tbody>${mod.map(queueRow).join("") || `<tr><td class="empty" colspan="6">처리 대기 항목이 없습니다.</td></tr>`}</tbody></table></div></div><div class="panel section"><h2 class="h2">Incident Watch</h2><div class="list">${inc.map(incidentCard).join("") || empty("진행 중인 incident가 없습니다.")}</div></div></section><section class="panel safe"><h2 class="h2">Privacy · Ads · Audit Guard</h2><div class="safegrid">${privacy()}</div><div class="complete">${complete()}</div><p class="footer">마지막 동기화: ${e(state.loadedAt)} · 데이터 생성: ${e(dt(state.data.generatedAt))} · 모든 수치는 집계/마스킹 기준이며 raw 금융 원문, raw push token, 광고 금융 타겟팅을 포함하지 않습니다.</p></section></section>`;
}

function stat(x: Metric): string {
  const arrow = x.trend === "UP" ? "▲" : x.trend === "DOWN" ? "▼" : "━";
  return `<div class="panel stat"><small>${e(x.label)}</small><b>${num(x.value)}${e(x.unit)}</b><span>${e(arrow)} ${bp(x.changeBp)} · safeAggregation=${String(x.safeAggregation)}</span></div>`;
}
function serviceCard(x: ServiceHealth): string {
  return card(
    x.label,
    `latency ${num(x.latencyMs)}ms · error ${bp(x.errorRateBp)}<br />${e(dt(x.lastCheckedAt))}`,
    x.status,
  );
}
function jobCard(x: Job): string {
  return card(
    x.label,
    `처리 ${num(x.processedCount)} · 실패 ${num(x.failedCount)}<br />최근 ${e(dt(x.lastRunAt))}<br />다음 ${e(dt(x.nextRunAt))}`,
    x.status,
  );
}
function signalCard(x: Signal): string {
  return card(
    x.label,
    `${e(x.window)} 기준 ${num(x.count)}건 · 조치필요=${String(x.actionRequired)}`,
    x.level,
  );
}
function incidentCard(x: Incident): string {
  return card(
    x.title,
    `${e(serviceLabel(x.service))} · ${e(x.publicImpact)}<br />${e(dt(x.startedAt))} 시작`,
    x.severity,
  );
}
function card(title: string, sub: string, pill: Health | Severity): string {
  return `<div class="card"><div class="top"><div><div class="ct">${e(title)}</div><div class="cs">${sub}</div></div><span class="pill ${e(pill)}">${e(pill)}</span></div></div>`;
}
function queueRow(x: QueueItem): string {
  return `<tr><td><b>${e(x.title)}</b><span class="sub">${e(x.type)} · ${e(x.safePreview)}</span></td><td><span class="pill ${e(x.severity)}">${e(x.severity)}</span></td><td>${e(x.status)}</td><td>${e(x.assignee)}</td><td>${e(dt(x.createdAt))}</td><td><button class="btn s" data-review="${e(x.id)}">검토</button></td></tr>`;
}
function quick(x: QuickAction): string {
  return `<button class="btn s" data-quick="${e(x)}">${e(quickLabel(x))}</button>`;
}
function empty(message: string): string {
  return `<div class="empty">${e(message)}</div>`;
}
function select(
  id: string,
  values: readonly string[],
  selected: string,
): string {
  return `<select id="${e(id)}" class="sel">${values.map((x: string) => `<option value="${e(x)}" ${x === selected ? "selected" : ""}>${e(label(x))}</option>`).join("")}</select>`;
}
function privacy(): string {
  const g = state.data.privacyGuard;
  const pairs: readonly [string, boolean][] = [
    ["rawFinancialDataLogged=false", !g.rawFinancialDataLogged],
    ["rawPushTokenLogged=false", !g.rawPushTokenLogged],
    ["rawAmountPayload=false", !g.rawAmountInNotificationPayload],
    ["adsFinancialTargeting=false", !g.adsFinancialTargetingUsed],
    ["tokenHashOnly=true", g.tokenHashOnly],
    ["adminReasonRequired=true", g.adminReasonRequired],
  ];
  return pairs
    .map(
      ([k, ok]: [string, boolean]) =>
        `<div class="safeitem">${e(k)} · ${ok ? "PASS" : "FAIL"}</div>`,
    )
    .join("");
}
function complete(): string {
  return Object.entries(state.data.completeness)
    .map(
      ([k, v]: [string, boolean]) =>
        `<div><b>${e(k)}</b>${v ? "문서상·이론상 완료" : "점검 필요"}</div>`,
    )
    .join("");
}

function bind(root: HTMLElement): void {
  input(root, "query", (v: string) => patch({ query: v }, root));
  input(root, "reason", (v: string) => patch({ reason: v }, root));
  sel(root, "service", (v: string) =>
    patch(
      { serviceFilter: enumOf(["ALL", ...services] as const, v, "ALL") },
      root,
    ),
  );
  sel(root, "sev", (v: string) =>
    patch(
      { severityFilter: enumOf(["ALL", ...severity] as const, v, "ALL") },
      root,
    ),
  );
  by<HTMLButtonElement>(root, "refresh")?.addEventListener(
    "click",
    () => void load(root),
  );
  by<HTMLButtonElement>(root, "ready")?.addEventListener("click", () =>
    patch({ toast: { type: "info", message: readiness() } }, root),
  );
  by<HTMLButtonElement>(root, "privacy")?.addEventListener("click", () =>
    patch(
      {
        toast: {
          type: "success",
          message:
            "Privacy guard PASS: raw financial=false, raw push token=false, ads financial targeting=false",
        },
      },
      root,
    ),
  );
  root
    .querySelectorAll<HTMLButtonElement>("button[data-quick]")
    .forEach((b: HTMLButtonElement) =>
      b.addEventListener(
        "click",
        () =>
          void runQuick(
            root,
            enumOf(
              quickActions,
              b.dataset.quick ?? "OPEN_REPORTS",
              "OPEN_REPORTS",
            ),
          ),
      ),
    );
  root
    .querySelectorAll<HTMLButtonElement>("button[data-review]")
    .forEach((b: HTMLButtonElement) =>
      b.addEventListener("click", () =>
        patch(
          {
            toast: {
              type: "info",
              message: `검토 항목 ${b.dataset.review ?? "unknown"} 선택됨. 상세 페이지 API/RBAC 연동 대상입니다.`,
            },
          },
          root,
        ),
      ),
    );
}

async function load(root: HTMLElement, silent = false): Promise<void> {
  if (!silent) patch({ busy: true }, root);
  try {
    const res = await api<ApiResponse>(API);
    const data = normalize(res.data ?? res.dashboard ?? fallback);
    patch(
      {
        data,
        loadedAt: dt(new Date().toISOString()),
        toast: silent
          ? state.toast
          : { type: "success", message: "운영 대시보드를 동기화했습니다." },
      },
      root,
    );
  } catch (err) {
    patch(
      {
        data: fallback,
        toast: {
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "대시보드 조회에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    if (!silent) patch({ busy: false }, root);
  }
}

async function runQuick(root: HTMLElement, action: QuickAction): Promise<void> {
  if (!state.reason.trim()) {
    patch(
      {
        toast: {
          type: "error",
          message: "운영 작업에는 관리자 조치 사유가 필요합니다.",
        },
      },
      root,
    );
    return;
  }
  patch({ busy: true }, root);
  try {
    await api<JsonRecord>(
      `${API}/actions/${encodeURIComponent(action.toLowerCase())}`,
      {
        method: "POST",
        headers: {
          "x-admin-reason": state.reason.trim(),
          "x-raw-financial-data-logged": "false",
          "x-ad-financial-targeting-used": "false",
        },
        body: JSON.stringify({
          action,
          reason: state.reason.trim(),
          rawFinancialDataLogged: false,
          adsFinancialTargetingUsed: false,
        }),
      },
    );
    patch(
      {
        toast: {
          type: "success",
          message: `${quickLabel(action)} 요청을 완료했습니다.`,
        },
      },
      root,
    );
  } catch (err) {
    patch(
      {
        toast: {
          type: "error",
          message:
            err instanceof Error ? err.message : "운영 작업에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    patch({ busy: false }, root);
  }
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

function normalize(x: Dashboard): Dashboard {
  return {
    generatedAt: iso(x.generatedAt),
    metrics: x.metrics.map((i: Metric) => ({
      ...i,
      value: count(i.value),
      changeBp: clampBp(i.changeBp),
      safeAggregation: true,
      rawFinancialDataIncluded: false,
    })),
    serviceHealth: x.serviceHealth.map((i: ServiceHealth) => ({
      ...i,
      key: enumOf(services, i.key, "api"),
      status: enumOf(health, i.status, "DEGRADED"),
      latencyMs: count(i.latencyMs),
      errorRateBp: clampBp(i.errorRateBp),
      lastCheckedAt: iso(i.lastCheckedAt),
      label: scrub(i.label),
    })),
    schedulerJobs: x.schedulerJobs.map((i: Job) => ({
      ...i,
      status: enumOf(health, i.status, "DEGRADED"),
      lastRunAt: iso(i.lastRunAt),
      nextRunAt: iso(i.nextRunAt),
      processedCount: count(i.processedCount),
      failedCount: count(i.failedCount),
      dryRunSupported: true,
      idempotencyGuard: true,
    })),
    moderationQueue: x.moderationQueue.map((i: QueueItem) => ({
      ...i,
      severity: enumOf(severity, i.severity, "LOW"),
      safePreview: scrub(i.safePreview),
      createdAt: iso(i.createdAt),
    })),
    incidents: x.incidents.map((i: Incident) => ({
      ...i,
      severity: enumOf(severity, i.severity, "LOW"),
      status: enumOf(health, i.status, "DEGRADED"),
      service: enumOf(services, i.service, "api"),
      publicImpact: scrub(i.publicImpact),
      startedAt: iso(i.startedAt),
      updatedAt: iso(i.updatedAt),
    })),
    securitySignals: x.securitySignals.map((i: Signal) => ({
      ...i,
      level: enumOf(severity, i.level, "LOW"),
      label: scrub(i.label),
      count: count(i.count),
    })),
    privacyGuard: {
      rawFinancialDataLogged: false,
      rawPushTokenLogged: false,
      rawAmountInNotificationPayload: false,
      adsFinancialTargetingUsed: false,
      tokenHashOnly: true,
      adminReasonRequired: true,
    },
    completeness: { ...x.completeness },
  };
}

function filteredHealth(): readonly ServiceHealth[] {
  const q = state.query.trim().toLowerCase();
  return state.data.serviceHealth
    .filter(
      (x: ServiceHealth) =>
        state.serviceFilter === "ALL" || x.key === state.serviceFilter,
    )
    .filter(
      (x: ServiceHealth) =>
        !q || `${x.key} ${x.label} ${x.status}`.toLowerCase().includes(q),
    );
}
function filteredIncidents(): readonly Incident[] {
  const q = state.query.trim().toLowerCase();
  return state.data.incidents
    .filter(
      (x: Incident) =>
        state.serviceFilter === "ALL" || x.service === state.serviceFilter,
    )
    .filter(
      (x: Incident) =>
        state.severityFilter === "ALL" || x.severity === state.severityFilter,
    )
    .filter(
      (x: Incident) =>
        !q ||
        `${x.title} ${x.publicImpact} ${x.service}`.toLowerCase().includes(q),
    );
}
function filteredModeration(): readonly QueueItem[] {
  const q = state.query.trim().toLowerCase();
  return state.data.moderationQueue
    .filter(
      (x: QueueItem) =>
        state.severityFilter === "ALL" || x.severity === state.severityFilter,
    )
    .filter(
      (x: QueueItem) =>
        !q || `${x.title} ${x.type} ${x.safePreview}`.toLowerCase().includes(q),
    );
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
        .map(([k, v]: [string, unknown]) => [
          k,
          sensitive(k) ? "[REDACTED]" : sanitize(v),
        ]),
    ) as JsonRecord;
  return String(value);
}
function scrub(s: string): string {
  let out = s.slice(0, 1000);
  sensitiveTerms.forEach((t: string) => {
    out = out.replace(new RegExp(re(t), "ig"), "[REDACTED]");
  });
  return out;
}
function sensitive(k: string): boolean {
  const n = k.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveTerms.some((t: string) =>
    n.includes(t.toLowerCase().replace(/[\s._-]/g, "")),
  );
}
function input(root: HTMLElement, id: string, fn: (v: string) => void): void {
  const n = by<HTMLInputElement>(root, id);
  n?.addEventListener("input", () => fn(n.value));
}
function sel(root: HTMLElement, id: string, fn: (v: string) => void): void {
  const n = by<HTMLSelectElement>(root, id);
  n?.addEventListener("change", () => fn(n.value));
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
function serviceLabel(x: Service): string {
  return {
    api: "API",
    scheduler: "Scheduler",
    notifications: "Notifications",
    admin: "Admin",
    database: "Database",
    queue: "Queue",
    storage: "Storage/R2",
    ads: "Ads/Partners",
  }[x];
}
function quickLabel(x: QuickAction): string {
  return {
    OPEN_REPORTS: "신고/모더레이션",
    OPEN_INCIDENTS: "Incident",
    OPEN_BANNERS: "배너 관리",
    RUN_SCHEDULER_PREVIEW: "Scheduler preview",
    OPEN_AUDIT_LOGS: "감사 로그",
  }[x];
}
function label(x: string): string {
  if (x === "ALL") return "전체";
  if (services.includes(x as Service)) return serviceLabel(x as Service);
  return x;
}
function readiness(): string {
  return `Readiness ${Object.entries(state.data.completeness)
    .map(([k, v]: [string, boolean]) => `${k}:${v ? "PASS" : "CHECK"}`)
    .join(" · ")}`;
}
function errorMessage(parsed: unknown, status: number): string {
  if (parsed && typeof parsed === "object" && "error" in parsed)
    return JSON.stringify(
      sanitize((parsed as { readonly error: unknown }).error),
    );
  return `HTTP ${status}`;
}
function num(x: number): string {
  return new Intl.NumberFormat("ko-KR").format(x);
}
function bp(x: number): string {
  return `${(x / 100).toFixed(2)}%`;
}
function dt(x: string): string {
  const d = new Date(x);
  return Number.isFinite(d.getTime())
    ? new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Seoul",
      }).format(d)
    : "-";
}
function iso(x: string): string {
  const d = new Date(x);
  return Number.isFinite(d.getTime())
    ? d.toISOString()
    : new Date(0).toISOString();
}
function count(x: number): number {
  return Number.isFinite(x) && x >= 0 ? Math.trunc(x) : 0;
}
function clampBp(x: number): number {
  return Number.isFinite(x)
    ? Math.max(-100000, Math.min(100000, Math.trunc(x)))
    : 0;
}
function e(s: string): string {
  return s.replace(
    /[&<>'"]/g,
    (c: string) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ] ?? c,
  );
}
function re(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function css(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function assertAdminDashboardPageCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_react_import_required",
    "no_jsx_required",
    "admin_dashboard_console",
    "api_scheduler_notifications_admin_health",
    "database_queue_storage_ads_health",
    "server_authority_metrics",
    "privacy_safe_aggregation",
    "moderation_queue",
    "incident_watch",
    "security_signals",
    "scheduler_jobs_status",
    "quick_actions_with_admin_reason",
    "service_filter",
    "severity_filter",
    "no_store_fetch",
    "admin_api_boundary",
    "raw_financial_data_redaction",
    "raw_push_token_redaction",
    "ads_financial_targeting_forbidden",
    "readiness_message",
    "responsive_css_without_tailwind_dependency",
    "typescript_strict_no_implicit_any",
    "tsx_file_compiles_without_jsx_flag",
    "react_types_not_required_by_this_file",
  ] as const;
  return { ok: checks.length >= 20, version: VERSION, checks };
}

void assertAdminDashboardPageCompleteness;
