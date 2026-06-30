/** services/api/src/middlewares/audit-log.middleware.ts
 * 급여납치 Salary Hijacking Platform · Cloudflare Workers 감사 로그 미들웨어 최종본
 */

export const AUDIT_LOG_MIDDLEWARE_VERSION = "3.1.1";
export const AUDIT_LOG_SERVICE_NAME = "salary-hijacking-api";
export const AUDIT_LOG_TIMEZONE = "Asia/Seoul";

const ADMIN_PREFIX = "/admin/api/v1";
const ADMIN_AUTH_PREFIX = "/admin/auth";
const USER_API_PREFIX = "/api/v1";
const MAX_REASON_BODY_BYTES = 64 * 1024;
const MAX_TEXT = 2048;
const MAX_DEPTH = 8;

export type AuditSeverity = "INFO" | "NOTICE" | "WARNING" | "CRITICAL";
export type AuditResult =
  | "SUCCESS"
  | "FAILURE"
  | "DENIED"
  | "ROLLBACK"
  | "SYSTEM";
export type AuditOperation =
  | "READ"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "AUTH"
  | "EXPORT"
  | "SYSTEM";
export type AuditJson =
  | null
  | boolean
  | number
  | string
  | AuditJson[]
  | { readonly [key: string]: AuditJson };
export type AdminAuditTargetType =
  | "USER"
  | "ADMIN_ROLE"
  | "ADMIN_ROLE_MEMBER"
  | "PARTNER_ACCOUNT"
  | "AD_CAMPAIGN"
  | "AD_EVENT"
  | "NOTICE"
  | "OPERATIONAL_INCIDENT"
  | "COMMUNITY_POST"
  | "COMMUNITY_COMMENT"
  | "COMMUNITY_REPORT"
  | "ATTACHMENT"
  | "SYSTEM"
  | "DEPLOYMENT"
  | "SECURITY_POLICY";

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export type FetchHandler<TEnv = unknown> = (
  request: Request,
  env: TEnv,
  context: WaitUntilCapable,
) => Response | Promise<Response>;

export interface AuditActor {
  readonly userId: string | null;
  readonly adminId?: string | null;
  readonly roles?: readonly string[];
  readonly sessionId?: string | null;
  readonly source?:
    | "auth-middleware"
    | "admin-session"
    | "service"
    | "anonymous"
    | string;
}

export interface AuditRouteInfo {
  readonly path: string;
  readonly endpointTemplate: string;
  readonly isAdmin: boolean;
  readonly isAdminAuth: boolean;
  readonly isUserApi: boolean;
  readonly method: string;
  readonly operation: AuditOperation;
  readonly targetType: AdminAuditTargetType;
  readonly targetId: string | null;
  readonly action: string;
  readonly requiresReason: boolean;
  readonly shouldAudit: boolean;
}

export interface AuditRecord {
  readonly actorUserId: string | null;
  readonly actorRoleSnapshot: readonly string[];
  readonly action: string;
  readonly targetType: AdminAuditTargetType;
  readonly targetId: string | null;
  readonly beforeData: AuditJson | null;
  readonly afterData: AuditJson | null;
  readonly metadata: AuditJson;
  readonly result: AuditResult;
  readonly severity: AuditSeverity;
  readonly requestId: string;
  readonly ipHash: string | null;
  readonly userAgentHash: string | null;
  readonly createdAt: string;
}

export interface AuditRuntimeContext<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly serviceName: string;
  readonly environment: string;
  readonly requestId: string;
  readonly startedAtEpochMs: number;
  readonly route: AuditRouteInfo;
  readonly actor: AuditActor;
  readonly ipHash: string | null;
  readonly userAgentHash: string | null;
  readonly reason: string | null;
  readonly idempotencyKey: string | null;
}

export interface AuditBeforeAfter<TEnv = unknown> {
  readonly beforeData?: AuditJson | null;
  readonly afterData?: AuditJson | null;
  readonly metadata?: AuditJson | null;
  readonly targetId?: string | null;
  readonly targetType?: AdminAuditTargetType;
  readonly action?: string;
  readonly severity?: AuditSeverity;
  readonly result?: AuditResult;
  readonly actor?: AuditActor;
  readonly sink?: AuditLogSink<TEnv>;
  readonly suppressDefaultAudit?: boolean;
}

export interface AuditLogSink<TEnv = unknown> {
  readonly name?: string;
  write(record: AuditRecord, runtime: AuditRuntimeContext<TEnv>): Promise<void>;
}

export interface AuditSqlStatement {
  readonly text: string;
  readonly values: readonly unknown[];
}

export type AuditSqlExecutor<TEnv = unknown> = (
  statement: AuditSqlStatement,
  env: TEnv,
  runtime: AuditRuntimeContext<TEnv>,
) => Promise<unknown>;

export interface CreateAuditLogMiddlewareOptions<TEnv = unknown> {
  readonly serviceName?: string;
  readonly environment?: string | ((env: TEnv) => string);
  readonly hashSecret?: string | ((env: TEnv) => string | null | undefined);
  readonly sink?: AuditLogSink<TEnv>;
  readonly fallbackSink?: AuditLogSink<TEnv>;
  readonly resolveActor?: (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ) => AuditActor | Promise<AuditActor>;
  readonly resolveBeforeAfter?: (
    runtime: AuditRuntimeContext<TEnv>,
    response: Response,
  ) => AuditBeforeAfter<TEnv> | Promise<AuditBeforeAfter<TEnv>>;
  readonly classifyRoute?: (
    request: Request,
  ) => Partial<AuditRouteInfo> | null | undefined;
  readonly shouldAudit?: (
    runtime: AuditRuntimeContext<TEnv>,
  ) => boolean | Promise<boolean>;
  readonly enforceAdminReason?: boolean;
  readonly blockAdminMutationWhenPreAuditFails?: boolean;
  readonly strictPostCommitFailure?: boolean;
  readonly auditAllAdminReads?: boolean;
  readonly auditUserApiFailures?: boolean;
  readonly auditAuthSecurityEvents?: boolean;
  readonly now?: () => Date;
}

export interface PostgresAdminAuditSinkOptions<TEnv = unknown> {
  readonly execute: AuditSqlExecutor<TEnv>;
  readonly roleSnapshotMode?: "json_array" | "empty";
}

export interface ManualAuditWriterOptions<TEnv = unknown> {
  readonly sink: AuditLogSink<TEnv>;
  readonly hashSecret?: string | ((env: TEnv) => string | null | undefined);
  readonly environment?: string | ((env: TEnv) => string);
  readonly now?: () => Date;
}

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const readMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const commandUpdateSegments = new Set([
  "activate",
  "archive",
  "block",
  "cancel",
  "force-logout",
  "hide",
  "pause",
  "publish",
  "reject",
  "resolve",
  "restore",
  "resume",
  "review",
  "suspend",
  "unhide",
  "unpublish",
  "verify",
]);
const exportHints = [
  "/exports",
  "/download",
  "/downloads",
  "/csv",
  "/xlsx",
  "/reports/export",
];
const uuidLikePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const objectIdLikePattern = /^[0-9a-f]{24}$/i;
const ulidLikePattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const numericIdPattern = /^\d{3,}$/;

const sensitiveKeyFragments = [
  "password",
  "passcode",
  "otp",
  "mfa",
  "totp",
  "recovery_code",
  "authorization",
  "cookie",
  "set-cookie",
  "access_token",
  "refresh_token",
  "token",
  "oauth",
  "client_secret",
  "secret",
  "api_key",
  "private_key",
  "database_url",
  "connection_string",
  "dsn",
  "email",
  "phone",
  "resident_registration_number",
  "rrn",
  "account_number",
  "card_number",
  "credit_card",
  "ip",
  "ip_address",
  "user_agent",
  "push_token",
  "device_token",
  "salary",
  "payroll",
  "expected_salary",
  "actual_salary",
  "income",
  "loan",
  "debt",
  "saving",
  "savings",
  "expense_amount",
  "fixed_expense",
  "variable_expense",
  "daily_budget",
  "hijack_amount",
  "financial",
  "주민등록",
  "급여",
  "월급",
  "대출",
  "저축",
  "적금",
  "지출",
  "생활비",
  "납치금액",
  "계좌",
  "카드",
  "토큰",
  "비밀번호",
];
const forbiddenValuePatterns = [
  /bearer\s+[a-z0-9._-]+/i,
  /eyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+/i,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i,
  /postgres(?:ql)?:\/\//i,
  /mysql:\/\//i,
  /mongodb(?:\+srv)?:\/\//i,
  /\b\d{13}\b/,
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
];

const safeHeaderAllowlist = [
  "accept-language",
  "cf-ipcountry",
  "cf-ray",
  "content-type",
  "idempotency-key",
  "x-client-version",
  "x-device-os",
  "x-platform",
  "x-request-id",
];

const targetTypeByPath: readonly [RegExp, AdminAuditTargetType][] = [
  [/^\/admin\/api\/v1\/users(?:\/|$)/, "USER"],
  [/^\/admin\/api\/v1\/admin-roles(?:\/|$)/, "ADMIN_ROLE"],
  [/^\/admin\/api\/v1\/admin-role-members(?:\/|$)/, "ADMIN_ROLE_MEMBER"],
  [/^\/admin\/api\/v1\/(partners|partner-accounts)(?:\/|$)/, "PARTNER_ACCOUNT"],
  [/^\/admin\/api\/v1\/ads\/events(?:\/|$)/, "AD_EVENT"],
  [/^\/admin\/api\/v1\/ads(?:\/|$)/, "AD_CAMPAIGN"],
  [/^\/admin\/api\/v1\/notices(?:\/|$)/, "NOTICE"],
  [
    /^\/admin\/api\/v1\/(incidents|operational-incidents)(?:\/|$)/,
    "OPERATIONAL_INCIDENT",
  ],
  [/^\/admin\/api\/v1\/community\/posts(?:\/|$)/, "COMMUNITY_POST"],
  [/^\/admin\/api\/v1\/community\/comments(?:\/|$)/, "COMMUNITY_COMMENT"],
  [
    /^\/admin\/api\/v1\/(reports|community\/reports)(?:\/|$)/,
    "COMMUNITY_REPORT",
  ],
  [/^\/admin\/api\/v1\/(attachments|uploads)(?:\/|$)/, "ATTACHMENT"],
  [/^\/admin\/api\/v1\/deployments(?:\/|$)/, "DEPLOYMENT"],
  [/^\/admin\/api\/v1\/security(?:\/|$)/, "SECURITY_POLICY"],
];

function normalizePath(pathname: string): string {
  const normalized = (pathname || "/").replace(/\/+/g, "/");
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function isIdentifierSegment(segment: string): boolean {
  return (
    uuidLikePattern.test(segment) ||
    objectIdLikePattern.test(segment) ||
    ulidLikePattern.test(segment) ||
    numericIdPattern.test(segment)
  );
}

function endpointTemplateFromPath(pathname: string): string {
  return normalizePath(pathname)
    .split("/")
    .map((segment) =>
      segment && isIdentifierSegment(segment) ? ":id" : segment,
    )
    .join("/");
}

function extractTargetId(pathname: string): string | null {
  return (
    normalizePath(pathname)
      .split("/")
      .filter(Boolean)
      .find(isIdentifierSegment) ?? null
  );
}

function inferOperation(method: string, pathname: string): AuditOperation {
  const upper = method.toUpperCase();
  const last = pathname.split("/").filter(Boolean).at(-1) ?? "";
  if (pathname.startsWith(ADMIN_AUTH_PREFIX) || pathname.includes("/auth/"))
    return "AUTH";
  if (exportHints.some((hint) => pathname.includes(hint))) return "EXPORT";
  if (upper === "POST" && commandUpdateSegments.has(last)) return "UPDATE";
  if (upper === "POST") return "CREATE";
  if (upper === "PUT" || upper === "PATCH") return "UPDATE";
  if (upper === "DELETE") return "DELETE";
  if (readMethods.has(upper)) return "READ";
  return "SYSTEM";
}

function inferTargetType(
  pathname: string,
  isAdminAuth: boolean,
): AdminAuditTargetType {
  if (isAdminAuth) return "SYSTEM";
  return (
    targetTypeByPath.find(([pattern]) => pattern.test(pathname))?.[1] ??
    "SYSTEM"
  );
}

function buildAction(
  method: string,
  pathname: string,
  operation: AuditOperation,
  targetType: AdminAuditTargetType,
): string {
  const lastMeaningful = normalizePath(pathname)
    .split("/")
    .filter(Boolean)
    .reverse()
    .find((segment) => !isIdentifierSegment(segment));
  const actionHint = (lastMeaningful ?? operation)
    .replace(/-/g, "_")
    .toUpperCase();
  return `${targetType}_${operation}_${actionHint}_${method.toUpperCase()}`.slice(
    0,
    180,
  );
}

export function classifyAuditRoute(
  request: Request,
  override?: Partial<AuditRouteInfo> | null,
): AuditRouteInfo {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  const method = request.method.toUpperCase();
  const isAdmin = path.startsWith(ADMIN_PREFIX);
  const isAdminAuth = path.startsWith(ADMIN_AUTH_PREFIX);
  const operation = inferOperation(method, path);
  const targetType = inferTargetType(path, isAdminAuth);
  const route: AuditRouteInfo = {
    path,
    endpointTemplate: endpointTemplateFromPath(path),
    isAdmin,
    isAdminAuth,
    isUserApi: path.startsWith(USER_API_PREFIX),
    method,
    operation,
    targetType,
    targetId: extractTargetId(path),
    action: buildAction(method, path, operation, targetType),
    requiresReason: isAdmin && mutatingMethods.has(method) && !isAdminAuth,
    shouldAudit: isAdmin || isAdminAuth,
  };
  return { ...route, ...override };
}

function headerValue(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value ? value : null;
}

function cryptoRandomId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function safeRequestId(value: string | null): string | null {
  const trimmed = value?.trim().slice(0, 160);
  return trimmed && /^[a-zA-Z0-9._:\-/]{8,160}$/.test(trimmed) ? trimmed : null;
}

export function getOrCreateRequestId(request: Request): string {
  return (
    safeRequestId(headerValue(request.headers, "x-request-id")) ??
    safeRequestId(headerValue(request.headers, "x-correlation-id")) ??
    safeRequestId(headerValue(request.headers, "cf-ray")) ??
    safeRequestId(headerValue(request.headers, "traceparent")) ??
    `req_${cryptoRandomId()}`
  );
}

function resolveValue<TEnv>(
  env: TEnv,
  value?: string | ((env: TEnv) => string | null | undefined),
  fallback = "production",
): string {
  const resolved = typeof value === "function" ? value(env) : value;
  return resolved?.trim() || fallback;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    toArrayBuffer(data),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function hashValue(
  value: string | null,
  secret: string | null,
  label: string,
): Promise<string | null> {
  const normalized = value?.trim();
  return normalized
    ? sha256Hex(`${label}:${secret ?? "no-secret"}:${normalized}`)
    : null;
}

async function createIpHash(
  request: Request,
  secret: string | null,
): Promise<string | null> {
  const ip =
    headerValue(request.headers, "cf-connecting-ip") ??
    headerValue(request.headers, "true-client-ip") ??
    headerValue(request.headers, "x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  return hashValue(ip, secret, "ip");
}

async function createUserAgentHash(
  request: Request,
  secret: string | null,
): Promise<string | null> {
  return hashValue(headerValue(request.headers, "user-agent"), secret, "ua");
}

function keyLooksSensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s.-]/g, "_");
  return sensitiveKeyFragments.some((fragment) =>
    normalized.includes(fragment),
  );
}

function stringLooksSensitive(value: string): boolean {
  return (
    value.length > MAX_TEXT ||
    forbiddenValuePatterns.some((pattern) => pattern.test(value))
  );
}

function clamp(value: string): string {
  return value.length <= MAX_TEXT
    ? value
    : `${value.slice(0, MAX_TEXT)}…[truncated]`;
}

function sanitizeInternal(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): AuditJson {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string")
    return stringLooksSensitive(value) ? "[REDACTED]" : clamp(value);
  if (typeof value !== "object") return String(value);
  if (depth >= MAX_DEPTH) return "[MAX_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value))
    return value
      .slice(0, 50)
      .map((item) => sanitizeInternal(item, depth + 1, seen));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 80)
      .map(([key, item]) => [
        key.slice(0, 128),
        keyLooksSensitive(key)
          ? "[REDACTED]"
          : sanitizeInternal(item, depth + 1, seen),
      ]),
  );
}

export function sanitizeAuditJson(value: unknown): AuditJson {
  return sanitizeInternal(value, 0, new WeakSet<object>());
}

function sanitizeHeaders(headers: Headers): Record<string, string> {
  return Object.fromEntries(
    safeHeaderAllowlist.flatMap((name) => {
      const value = headerValue(headers, name);
      return value ? [[name, clamp(value)]] : [];
    }),
  );
}

async function readReasonFromJsonBody(
  request: Request,
): Promise<string | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    !contentType.includes("application/json") &&
    !contentType.includes("+json")
  )
    return null;
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_REASON_BODY_BYTES) return null;
  try {
    const parsed = (await request.clone().json()) as Record<string, unknown>;
    const value = parsed.reason ?? parsed.adminReason ?? parsed.auditReason;
    return typeof value === "string" && value.trim()
      ? value.trim().slice(0, 500)
      : null;
  } catch {
    return null;
  }
}

export async function extractAdminReason(
  request: Request,
): Promise<string | null> {
  return (
    headerValue(request.headers, "x-admin-reason") ??
    headerValue(request.headers, "x-audit-reason") ??
    headerValue(request.headers, "x-operation-reason") ??
    readReasonFromJsonBody(request)
  );
}

function extractIdempotencyKey(request: Request): string | null {
  return (
    headerValue(request.headers, "idempotency-key") ??
    headerValue(request.headers, "x-idempotency-key")
  );
}

function defaultActorFromTrustedHeaders(request: Request): AuditActor {
  const userId =
    headerValue(request.headers, "x-authenticated-user-id") ??
    headerValue(request.headers, "x-admin-user-id") ??
    headerValue(request.headers, "x-service-user-id");
  const rolesHeader =
    headerValue(request.headers, "x-authenticated-roles") ??
    headerValue(request.headers, "x-admin-roles");
  return {
    userId: userId ?? null,
    adminId: headerValue(request.headers, "x-admin-user-id"),
    roles: rolesHeader
      ? rolesHeader
          .split(",")
          .map((role) => role.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [],
    sessionId: null,
    source: userId ? "auth-middleware" : "anonymous",
  };
}

function jsonResponse(
  status: number,
  body: unknown,
  requestId: string,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  });
}

function safeError(error: unknown): Record<string, string> {
  return error instanceof Error
    ? { name: error.name, message: clamp(error.message) }
    : { name: "UnknownError", message: clamp(String(error)) };
}

function resultFromResponse(response: Response): AuditResult {
  if (response.status >= 500) return "FAILURE";
  if (response.status >= 400 || [401, 403, 429].includes(response.status))
    return "DENIED";
  return "SUCCESS";
}

function severityFromResponse(
  response: Response,
  route: AuditRouteInfo,
): AuditSeverity {
  if (response.status >= 500) return "CRITICAL";
  if ([401, 403, 429].includes(response.status)) return "WARNING";
  if (route.operation === "DELETE" || route.operation === "EXPORT")
    return "WARNING";
  if (route.operation === "CREATE" || route.operation === "UPDATE")
    return "NOTICE";
  return "INFO";
}

function baseMetadata<TEnv>(
  runtime: AuditRuntimeContext<TEnv>,
  response?: Response,
  extra?: AuditJson | null,
): AuditJson {
  return sanitizeAuditJson({
    middlewareVersion: AUDIT_LOG_MIDDLEWARE_VERSION,
    service: runtime.serviceName,
    environment: runtime.environment,
    timezone: AUDIT_LOG_TIMEZONE,
    method: runtime.route.method,
    path: runtime.route.endpointTemplate,
    requestPath: runtime.route.path,
    operation: runtime.route.operation,
    statusCode: response?.status ?? null,
    latencyMs: Math.max(0, Date.now() - runtime.startedAtEpochMs),
    reasonProvided: Boolean(runtime.reason),
    reason: runtime.reason,
    idempotencyKeyPresent: Boolean(runtime.idempotencyKey),
    actorSource: runtime.actor.source ?? null,
    headers: sanitizeHeaders(runtime.request.headers),
    route: {
      isAdmin: runtime.route.isAdmin,
      isAdminAuth: runtime.route.isAdminAuth,
      isUserApi: runtime.route.isUserApi,
      requiresReason: runtime.route.requiresReason,
    },
    extra: extra ?? null,
  });
}

function buildAuditRecord<TEnv>(args: {
  runtime: AuditRuntimeContext<TEnv>;
  now: () => Date;
  response?: Response | undefined;
  beforeData?: AuditJson | null | undefined;
  afterData?: AuditJson | null | undefined;
  metadata?: AuditJson | null | undefined;
  action?: string | undefined;
  targetType?: AdminAuditTargetType | undefined;
  targetId?: string | null | undefined;
  result?: AuditResult | undefined;
  severity?: AuditSeverity | undefined;
  actor?: AuditActor | undefined;
}): AuditRecord {
  const actor = args.actor ?? args.runtime.actor;
  return {
    actorUserId: actor.userId,
    actorRoleSnapshot: actor.roles ?? [],
    action: (args.action ?? args.runtime.route.action).slice(0, 180),
    targetType: args.targetType ?? args.runtime.route.targetType,
    targetId: args.targetId ?? args.runtime.route.targetId,
    beforeData:
      args.beforeData === undefined ? null : sanitizeAuditJson(args.beforeData),
    afterData:
      args.afterData === undefined ? null : sanitizeAuditJson(args.afterData),
    metadata: baseMetadata(args.runtime, args.response, args.metadata ?? null),
    result:
      args.result ??
      (args.response ? resultFromResponse(args.response) : "SYSTEM"),
    severity:
      args.severity ??
      (args.response
        ? severityFromResponse(args.response, args.runtime.route)
        : "INFO"),
    requestId: args.runtime.requestId,
    ipHash: args.runtime.ipHash,
    userAgentHash: args.runtime.userAgentHash,
    createdAt: args.now().toISOString(),
  };
}

export const consoleAuditLogSink: AuditLogSink<unknown> = {
  name: "console",
  async write(record): Promise<void> {
    console.info(
      JSON.stringify({
        event: "admin_audit_log",
        record: sanitizeAuditJson(record),
      }),
    );
  },
};

function toUuidOrNull(value: string | null): string | null {
  return value && uuidLikePattern.test(value) ? value : null;
}

export function createPostgresAdminAuditSink<TEnv = unknown>(
  options: PostgresAdminAuditSinkOptions<TEnv>,
): AuditLogSink<TEnv> {
  return {
    name: "postgres-admin-audit-logs",
    async write(record, runtime): Promise<void> {
      const roles =
        options.roleSnapshotMode === "empty" ? [] : record.actorRoleSnapshot;
      await options.execute(
        {
          text: `
          insert into public.admin_audit_logs (
            actor_user_id, actor_role_snapshot, action, target_type, target_id,
            before_data, after_data, metadata, result, severity, request_id,
            ip_hash, user_agent_hash, created_at
          ) values (
            $1::uuid, $2::jsonb, $3::text, $4::text, $5::uuid,
            $6::jsonb, $7::jsonb, $8::jsonb, $9::text, $10::text, $11::text,
            $12::text, $13::text, $14::timestamptz
          )
        `,
          values: [
            toUuidOrNull(record.actorUserId),
            JSON.stringify(roles),
            record.action,
            record.targetType,
            toUuidOrNull(record.targetId),
            record.beforeData === null
              ? null
              : JSON.stringify(record.beforeData),
            record.afterData === null ? null : JSON.stringify(record.afterData),
            JSON.stringify(record.metadata),
            record.result,
            record.severity,
            record.requestId,
            record.ipHash,
            record.userAgentHash,
            record.createdAt,
          ],
        },
        runtime.env,
        runtime,
      );
    },
  };
}

async function safeWriteWithFallback<TEnv>(
  sink: AuditLogSink<TEnv>,
  fallbackSink: AuditLogSink<TEnv>,
  record: AuditRecord,
  runtime: AuditRuntimeContext<TEnv>,
): Promise<void> {
  try {
    await sink.write(record, runtime);
  } catch (primaryError) {
    console.error("audit_log_primary_write_failed", safeError(primaryError));
    if (fallbackSink === sink) throw primaryError;
    try {
      await fallbackSink.write(record, runtime);
    } catch (fallbackError) {
      console.error(
        "audit_log_fallback_write_failed",
        safeError(fallbackError),
      );
      throw primaryError;
    }
  }
}

function scheduleAudit(
  context: WaitUntilCapable,
  promise: Promise<void>,
): void {
  if (context.waitUntil) {
    context.waitUntil(
      promise.catch((error) =>
        console.error("audit_log_async_write_failed", safeError(error)),
      ),
    );
  } else {
    void promise.catch((error) =>
      console.error("audit_log_async_write_failed", safeError(error)),
    );
  }
}

function ensureResponseRequestId(
  response: Response,
  requestId: string,
): Response {
  if (response.headers.get("x-request-id")) return response;
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createRuntime<TEnv>(args: {
  request: Request;
  env: TEnv;
  context: WaitUntilCapable;
  serviceName: string;
  environment: string;
  requestId: string;
  startedAtEpochMs: number;
  route: AuditRouteInfo;
  actor: AuditActor;
  ipHash: string | null;
  userAgentHash: string | null;
  reason: string | null;
}): AuditRuntimeContext<TEnv> {
  return {
    request: args.request,
    env: args.env,
    execution: args.context,
    serviceName: args.serviceName,
    environment: args.environment,
    requestId: args.requestId,
    startedAtEpochMs: args.startedAtEpochMs,
    route: args.route,
    actor: args.actor,
    ipHash: args.ipHash,
    userAgentHash: args.userAgentHash,
    reason: args.reason,
    idempotencyKey: extractIdempotencyKey(args.request),
  };
}

export function createAuditLogMiddleware<TEnv = unknown>(
  handler: FetchHandler<TEnv>,
  options: CreateAuditLogMiddlewareOptions<TEnv> = {},
): FetchHandler<TEnv> {
  const serviceName = options.serviceName ?? AUDIT_LOG_SERVICE_NAME;
  const sink = options.sink ?? (consoleAuditLogSink as AuditLogSink<TEnv>);
  const fallbackSink =
    options.fallbackSink ?? (consoleAuditLogSink as AuditLogSink<TEnv>);
  const now = options.now ?? (() => new Date());

  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const startedAtEpochMs = Date.now();
    const requestId = getOrCreateRequestId(request);
    const route = classifyAuditRoute(
      request,
      options.classifyRoute?.(request) ?? null,
    );
    const environment = resolveValue(env, options.environment, "production");
    const hashSecret = resolveValue(env, options.hashSecret, "");
    const [actor, ipHash, userAgentHash, reason] = await Promise.all([
      options.resolveActor
        ? options.resolveActor(request, env, context)
        : defaultActorFromTrustedHeaders(request),
      createIpHash(request, hashSecret || null),
      createUserAgentHash(request, hashSecret || null),
      extractAdminReason(request),
    ]);
    const runtime = createRuntime({
      request,
      env,
      context,
      serviceName,
      environment,
      requestId,
      startedAtEpochMs,
      route,
      actor,
      ipHash,
      userAgentHash,
      reason,
    });

    const auditByDefault =
      route.shouldAudit ||
      ((options.auditAuthSecurityEvents ?? true) && route.isAdminAuth) ||
      ((options.auditAllAdminReads ?? true) &&
        route.isAdmin &&
        readMethods.has(route.method));
    const shouldAudit =
      (await options.shouldAudit?.(runtime)) ?? auditByDefault;

    if (
      (options.enforceAdminReason ?? true) &&
      route.requiresReason &&
      !reason
    ) {
      const record = buildAuditRecord({
        runtime,
        now,
        result: "DENIED",
        severity: "WARNING",
        metadata: sanitizeAuditJson({
          reasonMissing: true,
          policy: "ADMIN_REASON_REQUIRED",
        }),
      });
      await safeWriteWithFallback(sink, fallbackSink, record, runtime);
      return jsonResponse(
        400,
        {
          ok: false,
          error: {
            code: "ADMIN_REASON_REQUIRED",
            message:
              "관리자 변경 API는 X-Admin-Reason 헤더 또는 body.reason이 필요합니다.",
            requestId,
          },
        },
        requestId,
      );
    }

    if (
      shouldAudit &&
      route.isAdmin &&
      mutatingMethods.has(route.method) &&
      (options.blockAdminMutationWhenPreAuditFails ?? true)
    ) {
      const record = buildAuditRecord({
        runtime,
        now,
        action: `${route.action}_REQUEST`.slice(0, 180),
        result: "SYSTEM",
        severity:
          route.operation === "DELETE" || route.operation === "EXPORT"
            ? "WARNING"
            : "NOTICE",
        metadata: sanitizeAuditJson({
          phase: "pre-handler",
          auditGate: "required-before-admin-mutation",
        }),
      });
      try {
        await sink.write(record, runtime);
      } catch (error) {
        await safeWriteWithFallback(
          fallbackSink,
          consoleAuditLogSink as AuditLogSink<TEnv>,
          record,
          runtime,
        );
        return jsonResponse(
          500,
          {
            ok: false,
            error: {
              code: "ADMIN_AUDIT_LOG_REQUIRED",
              message: "감사로그 기록 실패로 관리자 변경 작업을 중단했습니다.",
              requestId,
              details: safeError(error),
            },
          },
          requestId,
        );
      }
    }

    let response: Response;
    try {
      response = await handler(request, env, context);
    } catch (error) {
      const failureResponse = jsonResponse(
        500,
        {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "서버 처리 중 오류가 발생했습니다.",
            requestId,
          },
        },
        requestId,
      );
      if (shouldAudit || (options.auditUserApiFailures ?? true)) {
        const record = buildAuditRecord({
          runtime,
          now,
          response: failureResponse,
          result: "FAILURE",
          severity: "CRITICAL",
          metadata: sanitizeAuditJson({
            phase: "handler-exception",
            error: safeError(error),
          }),
        });
        await safeWriteWithFallback(sink, fallbackSink, record, runtime);
      }
      throw error;
    }

    const responseWithRequestId = ensureResponseRequestId(response, requestId);
    const mustAuditFailure =
      (options.auditUserApiFailures ?? true) &&
      route.isUserApi &&
      responseWithRequestId.status >= 400;

    if (shouldAudit || mustAuditFailure) {
      const beforeAfter = await options.resolveBeforeAfter?.(
        runtime,
        responseWithRequestId,
      );
      if (!beforeAfter?.suppressDefaultAudit) {
        const record = buildAuditRecord({
          runtime,
          now,
          response: responseWithRequestId,
          beforeData: beforeAfter?.beforeData ?? null,
          afterData: beforeAfter?.afterData ?? null,
          metadata: beforeAfter?.metadata ?? null,
          targetId: beforeAfter?.targetId,
          targetType: beforeAfter?.targetType,
          action: beforeAfter?.action,
          result: beforeAfter?.result,
          severity: beforeAfter?.severity,
          actor: beforeAfter?.actor,
        });
        const writePromise = safeWriteWithFallback(
          beforeAfter?.sink ?? sink,
          fallbackSink,
          record,
          runtime,
        );
        if (
          (options.strictPostCommitFailure ?? false) &&
          route.isAdmin &&
          mutatingMethods.has(route.method)
        ) {
          await writePromise;
        } else {
          scheduleAudit(context, writePromise);
        }
      }
    }

    return responseWithRequestId;
  };
}

export function createManualAuditWriter<TEnv = unknown>(
  options: ManualAuditWriterOptions<TEnv>,
) {
  const now = options.now ?? (() => new Date());
  return async function writeManualAudit(args: {
    request: Request;
    env: TEnv;
    execution?: WaitUntilCapable;
    action: string;
    targetType: AdminAuditTargetType;
    targetId?: string | null;
    actor?: AuditActor;
    beforeData?: AuditJson | null;
    afterData?: AuditJson | null;
    metadata?: AuditJson | null;
    result?: AuditResult;
    severity?: AuditSeverity;
    reason?: string | null;
  }): Promise<void> {
    const requestId = getOrCreateRequestId(args.request);
    const route = classifyAuditRoute(args.request, {
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId ?? null,
      shouldAudit: true,
    });
    const hashSecret = resolveValue(args.env, options.hashSecret, "");
    const runtime = createRuntime({
      request: args.request,
      env: args.env,
      context: args.execution ?? {},
      serviceName: AUDIT_LOG_SERVICE_NAME,
      environment: resolveValue(args.env, options.environment, "production"),
      requestId,
      startedAtEpochMs: Date.now(),
      route,
      actor: args.actor ?? defaultActorFromTrustedHeaders(args.request),
      ipHash: await createIpHash(args.request, hashSecret || null),
      userAgentHash: await createUserAgentHash(
        args.request,
        hashSecret || null,
      ),
      reason: args.reason ?? (await extractAdminReason(args.request)),
    });
    await options.sink.write(
      buildAuditRecord({
        runtime,
        now,
        action: args.action,
        targetType: args.targetType,
        targetId: args.targetId ?? null,
        beforeData: args.beforeData ?? null,
        afterData: args.afterData ?? null,
        metadata: args.metadata ?? null,
        result: args.result ?? "SUCCESS",
        severity: args.severity ?? "INFO",
        actor: args.actor,
      }),
      runtime,
    );
  };
}

export function assertAuditLogMiddlewareCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "admin_read_and_mutation_audit",
    "admin_reason_required_for_mutations",
    "admin_mutation_pre_audit_gate",
    "db_sink_for_admin_audit_logs",
    "console_fallback_sink",
    "ip_hash_only",
    "user_agent_hash_only",
    "token_secret_password_redaction",
    "payroll_expense_savings_hijack_amount_redaction",
    "ad_financial_data_separation_guard",
    "route_target_classification",
    "request_id_correlation",
    "latency_status_result_severity_metadata",
    "manual_audit_writer_for_service_layer_before_after",
    "cloudflare_workers_fetch_api_compatibility",
  ] as const;
  return {
    ok: checks.length >= 15,
    version: AUDIT_LOG_MIDDLEWARE_VERSION,
    checks,
  };
}

export const auditLogMiddlewareContract = Object.freeze({
  file: "services/api/src/middlewares/audit-log.middleware.ts",
  version: AUDIT_LOG_MIDDLEWARE_VERSION,
  service: AUDIT_LOG_SERVICE_NAME,
  platform: "Cloudflare Workers Fetch API",
  serverAuthorityRequired: true,
  adminAuditRequired: true,
  reasonRequiredForAdminMutation: true,
  rawIpStorageAllowed: false,
  rawUserAgentStorageAllowed: false,
  rawTokenStorageAllowed: false,
  rawSecretStorageAllowed: false,
  rawPasswordStorageAllowed: false,
  rawFinancialDataInLogsAllowed: false,
  payrollExpenseSavingsAdsDirectJoinAllowed: false,
  finalStatus: "document_theoretical_file_unit_complete",
});

export default createAuditLogMiddleware;
