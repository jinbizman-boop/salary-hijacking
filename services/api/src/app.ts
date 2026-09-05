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
  createAdminRoutes,
  handleAdminRoutes,
  type AdminRoutesOptions,
} from "./routes/admin.routes";
import {
  AUTH_API_PREFIX,
  authRoutesManifest,
  assertAuthRoutesCompleteness,
  createAuthRoutes,
} from "./routes/auth.routes";
import {
  createNeonAuthRepository,
  createNeonAuthSessionResolver,
  shouldUseNeonAuthRepository,
} from "./repositories/auth.repository";
import {
  createNeonAdminRepository,
  shouldUseNeonAdminRepository,
} from "./repositories/admin.repository";
import {
  createNeonUploadsRepository,
  shouldUseNeonUploadsRepository,
} from "./repositories/uploads.repository";
import {
  COMMUNITY_API_PREFIX,
  assertCommunityRoutesCompleteness,
  communityRoutesManifest,
  createCommunityRoutes,
  handleCommunityRoutes,
  type CommunityRoutesOptions,
} from "./routes/community.routes";
import {
  createNeonCommunityRepository,
  shouldUseNeonCommunityRepository,
} from "./repositories/community.repository";
import {
  DAILY_BUDGETS_API_PREFIX,
  assertDailyBudgetsRoutesCompleteness,
  createDailyBudgetsRoutes,
  dailyBudgetsRoutesManifest,
  handleDailyBudgetsRoutes,
  type DailyBudgetsRoutesOptions,
} from "./routes/daily-budgets.routes";
import {
  createNeonDailyBudgetsRepository,
  shouldUseNeonDailyBudgetsRepository,
} from "./repositories/daily-budgets.repository";
import {
  FIXED_EXPENSES_API_PREFIX,
  assertFixedExpensesRoutesCompleteness,
  createFixedExpensesRoutes,
  fixedExpensesRoutesManifest,
  handleFixedExpensesRoutes,
  type FixedExpensesRoutesOptions,
} from "./routes/fixed-expenses.routes";
import {
  createNeonFixedExpensesRepository,
  shouldUseNeonFixedExpensesRepository,
} from "./repositories/fixed-expenses.repository";
import {
  GROWTH_API_PREFIX,
  assertGrowthRoutesCompleteness,
  createGrowthRoutes,
  type GrowthRoutesOptions,
  growthRoutesManifest,
  handleGrowthRoutes,
} from "./routes/growth.routes";
import {
  createNeonGrowthRepository,
  shouldUseNeonGrowthRepository,
} from "./repositories/growth.repository";
import {
  NOTIFICATIONS_API_PREFIX,
  assertNotificationsRoutesCompleteness,
  createNotificationsRoutes,
  handleNotificationsRoutes,
  notificationsRoutesManifest,
  type NotificationsRoutesOptions,
} from "./routes/notifications.routes";
import {
  createNeonNotificationsRepository,
  shouldUseNeonNotificationsRepository,
} from "./repositories/notifications.repository";
import { createPhase5FinancialNotificationProducer } from "./notifications/phase5-financial-producers";
import { createPhase6GrowthCommunityNotificationProducer } from "./notifications/phase6-growth-community-producers";
import {
  PAYROLL_API_PREFIX,
  assertPayrollRoutesCompleteness,
  createPayrollRoutes,
  handlePayrollRoutes,
  type PayrollRoutesOptions,
  payrollRoutesManifest,
} from "./routes/payroll.routes";
import {
  createNeonPayrollRepository,
  shouldUseNeonPayrollRepository,
} from "./repositories/payroll.repository";
import {
  SAVINGS_API_PREFIX,
  assertSavingsRoutesCompleteness,
  createSavingsRoutes,
  handleSavingsRoutes,
  type SavingsRoutesOptions,
  savingsRoutesManifest,
} from "./routes/savings.routes";
import {
  createNeonSavingsRepository,
  shouldUseNeonSavingsRepository,
} from "./repositories/savings.repository";
import {
  UPLOADS_API_PREFIX,
  assertUploadsRoutesCompleteness,
  createUploadsRoutes,
  handleUploadsRoutes,
  type UploadsRoutesOptions,
  uploadsRoutesManifest,
} from "./routes/uploads.routes";
import {
  USERS_API_PREFIX,
  assertUsersRoutesCompleteness,
  createUsersRoutes,
  handleUsersRoutes,
  type UsersRoutesOptions,
  usersRoutesManifest,
} from "./routes/users.routes";
import {
  createNeonUsersRepository,
  shouldUseNeonUsersRepository,
} from "./repositories/users.repository";
import {
  VARIABLE_EXPENSES_API_PREFIX,
  assertVariableExpensesRoutesCompleteness,
  createVariableExpensesRoutes,
  handleVariableExpensesRoutes,
  type VariableExpensesRoutesOptions,
  variableExpensesRoutesManifest,
} from "./routes/variable-expenses.routes";
import {
  createNeonVariableExpensesRepository,
  shouldUseNeonVariableExpensesRepository,
} from "./repositories/variable-expenses.repository";

export const APP_VERSION = "3.1.0";
export const APP_SERVICE_NAME = "salary-hijacking-api";
export const APP_TIMEZONE = "Asia/Seoul";
export const API_VERSION = "v1";
export const API_PREFIX = "/api/v1";
export const APP_AUDIT_GATE_VERSION = "3.1.0-compatible";

const REQUEST_ID_HEADER = "x-request-id";
const MAX_ROUTE_PATH_LENGTH = 2_048;
const MOBILE_BOOTSTRAP_PATH = `${API_PREFIX}/mobile/bootstrap`;
const PUBLIC_SERVER_AUTHORITY_SMOKE_PATH = `${API_PREFIX}/public/server-authority-smoke`;
const MOBILE_DEFAULT_ROUTE = "/salary";
const BOOTSTRAP_ROLES = [
  "USER",
  "OPERATOR",
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_ADMIN",
  "MODERATOR",
  "CONTENT_ADMIN",
  "SUPPORT",
  "ADS_PARTNER_ADMIN",
  "AUDITOR_READONLY",
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
  "x-admin-break-glass",
  "x-admin-break-glass-reason",
  "x-admin-break-glass-scope",
  "x-admin-break-glass-expires-at",
  "x-service-token",
  "x-refresh-token",
  "x-upload-file-name",
  "x-upload-purpose",
  "x-upload-owner-type",
  "x-upload-owner-id",
  "x-upload-visibility",
  "x-upload-checksum-sha256",
].join(", ");
const LEGAL_PAGE_PATHS = [
  "/privacy",
  "/support",
  "/terms",
  "/partners",
  "/contact",
  "/affiliate",
] as const;
const LEGAL_SUPPORT_EMAIL = "support@salaryhijacking.com";
const LEGAL_PRIVACY_EMAIL = "privacy@salaryhijacking.com";
const LEGAL_LAST_UPDATED = "2026-07-01";
const PUBLIC_HTML_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

interface PublicInquiryQueue {
  readonly send: (message: unknown) => Promise<void>;
}

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
  readonly ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS?: string;
  readonly OPERATIONS_QUEUE?: PublicInquiryQueue;
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
  readonly adminRoutesOptions?: AdminRoutesOptions<TEnv>;
  readonly payrollRoutesOptions?: PayrollRoutesOptions<TEnv>;
  readonly dailyBudgetsRoutesOptions?: DailyBudgetsRoutesOptions<TEnv>;
  readonly fixedExpensesRoutesOptions?: FixedExpensesRoutesOptions<TEnv>;
  readonly variableExpensesRoutesOptions?: VariableExpensesRoutesOptions<TEnv>;
  readonly savingsRoutesOptions?: SavingsRoutesOptions<TEnv>;
  readonly growthRoutesOptions?: GrowthRoutesOptions<TEnv>;
  readonly communityRoutesOptions?: CommunityRoutesOptions<TEnv>;
  readonly notificationsRoutesOptions?: NotificationsRoutesOptions<TEnv>;
  readonly uploadsRoutesOptions?: UploadsRoutesOptions<TEnv>;
  readonly usersRoutesOptions?: UsersRoutesOptions<TEnv>;
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

const DATABASE_URL_ENV_KEYS = [
  "SALARY_HIJACKING_DATABASE_URL",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "NEON_DATABASE_URL",
  "NEON_POSTGRES_URL",
  "DIRECT_DATABASE_URL",
] as const;

const PERSISTENT_DATABASE_ROUTE_IDS = new Set([
  "auth",
  "admin",
  "users",
  "payroll",
  "daily-budgets",
  "fixed-expenses",
  "variable-expenses",
  "savings",
  "growth",
  "notifications",
  "community",
  "uploads",
]);

const handleEnvAwareAuthRoutes: FetchHandler<unknown> = createAuthRoutes({
  repository: (env) =>
    shouldUseNeonAuthRepository(env) ? createNeonAuthRepository() : null,
  jwtSecret: (env) =>
    envString(env, "JWT_SECRET") ?? envString(env, "AUTH_JWT_SECRET"),
  cookieSecure: (env) => environmentOf(env) === "production",
  allowedRedirectOrigins: (env) => [
    ...parseOrigins(
      envString(env, "CORS_ALLOWED_ORIGINS") ??
        envString(env, "ALLOWED_ORIGINS"),
    ),
    ...mobileDeepLinkSchemes(env),
  ],
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
    partnerBenefitsUrl: "https://salaryhijacking.com/partners",
    affiliateUrl: "https://salaryhijacking.com/affiliate",
    privacyUrl: "https://salaryhijacking.com/privacy",
    supportUrl: "https://salaryhijacking.com/support",
    termsUrl: "https://salaryhijacking.com/terms",
    contactUrl: "https://salaryhijacking.com/contact",
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

function hasRuntimeDatabaseUrl<TEnv>(env: TEnv): boolean {
  return DATABASE_URL_ENV_KEYS.some((key) => Boolean(envString(env, key)));
}

function requiresPersistentDatabase<TEnv>(
  env: TEnv,
  route: RouteModule,
): boolean {
  const environment = environmentOf(env).toLowerCase();
  return (
    (environment === "staging" || environment === "production") &&
    PERSISTENT_DATABASE_ROUTE_IDS.has(route.id) &&
    !hasRuntimeDatabaseUrl(env)
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

function databaseUrlRequired(
  runtime: AppRuntime,
  route: RouteModule,
): Response {
  return json(503, runtime, {
    error: {
      code: "APP_DATABASE_URL_REQUIRED",
      message:
        "A persistent database binding is required for staging and production API routes.",
      status: 503,
      requestId: runtime.requestId,
    },
    data: {
      environment: environmentOf(runtime.env),
      route: route.id,
      persistentDatabaseRequired: true,
    },
  });
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
  if (path === "/contact") return "문의";
  if (path === "/affiliate") return "제휴 혜택";
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
  if (title === "문의") {
    return [
      "급여납치 서비스, 제휴, 개인정보, 보안 문의는 목적에 맞는 공식 이메일로 접수합니다.",
      "고객 지원은 support@salaryhijacking.com, 개인정보 문의는 privacy@salaryhijacking.com으로 접수합니다.",
      "문의 본문에는 비밀번호, 인증 토큰, 계좌, 카드, 급여, 지출, 저축 원문을 포함하지 않는 것을 권장합니다.",
    ];
  }
  return [
    "급여납치는 월급 흐름을 계획하고 남길 돈을 먼저 분리하도록 돕는 개인 재무 자기관리 서비스입니다.",
    "급여, 예산, 지출, 저축, 납치금액의 최종 계산은 서버 권위 API와 검증된 데이터 기준을 따릅니다.",
    "사용자는 허위 정보, 타인의 개인정보, 금융 원문, 불법 콘텐츠, 광고성 게시물을 커뮤니티에 게시해서는 안 됩니다.",
    "서비스 정책, 개인정보, 광고/제휴 분리 원칙은 출시 환경과 법적 요구에 맞춰 업데이트될 수 있습니다.",
  ];
}

function publicPageDescription(title: string): string {
  if (title === "개인정보 처리방침")
    return "급여납치 개인정보 처리방침은 급여, 지출, 저축, 알림, 광고 데이터를 분리하고 필요한 정보만 처리하는 원칙을 설명합니다.";
  if (title === "고객 지원")
    return "급여납치 고객 지원은 계정, 예산, 커뮤니티 신고, 개인정보 요청을 안전하게 접수하는 공식 안내입니다.";
  if (title === "문의")
    return "급여납치 서비스, 제휴, 개인정보, 보안 문의를 위한 공식 연락처 안내입니다.";
  return "급여납치 이용약관은 서버 권위 계산, 사용자 책임, 커뮤니티와 광고 분리 원칙을 안내합니다.";
}

function publicHtmlHead({
  canonicalUrl,
  description,
  title,
}: Readonly<{
  canonicalUrl: string;
  description: string;
  title: string;
}>): string {
  return `<meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
}

const PUBLIC_WEB_STYLE = `
    :root {
      color-scheme: light;
      font-family: "Freesentation", "Pretendard", "Noto Sans KR", system-ui, sans-serif;
      --ink: #18211d;
      --muted: #657068;
      --line: #dce7df;
      --green: #119055;
      --green-dark: #0b5f39;
      --mint: #eaf7f0;
      --gold: #c78b16;
      --blue: #245a86;
      --rose: #a5455f;
      --paper: #fbfcfa;
      --surface: #ffffff;
      --shadow: 0 22px 60px rgba(24, 33, 29, .10);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: var(--paper); color: var(--ink); }
    a { color: var(--green-dark); font-weight: 800; }
    .skip { position: absolute; left: -999px; top: 12px; background: #fff; color: #000; padding: 10px 14px; z-index: 5; }
    .skip:focus { left: 12px; }
    .topbar { position: sticky; top: 0; z-index: 3; backdrop-filter: blur(18px); background: rgba(251,252,250,.86); border-bottom: 1px solid rgba(220,231,223,.7); }
    .shell { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    .nav { display: flex; align-items: center; justify-content: space-between; min-height: 68px; gap: 18px; }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none; }
    .brand-mark { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; background: var(--green); color: #fff; font-weight: 900; }
    .brand strong { display: block; font-size: 17px; letter-spacing: 0; }
    .brand span { display: block; color: var(--muted); font-size: 12px; font-weight: 700; }
    .nav-links { display: flex; align-items: center; gap: 18px; font-size: 14px; }
    .nav-links a { color: #314239; text-decoration: none; white-space: nowrap; }
    .button { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; border-radius: 8px; padding: 0 18px; border: 1px solid var(--line); text-decoration: none; font-weight: 900; cursor: pointer; }
    .primary { background: var(--green); border-color: var(--green); color: #fff; }
    .secondary { background: #fff; color: var(--green-dark); }
    section { padding: 82px 0; }
    .hero { min-height: 600px; display: grid; align-items: center; overflow: hidden; background:
      radial-gradient(circle at 78% 18%, rgba(17,144,85,.18), transparent 28%),
      linear-gradient(135deg, #f6fbf7 0%, #ffffff 48%, #edf5ff 100%);
    }
    .hero-grid { display: grid; grid-template-columns: 1.04fr .96fr; gap: 52px; align-items: center; }
    .kicker { color: var(--green-dark); font-size: 13px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    h1, h2, h3, p { letter-spacing: 0; }
    h1 { margin: 16px 0 18px; font-size: clamp(40px, 6vw, 72px); line-height: 1.06; }
    h2 { margin: 12px 0 16px; font-size: clamp(28px, 4vw, 46px); line-height: 1.15; }
    h3 { margin: 0 0 10px; font-size: 20px; line-height: 1.3; }
    p { color: var(--muted); font-size: 17px; line-height: 1.8; }
    .lead { font-size: 19px; color: #3a4840; }
    .cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
    .device { position: relative; width: min(430px, 100%); margin: 0 auto; border: 1px solid rgba(24,33,29,.12); border-radius: 34px; padding: 16px; background: #111b15; box-shadow: var(--shadow); }
    .screen { border-radius: 24px; background: #f8fbf8; overflow: hidden; padding: 18px; min-height: 500px; }
    .status { display: flex; justify-content: space-between; color: #5b6860; font-size: 12px; font-weight: 800; margin-bottom: 22px; }
    .money-panel { background: #fff; border: 1px solid #dfe9e2; border-radius: 8px; padding: 18px; box-shadow: 0 10px 30px rgba(17,144,85,.08); }
    .money-panel small { color: var(--muted); font-weight: 800; }
    .money-panel b { display: block; margin-top: 8px; color: var(--green-dark); font-size: 32px; line-height: 1.1; }
    .mini-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; }
    .mini { background: var(--mint); border-radius: 8px; padding: 12px; min-height: 82px; }
    .mini:nth-child(2) { background: #fff4dc; }
    .mini:nth-child(3) { background: #eef4ff; }
    .mini:nth-child(4) { background: #fff0f4; }
    .mini span { display: block; color: var(--muted); font-size: 12px; font-weight: 800; }
    .mini strong { display: block; margin-top: 8px; color: var(--ink); }
    .section-head { max-width: 760px; margin-bottom: 28px; }
    .feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .card { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 20px; min-height: 150px; }
    .card .icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 8px; background: var(--mint); color: var(--green-dark); font-weight: 900; margin-bottom: 18px; }
    .split { display: grid; grid-template-columns: .9fr 1.1fr; gap: 28px; align-items: start; }
    .steps { display: grid; gap: 12px; }
    .step { display: flex; gap: 14px; align-items: flex-start; background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
    .num { flex: 0 0 auto; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 999px; background: var(--green); color: #fff; font-weight: 900; }
    .band { background: #17211b; color: #fff; }
    .band p, .band .lead { color: #d5ddd8; }
    .band .card { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.16); }
    .band .card p { color: #dbe6df; }
    .pill-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    .pill { border: 1px solid rgba(17,144,85,.22); background: #fff; color: var(--green-dark); border-radius: 999px; padding: 9px 12px; font-weight: 900; }
    .contact-wrap { display: grid; grid-template-columns: .78fr 1.22fr; gap: 28px; align-items: start; }
    .form-card { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 24px; box-shadow: 0 12px 30px rgba(24,33,29,.06); }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .field.full { grid-column: 1 / -1; }
    label { display: block; color: #2f3d35; font-size: 14px; font-weight: 900; }
    input, select, textarea { width: 100%; min-height: 48px; margin-top: 8px; border: 1px solid #cfddd4; border-radius: 8px; padding: 0 14px; font: inherit; color: var(--ink); background: #fff; }
    textarea { min-height: 124px; padding-top: 12px; resize: vertical; }
    input:focus, select:focus, textarea:focus, .button:focus-visible, a:focus-visible { outline: 3px solid rgba(17,144,85,.28); outline-offset: 2px; }
    .privacy-check { display: flex; gap: 10px; align-items: flex-start; margin-top: 16px; color: var(--muted); line-height: 1.6; }
    .privacy-check input { width: 18px; min-height: 18px; margin-top: 4px; }
    footer { background: #0f1712; color: #fff; padding: 42px 0; }
    footer p, footer a { color: #d9e1dc; }
    .footer-grid { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: start; }
    .footer-links { display: flex; flex-wrap: wrap; gap: 14px; }
    .company { color: #c3cdc7; line-height: 1.8; }
    @media (max-width: 900px) {
      .hero { min-height: auto; padding: 48px 0 40px; }
      .hero-grid, .split, .contact-wrap, .footer-grid { grid-template-columns: 1fr; }
      .feature-grid { grid-template-columns: repeat(2, 1fr); }
      .nav-links { display: none; }
      .device { max-width: 360px; }
      .screen { min-height: 300px; }
      .mini-grid { display: none; }
    }
    @media (max-width: 560px) {
      .shell { width: min(100% - 28px, 1120px); }
      section { padding: 44px 0; }
      .feature-grid, .form-grid { grid-template-columns: 1fr; }
      .field.full { grid-column: auto; }
      .hero { padding: 28px 0 24px; }
      .hero-grid { gap: 24px; }
      h1 { font-size: 34px; }
      .lead { font-size: 16px; line-height: 1.65; }
      .cta-row { margin-top: 18px; }
      .device { border-radius: 22px; padding: 8px; max-width: 250px; }
      .screen { border-radius: 16px; min-height: 220px; padding: 12px; }
      .status { margin-bottom: 12px; }
      .money-panel { padding: 12px; }
      .money-panel b { font-size: 24px; }
      .money-panel p { margin: 8px 0 0; font-size: 13px; }
      .mini-grid { display: none; }
    }`;

function sectionFeature(title: string, text: string, icon: string): string {
  return `<article class="card"><div class="icon" aria-hidden="true">${escapeHtml(
    icon,
  )}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`;
}

function publicContactFormHtml(origin: string): string {
  return `<form class="form-card" method="post" action="${origin}/api/v1/public/partnership-inquiries">
        <h3>제휴 문의 남기기</h3>
        <p>문의는 급여납치 production backend로 접수됩니다. 비밀번호, 인증 토큰, 계좌, 카드, 급여·지출·저축 원문은 입력하지 마세요.</p>
        <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px" />
        <div class="form-grid">
          <div class="field"><label for="company">회사/브랜드 *</label><input id="company" name="company" maxlength="80" required autocomplete="organization" /></div>
          <div class="field"><label for="name">이름/담당자 *</label><input id="name" name="name" maxlength="40" required autocomplete="name" /></div>
          <div class="field full"><label for="email">이메일 *</label><input id="email" name="email" type="email" maxlength="120" required autocomplete="email" /></div>
          <div class="field full"><label for="phone">연락처 optional</label><input id="phone" name="phone" maxlength="40" autocomplete="tel" /></div>
          <div class="field full"><label for="type">문의 유형 *</label><select id="type" name="type" required><option value="">선택해 주세요</option><option value="brand">브랜드/서비스 제휴</option><option value="benefit">생활 혜택/쿠폰</option><option value="content">콘텐츠/LV UP 제휴</option><option value="campaign">광고/캠페인</option><option value="support">고객/서비스 문의</option></select></div>
          <div class="field full"><label for="message">문의 내용 *</label><textarea id="message" name="message" maxlength="2000" minlength="10" required placeholder="제휴 목적과 제안 내용을 간단히 적어 주세요."></textarea></div>
        </div>
        <label class="privacy-check"><input type="checkbox" name="privacyConsent" value="true" required /><span>문의 처리를 위해 입력한 연락처와 문의 내용을 급여납치 운영 채널로 전달하는 것에 동의합니다.</span></label>
        <div class="cta-row"><button class="button primary" type="submit">문의 접수하기</button><a class="button secondary" href="${origin}/privacy">개인정보 처리방침</a></div>
      </form>`;
}

function publicFooterHtml(origin: string): string {
  return `<footer>
  <div class="shell footer-grid">
    <div>
      <a class="brand" href="${origin}/"><span class="brand-mark">급</span><span><strong>급여납치</strong><span>Salary Hijacking</span></span></a>
      <p class="company">회사명: 진비즈 매니지먼트<br />대표자: 김진원 · 사업자등록번호: 330-25-01693<br />고객지원: ${LEGAL_SUPPORT_EMAIL} · 개인정보 문의: ${LEGAL_PRIVACY_EMAIL}</p>
      <p>급여납치는 급여·예산·지출·저축 관리와 자기계발을 돕는 서비스이며 금융투자 자문 또는 금융상품 판매 서비스가 아닙니다.</p>
    </div>
    <nav class="footer-links" aria-label="정책 및 고객지원">
      <a href="${origin}/privacy">개인정보처리방침</a>
      <a href="${origin}/terms">이용약관</a>
      <a href="${origin}/support">고객지원</a>
      <a href="${origin}/contact">제휴 문의</a>
    </nav>
  </div>
</footer>`;
}

function partnerBenefitsResponse<TEnv>(runtime: AppRuntime<TEnv>): Response {
  const origin = canonicalOrigin(runtime);
  const canonicalUrl = `${origin}${runtime.path === "/affiliate" ? "/affiliate" : "/partners"}`;
  const body = `<!doctype html>
<html lang="ko">
<head>
  ${publicHtmlHead({
    canonicalUrl,
    description:
      "급여납치 제휴 혜택은 금융 금액 기반 타겟팅 없이 생활 맥락에 맞춘 안내를 제공하는 정책을 설명합니다.",
    title: "제휴 혜택 | 급여납치",
  })}
  <style>${PUBLIC_WEB_STYLE}</style>
</head>
<body>
  <header class="topbar"><div class="shell nav"><a class="brand" href="${origin}/"><span class="brand-mark">급</span><span><strong>급여납치</strong><span>Salary Hijacking</span></span></a></div></header>
  <main>
    <section>
      <div class="shell split">
        <div>
          <p class="kicker">Partnership</p>
          <h1>사용자에게 실제로 도움이 되는 생활 혜택</h1>
          <p class="lead">급여납치는 급여 흐름을 가리지 않는 위치에서 생활비 절감, 자기관리, 콘텐츠 혜택을 문맥형 안내와 명확한 제휴 표시로 연결합니다.</p>
          <p>민감 금융정보를 광고 세그먼트에 사용하지 않습니다. 제휴사는 실제로 확정된 경우에만 공개하며, 현재 페이지는 제휴 원칙과 문의 경로를 안내합니다.</p>
        </div>
        <div class="steps">
          <article class="step"><span class="num">1</span><div><h3>생활비 절감</h3><p>구독, 교육, 건강, 생활 서비스처럼 사용자의 지출 결정을 돕는 혜택을 우선합니다.</p></div></article>
          <article class="step"><span class="num">2</span><div><h3>자기관리 연계</h3><p>독서, 뉴스, 외국어, 운동 루틴과 자연스럽게 이어지는 파트너십을 검토합니다.</p></div></article>
          <article class="step"><span class="num">3</span><div><h3>명확한 표시</h3><p>광고와 제휴 콘텐츠는 Sponsored 또는 제휴 혜택으로 분명하게 표시합니다.</p></div></article>
        </div>
      </div>
      <div class="shell cta-row">
        <a class="button primary" href="${origin}/contact">제휴 문의하기</a>
        <a class="button secondary" href="${origin}/privacy">개인정보 처리방침</a>
        <a class="button secondary" href="${origin}/support">고객 지원</a>
      </div>
    </section>
  </main>
  ${publicFooterHtml(origin)}
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

function publicLandingResponse<TEnv>(runtime: AppRuntime<TEnv>): Response {
  const origin = canonicalOrigin(runtime);
  const canonicalUrl = `${origin}/`;
  const features = [
    sectionFeature(
      "급여 관리",
      "월급 주기와 수령일을 기준으로 이번 달 돈의 출발점을 정리합니다.",
      "₩",
    ),
    sectionFeature(
      "계획",
      "고정지출, 고정저축, 변동지출을 미리 나눠 월급 흐름을 한눈에 봅니다.",
      "P",
    ),
    sectionFeature(
      "오늘 사용 가능 금액",
      "하루 단위로 쓸 수 있는 생활비를 확인해 충동 지출을 줄입니다.",
      "D",
    ),
    sectionFeature(
      "고정지출",
      "월세, 통신비, 구독료처럼 반복되는 지출을 예정과 완료로 관리합니다.",
      "F",
    ),
    sectionFeature(
      "고정저축",
      "먼저 남길 돈을 분리하고 완료 여부를 확인합니다.",
      "S",
    ),
    sectionFeature(
      "변동지출",
      "갑자기 생기는 지출도 빠르게 기록하고 남은 예산에 반영합니다.",
      "V",
    ),
    sectionFeature(
      "지켜낸 돈",
      "쓰지 않고 남긴 돈을 앱의 첫 화면에서 분명하게 보여줍니다.",
      "K",
    ),
    sectionFeature(
      "알림",
      "예정된 지출과 관리 루틴을 놓치지 않도록 필요한 순간에 알려줍니다.",
      "N",
    ),
  ].join("");
  const body = `<!doctype html>
<html lang="ko">
<head>
  ${publicHtmlHead({
    canonicalUrl,
    description:
      "급여납치는 월급이 사라지기 전에 예산, 지출, 저축, LV UP을 한 곳에서 관리하는 금융 생활 앱입니다.",
    title: "급여납치 | Salary Hijacking",
  })}
  <style>${PUBLIC_WEB_STYLE}</style>
</head>
<body>
  <a class="skip" href="#main">본문으로 이동</a>
  <header class="topbar">
    <div class="shell nav">
      <a class="brand" href="${origin}/"><span class="brand-mark">급</span><span><strong>급여납치</strong><span>Salary Hijacking</span></span></a>
      <nav class="nav-links" aria-label="주요 섹션">
        <a href="#need">필요한 이유</a>
        <a href="#features">핵심 기능</a>
        <a href="#level-up">LV UP</a>
        <a href="#community">Community</a>
        <a href="#contact">문의</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="hero" id="hero">
      <div class="shell hero-grid" id="main">
        <div>
          <p class="kicker">Salary Hijacking</p>
          <h1>월급이 사라지기 전에, 내가 먼저 관리합니다.</h1>
          <p class="lead">급여납치는 월급이 들어오는 순간부터 지출, 저축, 오늘의 생활비, 지켜낸 돈을 한 흐름으로 정리하는 금융 생활 앱입니다.</p>
          <div class="cta-row">
            <a class="button primary" href="#features">핵심 기능 보기</a>
            <a class="button secondary" href="#contact">제휴 문의</a>
          </div>
        </div>
        <div class="device" aria-label="급여납치 앱 화면 미리보기">
          <div class="screen">
            <div class="status"><span>급여납치</span><span>오늘</span></div>
            <div class="money-panel"><small>이번 달 지켜낸 돈</small><b>482,000원</b><p>급여주기 18일 남음</p></div>
            <div class="mini-grid">
              <div class="mini"><span>오늘 사용 가능</span><strong>28,500원</strong></div>
              <div class="mini"><span>예정 고정지출</span><strong>4건</strong></div>
              <div class="mini"><span>고정저축</span><strong>완료 2건</strong></div>
              <div class="mini"><span>LV UP</span><strong>Streak 7</strong></div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section id="need">
      <div class="shell split">
        <div class="section-head">
          <p class="kicker">Why</p>
          <h2>급여납치가 필요한 이유</h2>
          <p class="lead">직접 돈의 흐름을 확인하고 관리해야 돈이 새지 않습니다.</p>
        </div>
        <div class="steps">
          <article class="step"><span class="num">1</span><div><h3>급여를 기준으로 시작</h3><p>월급, 고정지출, 저축, 생활비를 따로 보지 않고 같은 주기 안에서 확인합니다.</p></div></article>
          <article class="step"><span class="num">2</span><div><h3>예정과 완료를 구분</h3><p>사용 예정, 완료, 건너뛰기 상태를 나눠 실제 남길 수 있는 돈을 관리합니다.</p></div></article>
          <article class="step"><span class="num">3</span><div><h3>오늘의 선택으로 연결</h3><p>이번 달 전체 계획이 오늘 얼마를 써도 되는지로 이어집니다.</p></div></article>
        </div>
      </div>
    </section>
    <section id="features">
      <div class="shell">
        <div class="section-head"><p class="kicker">Features</p><h2>급여납치 핵심 기능</h2><p class="lead">월급 생활에 필요한 결정을 빠르게 확인할 수 있도록 기능을 명확한 블록으로 구성했습니다.</p></div>
        <div class="feature-grid">${features}</div>
      </div>
    </section>
    <section class="band" id="level-up">
      <div class="shell split">
        <div>
          <p class="kicker">LV UP</p>
          <h2>돈을 관리하는 김에, 나도 직접 관리합니다.</h2>
          <p class="lead">독서, 뉴스, 외국어, 운동을 기본 목표, 맞춤 추천, 직접 설정으로 시작하고 실제 활동, 기록, Streak, XP, Level로 이어갑니다.</p>
          <div class="pill-row"><span class="pill">기본 목표</span><span class="pill">맞춤 추천</span><span class="pill">직접 설정</span><span class="pill">Streak</span><span class="pill">XP</span></div>
        </div>
        <div class="feature-grid">
          ${sectionFeature("독서", "읽기 시작, 빠른 완료, 독서 카드와 한 줄 기록을 남깁니다.", "R")}
          ${sectionFeature("뉴스", "기사 읽음과 한 줄 생각을 기록해 관점을 넓힙니다.", "N")}
          ${sectionFeature("외국어", "Listening, Speaking, Reading, Writing 루틴을 이어갑니다.", "L")}
          ${sectionFeature("운동", "루틴, 타이머, 실제 운동 시간과 노트를 기록합니다.", "H")}
        </div>
      </div>
    </section>
    <section id="community">
      <div class="shell split">
        <div class="section-head"><p class="kicker">Community</p><h2>혼자 관리하지 않아도 되도록</h2><p class="lead">자유 게시판, 레벨업 인증, 취미 게시판, 정보 공유로 사용자 경험과 성장 기록을 나눕니다.</p></div>
        <div class="steps">
          <article class="step"><span class="num">C</span><div><h3>성장 공유</h3><p>LV UP 인증과 일상 루틴을 공유합니다.</p></div></article>
          <article class="step"><span class="num">I</span><div><h3>정보 공유</h3><p>생활비 절감, 자기관리, 취미 정보를 나눕니다.</p></div></article>
        </div>
      </div>
    </section>
    <section id="partnership">
      <div class="shell split">
        <div><p class="kicker">Partnership</p><h2>생활과 자기관리에 맞는 혜택을 연결합니다.</h2><p class="lead">확정되지 않은 제휴사를 실제 파트너처럼 표시하지 않습니다. 급여납치는 생활비 절감, 교육, 건강, 콘텐츠 파트너십을 신중하게 확장합니다.</p><a class="button secondary" href="${origin}/affiliate">제휴 원칙 보기</a></div>
        <div class="feature-grid">
          ${sectionFeature("생활 혜택", "핵심 재무 카드보다 앞서지 않는 위치에서 안내합니다.", "B")}
          ${sectionFeature("자기관리 혜택", "LV UP 활동과 자연스럽게 이어지는 제안을 우선합니다.", "G")}
          ${sectionFeature("명확한 표시", "광고와 제휴 콘텐츠는 사용자가 바로 알 수 있게 구분합니다.", "A")}
          ${sectionFeature("프라이버시", "민감 금융정보를 광고 세그먼트에 사용하지 않습니다.", "P")}
        </div>
      </div>
    </section>
    <section id="contact">
      <div class="shell contact-wrap">
        <div><p class="kicker">Contact</p><h2>제휴와 서비스 문의를 남겨 주세요.</h2><p class="lead">문의 내용은 production backend로 접수되며 운영 채널에서 확인합니다. 고객지원: ${LEGAL_SUPPORT_EMAIL}</p></div>
        ${publicContactFormHtml(origin)}
      </div>
    </section>
  </main>
  ${publicFooterHtml(origin)}
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
  if (title === "문의") {
    const body = `<!doctype html>
<html lang="ko">
<head>
  ${publicHtmlHead({
    canonicalUrl,
    description: publicPageDescription(title),
    title: `${title} | 급여납치`,
  })}
  <style>${PUBLIC_WEB_STYLE}</style>
</head>
<body>
  <header class="topbar"><div class="shell nav"><a class="brand" href="${origin}/"><span class="brand-mark">급</span><span><strong>급여납치</strong><span>Salary Hijacking</span></span></a></div></header>
  <main>
    <section>
      <div class="shell contact-wrap">
        <div>
          <p class="kicker">Contact</p>
          <h1>문의</h1>
          <p class="lead">서비스, 제휴, 개인정보, 보안 문의를 안전한 운영 경로로 접수합니다.</p>
          <p>고객 지원: ${LEGAL_SUPPORT_EMAIL}<br />개인정보 문의: ${LEGAL_PRIVACY_EMAIL}</p>
        </div>
        ${publicContactFormHtml(origin)}
      </div>
    </section>
  </main>
  ${publicFooterHtml(origin)}
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
  const sections = legalPageBody(title)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const body = `<!doctype html>
<html lang="ko">
<head>
  ${publicHtmlHead({
    canonicalUrl,
    description: publicPageDescription(title),
    title: `${title} | 급여납치`,
  })}
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

function publicRobotsResponse<TEnv>(runtime: AppRuntime<TEnv>): Response {
  const origin = canonicalOrigin(runtime);
  const body = `User-agent: *
Allow: /
Sitemap: ${origin}/sitemap.xml
`;
  return new Response(runtime.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      [REQUEST_ID_HEADER]: runtime.requestId,
    },
  });
}

function publicSitemapResponse<TEnv>(runtime: AppRuntime<TEnv>): Response {
  const origin = canonicalOrigin(runtime);
  const paths = [
    "/",
    "/privacy",
    "/terms",
    "/support",
    "/partners",
    "/affiliate",
    "/contact",
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map((path) => `  <url><loc>${escapeHtml(`${origin}${path}`)}</loc></url>`)
  .join("\n")}
</urlset>
`;
  return new Response(runtime.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
      [REQUEST_ID_HEADER]: runtime.requestId,
    },
  });
}

function publicAndroidAssetLinksResponse<TEnv>(
  runtime: AppRuntime<TEnv>,
): Response {
  const fingerprints = parseAndroidCertFingerprints(
    envString(runtime.env, "ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS"),
  );
  if (fingerprints.length === 0) {
    return json(503, runtime, {
      error: {
        code: "ANDROID_APP_LINK_CERT_FINGERPRINT_REQUIRED",
        message:
          "Android App Links require explicit public SHA-256 signing certificate fingerprints.",
        status: 503,
        requestId: runtime.requestId,
      },
      data: {
        packageName: "com.salaryhijacking.mobile",
        configured: false,
      },
    });
  }

  return new Response(
    runtime.method === "HEAD"
      ? null
      : JSON.stringify([
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: "com.salaryhijacking.mobile",
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=3600",
        [REQUEST_ID_HEADER]: runtime.requestId,
      },
    },
    );
}

type PublicPartnershipInquiry = {
  readonly company: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly type: string;
  readonly message: string;
  readonly privacyConsent: true;
};

const PUBLIC_INQUIRY_TYPES = new Set([
  "brand",
  "benefit",
  "content",
  "campaign",
  "support",
]);

function publicInquiryQueue<TEnv>(env: TEnv): PublicInquiryQueue | null {
  const value =
    env && typeof env === "object"
      ? (env as Record<string, unknown>).OPERATIONS_QUEUE
      : null;
  if (!value || typeof value !== "object") return null;
  const send = (value as { readonly send?: unknown }).send;
  return typeof send === "function" ? (value as PublicInquiryQueue) : null;
}

function cleanPublicInquiryText(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maxLength);
}

function boolFromPublicInquiry(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function validPublicEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) && value.length <= 120;
}

async function readPublicInquiryPayload(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    const parsed = (await request.json().catch(() => null)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData().catch(() => null);
    if (!form) return null;
    const payload: Record<string, unknown> = {};
    form.forEach((value, key) => {
      payload[key] = value;
    });
    return payload;
  }
  return null;
}

function validatePublicInquiryPayload(
  input: Record<string, unknown> | null,
): PublicPartnershipInquiry | null {
  if (!input) return null;
  if (cleanPublicInquiryText(input.website, 120)) return null;

  const company = cleanPublicInquiryText(input.company, 80);
  const name = cleanPublicInquiryText(input.name, 40);
  const email = cleanPublicInquiryText(input.email, 120).toLowerCase();
  const phone = cleanPublicInquiryText(input.phone, 40);
  const type = cleanPublicInquiryText(input.type, 40);
  const message = cleanPublicInquiryText(input.message, 2_000);
  const privacyConsent = boolFromPublicInquiry(input.privacyConsent);

  if (company.length < 2) return null;
  if (name.length < 2) return null;
  if (!validPublicEmail(email)) return null;
  if (!PUBLIC_INQUIRY_TYPES.has(type)) return null;
  if (message.length < 10) return null;
  if (!privacyConsent) return null;

  return {
    company,
    name,
    email,
    phone: phone || null,
    type,
    message,
    privacyConsent: true,
  };
}

async function publicPartnershipInquiryResponse<TEnv>(
  runtime: AppRuntime<TEnv>,
): Promise<Response> {
  const queue = publicInquiryQueue(runtime.env);
  if (!queue) {
    return json(503, runtime, {
      error: {
        code: "PUBLIC_CONTACT_QUEUE_UNAVAILABLE",
        message: "현재 문의 접수 경로를 사용할 수 없습니다.",
        status: 503,
        requestId: runtime.requestId,
      },
      data: {
        accepted: false,
        queued: false,
      },
    });
  }

  const inquiry = validatePublicInquiryPayload(
    await readPublicInquiryPayload(runtime.request),
  );
  if (!inquiry) {
    return json(400, runtime, {
      error: {
        code: "PUBLIC_CONTACT_INVALID_INPUT",
        message: "문의 내용과 개인정보 동의 항목을 확인해 주세요.",
        status: 400,
        requestId: runtime.requestId,
      },
      data: {
        accepted: false,
        queued: false,
      },
    });
  }

  const inquiryId = `inq_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
  await queue.send({
    type: "partnership_inquiry",
    source: "public_web",
    requestId: runtime.requestId,
    inquiryId,
    environment: environmentOf(runtime.env),
    submittedAt: runtime.now.toISOString(),
    inquiry,
    consent: { privacy: true },
    piiEvidence: {
      rawPersonalDataEchoedToResponse: false,
      rawFinancialDataCollected: false,
      secretCollected: false,
    },
  });

  return json(202, runtime, {
    data: {
      accepted: true,
      queued: true,
      requestId: inquiryId,
    },
  });
}

function parseAndroidCertFingerprints(value: string | null): readonly string[] {
  if (!value) return [];
  const fingerprintPattern = /^[0-9A-F]{2}(?::[0-9A-F]{2}){31}$/u;
  return value
    .split(/[,\n]/u)
    .map((entry) => entry.trim().toUpperCase())
    .filter(
      (entry, index, entries) =>
        fingerprintPattern.test(entry) && entries.indexOf(entry) === index,
    );
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

function mobileDeepLinkSchemes<TEnv>(env: TEnv): readonly string[] {
  const configured =
    envString(env, "MOBILE_DEEPLINK_SCHEMES") ??
    envString(env, "EXPO_PUBLIC_APP_SCHEME") ??
    "salaryhijacking";
  return parseOrigins(configured);
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
  headers.set(
    "strict-transport-security",
    "max-age=31536000; includeSubDomains; preload",
  );
  headers.set("referrer-policy", "no-referrer");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("cross-origin-resource-policy", "same-site");
  headers.set("x-financial-raw-data-exposed", "false");
  headers.set("x-raw-financial-data-exposed", "false");
  headers.set("x-raw-personal-data-exposed", "false");
  headers.set("x-raw-push-token-exposed", "false");
  headers.set("x-ad-financial-targeting", "separated");
  headers.set("x-ad-financial-targeting-used", "false");
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
  const origin = canonicalOrigin(runtime);
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
    ads: {
      contextualOnly: true,
      adLabelRequired: true,
      financialTargetingUsed: false,
      sensitiveFinancialTargetingAllowed: false,
      partnerDisclosureRequired: true,
    },
    serverAuthority: {
      apiPrefix: API_PREFIX,
      payrollBudgetExpenseSavingsSource: "server",
      clientMayCalculateAuthoritativeMoney: false,
      krwIntegerOnly: true,
      negativeMoneyAllowed: false,
      fractionalMoneyAllowed: false,
    },
    links: {
      landingUrl: origin,
      partnerBenefitsUrl: `${origin}/partners`,
      affiliateUrl: `${origin}/affiliate`,
      privacyUrl: `${origin}/privacy`,
      supportUrl: `${origin}/support`,
      termsUrl: `${origin}/terms`,
      contactUrl: `${origin}/contact`,
    },
  };
}

function publicServerAuthoritySmoke<TEnv>(runtime: AppRuntime<TEnv>): Response {
  return json(200, runtime, {
    data: {
      status: "server_authority_smoke_ready",
      serverAuthorityEnabled: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
      privacyMode: "STRICT",
      smokeContract: {
        booleanOnlyProof: true,
        rawResponsePayloadStored: false,
        safeForUnauthenticatedReleaseProbe: true,
      },
      syntheticKrwIntegerCalculation: {
        verified: true,
        sourceOfTruth: API_PREFIX,
        krwIntegerOnly: true,
        negativeMoneyRejected: true,
        fractionalMoneyRejected: true,
        dailyBudgetDistributionVerified: true,
        paycheckProtectionFormulaVerified: true,
        rawAmountsReturned: false,
      },
      privacy: {
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
        contextualAdsOnly: true,
      },
    },
  });
}

function headerText(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value ? value : null;
}

function headerBool(headers: Headers, name: string): boolean {
  return headerText(headers, name)?.toLowerCase() === "true";
}

function headerBoolOr(
  headers: Headers,
  name: string,
  fallback: boolean,
): boolean {
  const value = headerText(headers, name);
  if (!value) return fallback;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return fallback;
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

function bootstrapSessionExpiresAt(headers: Headers): string | null {
  const value = headerText(headers, "x-auth-session-expires-at");
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function mfaRequiredFor(role: BootstrapRole, mfaVerified: boolean): boolean {
  return (
    (role === "OPERATOR" ||
      role === "ADMIN" ||
      role === "SUPER_ADMIN" ||
      role === "OPS_ADMIN" ||
      role === "MODERATOR" ||
      role === "CONTENT_ADMIN" ||
      role === "SUPPORT" ||
      role === "ADS_PARTNER_ADMIN" ||
      role === "AUDITOR_READONLY") &&
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
  const emailVerified =
    authenticated &&
    headerBoolOr(headers, "x-auth-email-verified", accountReady);
  const onboardingCompleted =
    authenticated &&
    headerBoolOr(headers, "x-auth-onboarding-completed", accountReady);
  const payrollReady =
    authenticated &&
    headerBoolOr(headers, "x-auth-payroll-ready", accountReady);

  return json(200, runtime, {
    data: {
      session: {
        authenticated,
        userIdHash: await hashForMobileSession(userId),
        role,
        emailVerified,
        onboardingCompleted,
        payrollReady,
        mfaRequired: authenticated && mfaRequiredFor(role, mfaVerified),
        accountStatus,
        sessionExpiresAt: authenticated
          ? bootstrapSessionExpiresAt(headers)
          : null,
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
        payrollReady,
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

  if (path === "/partners" && (method === "GET" || method === "HEAD")) {
    return partnerBenefitsResponse(runtime);
  }

  if (path === "/affiliate" && (method === "GET" || method === "HEAD")) {
    return partnerBenefitsResponse(runtime);
  }

  if (
    path === `${API_PREFIX}/public/partnership-inquiries` &&
    method === "POST"
  ) {
    return publicPartnershipInquiryResponse(runtime);
  }

  if (path === "/robots.txt" && (method === "GET" || method === "HEAD")) {
    return publicRobotsResponse(runtime);
  }

  if (path === "/sitemap.xml" && (method === "GET" || method === "HEAD")) {
    return publicSitemapResponse(runtime);
  }

  if (
    path === "/.well-known/assetlinks.json" &&
    (method === "GET" || method === "HEAD")
  ) {
    return publicAndroidAssetLinksResponse(runtime);
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
        environment: environmentOf(env),
        serverAuthorityEnabled: true,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
        privacyMode: "STRICT",
        smokeSafe: true,
        smokeContract: {
          booleanOnlyProof: true,
          rawResponsePayloadStored: false,
          safeForUnauthenticatedReleaseProbe: true,
        },
        serverAuthority: {
          sourceOfTruth: API_PREFIX,
          clientRole: "display-input-offline-fallback",
          krwIntegerOnly: true,
          negativeMoneyAllowed: false,
          fractionalMoneyAllowed: false,
        },
        calculationBoundaries: {
          payroll: "server",
          dailyBudget: "server",
          paycheckProtection: "server",
        },
        privacy: {
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
          contextualAdsOnly: true,
        },
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

  if (path === PUBLIC_SERVER_AUTHORITY_SMOKE_PATH && method === "GET") {
    return publicServerAuthoritySmoke(runtime);
  }

  if (path === MOBILE_BOOTSTRAP_PATH && method === "GET") {
    return mobileBootstrap(runtime);
  }

  if (path === `${API_PREFIX}/manifest` || path === "/manifest") {
    return json(200, runtime, { data: appManifest });
  }

  const route = selectRoute(path);
  if (!route) return notFound(runtime);
  if (requiresPersistentDatabase(env, route))
    return databaseUrlRequired(runtime, route);
  if (route.id === "admin") {
    const baseOptions: AdminRoutesOptions<TEnv> =
      options.adminRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonAdminRepository(routeEnv)
            ? createNeonAdminRepository<TEnv>()
            : undefined,
      } satisfies AdminRoutesOptions<TEnv>);
    const routeOptions: AdminRoutesOptions<TEnv> =
      baseOptions.now || !options.now
        ? baseOptions
        : {
            ...baseOptions,
            now: options.now,
          };
    return createAdminRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "payroll") {
    const baseOptions: PayrollRoutesOptions<TEnv> =
      options.payrollRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonPayrollRepository(routeEnv)
            ? createNeonPayrollRepository<TEnv>()
            : undefined,
      } satisfies PayrollRoutesOptions<TEnv>);
    const routeOptions: PayrollRoutesOptions<TEnv> =
      baseOptions.now || !options.now
        ? baseOptions
        : {
            ...baseOptions,
            now: options.now,
          };
    return createPayrollRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "daily-budgets") {
    const baseOptions: DailyBudgetsRoutesOptions<TEnv> =
      options.dailyBudgetsRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonDailyBudgetsRepository(routeEnv)
            ? createNeonDailyBudgetsRepository<TEnv>()
            : undefined,
      } satisfies DailyBudgetsRoutesOptions<TEnv>);
    const routeOptions: DailyBudgetsRoutesOptions<TEnv> =
      baseOptions.now || !options.now
        ? baseOptions
        : {
            ...baseOptions,
            now: options.now,
          };
    return createDailyBudgetsRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "fixed-expenses") {
    const baseOptions: FixedExpensesRoutesOptions<TEnv> =
      options.fixedExpensesRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonFixedExpensesRepository(routeEnv)
            ? createNeonFixedExpensesRepository<TEnv>()
            : undefined,
      } satisfies FixedExpensesRoutesOptions<TEnv>);
    const routeOptions: FixedExpensesRoutesOptions<TEnv> =
      baseOptions.now || !options.now
        ? baseOptions
        : {
            ...baseOptions,
            now: options.now,
          };
    return createFixedExpensesRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "variable-expenses") {
    const phase5Producer = createPhase5FinancialNotificationProducer<TEnv>(
      options.now ? { now: options.now } : {},
    );
    const baseOptions: VariableExpensesRoutesOptions<TEnv> =
      options.variableExpensesRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonVariableExpensesRepository(routeEnv)
            ? createNeonVariableExpensesRepository<TEnv>()
            : undefined,
      } satisfies VariableExpensesRoutesOptions<TEnv>);
    const producerOptions: VariableExpensesRoutesOptions<TEnv> =
      baseOptions.onVariableExpenseEvent
        ? baseOptions
        : {
            ...baseOptions,
            onVariableExpenseEvent: async (event, routeEnv, routeContext) => {
              await phase5Producer.handleVariableExpenseEvent(
                event,
                routeEnv,
                routeContext,
              );
            },
          };
    const routeOptions: VariableExpensesRoutesOptions<TEnv> =
      producerOptions.now || !options.now
        ? producerOptions
        : {
            ...producerOptions,
            now: options.now,
          };
    return createVariableExpensesRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "savings") {
    const phase5Producer = createPhase5FinancialNotificationProducer<TEnv>(
      options.now ? { now: options.now } : {},
    );
    const baseOptions: SavingsRoutesOptions<TEnv> =
      options.savingsRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonSavingsRepository(routeEnv)
            ? createNeonSavingsRepository<TEnv>()
            : undefined,
      } satisfies SavingsRoutesOptions<TEnv>);
    const producerOptions: SavingsRoutesOptions<TEnv> =
      baseOptions.onSavingsEvent
        ? baseOptions
        : {
            ...baseOptions,
            onSavingsEvent: async (event, routeEnv, routeContext) => {
              await phase5Producer.handleSavingsEvent(
                event,
                routeEnv,
                routeContext,
              );
            },
          };
    const routeOptions: SavingsRoutesOptions<TEnv> =
      producerOptions.now || !options.now
        ? producerOptions
        : {
            ...producerOptions,
            now: options.now,
          };
    return createSavingsRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "growth") {
    const phase6Producer =
      createPhase6GrowthCommunityNotificationProducer<TEnv>(
        options.now ? { now: options.now } : {},
      );
    const baseOptions: GrowthRoutesOptions<TEnv> =
      options.growthRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonGrowthRepository(routeEnv)
            ? createNeonGrowthRepository<TEnv>()
            : undefined,
      } satisfies GrowthRoutesOptions<TEnv>);
    const producerOptions: GrowthRoutesOptions<TEnv> = baseOptions.onGrowthEvent
      ? baseOptions
      : {
          ...baseOptions,
          onGrowthEvent: async (event, routeEnv, routeContext) => {
            await phase6Producer.handleGrowthEvent(
              event,
              routeEnv,
              routeContext,
            );
          },
        };
    const routeOptions: GrowthRoutesOptions<TEnv> =
      producerOptions.now || !options.now
        ? producerOptions
        : {
            ...producerOptions,
            now: options.now,
          };
    return createGrowthRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "notifications") {
    const baseOptions: NotificationsRoutesOptions<TEnv> =
      options.notificationsRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonNotificationsRepository(routeEnv)
            ? createNeonNotificationsRepository<TEnv>()
            : undefined,
      } satisfies NotificationsRoutesOptions<TEnv>);
    const routeOptions: NotificationsRoutesOptions<TEnv> =
      baseOptions.now || !options.now
        ? baseOptions
        : {
            ...baseOptions,
            now: options.now,
          };
    return createNotificationsRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "community") {
    const phase6Producer =
      createPhase6GrowthCommunityNotificationProducer<TEnv>(
        options.now ? { now: options.now } : {},
      );
    const baseOptions: CommunityRoutesOptions<TEnv> =
      options.communityRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonCommunityRepository(routeEnv)
            ? createNeonCommunityRepository<TEnv>()
            : undefined,
      } satisfies CommunityRoutesOptions<TEnv>);
    const producerOptions: CommunityRoutesOptions<TEnv> =
      baseOptions.onCommunityEvent
        ? baseOptions
        : {
            ...baseOptions,
            onCommunityEvent: async (event, routeEnv, routeContext) => {
              await phase6Producer.handleCommunityEvent(
                event,
                routeEnv,
                routeContext,
              );
            },
          };
    const routeOptions: CommunityRoutesOptions<TEnv> =
      producerOptions.now || !options.now
        ? producerOptions
        : {
            ...producerOptions,
            now: options.now,
          };
    return createCommunityRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "uploads") {
    const baseOptions: UploadsRoutesOptions<TEnv> =
      options.uploadsRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonUploadsRepository(routeEnv)
            ? createNeonUploadsRepository<TEnv>()
            : undefined,
      } satisfies UploadsRoutesOptions<TEnv>);
    const routeOptions: UploadsRoutesOptions<TEnv> =
      baseOptions.now || !options.now
        ? baseOptions
        : {
            ...baseOptions,
            now: options.now,
          };
    return createUploadsRoutes(routeOptions)(request, env, context);
  }
  if (route.id === "users") {
    const baseOptions: UsersRoutesOptions<TEnv> =
      options.usersRoutesOptions ??
      ({
        repository: (routeEnv) =>
          shouldUseNeonUsersRepository(routeEnv)
            ? createNeonUsersRepository<TEnv>()
            : undefined,
      } satisfies UsersRoutesOptions<TEnv>);
    const routeOptions: UsersRoutesOptions<TEnv> =
      baseOptions.now || !options.now
        ? baseOptions
        : {
            ...baseOptions,
            now: options.now,
          };
    return createUsersRoutes(routeOptions)(request, env, context);
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
  const dbSessionResolver = createNeonAuthSessionResolver<TEnv>(
    options.now ? { now: options.now } : {},
  );
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
        /^\/(manifest|health|ready|live|_health|privacy|support|terms|partners|contact|robots\.txt|sitemap\.xml|\.well-known\/assetlinks\.json)(?:\/|$)/,
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
    resolveSession: (principal, runtime, env) =>
      shouldUseNeonAuthRepository(env)
        ? dbSessionResolver(principal, runtime, env)
        : { active: true },
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

function adminBreakGlassRequested(request: Request): boolean {
  return (
    request.headers.get("x-admin-break-glass")?.trim().toLowerCase() === "true"
  );
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
      const breakGlass = adminBreakGlassRequested(request);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: breakGlass
              ? "ADMIN_BREAK_GLASS_REASON_REQUIRED"
              : "ADMIN_REASON_REQUIRED",
            message: breakGlass
              ? "긴급 권한 사용에는 X-Admin-Reason 헤더가 필요합니다."
              : "관리자 변경 API는 X-Admin-Reason 헤더 또는 body.reason이 필요합니다.",
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
    "public_legal_privacy_support_terms_partners_pages_ready",
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
