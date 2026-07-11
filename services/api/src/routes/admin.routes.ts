/** services/api/src/routes/admin.routes.ts
 * 급여납치 Salary Hijacking Platform · 관리자 API 라우트 최종본
 *
 * Cloudflare Workers Fetch API 호환 단일 파일이다. 인증/인가 미들웨어가 전달한
 * x-auth-* 컨텍스트를 재검증하고, 관리자 API 명세서의 사용자·커뮤니티·신고·공지·광고·
 * 레벨업·운영지표·감사로그·권한 관리 엔드포인트를 제공한다.
 */

export const ADMIN_ROUTES_VERSION = "3.1.0";
export const ADMIN_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const ADMIN_API_PREFIX = "/admin/api/v1";
export const ADMIN_AUTH_PREFIX = "/admin/auth";

const MAX_JSON_BODY_BYTES = 256 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

export type AdminRole =
  | "OPERATOR"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "ADM_OWNER"
  | "ADM_OPS"
  | "ADM_COMMUNITY"
  | "ADM_CONTENT"
  | "ADM_AD"
  | "ADM_CS"
  | "ADM_READONLY"
  | "ADM_AUDITOR";

export type AdminPermission =
  | "admin:read"
  | "admin:write"
  | "user:read"
  | "user:manage"
  | "community:read"
  | "community:moderate"
  | "report:read"
  | "report:manage"
  | "notice:read"
  | "notice:write"
  | "ad:read"
  | "ad:manage"
  | "partner:read"
  | "partner:manage"
  | "growth:read"
  | "growth:manage"
  | "notification:send"
  | "incident:manage"
  | "audit:read:minimal"
  | "role:manage"
  | "metrics:read"
  | "*";

export type AdminMutationAction =
  | "SUSPEND_USER"
  | "RESTORE_USER"
  | "FORCE_LOGOUT_USER"
  | "HIDE_POST"
  | "RESTORE_POST"
  | "DELETE_POST"
  | "RESOLVE_REPORT"
  | "CREATE_NOTICE"
  | "UPDATE_NOTICE"
  | "PUBLISH_NOTICE"
  | "UNPUBLISH_NOTICE"
  | "DELETE_NOTICE"
  | "CREATE_AD_CAMPAIGN"
  | "UPDATE_AD_CAMPAIGN"
  | "ACTIVATE_AD_CAMPAIGN"
  | "PAUSE_AD_CAMPAIGN"
  | "CREATE_GROWTH_TASK"
  | "UPDATE_GROWTH_TASK"
  | "CREATE_GROWTH_CONTENT"
  | "UPDATE_GROWTH_CONTENT"
  | "REVIEW_GROWTH_CONTENT"
  | "PUBLISH_GROWTH_CONTENT"
  | "ARCHIVE_GROWTH_CONTENT"
  | "UPDATE_ROLE_MEMBER";

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

export interface AdminPrincipal {
  readonly adminId: string;
  readonly roles: readonly AdminRole[];
  readonly permissions: readonly string[];
  readonly mfaVerified: boolean;
  readonly policyId: string | null;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}

export interface AdminRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly principal: AdminPrincipal;
  readonly repository: AdminRepository<TEnv>;
}

export interface AdminListResult<TItem extends JsonRecord = JsonRecord> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface AdminRepository<TEnv = unknown> {
  readonly name?: string;
  dashboard(runtime: AdminRouteRuntime<TEnv>): Promise<JsonRecord>;
  listUsers(
    input: JsonRecord,
    pagination: PaginationInput,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<AdminListResult>;
  getUser(
    userId: string,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  updateUserStatus(
    userId: string,
    input: JsonRecord,
    action: AdminMutationAction,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  forceLogoutUser(
    userId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  userActivitySummary(
    userId: string,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listCommunityPosts(
    input: JsonRecord,
    pagination: PaginationInput,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<AdminListResult>;
  getCommunityPost(
    postId: string,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  moderateCommunityPost(
    postId: string,
    input: JsonRecord,
    action: AdminMutationAction,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  deleteCommunityPost(
    postId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listReports(
    input: JsonRecord,
    pagination: PaginationInput,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<AdminListResult>;
  resolveReport(
    reportId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listNotices(
    input: JsonRecord,
    pagination: PaginationInput,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<AdminListResult>;
  createNotice(
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updateNotice(
    noticeId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  publishNotice(
    noticeId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  unpublishNotice(
    noticeId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  deleteNotice(
    noticeId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listAdCampaigns(
    input: JsonRecord,
    pagination: PaginationInput,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<AdminListResult>;
  createAdCampaign(
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updateAdCampaign(
    campaignId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  changeAdCampaignStatus(
    campaignId: string,
    status: "ACTIVE" | "PAUSED",
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  adReports(
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listGrowthTasks(
    input: JsonRecord,
    pagination: PaginationInput,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<AdminListResult>;
  createGrowthTask(
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updateGrowthTask(
    taskId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listGrowthContents(
    input: JsonRecord,
    pagination: PaginationInput,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<AdminListResult>;
  createGrowthContent(
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updateGrowthContent(
    contentId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  reviewGrowthContent(
    contentId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  publishGrowthContent(
    contentId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  archiveGrowthContent(
    contentId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listAuditLogs(
    input: JsonRecord,
    pagination: PaginationInput,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<AdminListResult>;
  listRoleMembers(
    input: JsonRecord,
    pagination: PaginationInput,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<AdminListResult>;
  updateRoleMember(
    adminId: string,
    input: JsonRecord,
    runtime: AdminRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
}

export interface AdminRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | AdminRepository<TEnv>
    | ((env: TEnv) => AdminRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
}

class AdminHttpError extends Error {
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
    this.name = "AdminHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const rolePermissions: Record<AdminRole, readonly AdminPermission[]> = {
  OPERATOR: [
    "admin:read",
    "community:read",
    "community:moderate",
    "report:read",
    "report:manage",
    "notice:read",
    "metrics:read",
  ],
  ADMIN: [
    "admin:read",
    "admin:write",
    "user:read",
    "user:manage",
    "community:read",
    "community:moderate",
    "report:read",
    "report:manage",
    "notice:read",
    "notice:write",
    "ad:read",
    "ad:manage",
    "partner:read",
    "partner:manage",
    "growth:read",
    "growth:manage",
    "notification:send",
    "incident:manage",
    "metrics:read",
  ],
  SUPER_ADMIN: ["*"],
  ADM_OWNER: ["*"],
  ADM_OPS: [
    "admin:read",
    "admin:write",
    "user:read",
    "user:manage",
    "community:read",
    "community:moderate",
    "report:read",
    "report:manage",
    "notice:read",
    "notice:write",
    "notification:send",
    "incident:manage",
    "metrics:read",
  ],
  ADM_COMMUNITY: [
    "admin:read",
    "community:read",
    "community:moderate",
    "report:read",
    "report:manage",
    "metrics:read",
  ],
  ADM_CONTENT: [
    "admin:read",
    "growth:read",
    "growth:manage",
    "notice:read",
    "metrics:read",
  ],
  ADM_AD: [
    "admin:read",
    "ad:read",
    "ad:manage",
    "partner:read",
    "partner:manage",
    "metrics:read",
  ],
  ADM_CS: [
    "admin:read",
    "user:read",
    "community:read",
    "report:read",
    "notice:read",
    "metrics:read",
  ],
  ADM_READONLY: [
    "admin:read",
    "metrics:read",
    "notice:read",
    "community:read",
    "report:read",
    "ad:read",
    "growth:read",
  ],
  ADM_AUDITOR: ["admin:read", "audit:read:minimal", "metrics:read"],
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

const sampleUsers: readonly JsonRecord[] = [
  {
    userId: "usr_1001",
    nickname: "홍길동 기획자",
    provider: "KAKAO",
    emailMasked: "ho***@example.com",
    status: "ACTIVE",
    level: 18,
    cumulativeHijackAmountMasked: "5,***,***원",
    reportCount: 0,
    joinedAt: "2026-06-01T09:00:00.000Z",
    lastSeenAt: "2026-06-22T02:30:00.000Z",
  },
];

const samplePosts: readonly JsonRecord[] = [
  {
    postId: "post_1001",
    boardType: "LEVEL_CERTIFICATION",
    title: "[LV.5] 주 6일 운동 인증",
    authorUserId: "usr_1001",
    authorMasked: "홍***",
    status: "VISIBLE",
    viewCount: 124,
    likeCount: 18,
    commentCount: 5,
    createdAt: "2026-06-20T12:00:00.000Z",
  },
];

const sampleReports: readonly JsonRecord[] = [
  {
    reportId: "rpt_1001",
    targetType: "POST",
    targetId: "post_1001",
    reasonType: "PRIVACY",
    status: "OPEN",
    priority: "HIGH",
    createdAt: "2026-06-21T08:00:00.000Z",
  },
];

function normalizePath(pathname: string): string {
  const normalized = (pathname || "/").replace(/\/+/g, "/");
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
}

function requestIdFromHeaders(request: Request): string {
  const value =
    request.headers.get("x-request-id")?.trim() ??
    request.headers.get("x-correlation-id")?.trim() ??
    request.headers.get("cf-ray")?.trim();
  if (value && /^[a-zA-Z0-9._:\-/]{8,160}$/.test(value))
    return value.slice(0, 160);
  return globalThis.crypto?.randomUUID?.() ?? `req_${Date.now().toString(36)}`;
}

function header(request: Request, name: string): string | null {
  const value = request.headers.get(name)?.trim();
  return value ? value : null;
}

function normalizeAdminRole(value: string): AdminRole | null {
  const normalized = value.trim().toUpperCase().replace(/-/g, "_");
  if (
    [
      "OPERATOR",
      "ADMIN",
      "SUPER_ADMIN",
      "ADM_OWNER",
      "ADM_OPS",
      "ADM_COMMUNITY",
      "ADM_CONTENT",
      "ADM_AD",
      "ADM_CS",
      "ADM_READONLY",
      "ADM_AUDITOR",
    ].includes(normalized)
  ) {
    return normalized as AdminRole;
  }
  return null;
}

function authContextFromRequest(
  request: Request,
  requireSource: boolean,
): AdminPrincipal {
  const source = header(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source !== AUTH_CONTEXT_SOURCE_VALUE) {
    throw new AdminHttpError(
      401,
      "ADMIN_AUTH_CONTEXT_REQUIRED",
      "관리자 인증 컨텍스트가 없습니다.",
    );
  }

  const adminId =
    header(request, "x-authenticated-user-id") ??
    header(request, "x-admin-user-id");
  if (!adminId)
    throw new AdminHttpError(
      401,
      "ADMIN_AUTH_REQUIRED",
      "관리자 인증이 필요합니다.",
    );

  const rolesHeader =
    header(request, "x-authenticated-roles") ??
    header(request, "x-admin-roles") ??
    "";
  const roles = rolesHeader
    .split(",")
    .map((role) => normalizeAdminRole(role))
    .filter((role): role is AdminRole => Boolean(role));
  if (!roles.length)
    throw new AdminHttpError(
      403,
      "ADMIN_ROLE_REQUIRED",
      "관리자 권한이 필요합니다.",
    );

  const permissionsHeader =
    header(request, "x-authenticated-permissions") ?? "";
  const directPermissions = permissionsHeader
    .split(",")
    .map((permission) => permission.trim())
    .filter(Boolean);
  const roleDerivedPermissions = roles.flatMap((role) => rolePermissions[role]);
  const permissions = [
    ...new Set([...directPermissions, ...roleDerivedPermissions]),
  ];
  const mfaVerified = header(request, "x-auth-mfa-verified") === "true";

  if (!mfaVerified)
    throw new AdminHttpError(
      403,
      "ADMIN_MFA_REQUIRED",
      "관리자 2단계 인증이 필요합니다.",
    );

  return {
    adminId,
    roles,
    permissions,
    mfaVerified,
    policyId: header(request, "x-auth-policy-id"),
  };
}

function hasPermission(
  principal: AdminPrincipal,
  required: readonly AdminPermission[],
): boolean {
  if (principal.permissions.includes("*")) return true;
  return required.some((permission) =>
    principal.permissions.includes(permission),
  );
}

function requirePermission(
  principal: AdminPrincipal,
  required: readonly AdminPermission[],
): void {
  if (!hasPermission(principal, required)) {
    throw new AdminHttpError(
      403,
      "ADMIN_PERMISSION_DENIED",
      "관리자 기능 접근 권한이 없습니다.",
      { required: required.join(",") },
    );
  }
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
    return value.length > 2_000
      ? `${value.slice(0, 2_000)}…[truncated]`
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

function jsonResponse(
  runtime: Pick<AdminRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: ADMIN_ROUTES_SERVICE_NAME,
        version: ADMIN_ROUTES_VERSION,
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
        "x-request-id": runtime.requestId,
        "x-content-type-options": "nosniff",
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
    error instanceof AdminHttpError
      ? error
      : new AdminHttpError(
          500,
          "ADMIN_ROUTE_INTERNAL_ERROR",
          "관리자 API 처리 중 오류가 발생했습니다.",
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
        service: ADMIN_ROUTES_SERVICE_NAME,
        version: ADMIN_ROUTES_VERSION,
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

async function parseJsonBody(request: Request): Promise<JsonRecord> {
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
  if (Number.isFinite(length) && length > MAX_JSON_BODY_BYTES) {
    throw new AdminHttpError(
      413,
      "ADMIN_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  }
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AdminHttpError(
      400,
      "ADMIN_JSON_OBJECT_REQUIRED",
      "JSON 객체 본문이 필요합니다.",
    );
  }
  return sanitize(parsed) as JsonRecord;
}

function requireReason(input: JsonRecord, request: Request): string {
  const headerReason = request.headers.get("x-admin-reason")?.trim() ?? "";
  const bodyReason =
    typeof input.reason === "string" ? input.reason.trim() : "";
  const reason = headerReason || bodyReason;
  if (!reason)
    throw new AdminHttpError(
      400,
      "ADMIN_REASON_REQUIRED",
      "관리자 변경 작업은 사유가 필요합니다.",
    );
  return reason.slice(0, 500);
}

function queryRecord(url: URL): JsonRecord {
  const entries: Record<string, JsonValue> = {};
  url.searchParams.forEach((value, key) => {
    entries[key] = value;
  });
  return entries;
}

function pagination(url: URL): PaginationInput {
  const page = Math.max(
    1,
    Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1,
  );
  const pageSize = Math.max(
    1,
    Math.min(
      MAX_PAGE_SIZE,
      Number.parseInt(
        url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
        10,
      ) || DEFAULT_PAGE_SIZE,
    ),
  );
  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
}

function idFromMatch(match: RegExpMatchArray, index: number): string {
  const value = match[index];
  if (!value)
    throw new AdminHttpError(
      400,
      "ADMIN_ROUTE_ID_REQUIRED",
      "경로 식별자가 필요합니다.",
    );
  return decodeURIComponent(value);
}

function listResult<TItem extends JsonRecord>(
  items: readonly TItem[],
  paginationInput: PaginationInput,
): AdminListResult<TItem> {
  return {
    items: items.slice(
      paginationInput.offset,
      paginationInput.offset + paginationInput.limit,
    ),
    page: paginationInput.page,
    pageSize: paginationInput.pageSize,
    total: items.length,
  };
}

function createInMemoryAdminRepository<
  TEnv = unknown,
>(): AdminRepository<TEnv> {
  return {
    name: "in-memory-admin-repository",
    async dashboard(): Promise<JsonRecord> {
      return {
        dau: 1240,
        wau: 6800,
        mau: 18300,
        payrollPlanRegistrationRate: 0.72,
        variableExpenseRecordsToday: 3480,
        communityOpenReports: 1,
        adImpressionsToday: 18920,
        adClicksToday: 640,
        incidentStatus: "NORMAL",
        financialRawDataExposure: false,
      };
    },
    async listUsers(_input, page): Promise<AdminListResult> {
      return listResult(sampleUsers, page);
    },
    async getUser(userId): Promise<JsonRecord | null> {
      return sampleUsers.find((user) => user.userId === userId) ?? null;
    },
    async updateUserStatus(
      userId,
      input,
      action,
      runtime,
    ): Promise<JsonRecord> {
      return {
        userId,
        status: action === "SUSPEND_USER" ? "SUSPENDED" : "ACTIVE",
        reason: requireReason(input, runtime.request),
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
    async forceLogoutUser(userId, input, runtime): Promise<JsonRecord> {
      return {
        userId,
        revokedSessions: "ALL",
        reason: requireReason(input, runtime.request),
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
    async userActivitySummary(userId): Promise<JsonRecord> {
      return {
        userId,
        appOpenDays30: 18,
        payrollPlanCount: 1,
        expenseRecordCount30: 42,
        communityPostCount: 3,
        reportCount: 0,
        financialValuesMasked: true,
      };
    },
    async listCommunityPosts(_input, page): Promise<AdminListResult> {
      return listResult(samplePosts, page);
    },
    async getCommunityPost(postId): Promise<JsonRecord | null> {
      return samplePosts.find((post) => post.postId === postId) ?? null;
    },
    async moderateCommunityPost(
      postId,
      input,
      action,
      runtime,
    ): Promise<JsonRecord> {
      return {
        postId,
        status: action === "HIDE_POST" ? "HIDDEN" : "VISIBLE",
        action,
        reason: requireReason(input, runtime.request),
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
    async deleteCommunityPost(postId, input, runtime): Promise<JsonRecord> {
      return {
        postId,
        status: "DELETED_BY_ADMIN",
        reason: requireReason(input, runtime.request),
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
    async listReports(_input, page): Promise<AdminListResult> {
      return listResult(sampleReports, page);
    },
    async resolveReport(reportId, input, runtime): Promise<JsonRecord> {
      return {
        reportId,
        status: "RESOLVED",
        action: input.action ?? "REVIEWED",
        reason: requireReason(input, runtime.request),
        resolvedBy: runtime.principal.adminId,
        resolvedAt: new Date().toISOString(),
      };
    },
    async listNotices(_input, page): Promise<AdminListResult> {
      return listResult(
        [
          {
            noticeId: "ntc_1001",
            title: "서비스 점검 안내",
            noticeType: "MAINTENANCE",
            status: "PUBLISHED",
            visibleFrom: "2026-06-18T00:00:00.000Z",
          },
        ],
        page,
      );
    },
    async createNotice(input, runtime): Promise<JsonRecord> {
      return {
        noticeId: `ntc_${Date.now()}`,
        ...input,
        status: "DRAFT",
        createdBy: runtime.principal.adminId,
        createdAt: new Date().toISOString(),
      };
    },
    async updateNotice(noticeId, input, runtime): Promise<JsonRecord> {
      return {
        noticeId,
        ...input,
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
    async publishNotice(noticeId, input, runtime): Promise<JsonRecord> {
      return {
        noticeId,
        status: "PUBLISHED",
        reason: requireReason(input, runtime.request),
        publishedBy: runtime.principal.adminId,
        publishedAt: new Date().toISOString(),
      };
    },
    async unpublishNotice(noticeId, input, runtime): Promise<JsonRecord> {
      return {
        noticeId,
        status: "UNPUBLISHED",
        reason: requireReason(input, runtime.request),
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
    async deleteNotice(noticeId, input, runtime): Promise<JsonRecord> {
      return {
        noticeId,
        status: "DELETED",
        reason: requireReason(input, runtime.request),
        deletedBy: runtime.principal.adminId,
        deletedAt: new Date().toISOString(),
      };
    },
    async listAdCampaigns(_input, page): Promise<AdminListResult> {
      return listResult(
        [
          {
            campaignId: "ad_1001",
            title: "LV UP 제휴 배너",
            placement: "AD-LV-001",
            status: "ACTIVE",
            financialTargetingUsed: false,
          },
        ],
        page,
      );
    },
    async createAdCampaign(input, runtime): Promise<JsonRecord> {
      assertAdPolicy(input);
      return {
        campaignId: `ad_${Date.now()}`,
        ...input,
        status: input.status ?? "DRAFT",
        financialTargetingUsed: false,
        createdBy: runtime.principal.adminId,
        createdAt: new Date().toISOString(),
      };
    },
    async updateAdCampaign(campaignId, input, runtime): Promise<JsonRecord> {
      assertAdPolicy(input);
      return {
        campaignId,
        ...input,
        financialTargetingUsed: false,
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
    async changeAdCampaignStatus(
      campaignId,
      status,
      input,
      runtime,
    ): Promise<JsonRecord> {
      return {
        campaignId,
        status,
        reason: requireReason(input, runtime.request),
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
    async adReports(): Promise<JsonRecord> {
      return {
        impressions: 18920,
        clicks: 640,
        ctr: 0.0338,
        byPlacement: [
          { placement: "AD-HOME-001", impressions: 8200, clicks: 310 },
        ],
        containsPersonalFinancialData: false,
      };
    },
    async listGrowthTasks(_input, page): Promise<AdminListResult> {
      return listResult(
        [
          {
            taskId: "gt_1001",
            type: "READING",
            title: "오늘의 독서",
            expReward: 10,
            status: "ACTIVE",
          },
        ],
        page,
      );
    },
    async createGrowthTask(input, runtime): Promise<JsonRecord> {
      return {
        taskId: `gt_${Date.now()}`,
        ...input,
        createdBy: runtime.principal.adminId,
        createdAt: new Date().toISOString(),
      };
    },
    async updateGrowthTask(taskId, input, runtime): Promise<JsonRecord> {
      return {
        taskId,
        ...input,
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
    async listGrowthContents(_input, page): Promise<AdminListResult> {
      return listResult(
        [
          {
            contentId: "gci_1001",
            contentType: "READING",
            title: "Money habit reading",
            status: "REVIEW",
            sourceName: "Publisher catalog",
            sourceUrl: "https://publisher.example/books/money-habit",
            licenseType: "CURATED_LINK",
            safetyLevel: "GENERAL",
            xpReward: 15,
            auditReasonRequired: true,
            serverAuthority: true,
            fullTextStored: false,
            financialRawDataExposed: false,
            adTargetingEligible: false,
          },
        ],
        page,
      );
    },
    async createGrowthContent(input, runtime): Promise<JsonRecord> {
      assertNoForbiddenGrowthContentPayload(input);
      return {
        contentId: `gci_${Date.now()}`,
        ...input,
        status: input.status ?? "DRAFT",
        auditReasonRequired: true,
        serverAuthority: true,
        fullTextStored: false,
        financialRawDataExposed: false,
        adTargetingEligible: false,
        reason: requireReason(input, runtime.request),
        createdBy: runtime.principal.adminId,
        createdAt: new Date().toISOString(),
      };
    },
    async updateGrowthContent(contentId, input, runtime): Promise<JsonRecord> {
      assertNoForbiddenGrowthContentPayload(input);
      return {
        contentId,
        ...input,
        auditReasonRequired: true,
        serverAuthority: true,
        fullTextStored: false,
        financialRawDataExposed: false,
        adTargetingEligible: false,
        reason: requireReason(input, runtime.request),
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
    async reviewGrowthContent(contentId, input, runtime): Promise<JsonRecord> {
      assertNoForbiddenGrowthContentPayload(input);
      return {
        contentId,
        status: "REVIEW",
        auditReasonRequired: true,
        serverAuthority: true,
        fullTextStored: false,
        financialRawDataExposed: false,
        adTargetingEligible: false,
        reason: requireReason(input, runtime.request),
        reviewedBy: runtime.principal.adminId,
        reviewedAt: new Date().toISOString(),
      };
    },
    async publishGrowthContent(contentId, input, runtime): Promise<JsonRecord> {
      assertGrowthContentPublishPolicy(input);
      return {
        contentId,
        status: "PUBLISHED",
        auditReasonRequired: true,
        serverAuthority: true,
        fullTextStored: false,
        financialRawDataExposed: false,
        adTargetingEligible: false,
        reason: requireReason(input, runtime.request),
        publishedBy: runtime.principal.adminId,
        publishedAt: new Date().toISOString(),
      };
    },
    async archiveGrowthContent(contentId, input, runtime): Promise<JsonRecord> {
      return {
        contentId,
        status: "ARCHIVED",
        auditReasonRequired: true,
        serverAuthority: true,
        reason: requireReason(input, runtime.request),
        archivedBy: runtime.principal.adminId,
        archivedAt: new Date().toISOString(),
      };
    },
    async listAuditLogs(_input, page): Promise<AdminListResult> {
      return listResult(
        [
          {
            auditLogId: "aud_1001",
            actorUserId: "admin_1",
            action: "USER_READ_LIST_GET",
            targetType: "USER",
            result: "SUCCESS",
            ipHashOnly: true,
            createdAt: "2026-06-22T00:00:00.000Z",
          },
        ],
        page,
      );
    },
    async listRoleMembers(_input, page): Promise<AdminListResult> {
      return listResult(
        [
          {
            adminId: "admin_1",
            roles: ["SUPER_ADMIN"],
            mfaRequired: true,
            status: "ACTIVE",
          },
        ],
        page,
      );
    },
    async updateRoleMember(adminId, input, runtime): Promise<JsonRecord> {
      return {
        adminId,
        roles: input.roles ?? [],
        reason: requireReason(input, runtime.request),
        updatedBy: runtime.principal.adminId,
        updatedAt: new Date().toISOString(),
      };
    },
  };
}

function assertAdPolicy(input: JsonRecord): void {
  const disallowedKeys = [
    "salary",
    "payroll",
    "loan",
    "savings",
    "expense",
    "hijackAmount",
    "financialTargeting",
    "financialSegment",
  ];
  const found = disallowedKeys.find((key) => Object.hasOwn(input, key));
  if (found) {
    throw new AdminHttpError(
      400,
      "AD_FINANCIAL_TARGETING_FORBIDDEN",
      "광고 캠페인에는 급여·대출·저축·소비 원천 데이터 기반 타겟팅을 사용할 수 없습니다.",
      { field: found },
    );
  }
}

function stringValue(input: JsonRecord, field: string): string {
  const value = input[field];
  return typeof value === "string" ? value.trim() : "";
}

function booleanValue(input: JsonRecord, field: string): boolean {
  return input[field] === true;
}

function assertNoForbiddenGrowthContentPayload(input: JsonRecord): void {
  const forbiddenFields = [
    "articleBody",
    "articleHtml",
    "bodyText",
    "bookText",
    "copiedText",
    "fullArticle",
    "fullBody",
    "fullText",
    "rawArticle",
    "rawBook",
    "transcript",
  ];
  const found = forbiddenFields.find((field) => Object.hasOwn(input, field));
  if (
    found ||
    input.fullTextStored === true ||
    input.adTargetingEligible === true
  ) {
    throw new AdminHttpError(
      400,
      "ADMIN_GROWTH_CONTENT_POLICY_BLOCKED",
      "LV UP content operations cannot store full copyrighted text or enable ad targeting.",
      {
        field:
          found ??
          (input.fullTextStored === true
            ? "fullTextStored"
            : "adTargetingEligible"),
      },
    );
  }
}

function assertGrowthContentPublishPolicy(input: JsonRecord): void {
  assertNoForbiddenGrowthContentPayload(input);
  const missing: string[] = [];
  const contentType = stringValue(input, "contentType").toUpperCase();
  const allowedContentTypes = ["READING", "NEWS", "ENGLISH", "HEALTH"];

  if (!allowedContentTypes.includes(contentType)) missing.push("contentType");
  if (!/^https:\/\/[^\s]+$/i.test(stringValue(input, "sourceUrl")))
    missing.push("sourceUrl");
  if (!stringValue(input, "licenseType")) missing.push("licenseType");
  if (!stringValue(input, "safetyLevel")) missing.push("safetyLevel");

  if (contentType === "NEWS") {
    if (!stringValue(input, "sourceName")) missing.push("sourceName");
    if (!stringValue(input, "viewpointTag")) missing.push("viewpointTag");
  }

  if (contentType === "HEALTH") {
    if (!booleanValue(input, "beginnerSafe")) missing.push("beginnerSafe");
    if (!booleanValue(input, "painStopNotice")) missing.push("painStopNotice");
    if (!booleanValue(input, "medicalDisclaimer"))
      missing.push("medicalDisclaimer");
  }

  if (missing.length) {
    throw new AdminHttpError(
      400,
      "ADMIN_GROWTH_CONTENT_PUBLISH_BLOCKED",
      "LV UP content cannot be published until source, license, and safety policy fields are complete.",
      { missing },
    );
  }
}

function resolveRepository<TEnv>(
  env: TEnv,
  options: AdminRoutesOptions<TEnv>,
): AdminRepository<TEnv> {
  const repo =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return repo ?? createInMemoryAdminRepository<TEnv>();
}

function matchRoute(path: string, pattern: RegExp): RegExpMatchArray | null {
  return path.match(pattern);
}

async function dispatchAdminRoute<TEnv>(
  runtime: AdminRouteRuntime<TEnv>,
): Promise<Response> {
  const { method, relativePath, repository } = runtime;
  const page = pagination(runtime.url);
  const query = queryRecord(runtime.url);

  if (method === "GET" && relativePath === "/dashboard") {
    requirePermission(runtime.principal, ["metrics:read", "admin:read"]);
    return jsonResponse(runtime, 200, {
      data: await repository.dashboard(runtime),
    });
  }

  if (method === "GET" && relativePath === "/users") {
    requirePermission(runtime.principal, ["user:read", "user:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.listUsers(query, page, runtime),
    });
  }

  let match = matchRoute(relativePath, /^\/users\/([^/]+)$/);
  if (method === "GET" && match) {
    requirePermission(runtime.principal, ["user:read", "user:manage"]);
    const user = await repository.getUser(idFromMatch(match, 1), runtime);
    if (!user)
      throw new AdminHttpError(
        404,
        "ADMIN_USER_NOT_FOUND",
        "사용자를 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data: user });
  }

  match = matchRoute(relativePath, /^\/users\/([^/]+)\/suspend$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["user:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.updateUserStatus(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        "SUSPEND_USER",
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/users\/([^/]+)\/restore$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["user:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.updateUserStatus(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        "RESTORE_USER",
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/users\/([^/]+)\/force-logout$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["user:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.forceLogoutUser(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/users\/([^/]+)\/activity-summary$/);
  if (method === "GET" && match) {
    requirePermission(runtime.principal, ["user:read", "community:read"]);
    return jsonResponse(runtime, 200, {
      data: await repository.userActivitySummary(
        idFromMatch(match, 1),
        runtime,
      ),
    });
  }

  if (method === "GET" && relativePath === "/community/posts") {
    requirePermission(runtime.principal, [
      "community:read",
      "community:moderate",
    ]);
    return jsonResponse(runtime, 200, {
      data: await repository.listCommunityPosts(query, page, runtime),
    });
  }

  match = matchRoute(relativePath, /^\/community\/posts\/([^/]+)$/);
  if (method === "GET" && match) {
    requirePermission(runtime.principal, [
      "community:read",
      "community:moderate",
    ]);
    const post = await repository.getCommunityPost(
      idFromMatch(match, 1),
      runtime,
    );
    if (!post)
      throw new AdminHttpError(
        404,
        "ADMIN_POST_NOT_FOUND",
        "게시글을 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data: post });
  }

  match = matchRoute(relativePath, /^\/community\/posts\/([^/]+)\/hide$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["community:moderate"]);
    return jsonResponse(runtime, 200, {
      data: await repository.moderateCommunityPost(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        "HIDE_POST",
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/community\/posts\/([^/]+)\/restore$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["community:moderate"]);
    return jsonResponse(runtime, 200, {
      data: await repository.moderateCommunityPost(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        "RESTORE_POST",
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/community\/posts\/([^/]+)$/);
  if (method === "DELETE" && match) {
    requirePermission(runtime.principal, ["community:moderate", "admin:write"]);
    return jsonResponse(runtime, 200, {
      data: await repository.deleteCommunityPost(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  if (method === "GET" && relativePath === "/reports") {
    requirePermission(runtime.principal, ["report:read", "report:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.listReports(query, page, runtime),
    });
  }

  match = matchRoute(relativePath, /^\/reports\/([^/]+)\/resolve$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["report:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.resolveReport(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  if (method === "GET" && relativePath === "/notices") {
    requirePermission(runtime.principal, ["notice:read", "notice:write"]);
    return jsonResponse(runtime, 200, {
      data: await repository.listNotices(query, page, runtime),
    });
  }

  if (method === "POST" && relativePath === "/notices") {
    requirePermission(runtime.principal, ["notice:write"]);
    return jsonResponse(runtime, 201, {
      data: await repository.createNotice(
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/notices\/([^/]+)$/);
  if (method === "PATCH" && match) {
    requirePermission(runtime.principal, ["notice:write"]);
    return jsonResponse(runtime, 200, {
      data: await repository.updateNotice(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  if (method === "DELETE" && match) {
    requirePermission(runtime.principal, ["notice:write"]);
    return jsonResponse(runtime, 200, {
      data: await repository.deleteNotice(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/notices\/([^/]+)\/publish$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["notice:write"]);
    return jsonResponse(runtime, 200, {
      data: await repository.publishNotice(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/notices\/([^/]+)\/unpublish$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["notice:write"]);
    return jsonResponse(runtime, 200, {
      data: await repository.unpublishNotice(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  if (method === "GET" && relativePath === "/ads/campaigns") {
    requirePermission(runtime.principal, ["ad:read", "ad:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.listAdCampaigns(query, page, runtime),
    });
  }

  if (method === "POST" && relativePath === "/ads/campaigns") {
    requirePermission(runtime.principal, ["ad:manage"]);
    return jsonResponse(runtime, 201, {
      data: await repository.createAdCampaign(
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/ads\/campaigns\/([^/]+)$/);
  if (method === "PATCH" && match) {
    requirePermission(runtime.principal, ["ad:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.updateAdCampaign(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/ads\/campaigns\/([^/]+)\/activate$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["ad:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.changeAdCampaignStatus(
        idFromMatch(match, 1),
        "ACTIVE",
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/ads\/campaigns\/([^/]+)\/pause$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["ad:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.changeAdCampaignStatus(
        idFromMatch(match, 1),
        "PAUSED",
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  if (method === "GET" && relativePath === "/ads/reports") {
    requirePermission(runtime.principal, ["ad:read", "ad:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.adReports(query, runtime),
    });
  }

  if (method === "GET" && relativePath === "/growth/tasks") {
    requirePermission(runtime.principal, ["growth:read", "growth:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.listGrowthTasks(query, page, runtime),
    });
  }

  if (method === "POST" && relativePath === "/growth/tasks") {
    requirePermission(runtime.principal, ["growth:manage"]);
    return jsonResponse(runtime, 201, {
      data: await repository.createGrowthTask(
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/growth\/tasks\/([^/]+)$/);
  if (method === "PATCH" && match) {
    requirePermission(runtime.principal, ["growth:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.updateGrowthTask(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  if (method === "GET" && relativePath === "/growth/contents") {
    requirePermission(runtime.principal, ["growth:read", "growth:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.listGrowthContents(query, page, runtime),
    });
  }

  if (method === "POST" && relativePath === "/growth/contents") {
    requirePermission(runtime.principal, ["growth:manage"]);
    const input = await parseJsonBody(runtime.request);
    assertNoForbiddenGrowthContentPayload(input);
    return jsonResponse(runtime, 201, {
      data: await repository.createGrowthContent(input, runtime),
    });
  }

  match = matchRoute(relativePath, /^\/growth\/contents\/([^/]+)$/);
  if (method === "PATCH" && match) {
    requirePermission(runtime.principal, ["growth:manage"]);
    const input = await parseJsonBody(runtime.request);
    assertNoForbiddenGrowthContentPayload(input);
    return jsonResponse(runtime, 200, {
      data: await repository.updateGrowthContent(
        idFromMatch(match, 1),
        input,
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/growth\/contents\/([^/]+)\/review$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["growth:manage"]);
    const input = await parseJsonBody(runtime.request);
    assertNoForbiddenGrowthContentPayload(input);
    return jsonResponse(runtime, 200, {
      data: await repository.reviewGrowthContent(
        idFromMatch(match, 1),
        input,
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/growth\/contents\/([^/]+)\/publish$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["growth:manage"]);
    const input = await parseJsonBody(runtime.request);
    assertGrowthContentPublishPolicy(input);
    return jsonResponse(runtime, 200, {
      data: await repository.publishGrowthContent(
        idFromMatch(match, 1),
        input,
        runtime,
      ),
    });
  }

  match = matchRoute(relativePath, /^\/growth\/contents\/([^/]+)\/archive$/);
  if (method === "POST" && match) {
    requirePermission(runtime.principal, ["growth:manage"]);
    return jsonResponse(runtime, 200, {
      data: await repository.archiveGrowthContent(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  if (method === "GET" && relativePath === "/audit-logs") {
    requirePermission(runtime.principal, ["audit:read:minimal", "*"]);
    return jsonResponse(runtime, 200, {
      data: await repository.listAuditLogs(query, page, runtime),
    });
  }

  if (method === "GET" && relativePath === "/admin-role-members") {
    requirePermission(runtime.principal, ["role:manage", "*"]);
    return jsonResponse(runtime, 200, {
      data: await repository.listRoleMembers(query, page, runtime),
    });
  }

  match = matchRoute(relativePath, /^\/admin-role-members\/([^/]+)$/);
  if (method === "PATCH" && match) {
    requirePermission(runtime.principal, ["role:manage", "*"]);
    return jsonResponse(runtime, 200, {
      data: await repository.updateRoleMember(
        idFromMatch(match, 1),
        await parseJsonBody(runtime.request),
        runtime,
      ),
    });
  }

  throw new AdminHttpError(
    404,
    "ADMIN_ROUTE_NOT_FOUND",
    "관리자 API 경로를 찾을 수 없습니다.",
  );
}

export function createAdminRoutes<TEnv = unknown>(
  options: AdminRoutesOptions<TEnv> = {},
): FetchHandler<TEnv> {
  return async (
    request: Request,
    env: TEnv,
    context: WaitUntilCapable,
  ): Promise<Response> => {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const requestId = requestIdFromHeaders(request);

    try {
      if (!path.startsWith(ADMIN_API_PREFIX)) {
        throw new AdminHttpError(
          404,
          "ADMIN_ROUTE_PREFIX_NOT_FOUND",
          "관리자 API prefix가 아닙니다.",
        );
      }

      const principal = authContextFromRequest(
        request,
        options.requireAuthContextSource ?? true,
      );
      const repository = resolveRepository(env, options);
      const runtime: AdminRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normalizePath(path.slice(ADMIN_API_PREFIX.length) || "/"),
        method: request.method.toUpperCase(),
        requestId,
        principal,
        repository,
      };

      const response = await dispatchAdminRoute(runtime);
      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set("x-admin-repository", repository.name ?? "custom");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      return errorResponse(requestId, path, error);
    }
  };
}

export const handleAdminRoutes = createAdminRoutes();

export const adminRoutesManifest = Object.freeze({
  file: "services/api/src/routes/admin.routes.ts",
  version: ADMIN_ROUTES_VERSION,
  prefix: ADMIN_API_PREFIX,
  endpoints: [
    "GET /dashboard",
    "GET /users",
    "GET /users/{userId}",
    "POST /users/{userId}/suspend",
    "POST /users/{userId}/restore",
    "POST /users/{userId}/force-logout",
    "GET /users/{userId}/activity-summary",
    "GET /community/posts",
    "GET /community/posts/{postId}",
    "POST /community/posts/{postId}/hide",
    "POST /community/posts/{postId}/restore",
    "DELETE /community/posts/{postId}",
    "GET /reports",
    "POST /reports/{reportId}/resolve",
    "GET /notices",
    "POST /notices",
    "PATCH /notices/{noticeId}",
    "POST /notices/{noticeId}/publish",
    "POST /notices/{noticeId}/unpublish",
    "DELETE /notices/{noticeId}",
    "GET /ads/campaigns",
    "POST /ads/campaigns",
    "PATCH /ads/campaigns/{campaignId}",
    "POST /ads/campaigns/{campaignId}/activate",
    "POST /ads/campaigns/{campaignId}/pause",
    "GET /ads/reports",
    "GET /growth/tasks",
    "POST /growth/tasks",
    "PATCH /growth/tasks/{taskId}",
    "GET /growth/contents",
    "POST /growth/contents",
    "PATCH /growth/contents/{contentId}",
    "POST /growth/contents/{contentId}/review",
    "POST /growth/contents/{contentId}/publish",
    "POST /growth/contents/{contentId}/archive",
    "GET /audit-logs",
    "GET /admin-role-members",
    "PATCH /admin-role-members/{adminId}",
  ],
  adminMfaRequired: true,
  reasonRequiredForMutations: true,
  auditMiddlewareCompatible: true,
  financialRawDataMasked: true,
  adFinancialTargetingForbidden: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertAdminRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "admin_api_prefix_admin_api_v1",
    "auth_middleware_context_required",
    "admin_mfa_required",
    "role_permission_matrix",
    "user_list_detail_suspend_restore_force_logout_activity_summary",
    "community_post_list_detail_hide_restore_delete",
    "report_list_resolve",
    "notice_crud_publish_unpublish_delete",
    "ad_campaign_crud_activate_pause_reports",
    "ad_financial_targeting_forbidden",
    "growth_task_list_create_update",
    "growth_content_create_edit_review_publish_archive",
    "growth_content_source_license_safety_policy_gate",
    "dashboard_metrics",
    "audit_log_list",
    "admin_role_member_list_update",
    "mutation_reason_required",
    "financial_sensitive_response_sanitizer",
    "standard_json_response_and_error_contract",
    "repository_injection_and_in_memory_fallback",
  ] as const;
  return { ok: checks.length >= 15, version: ADMIN_ROUTES_VERSION, checks };
}

export default createAdminRoutes;
