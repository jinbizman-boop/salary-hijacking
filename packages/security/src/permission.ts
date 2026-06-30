/**
 * packages/security/src/permission.ts
 * 급여납치 Salary Hijacking Platform · RBAC/ABAC permission contract.
 *
 * Scope
 * - Pure TypeScript, dependency-free authorization engine for API, workers and admin tools.
 * - Combines role based access control (RBAC), ownership/tenant attribute checks (ABAC),
 *   MFA/consent obligations, raw financial data separation and audit requirements.
 * - Designed for server-authoritative payroll/budget/expense/saving calculations, community
 *   moderation, notifications, ads/partner operations and commercial admin consoles.
 */

export const SECURITY_PERMISSION_CONTRACT_VERSION = "2.0.0" as const;
export const SECURITY_PERMISSION_PACKAGE_SCOPE =
  "packages/security/src/permission.ts" as const;

export type PermissionEffect = "allow" | "deny";
export type PermissionScope =
  | "global"
  | "tenant"
  | "own"
  | "public"
  | "service";
export type PermissionRuntime =
  | "server"
  | "edge"
  | "worker"
  | "admin"
  | "browser"
  | "test";

export type SecurityRole =
  | "guest"
  | "user"
  | "support"
  | "moderator"
  | "finance"
  | "operations"
  | "auditor"
  | "admin"
  | "owner"
  | "service";

export type PermissionAction =
  | "list"
  | "read"
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "export"
  | "approve"
  | "moderate"
  | "publish"
  | "dispatch"
  | "track"
  | "execute"
  | "manage"
  | "impersonate";

export type PermissionResource =
  | "auth.session"
  | "auth.identity"
  | "user.profile"
  | "user.settings"
  | "user.consent"
  | "payroll.plan"
  | "payroll.snapshot"
  | "budget.daily"
  | "expense.fixed"
  | "expense.variable"
  | "expense.import"
  | "saving.fixed"
  | "growth.task"
  | "growth.progress"
  | "notification.preference"
  | "notification.dispatch"
  | "community.post"
  | "community.comment"
  | "community.moderation"
  | "ads.campaign"
  | "ads.event"
  | "partner.offer"
  | "admin.user"
  | "admin.role"
  | "admin.audit"
  | "system.config"
  | "migration.ddl";

export type PermissionDomain =
  | "auth"
  | "users"
  | "payroll"
  | "expenses"
  | "savings"
  | "growth"
  | "notifications"
  | "community"
  | "ads"
  | "admin"
  | "system";
export type DataSensitivity =
  | "public"
  | "internal"
  | "pii"
  | "financial"
  | "secret"
  | "admin-audit";
export type Visibility = "private" | "tenant" | "public" | "anonymous";
export type PermissionObligation =
  | "audit-log"
  | "tenant-boundary"
  | "owner-boundary"
  | "mask-pii"
  | "mask-financial"
  | "mask-secret"
  | "require-mfa"
  | "require-consent"
  | "server-only"
  | "service-only"
  | "no-raw-financial-ads-community"
  | "rate-limit";

export interface PermissionSubject {
  readonly userId?: string;
  readonly tenantId?: string;
  readonly roles: readonly SecurityRole[];
  readonly isAuthenticated: boolean;
  readonly isServiceAccount?: boolean;
  readonly mfaVerified?: boolean;
  readonly consent?: Readonly<
    Partial<
      Record<
        "marketing" | "adsPersonalization" | "community" | "notifications",
        boolean
      >
    >
  >;
}

export interface PermissionObject {
  readonly resource: PermissionResource;
  readonly resourceId?: string;
  readonly tenantId?: string;
  readonly ownerUserId?: string;
  readonly createdByUserId?: string;
  readonly visibility?: Visibility;
  readonly sensitivity?: DataSensitivity;
  readonly status?:
    | "draft"
    | "active"
    | "pending"
    | "published"
    | "hidden"
    | "deleted"
    | "archived";
}

export interface PermissionContext {
  readonly runtime?: PermissionRuntime;
  readonly requestId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly directDatabaseAccess?: boolean;
  readonly rawFinancialPayloadRequested?: boolean;
  readonly rawSecretRequested?: boolean;
  readonly rawPiiRequested?: boolean;
  readonly purpose?:
    | "api"
    | "worker"
    | "admin-console"
    | "migration"
    | "analytics"
    | "ads"
    | "community"
    | "test";
}

export interface PermissionRequest {
  readonly action: PermissionAction;
  readonly resource: PermissionResource;
  readonly subject: PermissionSubject;
  readonly object?: PermissionObject;
  readonly context?: PermissionContext;
}

export interface AccessRule {
  readonly id: string;
  readonly description: string;
  readonly effect: PermissionEffect;
  readonly roles: readonly SecurityRole[] | "*";
  readonly actions: readonly PermissionAction[] | "*";
  readonly resources: readonly PermissionResource[] | "*";
  readonly scope: PermissionScope;
  readonly mfaRequired?: boolean;
  readonly consentRequired?:
    | "marketing"
    | "adsPersonalization"
    | "community"
    | "notifications";
  readonly obligations: readonly PermissionObligation[];
}

export interface PermissionDecision {
  readonly allowed: boolean;
  readonly effect: PermissionEffect;
  readonly reason: string;
  readonly matchedRuleIds: readonly string[];
  readonly obligations: readonly PermissionObligation[];
}

export interface PermissionCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof SECURITY_PERMISSION_CONTRACT_VERSION;
  readonly packageScope: typeof SECURITY_PERMISSION_PACKAGE_SCOPE;
  readonly roleCount: number;
  readonly actionCount: number;
  readonly resourceCount: number;
  readonly ruleCount: number;
  readonly invariantCount: number;
  readonly missing: readonly string[];
}

export class SecurityPermissionError extends Error {
  public readonly code: string;
  public readonly decision: PermissionDecision;

  public constructor(
    code: string,
    message: string,
    decision: PermissionDecision,
  ) {
    super(message);
    this.name = "SecurityPermissionError";
    this.code = code;
    this.decision = decision;
  }
}

const ROLES: readonly SecurityRole[] = [
  "guest",
  "user",
  "support",
  "moderator",
  "finance",
  "operations",
  "auditor",
  "admin",
  "owner",
  "service",
] as const;
const ACTIONS: readonly PermissionAction[] = [
  "list",
  "read",
  "create",
  "update",
  "delete",
  "restore",
  "export",
  "approve",
  "moderate",
  "publish",
  "dispatch",
  "track",
  "execute",
  "manage",
  "impersonate",
] as const;
const RESOURCES: readonly PermissionResource[] = [
  "auth.session",
  "auth.identity",
  "user.profile",
  "user.settings",
  "user.consent",
  "payroll.plan",
  "payroll.snapshot",
  "budget.daily",
  "expense.fixed",
  "expense.variable",
  "expense.import",
  "saving.fixed",
  "growth.task",
  "growth.progress",
  "notification.preference",
  "notification.dispatch",
  "community.post",
  "community.comment",
  "community.moderation",
  "ads.campaign",
  "ads.event",
  "partner.offer",
  "admin.user",
  "admin.role",
  "admin.audit",
  "system.config",
  "migration.ddl",
] as const;

const FINANCIAL_RESOURCES: readonly PermissionResource[] = [
  "payroll.plan",
  "payroll.snapshot",
  "budget.daily",
  "expense.fixed",
  "expense.variable",
  "expense.import",
  "saving.fixed",
] as const;
const COMMUNITY_RESOURCES: readonly PermissionResource[] = [
  "community.post",
  "community.comment",
  "community.moderation",
] as const;
const ADS_RESOURCES: readonly PermissionResource[] = [
  "ads.campaign",
  "ads.event",
  "partner.offer",
] as const;
const ADMIN_RESOURCES: readonly PermissionResource[] = [
  "admin.user",
  "admin.role",
  "admin.audit",
  "system.config",
  "migration.ddl",
] as const;

const allowDecision = (
  reason: string,
  matchedRuleIds: readonly string[],
  obligations: readonly PermissionObligation[],
): PermissionDecision =>
  Object.freeze({
    allowed: true,
    effect: "allow",
    reason,
    matchedRuleIds: Object.freeze([...matchedRuleIds]),
    obligations: Object.freeze([...new Set(obligations)]),
  });

const denyDecision = (
  reason: string,
  matchedRuleIds: readonly string[] = [],
  obligations: readonly PermissionObligation[] = ["audit-log"],
): PermissionDecision =>
  Object.freeze({
    allowed: false,
    effect: "deny",
    reason,
    matchedRuleIds: Object.freeze([...matchedRuleIds]),
    obligations: Object.freeze([...new Set(obligations)]),
  });

const hasRole = (subject: PermissionSubject, role: SecurityRole): boolean =>
  subject.roles.includes(role);
const hasAnyRole = (
  subject: PermissionSubject,
  roles: readonly SecurityRole[] | "*",
): boolean => roles === "*" || roles.some((role) => hasRole(subject, role));
const hasAction = (rule: AccessRule, action: PermissionAction): boolean =>
  rule.actions === "*" || rule.actions.includes(action);
const hasResource = (rule: AccessRule, resource: PermissionResource): boolean =>
  rule.resources === "*" || rule.resources.includes(resource);
const isOwnerRole = (subject: PermissionSubject): boolean =>
  hasRole(subject, "owner");
const isAdminRole = (subject: PermissionSubject): boolean =>
  hasRole(subject, "admin") || isOwnerRole(subject);
const isServiceRole = (subject: PermissionSubject): boolean =>
  hasRole(subject, "service") || subject.isServiceAccount === true;

const isFinancialResource = (resource: PermissionResource): boolean =>
  FINANCIAL_RESOURCES.includes(resource);
const isCommunityResource = (resource: PermissionResource): boolean =>
  COMMUNITY_RESOURCES.includes(resource);
const isAdsResource = (resource: PermissionResource): boolean =>
  ADS_RESOURCES.includes(resource);
const isAdminResource = (resource: PermissionResource): boolean =>
  ADMIN_RESOURCES.includes(resource);

const isTenantMatch = (
  subject: PermissionSubject,
  object: PermissionObject | undefined,
): boolean => {
  if (object?.tenantId === undefined) return true;
  if (subject.tenantId === undefined) return false;
  return subject.tenantId === object.tenantId;
};

const isOwnObject = (
  subject: PermissionSubject,
  object: PermissionObject | undefined,
): boolean => {
  if (!subject.userId || object === undefined) return false;
  return (
    object.ownerUserId === subject.userId ||
    object.createdByUserId === subject.userId ||
    object.resourceId === subject.userId
  );
};

const isPublicObject = (object: PermissionObject | undefined): boolean =>
  object?.visibility === "public" &&
  object.status !== "deleted" &&
  object.status !== "hidden";

const assertKnownRequest = (
  request: PermissionRequest,
): PermissionDecision | undefined => {
  if (!ACTIONS.includes(request.action))
    return denyDecision(`unknown action: ${request.action}`);
  if (!RESOURCES.includes(request.resource))
    return denyDecision(`unknown resource: ${request.resource}`);
  for (const role of request.subject.roles)
    if (!ROLES.includes(role)) return denyDecision(`unknown role: ${role}`);
  return undefined;
};

const denyGlobalSafetyViolation = (
  request: PermissionRequest,
): PermissionDecision | undefined => {
  const context = request.context;
  if (context?.runtime === "browser" && context.directDatabaseAccess === true) {
    return denyDecision(
      "browser direct database access is forbidden",
      [],
      ["server-only", "audit-log"],
    );
  }
  if (context?.rawSecretRequested === true) {
    return denyDecision(
      "raw secret access is forbidden",
      [],
      ["mask-secret", "audit-log"],
    );
  }
  if (
    context?.rawPiiRequested === true &&
    !isAdminRole(request.subject) &&
    !isServiceRole(request.subject)
  ) {
    return denyDecision(
      "raw PII access requires privileged server actor",
      [],
      ["mask-pii", "audit-log"],
    );
  }
  if (
    context?.rawFinancialPayloadRequested === true &&
    (isAdsResource(request.resource) ||
      isCommunityResource(request.resource) ||
      context.purpose === "ads" ||
      context.purpose === "community")
  ) {
    return denyDecision(
      "raw financial data cannot flow into ads or community contexts",
      [],
      ["no-raw-financial-ads-community", "mask-financial", "audit-log"],
    );
  }
  if (isAdminResource(request.resource) && context?.runtime === "browser") {
    return denyDecision(
      "admin resources require server/admin runtime",
      [],
      ["server-only", "audit-log"],
    );
  }
  return undefined;
};

export const accessRules: readonly AccessRule[] = Object.freeze([
  {
    id: "deny-guest-sensitive",
    description:
      "Guests cannot access authenticated, financial, admin or write resources.",
    effect: "deny",
    roles: ["guest"],
    actions: [
      "create",
      "update",
      "delete",
      "restore",
      "export",
      "approve",
      "moderate",
      "publish",
      "dispatch",
      "track",
      "execute",
      "manage",
      "impersonate",
    ],
    resources: "*",
    scope: "global",
    obligations: ["audit-log", "server-only"],
  },
  {
    id: "allow-public-community-read",
    description:
      "Anyone can read/list published public community posts and comments.",
    effect: "allow",
    roles: "*",
    actions: ["list", "read"],
    resources: ["community.post", "community.comment"],
    scope: "public",
    obligations: ["rate-limit", "mask-pii"],
  },
  {
    id: "allow-user-own-auth-user",
    description:
      "Authenticated users can manage their own profile, settings, consent and sessions.",
    effect: "allow",
    roles: [
      "user",
      "support",
      "moderator",
      "finance",
      "operations",
      "auditor",
      "admin",
      "owner",
    ],
    actions: ["list", "read", "create", "update", "delete"],
    resources: [
      "auth.session",
      "auth.identity",
      "user.profile",
      "user.settings",
      "user.consent",
      "notification.preference",
    ],
    scope: "own",
    obligations: [
      "owner-boundary",
      "tenant-boundary",
      "mask-pii",
      "audit-log",
      "rate-limit",
    ],
  },
  {
    id: "allow-user-own-financial-domain",
    description:
      "Authenticated users can manage their own payroll, budget, expense and saving data with server-authoritative calculations.",
    effect: "allow",
    roles: ["user", "finance", "admin", "owner"],
    actions: ["list", "read", "create", "update", "delete"],
    resources: [
      "payroll.plan",
      "payroll.snapshot",
      "budget.daily",
      "expense.fixed",
      "expense.variable",
      "expense.import",
      "saving.fixed",
    ],
    scope: "own",
    obligations: [
      "owner-boundary",
      "tenant-boundary",
      "mask-financial",
      "audit-log",
      "rate-limit",
      "server-only",
    ],
  },
  {
    id: "allow-user-own-growth",
    description:
      "Authenticated users can manage their own level-up tasks and progress.",
    effect: "allow",
    roles: ["user", "admin", "owner"],
    actions: ["list", "read", "create", "update", "delete", "publish"],
    resources: ["growth.task", "growth.progress"],
    scope: "own",
    obligations: [
      "owner-boundary",
      "tenant-boundary",
      "audit-log",
      "rate-limit",
    ],
  },
  {
    id: "allow-user-community-write",
    description:
      "Authenticated users can create community content and manage their own content.",
    effect: "allow",
    roles: ["user", "moderator", "admin", "owner"],
    actions: ["create", "update", "delete", "publish"],
    resources: ["community.post", "community.comment"],
    scope: "own",
    obligations: [
      "owner-boundary",
      "tenant-boundary",
      "mask-pii",
      "audit-log",
      "rate-limit",
    ],
  },
  {
    id: "allow-moderator-community",
    description:
      "Moderators can moderate community posts, comments and moderation queues within tenant boundary.",
    effect: "allow",
    roles: ["moderator", "admin", "owner"],
    actions: [
      "list",
      "read",
      "update",
      "delete",
      "restore",
      "approve",
      "moderate",
      "publish",
    ],
    resources: ["community.post", "community.comment", "community.moderation"],
    scope: "tenant",
    obligations: ["tenant-boundary", "mask-pii", "audit-log", "rate-limit"],
  },
  {
    id: "allow-support-safe-user-read",
    description:
      "Support can read masked user and notification metadata within tenant boundary.",
    effect: "allow",
    roles: ["support", "operations", "admin", "owner"],
    actions: ["list", "read"],
    resources: [
      "user.profile",
      "user.settings",
      "user.consent",
      "notification.preference",
      "notification.dispatch",
    ],
    scope: "tenant",
    obligations: ["tenant-boundary", "mask-pii", "audit-log", "rate-limit"],
  },
  {
    id: "allow-finance-auditor-financial-read",
    description:
      "Finance and auditors can read/export masked financial data with MFA and audit logging.",
    effect: "allow",
    roles: ["finance", "auditor", "admin", "owner"],
    actions: ["list", "read", "export"],
    resources: [
      "payroll.plan",
      "payroll.snapshot",
      "budget.daily",
      "expense.fixed",
      "expense.variable",
      "expense.import",
      "saving.fixed",
    ],
    scope: "tenant",
    mfaRequired: true,
    obligations: [
      "tenant-boundary",
      "mask-financial",
      "mask-pii",
      "require-mfa",
      "audit-log",
    ],
  },
  {
    id: "allow-notification-dispatch",
    description:
      "Operations, admins and services can dispatch notifications without raw financial payloads.",
    effect: "allow",
    roles: ["operations", "admin", "owner", "service"],
    actions: ["dispatch", "create", "update", "read", "list"],
    resources: ["notification.dispatch", "notification.preference"],
    scope: "tenant",
    obligations: [
      "tenant-boundary",
      "mask-pii",
      "mask-financial",
      "audit-log",
      "rate-limit",
      "server-only",
    ],
  },
  {
    id: "allow-ads-partner-operations",
    description:
      "Ads and partner operations are allowed only with consent and without raw financial joins.",
    effect: "allow",
    roles: ["operations", "admin", "owner", "service"],
    actions: ["list", "read", "create", "update", "delete", "track", "publish"],
    resources: ["ads.campaign", "ads.event", "partner.offer"],
    scope: "tenant",
    consentRequired: "adsPersonalization",
    obligations: [
      "tenant-boundary",
      "require-consent",
      "no-raw-financial-ads-community",
      "mask-pii",
      "mask-financial",
      "audit-log",
      "rate-limit",
    ],
  },
  {
    id: "allow-admin-console",
    description:
      "Admins can manage users, roles and system settings with MFA, tenant boundary and full audit trail.",
    effect: "allow",
    roles: ["admin", "owner"],
    actions: [
      "list",
      "read",
      "create",
      "update",
      "delete",
      "restore",
      "approve",
      "manage",
    ],
    resources: ["admin.user", "admin.role", "system.config", "admin.audit"],
    scope: "tenant",
    mfaRequired: true,
    obligations: [
      "tenant-boundary",
      "require-mfa",
      "mask-pii",
      "mask-secret",
      "audit-log",
      "server-only",
    ],
  },
  {
    id: "allow-owner-global",
    description:
      "Owner role can manage all resources with audit, MFA and masking obligations.",
    effect: "allow",
    roles: ["owner"],
    actions: "*",
    resources: "*",
    scope: "global",
    mfaRequired: true,
    obligations: [
      "require-mfa",
      "mask-pii",
      "mask-financial",
      "mask-secret",
      "audit-log",
      "server-only",
    ],
  },
  {
    id: "allow-service-migration",
    description:
      "Service accounts can execute migrations, notification jobs and audit events in service runtime.",
    effect: "allow",
    roles: ["service"],
    actions: ["execute", "create", "read", "dispatch"],
    resources: ["migration.ddl", "admin.audit", "notification.dispatch"],
    scope: "service",
    obligations: ["service-only", "audit-log", "server-only", "mask-secret"],
  },
]);

const ruleScopeMatches = (
  rule: AccessRule,
  request: PermissionRequest,
): boolean => {
  switch (rule.scope) {
    case "global":
      return true;
    case "tenant":
      return isTenantMatch(request.subject, request.object);
    case "own":
      return isOwnObject(request.subject, request.object);
    case "public":
      return isPublicObject(request.object) || request.object === undefined;
    case "service":
      return (
        isServiceRole(request.subject) && request.context?.runtime !== "browser"
      );
  }
};

const ruleConditionsMatch = (
  rule: AccessRule,
  request: PermissionRequest,
): PermissionDecision | undefined => {
  if (
    !hasAnyRole(request.subject, rule.roles) ||
    !hasAction(rule, request.action) ||
    !hasResource(rule, request.resource)
  )
    return undefined;
  if (!ruleScopeMatches(rule, request)) return undefined;

  if (rule.mfaRequired === true && request.subject.mfaVerified !== true)
    return denyDecision(
      "MFA is required for this permission",
      [rule.id],
      ["require-mfa", "audit-log"],
    );
  if (
    rule.consentRequired !== undefined &&
    request.subject.consent?.[rule.consentRequired] !== true &&
    !isAdminRole(request.subject) &&
    !isServiceRole(request.subject)
  ) {
    return denyDecision(
      `consent is required: ${rule.consentRequired}`,
      [rule.id],
      ["require-consent", "audit-log"],
    );
  }
  if (
    rule.scope !== "public" &&
    !request.subject.isAuthenticated &&
    !isServiceRole(request.subject)
  ) {
    return denyDecision("authentication is required", [rule.id], ["audit-log"]);
  }
  return undefined;
};

export const evaluatePermission = (
  request: PermissionRequest,
  rules: readonly AccessRule[] = accessRules,
): PermissionDecision => {
  const invalid = assertKnownRequest(request);
  if (invalid !== undefined) return invalid;

  const safetyViolation = denyGlobalSafetyViolation(request);
  if (safetyViolation !== undefined) return safetyViolation;

  const denyMatches: string[] = [];
  const allowMatches: string[] = [];
  const obligations: PermissionObligation[] = [];

  for (const rule of rules) {
    const conditionDecision = ruleConditionsMatch(rule, request);
    if (conditionDecision !== undefined) return conditionDecision;
    if (
      !hasAnyRole(request.subject, rule.roles) ||
      !hasAction(rule, request.action) ||
      !hasResource(rule, request.resource) ||
      !ruleScopeMatches(rule, request)
    )
      continue;

    if (rule.effect === "deny") {
      denyMatches.push(rule.id);
      obligations.push(...rule.obligations);
    } else {
      allowMatches.push(rule.id);
      obligations.push(...rule.obligations);
    }
  }

  if (denyMatches.length > 0)
    return denyDecision("explicit deny rule matched", denyMatches, obligations);
  if (allowMatches.length > 0) {
    const sensitiveObligations: PermissionObligation[] = [...obligations];
    if (isFinancialResource(request.resource))
      sensitiveObligations.push("mask-financial", "audit-log", "server-only");
    if (isCommunityResource(request.resource))
      sensitiveObligations.push("mask-pii", "rate-limit");
    if (isAdsResource(request.resource))
      sensitiveObligations.push(
        "no-raw-financial-ads-community",
        "require-consent",
      );
    if (isAdminResource(request.resource))
      sensitiveObligations.push("require-mfa", "audit-log", "server-only");
    return allowDecision(
      "allow rule matched",
      allowMatches,
      sensitiveObligations,
    );
  }

  return denyDecision("no permission rule matched", [], ["audit-log"]);
};

export const can = (
  request: PermissionRequest,
  rules: readonly AccessRule[] = accessRules,
): boolean => evaluatePermission(request, rules).allowed;

export const assertPermission = (
  request: PermissionRequest,
  rules: readonly AccessRule[] = accessRules,
): PermissionDecision => {
  const decision = evaluatePermission(request, rules);
  if (!decision.allowed)
    throw new SecurityPermissionError(
      "PERMISSION_DENIED",
      decision.reason,
      decision,
    );
  return decision;
};

export const requirePermission = assertPermission;

export const createOwnObject = (
  resource: PermissionResource,
  subject: PermissionSubject,
  resourceId?: string,
): PermissionObject => {
  const output: PermissionObject = {
    resource,
    ...(resourceId ? { resourceId } : {}),
    ...(subject.tenantId ? { tenantId: subject.tenantId } : {}),
    ...(subject.userId ? { ownerUserId: subject.userId } : {}),
    visibility: "private",
    sensitivity: isFinancialResource(resource)
      ? "financial"
      : resource.startsWith("user.") || resource.startsWith("auth.")
        ? "pii"
        : "internal",
    status: "active",
  };
  return Object.freeze(output);
};

export const createPublicCommunityObject = (
  resourceId: string,
  tenantId?: string,
): PermissionObject =>
  Object.freeze({
    resource: "community.post",
    resourceId,
    ...(tenantId ? { tenantId } : {}),
    visibility: "public",
    sensitivity: "internal",
    status: "published",
  });

export const getPermissionObligations = (
  request: PermissionRequest,
): readonly PermissionObligation[] => evaluatePermission(request).obligations;

export const getAllowedActions = (
  subject: PermissionSubject,
  resource: PermissionResource,
  object?: PermissionObject,
  context?: PermissionContext,
): readonly PermissionAction[] =>
  ACTIONS.filter((action) =>
    can({
      action,
      resource,
      subject,
      ...(object ? { object } : {}),
      ...(context ? { context } : {}),
    }),
  );

export const filterReadableObjects = <T extends PermissionObject>(
  subject: PermissionSubject,
  objects: readonly T[],
  context?: PermissionContext,
): readonly T[] =>
  objects.filter((object) =>
    can({
      action: "read",
      resource: object.resource,
      subject,
      object,
      ...(context ? { context } : {}),
    }),
  );

export const permissionPolicySnapshot = Object.freeze({
  contractVersion: SECURITY_PERMISSION_CONTRACT_VERSION,
  packageScope: SECURITY_PERMISSION_PACKAGE_SCOPE,
  roles: ROLES,
  actions: ACTIONS,
  resources: RESOURCES,
  financialResources: FINANCIAL_RESOURCES,
  communityResources: COMMUNITY_RESOURCES,
  adsResources: ADS_RESOURCES,
  adminResources: ADMIN_RESOURCES,
  ruleIds: accessRules.map((rule) => rule.id),
  serverAuthorityRequired: true,
  browserDirectDatabaseAccessAllowed: false,
  clientFinalCalculationAllowed: false,
  rawFinancialDataInAdsOrCommunityAllowed: false,
  adminMfaRequired: true,
  auditLogRequired: true,
});

export const getPermissionCompletenessReport =
  (): PermissionCompletenessReport => {
    const missing: string[] = [];
    const ruleIds = new Set<string>();
    for (const rule of accessRules) {
      if (ruleIds.has(rule.id)) missing.push(`duplicate rule id: ${rule.id}`);
      ruleIds.add(rule.id);
    }

    const invariants: readonly [string, boolean][] = [
      ["contract version", SECURITY_PERMISSION_CONTRACT_VERSION === "2.0.0"],
      ["roles coverage", ROLES.length >= 10],
      ["actions coverage", ACTIONS.length >= 15],
      ["resources coverage", RESOURCES.length >= 27],
      ["rules coverage", accessRules.length >= 14],
      ["financial resources", FINANCIAL_RESOURCES.length >= 7],
      ["community resources", COMMUNITY_RESOURCES.length >= 3],
      ["ads resources", ADS_RESOURCES.length >= 3],
      ["admin resources", ADMIN_RESOURCES.length >= 5],
      [
        "public community rule",
        accessRules.some((rule) => rule.id === "allow-public-community-read"),
      ],
      [
        "own financial rule",
        accessRules.some(
          (rule) => rule.id === "allow-user-own-financial-domain",
        ),
      ],
      [
        "moderator rule",
        accessRules.some((rule) => rule.id === "allow-moderator-community"),
      ],
      [
        "ads separation rule",
        accessRules.some((rule) => rule.id === "allow-ads-partner-operations"),
      ],
      [
        "admin mfa rule",
        accessRules.some(
          (rule) =>
            rule.id === "allow-admin-console" && rule.mfaRequired === true,
        ),
      ],
      [
        "service migration rule",
        accessRules.some((rule) => rule.id === "allow-service-migration"),
      ],
      [
        "owner global rule",
        accessRules.some((rule) => rule.id === "allow-owner-global"),
      ],
      [
        "browser db blocked",
        evaluatePermission({
          action: "read",
          resource: "payroll.plan",
          subject: {
            roles: ["user"],
            isAuthenticated: true,
            userId: "u1",
            tenantId: "t1",
          },
          object: {
            resource: "payroll.plan",
            ownerUserId: "u1",
            tenantId: "t1",
          },
          context: { runtime: "browser", directDatabaseAccess: true },
        }).allowed === false,
      ],
      [
        "raw ads financial blocked",
        evaluatePermission({
          action: "track",
          resource: "ads.event",
          subject: {
            roles: ["operations"],
            isAuthenticated: true,
            userId: "op1",
            tenantId: "t1",
            consent: { adsPersonalization: true },
          },
          object: { resource: "ads.event", tenantId: "t1" },
          context: {
            runtime: "server",
            rawFinancialPayloadRequested: true,
            purpose: "ads",
          },
        }).allowed === false,
      ],
      [
        "own payroll allowed",
        evaluatePermission({
          action: "read",
          resource: "payroll.plan",
          subject: {
            roles: ["user"],
            isAuthenticated: true,
            userId: "u1",
            tenantId: "t1",
          },
          object: {
            resource: "payroll.plan",
            ownerUserId: "u1",
            tenantId: "t1",
          },
          context: { runtime: "server" },
        }).allowed === true,
      ],
      [
        "cross tenant denied",
        evaluatePermission({
          action: "read",
          resource: "payroll.plan",
          subject: {
            roles: ["user"],
            isAuthenticated: true,
            userId: "u1",
            tenantId: "t1",
          },
          object: {
            resource: "payroll.plan",
            ownerUserId: "u2",
            tenantId: "t2",
          },
          context: { runtime: "server" },
        }).allowed === false,
      ],
    ];

    for (const [name, ok] of invariants) if (!ok) missing.push(name);

    return Object.freeze({
      ok: missing.length === 0,
      contractVersion: SECURITY_PERMISSION_CONTRACT_VERSION,
      packageScope: SECURITY_PERMISSION_PACKAGE_SCOPE,
      roleCount: ROLES.length,
      actionCount: ACTIONS.length,
      resourceCount: RESOURCES.length,
      ruleCount: accessRules.length,
      invariantCount: invariants.length,
      missing,
    });
  };

export const assertPermissionModuleCompleteness = (): void => {
  const report = getPermissionCompletenessReport();
  if (!report.ok)
    throw new SecurityPermissionError(
      "PERMISSION_MODULE_INCOMPLETE",
      `Permission module is incomplete: ${report.missing.join(", ")}`,
      denyDecision("permission module incomplete", [], ["audit-log"]),
    );
};

export const runPermissionSelfTest = (): PermissionCompletenessReport => {
  const user: PermissionSubject = {
    roles: ["user"],
    isAuthenticated: true,
    userId: "user_1",
    tenantId: "tenant_1",
  };
  const ownPayroll = createOwnObject("payroll.plan", user, "payroll_1");
  assertPermission({
    action: "read",
    resource: "payroll.plan",
    subject: user,
    object: ownPayroll,
    context: { runtime: "server" },
  });

  const publicPost = createPublicCommunityObject("post_1", "tenant_1");
  assertPermission({
    action: "read",
    resource: "community.post",
    subject: { roles: ["guest"], isAuthenticated: false },
    object: publicPost,
    context: { runtime: "browser" },
  });

  const denied = evaluatePermission({
    action: "track",
    resource: "ads.event",
    subject: {
      roles: ["operations"],
      isAuthenticated: true,
      userId: "op_1",
      tenantId: "tenant_1",
      consent: { adsPersonalization: true },
    },
    object: { resource: "ads.event", tenantId: "tenant_1" },
    context: {
      runtime: "server",
      rawFinancialPayloadRequested: true,
      purpose: "ads",
    },
  });
  if (denied.allowed)
    throw new SecurityPermissionError(
      "PERMISSION_SELF_TEST_FAILED",
      "Raw financial ads flow must be denied.",
      denied,
    );

  const report = getPermissionCompletenessReport();
  if (!report.ok)
    throw new SecurityPermissionError(
      "PERMISSION_SELF_TEST_INCOMPLETE",
      `Permission self-test failed: ${report.missing.join(", ")}`,
      denyDecision("permission self-test incomplete"),
    );
  return report;
};

assertPermissionModuleCompleteness();

export const permissionSecurityContract = Object.freeze({
  contractVersion: SECURITY_PERMISSION_CONTRACT_VERSION,
  packageScope: SECURITY_PERMISSION_PACKAGE_SCOPE,
  roles: ROLES,
  actions: ACTIONS,
  resources: RESOURCES,
  accessRules,
  policySnapshot: permissionPolicySnapshot,
  serverAuthorityRequired: true,
  tenantBoundaryRequired: true,
  ownerBoundaryRequired: true,
  adminMfaRequired: true,
  auditLogRequired: true,
  rawSecretAccessAllowed: false,
  rawPiiLoggingAllowed: false,
  rawFinancialDataInAdsOrCommunityAllowed: false,
  browserDirectDatabaseAccessAllowed: false,
  clientFinalCalculationAllowed: false,
  functions: Object.freeze({
    evaluatePermission: true,
    assertPermission: true,
    requirePermission: true,
    can: true,
    getAllowedActions: true,
    getPermissionObligations: true,
    filterReadableObjects: true,
    getPermissionCompletenessReport: true,
    assertPermissionModuleCompleteness: true,
    runPermissionSelfTest: true,
  }),
});

export default permissionSecurityContract;
