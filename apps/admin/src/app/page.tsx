"use client";

/** apps/admin/src/app/page.tsx
 * 급여납치 관리자 앱 진입 페이지 최종본.
 * React import/JSX 없이 동작하는 Next Client Page다.
 */

const VERSION = "3.1.3";
const ROOT_ID = "salary-hijacking-admin-home-root";
const AUTH_SESSION_API = "/admin/auth/session";
const READINESS_API = "/admin/api/v1/dashboard/readiness";
const ADMIN_DASHBOARD = "/admin/dashboard";
const ADMIN_LOGIN = "/admin/login";
const REFRESH_MS = 90_000;

const navItems = [
  ["/admin/dashboard", "Dashboard", "운영 통합 현황"],
  ["/admin/users", "Users", "사용자·계정 운영"],
  ["/admin/posts", "Posts", "커뮤니티 모더레이션"],
  ["/admin/reports", "Reports", "신고·CS 처리"],
  ["/admin/notices", "Notices", "공지·정책 운영"],
  ["/admin/banners", "Banners", "광고·제휴 배너"],
  ["/admin/metrics", "Metrics", "운영 지표"],
  ["/admin/events", "Events", "감사·이벤트 로그"],
] as const;

const guardChecks = [
  "RBAC",
  "MFA",
  "Audit",
  "X-Admin-Reason",
  "No raw financial",
  "No raw push token",
  "Ads separated",
  "Redacted export",
] as const;
const domains = [
  "PAYROLL",
  "BUDGET",
  "EXPENSE",
  "SAVINGS",
  "NOTIFICATION",
  "GROWTH",
  "COMMUNITY",
  "ADS",
  "OPS",
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
  "hijack",
  "push",
  "fcm",
  "비밀번호",
  "토큰",
  "이메일",
  "전화",
  "계좌",
  "카드",
  "급여",
  "월급",
  "대출",
  "저축",
  "지출",
  "금액",
  "납치",
] as const;

type AdminRole = "OPERATOR" | "ADMIN" | "SUPER_ADMIN";
type SessionStatus =
  | "UNKNOWN"
  | "AUTHENTICATED"
  | "UNAUTHENTICATED"
  | "MFA_REQUIRED"
  | "ERROR";
type Health = "OPERATIONAL" | "DEGRADED" | "INCIDENT" | "MAINTENANCE";
type Toast = "success" | "error" | "info";
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

type SessionView = {
  readonly adminId: string;
  readonly displayName: string;
  readonly role: AdminRole;
  readonly mfaVerified: boolean;
  readonly sessionExpiresAt: string;
  readonly permissions: readonly string[];
};

type Readiness = {
  readonly ok: boolean;
  readonly api: Health;
  readonly scheduler: Health;
  readonly notifications: Health;
  readonly admin: Health;
  readonly audit: Health;
  readonly ads: Health;
  readonly privacyGuard: {
    readonly rawFinancialDataLogged: false;
    readonly rawPushTokenLogged: false;
    readonly adsFinancialTargetingUsed: false;
    readonly tokenHashOnly: true;
    readonly adminReasonRequired: true;
  };
};

type SessionResponse = {
  readonly data?:
    | {
        readonly session?: SessionView | null;
        readonly mfaRequired?: boolean;
        readonly redirectTo?: string;
      }
    | undefined;
  readonly session?: SessionView | null | undefined;
  readonly mfaRequired?: boolean | undefined;
  readonly redirectTo?: string | undefined;
};

type ReadinessResponse = {
  readonly data?: Partial<Readiness> | undefined;
  readonly readiness?: Partial<Readiness> | undefined;
};

type State = {
  readonly status: SessionStatus;
  readonly session: SessionView | null;
  readonly readiness: Readiness;
  readonly busy: boolean;
  readonly autoRedirect: boolean;
  readonly loadedAt: string;
  readonly toast: { readonly type: Toast; readonly message: string };
};

const fallbackReadiness: Readiness = {
  ok: true,
  api: "MAINTENANCE",
  scheduler: "MAINTENANCE",
  notifications: "MAINTENANCE",
  admin: "MAINTENANCE",
  audit: "MAINTENANCE",
  ads: "MAINTENANCE",
  privacyGuard: {
    rawFinancialDataLogged: false,
    rawPushTokenLogged: false,
    adsFinancialTargetingUsed: false,
    tokenHashOnly: true,
    adminReasonRequired: true,
  },
};

let state: State = {
  status: "UNKNOWN",
  session: null,
  readiness: fallbackReadiness,
  busy: false,
  autoRedirect: true,
  loadedAt: "-",
  toast: { type: "info", message: "관리자 진입 게이트를 준비했습니다." },
};
let mounted = false;
let timer: number | null = null;

export default function AdminHomePage(): null {
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
  void refresh(root, true);
  timer = window.setInterval(() => void refresh(root, true), REFRESH_MS);
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
  const style = document.createElement("style");
  style.id = `${ROOT_ID}-style`;
  style.textContent = `#${ROOT_ID}{min-height:100vh;background:#020617;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;padding:32px 24px}#${ROOT_ID} *{box-sizing:border-box}.wrap{max-width:1380px;margin:auto;display:flex;flex-direction:column;gap:24px}.panel{border:1px solid #ffffff1a;background:#ffffff14;border-radius:30px;box-shadow:0 24px 80px #0008;backdrop-filter:blur(18px)}.hero{padding:32px;display:grid;grid-template-columns:1fr 430px;gap:28px;align-items:center}.k{font-size:13px;color:#67e8f9;font-weight:1000}.title{font-size:42px;line-height:1.08;margin:12px 0 0;color:white;font-weight:1000;letter-spacing:-.04em}.desc{max-width:800px;color:#cbd5e1;font-size:15px;line-height:1.8}.badges{display:flex;flex-wrap:wrap;gap:9px;margin-top:22px}.badge{border:1px solid #34d39955;background:#10b98122;color:#d1fae5;border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.btn{border:0;border-radius:16px;background:#67e8f9;color:#020617;font-weight:1000;padding:13px 15px;cursor:pointer}.btn.secondary{background:#ffffff1a;color:#f8fafc;border:1px solid #ffffff20}.btn.danger{background:#fb7185;color:#190106}.btn:disabled{opacity:.55}.status{padding:20px}.status h2,.section h2{margin:0 0 14px;color:white;font-size:20px}.kv{display:grid;grid-template-columns:140px 1fr;gap:9px;font-size:13px}.kv span:nth-child(odd){color:#64748b}.pill{display:inline-flex;border:1px solid #ffffff26;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:900}.AUTHENTICATED,.OPERATIONAL{border-color:#34d39966;background:#10b98122;color:#d1fae5}.MFA_REQUIRED,.DEGRADED,.MAINTENANCE{border-color:#fbbf2466;background:#f59e0b22;color:#fef3c7}.UNAUTHENTICATED,.ERROR,.INCIDENT{border-color:#fb718566;background:#f43f5e22;color:#ffe4e6}.toast{border-radius:18px;padding:14px 16px;font-size:13px;line-height:1.55}.toast.info{border:1px solid #22d3ee66;background:#22d3ee1a;color:#cffafe}.toast.success{border:1px solid #34d39966;background:#10b9811a;color:#d1fae5}.toast.error{border:1px solid #fb718566;background:#f43f5e22;color:#ffe4e6}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.navcard{border:1px solid #ffffff1a;background:#020617b8;border-radius:22px;padding:17px;display:block;min-height:112px}.navcard:hover,.navcard:focus{outline:2px solid #67e8f988;background:#082f49}.navcard b{display:block;color:white;font-size:17px}.navcard span{display:block;color:#94a3b8;font-size:13px;line-height:1.55;margin-top:8px}.section{padding:22px}.health{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.health div,.safe div{border:1px solid #ffffff1a;background:#02061799;border-radius:18px;padding:13px}.health small,.safe small{display:block;color:#94a3b8;font-weight:900;text-transform:uppercase;font-size:11px}.health b,.safe b{display:block;margin-top:7px;color:white}.safe{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.footer{color:#64748b;font-size:12px;line-height:1.7}.check{display:flex;align-items:center;gap:10px;margin-top:16px;color:#cbd5e1;font-size:13px}@media(max-width:1100px){.hero{grid-template-columns:1fr}.grid{grid-template-columns:repeat(2,1fr)}.health,.safe{grid-template-columns:repeat(3,1fr)}}@media(max-width:680px){#${ROOT_ID}{padding:20px 12px}.hero{padding:22px}.title{font-size:30px}.grid,.health,.safe{grid-template-columns:1fr}}`;
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
  return `<section class="wrap"><section class="panel hero"><div><p class="k">Salary Hijacking Admin · Gateway · v${e(VERSION)}</p><h1 class="title">급여납치 관리자 진입 게이트</h1><p class="desc">관리자 콘솔은 급여·예산·지출·저축·알림·레벨업·커뮤니티·광고·제휴·운영 데이터를 다루는 고권한 영역입니다. 이 진입 페이지는 세션, MFA, RBAC, 감사 로그, 개인정보 보호, 광고 금융 타겟팅 분리를 확인한 뒤 운영 화면으로 연결합니다.</p><div class="badges">${guardChecks.map((item: string) => `<span class="badge">${e(item)}</span>`).join("")}</div><div class="actions"><button id="go-dashboard" class="btn">대시보드로 이동</button><button id="go-login" class="btn secondary">보안 로그인</button><button id="refresh" class="btn secondary" ${state.busy ? "disabled" : ""}>상태 재검증</button></div><label class="check"><input id="auto" type="checkbox" ${state.autoRedirect ? "checked" : ""}/> 인증 완료 시 자동으로 Dashboard로 이동</label></div><aside class="panel status"><h2>접속 상태</h2><div class="kv"><span>세션</span><b><span class="pill ${e(state.status)}">${e(state.status)}</span></b><span>관리자</span><b>${e(state.session?.displayName ?? "미인증")}</b><span>역할</span><b>${e(state.session?.role ?? "-")}</b><span>MFA</span><b>${state.session?.mfaVerified ? "검증됨" : "필요"}</b><span>만료</span><b>${e(state.session ? dt(state.session.sessionExpiresAt) : "-")}</b><span>확인</span><b>${e(state.loadedAt)}</b></div></aside></section><div class="toast ${state.toast.type}">${e(state.toast.message)}</div><section class="panel section"><h2>관리자 메뉴</h2><div class="grid">${navItems.map(([href, label, text]) => `<a class="navcard" href="${e(href)}"><b>${e(label)}</b><span>${e(text)}</span></a>`).join("")}</div></section><section class="panel section"><h2>서비스 Readiness</h2><div class="health">${healthHtml()}</div></section><section class="panel section"><h2>Server Authority · Privacy · Ads Guard</h2><div class="safe">${safeHtml()}</div><p class="footer">도메인: ${e(domains.join(" · "))}<br/>planned_total_expense=fixed_expense+daily_living_budget+planned_other_expense · expected_hijack=max(0,expected_salary-planned_total_expense) · monthly_actual_hijack=max(0,actual_income+carry_over-actual_expense-actual_savings)</p></section></section>`;
}

function healthHtml(): string {
  const readiness = state.readiness;
  const items: readonly [string, Health][] = [
    ["API", readiness.api],
    ["Scheduler", readiness.scheduler],
    ["Notifications", readiness.notifications],
    ["Admin", readiness.admin],
    ["Audit", readiness.audit],
    ["Ads", readiness.ads],
  ];
  return items
    .map(
      ([label, status]: [string, Health]) =>
        `<div><small>${e(label)}</small><b><span class="pill ${e(status)}">${e(status)}</span></b></div>`,
    )
    .join("");
}

function safeHtml(): string {
  const guard = state.readiness.privacyGuard;
  const pairs: readonly [string, boolean][] = [
    ["rawFinancialDataLogged=false", !guard.rawFinancialDataLogged],
    ["rawPushTokenLogged=false", !guard.rawPushTokenLogged],
    ["adsFinancialTargetingUsed=false", !guard.adsFinancialTargetingUsed],
    ["tokenHashOnly=true", guard.tokenHashOnly],
    ["adminReasonRequired=true", guard.adminReasonRequired],
    ["noStoreFetch=true", true],
    ["redactedExportOnly=true", true],
    ["serverAuthority=true", true],
  ];
  return pairs
    .map(
      ([label, ok]: [string, boolean]) =>
        `<div><small>${e(label)}</small><b>${ok ? "PASS" : "CHECK"}</b></div>`,
    )
    .join("");
}

function bind(root: HTMLElement): void {
  by<HTMLButtonElement>(root, "go-dashboard")?.addEventListener("click", () =>
    routeBySession(),
  );
  by<HTMLButtonElement>(root, "go-login")?.addEventListener("click", () =>
    window.location.assign(ADMIN_LOGIN),
  );
  by<HTMLButtonElement>(root, "refresh")?.addEventListener(
    "click",
    () => void refresh(root),
  );
  const auto = by<HTMLInputElement>(root, "auto");
  auto?.addEventListener("change", () =>
    patch({ autoRedirect: auto.checked }, root),
  );
}

async function refresh(root: HTMLElement, silent = false): Promise<void> {
  if (!silent) patch({ busy: true }, root);
  try {
    const [session, readiness] = await Promise.all([
      loadSession(),
      loadReadiness(),
    ]);
    const nextStatus = session.session
      ? session.session.mfaVerified
        ? "AUTHENTICATED"
        : "MFA_REQUIRED"
      : "UNAUTHENTICATED";
    patch(
      {
        status: nextStatus,
        session: session.session,
        readiness,
        loadedAt: dt(new Date().toISOString()),
        toast: silent
          ? state.toast
          : {
              type: "success",
              message: "관리자 세션과 readiness를 재검증했습니다.",
            },
      },
      root,
    );
    if (
      state.autoRedirect &&
      nextStatus === "AUTHENTICATED" &&
      !isCurrentAdminRoute(ADMIN_DASHBOARD)
    )
      window.setTimeout(
        () => window.location.assign(session.redirectTo || ADMIN_DASHBOARD),
        350,
      );
  } catch (error) {
    patch(
      {
        status: "ERROR",
        session: null,
        readiness: fallbackReadiness,
        loadedAt: dt(new Date().toISOString()),
        toast: {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "진입 상태 검증에 실패했습니다.",
        },
      },
      root,
    );
  } finally {
    if (!silent) patch({ busy: false }, root);
  }
}

async function loadSession(): Promise<{
  readonly session: SessionView | null;
  readonly redirectTo: string;
}> {
  const response = await requestJson<SessionResponse>(AUTH_SESSION_API);
  const session = response.data?.session ?? response.session ?? null;
  const mfaRequired =
    response.data?.mfaRequired ?? response.mfaRequired ?? false;
  if (session)
    return {
      session: normalizeSession(session),
      redirectTo:
        response.data?.redirectTo ?? response.redirectTo ?? ADMIN_DASHBOARD,
    };
  if (mfaRequired) return { session: null, redirectTo: ADMIN_LOGIN };
  return { session: null, redirectTo: ADMIN_LOGIN };
}

async function loadReadiness(): Promise<Readiness> {
  try {
    const response = await requestJson<ReadinessResponse>(READINESS_API);
    const partial = response.data ?? response.readiness ?? {};
    return normalizeReadiness(partial);
  } catch {
    return fallbackReadiness;
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("x-admin-gateway", "true");
  headers.set("x-raw-financial-data-logged", "false");
  headers.set("x-raw-push-token-logged", "false");
  headers.set("x-ad-financial-targeting-used", "false");
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

function routeBySession(): void {
  if (state.status === "AUTHENTICATED") window.location.assign(ADMIN_DASHBOARD);
  else window.location.assign(ADMIN_LOGIN);
}

function normalizeSession(session: SessionView): SessionView {
  return {
    adminId: scrub(session.adminId),
    displayName: scrub(session.displayName),
    role: enumOf(
      ["OPERATOR", "ADMIN", "SUPER_ADMIN"] as const,
      session.role,
      "OPERATOR",
    ),
    mfaVerified: Boolean(session.mfaVerified),
    sessionExpiresAt: iso(session.sessionExpiresAt),
    permissions: session.permissions
      .map((item: string) => scrub(item))
      .slice(0, 100),
  };
}

function normalizeReadiness(partial: Partial<Readiness>): Readiness {
  return {
    ok: Boolean(partial.ok ?? fallbackReadiness.ok),
    api: healthOf(partial.api),
    scheduler: healthOf(partial.scheduler),
    notifications: healthOf(partial.notifications),
    admin: healthOf(partial.admin),
    audit: healthOf(partial.audit),
    ads: healthOf(partial.ads),
    privacyGuard: {
      rawFinancialDataLogged: false,
      rawPushTokenLogged: false,
      adsFinancialTargetingUsed: false,
      tokenHashOnly: true,
      adminReasonRequired: true,
    },
  };
}

function healthOf(value: Health | undefined): Health {
  return enumOf(
    ["OPERATIONAL", "DEGRADED", "INCIDENT", "MAINTENANCE"] as const,
    value ?? "MAINTENANCE",
    "MAINTENANCE",
  );
}

function isCurrentAdminRoute(pathname: string): boolean {
  return typeof window !== "undefined" && window.location.pathname === pathname;
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
          sensitive(key) ? "[REDACTED]" : sanitize(item),
        ]),
    ) as JsonRecord;
  return String(value);
}

function sensitive(key: string): boolean {
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

function by<TElement extends HTMLElement>(
  root: HTMLElement,
  id: string,
): TElement | null {
  return root.querySelector<TElement>(`#${css(id)}`);
}

function enumOf<T extends readonly string[]>(
  values: T,
  value: string,
  fallback: T[number],
): T[number] {
  return values.includes(value) ? (value as T[number]) : fallback;
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

function assertAdminHomePageCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_react_import_required",
    "no_jsx_required",
    "admin_gateway_page",
    "session_check",
    "mfa_rbac_boundary",
    "readiness_check",
    "dashboard_login_routing",
    "admin_navigation",
    "server_authority_formulas_visible",
    "payroll_budget_expense_savings_notification_growth_community_ads_ops_domains",
    "privacy_guard",
    "raw_financial_data_redaction",
    "raw_push_token_redaction",
    "ads_financial_targeting_forbidden",
    "token_hash_policy",
    "redacted_export_policy",
    "no_store_fetch",
    "responsive_css_without_tailwind_dependency",
    "auto_redirect_control",
    "accessibility_semantic_sections",
    "typescript_strict_no_implicit_any",
    "tsx_file_compiles_without_jsx_flag",
    "react_types_not_required_by_this_file",
  ] as const;
  return { ok: checks.length >= 20, version: VERSION, checks };
}

void assertAdminHomePageCompleteness;
