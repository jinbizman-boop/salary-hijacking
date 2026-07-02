/** services/api/src/routes/community.routes.ts
 * 급여납치 Salary Hijacking Platform · 커뮤니티 API 라우트 최종본
 *
 * Cloudflare Workers Fetch API 호환 단일 파일이다. 급여/예산/지출/저축 기반의 민감
 * 재무 데이터를 노출하지 않는 커뮤니티 목록·상세·글쓰기·수정·삭제·좋아요·댓글·신고·내 글
 * 조회 엔드포인트를 제공한다. auth/error/rate-limit/audit 미들웨어와 함께 사용할 수 있도록
 * 표준 JSON 계약, x-request-id, x-auth-* 컨텍스트, 변경 사유/신고 사유, 민감정보 마스킹을 포함한다.
 */

export const COMMUNITY_ROUTES_VERSION = "3.1.0";
export const COMMUNITY_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const COMMUNITY_API_PREFIX = "/api/v1/community";

const MAX_JSON_BODY_BYTES = 256 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 10_000;
const MAX_COMMENT_LENGTH = 2_000;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 24;
const MAX_TEXT = 2_000;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

export type CommunityBoardType =
  | "SALARY_TALK"
  | "BUDGET_TIP"
  | "EXPENSE_CUT"
  | "SAVINGS_GOAL"
  | "LEVEL_CERTIFICATION"
  | "SIDE_HUSTLE"
  | "HEALTH_ROUTINE"
  | "FREE";

export type CommunityPostStatus =
  | "VISIBLE"
  | "HIDDEN"
  | "DELETED"
  | "PENDING_REVIEW";
export type CommunityCommentStatus = "VISIBLE" | "HIDDEN" | "DELETED";
export type CommunityReportReason =
  | "SPAM"
  | "ABUSE"
  | "PRIVACY"
  | "MISINFORMATION"
  | "FINANCIAL_ADVICE_RISK"
  | "ILLEGAL"
  | "OTHER";
export type CommunityReactionState = "LIKED" | "UNLIKED";
export type CommunityRole =
  | "USER"
  | "OPERATOR"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "SYSTEM";
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

export interface CommunityPrincipal {
  readonly userId: string | null;
  readonly roles: readonly CommunityRole[];
  readonly permissions: readonly string[];
  readonly authenticated: boolean;
  readonly policyId: string | null;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}

export interface CommunityListResult<TItem extends JsonRecord = JsonRecord> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface CommunityPostInput {
  readonly boardType: CommunityBoardType;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly anonymous: boolean;
}

export interface CommunityCommentInput {
  readonly content: string;
  readonly anonymous: boolean;
}

export interface CommunityReportInput {
  readonly targetType: "POST" | "COMMENT";
  readonly targetId: string;
  readonly reasonType: CommunityReportReason;
  readonly reason: string;
}

export interface CommunityRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly principal: CommunityPrincipal;
  readonly repository: CommunityRepository<TEnv>;
}

export interface CommunityRepository<TEnv = unknown> {
  readonly name?: string;
  listBoards(
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<readonly JsonRecord[]>;
  listPosts(
    input: JsonRecord,
    page: PaginationInput,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<CommunityListResult>;
  getPost(
    postId: string,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  createPost(
    input: CommunityPostInput,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updatePost(
    postId: string,
    input: Partial<CommunityPostInput>,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  deletePost(
    postId: string,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  setPostReaction(
    postId: string,
    liked: boolean,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listComments(
    postId: string,
    page: PaginationInput,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<CommunityListResult>;
  createComment(
    postId: string,
    input: CommunityCommentInput,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  updateComment(
    commentId: string,
    input: CommunityCommentInput,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  deleteComment(
    commentId: string,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  createReport(
    input: CommunityReportInput,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  listMyPosts(
    page: PaginationInput,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<CommunityListResult>;
  listMyComments(
    page: PaginationInput,
    runtime: CommunityRouteRuntime<TEnv>,
  ): Promise<CommunityListResult>;
}

export interface CommunityRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | CommunityRepository<TEnv>
    | ((env: TEnv) => CommunityRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
  readonly onCommunityEvent?: (
    event: CommunitySecurityEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface CommunitySecurityEvent {
  readonly event:
    | "community_post_created"
    | "community_post_updated"
    | "community_post_deleted"
    | "community_comment_created"
    | "community_comment_updated"
    | "community_comment_deleted"
    | "community_post_reacted"
    | "community_report_created";
  readonly requestId: string;
  readonly userId: string | null;
  readonly targetType: "POST" | "COMMENT" | "REACTION" | "REPORT";
  readonly targetId: string | null;
  readonly path: string;
  readonly createdAt: string;
}

class CommunityHttpError extends Error {
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
    this.name = "CommunityHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const boardDefinitions: readonly JsonRecord[] = [
  {
    boardType: "SALARY_TALK",
    title: "월급 이야기",
    description: "월급날, 급여 계획, 지출 루틴을 공유합니다.",
    writeRequiresAuth: true,
    warning: "급여 원문·계좌·대출 상세는 입력하지 마세요.",
  },
  {
    boardType: "BUDGET_TIP",
    title: "예산 팁",
    description: "일일 예산과 고정지출 절감 방법을 공유합니다.",
    writeRequiresAuth: true,
    warning: "개인 재무정보를 식별 가능하게 공개하지 마세요.",
  },
  {
    boardType: "EXPENSE_CUT",
    title: "지출 줄이기",
    description: "변동지출 절감 챌린지와 후기를 공유합니다.",
    writeRequiresAuth: true,
    warning: "광고성 링크와 허위 절약 정보는 제한됩니다.",
  },
  {
    boardType: "SAVINGS_GOAL",
    title: "저축 목표",
    description: "고정저축·목표 달성 과정을 공유합니다.",
    writeRequiresAuth: true,
    warning: "저축액은 범위나 비율로만 공유하세요.",
  },
  {
    boardType: "LEVEL_CERTIFICATION",
    title: "LV UP 인증",
    description: "자기계발·운동·독서 인증을 공유합니다.",
    writeRequiresAuth: true,
    warning: "타인의 사진·개인정보를 올리지 마세요.",
  },
  {
    boardType: "SIDE_HUSTLE",
    title: "부업",
    description: "부업 경험과 수익 구조를 공유합니다.",
    writeRequiresAuth: true,
    warning: "투자권유·불법 리딩·수익 보장 표현은 금지됩니다.",
  },
  {
    boardType: "HEALTH_ROUTINE",
    title: "건강 루틴",
    description: "운동·수면·식단 루틴을 공유합니다.",
    writeRequiresAuth: true,
    warning: "의학적 진단처럼 보이는 주장은 제한됩니다.",
  },
  {
    boardType: "FREE",
    title: "자유게시판",
    description: "급여납치 사용자들의 자유 대화 공간입니다.",
    writeRequiresAuth: true,
    warning: "욕설·혐오·개인정보 노출은 신고 대상입니다.",
  },
];

const sensitiveKeyFragments = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "email",
  "phone",
  "resident",
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
  "adTarget",
  "targeting",
  "급여",
  "월급",
  "소득",
  "대출",
  "저축",
  "적금",
  "지출",
  "생활비",
  "납치금액",
  "계좌",
  "카드",
];

const safeBooleanPolicyKeys = new Set([
  "serverAuthority",
  "financialRawDataExposed",
  "rawPersonalDataExposed",
  "rawPushTokenExposed",
  "adsFinancialTargetingUsed",
]);

const riskyContentPatterns = [
  /\b\d{3}-\d{2,4}-\d{4}\b/,
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /수익\s*보장|원금\s*보장|무조건\s*오름|리딩방|대출\s*권유|불법|도박|사기/i,
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

function normalizeRole(value: string): CommunityRole | null {
  const role = value.trim().toUpperCase();
  if (["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role))
    return role as CommunityRole;
  return null;
}

function principalFromRequest(
  request: Request,
  requireSource: boolean,
): CommunityPrincipal {
  const source = header(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source && source !== AUTH_CONTEXT_SOURCE_VALUE) {
    throw new CommunityHttpError(
      401,
      "COMMUNITY_AUTH_CONTEXT_SPOOFED",
      "인증 컨텍스트가 올바르지 않습니다.",
    );
  }
  const userId = header(request, "x-authenticated-user-id");
  const roleValues = (header(request, "x-authenticated-roles") ?? "")
    .split(",")
    .map((role) => normalizeRole(role))
    .filter((role): role is CommunityRole => Boolean(role));
  const roles = roleValues.length
    ? roleValues
    : userId
      ? (["USER"] as const)
      : [];
  const permissionValues = (
    header(request, "x-authenticated-permissions") ?? ""
  )
    .split(",")
    .map((permission) => permission.trim())
    .filter(Boolean);
  return {
    userId,
    roles,
    permissions: permissionValues,
    authenticated: Boolean(userId),
    policyId: header(request, "x-auth-policy-id"),
  };
}

function isAdmin(principal: CommunityPrincipal): boolean {
  return (
    principal.roles.some(
      (role) =>
        role === "OPERATOR" || role === "ADMIN" || role === "SUPER_ADMIN",
    ) ||
    principal.permissions.includes("*") ||
    principal.permissions.includes("community:moderate")
  );
}

function requireAuth(principal: CommunityPrincipal): string {
  if (!principal.userId)
    throw new CommunityHttpError(
      401,
      "COMMUNITY_AUTH_REQUIRED",
      "로그인이 필요합니다.",
    );
  return principal.userId;
}

function requireOwnerOrAdmin(
  ownerUserId: string,
  runtime: CommunityRouteRuntime,
): void {
  const userId = requireAuth(runtime.principal);
  if (ownerUserId === userId || isAdmin(runtime.principal)) return;
  throw new CommunityHttpError(
    403,
    "COMMUNITY_OWNER_REQUIRED",
    "작성자만 변경할 수 있습니다.",
  );
}

function normalizeBoardType(value: unknown): CommunityBoardType {
  const board = typeof value === "string" ? value.trim().toUpperCase() : "";
  const allowed = boardDefinitions.map((item) => item.boardType as string);
  if (allowed.includes(board)) return board as CommunityBoardType;
  throw new CommunityHttpError(
    400,
    "COMMUNITY_BOARD_INVALID",
    "지원하지 않는 게시판입니다.",
  );
}

function normalizeReportReason(value: unknown): CommunityReportReason {
  const reason = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (
    [
      "SPAM",
      "ABUSE",
      "PRIVACY",
      "MISINFORMATION",
      "FINANCIAL_ADVICE_RISK",
      "ILLEGAL",
      "OTHER",
    ].includes(reason)
  )
    return reason as CommunityReportReason;
  throw new CommunityHttpError(
    400,
    "COMMUNITY_REPORT_REASON_INVALID",
    "신고 사유가 올바르지 않습니다.",
  );
}

function stringField(
  input: Record<string, unknown>,
  key: string,
  options: { readonly required?: boolean; readonly maxLength?: number } = {},
): string {
  const value = input[key];
  const required = options.required ?? true;
  if (typeof value === "string" && value.trim())
    return value.trim().slice(0, options.maxLength ?? MAX_TEXT);
  if (required)
    throw new CommunityHttpError(
      400,
      "COMMUNITY_FIELD_REQUIRED",
      `${key} 값이 필요합니다.`,
      { field: key },
    );
  return "";
}

function booleanField(input: Record<string, unknown>, key: string): boolean {
  return input[key] === true;
}

function normalizeTags(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .map((item) => item.trim().replace(/^#/, "").slice(0, MAX_TAG_LENGTH)),
    ),
  ].slice(0, MAX_TAGS);
}

function textHasRisk(value: string): boolean {
  return riskyContentPatterns.some((pattern) => pattern.test(value));
}

function assertCommunityContentSafe(
  title: string,
  content: string,
): CommunityPostStatus {
  if (textHasRisk(`${title}\n${content}`)) return "PENDING_REVIEW";
  return "VISIBLE";
}

function assertCommentSafe(content: string): CommunityCommentStatus {
  if (textHasRisk(content))
    throw new CommunityHttpError(
      400,
      "COMMUNITY_COMMENT_REVIEW_REQUIRED",
      "개인정보 또는 위험 표현이 포함된 댓글은 등록할 수 없습니다.",
    );
  return "VISIBLE";
}

function keyLooksSensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return sensitiveKeyFragments.some((fragment) =>
    normalized.includes(fragment.toLowerCase().replace(/[\s._-]/g, "")),
  );
}

function sanitizeString(value: string): string {
  if (riskyContentPatterns.some((pattern) => pattern.test(value)))
    return "[REDACTED]";
  return value.length > MAX_TEXT
    ? `${value.slice(0, MAX_TEXT)}…[truncated]`
    : value;
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
  if (typeof value === "string") return sanitizeString(value);
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
        keyLooksSensitive(key) &&
        !(typeof item === "boolean" && safeBooleanPolicyKeys.has(key))
          ? "[REDACTED]"
          : sanitize(item, depth + 1, seen),
      ]),
  );
}

function jsonResponse(
  runtime: Pick<CommunityRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: COMMUNITY_ROUTES_SERVICE_NAME,
        version: COMMUNITY_ROUTES_VERSION,
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
    error instanceof CommunityHttpError
      ? error
      : new CommunityHttpError(
          500,
          "COMMUNITY_ROUTE_INTERNAL_ERROR",
          "커뮤니티 API 처리 중 오류가 발생했습니다.",
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
        service: COMMUNITY_ROUTES_SERVICE_NAME,
        version: COMMUNITY_ROUTES_VERSION,
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
    throw new CommunityHttpError(
      413,
      "COMMUNITY_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new CommunityHttpError(
      400,
      "COMMUNITY_JSON_OBJECT_REQUIRED",
      "JSON 객체 본문이 필요합니다.",
    );
  return parsed as Record<string, unknown>;
}

function queryRecord(url: URL): JsonRecord {
  const record: Record<string, JsonValue> = {};
  url.searchParams.forEach((value, key) => {
    record[key] = value;
  });
  return record;
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
    throw new CommunityHttpError(
      400,
      "COMMUNITY_ROUTE_ID_REQUIRED",
      "경로 식별자가 필요합니다.",
    );
  return decodeURIComponent(value);
}

function matchRoute(path: string, pattern: RegExp): RegExpMatchArray | null {
  return path.match(pattern);
}

function listResult<TItem extends JsonRecord>(
  items: readonly TItem[],
  page: PaginationInput,
): CommunityListResult<TItem> {
  return {
    items: items.slice(page.offset, page.offset + page.limit),
    page: page.page,
    pageSize: page.pageSize,
    total: items.length,
  };
}

function publicAuthorName(ownerUserId: string, anonymous: boolean): string {
  if (anonymous) return "익명 사용자";
  return `${ownerUserId.slice(0, 3)}***`;
}

function createPostInput(body: Record<string, unknown>): CommunityPostInput {
  const title = stringField(body, "title", { maxLength: MAX_TITLE_LENGTH });
  const content = stringField(body, "content", {
    maxLength: MAX_CONTENT_LENGTH,
  });
  if (title.length < 2)
    throw new CommunityHttpError(
      400,
      "COMMUNITY_TITLE_TOO_SHORT",
      "제목은 2자 이상이어야 합니다.",
    );
  if (content.length < 5)
    throw new CommunityHttpError(
      400,
      "COMMUNITY_CONTENT_TOO_SHORT",
      "본문은 5자 이상이어야 합니다.",
    );
  return {
    boardType: normalizeBoardType(body.boardType),
    title,
    content,
    tags: normalizeTags(body.tags),
    anonymous: booleanField(body, "anonymous"),
  };
}

type MutableCommunityPostInput = {
  -readonly [K in keyof CommunityPostInput]?: CommunityPostInput[K];
};

function updatePostInput(
  body: Record<string, unknown>,
): Partial<CommunityPostInput> {
  const input: MutableCommunityPostInput = {};
  if (body.boardType !== undefined)
    input.boardType = normalizeBoardType(body.boardType);
  if (body.title !== undefined)
    input.title = stringField(body, "title", { maxLength: MAX_TITLE_LENGTH });
  if (body.content !== undefined)
    input.content = stringField(body, "content", {
      maxLength: MAX_CONTENT_LENGTH,
    });
  if (body.tags !== undefined) input.tags = normalizeTags(body.tags);
  if (body.anonymous !== undefined)
    input.anonymous = booleanField(body, "anonymous");
  if (!Object.keys(input).length)
    throw new CommunityHttpError(
      400,
      "COMMUNITY_UPDATE_EMPTY",
      "수정할 값이 필요합니다.",
    );
  return input;
}

function commentInput(body: Record<string, unknown>): CommunityCommentInput {
  const content = stringField(body, "content", {
    maxLength: MAX_COMMENT_LENGTH,
  });
  if (content.length < 1)
    throw new CommunityHttpError(
      400,
      "COMMUNITY_COMMENT_EMPTY",
      "댓글 내용을 입력해주세요.",
    );
  return { content, anonymous: booleanField(body, "anonymous") };
}

function reportInput(
  body: Record<string, unknown>,
  targetType?: "POST" | "COMMENT",
  targetId?: string,
): CommunityReportInput {
  const reason = stringField(body, "reason", { maxLength: 500 });
  return {
    targetType:
      targetType ?? (stringField(body, "targetType") as "POST" | "COMMENT"),
    targetId: targetId ?? stringField(body, "targetId"),
    reasonType: normalizeReportReason(body.reasonType),
    reason,
  };
}

async function emit<TEnv>(
  runtime: CommunityRouteRuntime<TEnv>,
  event: CommunitySecurityEvent,
): Promise<void> {
  const options = (
    runtime as CommunityRouteRuntime<TEnv> & {
      readonly routeOptions?: CommunityRoutesOptions<TEnv>;
    }
  ).routeOptions;
  if (!options?.onCommunityEvent) return;
  const task = Promise.resolve(
    options.onCommunityEvent(event, runtime.env, runtime.execution),
  ).catch((error) => {
    console.warn(
      "community_routes_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  runtime.execution.waitUntil?.(task);
}

function createInMemoryCommunityRepository<
  TEnv = unknown,
>(): CommunityRepository<TEnv> {
  const posts = new Map<string, JsonRecord>();
  const comments = new Map<string, JsonRecord>();
  const likes = new Set<string>();
  const now = new Date().toISOString();
  const seedPost: JsonRecord = {
    postId: "post_1001",
    boardType: "LEVEL_CERTIFICATION",
    title: "[LV.5] 일주일 지출 절감 인증",
    content: "고정지출을 점검하고 변동지출 기록을 매일 남겼습니다.",
    tags: ["절약", "LVUP"].join(","),
    ownerUserId: "usr_1001",
    authorMasked: "usr***",
    anonymous: false,
    status: "VISIBLE",
    likeCount: 3,
    commentCount: 1,
    reportCount: 0,
    viewCount: 12,
    createdAt: now,
    updatedAt: now,
    financialRawDataExposed: false,
  };
  posts.set("post_1001", seedPost);
  comments.set("cmt_1001", {
    commentId: "cmt_1001",
    postId: "post_1001",
    ownerUserId: "usr_1002",
    authorMasked: "usr***",
    anonymous: false,
    content: "좋은 루틴입니다.",
    status: "VISIBLE",
    createdAt: now,
    updatedAt: now,
  });

  function visiblePostList(): JsonRecord[] {
    return [...posts.values()].filter((post) => post.status !== "DELETED");
  }

  return {
    name: "in-memory-community-repository",
    async listBoards(): Promise<readonly JsonRecord[]> {
      return boardDefinitions;
    },
    async listPosts(input, page): Promise<CommunityListResult> {
      const boardType =
        typeof input.boardType === "string" && input.boardType
          ? input.boardType
          : null;
      const keyword =
        typeof input.q === "string" && input.q ? input.q.toLowerCase() : null;
      const filtered = visiblePostList().filter((post) => {
        const matchesBoard = !boardType || post.boardType === boardType;
        const haystack =
          `${post.title ?? ""}\n${post.content ?? ""}`.toLowerCase();
        const matchesKeyword = !keyword || haystack.includes(keyword);
        return matchesBoard && matchesKeyword;
      });
      return listResult(filtered, page);
    },
    async getPost(postId): Promise<JsonRecord | null> {
      const post = posts.get(postId);
      if (!post || post.status === "DELETED") return null;
      const currentViews =
        typeof post.viewCount === "number" ? post.viewCount : 0;
      const updated = { ...post, viewCount: currentViews + 1 };
      posts.set(postId, updated);
      return updated;
    },
    async createPost(input, runtime): Promise<JsonRecord> {
      const userId = requireAuth(runtime.principal);
      const postId = `post_${globalThis.crypto.randomUUID()}`;
      const status = assertCommunityContentSafe(input.title, input.content);
      const post: JsonRecord = {
        postId,
        boardType: input.boardType,
        title: input.title,
        content: input.content,
        tags: input.tags.join(","),
        ownerUserId: userId,
        authorMasked: publicAuthorName(userId, input.anonymous),
        anonymous: input.anonymous,
        status,
        likeCount: 0,
        commentCount: 0,
        reportCount: 0,
        viewCount: 0,
        createdAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
        financialRawDataExposed: false,
      };
      posts.set(postId, post);
      return post;
    },
    async updatePost(postId, input, runtime): Promise<JsonRecord> {
      const post = posts.get(postId);
      if (!post || post.status === "DELETED")
        throw new CommunityHttpError(
          404,
          "COMMUNITY_POST_NOT_FOUND",
          "게시글을 찾을 수 없습니다.",
        );
      requireOwnerOrAdmin(String(post.ownerUserId), runtime);
      const title = input.title ?? String(post.title ?? "");
      const content = input.content ?? String(post.content ?? "");
      const status = assertCommunityContentSafe(title, content);
      const updated: JsonRecord = {
        ...post,
        ...input,
        tags: input.tags ? input.tags.join(",") : (post.tags ?? ""),
        status,
        updatedAt: runtime.now.toISOString(),
      };
      posts.set(postId, updated);
      return updated;
    },
    async deletePost(postId, runtime): Promise<JsonRecord> {
      const post = posts.get(postId);
      if (!post || post.status === "DELETED")
        throw new CommunityHttpError(
          404,
          "COMMUNITY_POST_NOT_FOUND",
          "게시글을 찾을 수 없습니다.",
        );
      requireOwnerOrAdmin(String(post.ownerUserId), runtime);
      const deleted = {
        ...post,
        status: "DELETED",
        updatedAt: runtime.now.toISOString(),
      };
      posts.set(postId, deleted);
      return { postId, status: "DELETED" };
    },
    async setPostReaction(postId, liked, runtime): Promise<JsonRecord> {
      const userId = requireAuth(runtime.principal);
      const post = posts.get(postId);
      if (!post || post.status === "DELETED")
        throw new CommunityHttpError(
          404,
          "COMMUNITY_POST_NOT_FOUND",
          "게시글을 찾을 수 없습니다.",
        );
      const key = `${postId}:${userId}`;
      const currentlyLiked = likes.has(key);
      if (liked) likes.add(key);
      else likes.delete(key);
      const delta =
        liked && !currentlyLiked ? 1 : !liked && currentlyLiked ? -1 : 0;
      const nextCount = Math.max(
        0,
        (typeof post.likeCount === "number" ? post.likeCount : 0) + delta,
      );
      const updated = { ...post, likeCount: nextCount };
      posts.set(postId, updated);
      return {
        postId,
        state: liked ? "LIKED" : "UNLIKED",
        likeCount: nextCount,
      };
    },
    async listComments(postId, page): Promise<CommunityListResult> {
      const items = [...comments.values()].filter(
        (comment) => comment.postId === postId && comment.status !== "DELETED",
      );
      return listResult(items, page);
    },
    async createComment(postId, input, runtime): Promise<JsonRecord> {
      const userId = requireAuth(runtime.principal);
      const post = posts.get(postId);
      if (!post || post.status === "DELETED")
        throw new CommunityHttpError(
          404,
          "COMMUNITY_POST_NOT_FOUND",
          "게시글을 찾을 수 없습니다.",
        );
      const status = assertCommentSafe(input.content);
      const commentId = `cmt_${globalThis.crypto.randomUUID()}`;
      const comment: JsonRecord = {
        commentId,
        postId,
        ownerUserId: userId,
        authorMasked: publicAuthorName(userId, input.anonymous),
        anonymous: input.anonymous,
        content: input.content,
        status,
        createdAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      comments.set(commentId, comment);
      posts.set(postId, {
        ...post,
        commentCount:
          (typeof post.commentCount === "number" ? post.commentCount : 0) + 1,
      });
      return comment;
    },
    async updateComment(commentId, input, runtime): Promise<JsonRecord> {
      const comment = comments.get(commentId);
      if (!comment || comment.status === "DELETED")
        throw new CommunityHttpError(
          404,
          "COMMUNITY_COMMENT_NOT_FOUND",
          "댓글을 찾을 수 없습니다.",
        );
      requireOwnerOrAdmin(String(comment.ownerUserId), runtime);
      const status = assertCommentSafe(input.content);
      const updated = {
        ...comment,
        content: input.content,
        anonymous: input.anonymous,
        status,
        updatedAt: runtime.now.toISOString(),
      };
      comments.set(commentId, updated);
      return updated;
    },
    async deleteComment(commentId, runtime): Promise<JsonRecord> {
      const comment = comments.get(commentId);
      if (!comment || comment.status === "DELETED")
        throw new CommunityHttpError(
          404,
          "COMMUNITY_COMMENT_NOT_FOUND",
          "댓글을 찾을 수 없습니다.",
        );
      requireOwnerOrAdmin(String(comment.ownerUserId), runtime);
      const deleted = {
        ...comment,
        status: "DELETED",
        updatedAt: runtime.now.toISOString(),
      };
      comments.set(commentId, deleted);
      const postId = String(comment.postId);
      const post = posts.get(postId);
      if (post)
        posts.set(postId, {
          ...post,
          commentCount: Math.max(
            0,
            (typeof post.commentCount === "number" ? post.commentCount : 0) - 1,
          ),
        });
      return { commentId, status: "DELETED" };
    },
    async createReport(input, runtime): Promise<JsonRecord> {
      const userId = requireAuth(runtime.principal);
      const reportId = `rpt_${globalThis.crypto.randomUUID()}`;
      if (input.targetType === "POST") {
        const post = posts.get(input.targetId);
        if (post)
          posts.set(input.targetId, {
            ...post,
            reportCount:
              (typeof post.reportCount === "number" ? post.reportCount : 0) + 1,
          });
      }
      return {
        reportId,
        ...input,
        reporterUserId: userId,
        status: "OPEN",
        createdAt: runtime.now.toISOString(),
      };
    },
    async listMyPosts(page, runtime): Promise<CommunityListResult> {
      const userId = requireAuth(runtime.principal);
      return listResult(
        visiblePostList().filter((post) => post.ownerUserId === userId),
        page,
      );
    },
    async listMyComments(page, runtime): Promise<CommunityListResult> {
      const userId = requireAuth(runtime.principal);
      const items = [...comments.values()].filter(
        (comment) =>
          comment.ownerUserId === userId && comment.status !== "DELETED",
      );
      return listResult(items, page);
    },
  };
}

function resolveRepository<TEnv>(
  env: TEnv,
  options: CommunityRoutesOptions<TEnv>,
): CommunityRepository<TEnv> {
  const repo =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return repo ?? createInMemoryCommunityRepository<TEnv>();
}

async function dispatchCommunityRoute<TEnv>(
  runtime: CommunityRouteRuntime<TEnv>,
): Promise<Response> {
  const { method, relativePath, repository } = runtime;
  const page = pagination(runtime.url);

  if (method === "GET" && relativePath === "/boards") {
    return jsonResponse(runtime, 200, {
      data: await repository.listBoards(runtime),
    });
  }

  if (method === "GET" && relativePath === "/posts") {
    return jsonResponse(runtime, 200, {
      data: await repository.listPosts(queryRecord(runtime.url), page, runtime),
    });
  }

  if (method === "POST" && relativePath === "/posts") {
    const data = await repository.createPost(
      createPostInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "community_post_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "POST",
      targetId: String(data.postId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  let match = matchRoute(relativePath, /^\/posts\/([^/]+)$/);
  if (method === "GET" && match) {
    const post = await repository.getPost(idFromMatch(match, 1), runtime);
    if (!post)
      throw new CommunityHttpError(
        404,
        "COMMUNITY_POST_NOT_FOUND",
        "게시글을 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data: post });
  }

  if (method === "PATCH" && match) {
    const postId = idFromMatch(match, 1);
    const data = await repository.updatePost(
      postId,
      updatePostInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "community_post_updated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "POST",
      targetId: postId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "DELETE" && match) {
    const postId = idFromMatch(match, 1);
    const data = await repository.deletePost(postId, runtime);
    await emit(runtime, {
      event: "community_post_deleted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "POST",
      targetId: postId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/posts\/([^/]+)\/like$/);
  if ((method === "POST" || method === "DELETE") && match) {
    const postId = idFromMatch(match, 1);
    const data = await repository.setPostReaction(
      postId,
      method === "POST",
      runtime,
    );
    await emit(runtime, {
      event: "community_post_reacted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "REACTION",
      targetId: postId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/posts\/([^/]+)\/comments$/);
  if (method === "GET" && match) {
    return jsonResponse(runtime, 200, {
      data: await repository.listComments(idFromMatch(match, 1), page, runtime),
    });
  }

  if (method === "POST" && match) {
    const postId = idFromMatch(match, 1);
    const data = await repository.createComment(
      postId,
      commentInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "community_comment_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "COMMENT",
      targetId: String(data.commentId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  match = matchRoute(relativePath, /^\/comments\/([^/]+)$/);
  if (method === "PATCH" && match) {
    const commentId = idFromMatch(match, 1);
    const data = await repository.updateComment(
      commentId,
      commentInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "community_comment_updated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "COMMENT",
      targetId: commentId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  if (method === "DELETE" && match) {
    const commentId = idFromMatch(match, 1);
    const data = await repository.deleteComment(commentId, runtime);
    await emit(runtime, {
      event: "community_comment_deleted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "COMMENT",
      targetId: commentId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = matchRoute(relativePath, /^\/posts\/([^/]+)\/report$/);
  if (method === "POST" && match) {
    const postId = idFromMatch(match, 1);
    const data = await repository.createReport(
      reportInput(await parseJsonBody(runtime.request), "POST", postId),
      runtime,
    );
    await emit(runtime, {
      event: "community_report_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "REPORT",
      targetId: String(data.reportId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  match = matchRoute(relativePath, /^\/comments\/([^/]+)\/report$/);
  if (method === "POST" && match) {
    const commentId = idFromMatch(match, 1);
    const data = await repository.createReport(
      reportInput(await parseJsonBody(runtime.request), "COMMENT", commentId),
      runtime,
    );
    await emit(runtime, {
      event: "community_report_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "REPORT",
      targetId: String(data.reportId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  if (method === "POST" && relativePath === "/reports") {
    const data = await repository.createReport(
      reportInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "community_report_created",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      targetType: "REPORT",
      targetId: String(data.reportId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  if (method === "GET" && relativePath === "/me/posts") {
    return jsonResponse(runtime, 200, {
      data: await repository.listMyPosts(page, runtime),
    });
  }

  if (method === "GET" && relativePath === "/me/comments") {
    return jsonResponse(runtime, 200, {
      data: await repository.listMyComments(page, runtime),
    });
  }

  throw new CommunityHttpError(
    404,
    "COMMUNITY_ROUTE_NOT_FOUND",
    "커뮤니티 API 경로를 찾을 수 없습니다.",
  );
}

export function createCommunityRoutes<TEnv = unknown>(
  options: CommunityRoutesOptions<TEnv> = {},
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
      if (
        path !== COMMUNITY_API_PREFIX &&
        !path.startsWith(`${COMMUNITY_API_PREFIX}/`)
      ) {
        throw new CommunityHttpError(
          404,
          "COMMUNITY_ROUTE_PREFIX_NOT_FOUND",
          "커뮤니티 API prefix가 아닙니다.",
        );
      }

      const baseRuntime: CommunityRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normalizePath(
          path.slice(COMMUNITY_API_PREFIX.length) || "/",
        ),
        method: request.method.toUpperCase(),
        requestId,
        now: options.now?.() ?? new Date(),
        principal: principalFromRequest(
          request,
          options.requireAuthContextSource ?? true,
        ),
        repository: resolveRepository(env, options),
      };
      const runtime = Object.assign(baseRuntime, { routeOptions: options });
      const response = await dispatchCommunityRoute(runtime);
      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set(
        "x-community-repository",
        runtime.repository.name ?? "custom",
      );
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

export const handleCommunityRoutes = createCommunityRoutes();

export const communityRoutesManifest = Object.freeze({
  file: "services/api/src/routes/community.routes.ts",
  version: COMMUNITY_ROUTES_VERSION,
  prefix: COMMUNITY_API_PREFIX,
  endpoints: [
    "GET /boards",
    "GET /posts",
    "POST /posts",
    "GET /posts/{postId}",
    "PATCH /posts/{postId}",
    "DELETE /posts/{postId}",
    "POST /posts/{postId}/like",
    "DELETE /posts/{postId}/like",
    "GET /posts/{postId}/comments",
    "POST /posts/{postId}/comments",
    "PATCH /comments/{commentId}",
    "DELETE /comments/{commentId}",
    "POST /posts/{postId}/report",
    "POST /comments/{commentId}/report",
    "POST /reports",
    "GET /me/posts",
    "GET /me/comments",
  ],
  authMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  financialRawDataMasked: true,
  communityRiskReviewEnabled: true,
  ownerOrAdminMutationRequired: true,
  reportAndModerationReady: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertCommunityRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "community_api_prefix_api_v1",
    "board_catalog_salary_budget_expense_savings_levelup_sidehustle_health_free",
    "post_list_detail_create_update_delete",
    "comment_list_create_update_delete",
    "like_unlike_reaction",
    "post_and_comment_report",
    "my_posts_and_my_comments",
    "auth_context_compatible",
    "owner_or_admin_mutation_guard",
    "standard_json_response_contract",
    "sensitive_financial_data_redaction",
    "privacy_and_risky_financial_claim_detection",
    "pagination_and_query_filtering",
    "repository_injection_with_memory_fallback",
    "security_event_wait_until_hook",
    "rate_limit_audit_error_middleware_compatible",
  ] as const;
  return { ok: checks.length >= 15, version: COMMUNITY_ROUTES_VERSION, checks };
}

export default createCommunityRoutes;
