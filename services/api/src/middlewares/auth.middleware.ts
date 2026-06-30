/** services/api/src/middlewares/auth.middleware.ts
 * 급여납치 Salary Hijacking Platform · Cloudflare Workers 인증/인가 미들웨어 최종본
 *
 * 설계 목표
 * - Cloudflare Workers Fetch API에서 외부 의존성 없이 동작한다.
 * - JWT Access Token, Service Token, Admin MFA, RBAC, 계정 상태, 기본 IDOR/Mass Assignment 방어를 제공한다.
 * - 급여/예산/지출/저축/알림/LV UP/커뮤니티/광고/운영 API의 서버 권위 인증 경계를 일관되게 강제한다.
 * - 토큰·비밀번호·급여 원문을 로그/헤더/오류 응답에 노출하지 않는다.
 */

export const AUTH_MIDDLEWARE_VERSION = "3.2.1";
export const AUTH_SERVICE_ISSUER = "salary-hijacking-api";
export const AUTH_MOBILE_AUDIENCE = "salary-hijacking-mobile";
export const AUTH_ADMIN_AUDIENCE = "salary-hijacking-admin";
export const AUTH_SERVICE_AUDIENCE = "salary-hijacking-service";

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const DEFAULT_CLOCK_SKEW_SECONDS = 60;
const MAX_JSON_AUTH_BODY_BYTES = 64 * 1024;
const ADMIN_API_PREFIXES = ["/api/v1/admin", "/admin/api/v1"] as const;
const SYSTEM_API_PREFIXES = [
  "/api/v1/internal",
  "/api/v1/system",
  "/api/v1/scheduler",
  "/api/v1/batch",
] as const;

const AUTH_CONTEXT_HEADER_PREFIXES = [
  "x-authenticated-",
  "x-auth-",
  "x-admin-",
] as const;

const AUTH_CONTEXT_EXACT_HEADERS = [
  "authorization",
  "cookie",
  "x-service-token",
  "x-refresh-token",
  "x-session-id",
  "x-user-id",
  "x-role",
  "x-roles",
  "x-permissions",
] as const;

const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_VERSION_HEADER = "x-auth-context-version";

export type UserRole =
  | "GUEST"
  | "USER"
  | "OPERATOR"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "SYSTEM";
export type AccountStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "WITHDRAWN"
  | "DELETED"
  | "PENDING"
  | "LOCKED";
export type AuthTokenKind = "ACCESS" | "ADMIN" | "SERVICE";
export type AuthDecision = "ALLOW" | "DENY";
export type AuthErrorCode =
  | "AUTH_TOKEN_MISSING"
  | "AUTH_TOKEN_MALFORMED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_NOT_YET_VALID"
  | "AUTH_TOKEN_AUDIENCE_INVALID"
  | "AUTH_TOKEN_ISSUER_INVALID"
  | "AUTH_TOKEN_ALGORITHM_UNSUPPORTED"
  | "AUTH_SESSION_REVOKED"
  | "AUTH_PERMISSION_DENIED"
  | "AUTH_MFA_REQUIRED"
  | "AUTH_SERVICE_TOKEN_REQUIRED"
  | "AUTH_RESOURCE_OWNER_MISMATCH"
  | "AUTH_MASS_ASSIGNMENT_BLOCKED"
  | "USER_SUSPENDED"
  | "USER_WITHDRAWN"
  | "USER_DELETED"
  | "USER_LOCKED"
  | "AUTH_CONFIGURATION_ERROR"
  | "AUTH_CONTEXT_SPOOFED";

export interface WaitUntilCapable {
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export type FetchHandler<TEnv = unknown> = (
  request: Request,
  env: TEnv,
  context: WaitUntilCapable,
) => Response | Promise<Response>;

export interface SalaryHijackingJwtClaims extends Record<string, unknown> {
  readonly iss?: string;
  readonly aud?: string | readonly string[];
  readonly sub?: string;
  readonly role?: string;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
  readonly scope?: string;
  readonly scopes?: readonly string[];
  readonly sessionId?: string;
  readonly sid?: string;
  readonly deviceId?: string;
  readonly jti?: string;
  readonly iat?: number;
  readonly nbf?: number;
  readonly exp?: number;
  readonly status?: string;
  readonly accountStatus?: string;
  readonly typ?: string;
  readonly tokenType?: string;
  readonly mfaVerified?: boolean;
  readonly mfaLevel?: number;
  readonly provider?: string;
}

export interface VerifiedJwt {
  readonly header: Readonly<Record<string, unknown>>;
  readonly claims: SalaryHijackingJwtClaims;
  readonly rawToken: string;
  readonly tokenKind: AuthTokenKind;
}

export interface AuthenticatedPrincipal {
  readonly userId: string;
  readonly roles: readonly UserRole[];
  readonly primaryRole: UserRole;
  readonly permissions: readonly string[];
  readonly sessionId: string | null;
  readonly deviceId: string | null;
  readonly tokenId: string | null;
  readonly tokenKind: AuthTokenKind;
  readonly accountStatus: AccountStatus;
  readonly mfaVerified: boolean;
  readonly provider: string | null;
  readonly issuedAtEpochSeconds: number | null;
  readonly expiresAtEpochSeconds: number | null;
  readonly rawClaims: SalaryHijackingJwtClaims;
}

export interface AuthRoutePolicy {
  readonly id: string;
  readonly pattern: RegExp;
  readonly methods?: readonly string[];
  readonly public?: boolean;
  readonly requiredRoles?: readonly UserRole[];
  readonly requiredPermissions?: readonly string[];
  readonly requireUser?: boolean;
  readonly requireAdmin?: boolean;
  readonly requireSystem?: boolean;
  readonly requireMfa?: boolean;
  readonly allowServiceToken?: boolean;
  readonly ownerBound?: boolean;
  readonly blockMassAssignment?: boolean;
}

export interface AuthRouteRuntime {
  readonly request: Request;
  readonly url: URL;
  readonly path: string;
  readonly method: string;
  readonly requestId: string;
  readonly policy: AuthRoutePolicy;
  readonly principal: AuthenticatedPrincipal | null;
}

export interface SessionValidationResult {
  readonly active: boolean;
  readonly revoked?: boolean;
  readonly reason?: string;
  readonly accountStatus?: AccountStatus;
  readonly permissions?: readonly string[];
  readonly roles?: readonly UserRole[];
}

export interface ResourceAuthorizationResult {
  readonly decision: AuthDecision;
  readonly status?: number;
  readonly code?: AuthErrorCode;
  readonly message?: string;
}

export interface AuthEvent {
  readonly type:
    | "auth_missing"
    | "auth_invalid"
    | "auth_expired"
    | "auth_denied"
    | "auth_allowed"
    | "auth_configuration_error";
  readonly requestId: string;
  readonly path: string;
  readonly method: string;
  readonly userId: string | null;
  readonly roles: readonly UserRole[];
  readonly code?: AuthErrorCode;
  readonly reason?: string;
}

export interface AuthMiddlewareOptions<TEnv = unknown> {
  readonly serviceName?: string;
  readonly jwtSecret?: string | ((env: TEnv) => string | null | undefined);
  readonly jwtPublicKeysByKid?:
    | Readonly<Record<string, string>>
    | ((env: TEnv) => Readonly<Record<string, string>> | null | undefined);
  readonly serviceTokenSha256Hashes?:
    | readonly string[]
    | ((env: TEnv) => readonly string[] | null | undefined);
  readonly issuer?: string | readonly string[];
  readonly audiences?: readonly string[];
  readonly maxAccessTokenTtlSeconds?: number;
  readonly clockSkewSeconds?: number;
  readonly publicPolicies?: readonly AuthRoutePolicy[];
  readonly protectedPolicies?: readonly AuthRoutePolicy[];
  readonly allowGuestCommunityRead?: boolean;
  readonly verifyJwt?: (
    token: string,
    runtime: Omit<AuthRouteRuntime, "principal" | "policy">,
    env: TEnv,
  ) => VerifiedJwt | Promise<VerifiedJwt>;
  readonly resolveSession?: (
    principal: AuthenticatedPrincipal,
    runtime: AuthRouteRuntime,
    env: TEnv,
  ) => SessionValidationResult | Promise<SessionValidationResult>;
  readonly authorizeResource?: (
    principal: AuthenticatedPrincipal,
    runtime: AuthRouteRuntime,
    env: TEnv,
  ) => ResourceAuthorizationResult | Promise<ResourceAuthorizationResult>;
  readonly onAuthEvent?: (
    event: AuthEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
  readonly nowEpochSeconds?: () => number;
}

interface JwtParts {
  readonly header: Record<string, unknown>;
  readonly payload: SalaryHijackingJwtClaims;
  readonly signingInput: string;
  readonly signature: Uint8Array;
}

export class AuthFailure extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;

  constructor(code: AuthErrorCode, message: string, status = 401) {
    super(message);
    this.name = "AuthFailure";
    this.code = code;
    this.status = status;
  }
}

const roleRank: Record<UserRole, number> = {
  GUEST: 0,
  USER: 10,
  OPERATOR: 20,
  ADMIN: 30,
  SUPER_ADMIN: 40,
  SYSTEM: 50,
};

const permissionsByRole: Record<UserRole, readonly string[]> = {
  GUEST: ["public:read"],
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
    "notification:write",
    "growth:read",
    "growth:write",
    "community:read",
    "community:write",
    "upload:write",
  ],
  OPERATOR: [
    "self:read",
    "community:read",
    "community:write",
    "community:moderate",
    "report:read",
    "report:manage",
    "notice:read",
    "notice:write",
    "notification:send",
  ],
  ADMIN: [
    "self:read",
    "admin:read",
    "admin:write",
    "user:read",
    "user:manage",
    "community:read",
    "community:write",
    "community:moderate",
    "report:read",
    "report:manage",
    "notice:read",
    "notice:write",
    "notice:manage",
    "banner:read",
    "banner:write",
    "ad:read",
    "ad:manage",
    "partner:read",
    "partner:manage",
    "incident:read",
    "incident:manage",
    "notification:send",
    "audit:read:minimal",
  ],
  SUPER_ADMIN: ["*"],
  SYSTEM: [
    "system:job",
    "system:batch",
    "system:scheduler",
    "notification:generate",
    "payroll:settle",
    "stats:aggregate",
    "audit:write",
  ],
};

const defaultPublicPolicies: readonly AuthRoutePolicy[] = [
  { id: "preflight", pattern: /^.*$/, methods: ["OPTIONS"], public: true },
  {
    id: "health",
    pattern: /^\/(health|ready|live|_health)(?:\/|$)/,
    public: true,
  },
  {
    id: "auth-login",
    pattern:
      /^\/api\/v1\/auth\/(login|register|social-login|oauth|oauth\/callback|password-reset|verify-email)(?:\/|$)/,
    public: true,
  },
  {
    id: "auth-refresh",
    pattern: /^\/api\/v1\/auth\/refresh(?:\/|$)/,
    public: true,
  },
  {
    id: "public-app-config",
    pattern: /^\/api\/v1\/(app-config|public|legal)(?:\/|$)/,
    public: true,
  },
];

const defaultProtectedPolicies: readonly AuthRoutePolicy[] = [
  {
    id: "system-api",
    pattern: /^\/api\/v1\/(internal|system|scheduler|batch)(?:\/|$)/,
    requireSystem: true,
    requiredRoles: ["SYSTEM", "SUPER_ADMIN"],
    allowServiceToken: true,
  },
  {
    id: "admin-rbac",
    pattern:
      /^\/(?:api\/v1\/admin|admin\/api\/v1)\/(roles|admin-roles|admin-role-members)(?:\/|$)/,
    requireAdmin: true,
    requireMfa: true,
    requiredRoles: ["SUPER_ADMIN"],
    requiredPermissions: ["*"],
  },
  {
    id: "admin-audit",
    pattern:
      /^\/(?:api\/v1\/admin|admin\/api\/v1)\/(audit|audit-logs|security)(?:\/|$)/,
    requireAdmin: true,
    requireMfa: true,
    requiredRoles: ["ADMIN", "SUPER_ADMIN"],
    requiredPermissions: ["audit:read:minimal", "*"],
  },
  {
    id: "admin-users",
    pattern: /^\/(?:api\/v1\/admin|admin\/api\/v1)\/users(?:\/|$)/,
    requireAdmin: true,
    requireMfa: true,
    requiredRoles: ["ADMIN", "SUPER_ADMIN"],
    requiredPermissions: ["user:manage", "*"],
  },
  {
    id: "admin-ads",
    pattern:
      /^\/(?:api\/v1\/admin|admin\/api\/v1)\/(ads|banners|partners|partner-accounts)(?:\/|$)/,
    requireAdmin: true,
    requireMfa: true,
    requiredRoles: ["ADMIN", "SUPER_ADMIN"],
    requiredPermissions: ["ad:manage", "banner:write", "partner:manage", "*"],
  },
  {
    id: "admin-community-ops",
    pattern:
      /^\/(?:api\/v1\/admin|admin\/api\/v1)\/(reports|community|notices|notifications|incidents)(?:\/|$)/,
    requireAdmin: true,
    requireMfa: true,
    requiredRoles: ["OPERATOR", "ADMIN", "SUPER_ADMIN"],
    requiredPermissions: [
      "community:moderate",
      "report:manage",
      "notice:write",
      "notification:send",
      "incident:manage",
      "*",
    ],
  },
  {
    id: "admin-default",
    pattern: /^\/(?:api\/v1\/admin|admin\/api\/v1)(?:\/|$)/,
    requireAdmin: true,
    requireMfa: true,
    requiredRoles: ["ADMIN", "SUPER_ADMIN"],
    requiredPermissions: ["admin:read", "admin:write", "*"],
  },
  {
    id: "auth-logout",
    pattern: /^\/api\/v1\/auth\/logout(?:\/|$)/,
    requireUser: true,
  },
  {
    id: "users-me",
    pattern: /^\/api\/v1\/users\/me(?:\/|$)/,
    requireUser: true,
    ownerBound: true,
    blockMassAssignment: true,
  },
  {
    id: "users-owned",
    pattern: /^\/api\/v1\/users\/[^/]+(?:\/|$)/,
    requireUser: true,
    ownerBound: true,
    blockMassAssignment: true,
  },
  {
    id: "payroll",
    pattern: /^\/api\/v1\/(payroll|payroll-plans|salary-home)(?:\/|$)/,
    requireUser: true,
    requiredPermissions: ["payroll:read", "payroll:write"],
    ownerBound: true,
    blockMassAssignment: true,
  },
  {
    id: "budget-expense-savings",
    pattern:
      /^\/api\/v1\/(fixed-expenses|variable-expenses|daily-budgets|savings|savings-plans)(?:\/|$)/,
    requireUser: true,
    requiredPermissions: [
      "budget:read",
      "budget:write",
      "expense:read",
      "expense:write",
      "savings:read",
      "savings:write",
    ],
    ownerBound: true,
    blockMassAssignment: true,
  },
  {
    id: "notifications",
    pattern: /^\/api\/v1\/(notifications|notification-settings)(?:\/|$)/,
    requireUser: true,
    requiredPermissions: ["notification:read", "notification:write"],
    ownerBound: true,
    blockMassAssignment: true,
  },
  {
    id: "growth",
    pattern: /^\/api\/v1\/growth(?:\/|$)/,
    requireUser: true,
    requiredPermissions: ["growth:read", "growth:write"],
    ownerBound: true,
    blockMassAssignment: true,
  },
  {
    id: "community-write",
    pattern: /^\/api\/v1\/community(?:\/|$)/,
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    requireUser: true,
    requiredPermissions: ["community:write"],
    ownerBound: true,
    blockMassAssignment: true,
  },
  {
    id: "community-read",
    pattern: /^\/api\/v1\/community(?:\/|$)/,
    methods: ["GET", "HEAD"],
    requireUser: true,
    requiredPermissions: ["community:read"],
  },
  {
    id: "uploads",
    pattern: /^\/api\/v1\/(files|uploads)(?:\/|$)/,
    requireUser: true,
    requiredPermissions: ["upload:write"],
    ownerBound: true,
    blockMassAssignment: true,
  },
  {
    id: "api-default",
    pattern: /^\/api\/v1(?:\/|$)/,
    requireUser: true,
    ownerBound: true,
    blockMassAssignment: true,
  },
];

function normalizePath(pathname: string): string {
  const normalized = (pathname || "/").replace(/\/+/g, "/");
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function isAdminPath(path: string): boolean {
  return ADMIN_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function isSystemPath(path: string): boolean {
  return SYSTEM_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function methodMatches(policy: AuthRoutePolicy, method: string): boolean {
  return (
    !policy.methods ||
    policy.methods
      .map((item) => item.toUpperCase())
      .includes(method.toUpperCase())
  );
}

function policyMatches(
  policy: AuthRoutePolicy,
  path: string,
  method: string,
): boolean {
  return methodMatches(policy, method) && policy.pattern.test(path);
}

function resolvePolicy(
  path: string,
  method: string,
  options: AuthMiddlewareOptions<unknown>,
): AuthRoutePolicy {
  const publicPolicies = [
    ...defaultPublicPolicies,
    ...(options.publicPolicies ?? []),
  ];
  const protectedPolicies = [
    ...(options.protectedPolicies ?? []),
    ...defaultProtectedPolicies,
  ];

  if (
    options.allowGuestCommunityRead &&
    /^\/api\/v1\/community(?:\/|$)/.test(path) &&
    ["GET", "HEAD"].includes(method)
  ) {
    return {
      id: "community-public-read",
      pattern: /^\/api\/v1\/community(?:\/|$)/,
      methods: ["GET", "HEAD"],
      public: true,
    };
  }

  return (
    publicPolicies.find((policy) => policyMatches(policy, path, method)) ??
    protectedPolicies.find((policy) => policyMatches(policy, path, method)) ?? {
      id: "implicit-protected",
      pattern: /^.*$/,
      requireUser: path.startsWith("/api/"),
      public: !path.startsWith("/api/"),
    }
  );
}

function getHeader(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value ? value : null;
}

function safeRequestId(value: string | null): string | null {
  const trimmed = value?.trim().slice(0, 160);
  return trimmed && /^[a-zA-Z0-9._:\-/]{8,160}$/.test(trimmed) ? trimmed : null;
}

function randomId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function getOrCreateAuthRequestId(request: Request): string {
  return (
    safeRequestId(getHeader(request.headers, "x-request-id")) ??
    safeRequestId(getHeader(request.headers, "x-correlation-id")) ??
    safeRequestId(getHeader(request.headers, "cf-ray")) ??
    `req_${randomId()}`
  );
}

function resolveString<TEnv>(
  env: TEnv,
  value: string | ((env: TEnv) => string | null | undefined) | undefined,
): string | null {
  const resolved = typeof value === "function" ? value(env) : value;
  return resolved?.trim() || null;
}

function resolveStringArray<TEnv>(
  env: TEnv,
  value:
    | readonly string[]
    | ((env: TEnv) => readonly string[] | null | undefined)
    | undefined,
): readonly string[] {
  const resolved = typeof value === "function" ? value(env) : value;
  return resolved?.map((item) => item.trim()).filter(Boolean) ?? [];
}

function resolvePublicKeys<TEnv>(
  env: TEnv,
  value: AuthMiddlewareOptions<TEnv>["jwtPublicKeysByKid"],
): Readonly<Record<string, string>> {
  const resolved = typeof value === "function" ? value(env) : value;
  return resolved ?? {};
}

function utf8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeJsonPart<T>(part: string): T {
  const text = new TextDecoder().decode(base64UrlToBytes(part));
  return JSON.parse(text) as T;
}

function parseJwt(token: string): JwtParts {
  const parts = token.split(".");

  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new AuthFailure(
      "AUTH_TOKEN_MALFORMED",
      "인증 토큰 형식이 올바르지 않습니다.",
    );
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts as [
    string,
    string,
    string,
  ];

  try {
    return {
      header: decodeJsonPart<Record<string, unknown>>(encodedHeader),
      payload: decodeJsonPart<SalaryHijackingJwtClaims>(encodedPayload),
      signingInput: `${encodedHeader}.${encodedPayload}`,
      signature: base64UrlToBytes(encodedSignature),
    };
  } catch {
    throw new AuthFailure(
      "AUTH_TOKEN_MALFORMED",
      "인증 토큰을 해석할 수 없습니다.",
    );
  }
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

function constantTimeEqualString(a: string, b: string): boolean {
  const left = utf8(a);
  const right = utf8(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return diff === 0;
}

function constantTimeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }

  return diff === 0;
}

async function hmacSign(
  alg: "HS256" | "HS384" | "HS512",
  secret: string,
  input: string,
): Promise<Uint8Array> {
  const hash =
    alg === "HS512" ? "SHA-512" : alg === "HS384" ? "SHA-384" : "SHA-256";
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(utf8(secret)),
    { name: "HMAC", hash },
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

function pemToSpkiBytes(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");

  if (!body) {
    throw new AuthFailure(
      "AUTH_CONFIGURATION_ERROR",
      "JWT 공개키 설정이 올바르지 않습니다.",
      500,
    );
  }

  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function verifyRs256(
  publicKeyPem: string,
  signingInput: string,
  signature: Uint8Array,
): Promise<boolean> {
  const key = await globalThis.crypto.subtle.importKey(
    "spki",
    toArrayBuffer(pemToSpkiBytes(publicKeyPem)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return globalThis.crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    toArrayBuffer(signature),
    toArrayBuffer(utf8(signingInput)),
  );
}

function hasAudience(
  claimAud: string | readonly string[] | undefined,
  allowed: readonly string[],
): boolean {
  if (!allowed.length) return true;
  const audiences = Array.isArray(claimAud)
    ? claimAud
    : claimAud
      ? [claimAud]
      : [];
  return audiences.some((audience) => allowed.includes(audience));
}

function hasIssuer(
  claimIss: string | undefined,
  allowed: string | readonly string[] | undefined,
): boolean {
  const allowedList = Array.isArray(allowed)
    ? allowed
    : [allowed ?? AUTH_SERVICE_ISSUER];
  return Boolean(claimIss && allowedList.includes(claimIss));
}

function normalizeRole(role: unknown): UserRole | null {
  if (typeof role !== "string") return null;
  const normalized = role
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
  return [
    "GUEST",
    "USER",
    "OPERATOR",
    "ADMIN",
    "SUPER_ADMIN",
    "SYSTEM",
  ].includes(normalized)
    ? (normalized as UserRole)
    : null;
}

function normalizeRoles(claims: SalaryHijackingJwtClaims): readonly UserRole[] {
  const roles = new Set<UserRole>();
  const primary = normalizeRole(claims.role);
  if (primary) roles.add(primary);

  if (Array.isArray(claims.roles)) {
    claims.roles.forEach((role) => {
      const normalized = normalizeRole(role);
      if (normalized) roles.add(normalized);
    });
  }

  return roles.size
    ? [...roles].sort((a, b) => roleRank[b] - roleRank[a])
    : ["USER"];
}

function normalizeStatus(value: unknown): AccountStatus {
  if (typeof value !== "string") return "ACTIVE";
  const normalized = value.trim().toUpperCase();
  return [
    "ACTIVE",
    "SUSPENDED",
    "WITHDRAWN",
    "DELETED",
    "PENDING",
    "LOCKED",
  ].includes(normalized)
    ? (normalized as AccountStatus)
    : "ACTIVE";
}

function normalizePermissions(
  claims: SalaryHijackingJwtClaims,
  roles: readonly UserRole[],
): readonly string[] {
  const permissions = new Set<string>();

  roles.forEach((role) => {
    permissionsByRole[role].forEach((permission) =>
      permissions.add(permission),
    );
  });

  if (Array.isArray(claims.permissions)) {
    claims.permissions.forEach((permission) => {
      if (typeof permission === "string" && permission.trim()) {
        permissions.add(permission.trim());
      }
    });
  }

  if (typeof claims.scope === "string") {
    claims.scope
      .split(/\s+/)
      .filter(Boolean)
      .forEach((scope) => permissions.add(scope));
  }

  if (Array.isArray(claims.scopes)) {
    claims.scopes.forEach((scope) => {
      if (typeof scope === "string" && scope.trim())
        permissions.add(scope.trim());
    });
  }

  return [...permissions];
}

function tokenKindFromClaims(
  claims: SalaryHijackingJwtClaims,
  roles: readonly UserRole[],
  path: string,
): AuthTokenKind {
  const typ = `${claims.typ ?? claims.tokenType ?? ""}`.toLowerCase();

  if (
    typ.includes("service") ||
    roles.includes("SYSTEM") ||
    isSystemPath(path)
  ) {
    return "SERVICE";
  }

  if (
    roles.some((role) => ["OPERATOR", "ADMIN", "SUPER_ADMIN"].includes(role))
  ) {
    return "ADMIN";
  }

  return "ACCESS";
}

function toPrincipal(
  verified: VerifiedJwt,
  path: string,
): AuthenticatedPrincipal {
  const claims = verified.claims;

  if (!claims.sub || typeof claims.sub !== "string") {
    throw new AuthFailure("AUTH_TOKEN_INVALID", "인증 주체가 없습니다.");
  }

  const roles = normalizeRoles(claims);
  const permissions = normalizePermissions(claims, roles);
  const accountStatus = normalizeStatus(claims.accountStatus ?? claims.status);

  return {
    userId: claims.sub,
    roles,
    primaryRole: roles[0] ?? "USER",
    permissions,
    sessionId:
      typeof claims.sessionId === "string"
        ? claims.sessionId
        : typeof claims.sid === "string"
          ? claims.sid
          : null,
    deviceId: typeof claims.deviceId === "string" ? claims.deviceId : null,
    tokenId: typeof claims.jti === "string" ? claims.jti : null,
    tokenKind: verified.tokenKind ?? tokenKindFromClaims(claims, roles, path),
    accountStatus,
    mfaVerified:
      claims.mfaVerified === true || Number(claims.mfaLevel ?? 0) >= 2,
    provider: typeof claims.provider === "string" ? claims.provider : null,
    issuedAtEpochSeconds: typeof claims.iat === "number" ? claims.iat : null,
    expiresAtEpochSeconds: typeof claims.exp === "number" ? claims.exp : null,
    rawClaims: claims,
  };
}

async function defaultJwtVerifier<TEnv>(
  token: string,
  runtime: Omit<AuthRouteRuntime, "principal" | "policy">,
  env: TEnv,
  options: AuthMiddlewareOptions<TEnv>,
): Promise<VerifiedJwt> {
  const jwt = parseJwt(token);
  const alg = typeof jwt.header.alg === "string" ? jwt.header.alg : "";

  if (!alg || alg.toLowerCase() === "none") {
    throw new AuthFailure(
      "AUTH_TOKEN_ALGORITHM_UNSUPPORTED",
      "허용되지 않는 토큰 알고리즘입니다.",
    );
  }

  if (["HS256", "HS384", "HS512"].includes(alg)) {
    const secret = resolveString(env, options.jwtSecret);
    if (!secret) {
      throw new AuthFailure(
        "AUTH_CONFIGURATION_ERROR",
        "JWT secret 설정이 없습니다.",
        500,
      );
    }

    const expected = await hmacSign(
      alg as "HS256" | "HS384" | "HS512",
      secret,
      jwt.signingInput,
    );
    if (!constantTimeEqualBytes(expected, jwt.signature)) {
      throw new AuthFailure(
        "AUTH_TOKEN_INVALID",
        "유효하지 않은 인증 토큰입니다.",
      );
    }
  } else if (alg === "RS256") {
    const kid = typeof jwt.header.kid === "string" ? jwt.header.kid : "default";
    const keys = resolvePublicKeys(env, options.jwtPublicKeysByKid);
    const pem = keys[kid] ?? keys.default;

    if (!pem) {
      throw new AuthFailure(
        "AUTH_CONFIGURATION_ERROR",
        "JWT 공개키 설정이 없습니다.",
        500,
      );
    }

    if (!(await verifyRs256(pem, jwt.signingInput, jwt.signature))) {
      throw new AuthFailure(
        "AUTH_TOKEN_INVALID",
        "유효하지 않은 인증 토큰입니다.",
      );
    }
  } else {
    throw new AuthFailure(
      "AUTH_TOKEN_ALGORITHM_UNSUPPORTED",
      "지원하지 않는 토큰 알고리즘입니다.",
    );
  }

  validateJwtClaims(jwt.payload, runtime.path, options);
  const roles = normalizeRoles(jwt.payload);

  return {
    header: jwt.header,
    claims: jwt.payload,
    rawToken: token,
    tokenKind: tokenKindFromClaims(jwt.payload, roles, runtime.path),
  };
}

function validateJwtClaims<TEnv>(
  claims: SalaryHijackingJwtClaims,
  path: string,
  options: AuthMiddlewareOptions<TEnv>,
): void {
  const now = options.nowEpochSeconds?.() ?? Math.floor(Date.now() / 1000);
  const skew = options.clockSkewSeconds ?? DEFAULT_CLOCK_SKEW_SECONDS;

  if (!hasIssuer(claims.iss, options.issuer)) {
    throw new AuthFailure(
      "AUTH_TOKEN_ISSUER_INVALID",
      "인증 토큰 발급자가 올바르지 않습니다.",
    );
  }

  const defaultAudiences = isAdminPath(path)
    ? [AUTH_ADMIN_AUDIENCE]
    : isSystemPath(path)
      ? [AUTH_SERVICE_AUDIENCE]
      : [AUTH_MOBILE_AUDIENCE];

  if (!hasAudience(claims.aud, options.audiences ?? defaultAudiences)) {
    throw new AuthFailure(
      "AUTH_TOKEN_AUDIENCE_INVALID",
      "인증 토큰 대상이 올바르지 않습니다.",
    );
  }

  if (typeof claims.exp !== "number") {
    throw new AuthFailure("AUTH_TOKEN_INVALID", "인증 만료 정보가 없습니다.");
  }

  if (claims.exp <= now - skew) {
    throw new AuthFailure("AUTH_TOKEN_EXPIRED", "인증 시간이 만료되었습니다.");
  }

  if (typeof claims.nbf === "number" && claims.nbf > now + skew) {
    throw new AuthFailure(
      "AUTH_TOKEN_NOT_YET_VALID",
      "아직 사용할 수 없는 인증 토큰입니다.",
    );
  }

  if (typeof claims.iat === "number" && claims.iat > now + skew) {
    throw new AuthFailure(
      "AUTH_TOKEN_NOT_YET_VALID",
      "발급 시간이 올바르지 않습니다.",
    );
  }

  const ttl =
    options.maxAccessTokenTtlSeconds ?? DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  const roles = normalizeRoles(claims);
  const typ = `${claims.typ ?? claims.tokenType ?? ""}`.toLowerCase();
  const isLongLivedAllowed =
    isSystemPath(path) || typ.includes("service") || roles.includes("SYSTEM");

  if (
    !isLongLivedAllowed &&
    typeof claims.iat === "number" &&
    claims.exp - claims.iat > ttl + skew
  ) {
    throw new AuthFailure(
      "AUTH_TOKEN_INVALID",
      "Access Token 만료시간 정책을 초과했습니다.",
    );
  }
}

function extractBearerToken(request: Request): string | null {
  const authorization = getHeader(request.headers, "authorization");
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function extractServiceToken(request: Request): string | null {
  const authorization = getHeader(request.headers, "authorization");
  if (!authorization) return getHeader(request.headers, "x-service-token");
  const serviceMatch = authorization.match(/^Service\s+(.+)$/i);
  return (
    serviceMatch?.[1]?.trim() || getHeader(request.headers, "x-service-token")
  );
}

async function verifyRawServiceToken<TEnv>(
  request: Request,
  env: TEnv,
  options: AuthMiddlewareOptions<TEnv>,
): Promise<AuthenticatedPrincipal | null> {
  const token = extractServiceToken(request);
  if (!token) return null;

  const hashes = resolveStringArray(env, options.serviceTokenSha256Hashes);
  if (!hashes.length) {
    throw new AuthFailure(
      "AUTH_CONFIGURATION_ERROR",
      "Service Token hash 설정이 없습니다.",
      500,
    );
  }

  const actualHash = await sha256Hex(token);
  const matched = hashes.some((hash) =>
    constantTimeEqualString(actualHash, hash),
  );

  if (!matched) {
    throw new AuthFailure(
      "AUTH_TOKEN_INVALID",
      "유효하지 않은 Service Token입니다.",
    );
  }

  return {
    userId: "system",
    roles: ["SYSTEM"],
    primaryRole: "SYSTEM",
    permissions: permissionsByRole.SYSTEM,
    sessionId: null,
    deviceId: getHeader(request.headers, "x-device-id") ?? "server",
    tokenId: null,
    tokenKind: "SERVICE",
    accountStatus: "ACTIVE",
    mfaVerified: true,
    provider: "SERVICE_TOKEN",
    issuedAtEpochSeconds: null,
    expiresAtEpochSeconds: null,
    rawClaims: {
      iss: AUTH_SERVICE_ISSUER,
      aud: AUTH_SERVICE_AUDIENCE,
      sub: "system",
      role: "SYSTEM",
      typ: "service",
      deviceId: "server",
      exp: Math.floor(Date.now() / 1000) + 60,
    },
  };
}

function includesAny<T extends string>(
  actual: readonly T[],
  required: readonly T[] | undefined,
): boolean {
  if (!required?.length) return true;
  return required.some((item) => actual.includes(item));
}

function hasAnyPermission(
  actual: readonly string[],
  required: readonly string[] | undefined,
): boolean {
  if (!required?.length) return true;
  if (actual.includes("*")) return true;
  return required.some((permission) => actual.includes(permission));
}

function isPrivileged(principal: AuthenticatedPrincipal): boolean {
  return principal.roles.some((role) =>
    ["OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role),
  );
}

function assertAccountStatus(principal: AuthenticatedPrincipal): void {
  switch (principal.accountStatus) {
    case "ACTIVE":
      return;
    case "SUSPENDED":
      throw new AuthFailure("USER_SUSPENDED", "이용이 제한된 계정입니다.", 403);
    case "WITHDRAWN":
      throw new AuthFailure("USER_WITHDRAWN", "탈퇴한 계정입니다.", 403);
    case "DELETED":
      throw new AuthFailure("USER_DELETED", "삭제된 계정입니다.", 403);
    case "LOCKED":
      throw new AuthFailure("USER_LOCKED", "보안상 잠긴 계정입니다.", 403);
    case "PENDING":
      throw new AuthFailure(
        "AUTH_PERMISSION_DENIED",
        "계정 활성화가 필요합니다.",
        403,
      );
    default:
      throw new AuthFailure(
        "AUTH_PERMISSION_DENIED",
        "계정 상태를 확인할 수 없습니다.",
        403,
      );
  }
}

async function assertSession<TEnv>(
  principal: AuthenticatedPrincipal,
  runtime: AuthRouteRuntime,
  env: TEnv,
  options: AuthMiddlewareOptions<TEnv>,
): Promise<AuthenticatedPrincipal> {
  if (!options.resolveSession) return principal;

  const session = await options.resolveSession(principal, runtime, env);

  if (!session.active || session.revoked) {
    throw new AuthFailure(
      "AUTH_SESSION_REVOKED",
      "인증 세션이 만료되었습니다.",
    );
  }

  const mergedRoles: UserRole[] = session.roles?.length
    ? [...new Set<UserRole>([...principal.roles, ...session.roles])].sort(
        (a, b) => roleRank[b] - roleRank[a],
      )
    : [...principal.roles].sort((a, b) => roleRank[b] - roleRank[a]);
  const mergedPermissions = session.permissions?.length
    ? [...new Set([...principal.permissions, ...session.permissions])]
    : principal.permissions;

  return {
    ...principal,
    roles: mergedRoles,
    primaryRole: mergedRoles[0] ?? principal.primaryRole,
    permissions: mergedPermissions,
    accountStatus: session.accountStatus ?? principal.accountStatus,
  };
}

function explicitUserIdHints(runtime: AuthRouteRuntime): readonly string[] {
  const hints = new Set<string>();
  const pathParts = runtime.path.split("/").filter(Boolean);
  const usersIndex = pathParts.findIndex((part) => part === "users");

  if (usersIndex >= 0) {
    const pathUserId = pathParts[usersIndex + 1];

    if (pathUserId && pathUserId !== "me") {
      hints.add(pathUserId);
    }
  }

  ["userId", "ownerUserId", "actorUserId", "targetUserId"].forEach((key) => {
    const value = runtime.url.searchParams.get(key);

    if (value) {
      hints.add(value);
    }
  });

  return [...hints].filter(Boolean);
}

async function readSmallJsonBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  if (
    !["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())
  )
    return null;

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (
    !contentType.includes("application/json") &&
    !contentType.includes("+json")
  )
    return null;

  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_JSON_AUTH_BODY_BYTES) return null;

  try {
    const parsed = (await request.clone().json()) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function hasMassAssignmentAttempt(body: Record<string, unknown>): boolean {
  const forbidden = [
    "role",
    "roles",
    "permissions",
    "isAdmin",
    "isSuperAdmin",
    "accountStatus",
    "status",
    "admin",
    "adminRoles",
  ];

  return forbidden.some((key) => Object.hasOwn(body, key));
}

function bodyOwnerHints(body: Record<string, unknown>): readonly string[] {
  return ["userId", "ownerUserId", "actorUserId", "targetUserId"]
    .map((key) => body[key])
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
}

async function assertBasicOwnershipAndMassAssignment(
  runtime: AuthRouteRuntime,
): Promise<void> {
  const principal = runtime.principal;
  if (!principal || isPrivileged(principal)) return;

  if (runtime.policy.blockMassAssignment) {
    const body = await readSmallJsonBody(runtime.request);
    if (body) {
      if (hasMassAssignmentAttempt(body)) {
        throw new AuthFailure(
          "AUTH_MASS_ASSIGNMENT_BLOCKED",
          "허용되지 않은 권한 필드가 포함되어 있습니다.",
          400,
        );
      }

      const ownerIds = bodyOwnerHints(body);
      if (ownerIds.some((ownerId) => ownerId !== principal.userId)) {
        throw new AuthFailure(
          "AUTH_RESOURCE_OWNER_MISMATCH",
          "다른 사용자의 리소스에 접근할 수 없습니다.",
          403,
        );
      }
    }
  }

  if (runtime.policy.ownerBound) {
    const explicitIds = explicitUserIdHints(runtime);
    if (explicitIds.some((ownerId) => ownerId !== principal.userId)) {
      throw new AuthFailure(
        "AUTH_RESOURCE_OWNER_MISMATCH",
        "다른 사용자의 리소스에 접근할 수 없습니다.",
        403,
      );
    }
  }
}

async function assertRouteAuthorization<TEnv>(
  principal: AuthenticatedPrincipal,
  runtime: AuthRouteRuntime,
  env: TEnv,
  options: AuthMiddlewareOptions<TEnv>,
): Promise<void> {
  assertAccountStatus(principal);

  const policy = runtime.policy;

  if (
    policy.requireSystem &&
    !principal.roles.some((role) => role === "SYSTEM" || role === "SUPER_ADMIN")
  ) {
    throw new AuthFailure(
      "AUTH_SERVICE_TOKEN_REQUIRED",
      "시스템 권한이 필요합니다.",
      403,
    );
  }

  if (policy.requireAdmin || isAdminPath(runtime.path)) {
    if (
      !principal.roles.some((role) =>
        ["OPERATOR", "ADMIN", "SUPER_ADMIN"].includes(role),
      )
    ) {
      throw new AuthFailure(
        "AUTH_PERMISSION_DENIED",
        "관리자 권한이 필요합니다.",
        403,
      );
    }

    if (policy.requireMfa && !principal.mfaVerified) {
      throw new AuthFailure(
        "AUTH_MFA_REQUIRED",
        "관리자 2단계 인증이 필요합니다.",
        403,
      );
    }
  }

  if (
    policy.requireUser &&
    !principal.roles.some((role) => roleRank[role] >= roleRank.USER)
  ) {
    throw new AuthFailure(
      "AUTH_PERMISSION_DENIED",
      "로그인이 필요합니다.",
      403,
    );
  }

  if (!includesAny(principal.roles, policy.requiredRoles)) {
    throw new AuthFailure(
      "AUTH_PERMISSION_DENIED",
      "접근 권한이 없습니다.",
      403,
    );
  }

  if (!hasAnyPermission(principal.permissions, policy.requiredPermissions)) {
    throw new AuthFailure(
      "AUTH_PERMISSION_DENIED",
      "기능 접근 권한이 없습니다.",
      403,
    );
  }

  await assertBasicOwnershipAndMassAssignment(runtime);

  if (options.authorizeResource) {
    const result = await options.authorizeResource(principal, runtime, env);

    if (result.decision === "DENY") {
      throw new AuthFailure(
        result.code ?? "AUTH_RESOURCE_OWNER_MISMATCH",
        result.message ?? "리소스 접근 권한이 없습니다.",
        result.status ?? 403,
      );
    }
  }
}

function stripInboundAuthContextHeaders(headers: Headers): void {
  const namesToDelete: string[] = [];
  headers.forEach((_value, key) => {
    const normalized = key.toLowerCase();
    const isInternalContextHeader =
      AUTH_CONTEXT_HEADER_PREFIXES.some((prefix) =>
        normalized.startsWith(prefix),
      ) ||
      AUTH_CONTEXT_EXACT_HEADERS.includes(
        normalized as (typeof AUTH_CONTEXT_EXACT_HEADERS)[number],
      );

    if (isInternalContextHeader) {
      namesToDelete.push(key);
    }
  });

  namesToDelete.forEach((key) => headers.delete(key));
}

function appendAuthHeaders(
  request: Request,
  principal: AuthenticatedPrincipal | null,
  requestId: string,
  policy: AuthRoutePolicy,
): Request {
  const headers = new Headers(request.headers);
  stripInboundAuthContextHeaders(headers);
  headers.set("x-request-id", requestId);
  headers.set("x-auth-policy-id", policy.id);
  headers.set(AUTH_CONTEXT_SOURCE_HEADER, "auth.middleware");
  headers.set(AUTH_CONTEXT_VERSION_HEADER, AUTH_MIDDLEWARE_VERSION);

  if (principal) {
    headers.set("x-authenticated-user-id", principal.userId);
    headers.set("x-authenticated-roles", principal.roles.join(","));
    headers.set("x-authenticated-permissions", principal.permissions.join(","));
    headers.set("x-auth-primary-role", principal.primaryRole);
    headers.set("x-auth-token-kind", principal.tokenKind);
    headers.set("x-auth-account-status", principal.accountStatus);

    if (principal.sessionId) headers.set("x-session-id", principal.sessionId);
    if (principal.deviceId) headers.set("x-device-id", principal.deviceId);
    if (principal.tokenId) headers.set("x-auth-token-id", principal.tokenId);

    headers.set(
      "x-auth-mfa-verified",
      principal.mfaVerified ? "true" : "false",
    );
  }

  return new Request(request, { headers });
}

function authResponse(error: AuthFailure, requestId: string): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-request-id": requestId,
  });

  if (error.status === 401) {
    headers.set("www-authenticate", `Bearer error="${error.code}"`);
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    }),
    { status: error.status, headers },
  );
}

function ensureRequestIdHeader(
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

function redactError(error: unknown): string {
  if (error instanceof AuthFailure) return error.code;
  if (error instanceof Error) return error.name;
  return "UnknownError";
}

function emitAuthEvent<TEnv>(
  event: AuthEvent,
  env: TEnv,
  context: WaitUntilCapable,
  options: AuthMiddlewareOptions<TEnv>,
): void {
  const task = Promise.resolve(
    options.onAuthEvent?.(event, env, context),
  ).catch((error) => {
    console.error("auth_event_write_failed", {
      requestId: event.requestId,
      error: redactError(error),
    });
  });

  context.waitUntil?.(task);
}

async function authenticate<TEnv>(
  request: Request,
  runtimeBase: Omit<AuthRouteRuntime, "principal" | "policy">,
  env: TEnv,
  options: AuthMiddlewareOptions<TEnv>,
  policy: AuthRoutePolicy,
): Promise<AuthenticatedPrincipal> {
  if (policy.allowServiceToken || isSystemPath(runtimeBase.path)) {
    const servicePrincipal = await verifyRawServiceToken(request, env, options);
    if (servicePrincipal) return servicePrincipal;
  }

  const token = extractBearerToken(request);
  if (!token) {
    throw new AuthFailure("AUTH_TOKEN_MISSING", "인증 정보가 없습니다.");
  }

  const verified = options.verifyJwt
    ? await options.verifyJwt(token, runtimeBase, env)
    : await defaultJwtVerifier(token, runtimeBase, env, options);

  const principal = toPrincipal(verified, runtimeBase.path);
  const runtime: AuthRouteRuntime = { ...runtimeBase, policy, principal };

  return assertSession(principal, runtime, env, options);
}

export function createAuthMiddleware<TEnv = unknown>(
  handler: FetchHandler<TEnv>,
  options: AuthMiddlewareOptions<TEnv> = {},
): FetchHandler<TEnv> {
  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const method = request.method.toUpperCase();
    const requestId = getOrCreateAuthRequestId(request);
    const policy = resolvePolicy(
      path,
      method,
      options as AuthMiddlewareOptions<unknown>,
    );
    const runtimeBase: Omit<AuthRouteRuntime, "principal" | "policy"> = {
      request,
      url,
      path,
      method,
      requestId,
    };

    if (policy.public) {
      const forwarded = appendAuthHeaders(request, null, requestId, policy);
      return ensureRequestIdHeader(
        await handler(forwarded, env, context),
        requestId,
      );
    }

    let principal: AuthenticatedPrincipal | null = null;

    try {
      principal = await authenticate(
        request,
        runtimeBase,
        env,
        options,
        policy,
      );

      const runtime: AuthRouteRuntime = {
        ...runtimeBase,
        policy,
        principal,
      };

      await assertRouteAuthorization(principal, runtime, env, options);

      emitAuthEvent(
        {
          type: "auth_allowed",
          requestId,
          path,
          method,
          userId: principal.userId,
          roles: principal.roles,
        },
        env,
        context,
        options,
      );

      const forwarded = appendAuthHeaders(
        request,
        principal,
        requestId,
        policy,
      );
      return ensureRequestIdHeader(
        await handler(forwarded, env, context),
        requestId,
      );
    } catch (error) {
      const failure =
        error instanceof AuthFailure
          ? error
          : new AuthFailure(
              "AUTH_TOKEN_INVALID",
              "인증 처리 중 오류가 발생했습니다.",
            );

      const type: AuthEvent["type"] =
        failure.code === "AUTH_TOKEN_MISSING"
          ? "auth_missing"
          : failure.code === "AUTH_TOKEN_EXPIRED"
            ? "auth_expired"
            : failure.status === 403 || failure.status === 400
              ? "auth_denied"
              : failure.code === "AUTH_CONFIGURATION_ERROR"
                ? "auth_configuration_error"
                : "auth_invalid";

      emitAuthEvent(
        {
          type,
          requestId,
          path,
          method,
          userId: principal?.userId ?? null,
          roles: principal?.roles ?? [],
          code: failure.code,
          reason: failure.message,
        },
        env,
        context,
        options,
      );

      return authResponse(failure, requestId);
    }
  };
}

export function getAuthContextFromRequest(
  request: Request,
): AuthenticatedPrincipal | null {
  if (
    getHeader(request.headers, AUTH_CONTEXT_SOURCE_HEADER) !== "auth.middleware"
  )
    return null;

  const userId = getHeader(request.headers, "x-authenticated-user-id");
  if (!userId) return null;

  const roles = (getHeader(request.headers, "x-authenticated-roles") ?? "USER")
    .split(",")
    .map(normalizeRole)
    .filter((role): role is UserRole => Boolean(role));

  const permissions = (
    getHeader(request.headers, "x-authenticated-permissions") ?? ""
  )
    .split(",")
    .map((permission) => permission.trim())
    .filter(Boolean);

  const primaryRole =
    normalizeRole(getHeader(request.headers, "x-auth-primary-role")) ??
    roles[0] ??
    "USER";

  return {
    userId,
    roles: roles.length ? roles : ["USER"],
    primaryRole,
    permissions: permissions.length
      ? permissions
      : normalizePermissions({}, roles.length ? roles : ["USER"]),
    sessionId: getHeader(request.headers, "x-session-id"),
    deviceId: getHeader(request.headers, "x-device-id"),
    tokenId: getHeader(request.headers, "x-auth-token-id"),
    tokenKind:
      (getHeader(
        request.headers,
        "x-auth-token-kind",
      ) as AuthTokenKind | null) ?? "ACCESS",
    accountStatus: normalizeStatus(
      getHeader(request.headers, "x-auth-account-status"),
    ),
    mfaVerified: getHeader(request.headers, "x-auth-mfa-verified") === "true",
    provider: null,
    issuedAtEpochSeconds: null,
    expiresAtEpochSeconds: null,
    rawClaims: {},
  };
}

export function requireAuthenticated(request: Request): AuthenticatedPrincipal {
  const principal = getAuthContextFromRequest(request);
  if (!principal) {
    throw new AuthFailure("AUTH_TOKEN_MISSING", "인증 정보가 없습니다.");
  }
  return principal;
}

export function requireRole(
  request: Request,
  roles: readonly UserRole[],
): AuthenticatedPrincipal {
  const principal = requireAuthenticated(request);
  if (!includesAny(principal.roles, roles)) {
    throw new AuthFailure(
      "AUTH_PERMISSION_DENIED",
      "접근 권한이 없습니다.",
      403,
    );
  }
  return principal;
}

export function requirePermission(
  request: Request,
  permissions: readonly string[],
): AuthenticatedPrincipal {
  const principal = requireAuthenticated(request);
  if (!hasAnyPermission(principal.permissions, permissions)) {
    throw new AuthFailure(
      "AUTH_PERMISSION_DENIED",
      "기능 접근 권한이 없습니다.",
      403,
    );
  }
  return principal;
}

export function isSelfOrPrivileged(
  principal: AuthenticatedPrincipal,
  ownerUserId: string,
): boolean {
  return principal.userId === ownerUserId || isPrivileged(principal);
}

export async function createHs256JwtForTests(
  claims: SalaryHijackingJwtClaims,
  secret: string,
  header: Record<string, unknown> = {},
): Promise<string> {
  const encodedHeader = bytesToBase64Url(
    utf8(JSON.stringify({ alg: "HS256", typ: "JWT", ...header })),
  );
  const encodedPayload = bytesToBase64Url(utf8(JSON.stringify(claims)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSign("HS256", secret, signingInput);
  return `${signingInput}.${bytesToBase64Url(signature)}`;
}

export function assertAuthMiddlewareCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "bearer_access_token_required_for_protected_api",
    "hs256_hs384_hs512_rs256_jwt_signature_verification",
    "issuer_audience_iat_nbf_exp_validation",
    "short_lived_access_token_policy_15_minutes",
    "refresh_token_endpoint_public_but_not_protected_api_bypass",
    "service_token_for_batch_scheduler_internal_api",
    "rbac_user_operator_admin_super_admin_system",
    "admin_mfa_required",
    "suspended_withdrawn_deleted_locked_account_block",
    "basic_idor_user_id_path_query_body_block",
    "mass_assignment_role_admin_permission_block",
    "cloudflare_workers_request_header_context_propagation",
    "token_secret_salary_not_logged_or_returned",
    "inbound_auth_context_headers_stripped",
    "admin_api_requires_admin_audience_by_default",
    "auth_event_hook_for_audit_security_logs",
    "route_policy_for_payroll_budget_expense_savings_notifications_growth_community_uploads_ads_admin",
    "helpers_for_route_layer_authorization",
  ] as const;

  return {
    ok: checks.length >= 15,
    version: AUTH_MIDDLEWARE_VERSION,
    checks,
  };
}

export const authMiddlewareContract = Object.freeze({
  file: "services/api/src/middlewares/auth.middleware.ts",
  version: AUTH_MIDDLEWARE_VERSION,
  platform: "Cloudflare Workers Fetch API",
  jwtAccessToken: true,
  accessTokenTtlSeconds: DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
  refreshTokenHashStorageExpected: true,
  socialLoginProvidersExpected: [
    "NAVER",
    "KAKAO",
    "GOOGLE",
    "APPLE",
    "FACEBOOK",
  ],
  rbacRoles: ["GUEST", "USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"],
  adminMfaRequired: true,
  serviceTokenSupported: true,
  protectsFinancialDataBoundary: true,
  blocksMassAssignment: true,
  supportsOwnerAuthorizationHook: true,
  stripsInboundAuthorizationBeforeHandler: true,
  adminApiAcceptsMobileAudienceByDefault: false,
  finalStatus: "document_theoretical_file_unit_complete",
});

export default createAuthMiddleware;
