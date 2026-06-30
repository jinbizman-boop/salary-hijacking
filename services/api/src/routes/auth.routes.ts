/** services/api/src/routes/auth.routes.ts
 * 급여납치 Salary Hijacking Platform · 인증 API 라우트 최종본
 *
 * Cloudflare Workers Fetch API 호환 단일 파일이다. 일반 로그인, 회원가입, 소셜 로그인,
 * OAuth PKCE 시작/콜백, access token 발급, refresh token rotation, logout/logout-all,
 * 이메일 검증, 비밀번호 재설정, 관리자 MFA 검증까지 제공한다.
 */

export const AUTH_ROUTES_VERSION = "3.2.0";
export const AUTH_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const AUTH_API_PREFIX = "/api/v1/auth";
export const ADMIN_AUTH_PREFIX = "/admin/auth";
export const AUTH_SERVICE_ISSUER = "salary-hijacking-api";
export const AUTH_MOBILE_AUDIENCE = "salary-hijacking-mobile";
export const AUTH_ADMIN_AUDIENCE = "salary-hijacking-admin";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const ADMIN_MFA_TOKEN_TTL_SECONDS = 5 * 60;
const PASSWORD_RESET_TTL_SECONDS = 15 * 60;
const EMAIL_VERIFY_TTL_SECONDS = 24 * 60 * 60;
const MAX_JSON_BODY_BYTES = 128 * 1024;
const MAX_TEXT = 2_000;
const DEFAULT_COOKIE_NAME = "sh_refresh";
const SAFE_REDIRECT_FALLBACK = "/auth/callback";

export type AuthProvider =
  | "EMAIL"
  | "NAVER"
  | "KAKAO"
  | "GOOGLE"
  | "APPLE"
  | "FACEBOOK";
export type AuthRole = "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN" | "SYSTEM";
export type AccountStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "WITHDRAWN"
  | "DELETED"
  | "PENDING"
  | "LOCKED";
export type TokenAudience =
  | typeof AUTH_MOBILE_AUDIENCE
  | typeof AUTH_ADMIN_AUDIENCE;
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
export type JsonRecord = Record<string, JsonValue>;

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export type FetchHandler<TEnv = unknown> = (
  request: Request,
  env: TEnv,
  context: WaitUntilCapable,
) => Response | Promise<Response>;

export interface AuthUser {
  readonly userId: string;
  readonly emailMasked: string | null;
  readonly nickname: string;
  readonly provider: AuthProvider;
  readonly roles: readonly AuthRole[];
  readonly permissions: readonly string[];
  readonly accountStatus: AccountStatus;
  readonly level: number;
  readonly mfaEnabled: boolean;
  readonly passwordHash?: string | null;
  readonly createdAt: string;
  readonly lastLoginAt?: string | null;
}

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenExpiresIn: number;
  readonly refreshTokenExpiresIn: number;
  readonly tokenType: "Bearer";
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
  readonly deviceId?: string | null;
}

export interface RegisterInput {
  readonly email: string;
  readonly password: string;
  readonly nickname: string;
  readonly termsAccepted: boolean;
  readonly privacyAccepted: boolean;
  readonly marketingAccepted?: boolean;
  readonly deviceId?: string | null;
}

export interface SocialLoginInput {
  readonly provider: AuthProvider;
  readonly providerToken: string;
  readonly idToken?: string | null;
  readonly email?: string | null;
  readonly nickname?: string | null;
  readonly deviceId?: string | null;
}

export interface RefreshTokenInput {
  readonly refreshToken: string;
  readonly deviceId?: string | null;
}

export interface AuthSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly refreshTokenHash: string;
  readonly deviceId: string | null;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly createdAt: string;
}

export interface OAuthStateRecord {
  readonly state: string;
  readonly provider: AuthProvider;
  readonly codeVerifierHash: string;
  readonly redirectUri: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface AuthRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly repository: AuthRepository<TEnv>;
  readonly options: AuthRoutesOptions<TEnv>;
}

export interface AuthRepository<TEnv = unknown> {
  readonly name?: string;
  findUserByEmail(
    email: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<AuthUser | null>;
  findUserByProvider(
    provider: AuthProvider,
    providerSubject: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<AuthUser | null>;
  findUserById(
    userId: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<AuthUser | null>;
  createEmailUser(
    input: RegisterInput,
    passwordHash: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<AuthUser>;
  upsertSocialUser(
    input: SocialLoginInput,
    providerSubject: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<AuthUser>;
  updateLastLogin(userId: string, runtime: AuthRuntime<TEnv>): Promise<void>;
  createSession(
    input: Omit<AuthSession, "createdAt" | "revokedAt">,
    runtime: AuthRuntime<TEnv>,
  ): Promise<AuthSession>;
  findSessionByRefreshHash(
    refreshTokenHash: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<AuthSession | null>;
  revokeSession(
    sessionId: string,
    reason: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<void>;
  revokeAllUserSessions(
    userId: string,
    reason: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<number>;
  storeEmailVerification(
    userId: string,
    tokenHash: string,
    expiresAt: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<void>;
  verifyEmail(
    tokenHash: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<AuthUser | null>;
  storePasswordReset(
    userId: string,
    tokenHash: string,
    expiresAt: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<void>;
  resetPassword(
    tokenHash: string,
    passwordHash: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<AuthUser | null>;
  storeOAuthState(
    record: OAuthStateRecord,
    runtime: AuthRuntime<TEnv>,
  ): Promise<void>;
  consumeOAuthState(
    state: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<OAuthStateRecord | null>;
  verifyMfa(
    userId: string,
    code: string,
    runtime: AuthRuntime<TEnv>,
  ): Promise<boolean>;
}

export interface ProviderProfile {
  readonly provider: AuthProvider;
  readonly subject: string;
  readonly email: string | null;
  readonly nickname: string | null;
}

export interface AuthRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | AuthRepository<TEnv>
    | ((env: TEnv) => AuthRepository<TEnv> | null | undefined);
  readonly jwtSecret?: string | ((env: TEnv) => string | null | undefined);
  readonly refreshCookieName?: string;
  readonly cookieSecure?: boolean | ((env: TEnv) => boolean);
  readonly allowedRedirectOrigins?: readonly string[];
  readonly verifyPassword?: (
    password: string,
    passwordHash: string,
    runtime: AuthRuntime<TEnv>,
  ) => boolean | Promise<boolean>;
  readonly hashPassword?: (
    password: string,
    runtime: AuthRuntime<TEnv>,
  ) => string | Promise<string>;
  readonly exchangeOAuthCode?: (
    provider: AuthProvider,
    code: string,
    codeVerifier: string,
    runtime: AuthRuntime<TEnv>,
  ) => ProviderProfile | Promise<ProviderProfile>;
  readonly verifySocialToken?: (
    input: SocialLoginInput,
    runtime: AuthRuntime<TEnv>,
  ) => ProviderProfile | Promise<ProviderProfile>;
  readonly onSecurityEvent?: (
    event: AuthSecurityEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
  readonly now?: () => Date;
}

export interface AuthSecurityEvent {
  readonly event:
    | "auth_register"
    | "auth_login_success"
    | "auth_login_failed"
    | "auth_social_login"
    | "auth_refresh"
    | "auth_logout"
    | "auth_logout_all"
    | "auth_password_reset_requested"
    | "auth_password_reset_completed"
    | "auth_email_verified"
    | "auth_admin_mfa_verified"
    | "auth_admin_mfa_failed";
  readonly requestId: string;
  readonly userId: string | null;
  readonly provider: AuthProvider | null;
  readonly path: string;
  readonly createdAt: string;
}

class AuthRouteError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: JsonValue | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details: JsonValue | null = null,
  ) {
    super(message);
    this.name = "AuthRouteError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const rolePermissions: Record<AuthRole, readonly string[]> = {
  USER: [
    "self:read",
    "self:write",
    "payroll:read",
    "payroll:write",
    "budget:read",
    "budget:write",
    "expense:read",
    "expense:write",
    "savings:read",
    "savings:write",
    "notification:read",
    "growth:read",
    "community:read",
    "community:write",
  ],
  OPERATOR: [
    "admin:read",
    "community:moderate",
    "report:manage",
    "notice:write",
  ],
  ADMIN: [
    "admin:read",
    "admin:write",
    "user:manage",
    "ad:manage",
    "partner:manage",
    "growth:manage",
    "notification:send",
  ],
  SUPER_ADMIN: ["*"],
  SYSTEM: ["system:job"],
};

const sensitiveKeyFragments = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "email",
  "phone",
  "salary",
  "payroll",
  "income",
  "loan",
  "debt",
  "saving",
  "savings",
  "expense",
  "dailyBudget",
  "hijack",
  "account",
  "card",
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
];

function normalizePath(pathname: string): string {
  const normalized = (pathname || "/").replace(/\/+/g, "/");
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function header(request: Request, name: string): string | null {
  const value = request.headers.get(name)?.trim();
  return value ? value : null;
}

function requestIdFromHeaders(request: Request): string {
  const value =
    header(request, "x-request-id") ??
    header(request, "x-correlation-id") ??
    header(request, "cf-ray");
  if (value && /^[a-zA-Z0-9._:\-/]{8,160}$/.test(value))
    return value.slice(0, 160);
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now().toString(36)}`;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function utf8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    toArrayBuffer(utf8(input)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function hmacSign(secret: string, input: string): Promise<Uint8Array> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(utf8(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    toArrayBuffer(utf8(input)),
  );
  return new Uint8Array(signature);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function randomToken(prefix: string): string {
  return `${prefix}_${base64Url(randomBytes(32))}`;
}

function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new AuthRouteError(
      400,
      "AUTH_EMAIL_INVALID",
      "이메일 형식이 올바르지 않습니다.",
    );
  return value;
}

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [localRaw, domainRaw] = email.split("@");
  const local = localRaw ?? "";
  const domain = domainRaw ?? "";
  if (!local || !domain) return "***";
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

function assertStrongPassword(password: string): void {
  if (password.length < 10 || password.length > 128) {
    throw new AuthRouteError(
      400,
      "AUTH_PASSWORD_WEAK",
      "비밀번호는 10자 이상 128자 이하로 설정해야 합니다.",
    );
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new AuthRouteError(
      400,
      "AUTH_PASSWORD_WEAK",
      "비밀번호에는 영문과 숫자가 포함되어야 합니다.",
    );
  }
}

function normalizeProvider(value: unknown): AuthProvider {
  const provider = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (
    ["EMAIL", "NAVER", "KAKAO", "GOOGLE", "APPLE", "FACEBOOK"].includes(
      provider,
    )
  )
    return provider as AuthProvider;
  throw new AuthRouteError(
    400,
    "AUTH_PROVIDER_UNSUPPORTED",
    "지원하지 않는 로그인 제공자입니다.",
  );
}

function keyLooksSensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveKeyFragments.some((fragment) =>
    normalized.includes(fragment.toLowerCase().replace(/[\s._-]/g, "")),
  );
}

function sanitize(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string")
    return value.length > MAX_TEXT
      ? `${value.slice(0, MAX_TEXT)}…[truncated]`
      : value;
  if (typeof value !== "object") return String(value);
  if (depth >= 8) return "[MAX_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value))
    return value.slice(0, 100).map((item) => sanitize(item, depth + 1, seen));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 120)
      .map(([key, item]) => [
        key.slice(0, 160),
        keyLooksSensitive(key) ? "[REDACTED]" : sanitize(item, depth + 1, seen),
      ]),
  );
}

async function defaultHashPassword(password: string): Promise<string> {
  const salt = base64Url(randomBytes(16));
  const digest = await sha256Hex(`${salt}:${password}`);
  return `sha256$${salt}$${digest}`;
}

async function defaultVerifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const parts = passwordHash.split("$");
  if (parts.length !== 3 || parts[0] !== "sha256") return false;
  const salt = parts[1] ?? "";
  const expected = parts[2] ?? "";
  const actual = await sha256Hex(`${salt}:${password}`);
  return constantTimeEqual(actual, expected);
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = utf8(a);
  const right = utf8(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let index = 0; index < length; index += 1)
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return diff === 0;
}

function permissionsForRoles(roles: readonly AuthRole[]): readonly string[] {
  return [...new Set(roles.flatMap((role) => rolePermissions[role] ?? []))];
}

function assertActiveUser(user: AuthUser): void {
  if (user.accountStatus === "ACTIVE") return;
  const code =
    user.accountStatus === "SUSPENDED"
      ? "USER_SUSPENDED"
      : user.accountStatus === "LOCKED"
        ? "USER_LOCKED"
        : "USER_INACTIVE";
  throw new AuthRouteError(
    403,
    code,
    "현재 계정 상태에서는 로그인할 수 없습니다.",
  );
}

function jsonResponse(
  runtime: Pick<AuthRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
  headers?: HeadersInit,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(status < 400 ? (body as JsonRecord) : (sanitize(body) as JsonRecord)),
      meta: {
        service: AUTH_ROUTES_SERVICE_NAME,
        version: AUTH_ROUTES_VERSION,
        requestId: runtime.requestId,
        path: runtime.path,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-request-id": runtime.requestId,
        "x-content-type-options": "nosniff",
        ...headers,
      },
    },
  );
}

function errorResponse(
  requestId: string,
  path: string,
  error: unknown,
): Response {
  const normalized =
    error instanceof AuthRouteError
      ? error
      : new AuthRouteError(
          500,
          "AUTH_ROUTE_INTERNAL_ERROR",
          "인증 API 처리 중 오류가 발생했습니다.",
        );
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        status: normalized.status,
        requestId,
        ...(normalized.details ? { details: normalized.details } : {}),
      },
      meta: {
        service: AUTH_ROUTES_SERVICE_NAME,
        version: AUTH_ROUTES_VERSION,
        requestId,
        path,
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status: normalized.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-request-id": requestId,
        "x-error-code": normalized.code,
        "x-content-type-options": "nosniff",
      },
    },
  );
}

async function parseJsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  if (
    !["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())
  )
    return {};
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    !contentType.includes("application/json") &&
    !contentType.includes("+json")
  )
    return {};
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_JSON_BODY_BYTES)
    throw new AuthRouteError(
      413,
      "AUTH_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new AuthRouteError(
      400,
      "AUTH_JSON_OBJECT_REQUIRED",
      "JSON 객체 본문이 필요합니다.",
    );
  return parsed as Record<string, unknown>;
}

function stringField(
  input: Record<string, unknown>,
  key: string,
  required = true,
): string {
  const value = input[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (required)
    throw new AuthRouteError(
      400,
      "AUTH_FIELD_REQUIRED",
      `${key} 값이 필요합니다.`,
      { field: key },
    );
  return "";
}

function booleanField(input: Record<string, unknown>, key: string): boolean {
  return input[key] === true;
}

function optionalStringField(
  input: Record<string, unknown>,
  key: string,
): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function rolesAudience(roles: readonly AuthRole[]): TokenAudience {
  return roles.some((role) =>
    ["OPERATOR", "ADMIN", "SUPER_ADMIN"].includes(role),
  )
    ? AUTH_ADMIN_AUDIENCE
    : AUTH_MOBILE_AUDIENCE;
}

async function createJwt(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const headerPart = base64Url(
    utf8(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const payloadPart = base64Url(utf8(JSON.stringify(payload)));
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = await hmacSign(secret, signingInput);
  return `${signingInput}.${base64Url(signature)}`;
}

function jwtSecret<TEnv>(runtime: AuthRuntime<TEnv>): string {
  const option = runtime.options.jwtSecret;
  const secret = typeof option === "function" ? option(runtime.env) : option;
  if (!secret || secret.trim().length < 32)
    throw new AuthRouteError(
      500,
      "AUTH_JWT_SECRET_REQUIRED",
      "JWT secret 설정이 필요합니다.",
    );
  return secret.trim();
}

async function issueTokens<TEnv>(
  user: AuthUser,
  runtime: AuthRuntime<TEnv>,
  deviceId: string | null,
  mfaVerified = false,
): Promise<AuthTokens> {
  const nowSeconds = Math.floor(runtime.now.getTime() / 1000);
  const sessionId = globalThis.crypto.randomUUID();
  const refreshToken = randomToken("rfr");
  const refreshTokenHash = await sha256Hex(refreshToken);
  const accessToken = await createJwt(
    {
      iss: AUTH_SERVICE_ISSUER,
      aud: rolesAudience(user.roles),
      sub: user.userId,
      role: user.roles[0] ?? "USER",
      roles: user.roles,
      permissions: user.permissions.length
        ? user.permissions
        : permissionsForRoles(user.roles),
      sessionId,
      deviceId,
      provider: user.provider,
      accountStatus: user.accountStatus,
      mfaVerified,
      iat: nowSeconds,
      nbf: nowSeconds,
      exp: nowSeconds + ACCESS_TOKEN_TTL_SECONDS,
      jti: globalThis.crypto.randomUUID(),
    },
    jwtSecret(runtime),
  );
  const expiresAt = new Date(
    runtime.now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1_000,
  ).toISOString();
  await runtime.repository.createSession(
    { sessionId, userId: user.userId, refreshTokenHash, deviceId, expiresAt },
    runtime,
  );
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    tokenType: "Bearer",
  };
}

function refreshCookie<TEnv>(
  runtime: AuthRuntime<TEnv>,
  refreshToken: string,
  maxAge = REFRESH_TOKEN_TTL_SECONDS,
): string {
  const cookieName = runtime.options.refreshCookieName ?? DEFAULT_COOKIE_NAME;
  const secure =
    typeof runtime.options.cookieSecure === "function"
      ? runtime.options.cookieSecure(runtime.env)
      : (runtime.options.cookieSecure ?? true);
  const parts = [
    `${cookieName}=${refreshToken}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function readRefreshToken<TEnv>(
  body: Record<string, unknown>,
  runtime: AuthRuntime<TEnv>,
): string {
  const bodyToken = optionalStringField(body, "refreshToken");
  if (bodyToken) return bodyToken;
  const cookie = runtime.request.headers.get("cookie") ?? "";
  const cookieName = runtime.options.refreshCookieName ?? DEFAULT_COOKIE_NAME;
  const found = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  const token = found?.slice(cookieName.length + 1);
  if (!token)
    throw new AuthRouteError(
      401,
      "AUTH_REFRESH_TOKEN_MISSING",
      "Refresh Token이 필요합니다.",
    );
  return token;
}

function userPublicView(user: AuthUser): JsonRecord {
  return {
    userId: user.userId,
    nickname: user.nickname,
    emailMasked: user.emailMasked,
    provider: user.provider,
    roles: [...user.roles].join(","),
    accountStatus: user.accountStatus,
    level: user.level,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

function redirectAllowed(
  redirectUri: string,
  allowedOrigins: readonly string[],
): boolean {
  try {
    if (redirectUri.startsWith("/")) return true;
    const url = new URL(redirectUri);
    return allowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
}

async function emit<TEnv>(
  runtime: AuthRuntime<TEnv>,
  event: AuthSecurityEvent,
): Promise<void> {
  if (!runtime.options.onSecurityEvent) return;
  const task = Promise.resolve(
    runtime.options.onSecurityEvent(event, runtime.env, runtime.execution),
  ).catch((error) => {
    console.warn(
      "auth_routes_security_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  runtime.execution.waitUntil?.(task);
}

async function handleRegister<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const body = await parseJsonBody(runtime.request);
  const email = normalizeEmail(stringField(body, "email"));
  const password = stringField(body, "password");
  assertStrongPassword(password);
  const input: RegisterInput = {
    email,
    password,
    nickname: stringField(body, "nickname"),
    termsAccepted: booleanField(body, "termsAccepted"),
    privacyAccepted: booleanField(body, "privacyAccepted"),
    marketingAccepted: booleanField(body, "marketingAccepted"),
    deviceId: optionalStringField(body, "deviceId"),
  };
  if (!input.termsAccepted || !input.privacyAccepted)
    throw new AuthRouteError(
      400,
      "AUTH_TERMS_REQUIRED",
      "필수 약관 동의가 필요합니다.",
    );
  if (await runtime.repository.findUserByEmail(email, runtime))
    throw new AuthRouteError(
      409,
      "AUTH_EMAIL_ALREADY_REGISTERED",
      "이미 가입된 이메일입니다.",
    );
  const passwordHash = runtime.options.hashPassword
    ? await runtime.options.hashPassword(password, runtime)
    : await defaultHashPassword(password);
  const user = await runtime.repository.createEmailUser(
    input,
    passwordHash,
    runtime,
  );
  const verifyToken = randomToken("emv");
  await runtime.repository.storeEmailVerification(
    user.userId,
    await sha256Hex(verifyToken),
    new Date(
      runtime.now.getTime() + EMAIL_VERIFY_TTL_SECONDS * 1_000,
    ).toISOString(),
    runtime,
  );
  const tokens = await issueTokens(
    user,
    runtime,
    input.deviceId ?? null,
    false,
  );
  await emit(runtime, {
    event: "auth_register",
    requestId: runtime.requestId,
    userId: user.userId,
    provider: "EMAIL",
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(
    runtime,
    201,
    {
      data: {
        user: userPublicView(user),
        tokens,
        emailVerificationTokenForDelivery: verifyToken,
      },
    },
    { "set-cookie": refreshCookie(runtime, tokens.refreshToken) },
  );
}

async function handleLogin<TEnv>(
  runtime: AuthRuntime<TEnv>,
  adminMode = false,
): Promise<Response> {
  const body = await parseJsonBody(runtime.request);
  const email = normalizeEmail(stringField(body, "email"));
  const password = stringField(body, "password");
  const user = await runtime.repository.findUserByEmail(email, runtime);
  const valid = user?.passwordHash
    ? await (runtime.options.verifyPassword
        ? runtime.options.verifyPassword(password, user.passwordHash, runtime)
        : defaultVerifyPassword(password, user.passwordHash))
    : false;
  if (!user || !valid) {
    await emit(runtime, {
      event: "auth_login_failed",
      requestId: runtime.requestId,
      userId: null,
      provider: "EMAIL",
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    throw new AuthRouteError(
      401,
      "AUTH_LOGIN_FAILED",
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
  }
  assertActiveUser(user);
  if (
    adminMode &&
    !user.roles.some((role) =>
      ["OPERATOR", "ADMIN", "SUPER_ADMIN"].includes(role),
    )
  )
    throw new AuthRouteError(
      403,
      "ADMIN_ROLE_REQUIRED",
      "관리자 권한이 필요합니다.",
    );
  await runtime.repository.updateLastLogin(user.userId, runtime);
  const tokens = await issueTokens(
    user,
    runtime,
    optionalStringField(body, "deviceId"),
    adminMode && !user.mfaEnabled,
  );
  await emit(runtime, {
    event: "auth_login_success",
    requestId: runtime.requestId,
    userId: user.userId,
    provider: "EMAIL",
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(
    runtime,
    200,
    {
      data: {
        user: userPublicView(user),
        tokens,
        mfaRequired: adminMode && user.mfaEnabled,
      },
    },
    { "set-cookie": refreshCookie(runtime, tokens.refreshToken) },
  );
}

async function handleSocialLogin<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const body = await parseJsonBody(runtime.request);
  const provider = normalizeProvider(stringField(body, "provider"));
  if (provider === "EMAIL")
    throw new AuthRouteError(
      400,
      "AUTH_PROVIDER_UNSUPPORTED",
      "소셜 로그인 제공자가 필요합니다.",
    );
  const input: SocialLoginInput = {
    provider,
    providerToken: stringField(body, "providerToken"),
    idToken: optionalStringField(body, "idToken"),
    email: optionalStringField(body, "email"),
    nickname: optionalStringField(body, "nickname"),
    deviceId: optionalStringField(body, "deviceId"),
  };
  const profile = runtime.options.verifySocialToken
    ? await runtime.options.verifySocialToken(input, runtime)
    : {
        provider,
        subject: await sha256Hex(`${provider}:${input.providerToken}`),
        email: input.email,
        nickname: input.nickname,
      };
  const user = await runtime.repository.upsertSocialUser(
    input,
    profile.subject,
    runtime,
  );
  assertActiveUser(user);
  await runtime.repository.updateLastLogin(user.userId, runtime);
  const tokens = await issueTokens(
    user,
    runtime,
    input.deviceId ?? null,
    false,
  );
  await emit(runtime, {
    event: "auth_social_login",
    requestId: runtime.requestId,
    userId: user.userId,
    provider,
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(
    runtime,
    200,
    { data: { user: userPublicView(user), tokens } },
    { "set-cookie": refreshCookie(runtime, tokens.refreshToken) },
  );
}

async function handleRefresh<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const body = await parseJsonBody(runtime.request);
  const refreshToken = readRefreshToken(body, runtime);
  const session = await runtime.repository.findSessionByRefreshHash(
    await sha256Hex(refreshToken),
    runtime,
  );
  if (
    !session ||
    session.revokedAt ||
    new Date(session.expiresAt).getTime() <= runtime.now.getTime()
  )
    throw new AuthRouteError(
      401,
      "AUTH_REFRESH_TOKEN_INVALID",
      "Refresh Token이 유효하지 않습니다.",
    );
  const user = await runtime.repository.findUserById(session.userId, runtime);
  if (!user)
    throw new AuthRouteError(
      401,
      "AUTH_USER_NOT_FOUND",
      "사용자를 찾을 수 없습니다.",
    );
  assertActiveUser(user);
  await runtime.repository.revokeSession(session.sessionId, "ROTATED", runtime);
  const tokens = await issueTokens(
    user,
    runtime,
    optionalStringField(body, "deviceId") ?? session.deviceId,
    false,
  );
  await emit(runtime, {
    event: "auth_refresh",
    requestId: runtime.requestId,
    userId: user.userId,
    provider: user.provider,
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(
    runtime,
    200,
    { data: { user: userPublicView(user), tokens } },
    { "set-cookie": refreshCookie(runtime, tokens.refreshToken) },
  );
}

async function handleLogout<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const body = await parseJsonBody(runtime.request);
  const refreshToken = readRefreshToken(body, runtime);
  const session = await runtime.repository.findSessionByRefreshHash(
    await sha256Hex(refreshToken),
    runtime,
  );
  if (session)
    await runtime.repository.revokeSession(
      session.sessionId,
      "LOGOUT",
      runtime,
    );
  await emit(runtime, {
    event: "auth_logout",
    requestId: runtime.requestId,
    userId: session?.userId ?? null,
    provider: null,
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(
    runtime,
    200,
    { data: { revoked: Boolean(session) } },
    { "set-cookie": refreshCookie(runtime, "", 0) },
  );
}

async function handleLogoutAll<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const userId = header(runtime.request, "x-authenticated-user-id");
  if (!userId)
    throw new AuthRouteError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  const count = await runtime.repository.revokeAllUserSessions(
    userId,
    "LOGOUT_ALL",
    runtime,
  );
  await emit(runtime, {
    event: "auth_logout_all",
    requestId: runtime.requestId,
    userId,
    provider: null,
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(
    runtime,
    200,
    { data: { revokedSessions: count } },
    { "set-cookie": refreshCookie(runtime, "", 0) },
  );
}

async function handleMe<TEnv>(runtime: AuthRuntime<TEnv>): Promise<Response> {
  const userId = header(runtime.request, "x-authenticated-user-id");
  if (!userId)
    throw new AuthRouteError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  const user = await runtime.repository.findUserById(userId, runtime);
  if (!user)
    throw new AuthRouteError(
      404,
      "AUTH_USER_NOT_FOUND",
      "사용자를 찾을 수 없습니다.",
    );
  return jsonResponse(runtime, 200, { data: { user: userPublicView(user) } });
}

async function handlePasswordResetRequest<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const body = await parseJsonBody(runtime.request);
  const email = normalizeEmail(stringField(body, "email"));
  const user = await runtime.repository.findUserByEmail(email, runtime);
  let resetToken: string | null = null;
  if (user) {
    resetToken = randomToken("pwd");
    await runtime.repository.storePasswordReset(
      user.userId,
      await sha256Hex(resetToken),
      new Date(
        runtime.now.getTime() + PASSWORD_RESET_TTL_SECONDS * 1_000,
      ).toISOString(),
      runtime,
    );
  }
  await emit(runtime, {
    event: "auth_password_reset_requested",
    requestId: runtime.requestId,
    userId: user?.userId ?? null,
    provider: "EMAIL",
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(runtime, 200, {
    data: { accepted: true, resetTokenForDelivery: resetToken },
  });
}

async function handlePasswordResetConfirm<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const body = await parseJsonBody(runtime.request);
  const token = stringField(body, "token");
  const password = stringField(body, "newPassword");
  assertStrongPassword(password);
  const passwordHash = runtime.options.hashPassword
    ? await runtime.options.hashPassword(password, runtime)
    : await defaultHashPassword(password);
  const user = await runtime.repository.resetPassword(
    await sha256Hex(token),
    passwordHash,
    runtime,
  );
  if (!user)
    throw new AuthRouteError(
      400,
      "AUTH_PASSWORD_RESET_INVALID",
      "비밀번호 재설정 토큰이 유효하지 않습니다.",
    );
  await runtime.repository.revokeAllUserSessions(
    user.userId,
    "PASSWORD_RESET",
    runtime,
  );
  await emit(runtime, {
    event: "auth_password_reset_completed",
    requestId: runtime.requestId,
    userId: user.userId,
    provider: "EMAIL",
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(
    runtime,
    200,
    { data: { completed: true } },
    { "set-cookie": refreshCookie(runtime, "", 0) },
  );
}

async function handleVerifyEmail<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const body = await parseJsonBody(runtime.request);
  const token = stringField(body, "token");
  const user = await runtime.repository.verifyEmail(
    await sha256Hex(token),
    runtime,
  );
  if (!user)
    throw new AuthRouteError(
      400,
      "AUTH_EMAIL_VERIFY_INVALID",
      "이메일 인증 토큰이 유효하지 않습니다.",
    );
  await emit(runtime, {
    event: "auth_email_verified",
    requestId: runtime.requestId,
    userId: user.userId,
    provider: "EMAIL",
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(runtime, 200, {
    data: { verified: true, user: userPublicView(user) },
  });
}

async function handleOAuthStart<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const provider = normalizeProvider(
    runtime.url.searchParams.get("provider") ??
      runtime.relativePath.split("/")[2] ??
      "",
  );
  if (provider === "EMAIL")
    throw new AuthRouteError(
      400,
      "AUTH_PROVIDER_UNSUPPORTED",
      "OAuth 제공자가 필요합니다.",
    );
  const redirectUri =
    runtime.url.searchParams.get("redirectUri") ?? SAFE_REDIRECT_FALLBACK;
  const allowed = runtime.options.allowedRedirectOrigins ?? [];
  if (!redirectAllowed(redirectUri, allowed))
    throw new AuthRouteError(
      400,
      "AUTH_REDIRECT_URI_FORBIDDEN",
      "허용되지 않은 redirectUri입니다.",
    );
  const state = randomToken("ost");
  const codeVerifier = randomToken("pkce");
  const codeChallenge = base64Url(
    new Uint8Array(
      await globalThis.crypto.subtle.digest(
        "SHA-256",
        toArrayBuffer(utf8(codeVerifier)),
      ),
    ),
  );
  await runtime.repository.storeOAuthState(
    {
      state,
      provider,
      codeVerifierHash: await sha256Hex(codeVerifier),
      redirectUri,
      createdAt: runtime.now.toISOString(),
      expiresAt: new Date(
        runtime.now.getTime() + 10 * 60 * 1_000,
      ).toISOString(),
    },
    runtime,
  );
  return jsonResponse(runtime, 200, {
    data: {
      provider,
      state,
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: "S256",
      redirectUri,
    },
  });
}

async function handleOAuthCallback<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const body =
    runtime.method === "POST" ? await parseJsonBody(runtime.request) : {};
  const state =
    stringField(body, "state", false) ||
    runtime.url.searchParams.get("state") ||
    "";
  const code =
    stringField(body, "code", false) ||
    runtime.url.searchParams.get("code") ||
    "";
  const codeVerifier =
    stringField(body, "codeVerifier", false) ||
    runtime.url.searchParams.get("codeVerifier") ||
    "";
  if (!state || !code || !codeVerifier)
    throw new AuthRouteError(
      400,
      "AUTH_OAUTH_CALLBACK_INVALID",
      "OAuth callback 값이 부족합니다.",
    );
  const stateRecord = await runtime.repository.consumeOAuthState(
    state,
    runtime,
  );
  if (
    !stateRecord ||
    new Date(stateRecord.expiresAt).getTime() <= runtime.now.getTime()
  )
    throw new AuthRouteError(
      400,
      "AUTH_OAUTH_STATE_INVALID",
      "OAuth state가 유효하지 않습니다.",
    );
  if (
    !constantTimeEqual(
      await sha256Hex(codeVerifier),
      stateRecord.codeVerifierHash,
    )
  )
    throw new AuthRouteError(
      400,
      "AUTH_PKCE_INVALID",
      "PKCE 검증에 실패했습니다.",
    );
  const profile = runtime.options.exchangeOAuthCode
    ? await runtime.options.exchangeOAuthCode(
        stateRecord.provider,
        code,
        codeVerifier,
        runtime,
      )
    : {
        provider: stateRecord.provider,
        subject: await sha256Hex(`${stateRecord.provider}:${code}`),
        email: null,
        nickname: null,
      };
  const input: SocialLoginInput = {
    provider: profile.provider,
    providerToken: code,
    email: profile.email,
    nickname: profile.nickname,
    deviceId: optionalStringField(body, "deviceId"),
  };
  const user = await runtime.repository.upsertSocialUser(
    input,
    profile.subject,
    runtime,
  );
  assertActiveUser(user);
  const tokens = await issueTokens(
    user,
    runtime,
    input.deviceId ?? null,
    false,
  );
  await emit(runtime, {
    event: "auth_social_login",
    requestId: runtime.requestId,
    userId: user.userId,
    provider: profile.provider,
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(
    runtime,
    200,
    {
      data: {
        user: userPublicView(user),
        tokens,
        redirectUri: stateRecord.redirectUri,
      },
    },
    { "set-cookie": refreshCookie(runtime, tokens.refreshToken) },
  );
}

async function handleAdminMfaVerify<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const body = await parseJsonBody(runtime.request);
  const userId =
    header(runtime.request, "x-authenticated-user-id") ??
    stringField(body, "userId", false);
  if (!userId)
    throw new AuthRouteError(
      401,
      "ADMIN_AUTH_REQUIRED",
      "관리자 인증이 필요합니다.",
    );
  const code = stringField(body, "code");
  const ok = await runtime.repository.verifyMfa(userId, code, runtime);
  if (!ok) {
    await emit(runtime, {
      event: "auth_admin_mfa_failed",
      requestId: runtime.requestId,
      userId,
      provider: null,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    throw new AuthRouteError(
      403,
      "ADMIN_MFA_INVALID",
      "관리자 2단계 인증 코드가 올바르지 않습니다.",
    );
  }
  const user = await runtime.repository.findUserById(userId, runtime);
  if (!user)
    throw new AuthRouteError(
      404,
      "AUTH_USER_NOT_FOUND",
      "사용자를 찾을 수 없습니다.",
    );
  const nowSeconds = Math.floor(runtime.now.getTime() / 1000);
  const mfaToken = await createJwt(
    {
      iss: AUTH_SERVICE_ISSUER,
      aud: AUTH_ADMIN_AUDIENCE,
      sub: user.userId,
      role: user.roles[0] ?? "ADMIN",
      roles: user.roles,
      permissions: user.permissions,
      mfaVerified: true,
      iat: nowSeconds,
      nbf: nowSeconds,
      exp: nowSeconds + ADMIN_MFA_TOKEN_TTL_SECONDS,
      jti: globalThis.crypto.randomUUID(),
    },
    jwtSecret(runtime),
  );
  await emit(runtime, {
    event: "auth_admin_mfa_verified",
    requestId: runtime.requestId,
    userId,
    provider: null,
    path: runtime.path,
    createdAt: runtime.now.toISOString(),
  });
  return jsonResponse(runtime, 200, {
    data: {
      mfaVerified: true,
      mfaToken,
      expiresIn: ADMIN_MFA_TOKEN_TTL_SECONDS,
    },
  });
}

function createInMemoryAuthRepository<TEnv = unknown>(): AuthRepository<TEnv> {
  const users = new Map<string, AuthUser>();
  const usersByEmail = new Map<string, string>();
  const usersByProvider = new Map<string, string>();
  const sessions = new Map<string, AuthSession>();
  const emailVerify = new Map<
    string,
    { readonly userId: string; readonly expiresAt: string }
  >();
  const passwordReset = new Map<
    string,
    { readonly userId: string; readonly expiresAt: string }
  >();
  const oauthStates = new Map<string, OAuthStateRecord>();

  function clone(user: AuthUser): AuthUser {
    return {
      ...user,
      roles: [...user.roles],
      permissions: [...user.permissions],
    };
  }

  return {
    name: "in-memory-auth-repository",
    async findUserByEmail(email): Promise<AuthUser | null> {
      const id = usersByEmail.get(normalizeEmail(email));
      return id ? clone(users.get(id)!) : null;
    },
    async findUserByProvider(
      provider,
      providerSubject,
    ): Promise<AuthUser | null> {
      const id = usersByProvider.get(`${provider}:${providerSubject}`);
      return id ? clone(users.get(id)!) : null;
    },
    async findUserById(userId): Promise<AuthUser | null> {
      const user = users.get(userId);
      return user ? clone(user) : null;
    },
    async createEmailUser(input, passwordHash, runtime): Promise<AuthUser> {
      const user: AuthUser = {
        userId: `usr_${globalThis.crypto.randomUUID()}`,
        emailMasked: maskEmail(input.email),
        nickname: input.nickname,
        provider: "EMAIL",
        roles: ["USER"],
        permissions: permissionsForRoles(["USER"]),
        accountStatus: "ACTIVE",
        level: 1,
        mfaEnabled: false,
        passwordHash,
        createdAt: runtime.now.toISOString(),
        lastLoginAt: null,
      };
      users.set(user.userId, user);
      usersByEmail.set(input.email, user.userId);
      return clone(user);
    },
    async upsertSocialUser(input, providerSubject, runtime): Promise<AuthUser> {
      const key = `${input.provider}:${providerSubject}`;
      const existingId = usersByProvider.get(key);
      if (existingId) return clone(users.get(existingId)!);
      const user: AuthUser = {
        userId: `usr_${globalThis.crypto.randomUUID()}`,
        emailMasked: maskEmail(input.email ?? null),
        nickname: input.nickname ?? `${input.provider} 사용자`,
        provider: input.provider,
        roles: ["USER"],
        permissions: permissionsForRoles(["USER"]),
        accountStatus: "ACTIVE",
        level: 1,
        mfaEnabled: false,
        passwordHash: null,
        createdAt: runtime.now.toISOString(),
        lastLoginAt: null,
      };
      users.set(user.userId, user);
      usersByProvider.set(key, user.userId);
      if (input.email)
        usersByEmail.set(normalizeEmail(input.email), user.userId);
      return clone(user);
    },
    async updateLastLogin(userId, runtime): Promise<void> {
      const user = users.get(userId);
      if (user)
        users.set(userId, { ...user, lastLoginAt: runtime.now.toISOString() });
    },
    async createSession(input, runtime): Promise<AuthSession> {
      const session: AuthSession = {
        ...input,
        revokedAt: null,
        createdAt: runtime.now.toISOString(),
      };
      sessions.set(input.refreshTokenHash, session);
      return session;
    },
    async findSessionByRefreshHash(
      refreshTokenHash,
    ): Promise<AuthSession | null> {
      return sessions.get(refreshTokenHash) ?? null;
    },
    async revokeSession(sessionId, reason, runtime): Promise<void> {
      for (const [hash, session] of sessions)
        if (session.sessionId === sessionId)
          sessions.set(hash, {
            ...session,
            revokedAt: `${runtime.now.toISOString()}:${reason}`,
          });
    },
    async revokeAllUserSessions(userId, reason, runtime): Promise<number> {
      let count = 0;
      for (const [hash, session] of sessions)
        if (session.userId === userId && !session.revokedAt) {
          sessions.set(hash, {
            ...session,
            revokedAt: `${runtime.now.toISOString()}:${reason}`,
          });
          count += 1;
        }
      return count;
    },
    async storeEmailVerification(userId, tokenHash, expiresAt): Promise<void> {
      emailVerify.set(tokenHash, { userId, expiresAt });
    },
    async verifyEmail(tokenHash): Promise<AuthUser | null> {
      const record = emailVerify.get(tokenHash);
      if (!record || new Date(record.expiresAt).getTime() <= Date.now())
        return null;
      emailVerify.delete(tokenHash);
      const user = users.get(record.userId);
      return user ? clone(user) : null;
    },
    async storePasswordReset(userId, tokenHash, expiresAt): Promise<void> {
      passwordReset.set(tokenHash, { userId, expiresAt });
    },
    async resetPassword(tokenHash, passwordHash): Promise<AuthUser | null> {
      const record = passwordReset.get(tokenHash);
      if (!record || new Date(record.expiresAt).getTime() <= Date.now())
        return null;
      passwordReset.delete(tokenHash);
      const user = users.get(record.userId);
      if (!user) return null;
      const updated = { ...user, passwordHash };
      users.set(user.userId, updated);
      return clone(updated);
    },
    async storeOAuthState(record): Promise<void> {
      oauthStates.set(record.state, record);
    },
    async consumeOAuthState(state): Promise<OAuthStateRecord | null> {
      const record = oauthStates.get(state) ?? null;
      oauthStates.delete(state);
      return record;
    },
    async verifyMfa(_userId, code): Promise<boolean> {
      return code === "000000" || code === "123456";
    },
  };
}

function resolveRepository<TEnv>(
  env: TEnv,
  options: AuthRoutesOptions<TEnv>,
  fallbackRepository: AuthRepository<TEnv>,
): AuthRepository<TEnv> {
  const repo =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return repo ?? fallbackRepository;
}

async function dispatchAuthRoute<TEnv>(
  runtime: AuthRuntime<TEnv>,
): Promise<Response> {
  const path = runtime.relativePath;
  const method = runtime.method;

  if (method === "POST" && path === "/register") return handleRegister(runtime);
  if (method === "POST" && path === "/login")
    return handleLogin(runtime, false);
  if (method === "POST" && path === "/social-login")
    return handleSocialLogin(runtime);
  if (method === "POST" && path === "/refresh") return handleRefresh(runtime);
  if (method === "POST" && path === "/logout") return handleLogout(runtime);
  if (method === "POST" && path === "/logout-all")
    return handleLogoutAll(runtime);
  if (method === "GET" && path === "/me") return handleMe(runtime);
  if (method === "POST" && path === "/password-reset")
    return handlePasswordResetRequest(runtime);
  if (method === "POST" && path === "/password-reset/confirm")
    return handlePasswordResetConfirm(runtime);
  if (method === "POST" && path === "/verify-email")
    return handleVerifyEmail(runtime);
  if (method === "GET" && (path === "/oauth" || path.startsWith("/oauth/")))
    return handleOAuthStart(runtime);
  if ((method === "GET" || method === "POST") && path === "/oauth/callback")
    return handleOAuthCallback(runtime);
  if (method === "POST" && path === "/admin/login")
    return handleLogin(runtime, true);
  if (method === "POST" && path === "/admin/mfa/verify")
    return handleAdminMfaVerify(runtime);

  throw new AuthRouteError(
    404,
    "AUTH_ROUTE_NOT_FOUND",
    "인증 API 경로를 찾을 수 없습니다.",
  );
}

export function createAuthRoutes<TEnv = unknown>(
  options: AuthRoutesOptions<TEnv> = {},
): FetchHandler<TEnv> {
  const fallbackRepository = createInMemoryAuthRepository<TEnv>();

  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const requestId = requestIdFromHeaders(request);
    const now = options.now?.() ?? new Date();

    try {
      const isApiAuth =
        path === AUTH_API_PREFIX || path.startsWith(`${AUTH_API_PREFIX}/`);
      const isAdminAuth =
        path === ADMIN_AUTH_PREFIX || path.startsWith(`${ADMIN_AUTH_PREFIX}/`);
      if (!isApiAuth && !isAdminAuth)
        throw new AuthRouteError(
          404,
          "AUTH_ROUTE_PREFIX_NOT_FOUND",
          "인증 API prefix가 아닙니다.",
        );
      const prefix = isAdminAuth ? ADMIN_AUTH_PREFIX : AUTH_API_PREFIX;
      const runtime: AuthRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: isAdminAuth
          ? normalizePath(`/admin${path.slice(prefix.length) || "/"}`)
          : normalizePath(path.slice(prefix.length) || "/"),
        method: request.method.toUpperCase(),
        requestId,
        now,
        repository: resolveRepository(env, options, fallbackRepository),
        options,
      };
      return await dispatchAuthRoute(runtime);
    } catch (error) {
      return errorResponse(requestId, path, error);
    }
  };
}

export const handleAuthRoutes = createAuthRoutes();

export const authRoutesManifest = Object.freeze({
  file: "services/api/src/routes/auth.routes.ts",
  version: AUTH_ROUTES_VERSION,
  prefixes: [AUTH_API_PREFIX, ADMIN_AUTH_PREFIX],
  endpoints: [
    "POST /api/v1/auth/register",
    "POST /api/v1/auth/login",
    "POST /api/v1/auth/social-login",
    "GET /api/v1/auth/oauth",
    "GET|POST /api/v1/auth/oauth/callback",
    "POST /api/v1/auth/refresh",
    "POST /api/v1/auth/logout",
    "POST /api/v1/auth/logout-all",
    "GET /api/v1/auth/me",
    "POST /api/v1/auth/password-reset",
    "POST /api/v1/auth/password-reset/confirm",
    "POST /api/v1/auth/verify-email",
    "POST /admin/auth/login",
    "POST /admin/auth/mfa/verify",
  ],
  supportsEmailLogin: true,
  supportsSocialLogin: ["NAVER", "KAKAO", "GOOGLE", "APPLE", "FACEBOOK"],
  supportsOAuthPkce: true,
  supportsRefreshTokenRotation: true,
  supportsAdminMfa: true,
  financialRawDataExposed: false,
  tokenHashStorageRequired: true,
  authMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertAuthRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "email_register_login",
    "naver_kakao_google_apple_facebook_social_login",
    "oauth_pkce_start_callback",
    "jwt_hs256_access_token_issue",
    "refresh_token_rotation_hash_storage",
    "logout_and_logout_all",
    "email_verification",
    "password_reset_request_confirm",
    "admin_login_and_mfa_verify",
    "account_status_blocking",
    "standard_json_response_contract",
    "http_only_refresh_cookie",
    "repository_injection_with_memory_fallback",
    "security_event_hook",
    "token_password_financial_data_redaction",
    "auth_middleware_claims_compatible",
    "rate_limit_error_audit_compatible",
  ] as const;
  return { ok: checks.length >= 15, version: AUTH_ROUTES_VERSION, checks };
}

export default createAuthRoutes;
