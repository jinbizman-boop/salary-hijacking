/**
 * packages/security/src/rate-limit.ts
 * 급여납치 Salary Hijacking Platform · server-authoritative rate limit contract.
 *
 * Scope
 * - Dependency-free TypeScript rate-limit policy engine for API, workers and admin tools.
 * - Supports fixed-window, sliding-window and token-bucket decisions through a storage adapter.
 * - Ships commercial-release policies for auth, MFA, payroll/budget/expense/saving writes,
 *   notifications, community, ads/partner events, admin console, migration and public reads.
 * - Keeps rate-limit keys log-safe by fingerprinting identifiers; raw tokens, emails, PII and
 *   financial payloads must never be used as storage keys or response metadata.
 */

export const SECURITY_RATE_LIMIT_CONTRACT_VERSION = "2.0.0" as const;
export const SECURITY_RATE_LIMIT_PACKAGE_SCOPE =
  "packages/security/src/rate-limit.ts" as const;

export type RateLimitRuntime =
  | "server"
  | "edge"
  | "worker"
  | "admin"
  | "browser"
  | "test";
export type RateLimitAlgorithm =
  | "fixed-window"
  | "sliding-window"
  | "token-bucket";
export type RateLimitScope =
  | "ip"
  | "user"
  | "tenant"
  | "route"
  | "device"
  | "service"
  | "global"
  | "composite";
export type RateLimitRisk = "low" | "medium" | "high" | "critical";
export type RateLimitDecisionStatus = "allowed" | "limited" | "blocked";

export type RateLimitPolicyName =
  | "auth.login"
  | "auth.signup"
  | "auth.social-login"
  | "auth.refresh-token"
  | "auth.password-reset"
  | "auth.mfa-verify"
  | "api.read"
  | "api.write"
  | "payroll.write"
  | "budget.write"
  | "expense.write"
  | "saving.write"
  | "growth.complete"
  | "notification.dispatch"
  | "notification.preference-write"
  | "community.post-create"
  | "community.comment-create"
  | "community.reaction"
  | "ads.event-track"
  | "partner.offer-click"
  | "admin.console"
  | "admin.impersonate"
  | "webhook.ingest"
  | "migration.execute";

export interface RateLimitSubject {
  readonly userId?: string;
  readonly tenantId?: string;
  readonly deviceId?: string;
  readonly sessionId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly serviceName?: string;
  readonly isAuthenticated?: boolean;
  readonly isAdmin?: boolean;
  readonly isServiceAccount?: boolean;
  readonly mfaVerified?: boolean;
}

export interface RateLimitRequest {
  readonly policy: RateLimitPolicyName;
  readonly subject: RateLimitSubject;
  readonly route?: string;
  readonly method?: string;
  readonly runtime?: RateLimitRuntime;
  readonly requestId?: string;
  readonly idempotencyKey?: string;
  readonly cost?: number;
  readonly nowMs?: number;
  readonly dryRun?: boolean;
  readonly metadata?: Readonly<
    Record<string, string | number | boolean | undefined>
  >;
}

export interface RateLimitPolicy {
  readonly name: RateLimitPolicyName;
  readonly algorithm: RateLimitAlgorithm;
  readonly scope: RateLimitScope;
  readonly windowMs: number;
  readonly limit: number;
  readonly burstLimit?: number;
  readonly refillPerWindow?: number;
  readonly blockDurationMs?: number;
  readonly costMultiplier?: number;
  readonly risk: RateLimitRisk;
  readonly requireAuthenticated?: boolean;
  readonly requireServiceAccount?: boolean;
  readonly requireMfa?: boolean;
  readonly idempotencyRequired?: boolean;
  readonly auditRequired: boolean;
  readonly rawIdentifierInKeyAllowed: false;
  readonly responseHeaders: true;
}

export interface RateLimitBucketState {
  readonly key: string;
  readonly count: number;
  readonly resetAtMs: number;
  readonly updatedAtMs: number;
  readonly blockedUntilMs?: number;
  readonly tokens?: number;
}

export interface MutableRateLimitBucketState {
  key: string;
  count: number;
  resetAtMs: number;
  updatedAtMs: number;
  blockedUntilMs?: number;
  tokens?: number;
}

export interface RateLimitStore {
  readonly get: (
    key: string,
  ) =>
    | Promise<RateLimitBucketState | undefined>
    | RateLimitBucketState
    | undefined;
  readonly set: (
    key: string,
    state: RateLimitBucketState,
    ttlMs: number,
  ) => Promise<void> | void;
  readonly delete?: (key: string) => Promise<void> | void;
  readonly now?: () => number;
}

export interface RateLimitHeaders {
  readonly "X-RateLimit-Limit": string;
  readonly "X-RateLimit-Remaining": string;
  readonly "X-RateLimit-Reset": string;
  readonly "Retry-After"?: string;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly status: RateLimitDecisionStatus;
  readonly policy: RateLimitPolicyName;
  readonly algorithm: RateLimitAlgorithm;
  readonly key: string;
  readonly limit: number;
  readonly remaining: number;
  readonly used: number;
  readonly cost: number;
  readonly resetAtMs: number;
  readonly retryAfterMs: number;
  readonly blockedUntilMs?: number;
  readonly dryRun: boolean;
  readonly reason: string;
  readonly auditRequired: boolean;
  readonly headers: RateLimitHeaders;
}

export interface RateLimitCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof SECURITY_RATE_LIMIT_CONTRACT_VERSION;
  readonly packageScope: typeof SECURITY_RATE_LIMIT_PACKAGE_SCOPE;
  readonly policyCount: number;
  readonly algorithmCount: number;
  readonly scopeCount: number;
  readonly invariantCount: number;
  readonly missing: readonly string[];
}

export class SecurityRateLimitError extends Error {
  public readonly code: string;
  public readonly safeMessage: string;

  public constructor(code: string, safeMessage: string) {
    super(safeMessage);
    this.name = "SecurityRateLimitError";
    this.code = code;
    this.safeMessage = safeMessage;
  }
}

const fail = (code: string, safeMessage: string): never => {
  throw new SecurityRateLimitError(code, safeMessage);
};

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MAX_ROUTE_LENGTH = 160;
const MAX_IDENTIFIER_LENGTH = 256;
const HASH_SEED = 0x9e3779b1;

const ALGORITHMS: readonly RateLimitAlgorithm[] = [
  "fixed-window",
  "sliding-window",
  "token-bucket",
] as const;
const SCOPES: readonly RateLimitScope[] = [
  "ip",
  "user",
  "tenant",
  "route",
  "device",
  "service",
  "global",
  "composite",
] as const;

export const defaultRateLimitPolicies: readonly RateLimitPolicy[] =
  Object.freeze([
    {
      name: "auth.login",
      algorithm: "sliding-window",
      scope: "composite",
      windowMs: 10 * MINUTE_MS,
      limit: 8,
      burstLimit: 12,
      blockDurationMs: 15 * MINUTE_MS,
      risk: "critical",
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "auth.signup",
      algorithm: "sliding-window",
      scope: "ip",
      windowMs: HOUR_MS,
      limit: 5,
      blockDurationMs: HOUR_MS,
      risk: "high",
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "auth.social-login",
      algorithm: "sliding-window",
      scope: "device",
      windowMs: 10 * MINUTE_MS,
      limit: 20,
      blockDurationMs: 10 * MINUTE_MS,
      risk: "high",
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "auth.refresh-token",
      algorithm: "token-bucket",
      scope: "user",
      windowMs: MINUTE_MS,
      limit: 30,
      burstLimit: 40,
      refillPerWindow: 30,
      risk: "high",
      requireAuthenticated: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "auth.password-reset",
      algorithm: "sliding-window",
      scope: "composite",
      windowMs: HOUR_MS,
      limit: 4,
      blockDurationMs: 2 * HOUR_MS,
      risk: "critical",
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "auth.mfa-verify",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: 10 * MINUTE_MS,
      limit: 6,
      blockDurationMs: 30 * MINUTE_MS,
      risk: "critical",
      requireAuthenticated: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "api.read",
      algorithm: "token-bucket",
      scope: "route",
      windowMs: MINUTE_MS,
      limit: 300,
      burstLimit: 450,
      refillPerWindow: 300,
      risk: "low",
      auditRequired: false,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "api.write",
      algorithm: "token-bucket",
      scope: "composite",
      windowMs: MINUTE_MS,
      limit: 90,
      burstLimit: 120,
      refillPerWindow: 90,
      risk: "medium",
      requireAuthenticated: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "payroll.write",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: MINUTE_MS,
      limit: 30,
      blockDurationMs: 10 * MINUTE_MS,
      risk: "critical",
      requireAuthenticated: true,
      idempotencyRequired: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "budget.write",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: MINUTE_MS,
      limit: 40,
      blockDurationMs: 10 * MINUTE_MS,
      risk: "high",
      requireAuthenticated: true,
      idempotencyRequired: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "expense.write",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: MINUTE_MS,
      limit: 60,
      blockDurationMs: 10 * MINUTE_MS,
      risk: "high",
      requireAuthenticated: true,
      idempotencyRequired: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "saving.write",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: MINUTE_MS,
      limit: 30,
      blockDurationMs: 10 * MINUTE_MS,
      risk: "high",
      requireAuthenticated: true,
      idempotencyRequired: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "growth.complete",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: MINUTE_MS,
      limit: 45,
      blockDurationMs: 5 * MINUTE_MS,
      risk: "medium",
      requireAuthenticated: true,
      idempotencyRequired: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "notification.dispatch",
      algorithm: "token-bucket",
      scope: "tenant",
      windowMs: MINUTE_MS,
      limit: 600,
      burstLimit: 1_000,
      refillPerWindow: 600,
      risk: "high",
      requireServiceAccount: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "notification.preference-write",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: MINUTE_MS,
      limit: 30,
      blockDurationMs: 10 * MINUTE_MS,
      risk: "medium",
      requireAuthenticated: true,
      idempotencyRequired: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "community.post-create",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: HOUR_MS,
      limit: 20,
      blockDurationMs: HOUR_MS,
      risk: "medium",
      requireAuthenticated: true,
      idempotencyRequired: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "community.comment-create",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: 10 * MINUTE_MS,
      limit: 40,
      blockDurationMs: 30 * MINUTE_MS,
      risk: "medium",
      requireAuthenticated: true,
      idempotencyRequired: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "community.reaction",
      algorithm: "token-bucket",
      scope: "user",
      windowMs: MINUTE_MS,
      limit: 120,
      burstLimit: 160,
      refillPerWindow: 120,
      risk: "low",
      requireAuthenticated: true,
      auditRequired: false,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "ads.event-track",
      algorithm: "token-bucket",
      scope: "composite",
      windowMs: MINUTE_MS,
      limit: 240,
      burstLimit: 360,
      refillPerWindow: 240,
      risk: "medium",
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "partner.offer-click",
      algorithm: "sliding-window",
      scope: "global",
      windowMs: MINUTE_MS,
      limit: 120,
      blockDurationMs: 10 * MINUTE_MS,
      risk: "medium",
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "admin.console",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: MINUTE_MS,
      limit: 80,
      blockDurationMs: 15 * MINUTE_MS,
      risk: "critical",
      requireAuthenticated: true,
      requireMfa: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "admin.impersonate",
      algorithm: "sliding-window",
      scope: "user",
      windowMs: HOUR_MS,
      limit: 10,
      blockDurationMs: 2 * HOUR_MS,
      risk: "critical",
      requireAuthenticated: true,
      requireMfa: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "webhook.ingest",
      algorithm: "token-bucket",
      scope: "service",
      windowMs: MINUTE_MS,
      limit: 600,
      burstLimit: 900,
      refillPerWindow: 600,
      risk: "high",
      requireServiceAccount: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
    {
      name: "migration.execute",
      algorithm: "fixed-window",
      scope: "service",
      windowMs: DAY_MS,
      limit: 20,
      blockDurationMs: HOUR_MS,
      risk: "critical",
      requireServiceAccount: true,
      requireMfa: true,
      auditRequired: true,
      rawIdentifierInKeyAllowed: false,
      responseHeaders: true,
    },
  ]);

const policyByName = new Map<RateLimitPolicyName, RateLimitPolicy>(
  defaultRateLimitPolicies.map((policy) => [policy.name, policy] as const),
);

const clampCost = (cost: number | undefined): number => {
  const normalized = cost ?? 1;
  if (
    !Number.isSafeInteger(normalized) ||
    normalized <= 0 ||
    normalized > 1_000
  )
    fail(
      "INVALID_RATE_LIMIT_COST",
      "Rate-limit cost must be a positive safe integer.",
    );
  return normalized;
};

const nowFrom = (request: RateLimitRequest, store: RateLimitStore): number => {
  const value = request.nowMs ?? store.now?.() ?? Date.now();
  if (!Number.isSafeInteger(value) || value <= 0)
    fail("INVALID_RATE_LIMIT_TIME", "Invalid rate-limit timestamp.");
  return value;
};

const normalizeIdentifier = (
  value: string | undefined,
  fallback: string,
): string => {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (trimmed.length > MAX_IDENTIFIER_LENGTH)
    return trimmed.slice(0, MAX_IDENTIFIER_LENGTH);
  return trimmed;
};

const normalizeRoute = (route: string | undefined): string => {
  const trimmed = route?.trim().toLowerCase();
  if (!trimmed) return "route:none";
  return trimmed
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .replace(/[?].*$/g, "")
    .slice(0, MAX_ROUTE_LENGTH);
};

const fnv1a = (value: string): string => {
  let hash = 0x811c9dc5 ^ HASH_SEED;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

export const fingerprintRateLimitIdentifier = (value: string): string =>
  `fp_${fnv1a(value)}`;

export const assertNoRawIdentifierInKey = (key: string): void => {
  const forbiddenPatterns: readonly RegExp[] = [
    /@/,
    /bearer\s+/i,
    /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    /(?:\+82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}/,
    /\b\d{6}[-\s]?[1-4]\d{6}\b/,
    /password|refresh[_-]?token|secret|private[_-]?key/i,
  ];
  if (forbiddenPatterns.some((pattern) => pattern.test(key)))
    fail(
      "RAW_IDENTIFIER_IN_RATE_LIMIT_KEY",
      "Rate-limit key contains raw sensitive identifier.",
    );
};

export const getRateLimitPolicy = (
  name: RateLimitPolicyName,
  policies: readonly RateLimitPolicy[] = defaultRateLimitPolicies,
): RateLimitPolicy => {
  const policy =
    policies === defaultRateLimitPolicies
      ? policyByName.get(name)
      : policies.find((candidate) => candidate.name === name);
  if (policy === undefined)
    return fail(
      "UNKNOWN_RATE_LIMIT_POLICY",
      `Unknown rate-limit policy: ${name}`,
    );
  return policy;
};

const subjectPart = (
  request: RateLimitRequest,
  policy: RateLimitPolicy,
): string => {
  const subject = request.subject;
  switch (policy.scope) {
    case "ip":
      return `ip:${fingerprintRateLimitIdentifier(normalizeIdentifier(subject.ipAddress, "anonymous-ip"))}`;
    case "user":
      return `user:${fingerprintRateLimitIdentifier(normalizeIdentifier(subject.userId ?? subject.sessionId, subject.ipAddress ?? "anonymous-user"))}`;
    case "tenant":
      return `tenant:${fingerprintRateLimitIdentifier(normalizeIdentifier(subject.tenantId, subject.serviceName ?? "global-tenant"))}`;
    case "route":
      return `route:${fingerprintRateLimitIdentifier(normalizeRoute(request.route))}`;
    case "device":
      return `device:${fingerprintRateLimitIdentifier(normalizeIdentifier(subject.deviceId, subject.ipAddress ?? "anonymous-device"))}`;
    case "service":
      return `service:${fingerprintRateLimitIdentifier(normalizeIdentifier(subject.serviceName, subject.userId ?? "unknown-service"))}`;
    case "global":
      return "global:all";
    case "composite": {
      const base = [
        normalizeIdentifier(subject.tenantId, "tenant:none"),
        normalizeIdentifier(
          subject.userId ?? subject.sessionId,
          subject.ipAddress ?? "subject:none",
        ),
        normalizeIdentifier(subject.deviceId, "device:none"),
        normalizeRoute(request.route),
      ].join("|");
      return `composite:${fingerprintRateLimitIdentifier(base)}`;
    }
  }
};

export const createRateLimitKey = (
  request: RateLimitRequest,
  policy: RateLimitPolicy = getRateLimitPolicy(request.policy),
): string => {
  const method = request.method?.trim().toUpperCase() ?? "ANY";
  const key = `shj:rl:v2:${policy.name}:${policy.algorithm}:${subjectPart(request, policy)}:method:${fingerprintRateLimitIdentifier(method)}`;
  assertNoRawIdentifierInKey(key);
  return key;
};

const validatePreconditions = (
  request: RateLimitRequest,
  policy: RateLimitPolicy,
): RateLimitDecision | undefined => {
  if (request.runtime === "browser") {
    return createPreconditionDecision(
      request,
      policy,
      "blocked",
      "browser runtime cannot authoritatively rate limit server resources",
    );
  }
  if (
    policy.requireAuthenticated === true &&
    request.subject.isAuthenticated !== true
  ) {
    return createPreconditionDecision(
      request,
      policy,
      "blocked",
      "authentication is required for this rate-limit policy",
    );
  }
  if (
    policy.requireServiceAccount === true &&
    request.subject.isServiceAccount !== true
  ) {
    return createPreconditionDecision(
      request,
      policy,
      "blocked",
      "service account is required for this rate-limit policy",
    );
  }
  if (policy.requireMfa === true && request.subject.mfaVerified !== true) {
    return createPreconditionDecision(
      request,
      policy,
      "blocked",
      "MFA is required for this rate-limit policy",
    );
  }
  if (policy.idempotencyRequired === true && !request.idempotencyKey?.trim()) {
    return createPreconditionDecision(
      request,
      policy,
      "blocked",
      "idempotency key is required for this write policy",
    );
  }
  return undefined;
};

const createHeaders = (
  limit: number,
  remaining: number,
  resetAtMs: number,
  retryAfterMs: number,
): RateLimitHeaders => {
  const headers: RateLimitHeaders = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.ceil(resetAtMs / SECOND_MS)),
    ...(retryAfterMs > 0
      ? { "Retry-After": String(Math.ceil(retryAfterMs / SECOND_MS)) }
      : {}),
  };
  return Object.freeze(headers);
};

const createPreconditionDecision = (
  request: RateLimitRequest,
  policy: RateLimitPolicy,
  status: "blocked" | "limited",
  reason: string,
): RateLimitDecision => {
  const nowMs = request.nowMs ?? Date.now();
  const retryAfterMs = policy.blockDurationMs ?? policy.windowMs;
  const resetAtMs = nowMs + retryAfterMs;
  return Object.freeze({
    allowed: false,
    status,
    policy: policy.name,
    algorithm: policy.algorithm,
    key: createRateLimitKey(request, policy),
    limit: policy.limit,
    remaining: 0,
    used: policy.limit,
    cost: clampCost(request.cost),
    resetAtMs,
    retryAfterMs,
    blockedUntilMs: resetAtMs,
    dryRun: request.dryRun === true,
    reason,
    auditRequired: true,
    headers: createHeaders(policy.limit, 0, resetAtMs, retryAfterMs),
  });
};

const normalizeState = (
  key: string,
  state: RateLimitBucketState | undefined,
  nowMs: number,
  policy: RateLimitPolicy,
): MutableRateLimitBucketState => {
  if (state === undefined || state.resetAtMs <= nowMs) {
    const initialTokens =
      policy.algorithm === "token-bucket"
        ? (policy.burstLimit ?? policy.limit)
        : undefined;
    return {
      key,
      count: 0,
      resetAtMs: nowMs + policy.windowMs,
      updatedAtMs: nowMs,
      ...(initialTokens !== undefined ? { tokens: initialTokens } : {}),
    };
  }
  return {
    key: state.key,
    count: state.count,
    resetAtMs: state.resetAtMs,
    updatedAtMs: state.updatedAtMs,
    ...(state.blockedUntilMs !== undefined
      ? { blockedUntilMs: state.blockedUntilMs }
      : {}),
    ...(state.tokens !== undefined ? { tokens: state.tokens } : {}),
  };
};

const freezeState = (
  state: MutableRateLimitBucketState,
): RateLimitBucketState =>
  Object.freeze({
    key: state.key,
    count: state.count,
    resetAtMs: state.resetAtMs,
    updatedAtMs: state.updatedAtMs,
    ...(state.blockedUntilMs !== undefined
      ? { blockedUntilMs: state.blockedUntilMs }
      : {}),
    ...(state.tokens !== undefined ? { tokens: state.tokens } : {}),
  });

const ttlFor = (
  state: MutableRateLimitBucketState,
  policy: RateLimitPolicy,
  nowMs: number,
): number => {
  const resetTtl = Math.max(SECOND_MS, state.resetAtMs - nowMs);
  const blockTtl =
    state.blockedUntilMs === undefined
      ? 0
      : Math.max(0, state.blockedUntilMs - nowMs);
  return Math.max(resetTtl, blockTtl, policy.windowMs);
};

const evaluateFixedOrSliding = (
  state: MutableRateLimitBucketState,
  request: RateLimitRequest,
  policy: RateLimitPolicy,
  nowMs: number,
): RateLimitDecision => {
  const cost = Math.ceil(
    clampCost(request.cost) * (policy.costMultiplier ?? 1),
  );
  const projected = state.count + cost;
  const limited = projected > policy.limit;
  if (!request.dryRun) {
    state.count = limited ? state.count : projected;
    state.updatedAtMs = nowMs;
    if (limited && policy.blockDurationMs !== undefined)
      state.blockedUntilMs = nowMs + policy.blockDurationMs;
  }
  const retryAfterMs = limited
    ? Math.max(0, (state.blockedUntilMs ?? state.resetAtMs) - nowMs)
    : 0;
  const remaining = limited ? 0 : Math.max(0, policy.limit - projected);
  return Object.freeze({
    allowed: !limited || request.dryRun === true,
    status: limited ? "limited" : "allowed",
    policy: policy.name,
    algorithm: policy.algorithm,
    key: state.key,
    limit: policy.limit,
    remaining,
    used: limited ? state.count : projected,
    cost,
    resetAtMs: state.resetAtMs,
    retryAfterMs,
    ...(state.blockedUntilMs !== undefined
      ? { blockedUntilMs: state.blockedUntilMs }
      : {}),
    dryRun: request.dryRun === true,
    reason: limited ? "rate limit exceeded" : "within rate limit",
    auditRequired: policy.auditRequired || limited,
    headers: createHeaders(
      policy.limit,
      remaining,
      state.resetAtMs,
      retryAfterMs,
    ),
  });
};

const evaluateTokenBucket = (
  state: MutableRateLimitBucketState,
  request: RateLimitRequest,
  policy: RateLimitPolicy,
  nowMs: number,
): RateLimitDecision => {
  const cost = Math.ceil(
    clampCost(request.cost) * (policy.costMultiplier ?? 1),
  );
  const capacity = policy.burstLimit ?? policy.limit;
  const refillPerWindow = policy.refillPerWindow ?? policy.limit;
  const previousTokens = state.tokens ?? capacity;
  const elapsed = Math.max(0, nowMs - state.updatedAtMs);
  const refill = Math.floor((elapsed / policy.windowMs) * refillPerWindow);
  const available = Math.min(capacity, previousTokens + refill);
  const limited = available < cost;
  const afterTokens = limited ? available : available - cost;
  if (!request.dryRun) {
    state.tokens = afterTokens;
    state.count += limited ? 0 : cost;
    state.updatedAtMs = nowMs;
    state.resetAtMs = nowMs + policy.windowMs;
    if (limited && policy.blockDurationMs !== undefined)
      state.blockedUntilMs = nowMs + policy.blockDurationMs;
  }
  const tokensNeeded = Math.max(0, cost - available);
  const tokenRetry =
    tokensNeeded === 0
      ? 0
      : Math.ceil((tokensNeeded / refillPerWindow) * policy.windowMs);
  const retryAfterMs = limited
    ? Math.max(
        tokenRetry,
        state.blockedUntilMs === undefined ? 0 : state.blockedUntilMs - nowMs,
      )
    : 0;
  return Object.freeze({
    allowed: !limited || request.dryRun === true,
    status: limited ? "limited" : "allowed",
    policy: policy.name,
    algorithm: policy.algorithm,
    key: state.key,
    limit: capacity,
    remaining: Math.max(0, afterTokens),
    used: Math.max(0, capacity - afterTokens),
    cost,
    resetAtMs: state.resetAtMs,
    retryAfterMs,
    ...(state.blockedUntilMs !== undefined
      ? { blockedUntilMs: state.blockedUntilMs }
      : {}),
    dryRun: request.dryRun === true,
    reason: limited ? "token bucket exhausted" : "within token bucket limit",
    auditRequired: policy.auditRequired || limited,
    headers: createHeaders(
      capacity,
      afterTokens,
      state.resetAtMs,
      retryAfterMs,
    ),
  });
};

export const evaluateRateLimit = async (
  request: RateLimitRequest,
  store: RateLimitStore,
  policies: readonly RateLimitPolicy[] = defaultRateLimitPolicies,
): Promise<RateLimitDecision> => {
  const policy = getRateLimitPolicy(request.policy, policies);
  const precondition = validatePreconditions(request, policy);
  if (precondition !== undefined) return precondition;

  const nowMs = nowFrom(request, store);
  const key = createRateLimitKey(request, policy);
  const existing = await store.get(key);
  const state = normalizeState(key, existing, nowMs, policy);

  if (state.blockedUntilMs !== undefined && state.blockedUntilMs > nowMs) {
    const retryAfterMs = state.blockedUntilMs - nowMs;
    return Object.freeze({
      allowed: request.dryRun === true,
      status: "blocked",
      policy: policy.name,
      algorithm: policy.algorithm,
      key,
      limit: policy.burstLimit ?? policy.limit,
      remaining: 0,
      used: state.count,
      cost: clampCost(request.cost),
      resetAtMs: state.resetAtMs,
      retryAfterMs,
      blockedUntilMs: state.blockedUntilMs,
      dryRun: request.dryRun === true,
      reason: "rate-limit block is active",
      auditRequired: true,
      headers: createHeaders(
        policy.burstLimit ?? policy.limit,
        0,
        state.resetAtMs,
        retryAfterMs,
      ),
    });
  }

  const decision =
    policy.algorithm === "token-bucket"
      ? evaluateTokenBucket(state, request, policy, nowMs)
      : evaluateFixedOrSliding(state, request, policy, nowMs);
  if (!request.dryRun)
    await store.set(key, freezeState(state), ttlFor(state, policy, nowMs));
  return decision;
};

export const assertRateLimitAllowed = async (
  request: RateLimitRequest,
  store: RateLimitStore,
  policies: readonly RateLimitPolicy[] = defaultRateLimitPolicies,
): Promise<RateLimitDecision> => {
  const decision = await evaluateRateLimit(request, store, policies);
  if (!decision.allowed) fail("RATE_LIMITED", decision.reason);
  return decision;
};

export const createMemoryRateLimitStore = (
  initialNowMs?: number,
): RateLimitStore & {
  readonly clear: () => void;
  readonly size: () => number;
  readonly setNow: (nowMs: number) => void;
  readonly advance: (ms: number) => void;
} => {
  const buckets = new Map<
    string,
    { readonly state: RateLimitBucketState; readonly expiresAtMs: number }
  >();
  let currentNowMs = initialNowMs ?? Date.now();
  const purge = (): void => {
    for (const [key, entry] of buckets)
      if (entry.expiresAtMs <= currentNowMs) buckets.delete(key);
  };
  return Object.freeze({
    get: (key: string): RateLimitBucketState | undefined => {
      purge();
      return buckets.get(key)?.state;
    },
    set: (key: string, state: RateLimitBucketState, ttlMs: number): void => {
      buckets.set(key, {
        state,
        expiresAtMs: currentNowMs + Math.max(SECOND_MS, ttlMs),
      });
    },
    delete: (key: string): void => {
      buckets.delete(key);
    },
    now: (): number => currentNowMs,
    clear: (): void => {
      buckets.clear();
    },
    size: (): number => {
      purge();
      return buckets.size;
    },
    setNow: (nowMs: number): void => {
      if (!Number.isSafeInteger(nowMs) || nowMs <= 0)
        fail("INVALID_MEMORY_STORE_TIME", "Invalid memory store time.");
      currentNowMs = nowMs;
      purge();
    },
    advance: (ms: number): void => {
      if (!Number.isSafeInteger(ms) || ms < 0)
        fail("INVALID_MEMORY_STORE_ADVANCE", "Invalid memory store advance.");
      currentNowMs += ms;
      purge();
    },
  });
};

export const resetRateLimitKey = async (
  request: RateLimitRequest,
  store: RateLimitStore,
  policies: readonly RateLimitPolicy[] = defaultRateLimitPolicies,
): Promise<void> => {
  const policy = getRateLimitPolicy(request.policy, policies);
  const key = createRateLimitKey(request, policy);
  await store.delete?.(key);
};

export const createRateLimitAuditEvent = (
  decision: RateLimitDecision,
  request: RateLimitRequest,
): Readonly<Record<string, string | number | boolean | undefined>> =>
  Object.freeze({
    type: "rate_limit.decision",
    policy: decision.policy,
    status: decision.status,
    allowed: decision.allowed,
    keyFingerprint: fingerprintRateLimitIdentifier(decision.key),
    limit: decision.limit,
    remaining: decision.remaining,
    used: decision.used,
    cost: decision.cost,
    retryAfterMs: decision.retryAfterMs,
    runtime: request.runtime,
    requestId: request.requestId,
    tenantFingerprint: request.subject.tenantId
      ? fingerprintRateLimitIdentifier(request.subject.tenantId)
      : undefined,
    userFingerprint: request.subject.userId
      ? fingerprintRateLimitIdentifier(request.subject.userId)
      : undefined,
  });

export const getRateLimitCompletenessReport =
  (): RateLimitCompletenessReport => {
    const missing: string[] = [];
    const policyNames = new Set<RateLimitPolicyName>();
    for (const policy of defaultRateLimitPolicies) {
      if (policyNames.has(policy.name))
        missing.push(`duplicate policy: ${policy.name}`);
      policyNames.add(policy.name);
      if (policy.limit <= 0) missing.push(`invalid limit: ${policy.name}`);
      if (policy.windowMs < SECOND_MS)
        missing.push(`invalid window: ${policy.name}`);
      if (policy.rawIdentifierInKeyAllowed !== false)
        missing.push(`raw key allowed: ${policy.name}`);
      if (policy.responseHeaders !== true)
        missing.push(`missing response headers: ${policy.name}`);
    }

    const requiredPolicies: readonly RateLimitPolicyName[] = [
      "auth.login",
      "auth.refresh-token",
      "auth.mfa-verify",
      "payroll.write",
      "expense.write",
      "saving.write",
      "notification.dispatch",
      "community.post-create",
      "ads.event-track",
      "admin.console",
      "migration.execute",
    ];

    const invariants: readonly [string, boolean][] = [
      ["contract version", SECURITY_RATE_LIMIT_CONTRACT_VERSION === "2.0.0"],
      ["policy coverage", defaultRateLimitPolicies.length >= 24],
      [
        "algorithm coverage",
        ALGORITHMS.every((algorithm) =>
          defaultRateLimitPolicies.some(
            (policy) => policy.algorithm === algorithm,
          ),
        ),
      ],
      [
        "scope coverage",
        SCOPES.every((scope) =>
          defaultRateLimitPolicies.some((policy) => policy.scope === scope),
        ),
      ],
      [
        "required policies",
        requiredPolicies.every((policyName) => policyNames.has(policyName)),
      ],
      [
        "auth policies critical",
        getRateLimitPolicy("auth.login").risk === "critical" &&
          getRateLimitPolicy("auth.mfa-verify").risk === "critical",
      ],
      [
        "financial writes idempotent",
        [
          "payroll.write",
          "budget.write",
          "expense.write",
          "saving.write",
        ].every(
          (name) =>
            getRateLimitPolicy(name as RateLimitPolicyName)
              .idempotencyRequired === true,
        ),
      ],
      [
        "notification dispatch service",
        getRateLimitPolicy("notification.dispatch").requireServiceAccount ===
          true,
      ],
      [
        "admin mfa",
        getRateLimitPolicy("admin.console").requireMfa === true &&
          getRateLimitPolicy("admin.impersonate").requireMfa === true,
      ],
      [
        "migration service mfa",
        getRateLimitPolicy("migration.execute").requireServiceAccount ===
          true && getRateLimitPolicy("migration.execute").requireMfa === true,
      ],
      [
        "ads policy audited",
        getRateLimitPolicy("ads.event-track").auditRequired === true,
      ],
      [
        "community anti spam",
        getRateLimitPolicy("community.post-create").blockDurationMs !==
          undefined,
      ],
      [
        "key fingerprint",
        createRateLimitKey({
          policy: "auth.login",
          subject: { ipAddress: "127.0.0.1" },
          route: "/auth/login",
          nowMs: 1_700_000_000_000,
        }).includes("fp_"),
      ],
      ["raw key guard", typeof assertNoRawIdentifierInKey === "function"],
      ["memory store", typeof createMemoryRateLimitStore === "function"],
      ["decision engine", typeof evaluateRateLimit === "function"],
      ["assert helper", typeof assertRateLimitAllowed === "function"],
      ["audit event helper", typeof createRateLimitAuditEvent === "function"],
    ];

    for (const [name, ok] of invariants) if (!ok) missing.push(name);

    return Object.freeze({
      ok: missing.length === 0,
      contractVersion: SECURITY_RATE_LIMIT_CONTRACT_VERSION,
      packageScope: SECURITY_RATE_LIMIT_PACKAGE_SCOPE,
      policyCount: defaultRateLimitPolicies.length,
      algorithmCount: ALGORITHMS.length,
      scopeCount: SCOPES.length,
      invariantCount: invariants.length,
      missing,
    });
  };

export const assertRateLimitModuleCompleteness = (): void => {
  const report = getRateLimitCompletenessReport();
  if (!report.ok)
    fail(
      "RATE_LIMIT_MODULE_INCOMPLETE",
      `Rate-limit module is incomplete: ${report.missing.join(", ")}`,
    );
};

export const runRateLimitSelfTest =
  async (): Promise<RateLimitCompletenessReport> => {
    const store = createMemoryRateLimitStore(1_700_000_000_000);
    const baseRequest: RateLimitRequest = {
      policy: "auth.login",
      subject: { ipAddress: "203.0.113.10", deviceId: "device_1" },
      route: "/auth/login",
      runtime: "server",
    };
    for (
      let index = 0;
      index < getRateLimitPolicy("auth.login").limit;
      index += 1
    ) {
      const decision = await evaluateRateLimit(baseRequest, store);
      if (!decision.allowed)
        fail(
          "RATE_LIMIT_SELF_TEST_ALLOWED_FAILED",
          "Rate-limit self-test failed before limit.",
        );
    }
    const limited = await evaluateRateLimit(baseRequest, store);
    if (limited.allowed)
      fail(
        "RATE_LIMIT_SELF_TEST_LIMIT_FAILED",
        "Rate-limit self-test failed to limit.",
      );

    const blockedPrecondition = await evaluateRateLimit(
      {
        policy: "payroll.write",
        subject: { isAuthenticated: true, userId: "u1", tenantId: "t1" },
        runtime: "server",
      },
      store,
    );
    if (blockedPrecondition.allowed)
      fail(
        "RATE_LIMIT_SELF_TEST_IDEMPOTENCY_FAILED",
        "Idempotency precondition must be enforced.",
      );

    const report = getRateLimitCompletenessReport();
    if (!report.ok)
      fail(
        "RATE_LIMIT_SELF_TEST_COMPLETENESS_FAILED",
        `Rate-limit self-test failed: ${report.missing.join(", ")}`,
      );
    return report;
  };

assertRateLimitModuleCompleteness();

export const rateLimitSecurityContract = Object.freeze({
  contractVersion: SECURITY_RATE_LIMIT_CONTRACT_VERSION,
  packageScope: SECURITY_RATE_LIMIT_PACKAGE_SCOPE,
  algorithms: ALGORITHMS,
  scopes: SCOPES,
  policies: defaultRateLimitPolicies,
  serverAuthorityRequired: true,
  browserDirectRateLimitAuthorityAllowed: false,
  rawIdentifierInStorageKeyAllowed: false,
  idempotencyRequiredForFinancialWrites: true,
  adminMfaRequired: true,
  notificationServiceAccountRequired: true,
  migrationServiceAccountRequired: true,
  responseHeadersRequired: true,
  auditRequiredForSensitivePolicies: true,
  functions: Object.freeze({
    evaluateRateLimit: true,
    assertRateLimitAllowed: true,
    createRateLimitKey: true,
    createMemoryRateLimitStore: true,
    resetRateLimitKey: true,
    createRateLimitAuditEvent: true,
    getRateLimitCompletenessReport: true,
    assertRateLimitModuleCompleteness: true,
    runRateLimitSelfTest: true,
  }),
});

export default rateLimitSecurityContract;
