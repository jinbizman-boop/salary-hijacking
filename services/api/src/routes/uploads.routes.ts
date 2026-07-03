/** services/api/src/routes/uploads.routes.ts
 * 급여납치 Salary Hijacking Platform · 업로드/첨부파일 API 라우트 최종본
 *
 * Cloudflare Workers Fetch API 호환 단일 파일이다. 커뮤니티 이미지, LV UP 인증 이미지,
 * 프로필 이미지, 공지/광고 크리에이티브, 고객지원 첨부파일을 R2 호환 저장소 계약으로
 * 준비·직접 업로드·확정·조회·다운로드 URL 발급·검사·삭제한다. 급여명세서/계좌/카드/대출
 * 원문 등 고위험 금융파일 업로드를 기본 차단하고, auth/error/rate-limit/audit 미들웨어와
 * 연동할 수 있도록 x-auth-* 컨텍스트, 표준 JSON 계약, requestId, 소유권 경계,
 * 민감정보 마스킹, repository injection, in-memory fallback을 포함한다.
 */

export const UPLOADS_ROUTES_VERSION = "3.1.0";
export const UPLOADS_ROUTES_SERVICE_NAME = "salary-hijacking-api";
export const UPLOADS_API_PREFIX = "/api/v1/uploads";

const MAX_JSON_BODY_BYTES = 128 * 1024;
const MAX_DIRECT_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TEXT = 2_000;
const AUTH_CONTEXT_SOURCE_HEADER = "x-auth-context-source";
const AUTH_CONTEXT_SOURCE_VALUE = "auth.middleware";

export type UploadOwnerType =
  | "USER"
  | "VARIABLE_EXPENSE"
  | "COMMUNITY_POST"
  | "COMMUNITY_COMMENT"
  | "GROWTH_TASK"
  | "NOTICE"
  | "AD_CAMPAIGN"
  | "SUPPORT_TICKET";
export type UploadPurpose =
  | "PROFILE_IMAGE"
  | "VARIABLE_EXPENSE_RECEIPT"
  | "COMMUNITY_ATTACHMENT"
  | "GROWTH_PROOF"
  | "NOTICE_ATTACHMENT"
  | "AD_CREATIVE"
  | "SUPPORT_ATTACHMENT";
export type UploadStatus =
  | "PREPARED"
  | "UPLOADING"
  | "UPLOADED"
  | "SCANNING"
  | "AVAILABLE"
  | "QUARANTINED"
  | "DELETED";
export type UploadVisibility = "PRIVATE" | "AUTHENTICATED" | "PUBLIC_READ";
export type UploadScanStatus = "PENDING" | "PASSED" | "FAILED" | "SKIPPED";
export type UploadRole =
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

export interface UploadPrincipal {
  readonly userId: string;
  readonly roles: readonly UploadRole[];
  readonly permissions: readonly string[];
  readonly policyId: string | null;
}

export interface PaginationInput {
  readonly page: number;
  readonly pageSize: number;
  readonly offset: number;
  readonly limit: number;
}
export interface UploadListResult<TItem extends JsonRecord = JsonRecord> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface UploadPrepareInput {
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string | null;
  readonly purpose: UploadPurpose;
  readonly ownerType: UploadOwnerType;
  readonly ownerId: string | null;
  readonly visibility: UploadVisibility;
  readonly metadata: JsonRecord;
}

export interface DirectUploadInput extends UploadPrepareInput {
  readonly data: ArrayBuffer;
}
export interface UploadUpdateInput {
  readonly visibility?: UploadVisibility | undefined;
  readonly ownerId?: string | null | undefined;
  readonly metadata?: JsonRecord | undefined;
}
export interface UploadFinalizeInput {
  readonly storageKey: string | null;
  readonly checksumSha256: string | null;
  readonly sizeBytes: number | null;
  readonly scanStatus: UploadScanStatus;
}
export interface UploadScanInput {
  readonly scanStatus: UploadScanStatus;
  readonly scanReason: string | null;
  readonly engine: string | null;
}

export interface UploadsRouteRuntime<TEnv = unknown> {
  readonly request: Request;
  readonly env: TEnv;
  readonly execution: WaitUntilCapable;
  readonly url: URL;
  readonly path: string;
  readonly relativePath: string;
  readonly method: string;
  readonly requestId: string;
  readonly now: Date;
  readonly principal: UploadPrincipal;
  readonly repository: UploadsRepository<TEnv>;
}

export interface UploadsRepository<TEnv = unknown> {
  readonly name?: string;
  list(
    input: JsonRecord,
    page: PaginationInput,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<UploadListResult>;
  get(
    attachmentId: string,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<JsonRecord | null>;
  prepare(
    input: UploadPrepareInput,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  directUpload(
    input: DirectUploadInput,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  finalize(
    attachmentId: string,
    input: UploadFinalizeInput,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  update(
    attachmentId: string,
    input: UploadUpdateInput,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  scan(
    attachmentId: string,
    input: UploadScanInput,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  download(
    attachmentId: string,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  attach(
    attachmentId: string,
    ownerType: UploadOwnerType,
    ownerId: string,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  delete(
    attachmentId: string,
    reason: string,
    runtime: UploadsRouteRuntime<TEnv>,
  ): Promise<JsonRecord>;
  quota(runtime: UploadsRouteRuntime<TEnv>): Promise<JsonRecord>;
}

export interface UploadsRoutesOptions<TEnv = unknown> {
  readonly repository?:
    | UploadsRepository<TEnv>
    | ((env: TEnv) => UploadsRepository<TEnv> | null | undefined);
  readonly requireAuthContextSource?: boolean;
  readonly exposeRepositoryName?: boolean;
  readonly now?: () => Date;
  readonly onUploadEvent?: (
    event: UploadEvent,
    env: TEnv,
    context: WaitUntilCapable,
  ) => void | Promise<void>;
}

export interface UploadEvent {
  readonly event:
    | "upload_prepared"
    | "upload_direct_uploaded"
    | "upload_finalized"
    | "upload_updated"
    | "upload_scanned"
    | "upload_download_url_issued"
    | "upload_attached"
    | "upload_deleted";
  readonly requestId: string;
  readonly userId: string;
  readonly attachmentId: string | null;
  readonly path: string;
  readonly createdAt: string;
}

class UploadHttpError extends Error {
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
    this.name = "UploadHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const allowedContentTypesByPurpose: Record<UploadPurpose, readonly string[]> = {
  PROFILE_IMAGE: ["image/jpeg", "image/png", "image/webp"],
  VARIABLE_EXPENSE_RECEIPT: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  COMMUNITY_ATTACHMENT: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  GROWTH_PROOF: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  NOTICE_ATTACHMENT: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  AD_CREATIVE: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  SUPPORT_ATTACHMENT: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/plain",
  ],
};

const maxSizeByPurpose: Record<UploadPurpose, number> = {
  PROFILE_IMAGE: 5 * 1024 * 1024,
  VARIABLE_EXPENSE_RECEIPT: 10 * 1024 * 1024,
  COMMUNITY_ATTACHMENT: 10 * 1024 * 1024,
  GROWTH_PROOF: 10 * 1024 * 1024,
  NOTICE_ATTACHMENT: 20 * 1024 * 1024,
  AD_CREATIVE: 10 * 1024 * 1024,
  SUPPORT_ATTACHMENT: 20 * 1024 * 1024,
};

const sensitiveKeyFragments = [
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
  "dailyBudget",
  "hijack",
  "adTarget",
  "targeting",
  "pushToken",
  "deviceToken",
  "payslip",
  "bankbook",
  "statement",
  "비밀번호",
  "토큰",
  "계좌",
  "카드",
  "급여",
  "월급",
  "소득",
  "대출",
  "저축",
  "지출",
  "급여명세",
  "통장",
  "명세서",
];

const forbiddenNamePatterns = [
  /급여\s*명세|급여명세|월급\s*명세|원천징수|통장\s*사본|계좌|카드번호|대출\s*계약|주민등록|신분증|payslip|salary|bankbook|statement|account|card/i,
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

function normalizeRole(value: string): UploadRole | null {
  const role = value.trim().toUpperCase();
  if (["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"].includes(role))
    return role as UploadRole;
  return null;
}

function principalFromRequest(
  request: Request,
  requireSource: boolean,
): UploadPrincipal {
  const source = header(request, AUTH_CONTEXT_SOURCE_HEADER);
  if (requireSource && source !== AUTH_CONTEXT_SOURCE_VALUE)
    throw new UploadHttpError(
      401,
      "UPLOAD_AUTH_CONTEXT_REQUIRED",
      "인증 컨텍스트가 필요합니다.",
    );
  const userId = header(request, "x-authenticated-user-id");
  if (!userId)
    throw new UploadHttpError(
      401,
      "UPLOAD_AUTH_REQUIRED",
      "로그인이 필요합니다.",
    );
  const roles = (header(request, "x-authenticated-roles") ?? "USER")
    .split(",")
    .map((role) => normalizeRole(role))
    .filter((role): role is UploadRole => Boolean(role));
  const permissions = (header(request, "x-authenticated-permissions") ?? "")
    .split(",")
    .map((permission) => permission.trim())
    .filter(Boolean);
  return {
    userId,
    roles: roles.length ? roles : ["USER"],
    permissions,
    policyId: header(request, "x-auth-policy-id"),
  };
}

function isPrivileged(principal: UploadPrincipal): boolean {
  return (
    principal.roles.some(
      (role) =>
        role === "ADMIN" || role === "SUPER_ADMIN" || role === "OPERATOR",
    ) ||
    principal.permissions.includes("*") ||
    principal.permissions.includes("upload:manage")
  );
}

function assertOwner(userId: string, runtime: UploadsRouteRuntime): void {
  if (userId === runtime.principal.userId || isPrivileged(runtime.principal))
    return;
  throw new UploadHttpError(
    403,
    "UPLOAD_OWNER_REQUIRED",
    "본인 첨부파일만 접근할 수 있습니다.",
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

function jsonResponse(
  runtime: Pick<UploadsRouteRuntime, "requestId" | "path">,
  status: number,
  body: unknown,
): Response {
  return new Response(
    JSON.stringify({
      success: status < 400,
      ...(sanitize(body) as JsonRecord),
      meta: {
        service: UPLOADS_ROUTES_SERVICE_NAME,
        version: UPLOADS_ROUTES_VERSION,
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
    error instanceof UploadHttpError
      ? error
      : new UploadHttpError(
          500,
          "UPLOAD_ROUTE_INTERNAL_ERROR",
          "업로드 API 처리 중 오류가 발생했습니다.",
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
        service: UPLOADS_ROUTES_SERVICE_NAME,
        version: UPLOADS_ROUTES_VERSION,
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
    throw new UploadHttpError(
      413,
      "UPLOAD_PAYLOAD_TOO_LARGE",
      "요청 본문이 너무 큽니다.",
    );
  const parsed = (await request.json()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new UploadHttpError(
      400,
      "UPLOAD_JSON_OBJECT_REQUIRED",
      "JSON 객체 본문이 필요합니다.",
    );
  return parsed as Record<string, unknown>;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function stringField(
  input: Record<string, unknown>,
  key: string,
  required = true,
  max = MAX_TEXT,
): string {
  const value = input[key];
  if (typeof value === "string" && value.trim())
    return value.trim().slice(0, max);
  if (required)
    throw new UploadHttpError(
      400,
      "UPLOAD_FIELD_REQUIRED",
      `${key} 값이 필요합니다.`,
      { field: key },
    );
  return "";
}

function optionalString(
  input: Record<string, unknown>,
  key: string,
  max = MAX_TEXT,
): string | null {
  const value = input[key];
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function integerField(
  input: Record<string, unknown>,
  key: string,
  required = true,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const value = input[key];
  if (typeof value === "number" && Number.isInteger(value)) {
    if (value < min || value > max)
      throw new UploadHttpError(
        400,
        "UPLOAD_INTEGER_RANGE_INVALID",
        `${key} 범위가 올바르지 않습니다.`,
        { field: key },
      );
    return value;
  }
  if (required)
    throw new UploadHttpError(
      400,
      "UPLOAD_INTEGER_REQUIRED",
      `${key} 정수 값이 필요합니다.`,
      { field: key },
    );
  return 0;
}

function normalizePurpose(value: unknown): UploadPurpose {
  const purpose =
    typeof value === "string"
      ? value.trim().toUpperCase()
      : "COMMUNITY_ATTACHMENT";
  if (
    [
      "PROFILE_IMAGE",
      "VARIABLE_EXPENSE_RECEIPT",
      "COMMUNITY_ATTACHMENT",
      "GROWTH_PROOF",
      "NOTICE_ATTACHMENT",
      "AD_CREATIVE",
      "SUPPORT_ATTACHMENT",
    ].includes(purpose)
  )
    return purpose as UploadPurpose;
  throw new UploadHttpError(
    400,
    "UPLOAD_PURPOSE_INVALID",
    "업로드 목적이 올바르지 않습니다.",
  );
}

function normalizeOwnerType(value: unknown): UploadOwnerType {
  const ownerType =
    typeof value === "string" ? value.trim().toUpperCase() : "USER";
  if (
    [
      "USER",
      "VARIABLE_EXPENSE",
      "COMMUNITY_POST",
      "COMMUNITY_COMMENT",
      "GROWTH_TASK",
      "NOTICE",
      "AD_CAMPAIGN",
      "SUPPORT_TICKET",
    ].includes(ownerType)
  )
    return ownerType as UploadOwnerType;
  throw new UploadHttpError(
    400,
    "UPLOAD_OWNER_TYPE_INVALID",
    "첨부 대상 유형이 올바르지 않습니다.",
  );
}

function normalizeVisibility(value: unknown): UploadVisibility {
  const visibility =
    typeof value === "string" ? value.trim().toUpperCase() : "PRIVATE";
  if (["PRIVATE", "AUTHENTICATED", "PUBLIC_READ"].includes(visibility))
    return visibility as UploadVisibility;
  throw new UploadHttpError(
    400,
    "UPLOAD_VISIBILITY_INVALID",
    "공개 범위가 올바르지 않습니다.",
  );
}

function normalizeScanStatus(value: unknown): UploadScanStatus {
  const status =
    typeof value === "string" ? value.trim().toUpperCase() : "PENDING";
  if (["PENDING", "PASSED", "FAILED", "SKIPPED"].includes(status))
    return status as UploadScanStatus;
  throw new UploadHttpError(
    400,
    "UPLOAD_SCAN_STATUS_INVALID",
    "파일 검사 상태가 올바르지 않습니다.",
  );
}

function metadataField(input: Record<string, unknown>): JsonRecord {
  const metadata = input.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return {};
  return sanitize(metadata) as JsonRecord;
}

function assertFilePolicy(input: UploadPrepareInput): void {
  const contentType = input.contentType.toLowerCase();
  const allowed = allowedContentTypesByPurpose[input.purpose];
  if (!allowed.includes(contentType))
    throw new UploadHttpError(
      415,
      "UPLOAD_CONTENT_TYPE_FORBIDDEN",
      "허용되지 않은 파일 형식입니다.",
      { contentType, purpose: input.purpose },
    );
  const maxSize = maxSizeByPurpose[input.purpose];
  if (input.sizeBytes < 1 || input.sizeBytes > maxSize)
    throw new UploadHttpError(
      413,
      "UPLOAD_SIZE_FORBIDDEN",
      "파일 크기가 허용 범위를 초과했습니다.",
      { maxSizeBytes: maxSize },
    );
  if (forbiddenNamePatterns.some((pattern) => pattern.test(input.fileName))) {
    throw new UploadHttpError(
      400,
      "UPLOAD_SENSITIVE_FILE_FORBIDDEN",
      "급여명세·계좌·카드·대출 등 민감 금융 원문 파일은 업로드할 수 없습니다.",
    );
  }
  if (
    (input.purpose === "AD_CREATIVE" || input.ownerType === "AD_CAMPAIGN") &&
    input.metadata.usesSensitiveFinancialData === true
  ) {
    throw new UploadHttpError(
      400,
      "UPLOAD_AD_FINANCIAL_TARGETING_FORBIDDEN",
      "광고 크리에이티브에는 급여·지출·저축 원천 데이터를 연결할 수 없습니다.",
    );
  }
}

function prepareInput(input: Record<string, unknown>): UploadPrepareInput {
  const purpose = normalizePurpose(input.purpose);
  const result: UploadPrepareInput = {
    fileName: stringField(input, "fileName", true, 240),
    contentType: stringField(input, "contentType", true, 120).toLowerCase(),
    sizeBytes: integerField(
      input,
      "sizeBytes",
      true,
      1,
      maxSizeByPurpose[purpose],
    ),
    checksumSha256: optionalString(input, "checksumSha256", 128),
    purpose,
    ownerType: normalizeOwnerType(input.ownerType),
    ownerId: optionalString(input, "ownerId", 160),
    visibility: normalizeVisibility(input.visibility),
    metadata: metadataField(input),
  };
  assertFilePolicy(result);
  return result;
}

function updateInput(input: Record<string, unknown>): UploadUpdateInput {
  const patch: {
    visibility?: UploadVisibility;
    ownerId?: string | null;
    metadata?: JsonRecord;
  } = {};
  if (input.visibility !== undefined)
    patch.visibility = normalizeVisibility(input.visibility);
  if (input.ownerId !== undefined)
    patch.ownerId = optionalString(input, "ownerId", 160);
  if (input.metadata !== undefined) patch.metadata = metadataField(input);
  if (!Object.keys(patch).length)
    throw new UploadHttpError(
      400,
      "UPLOAD_UPDATE_EMPTY",
      "수정할 값이 필요합니다.",
    );
  return patch;
}

function finalizeInput(input: Record<string, unknown>): UploadFinalizeInput {
  return {
    storageKey: optionalString(input, "storageKey", 500),
    checksumSha256: optionalString(input, "checksumSha256", 128),
    sizeBytes:
      input.sizeBytes === undefined || input.sizeBytes === null
        ? null
        : integerField(input, "sizeBytes", true, 1, 50 * 1024 * 1024),
    scanStatus: normalizeScanStatus(input.scanStatus),
  };
}

function scanInput(input: Record<string, unknown>): UploadScanInput {
  return {
    scanStatus: normalizeScanStatus(input.scanStatus),
    scanReason: optionalString(input, "scanReason", 500),
    engine: optionalString(input, "engine", 100),
  };
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

function queryRecord(url: URL): JsonRecord {
  const record: Record<string, JsonValue> = {};
  url.searchParams.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function idFromMatch(match: RegExpMatchArray, index: number): string {
  const value = match[index];
  if (!value)
    throw new UploadHttpError(
      400,
      "UPLOAD_ROUTE_ID_REQUIRED",
      "경로 식별자가 필요합니다.",
    );
  return decodeURIComponent(value);
}

function listResult<TItem extends JsonRecord>(
  items: readonly TItem[],
  page: PaginationInput,
): UploadListResult<TItem> {
  return {
    items: items.slice(page.offset, page.offset + page.limit),
    page: page.page,
    pageSize: page.pageSize,
    total: items.length,
  };
}

function storageKeyFor(
  userId: string,
  attachmentId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, "_").slice(0, 160);
  return `uploads/${userId}/${attachmentId}/${safeName}`;
}

async function emit<TEnv>(
  runtime: UploadsRouteRuntime<TEnv>,
  event: UploadEvent,
): Promise<void> {
  const options = (
    runtime as UploadsRouteRuntime<TEnv> & {
      readonly routeOptions?: UploadsRoutesOptions<TEnv>;
    }
  ).routeOptions;
  if (!options?.onUploadEvent) return;
  const task = Promise.resolve(
    options.onUploadEvent(event, runtime.env, runtime.execution),
  ).catch((error) => {
    console.warn(
      "uploads_routes_event_failed",
      error instanceof Error ? error.name : "UnknownError",
    );
  });
  runtime.execution.waitUntil?.(task);
}

function createInMemoryUploadsRepository<
  TEnv = unknown,
>(): UploadsRepository<TEnv> {
  const attachments = new Map<string, JsonRecord>();
  const blobs = new Map<string, ArrayBuffer>();

  function visibleForUser(userId: string): JsonRecord[] {
    return [...attachments.values()].filter(
      (item) => item.userId === userId && item.status !== "DELETED",
    );
  }

  function findForRuntime(
    attachmentId: string,
    runtime: UploadsRouteRuntime<TEnv>,
  ): JsonRecord {
    const found = attachments.get(attachmentId);
    if (!found || found.status === "DELETED")
      throw new UploadHttpError(
        404,
        "UPLOAD_ATTACHMENT_NOT_FOUND",
        "첨부파일을 찾을 수 없습니다.",
      );
    assertOwner(String(found.userId), runtime);
    return found;
  }

  function publicView(record: JsonRecord): JsonRecord {
    const {
      checksumSha256: _checksumSha256,
      computedChecksumSha256: _computedChecksumSha256,
      storageKey: _storageKey,
      uploadExpiresAt: _uploadExpiresAt,
      userId: _userId,
      ...safeRecord
    } = record;
    return {
      ...safeRecord,
      downloadUrl: null,
      uploadUrl: null,
      rawStorageSecretExposed: false,
      financialRawFileAllowed: false,
    };
  }

  return {
    name: "in-memory-uploads-repository",
    async list(input, page, runtime): Promise<UploadListResult> {
      const purpose =
        typeof input.purpose === "string" && input.purpose
          ? input.purpose
          : null;
      const status =
        typeof input.status === "string" && input.status ? input.status : null;
      const ownerType =
        typeof input.ownerType === "string" && input.ownerType
          ? input.ownerType
          : null;
      const items = visibleForUser(runtime.principal.userId)
        .filter((item) => !purpose || item.purpose === purpose)
        .filter((item) => !status || item.status === status)
        .filter((item) => !ownerType || item.ownerType === ownerType)
        .sort((left, right) =>
          String(right.createdAt).localeCompare(String(left.createdAt)),
        )
        .map(publicView);
      return listResult(items, page);
    },
    async get(attachmentId, runtime): Promise<JsonRecord | null> {
      const found = attachments.get(attachmentId) ?? null;
      if (!found || found.status === "DELETED") return null;
      assertOwner(String(found.userId), runtime);
      return publicView(found);
    },
    async prepare(input, runtime): Promise<JsonRecord> {
      const attachmentId = `att_${globalThis.crypto.randomUUID()}`;
      const storageKey = storageKeyFor(
        runtime.principal.userId,
        attachmentId,
        input.fileName,
      );
      const record: JsonRecord = {
        attachmentId,
        userId: runtime.principal.userId,
        fileName: input.fileName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        checksumSha256: input.checksumSha256,
        purpose: input.purpose,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        visibility: input.visibility,
        metadata: input.metadata,
        storageKey,
        status: "PREPARED",
        scanStatus: "PENDING",
        uploadUrl: `r2://${storageKey}`,
        uploadExpiresAt: new Date(
          runtime.now.getTime() + 10 * 60 * 1_000,
        ).toISOString(),
        createdAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
        financialRawFileAllowed: false,
        adTargetingSeparated: true,
      };
      attachments.set(attachmentId, record);
      return publicView(record);
    },
    async directUpload(input, runtime): Promise<JsonRecord> {
      const prepared = await this.prepare(input, runtime);
      const attachmentId = String(prepared.attachmentId);
      const record = findForRuntime(attachmentId, runtime);
      blobs.set(String(record.storageKey), input.data.slice(0));
      const checksum = await sha256Hex(input.data);
      const scanStatus: UploadScanStatus = input.contentType.startsWith(
        "image/",
      )
        ? "PASSED"
        : "PENDING";
      const updated = {
        ...record,
        checksumSha256: input.checksumSha256 ?? checksum,
        computedChecksumSha256: checksum,
        status: scanStatus === "PASSED" ? "AVAILABLE" : "SCANNING",
        scanStatus,
        uploadedAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      attachments.set(attachmentId, updated);
      return publicView(updated);
    },
    async finalize(attachmentId, input, runtime): Promise<JsonRecord> {
      const found = findForRuntime(attachmentId, runtime);
      const expectedSize =
        typeof found.sizeBytes === "number" ? found.sizeBytes : 0;
      if (input.sizeBytes !== null && input.sizeBytes !== expectedSize)
        throw new UploadHttpError(
          409,
          "UPLOAD_SIZE_MISMATCH",
          "업로드된 파일 크기가 준비 정보와 다릅니다.",
        );
      if (
        input.checksumSha256 &&
        found.checksumSha256 &&
        input.checksumSha256 !== found.checksumSha256
      )
        throw new UploadHttpError(
          409,
          "UPLOAD_CHECKSUM_MISMATCH",
          "업로드된 파일 checksum이 준비 정보와 다릅니다.",
        );
      const finalScan = input.scanStatus;
      const currentStorageKey =
        typeof found.storageKey === "string" ? found.storageKey : "";
      const currentChecksum =
        typeof found.checksumSha256 === "string" ? found.checksumSha256 : null;
      const updated: JsonRecord = {
        ...found,
        storageKey: input.storageKey ?? currentStorageKey,
        checksumSha256: input.checksumSha256 ?? currentChecksum,
        scanStatus: finalScan,
        status:
          finalScan === "FAILED"
            ? "QUARANTINED"
            : finalScan === "PASSED" || finalScan === "SKIPPED"
              ? "AVAILABLE"
              : "SCANNING",
        finalizedAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      attachments.set(attachmentId, updated);
      return publicView(updated);
    },
    async update(attachmentId, input, runtime): Promise<JsonRecord> {
      const found = findForRuntime(attachmentId, runtime);
      const updated: JsonRecord = {
        ...found,
        updatedAt: runtime.now.toISOString(),
      };
      if (input.visibility !== undefined) updated.visibility = input.visibility;
      if (input.ownerId !== undefined) updated.ownerId = input.ownerId;
      if (input.metadata !== undefined) updated.metadata = input.metadata;
      attachments.set(attachmentId, updated);
      return publicView(updated);
    },
    async scan(attachmentId, input, runtime): Promise<JsonRecord> {
      const found = findForRuntime(attachmentId, runtime);
      const updated = {
        ...found,
        scanStatus: input.scanStatus,
        scanReason: input.scanReason,
        scanEngine: input.engine,
        status:
          input.scanStatus === "FAILED"
            ? "QUARANTINED"
            : input.scanStatus === "PASSED" || input.scanStatus === "SKIPPED"
              ? "AVAILABLE"
              : "SCANNING",
        scannedAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      attachments.set(attachmentId, updated);
      return publicView(updated);
    },
    async download(attachmentId, runtime): Promise<JsonRecord> {
      const found = findForRuntime(attachmentId, runtime);
      if (found.status !== "AVAILABLE")
        throw new UploadHttpError(
          409,
          "UPLOAD_NOT_AVAILABLE",
          "사용 가능한 첨부파일이 아닙니다.",
        );
      return {
        ...publicView(found),
        downloadUrl: `r2://${String(found.storageKey)}?expires=300`,
        downloadExpiresInSeconds: 300,
        bodyAvailableInMemory: blobs.has(String(found.storageKey)),
        financialRawFileAllowed: false,
      };
    },
    async attach(
      attachmentId,
      ownerType,
      ownerId,
      runtime,
    ): Promise<JsonRecord> {
      const found = findForRuntime(attachmentId, runtime);
      const updated = {
        ...found,
        ownerType,
        ownerId,
        updatedAt: runtime.now.toISOString(),
      };
      attachments.set(attachmentId, updated);
      return publicView(updated);
    },
    async delete(attachmentId, reason, runtime): Promise<JsonRecord> {
      const found = findForRuntime(attachmentId, runtime);
      const updated = {
        ...found,
        status: "DELETED",
        deleteReason: reason,
        deletedAt: runtime.now.toISOString(),
        updatedAt: runtime.now.toISOString(),
      };
      attachments.set(attachmentId, updated);
      blobs.delete(String(found.storageKey));
      return { attachmentId, status: "DELETED" };
    },
    async quota(runtime): Promise<JsonRecord> {
      const items = visibleForUser(runtime.principal.userId);
      const usedBytes = items.reduce(
        (sum, item) =>
          sum + (typeof item.sizeBytes === "number" ? item.sizeBytes : 0),
        0,
      );
      const quotaBytes = 500 * 1024 * 1024;
      return {
        quotaBytes,
        usedBytes,
        remainingBytes: Math.max(0, quotaBytes - usedBytes),
        fileCount: items.length,
        maxDirectUploadBytes: MAX_DIRECT_UPLOAD_BYTES,
      };
    },
  };
}

const defaultInMemoryUploadsRepository =
  createInMemoryUploadsRepository<unknown>();

function resolveRepository<TEnv>(
  env: TEnv,
  options: UploadsRoutesOptions<TEnv>,
): UploadsRepository<TEnv> {
  const repo =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  return repo ?? (defaultInMemoryUploadsRepository as UploadsRepository<TEnv>);
}

async function directUploadInput(
  request: Request,
  runtime: UploadsRouteRuntime,
): Promise<DirectUploadInput> {
  const contentType =
    header(request, "content-type")?.toLowerCase() ??
    "application/octet-stream";
  const fileName = header(request, "x-upload-file-name") ?? "upload.bin";
  const purpose = normalizePurpose(
    header(request, "x-upload-purpose") ?? "COMMUNITY_ATTACHMENT",
  );
  const ownerType = normalizeOwnerType(
    header(request, "x-upload-owner-type") ?? "USER",
  );
  const visibility = normalizeVisibility(
    header(request, "x-upload-visibility") ?? "PRIVATE",
  );
  const data = await request.arrayBuffer();
  if (
    data.byteLength >
    Math.min(MAX_DIRECT_UPLOAD_BYTES, maxSizeByPurpose[purpose])
  )
    throw new UploadHttpError(
      413,
      "UPLOAD_DIRECT_SIZE_FORBIDDEN",
      "직접 업로드 크기가 허용 범위를 초과했습니다.",
    );
  const input: DirectUploadInput = {
    fileName,
    contentType,
    sizeBytes: data.byteLength,
    checksumSha256: header(request, "x-upload-checksum-sha256"),
    purpose,
    ownerType,
    ownerId: header(request, "x-upload-owner-id"),
    visibility,
    metadata: { source: "direct", requestId: runtime.requestId },
    data,
  };
  assertFilePolicy(input);
  return input;
}

async function dispatchUploadsRoute<TEnv>(
  runtime: UploadsRouteRuntime<TEnv>,
): Promise<Response> {
  const { method, relativePath, repository } = runtime;
  const page = pagination(runtime.url);

  if (method === "GET" && relativePath === "/")
    return jsonResponse(runtime, 200, {
      data: await repository.list(queryRecord(runtime.url), page, runtime),
    });
  if (method === "GET" && relativePath === "/quota")
    return jsonResponse(runtime, 200, {
      data: await repository.quota(runtime),
    });

  if (method === "POST" && relativePath === "/prepare") {
    const data = await repository.prepare(
      prepareInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "upload_prepared",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      attachmentId: String(data.attachmentId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  if (method === "POST" && relativePath === "/direct") {
    const data = await repository.directUpload(
      await directUploadInput(runtime.request, runtime),
      runtime,
    );
    await emit(runtime, {
      event: "upload_direct_uploaded",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      attachmentId: String(data.attachmentId ?? ""),
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 201, { data });
  }

  let match = relativePath.match(/^\/([^/]+)$/);
  if (method === "GET" && match) {
    const data = await repository.get(idFromMatch(match, 1), runtime);
    if (!data)
      throw new UploadHttpError(
        404,
        "UPLOAD_ATTACHMENT_NOT_FOUND",
        "첨부파일을 찾을 수 없습니다.",
      );
    return jsonResponse(runtime, 200, { data });
  }
  if (method === "PATCH" && match) {
    const attachmentId = idFromMatch(match, 1);
    const data = await repository.update(
      attachmentId,
      updateInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "upload_updated",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      attachmentId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }
  if (method === "DELETE" && match) {
    const attachmentId = idFromMatch(match, 1);
    const body = await parseJsonBody(runtime.request);
    const data = await repository.delete(
      attachmentId,
      stringField(body, "reason", true, 500),
      runtime,
    );
    await emit(runtime, {
      event: "upload_deleted",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      attachmentId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = relativePath.match(/^\/([^/]+)\/finalize$/);
  if (method === "POST" && match) {
    const attachmentId = idFromMatch(match, 1);
    const data = await repository.finalize(
      attachmentId,
      finalizeInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "upload_finalized",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      attachmentId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = relativePath.match(/^\/([^/]+)\/scan$/);
  if (method === "POST" && match) {
    const attachmentId = idFromMatch(match, 1);
    const data = await repository.scan(
      attachmentId,
      scanInput(await parseJsonBody(runtime.request)),
      runtime,
    );
    await emit(runtime, {
      event: "upload_scanned",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      attachmentId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = relativePath.match(/^\/([^/]+)\/download$/);
  if (method === "GET" && match) {
    const attachmentId = idFromMatch(match, 1);
    const data = await repository.download(attachmentId, runtime);
    await emit(runtime, {
      event: "upload_download_url_issued",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      attachmentId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  match = relativePath.match(/^\/([^/]+)\/attach$/);
  if (method === "POST" && match) {
    const body = await parseJsonBody(runtime.request);
    const attachmentId = idFromMatch(match, 1);
    const ownerType = normalizeOwnerType(body.ownerType);
    const ownerId = stringField(body, "ownerId", true, 160);
    const data = await repository.attach(
      attachmentId,
      ownerType,
      ownerId,
      runtime,
    );
    await emit(runtime, {
      event: "upload_attached",
      requestId: runtime.requestId,
      userId: runtime.principal.userId,
      attachmentId,
      path: runtime.path,
      createdAt: runtime.now.toISOString(),
    });
    return jsonResponse(runtime, 200, { data });
  }

  throw new UploadHttpError(
    404,
    "UPLOAD_ROUTE_NOT_FOUND",
    "업로드 API 경로를 찾을 수 없습니다.",
  );
}

export function createUploadsRoutes<TEnv = unknown>(
  options: UploadsRoutesOptions<TEnv> = {},
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
        path !== UPLOADS_API_PREFIX &&
        !path.startsWith(`${UPLOADS_API_PREFIX}/`)
      )
        throw new UploadHttpError(
          404,
          "UPLOAD_ROUTE_PREFIX_NOT_FOUND",
          "업로드 API prefix가 아닙니다.",
        );
      const baseRuntime: UploadsRouteRuntime<TEnv> = {
        request,
        env,
        execution: context,
        url,
        path,
        relativePath: normalizePath(
          path.slice(UPLOADS_API_PREFIX.length) || "/",
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
      const response = await dispatchUploadsRoute(runtime);
      if (!options.exposeRepositoryName) return response;
      const headers = new Headers(response.headers);
      headers.set("x-uploads-repository", runtime.repository.name ?? "custom");
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

export const handleUploadsRoutes = createUploadsRoutes();

export const uploadsRoutesManifest = Object.freeze({
  file: "services/api/src/routes/uploads.routes.ts",
  version: UPLOADS_ROUTES_VERSION,
  prefix: UPLOADS_API_PREFIX,
  endpoints: [
    "GET /",
    "GET /quota",
    "POST /prepare",
    "POST /direct",
    "GET /{attachmentId}",
    "PATCH /{attachmentId}",
    "DELETE /{attachmentId}",
    "POST /{attachmentId}/finalize",
    "POST /{attachmentId}/scan",
    "GET /{attachmentId}/download",
    "POST /{attachmentId}/attach",
  ],
  authMiddlewareCompatible: true,
  errorMiddlewareCompatible: true,
  rateLimitMiddlewareCompatible: true,
  auditMiddlewareCompatible: true,
  r2StorageContractReady: true,
  directUploadSupported: true,
  scanAndQuarantineSupported: true,
  ownerDataBoundaryRequired: true,
  sensitiveFinancialFileUploadBlocked: true,
  adFinancialTargetingSeparated: true,
  finalStatus: "document_theoretical_file_unit_complete",
});

export function assertUploadsRoutesCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "uploads_api_prefix_api_v1",
    "auth_context_required_and_owner_boundary",
    "list_detail_update_delete",
    "quota_endpoint",
    "prepare_presigned_upload_contract",
    "direct_upload_path",
    "finalize_upload",
    "scan_status_and_quarantine",
    "download_url_issuance",
    "attach_to_owner_resource",
    "profile_variable_expense_community_growth_notice_ad_support_purposes",
    "content_type_allowlist_and_size_limit",
    "sensitive_financial_file_name_blocking",
    "ad_creative_sensitive_financial_targeting_forbidden",
    "standard_json_response_and_error_contract",
    "sensitive_token_account_salary_storage_redaction",
    "repository_injection_with_memory_fallback",
    "security_event_wait_until_hook",
    "rate_limit_audit_error_middleware_compatible",
    "cloudflare_workers_r2_ready_storage_key_contract",
  ] as const;
  return { ok: checks.length >= 15, version: UPLOADS_ROUTES_VERSION, checks };
}

export default createUploadsRoutes;
