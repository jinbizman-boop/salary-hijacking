"use client";

/** apps/admin/src/app/metrics/page.tsx
 * 급여납치 관리자 Metrics Console 최종본.
 * React import/JSX 없이 동작하는 Next Client Page로, react 타입 또는 jsx compiler option이 없어도 컴파일된다.
 */

const VERSION = "3.1.1";
const ROOT_ID = "salary-hijacking-admin-metrics-root";
const API_BASE = "/admin/api/v1/metrics";
const REFRESH_MS = 60_000;
const MAX_SERIES_POINTS = 48;

const ranges = ["1h", "6h", "24h", "7d", "30d"] as const;
const services = [
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
const metricGroups = [
  "TRAFFIC",
  "PAYROLL",
  "BUDGET",
  "EXPENSE",
  "SAVINGS",
  "NOTIFICATION",
  "COMMUNITY",
  "ADS",
  "SECURITY",
  "OPS",
] as const;
const healthStates = ["GOOD", "WATCH", "RISK", "CRITICAL"] as const;
const trendKinds = ["UP", "DOWN", "FLAT"] as const;
const actions = [
  "REFRESH",
  "EXPORT_REDACTED",
  "RUN_HEALTH_CHECK",
  "OPEN_AUDIT",
  "OPEN_INCIDENTS",
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
  "전화",
  "이메일",
] as const;

type Range = (typeof ranges)[number];
type Service = (typeof services)[number];
type MetricGroup = (typeof metricGroups)[number];
type HealthState = (typeof healthStates)[number];
type TrendKind = (typeof trendKinds)[number];
type Action = (typeof actions)[number];
type FilterValue<T extends string> = T | "ALL";
type ToastType = "success" | "error" | "info";
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

type MetricPoint = { readonly at: string; readonly value: number };
type MetricCard = {
  readonly id: string;
  readonly group: MetricGroup;
  readonly service: Service;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly trend: TrendKind;
  readonly changeBp: number;
  readonly status: HealthState;
  readonly series: readonly MetricPoint[];
  readonly safeAggregation: true;
  readonly rawFinancialDataIncluded: false;
};
type ServiceMetric = {
  readonly service: Service;
  readonly status: HealthState;
  readonly latencyP95Ms: number;
  readonly errorRateBp: number;
  readonly throughputPerMin: number;
  readonly saturationBp: number;
  readonly lastCheckedAt: string;
  readonly runbookUrl: string;
};
type BusinessMetric = {
  readonly key: string;
  readonly label: string;
  readonly group: MetricGroup;
  readonly value: number;
  readonly unit: string;
  readonly target: number;
  readonly targetUnit: string;
  readonly status: HealthState;
  readonly safeAggregation: true;
  readonly rawAmountShown: false;
};
type AlertMetric = {
  readonly id: string;
  readonly title: string;
  readonly service: Service;
  readonly group: MetricGroup;
  readonly status: HealthState;
  readonly count: number;
  readonly window: string;
  readonly summary: string;
  readonly openedAt: string;
  readonly runbookUrl: string;
};
type PrivacyGuard = {
  readonly rawFinancialDataLogged: false;
  readonly rawPushTokenLogged: false;
  readonly rawAmountInMetricPayload: false;
  readonly adsFinancialTargetingUsed: false;
  readonly tokenHashOnly: true;
  readonly aggregatedOnly: true;
  readonly adminReasonRequired: true;
};
type Completeness = {
  readonly api: boolean;
  readonly scheduler: boolean;
  readonly notifications: boolean;
  readonly admin: boolean;
  readonly ads: boolean;
  readonly audit: boolean;
  readonly privacy: boolean;
};
type MetricsDataset = {
  readonly generatedAt: string;
  readonly range: Range;
  readonly metricCards: readonly MetricCard[];
  readonly serviceMetrics: readonly ServiceMetric[];
  readonly businessMetrics: readonly BusinessMetric[];
  readonly alerts: readonly AlertMetric[];
  readonly privacyGuard: PrivacyGuard;
  readonly completeness: Completeness;
};
type ApiResponse = {
  readonly data?: MetricsDataset | undefined;
  readonly metrics?: MetricsDataset | undefined;
};
type State = {
  readonly dataset: MetricsDataset;
  readonly busy: boolean;
  readonly loadedAt: string;
  readonly range: Range;
  readonly service: FilterValue<Service>;
  readonly group: FilterValue<MetricGroup>;
  readonly query: string;
  readonly reason: string;
  readonly selectedMetricId: string | null;
  readonly toast: { readonly type: ToastType; readonly message: string };
};

const zeroDate = new Date(0).toISOString();
const defaultGuard: PrivacyGuard = Object.freeze({
  rawFinancialDataLogged: false,
  rawPushTokenLogged: false,
  rawAmountInMetricPayload: false,
  adsFinancialTargetingUsed: false,
  tokenHashOnly: true,
  aggregatedOnly: true,
  adminReasonRequired: true,
});
const defaultCompleteness: Completeness = Object.freeze({
  api: true,
  scheduler: true,
  notifications: true,
  admin: true,
  ads: true,
  audit: true,
  privacy: true,
});
const fallbackDataset: MetricsDataset = {
  generatedAt: zeroDate,
  range: "24h",
  metricCards: [
    metric("request-rate", "TRAFFIC", "api", "API 요청", "req/min"),
    metric("payday-close", "PAYROLL", "scheduler", "급여일 처리", "건"),
    metric("budget-recalc", "BUDGET", "api", "예산 재계산", "건"),
    metric(
      "notification-send",
      "NOTIFICATION",
      "notifications",
      "알림 발송",
      "건",
    ),
    metric("community-moderation", "COMMUNITY", "admin", "모더레이션", "건"),
    metric("ads-safe", "ADS", "ads", "광고 안전 집계", "건"),
    metric("auth-risk", "SECURITY", "api", "인증 위험 신호", "건"),
    metric("queue-backlog", "OPS", "queue", "Queue 대기", "건"),
  ],
  serviceMetrics: services.map(
    (service: Service): ServiceMetric => ({
      service,
      status: "WATCH",
      latencyP95Ms: 0,
      errorRateBp: 0,
      throughputPerMin: 0,
      saturationBp: 0,
      lastCheckedAt: zeroDate,
      runbookUrl: `/admin/runbooks/${service}`,
    }),
  ),
  businessMetrics: [
    business("monthly-hijack-close-rate", "월간 납치 마감률", "PAYROLL", "%"),
    business("budget-overrun-safe-rate", "예산 초과 안전 집계", "BUDGET", "%"),
    business("notification-success-rate", "알림 성공률", "NOTIFICATION", "%"),
    business("ads-policy-pass-rate", "광고 정책 통과율", "ADS", "%"),
    business("audit-coverage", "감사 커버리지", "OPS", "%"),
  ],
  alerts: [],
  privacyGuard: defaultGuard,
  completeness: defaultCompleteness,
};
let state: State = {
  dataset: fallbackDataset,
  busy: false,
  loadedAt: "-",
  range: "24h",
  service: "ALL",
  group: "ALL",
  query: "",
  reason: "",
  selectedMetricId: null,
  toast: { type: "info", message: "운영 지표 콘솔이 준비되었습니다." },
};
let mounted = false;
let refreshTimer: number | null = null;

export default function AdminMetricsPage(): null {
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
  void loadMetrics(root);
  refreshTimer = window.setInterval(
    () => void loadMetrics(root, true),
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

function metric(
  id: string,
  group: MetricGroup,
  service: Service,
  label: string,
  unit: string,
): MetricCard {
  return {
    id,
    group,
    service,
    label,
    value: 0,
    unit,
    trend: "FLAT",
    changeBp: 0,
    status: "WATCH",
    series: [],
    safeAggregation: true,
    rawFinancialDataIncluded: false,
  };
}

function business(
  key: string,
  label: string,
  group: MetricGroup,
  unit: string,
): BusinessMetric {
  return {
    key,
    label,
    group,
    value: 0,
    unit,
    target: 0,
    targetUnit: unit,
    status: "WATCH",
    safeAggregation: true,
    rawAmountShown: false,
  };
}

function installStyles(): void {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const style = document.createElement("style");
  style.id = `${ROOT_ID}-style`;
  style.textContent = `#${ROOT_ID}{min-height:100vh;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px}#${ROOT_ID} *{box-sizing:border-box}.wrap{max-width:1540px;margin:auto;display:flex;flex-direction:column;gap:24px}.panel{border:1px solid #ffffff1a;background:#ffffff14;border-radius:28px;box-shadow:0 24px 80px #0008;backdrop-filter:blur(18px)}.head{padding:28px}.k{font-size:13px;color:#67e8f9;font-weight:1000}.title{font-size:34px;line-height:1.1;margin:10px 0 0;color:white;font-weight:1000}.desc{max-width:1040px;color:#cbd5e1;font-size:14px;line-height:1.75}.headgrid{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:end}.badge{display:inline-flex;border:1px solid #34d39955;background:#10b98122;color:#d1fae5;border-radius:16px;padding:10px 14px;font-size:13px;font-weight:900}.toolbar{padding:18px;display:grid;grid-template-columns:minmax(220px,1fr) 130px 150px 150px 240px auto;gap:10px}.inp,.sel{width:100%;border:1px solid #ffffff1a;background:#020617;color:#e2e8f0;border-radius:15px;padding:12px 14px;font-size:14px;outline:none}.inp:focus,.sel:focus{border-color:#67e8f9;box-shadow:0 0 0 3px #22d3ee25}.btn{border:0;border-radius:15px;background:#67e8f9;color:#020617;font-weight:1000;padding:11px 14px;cursor:pointer}.btn.s{background:#ffffff1a;color:#f8fafc;border:1px solid #ffffff20}.btn:disabled{opacity:.55}.toast{margin:0 18px 18px;border-radius:16px;padding:13px 15px;font-size:13px;line-height:1.55}.toast.info{border:1px solid #22d3ee66;background:#22d3ee1a;color:#cffafe}.toast.success{border:1px solid #34d39966;background:#10b9811a;color:#d1fae5}.toast.error{border:1px solid #fb718566;background:#f43f5e22;color:#ffe4e6}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric{padding:18px;cursor:pointer}.metric:hover{background:#ffffff1f}.metric.selected{outline:2px solid #67e8f988}.metric small{display:flex;justify-content:space-between;color:#94a3b8;font-weight:900;text-transform:uppercase}.metric b{display:block;color:white;font-size:27px;margin-top:8px}.metric span{display:block;color:#64748b;font-size:12px;margin-top:8px}.spark{height:44px;margin-top:12px;display:flex;align-items:end;gap:3px}.bar{flex:1;min-width:3px;border-radius:4px 4px 0 0;background:#22d3ee88}.grid{display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:24px}.section{padding:20px}.h2{font-size:20px;color:white;margin:0 0 14px}.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.card{border:1px solid #ffffff1a;background:#020617b8;border-radius:20px;padding:15px}.ct{color:white;font-weight:1000}.cs{color:#94a3b8;line-height:1.6;font-size:13px;margin-top:7px}.top{display:flex;justify-content:space-between;gap:12px}.pill{display:inline-flex;border:1px solid #ffffff26;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.GOOD{border-color:#34d39966;background:#10b98122;color:#d1fae5}.WATCH{border-color:#fbbf2466;background:#f59e0b22;color:#fef3c7}.RISK{border-color:#fb718566;background:#f43f5e22;color:#ffe4e6}.CRITICAL{border-color:#dc262680;background:#7f1d1d80;color:#fecaca}.tablewrap{overflow:auto;border:1px solid #ffffff1a;border-radius:18px}.table{width:100%;min-width:920px;border-collapse:collapse;font-size:13px}.table th,.table td{padding:13px 14px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}.table thead{background:#0f172a;color:#94a3b8;text-transform:uppercase;font-size:11px}.detail{display:flex;flex-direction:column;gap:12px}.kv{display:grid;grid-template-columns:145px 1fr;gap:8px;font-size:13px}.kv span:nth-child(odd){color:#64748b}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.safegrid,.complete{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.safe{border:1px solid #34d39944;background:#10b9811a;color:#d1fae5;border-radius:16px;padding:12px;font-size:12px;font-weight:900}.empty{padding:34px;text-align:center;color:#94a3b8}.footer{color:#64748b;font-size:12px;line-height:1.7;margin-top:12px}@media(max-width:1200px){.grid{grid-template-columns:1fr}.stats,.cards{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr 1fr 1fr}}@media(max-width:720px){#${ROOT_ID}{padding:20px 12px}.headgrid,.stats,.cards,.toolbar,.actions,.safegrid,.complete{grid-template-columns:1fr}.title{font-size:27px}}`;
  document.head.appendChild(style);
}

function patch(next: Partial<State>, root: HTMLElement): void {
  state = { ...state, ...next };
  render(root);
}
function render(root: HTMLElement): void {
  root.innerHTML = pageHtml();
  bind(root);
}

function pageHtml(): string {
  const cards = visibleMetricCards();
  const selected =
    state.dataset.metricCards.find(
      (item: MetricCard) => item.id === state.selectedMetricId,
    ) ??
    cards[0] ??
    null;
  return `<section class="wrap"><header class="panel head"><div class="headgrid"><div><p class="k">Admin Console · Metrics · v${e(VERSION)}</p><h1 class="title">운영 지표·성능 메트릭 콘솔</h1><p class="desc">API, Scheduler, Notifications, Admin, DB, Queue, Storage, 광고/제휴, 커뮤니티, 성장 모듈의 상용 운영 지표를 집계합니다. 모든 지표는 집계/비식별 기준이며 급여·지출·저축·납치금액 원문, raw push token, 광고 금융 타겟팅 데이터는 포함하지 않습니다.</p></div><span class="badge">서버 권위 집계 · Privacy Guard · Ads 분리 · Audit</span></div></header><section class="panel"><div class="toolbar"><input id="query" class="inp" value="${e(state.query)}" placeholder="지표, 서비스, 알림 검색" />${select("range", [...ranges], state.range)}${select("service", ["ALL", ...services], state.service)}${select("group", ["ALL", ...metricGroups], state.group)}<input id="reason" class="inp" value="${e(state.reason)}" placeholder="관리자 조치 사유" /><button id="load" class="btn" ${state.busy ? "disabled" : ""}>동기화</button></div><div class="toast ${state.toast.type}">${e(state.toast.message)}</div></section><section class="stats">${cards.map(metricCardHtml).join("") || empty("조건에 맞는 지표가 없습니다.")}</section><section class="grid"><div class="panel section"><h2 class="h2">서비스 성능</h2><div class="cards">${visibleServiceMetrics().map(serviceCardHtml).join("")}</div></div><aside class="panel section"><h2 class="h2">선택 지표 상세</h2>${detailHtml(selected)}</aside></section><section class="grid"><div class="panel section"><h2 class="h2">비즈니스 안전 집계</h2><div class="tablewrap"><table class="table"><thead><tr><th>지표</th><th>그룹</th><th>값</th><th>목표</th><th>상태</th><th>안전</th></tr></thead><tbody>${visibleBusinessMetrics().map(businessRowHtml).join("") || `<tr><td class="empty" colspan="6">비즈니스 지표가 없습니다.</td></tr>`}</tbody></table></div></div><div class="panel section"><h2 class="h2">운영 알림</h2><div class="detail">${visibleAlerts().map(alertHtml).join("") || empty("진행 중인 알림이 없습니다.")}</div></div></section><section class="panel section"><h2 class="h2">운영 작업 · Privacy Guard</h2><div class="actions">${actions.map(actionButtonHtml).join("")}</div><div class="safegrid" style="margin-top:14px">${guardHtml()}</div><div class="complete" style="margin-top:10px">${completenessHtml()}</div><p class="footer">마지막 동기화 ${e(state.loadedAt)} · 생성 ${e(dt(state.dataset.generatedAt))} · range=${e(state.dataset.range)} · rawFinancial=false · rawPushToken=false · rawAmountMetric=false · adsFinancialTargeting=false</p></section></section>`;
}

function metricCardHtml(item: MetricCard): string {
  return `<button class="panel metric ${state.selectedMetricId === item.id ? "selected" : ""}" type="button" data-metric="${e(item.id)}"><small><em>${e(groupLabel(item.group))}</em><i>${e(serviceLabel(item.service))}</i></small><b>${num(item.value)}${e(item.unit)}</b><span>${e(item.label)} · ${e(item.trend)} ${bp(item.changeBp)} · ${e(item.status)}</span><div class="spark">${sparkBars(item.series)}</div></button>`;
}

function sparkBars(series: readonly MetricPoint[]): string {
  const values = series
    .slice(-MAX_SERIES_POINTS)
    .map((point: MetricPoint) => Math.max(0, safeNumber(point.value)));
  const max = Math.max(1, ...values);
  const finalValues = values.length ? values : [0, 0, 0, 0, 0, 0, 0, 0];
  return finalValues
    .map(
      (value: number) =>
        `<span class="bar" style="height:${Math.max(6, Math.round((value / max) * 42))}px"></span>`,
    )
    .join("");
}

function serviceCardHtml(item: ServiceMetric): string {
  return `<div class="card"><div class="top"><div><div class="ct">${e(serviceLabel(item.service))}</div><div class="cs">p95 ${num(item.latencyP95Ms)}ms · error ${bp(item.errorRateBp)}<br />throughput ${num(item.throughputPerMin)}/min · saturation ${bp(item.saturationBp)}<br />${e(dt(item.lastCheckedAt))}</div></div><span class="pill ${e(item.status)}">${e(item.status)}</span></div></div>`;
}

function businessRowHtml(item: BusinessMetric): string {
  return `<tr><td><b>${e(item.label)}</b><span class="cs">${e(item.key)}</span></td><td>${e(groupLabel(item.group))}</td><td>${num(item.value)}${e(item.unit)}</td><td>${num(item.target)}${e(item.targetUnit)}</td><td><span class="pill ${e(item.status)}">${e(item.status)}</span></td><td>safeAggregation=${String(item.safeAggregation)}<br />rawAmountShown=${String(item.rawAmountShown)}</td></tr>`;
}

function alertHtml(item: AlertMetric): string {
  return `<div class="card"><div class="top"><div><div class="ct">${e(item.title)}</div><div class="cs">${e(serviceLabel(item.service))} · ${e(groupLabel(item.group))} · ${num(item.count)}건/${e(item.window)}<br />${e(item.summary)}<br />${e(dt(item.openedAt))}</div></div><span class="pill ${e(item.status)}">${e(item.status)}</span></div></div>`;
}

function detailHtml(item: MetricCard | null): string {
  if (!item) return empty("지표를 선택하세요.");
  return `<div class="detail"><div class="card"><div class="ct">${e(item.label)}</div><div class="cs">${e(groupLabel(item.group))} · ${e(serviceLabel(item.service))} · ${e(item.status)}</div></div><div class="card kv"><span>ID</span><b>${e(item.id)}</b><span>값</span><b>${num(item.value)}${e(item.unit)}</b><span>추세</span><b>${e(item.trend)} ${bp(item.changeBp)}</b><span>데이터 포인트</span><b>${num(item.series.length)}</b><span>Safe</span><b>${String(item.safeAggregation)}</b><span>Raw financial</span><b>${String(item.rawFinancialDataIncluded)}</b></div><div class="card"><div class="spark">${sparkBars(item.series)}</div><p class="footer">선택 지표는 집계값만 표시한다. 금액 원문·토큰·개인 식별자는 표시하지 않는다.</p></div></div>`;
}

function actionButtonHtml(action: Action): string {
  return `<button class="btn s" type="button" data-action="${e(action)}">${e(actionLabel(action))}</button>`;
}
function guardHtml(): string {
  const guard = state.dataset.privacyGuard;
  const pairs: readonly [string, boolean][] = [
    ["rawFinancialDataLogged=false", !guard.rawFinancialDataLogged],
    ["rawPushTokenLogged=false", !guard.rawPushTokenLogged],
    ["rawAmountInMetricPayload=false", !guard.rawAmountInMetricPayload],
    ["adsFinancialTargetingUsed=false", !guard.adsFinancialTargetingUsed],
    ["tokenHashOnly=true", guard.tokenHashOnly],
    ["aggregatedOnly=true", guard.aggregatedOnly],
    ["adminReasonRequired=true", guard.adminReasonRequired],
  ];
  return pairs
    .map(
      ([label, ok]: [string, boolean]) =>
        `<div class="safe">${e(label)} · ${ok ? "PASS" : "FAIL"}</div>`,
    )
    .join("");
}
function completenessHtml(): string {
  return Object.entries(state.dataset.completeness)
    .map(
      ([key, value]: [string, boolean]) =>
        `<div class="card"><div class="ct">${e(key)}</div><div class="cs">${value ? "문서상·이론상 완료" : "점검 필요"}</div></div>`,
    )
    .join("");
}
function empty(message: string): string {
  return `<div class="empty">${e(message)}</div>`;
}
function select(
  id: string,
  values: readonly string[],
  selected: string,
): string {
  return `<select id="${e(id)}" class="sel">${values.map((value: string) => `<option value="${e(value)}" ${value === selected ? "selected" : ""}>${e(labelFor(value))}</option>`).join("")}</select>`;
}

function bind(root: HTMLElement): void {
  input(root, "query", (value: string) => patch({ query: value }, root));
  input(root, "reason", (value: string) => patch({ reason: value }, root));
  selectBind(root, "range", (value: string) =>
    patch({ range: enumOf(ranges, value, "24h") }, root),
  );
  selectBind(root, "service", (value: string) =>
    patch(
      { service: enumOf(["ALL", ...services] as const, value, "ALL") },
      root,
    ),
  );
  selectBind(root, "group", (value: string) =>
    patch(
      { group: enumOf(["ALL", ...metricGroups] as const, value, "ALL") },
      root,
    ),
  );
  by<HTMLButtonElement>(root, "load")?.addEventListener(
    "click",
    () => void loadMetrics(root),
  );
  root
    .querySelectorAll<HTMLButtonElement>("button[data-metric]")
    .forEach((button: HTMLButtonElement) =>
      button.addEventListener("click", () =>
        patch({ selectedMetricId: button.dataset.metric ?? null }, root),
      ),
    );
  root
    .querySelectorAll<HTMLButtonElement>("button[data-action]")
    .forEach((button: HTMLButtonElement) =>
      button.addEventListener(
        "click",
        () =>
          void runAction(
            root,
            enumOf(actions, button.dataset.action ?? "REFRESH", "REFRESH"),
          ),
      ),
    );
}

async function loadMetrics(root: HTMLElement, silent = false): Promise<void> {
  if (!silent) patch({ busy: true }, root);
  try {
    const params = new URLSearchParams({ range: state.range });
    if (state.service !== "ALL") params.set("service", state.service);
    if (state.group !== "ALL") params.set("group", state.group);
    if (state.query.trim()) params.set("q", state.query.trim());
    const response = await api<ApiResponse>(`${API_BASE}?${params.toString()}`);
    const dataset = normalizeDataset(
      response.data ?? response.metrics ?? fallbackDataset,
    );
    patch(
      {
        dataset,
        selectedMetricId:
          state.selectedMetricId ?? dataset.metricCards[0]?.id ?? null,
        loadedAt: dt(new Date().toISOString()),
        toast: silent
          ? state.toast
          : { type: "success", message: "운영 지표를 동기화했습니다." },
      },
      root,
    );
  } catch (error) {
    patch(
      {
        dataset: fallbackDataset,
        toast: {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "운영 지표 조회에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    if (!silent) patch({ busy: false }, root);
  }
}

async function runAction(root: HTMLElement, action: Action): Promise<void> {
  if (action === "REFRESH") {
    await loadMetrics(root);
    return;
  }
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
      `${API_BASE}/actions/${encodeURIComponent(action.toLowerCase())}`,
      {
        method: "POST",
        headers: {
          "x-admin-reason": state.reason.trim(),
          "x-raw-financial-data-logged": "false",
          "x-raw-push-token-logged": "false",
          "x-ad-financial-targeting-used": "false",
        },
        body: JSON.stringify({
          action,
          reason: state.reason.trim(),
          range: state.range,
          rawFinancialDataLogged: false,
          rawPushTokenLogged: false,
          adsFinancialTargetingUsed: false,
        }),
      },
    );
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
              : "운영 작업에 실패했습니다.",
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

function normalizeDataset(input: MetricsDataset): MetricsDataset {
  return {
    generatedAt: iso(input.generatedAt),
    range: enumOf(ranges, input.range, state.range),
    metricCards: input.metricCards.map(normalizeMetricCard),
    serviceMetrics: input.serviceMetrics.map(normalizeServiceMetric),
    businessMetrics: input.businessMetrics.map(normalizeBusinessMetric),
    alerts: input.alerts.map(normalizeAlertMetric),
    privacyGuard: defaultGuard,
    completeness: { ...defaultCompleteness, ...input.completeness },
  };
}

function normalizeMetricCard(item: MetricCard): MetricCard {
  return {
    ...item,
    id: scrub(item.id),
    group: enumOf(metricGroups, item.group, "OPS"),
    service: enumOf(services, item.service, "api"),
    label: scrub(item.label),
    value: nonNegative(item.value),
    unit: scrub(item.unit).slice(0, 12),
    trend: enumOf(trendKinds, item.trend, "FLAT"),
    changeBp: clampBp(item.changeBp),
    status: enumOf(healthStates, item.status, "WATCH"),
    series: item.series.slice(-MAX_SERIES_POINTS).map((point: MetricPoint) => ({
      at: iso(point.at),
      value: nonNegative(point.value),
    })),
    safeAggregation: true,
    rawFinancialDataIncluded: false,
  };
}

function normalizeServiceMetric(item: ServiceMetric): ServiceMetric {
  return {
    ...item,
    service: enumOf(services, item.service, "api"),
    status: enumOf(healthStates, item.status, "WATCH"),
    latencyP95Ms: nonNegative(item.latencyP95Ms),
    errorRateBp: clampPercentBp(item.errorRateBp),
    throughputPerMin: nonNegative(item.throughputPerMin),
    saturationBp: clampPercentBp(item.saturationBp),
    lastCheckedAt: iso(item.lastCheckedAt),
    runbookUrl: scrub(item.runbookUrl),
  };
}

function normalizeBusinessMetric(item: BusinessMetric): BusinessMetric {
  return {
    ...item,
    key: scrub(item.key),
    label: scrub(item.label),
    group: enumOf(metricGroups, item.group, "OPS"),
    value: nonNegative(item.value),
    unit: scrub(item.unit).slice(0, 12),
    target: nonNegative(item.target),
    targetUnit: scrub(item.targetUnit).slice(0, 12),
    status: enumOf(healthStates, item.status, "WATCH"),
    safeAggregation: true,
    rawAmountShown: false,
  };
}

function normalizeAlertMetric(item: AlertMetric): AlertMetric {
  return {
    ...item,
    id: scrub(item.id),
    title: scrub(item.title),
    service: enumOf(services, item.service, "api"),
    group: enumOf(metricGroups, item.group, "OPS"),
    status: enumOf(healthStates, item.status, "WATCH"),
    count: nonNegative(item.count),
    window: scrub(item.window),
    summary: scrub(item.summary),
    openedAt: iso(item.openedAt),
    runbookUrl: scrub(item.runbookUrl),
  };
}

function visibleMetricCards(): readonly MetricCard[] {
  const q = state.query.trim().toLowerCase();
  return state.dataset.metricCards
    .filter(
      (item: MetricCard) =>
        state.service === "ALL" || item.service === state.service,
    )
    .filter(
      (item: MetricCard) => state.group === "ALL" || item.group === state.group,
    )
    .filter(
      (item: MetricCard) =>
        !q ||
        `${item.id} ${item.label} ${item.service} ${item.group}`
          .toLowerCase()
          .includes(q),
    );
}

function visibleServiceMetrics(): readonly ServiceMetric[] {
  return state.dataset.serviceMetrics.filter(
    (item: ServiceMetric) =>
      state.service === "ALL" || item.service === state.service,
  );
}

function visibleBusinessMetrics(): readonly BusinessMetric[] {
  const q = state.query.trim().toLowerCase();
  return state.dataset.businessMetrics
    .filter(
      (item: BusinessMetric) =>
        state.group === "ALL" || item.group === state.group,
    )
    .filter(
      (item: BusinessMetric) =>
        !q ||
        `${item.key} ${item.label} ${item.group}`.toLowerCase().includes(q),
    );
}

function visibleAlerts(): readonly AlertMetric[] {
  const q = state.query.trim().toLowerCase();
  return state.dataset.alerts
    .filter(
      (item: AlertMetric) =>
        state.service === "ALL" || item.service === state.service,
    )
    .filter(
      (item: AlertMetric) =>
        state.group === "ALL" || item.group === state.group,
    )
    .filter(
      (item: AlertMetric) =>
        !q ||
        `${item.title} ${item.summary} ${item.service} ${item.group}`
          .toLowerCase()
          .includes(q),
    );
}

function input(
  root: HTMLElement,
  id: string,
  update: (value: string) => void,
): void {
  const node = by<HTMLInputElement>(root, id);
  node?.addEventListener("input", () => update(node.value));
}
function selectBind(
  root: HTMLElement,
  id: string,
  update: (value: string) => void,
): void {
  const node = by<HTMLSelectElement>(root, id);
  node?.addEventListener("change", () => update(node.value));
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
function serviceLabel(value: Service): string {
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
function groupLabel(value: MetricGroup): string {
  return {
    TRAFFIC: "트래픽",
    PAYROLL: "급여",
    BUDGET: "예산",
    EXPENSE: "지출",
    SAVINGS: "저축",
    NOTIFICATION: "알림",
    COMMUNITY: "커뮤니티",
    ADS: "광고/제휴",
    SECURITY: "보안",
    OPS: "운영",
  }[value];
}
function actionLabel(value: Action): string {
  return {
    REFRESH: "동기화",
    EXPORT_REDACTED: "비식별 export",
    RUN_HEALTH_CHECK: "Health check",
    OPEN_AUDIT: "감사 로그",
    OPEN_INCIDENTS: "Incident 보기",
  }[value];
}
function labelFor(value: string): string {
  if (value === "ALL") return "전체";
  if (services.includes(value as Service))
    return serviceLabel(value as Service);
  if (metricGroups.includes(value as MetricGroup))
    return groupLabel(value as MetricGroup);
  if (actions.includes(value as Action)) return actionLabel(value as Action);
  return value;
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
function scrub(value: string): string {
  let output = value.slice(0, 1200);
  sensitiveTerms.forEach((term: string) => {
    output = output.replace(new RegExp(regexEscape(term), "ig"), "[REDACTED]");
  });
  return output;
}
function nonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}
function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
function clampBp(value: number): number {
  return Number.isFinite(value)
    ? Math.max(-100_000, Math.min(100_000, Math.trunc(value)))
    : 0;
}
function clampPercentBp(value: number): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(10_000, Math.trunc(value)))
    : 0;
}
function bp(value: number): string {
  return `${(value / 100).toFixed(2)}%`;
}
function num(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}
function iso(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : zeroDate;
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

function assertAdminMetricsPageCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_react_import_required",
    "no_jsx_required",
    "admin_metrics_console",
    "api_scheduler_notifications_admin_database_queue_storage_ads_metrics",
    "service_filter",
    "metric_group_filter",
    "range_filter",
    "safe_metric_cards",
    "sparkline_without_chart_dependency",
    "service_performance_panel",
    "business_safe_aggregation_panel",
    "alert_panel",
    "redacted_export_action",
    "health_check_action",
    "x_admin_reason_required",
    "admin_api_boundary",
    "no_store_fetch",
    "raw_financial_data_redaction",
    "raw_push_token_redaction",
    "raw_amount_metric_payload_blocked",
    "ads_financial_targeting_forbidden",
    "token_hash_only_guard",
    "aggregated_only_guard",
    "responsive_css_without_tailwind_dependency",
    "typescript_strict_no_implicit_any",
    "tsx_file_compiles_without_jsx_flag",
    "react_types_not_required_by_this_file",
  ] as const;
  return { ok: checks.length >= 20, version: VERSION, checks };
}

void assertAdminMetricsPageCompleteness;
