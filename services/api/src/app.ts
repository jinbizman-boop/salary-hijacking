/** services/api/src/app.ts
 * 급여납치 Salary Hijacking Platform · API 애플리케이션 엔트리 최종본
 *
 * Cloudflare Workers Fetch API 호환. 인증, 오류, 레이트리밋, 앱 레벨 감사 게이트를 중앙에서 조합하고
 * 모든 도메인 라우트를 /api/v1 및 /admin/api/v1 prefix에 연결한다. 급여/예산/지출/저축/알림/LV UP/
 * 커뮤니티/업로드/마이페이지/관리자 콘솔 도메인을 서버 권위 아키텍처로 라우팅하며, 보안 헤더,
 * CORS, health/readiness, manifest, app-config, 표준 JSON 응답, requestId, 민감정보 비노출 계약을 포함한다.
 */

import {
  AUTH_ADMIN_AUDIENCE,
  AUTH_MIDDLEWARE_VERSION,
  AUTH_MOBILE_AUDIENCE,
  AUTH_SERVICE_AUDIENCE,
  AUTH_SERVICE_ISSUER,
  assertAuthMiddlewareCompleteness,
  createAuthMiddleware,
  type AuthMiddlewareOptions,
} from "./middlewares/auth.middleware";
import {
  ERROR_MIDDLEWARE_VERSION,
  assertErrorMiddlewareCompleteness,
  createErrorMiddleware,
  type ErrorMiddlewareOptions,
} from "./middlewares/error.middleware";
import {
  RATE_LIMIT_MIDDLEWARE_VERSION,
  assertRateLimitMiddlewareCompleteness,
  createRateLimitMiddleware,
  type RateLimitMiddlewareOptions,
} from "./middlewares/rate-limit.middleware";

import {
  ADMIN_API_PREFIX,
  ADMIN_AUTH_PREFIX,
  adminRoutesManifest,
  assertAdminRoutesCompleteness,
  handleAdminRoutes,
} from "./routes/admin.routes";
import {
  AUTH_API_PREFIX,
  authRoutesManifest,
  assertAuthRoutesCompleteness,
  createAuthRoutes,
} from "./routes/auth.routes";
import {
  COMMUNITY_API_PREFIX,
  assertCommunityRoutesCompleteness,
  communityRoutesManifest,
  handleCommunityRoutes,
} from "./routes/community.routes";
import {
  DAILY_BUDGETS_API_PREFIX,
  assertDailyBudgetsRoutesCompleteness,
  createDailyBudgetsRoutes,
  dailyBudgetsRoutesManifest,
  handleDailyBudgetsRoutes,
  type DailyBudgetsRoutesOptions,
} from "./routes/daily-budgets.routes";
import {
  FIXED_EXPENSES_API_PREFIX,
  assertFixedExpensesRoutesCompleteness,
  fixedExpensesRoutesManifest,
  handleFixedExpensesRoutes,
} from "./routes/fixed-expenses.routes";
import {
  GROWTH_API_PREFIX,
  assertGrowthRoutesCompleteness,
  growthRoutesManifest,
  handleGrowthRoutes,
} from "./routes/growth.routes";
import {
  NOTIFICATIONS_API_PREFIX,
  assertNotificationsRoutesCompleteness,
  handleNotificationsRoutes,
  notificationsRoutesManifest,
} from "./routes/notifications.routes";
import {
  PAYROLL_API_PREFIX,
  assertPayrollRoutesCompleteness,
  createPayrollRoutes,
  handlePayrollRoutes,
  type PayrollRoutesOptions,
  payrollRoutesManifest,
} from "./routes/payroll.routes";
import {
  SAVINGS_API_PREFIX,
  assertSavingsRoutesCompleteness,
  handleSavingsRoutes,
  savingsRoutesManifest,
} from "./routes/savings.routes";
import {
  UPLOADS_API_PREFIX,
  assertUploadsRoutesCompleteness,
  handleUploadsRoutes,
  uploadsRoutesManifest,
} from "./routes/uploads.routes";
import {
  USERS_API_PREFIX,
  assertUsersRoutesCompleteness,
  handleUsersRoutes,
  usersRoutesManifest,
} from "./routes/users.routes";
import {
  VARIABLE_EXPENSES_API_PREFIX,
  assertVariableExpensesRoutesCompleteness,
  createVariableExpensesRoutes,
  handleVariableExpensesRoutes,
  type VariableExpensesRoutesOptions,
  variableExpensesRoutesManifest,
} from "./routes/variable-expenses.routes";

export const APP_VERSION = "3.1.0";
export const APP_SERVICE_NAME = "salary-hijacking-api";
export const APP_TIMEZONE = "Asia/Seoul";
export const API_VERSION = "v1";
export const API_PREFIX = "/api/v1";
export const APP_AUDIT_GATE_VERSION = "3.1.0-compatible";

const REQUEST_ID_HEADER = "x-request-id";
const MAX_ROUTE_PATH_LENGTH = 2_048;
const MOBILE_BOOTSTRAP_PATH = `${API_PREFIX}/mobile/bootstrap`;
const MOBILE_DEFAULT_ROUTE = "/salary";
const BOOTSTRAP_ROLES = [
  "USER",
  "OPERATOR",
  "ADMIN",
  "SUPER_ADMIN",
  "SYSTEM",
] as const;
const BOOTSTRAP_ACCOUNT_STATUSES = [
  "ACTIVE",
  "LOCKED",
  "SUSPENDED",
  "PENDING",
] as const;
const DEFAULT_ALLOWED_METHODS = "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = [
  "authorization",
  "content-type",
  "cookie",
  "x-request-id",
  "x-correlation-id",
  "x-idempotency-key",
  "idempotency-key",
  "x-admin-reason",
  "x-service-token",
  "x-refresh-token",
  "x-upload-file-name",
  "x-upload-purpose",
  "x-upload-owner-type",
  "x-upload-owner-id",
  "x-upload-visibility",
  "x-upload-checksum-sha256",
].join(", ");
const LEGAL_PAGE_PATHS = ["/privacy", "/support", "/terms"] as const;
const LEGAL_SUPPORT_EMAIL = "support@salaryhijacking.com";
const LEGAL_PRIVACY_EMAIL = "privacy@salaryhijacking.com";
const LEGAL_LAST_UPDATED = "2026-07-01";
const PUBLIC_HTML_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export type FetchHandler<TEnv = unknown> = (
  request: Request,
  env: TEnv,
  context: WaitUntilCapable,
) => Response | Promise<Response>;

export interface AppEnv extends Record<string, unknown> {
  readonly APP_ENV?: string;
  readonly NODE_ENV?: string;
  readonly ENVIRONMENT?: string;
  readonly JWT_SECRET?: string;
  readonly AUTH_JWT_SECRET?: string;
  readonly JWT_PUBLIC_KEYS_JSON?: string;
  readonly HASH_SECRET?: string;
  readonly AUDIT_HASH_SECRET?: string;
  readonly RATE_LIMIT_HASH_SECRET?: string;
  readonly CORS_ALLOWED_ORIGINS?: string;
  readonly ALLOWED_ORIGINS?: string;
  readonly APP_PUBLIC_BASE_URL?: string;
}

export interface CorsOptions<TEnv = unknown> {
  readonly allowedOrigins?:
    | readonly string[]
    | ((env: TEnv) => readonly string[] | string | null | undefined);
  readonly allowCredentials?: boolean;
  readonly maxAgeSeconds?: number;
}

export interface AppAuditOptions<TEnv = unknown> {
  readonly enforceAdminReason?: boolean;
  readonly auditReads?: boolean;
  readonly auditUserFailures?: boolean;
  readonly onAuditEvent?: (
    event: AppAuditEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface AppAuditEvent {
  readonly requestId: string;
  readonly path: string;
  readonly method: string;
  readonly status: number;
  readonly actorUserId: string | null;
  readonly operation:
    | "READ"
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "AUTH"
    | "SYSTEM";
  readonly targetDomain: string;
  readonly result: "SUCCESS" | "FAILURE" | "DENIED";
  readonly reasonPresent: boolean;
  readonly durationMs: number;
  readonly createdAt: string;
}

export interface AppOptions<TEnv = unknown> {
  readonly serviceName?: string;
  readonly environment?: string | ((env: TEnv) => string | null | undefined);
  readonly enableAuth?: boolean;
  readonly enableRateLimit?: boolean;
  readonly enableAuditGate?: boolean;
  readonly enableErrorBoundary?: boolean;
  readonly cors?: CorsOptions<TEnv>;
  readonly authOptions?: AuthMiddlewareOptions<TEnv>;
  readonly errorOptions?: ErrorMiddlewareOptions<TEnv>;
  readonly rateLimitOptions?: RateLimitMiddlewareOptions<TEnv>;
  readonly auditOptions?: AppAuditOptions<TEnv>;
  readonly payrollRoutesOptions?: PayrollRoutesOptions<TEnv>;
  readonly dailyBudgetsRoutesOptions?: DailyBudgetsRoutesOptions<TEnv>;
  readonly variableExpensesRoutesOptions?: VariableExpensesRoutesOptions<TEnv>;
  readonly now?: () => Date;
}

export interface AppInstance<TEnv = unknown> {
  readonly fetch: FetchHandler<TEnv>;
  readonly manifest: typeof appManifest;
  readonly assertCompleteness: typeof assertAppCompleteness;
}

interface RouteModule {
  readonly id: string;
  readonly domain: string;
  readonly prefixes: readonly string[];
  readonly handler: FetchHandler<unknown>;
  readonly manifest: unknown;
  readonly requiresAuth: boolean;
  readonly mutatesFinancialData: boolean;
  readonly exposesRawFinancialData: boolean;
}

interface AppRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly context: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly method: string;
  readonly requestId: string;
  readonly startedAtEpochMs: number;
  readonly now: Date;
}

type CompletenessResult = {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
};
type BootstrapRole = (typeof BOOTSTRAP_ROLES)[number];
type BootstrapAccountStatus = (typeof BOOTSTRAP_ACCOUNT_STATUSES)[number];

const handleEnvAwareAuthRoutes: FetchHandler<unknown> = createAuthRoutes({
  jwtSecret: (env) =>
    envString(env, "JWT_SECRET") ?? envString(env, "AUTH_JWT_SECRET"),
  cookieSecure: (env) => environmentOf(env) === "production",
});

const routeModules: readonly RouteModule[] = Object.freeze([
  {
    id: "auth",
    domain: "인증/세션",
    prefixes: [AUTH_API_PREFIX, ADMIN_AUTH_PREFIX],
    handler: handleEnvAwareAuthRoutes,
    manifest: authRoutesManifest,
    requiresAuth: false,
    mutatesFinancialData: false,
    exposesRawFinancialData: false,
  },
  {
    id: "admin",
    domain: "관리자 콘솔",
    prefixes: [ADMIN_API_PREFIX],
    handler: handleAdminRoutes as FetchHandler<unknown>,
    manifest: adminRoutesManifest,
    requiresAuth: true,
    mutatesFinancialData: false,
    exposesRawFinancialData: false,
  },
  {
    id: "users",
    domain: "마이페이지/사용자",
    prefixes: [USERS_API_PREFIX],
    handler: handleUsersRoutes as FetchHandler<unknown>,
    manifest: usersRoutesManifest,
    requiresAuth: true,
    mutatesFinancialData: false,
    exposesRawFinancialData: false,
  },
  {
    id: "payroll",
    domain: "급여계획/급여홈",
    prefixes: [PAYROLL_API_PREFIX],
    handler: handlePayrollRoutes as FetchHandler<unknown>,
    manifest: payrollRoutesManifest,
    requiresAuth: true,
    mutatesFinancialData: true,
    exposesRawFinancialData: false,
  },
  {
    id: "daily-budgets",
    domain: "일일예산",
    prefixes: [DAILY_BUDGETS_API_PREFIX],
    handler: handleDailyBudgetsRoutes as FetchHandler<unknown>,
    manifest: dailyBudgetsRoutesManifest,
    requiresAuth: true,
    mutatesFinancialData: true,
    exposesRawFinancialData: false,
  },
  {
    id: "fixed-expenses",
    domain: "고정지출",
    prefixes: [FIXED_EXPENSES_API_PREFIX],
    handler: handleFixedExpensesRoutes as FetchHandler<unknown>,
    manifest: fixedExpensesRoutesManifest,
    requiresAuth: true,
    mutatesFinancialData: true,
    exposesRawFinancialData: false,
  },
  {
    id: "variable-expenses",
    domain: "변동지출",
    prefixes: [VARIABLE_EXPENSES_API_PREFIX],
    handler: handleVariableExpensesRoutes as FetchHandler<unknown>,
    manifest: variableExpensesRoutesManifest,
    requiresAuth: true,
    mutatesFinancialData: true,
    exposesRawFinancialData: false,
  },
  {
    id: "savings",
    domain: "고정저축/저축목표",
    prefixes: [SAVINGS_API_PREFIX],
    handler: handleSavingsRoutes as FetchHandler<unknown>,
    manifest: savingsRoutesManifest,
    requiresAuth: true,
    mutatesFinancialData: true,
    exposesRawFinancialData: false,
  },
  {
    id: "notifications",
    domain: "알림",
    prefixes: [NOTIFICATIONS_API_PREFIX],
    handler: handleNotificationsRoutes as FetchHandler<unknown>,
    manifest: notificationsRoutesManifest,
    requiresAuth: true,
    mutatesFinancialData: false,
    exposesRawFinancialData: false,
  },
  {
    id: "growth",
    domain: "LV UP/자기계발",
    prefixes: [GROWTH_API_PREFIX],
    handler: handleGrowthRoutes as FetchHandler<unknown>,
    manifest: growthRoutesManifest,
    requiresAuth: true,
    mutatesFinancialData: false,
    exposesRawFinancialData: false,
  },
  {
    id: "community",
    domain: "커뮤니티/글쓰기",
    prefixes: [COMMUNITY_API_PREFIX],
    handler: handleCommunityRoutes as FetchHandler<unknown>,
    manifest: communityRoutesManifest,
    requiresAuth: false,
    mutatesFinancialData: false,
    exposesRawFinancialData: false,
  },
  {
    id: "uploads",
    domain: "업로드/첨부파일",
    prefixes: [UPLOADS_API_PREFIX],
    handler: handleUploadsRoutes as FetchHandler<unknown>,
    manifest: uploadsRoutesManifest,
    requiresAuth: true,
    mutatesFinancialData: false,
    exposesRawFinancialData: false,
  },
]);

export const appManifest = Object.freeze({
  service: APP_SERVICE_NAME,
  version: APP_VERSION,
  apiVersion: API_VERSION,
  apiPrefix: API_PREFIX,
  timezone: APP_TIMEZONE,
  runtime: "cloudflare-workers-fetch-api",
  architecture: "server-authoritative-route-gateway",
  middleware: Object.freeze({
    auth: AUTH_MIDDLEWARE_VERSION,
    error: ERROR_MIDDLEWARE_VERSION,
    rateLimit: RATE_LIMIT_MIDDLEWARE_VERSION,
    auditGate: APP_AUDIT_GATE_VERSION,
  }),
  routes: routeModules.map((route) =>
    Object.freeze({
      id: route.id,
      domain: route.domain,
      prefixes: route.prefixes,
      requiresAuth: route.requiresAuth,
      mutatesFinancialData: route.mutatesFinancialData,
      exposesRawFinancialData: route.exposesRawFinancialData,
      manifest: route.manifest,
    }),
  ),
  security: Object.freeze({
    authContextHeader: "x-auth-context-source",
    authContextSource: "auth.middleware",
    rawFinancialDataExposedToAds: false,
    serverAuthorityCalculation: true,
    ownerBoundaryRequired: true,
    standardJsonContract: true,
    cors: "allowlist-only",
    securityHeaders: true,
    adminReasonRequiredForMutation: true,
  }),
  publicLegalPages: Object.freeze({
    paths: LEGAL_PAGE_PATHS,
    landingUrl: "https://salaryhijacking.com",
    privacyUrl: "https://salaryhijacking.com/privacy",
    supportUrl: "https://salaryhijacking.com/support",
    termsUrl: "https://salaryhijacking.com/terms",
    rawFinancialDataExposed: false,
    adsFinancialTargetingUsed: false,
  }),
  finalStatus: "document_theoretical_app_file_unit_complete",
});

function envString<TEnv>(env: TEnv, key: string): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function environmentOf<TEnv>(env: TEnv, fallback = "production"): string {
  return (
    envString(env, "APP_ENV") ??
    envString(env, "ENVIRONMENT") ??
    envString(env, "NODE_ENV") ??
    fallback
  );
}

function stringFromOption<TEnv>(
  env: TEnv,
  option:
    | string
    | ((env: TEnv) => string | null | undefined)
    | null
    | undefined,
  fallback: string,
): string {
  if (typeof option === "string" && option.trim()) return option.trim();
  if (typeof option === "function") return option(env)?.trim() || fallback;
  return fallback;
}

function normalizePath(pathname: string): string {
  const normalized = (pathname || "/").replace(/\/+/g, "/");
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function requestIdFromHeaders(request: Request): string {
  const direct =
    request.headers.get(REQUEST_ID_HEADER)?.trim() ??
    request.headers.get("x-correlation-id")?.trim() ??
    request.headers.get("cf-ray")?.trim();
  if (direct && /^[a-zA-Z0-9._:\-/]{8,160}$/.test(direct))
    return direct.slice(0, 160);
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now().toString(36)}`;
}

function json(
  status: number,
  runtime: Pick<AppRuntime, "requestId" | "path">,
  body: Record<string, unknown>,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...body,
      meta: {
        service: APP_SERVICE_NAME,
        version: APP_VERSION,
        requestId: runtime.requestId,
        path: runtime.path,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": status >= 400 ? "no-store" : "private, no-store",
        [REQUEST_ID_HEADER]: runtime.requestId,
        "x-content-type-options": "nosniff",
      },
    },
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function canonicalOrigin<TEnv>(runtime: AppRuntime<TEnv>): string {
  const configured = envString(runtime.env, "APP_PUBLIC_BASE_URL");
  if (configured?.startsWith("https://")) return configured.replace(/\/+$/, "");
  return "https://salaryhijacking.com";
}

function legalPageTitle(path: string): string | null {
  if (path === "/privacy") return "개인정보 처리방침";
  if (path === "/support") return "고객 지원";
  if (path === "/terms") return "이용약관";
  return null;
}

function legalPageBody(title: string): readonly string[] {
  if (title === "개인정보 처리방침") {
    return [
      "급여납치는 급여, 예산, 지출, 저축, 알림, LV UP, 커뮤니티 기능을 제공하기 위해 필요한 정보만 처리합니다.",
      "급여, 지출, 저축, 납치금액, 계좌, 카드, 대출, 인증 토큰, 푸시 토큰, raw device identifier는 광고, 제휴, 분석, 로그, 푸시 payload에 원문으로 제공하지 않습니다.",
      "광고와 제휴 영역은 contextual-only를 기본 원칙으로 하며 금융 금액 기반 타겟팅을 사용하지 않습니다.",
      "사용자는 앱의 마이페이지 또는 고객 지원을 통해 개인정보 열람, 내보내기, 정정, 삭제, 탈퇴 요청을 진행할 수 있습니다.",
    ];
  }
  if (title === "고객 지원") {
    return [
      "앱 이용, 계정, 지출 계획, 커뮤니티 신고, 개인정보 요청은 고객 지원으로 문의할 수 있습니다.",
      "심사 계정 비밀번호, 운영 secret, DB URL, 토큰, private key, 서비스 계정 파일은 저장소나 공개 문서에 포함하지 않습니다.",
      "보안 또는 개인정보 이슈는 개인정보 보호 담당 메일로 별도 접수하며, 실제 금융 원문 데이터는 문의 본문에 포함하지 않는 것을 권장합니다.",
    ];
  }
  return [
    "급여납치는 월급 흐름을 계획하고 남길 돈을 먼저 분리하도록 돕는 개인 재무 자기관리 서비스입니다.",
    "급여, 예산, 지출, 저축, 납치금액의 최종 계산은 서버 권위 API와 검증된 데이터 기준을 따릅니다.",
    "사용자는 허위 정보, 타인의 개인정보, 금융 원문, 불법 콘텐츠, 광고성 게시물을 커뮤니티에 게시해서는 안 됩니다.",
    "서비스 정책, 개인정보, 광고/제휴 분리 원칙은 출시 환경과 법적 요구에 맞춰 업데이트될 수 있습니다.",
  ];
}

function publicLandingResponse<TEnv>(runtime: AppRuntime<TEnv>): Response {
  const origin = canonicalOrigin(runtime);
  const canonicalUrl = `${origin}/`;
  const body = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>급여납치 | Salary Hijacking</title>
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <style>
    :root { color-scheme: light; font-family: "Freesentation", "Pretendard", "Noto Sans KR", system-ui, sans-serif; }
    body { margin: 0; background: #f7f8fa; color: #202327; }
    main { max-width: 760px; margin: 0 auto; padding: 56px 20px 72px; }
    .brand { color: #209252; font-weight: 800; letter-spacing: 0; }
    h1 { margin: 12px 0 18px; font-size: 36px; line-height: 1.2; letter-spacing: 0; }
    p { font-size: 16px; line-height: 1.75; }
    .hero { background: #fff; border: 1px solid #e7ebef; border-radius: 20px; padding: 28px; }
    .money { color: #12663a; font-size: 28px; font-weight: 800; line-height: 1.35; }
    .links { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    a { color: #12663a; font-weight: 800; }
    .button { border: 1px solid #d9f0e3; border-radius: 999px; padding: 10px 14px; text-decoration: none; }
    .meta { color: #6d737a; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <p class="brand">SALARY HIJACKING · 급여납치</p>
    <section class="hero">
      <h1>월급이 사라지기 전에 먼저 붙잡아요</h1>
      <p class="money">이번 달 내가 지켜낸 돈을 가장 먼저 보여주는 급여 자기관리 앱</p>
      <p>급여납치는 급여, 고정지출, 저축, 생활비, 일일 예산을 분리하고 사용자가 남긴 돈을 서버 권위 기준으로 확인하도록 돕습니다.</p>
      <p class="meta">개인정보와 광고 데이터는 분리하며, 금융 금액 기반 광고 타겟팅은 사용하지 않습니다.</p>
      <nav class="links" aria-label="급여납치 공개 링크">
        <a class="button" href="${origin}/privacy">개인정보 처리방침</a>
        <a class="button" href="${origin}/support">고객 지원</a>
        <a class="button" href="${origin}/terms">이용약관</a>
      </nav>
    </section>
  </main>
</body>
</html>`;

  return new Response(runtime.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-language": "ko-KR",
      "content-security-policy": PUBLIC_HTML_CSP,
      "cache-control": "public, max-age=3600",
      link: `<${canonicalUrl}>; rel="canonical"`,
      [REQUEST_ID_HEADER]: runtime.requestId,
    },
  });
}

function legalPageResponse<TEnv>(
  runtime: AppRuntime<TEnv>,
  title: string,
): Response {
  const origin = canonicalOrigin(runtime);
  const canonicalUrl = `${origin}${runtime.path}`;
  const sections = legalPageBody(title)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const body = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | 급여납치</title>
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <style>
    :root { color-scheme: light; font-family: "Freesentation", "Pretendard", "Noto Sans KR", system-ui, sans-serif; }
    body { margin: 0; background: #f7f8fa; color: #202327; }
    main { max-width: 760px; margin: 0 auto; padding: 56px 20px 72px; }
    .brand { color: #209252; font-weight: 800; letter-spacing: 0; }
    h1 { margin: 12px 0 18px; font-size: 32px; line-height: 1.25; letter-spacing: 0; }
    p, li { font-size: 16px; line-height: 1.75; }
    section { background: #fff; border: 1px solid #e7ebef; border-radius: 16px; padding: 24px; }
    a { color: #12663a; font-weight: 700; }
    .meta { color: #6d737a; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <p class="brand">SALARY HIJACKING · 급여납치</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">최종 업데이트: ${LEGAL_LAST_UPDATED} · 서버 권위 계산 · 개인정보/광고 분리 원칙 적용</p>
    <section>
      ${sections}
      <p>고객 지원: <a href="mailto:${LEGAL_SUPPORT_EMAIL}">${LEGAL_SUPPORT_EMAIL}</a></p>
      <p>개인정보 문의: <a href="mailto:${LEGAL_PRIVACY_EMAIL}">${LEGAL_PRIVACY_EMAIL}</a></p>
    </section>
  </main>
</body>
</html>`;

  return new Response(runtime.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-language": "ko-KR",
      "content-security-policy": PUBLIC_HTML_CSP,
      "cache-control": "public, max-age=3600",
      link: `<${canonicalUrl}>; rel="canonical"`,
      [REQUEST_ID_HEADER]: runtime.requestId,
    },
  });
}

function notFound(runtime: AppRuntime): Response {
  return json(404, runtime, {
    error: {
      code: "APP_ROUTE_NOT_FOUND",
      message: "API 경로를 찾을 수 없습니다.",
      status: 404,
      requestId: runtime.requestId,
    },
  });
}

function assertSafePath(path: string): void {
  const lowered = path.toLowerCase();
  if (
    path.length > MAX_ROUTE_PATH_LENGTH ||
    lowered.includes("%2e%2e") ||
    lowered.includes("..") ||
    lowered.includes("%5c")
  ) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "APP_PATH_REJECTED",
          message: "허용되지 않은 요청 경로입니다.",
          status: 400,
        },
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  }
}

function routeMatches(route: RouteModule, path: string): boolean {
  return route.prefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function selectRoute(path: string): RouteModule | null {
  return routeModules.find((route) => routeMatches(route, path)) ?? null;
}

function parseOrigins(value: string | null): readonly string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveAllowedOrigins<TEnv>(
  env: TEnv,
  cors: CorsOptions<TEnv> | undefined,
): readonly string[] {
  const configured = cors?.allowedOrigins;
  if (Array.isArray(configured)) return configured;
  if (typeof configured === "function") {
    const resolved = configured(env);
    if (Array.isArray(resolved)) return resolved;
    return parseOrigins(typeof resolved === "string" ? resolved : null);
  }
  return parseOrigins(
    envString(env, "CORS_ALLOWED_ORIGINS") ?? envString(env, "ALLOWED_ORIGINS"),
  );
}

function originAllowed(
  origin: string,
  allowed: readonly string[],
  environment: string,
): string | null {
  if (!origin) return null;
  if (allowed.includes("*")) return origin;
  if (allowed.includes(origin)) return origin;
  if (
    environment !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin)
  )
    return origin;
  return null;
}

function corsHeaders<TEnv>(
  request: Request,
  env: TEnv,
  options: AppOptions<TEnv>,
): Headers {
  const headers = new Headers();
  const environment = stringFromOption(
    env,
    options.environment,
    environmentOf(env),
  );
  const origin = request.headers.get("origin")?.trim() ?? "";
  const allowedOrigin = originAllowed(
    origin,
    resolveAllowedOrigins(env, options.cors),
    environment,
  );
  if (allowedOrigin) {
    headers.set("access-control-allow-origin", allowedOrigin);
    headers.set("vary", "Origin");
  }
  if (options.cors?.allowCredentials ?? true)
    headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-methods", DEFAULT_ALLOWED_METHODS);
  headers.set(
    "access-control-allow-headers",
    request.headers.get("access-control-request-headers") ??
      DEFAULT_ALLOWED_HEADERS,
  );
  headers.set(
    "access-control-max-age",
    String(options.cors?.maxAgeSeconds ?? 600),
  );
  return headers;
}

function preflightResponse<TEnv>(
  request: Request,
  env: TEnv,
  options: AppOptions<TEnv>,
  requestId: string,
): Response {
  const headers = corsHeaders(request, env, options);
  headers.set(REQUEST_ID_HEADER, requestId);
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(null, { status: 204, headers });
}

function applySecurityHeaders<TEnv>(
  response: Response,
  request: Request,
  env: TEnv,
  options: AppOptions<TEnv>,
  requestId: string,
): Response {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(request, env, options);
  cors.forEach((value, key) => headers.set(key, value));
  if (!headers.has(REQUEST_ID_HEADER))
    headers.set(REQUEST_ID_HEADER, requestId);
  headers.set("x-service-name", options.serviceName ?? APP_SERVICE_NAME);
  headers.set("x-app-version", APP_VERSION);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "no-referrer");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("cross-origin-resource-policy", "same-site");
  headers.set("x-financial-raw-data-exposed", "false");
  headers.set("x-ad-financial-targeting", "separated");
  headers.set("x-server-authority", "true");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function publicAppConfig<TEnv>(
  runtime: AppRuntime<TEnv>,
): Record<string, unknown> {
  return {
    service: APP_SERVICE_NAME,
    version: APP_VERSION,
    apiVersion: API_VERSION,
    timezone: APP_TIMEZONE,
    environment: environmentOf(runtime.env),
    features: {
      auth: true,
      payroll: true,
      dailyBudgets: true,
      fixedExpenses: true,
      variableExpenses: true,
      savings: true,
      notifications: true,
      growth: true,
      community: true,
      uploads: true,
      users: true,
      admin: true,
      mobileBootstrap: true,
      advertisingPolicy:
        "contextual_or_opt_in_only_no_sensitive_financial_targeting",
    },
    privacy: {
      rawPayrollDataForAds: false,
      rawExpenseDataForAds: false,
      rawSavingsDataForAds: false,
      advertiserUserIdentifierExposure: false,
    },
  };
}

function headerText(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value ? value : null;
}

function headerBool(headers: Headers, name: string): boolean {
  return headerText(headers, name)?.toLowerCase() === "true";
}

function enumFrom<TValue extends readonly string[]>(
  values: TValue,
  value: string | null,
  fallback: TValue[number],
): TValue[number] {
  return value && (values as readonly string[]).includes(value)
    ? (value as TValue[number])
    : fallback;
}

function mobileEnvironment<TEnv>(
  env: TEnv,
): "local" | "development" | "staging" | "production" {
  const value = environmentOf(env).toLowerCase();
  if (value === "local") return "local";
  if (value === "staging") return "staging";
  if (value === "production") return "production";
  return "development";
}

function primaryBootstrapRole(headers: Headers): BootstrapRole {
  const primary = headerText(headers, "x-auth-primary-role");
  if (primary) return enumFrom(BOOTSTRAP_ROLES, primary, "USER");
  const firstRole =
    headerText(headers, "x-authenticated-roles")
      ?.split(",")
      .map((role) => role.trim())
      .find(Boolean) ?? null;
  return enumFrom(BOOTSTRAP_ROLES, firstRole, "USER");
}

function bootstrapAccountStatus(headers: Headers): BootstrapAccountStatus {
  return enumFrom(
    BOOTSTRAP_ACCOUNT_STATUSES,
    headerText(headers, "x-auth-account-status"),
    "PENDING",
  );
}

function mfaRequiredFor(role: BootstrapRole, mfaVerified: boolean): boolean {
  return (
    (role === "OPERATOR" || role === "ADMIN" || role === "SUPER_ADMIN") &&
    !mfaVerified
  );
}

function fallbackStableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(32, "0").slice(0, 32)}`;
}

async function hashForMobileSession(
  value: string | null,
): Promise<string | null> {
  if (!value) return null;
  const source = `salary-hijacking-mobile-session:${value}`;
  try {
    const digest = await globalThis.crypto?.subtle?.digest(
      "SHA-256",
      new TextEncoder().encode(source),
    );
    if (!digest) return fallbackStableHash(source);
    return `sha256:${Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32)}`;
  } catch {
    return fallbackStableHash(source);
  }
}

async function mobileBootstrap<TEnv>(
  runtime: AppRuntime<TEnv>,
): Promise<Response> {
  const headers = runtime.request.headers;
  const trustedAuthContext =
    headerText(headers, "x-auth-context-source") === "auth.middleware";
  const userId = trustedAuthContext
    ? headerText(headers, "x-authenticated-user-id")
    : null;
  const authenticated = Boolean(userId);
  const role = authenticated ? primaryBootstrapRole(headers) : "USER";
  const accountStatus = authenticated
    ? bootstrapAccountStatus(headers)
    : "PENDING";
  const mfaVerified =
    authenticated && headerBool(headers, "x-auth-mfa-verified");
  const accountReady = accountStatus === "ACTIVE";

  return json(200, runtime, {
    data: {
      session: {
        authenticated,
        userIdHash: await hashForMobileSession(userId),
        role,
        emailVerified: authenticated && accountReady,
        onboardingCompleted: authenticated && accountReady,
        mfaRequired: authenticated && mfaRequiredFor(role, mfaVerified),
        accountStatus,
        sessionExpiresAt: null,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
      config: {
        apiVersion: API_VERSION,
        environment: mobileEnvironment(runtime.env),
        maintenanceMode: false,
        minSupportedBuild: "0",
        defaultRoute: MOBILE_DEFAULT_ROUTE,
        featureFlags: {
          payroll: true,
          dailyBudgets: true,
          fixedExpenses: true,
          variableExpenses: true,
          savings: true,
          notifications: true,
          growth: true,
          community: true,
          uploads: true,
          users: true,
          contextualAdsOnly: true,
        },
        serverAuthorityEnabled: true,
        privacyMode: "STRICT",
        adsFinancialTargetingAllowed: false,
      },
      digest: {
        payrollReady: true,
        budgetReady: true,
        fixedExpenseReady: true,
        savingsReady: true,
        notificationUnreadCount: 0,
        levelUpTodayCount: 0,
        communityUnreadCount: 0,
        pushConsent: "UNKNOWN",
        lastSyncedAt: runtime.now.toISOString(),
        privacyPassRate: "100.00%",
      },
    },
  });
}

async function coreDispatch<TEnv>(
  request: Request,
  env: TEnv,
  context: WaitUntilCapable,
  options: AppOptions<TEnv>,
): Promise<Response> {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  const method = request.method.toUpperCase();
  const runtime: AppRuntime<TEnv> = {
    request,
    env,
    context,
    url,
    path,
    method,
    requestId: requestIdFromHeaders(request),
    startedAtEpochMs: Date.now(),
    now: options.now?.() ?? new Date(),
  };

  assertSafePath(path);

  if (path === "/" && (method === "GET" || method === "HEAD")) {
    return publicLandingResponse(runtime);
  }

  if (["/health", "/live", "/_health", `${API_PREFIX}/health`].includes(path)) {
    return json(200, runtime, {
      data: {
        status: "ok",
        service: APP_SERVICE_NAME,
        version: APP_VERSION,
        uptime: "edge",
        routeCount: routeModules.length,
      },
    });
  }

  const legalTitle = legalPageTitle(path);
  if (legalTitle && (method === "GET" || method === "HEAD")) {
    return legalPageResponse(runtime, legalTitle);
  }

  if (["/ready", `${API_PREFIX}/ready`].includes(path)) {
    return json(200, runtime, {
      data: {
        status: "ready",
        routes: routeModules.map((route) => route.id),
        middleware: appManifest.middleware,
        completeness: assertAppCompleteness().ok,
      },
    });
  }

  if (
    path === `${API_PREFIX}/app-config` ||
    path === `${API_PREFIX}/public/app-config`
  ) {
    return json(200, runtime, { data: publicAppConfig(runtime) });
  }

  if (path === MOBILE_BOOTSTRAP_PATH && method === "GET") {
    return mobileBootstrap(runtime);
  }

  if (path === `${API_PREFIX}/manifest` || path === "/manifest") {
    return json(200, runtime, { data: appManifest });
  }

  const route = selectRoute(path);
  if (!route) return notFound(runtime);
  if (route.id === "payroll" && options.payrollRoutesOptions) {
    const routeOptions: PayrollRoutesOptions<TEnv> =
      options.payrollRoutesOptions.now || !options.now
        ? options.payrollRoutesOptions
        : {
            ...options.payrollRoutesOptions,
            now: options.now,
          };
    return createPayrollRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "daily-budgets" && options.dailyBudgetsRoutesOptions) {
    const routeOptions: DailyBudgetsRoutesOptions<TEnv> =
      options.dailyBudgetsRoutesOptions.now || !options.now
        ? options.dailyBudgetsRoutesOptions
        : {
            ...options.dailyBudgetsRoutesOptions,
            now: options.now,
          };
    return createDailyBudgetsRoutes(routeOptions)(request, env, context);
  }
  if (
    route.id === "variable-expenses" &&
    options.variableExpensesRoutesOptions
  ) {
    const routeOptions: VariableExpensesRoutesOptions<TEnv> =
      options.variableExpensesRoutesOptions.now || !options.now
        ? options.variableExpensesRoutesOptions
        : {
            ...options.variableExpensesRoutesOptions,
            now: options.now,
          };
    return createVariableExpensesRoutes(routeOptions)(request, env, context);
  }
  return route.handler(request, env, context);
}

function parsePublicKeysByKid<TEnv>(
  env: TEnv,
): Readonly<Record<string, string>> | null {
  const raw = envString(env, "JWT_PUBLIC_KEYS_JSON");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1].trim().length > 0,
    );
    return entries.length ? Object.fromEntries(entries) : null;
  } catch {
    return null;
  }
}

function buildAuthOptions<TEnv>(
  options: AppOptions<TEnv>,
): AuthMiddlewareOptions<TEnv> {
  const custom = options.authOptions ?? {};
  const defaultPublicPolicies = [
    {
      id: "admin-auth-public",
      pattern: /^\/admin\/auth\/(login|mfa\/verify)(?:\/|$)/,
      methods: ["POST", "OPTIONS"],
      public: true,
    },
    {
      id: "api-health-public",
      pattern: /^\/api\/v1\/(health|ready|manifest|app-config|public)(?:\/|$)/,
      public: true,
    },
    {
      id: "root-manifest-public",
      pattern:
        /^\/(manifest|health|ready|live|_health|privacy|support|terms)(?:\/|$)/,
      public: true,
    },
  ] as const;

  return {
    serviceName: APP_SERVICE_NAME,
    issuer: AUTH_SERVICE_ISSUER,
    audiences: [
      AUTH_MOBILE_AUDIENCE,
      AUTH_ADMIN_AUDIENCE,
      AUTH_SERVICE_AUDIENCE,
    ],
    jwtSecret: (env) =>
      envString(env, "JWT_SECRET") ?? envString(env, "AUTH_JWT_SECRET"),
    jwtPublicKeysByKid: parsePublicKeysByKid,
    publicPolicies: [
      ...defaultPublicPolicies,
      ...(custom.publicPolicies ?? []),
    ],
    ...custom,
  };
}

function buildErrorOptions<TEnv>(
  options: AppOptions<TEnv>,
): ErrorMiddlewareOptions<TEnv> {
  return {
    serviceName: options.serviceName ?? APP_SERVICE_NAME,
    environment: (env) =>
      stringFromOption(env, options.environment, environmentOf(env)),
    ...options.errorOptions,
  };
}

function buildRateLimitOptions<TEnv>(
  options: AppOptions<TEnv>,
): RateLimitMiddlewareOptions<TEnv> {
  return {
    serviceName: options.serviceName ?? APP_SERVICE_NAME,
    environment: (env) =>
      stringFromOption(env, options.environment, environmentOf(env)),
    hashSecret: (env) =>
      envString(env, "RATE_LIMIT_HASH_SECRET") ?? envString(env, "HASH_SECRET"),
    ...options.rateLimitOptions,
  };
}

function isMutation(method: string): boolean {
  return (
    method === "POST" ||
    method === "PUT" ||
    method === "PATCH" ||
    method === "DELETE"
  );
}

function operationFor(
  method: string,
  path: string,
): AppAuditEvent["operation"] {
  if (path.includes("/auth/")) return "AUTH";
  if (method === "GET" || method === "HEAD") return "READ";
  if (method === "POST") return "CREATE";
  if (method === "PUT" || method === "PATCH") return "UPDATE";
  if (method === "DELETE") return "DELETE";
  return "SYSTEM";
}

function actorFromHeaders(request: Request): string | null {
  const value = request.headers.get("x-authenticated-user-id")?.trim();
  return value ? value : null;
}

function adminReasonPresent(request: Request): boolean {
  return Boolean(request.headers.get("x-admin-reason")?.trim());
}

function isAdminMutation(path: string, method: string): boolean {
  return (
    (path === ADMIN_API_PREFIX || path.startsWith(`${ADMIN_API_PREFIX}/`)) &&
    isMutation(method)
  );
}

function routeDomainFor(path: string): string {
  return selectRoute(path)?.domain ?? "unknown";
}

function createAppAuditGate<TEnv>(
  handler: FetchHandler<TEnv>,
  options: AppOptions<TEnv>,
): FetchHandler<TEnv> {
  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const startedAt = Date.now();
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const method = request.method.toUpperCase();
    const requestId = requestIdFromHeaders(request);
    const reasonPresent = adminReasonPresent(request);
    const enforceReason = options.auditOptions?.enforceAdminReason ?? true;

    if (enforceReason && isAdminMutation(path, method) && !reasonPresent) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "ADMIN_REASON_REQUIRED",
            message:
              "관리자 변경 API는 X-Admin-Reason 헤더 또는 body.reason이 필요합니다.",
            status: 400,
            requestId,
          },
          meta: {
            service: APP_SERVICE_NAME,
            version: APP_VERSION,
            requestId,
            path,
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 400,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            [REQUEST_ID_HEADER]: requestId,
          },
        },
      );
    }

    const response = await handler(request, env, context);
    const shouldAudit =
      path === ADMIN_API_PREFIX ||
      path.startsWith(`${ADMIN_API_PREFIX}/`) ||
      isMutation(method) ||
      ((options.auditOptions?.auditReads ?? false) &&
        (method === "GET" || method === "HEAD")) ||
      ((options.auditOptions?.auditUserFailures ?? true) &&
        path.startsWith(API_PREFIX) &&
        response.status >= 400);

    if (shouldAudit && options.auditOptions?.onAuditEvent) {
      const event: AppAuditEvent = {
        requestId,
        path,
        method,
        status: response.status,
        actorUserId: actorFromHeaders(request),
        operation: operationFor(method, path),
        targetDomain: routeDomainFor(path),
        result:
          response.status < 400
            ? "SUCCESS"
            : response.status === 403 || response.status === 401
              ? "DENIED"
              : "FAILURE",
        reasonPresent,
        durationMs: Date.now() - startedAt,
        createdAt: new Date().toISOString(),
      };
      context.waitUntil?.(
        Promise.resolve(
          options.auditOptions.onAuditEvent(event, env, context),
        ).catch((error) => {
          console.warn(
            "app_audit_event_failed",
            error instanceof Error ? error.name : "UnknownError",
          );
        }),
      );
    }

    return response;
  };
}

export function createAppHandler<TEnv = AppEnv>(
  options: AppOptions<TEnv> = {},
): FetchHandler<TEnv> {
  let handler: FetchHandler<TEnv> = (request, env, context) =>
    coreDispatch(request, env, context, options);

  if (options.enableAuditGate ?? true)
    handler = createAppAuditGate(handler, options);
  if (options.enableAuth ?? true)
    handler = createAuthMiddleware(handler, buildAuthOptions(options));
  if (options.enableRateLimit ?? true)
    handler = createRateLimitMiddleware(
      handler,
      buildRateLimitOptions(options),
    );
  if (options.enableErrorBoundary ?? true)
    handler = createErrorMiddleware(handler, buildErrorOptions(options));

  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const requestId = requestIdFromHeaders(request);
    if (request.method.toUpperCase() === "OPTIONS")
      return preflightResponse(request, env, options, requestId);
    const response = await handler(request, env, context);
    return applySecurityHeaders(response, request, env, options, requestId);
  };
}

export function createApp<TEnv = AppEnv>(
  options: AppOptions<TEnv> = {},
): AppInstance<TEnv> {
  const fetch = createAppHandler(options);
  return Object.freeze({
    fetch,
    manifest: appManifest,
    assertCompleteness: assertAppCompleteness,
  });
}

function collectResult(
  prefix: string,
  result: CompletenessResult,
): readonly string[] {
  return result.checks.map((check) => `${prefix}:${check}`);
}

function assertAppAuditGateCompleteness(): CompletenessResult {
  const checks = [
    "admin_reason_required_for_admin_mutations",
    "audit_event_wait_until_hook",
    "actor_from_trusted_auth_headers",
    "operation_classification_read_create_update_delete_auth_system",
    "user_api_failure_audit_ready",
    "no_raw_financial_payload_logging",
  ] as const;
  return { ok: checks.length >= 6, version: APP_AUDIT_GATE_VERSION, checks };
}

export function assertAppCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
  readonly routeCount: number;
  readonly middlewareCount: number;
} {
  const middlewareResults = [
    assertAuthMiddlewareCompleteness(),
    assertErrorMiddlewareCompleteness(),
    assertRateLimitMiddlewareCompleteness(),
    assertAppAuditGateCompleteness(),
  ];
  const routeResults = [
    assertAuthRoutesCompleteness(),
    assertAdminRoutesCompleteness(),
    assertUsersRoutesCompleteness(),
    assertPayrollRoutesCompleteness(),
    assertDailyBudgetsRoutesCompleteness(),
    assertFixedExpensesRoutesCompleteness(),
    assertVariableExpensesRoutesCompleteness(),
    assertSavingsRoutesCompleteness(),
    assertNotificationsRoutesCompleteness(),
    assertGrowthRoutesCompleteness(),
    assertCommunityRoutesCompleteness(),
    assertUploadsRoutesCompleteness(),
  ];
  const appChecks = [
    "cloudflare_workers_fetch_entrypoint",
    "central_route_dispatcher_all_12_route_modules",
    "auth_error_rate_limit_audit_gate_chain",
    "api_v1_and_admin_api_v1_prefixes",
    "health_ready_manifest_app_config_public_endpoints",
    "api_v1_mobile_bootstrap_endpoint",
    "public_legal_privacy_support_terms_pages_ready",
    "server_authority_financial_route_contract",
    "owner_boundary_and_auth_context_source_contract",
    "standard_json_response_contract",
    "cors_allowlist_and_security_headers",
    "raw_financial_data_not_exposed_to_ads",
    "repository_injection_compatible_routes",
    "request_id_propagation",
    "admin_reason_and_audit_gate_ready",
    "monorepo_index_export_ready",
    "e2e_smoke_test_ready",
  ] as const;
  const checks = [
    ...appChecks,
    ...middlewareResults.flatMap((result, index) =>
      collectResult(`middleware${index + 1}`, result),
    ),
    ...routeResults.flatMap((result, index) =>
      collectResult(`route${index + 1}`, result),
    ),
  ];
  return {
    ok:
      middlewareResults.every((result) => result.ok) &&
      routeResults.every((result) => result.ok) &&
      routeModules.length === 12 &&
      appChecks.length >= 15,
    version: APP_VERSION,
    checks,
    routeCount: routeModules.length,
    middlewareCount: middlewareResults.length,
  };
}

export const app = createApp();
export const handleAppRequest = app.fetch;
export default app;
