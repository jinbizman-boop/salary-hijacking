import {
  UPLOADS_API_PREFIX,
  UPLOADS_COMMUNITY_CONTENT_TYPES,
  UPLOADS_DIRECT_PATH,
  UPLOADS_MAX_COMMUNITY_ATTACHMENT_BYTES,
  UPLOADS_MAX_VARIABLE_EXPENSE_RECEIPT_BYTES,
  UPLOADS_PRIVACY_HEADERS,
  UPLOADS_VARIABLE_EXPENSE_RECEIPT_CONTENT_TYPES,
} from "./constants";
import type {
  DirectCommunityAttachmentUpload,
  DirectVariableExpenseReceiptUpload,
  UploadAttachment,
  UploadScanStatus,
  UploadStatus,
  UploadsApiClient,
} from "./types";

export type UploadsApiOptions = Readonly<{
  baseUrl: string;
  fetcher?: typeof fetch;
  platform: "ios" | "android" | "web";
  createCorrelationId?: () => string;
}>;

export class UploadsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "UploadsApiError";
    this.status = status;
    this.code = code;
  }
}

function defaultCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `mobile-upload-${Date.now().toString(36)}`
  );
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized) return "";
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new UploadsApiError(
      0,
      "UPLOADS_INVALID_BASE_URL",
      "업로드 API 주소가 올바르지 않습니다.",
    );
  }
  if (url.username || url.password) {
    throw new UploadsApiError(
      0,
      "UPLOADS_INVALID_BASE_URL",
      "업로드 API 주소가 올바르지 않습니다.",
    );
  }
  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "10.0.2.2";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_INSECURE_BASE_URL",
      "업로드 API는 HTTPS 또는 로컬 개발 주소만 사용할 수 있습니다.",
    );
  }
  return normalized;
}

function safeId(value: string, name: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_-]{3,160}$/u.test(normalized)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_INVALID_ID",
      `${name} 식별자가 올바르지 않습니다.`,
    );
  }
  return encodeURIComponent(normalized);
}

function normalizeContentType(value: string): string {
  return value.trim().toLowerCase();
}

const SENSITIVE_UPLOAD_FILE_NAME_TERMS = Object.freeze([
  "salary",
  "payslip",
  "paycheck",
  "payroll",
  "income",
  "bankbook",
  "statement",
  "account",
  "card",
  "token",
  "secret",
  "password",
  "private",
  "월급",
  "급여",
  "급여명세",
  "소득",
  "수입",
  "연봉",
  "계좌",
  "계좌번호",
  "통장",
  "카드",
  "토큰",
  "비밀",
  "비밀번호",
  "주민",
  "주민등록",
  "전화",
  "전화번호",
  "휴대폰",
  "대출",
  "부채",
  "저축",
  "지출",
  "금액",
  "납치",
  "인증",
]);

const UPLOAD_FILE_EXTENSIONS_BY_CONTENT_TYPE = Object.freeze<
  Readonly<Record<string, readonly string[]>>
>({
  "application/pdf": Object.freeze(["pdf"]),
  "image/jpeg": Object.freeze(["jpg", "jpeg"]),
  "image/png": Object.freeze(["png"]),
  "image/webp": Object.freeze(["webp"]),
});

function hasSensitiveFileNameTerm(value: string): boolean {
  const normalized = value.toLocaleLowerCase("ko-KR");
  return SENSITIVE_UPLOAD_FILE_NAME_TERMS.some((term) =>
    normalized.includes(term),
  );
}

function hasSensitiveFileNameShape(value: string): boolean {
  return (
    /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/u.test(value) ||
    /\b\d{2,6}(?:[-\s]\d{2,6}){1,4}\b/u.test(value) ||
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u.test(
      value,
    )
  );
}

function fileExtension(value: string): string | null {
  const match = /\.([A-Za-z0-9]{1,12})$/u.exec(value.trim());
  return match?.[1]?.toLocaleLowerCase("en-US") ?? null;
}

function assertFileNameMatchesContentType(
  fileName: string,
  contentType: string,
): void {
  const extension = fileExtension(fileName);
  if (!extension) {
    throw new UploadsApiError(
      0,
      "UPLOADS_FILE_EXTENSION_REQUIRED",
      "첨부파일 확장자가 필요합니다.",
    );
  }
  const allowedExtensions = UPLOAD_FILE_EXTENSIONS_BY_CONTENT_TYPE[contentType];
  if (!allowedExtensions?.includes(extension)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_FILE_EXTENSION_MISMATCH",
      "첨부파일 확장자가 콘텐츠 형식과 맞지 않습니다.",
    );
  }
}

function safeFileName(value: string): string {
  const trimmed = value.trim();
  if (/[\u0000-\u001F\u007F\u2028\u2029]/u.test(trimmed)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_FILE_NAME_CONTROL_FORBIDDEN",
      "첨부파일 이름에는 제어 문자를 사용할 수 없습니다.",
    );
  }
  if (/(?:file|content):\/\//iu.test(trimmed) || /[\\/]/u.test(trimmed)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_FILE_PATH_FORBIDDEN",
      "첨부파일 이름에는 원본 파일 경로를 넣을 수 없습니다.",
    );
  }
  const normalized = trimmed.replace(/[\\/:*?"<>|]/gu, "_").slice(0, 120);
  if (!normalized) {
    throw new UploadsApiError(
      0,
      "UPLOADS_FILE_NAME_REQUIRED",
      "첨부파일 이름이 필요합니다.",
    );
  }
  if (
    hasSensitiveFileNameTerm(normalized) ||
    hasSensitiveFileNameShape(normalized)
  ) {
    throw new UploadsApiError(
      0,
      "UPLOADS_SENSITIVE_FILE_NAME_FORBIDDEN",
      "민감한 정보가 포함된 파일명은 사용할 수 없습니다.",
    );
  }
  return normalized;
}

function assertCommunityAttachment(input: DirectCommunityAttachmentUpload): {
  readonly contentType: string;
  readonly fileName: string;
} {
  assertDirectUploadFields(input);
  const contentType = normalizeContentType(input.contentType);
  if (!UPLOADS_COMMUNITY_CONTENT_TYPES.includes(contentType)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_CONTENT_TYPE_FORBIDDEN",
      "지원하지 않는 커뮤니티 첨부파일 형식입니다.",
    );
  }
  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes < 1 ||
    input.sizeBytes > UPLOADS_MAX_COMMUNITY_ATTACHMENT_BYTES ||
    input.bytes.byteLength !== input.sizeBytes
  ) {
    throw new UploadsApiError(
      0,
      "UPLOADS_SIZE_FORBIDDEN",
      "커뮤니티 첨부파일 크기가 올바르지 않습니다.",
    );
  }
  const fileName = safeFileName(input.fileName);
  assertFileNameMatchesContentType(fileName, contentType);
  return { contentType, fileName };
}

function assertVariableExpenseReceipt(
  input: DirectVariableExpenseReceiptUpload,
): {
  readonly contentType: string;
  readonly fileName: string;
} {
  assertDirectUploadFields(input);
  const contentType = normalizeContentType(input.contentType);
  if (!UPLOADS_VARIABLE_EXPENSE_RECEIPT_CONTENT_TYPES.includes(contentType)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_CONTENT_TYPE_FORBIDDEN",
      "지원하지 않는 변동지출 영수증 형식입니다.",
    );
  }
  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes < 1 ||
    input.sizeBytes > UPLOADS_MAX_VARIABLE_EXPENSE_RECEIPT_BYTES ||
    input.bytes.byteLength !== input.sizeBytes
  ) {
    throw new UploadsApiError(
      0,
      "UPLOADS_SIZE_FORBIDDEN",
      "변동지출 영수증 크기가 올바르지 않습니다.",
    );
  }
  const fileName = safeFileName(input.fileName);
  assertFileNameMatchesContentType(fileName, contentType);
  return { contentType, fileName };
}

function assertDirectUploadFields(
  input: DirectCommunityAttachmentUpload,
): void {
  const keys = Object.keys(input);
  if (
    keys.length !== 4 ||
    !keys.every((key) =>
      ["bytes", "contentType", "fileName", "sizeBytes"].includes(key),
    )
  ) {
    throw new UploadsApiError(
      0,
      "UPLOADS_UNKNOWN_FIELD_FORBIDDEN",
      "업로드 요청에 허용되지 않은 필드가 포함되어 있습니다.",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const UPLOAD_RESPONSE_CONTENT_TYPES = new Set<string>([
  ...UPLOADS_COMMUNITY_CONTENT_TYPES,
  ...UPLOADS_VARIABLE_EXPENSE_RECEIPT_CONTENT_TYPES,
]);

const UPLOAD_SCAN_STATUSES = new Set<UploadScanStatus>([
  "PENDING",
  "PASSED",
  "FAILED",
  "SKIPPED",
]);

const UPLOAD_STATUSES = new Set<UploadStatus>([
  "PREPARED",
  "UPLOADING",
  "UPLOADED",
  "SCANNING",
  "AVAILABLE",
  "QUARANTINED",
  "DELETED",
]);

function invalidUploadResponse(): never {
  throw new UploadsApiError(
    0,
    "UPLOADS_INVALID_RESPONSE",
    "업로드 응답 형식이 올바르지 않습니다.",
  );
}

function responseContentType(value: string): string {
  const contentType = normalizeContentType(value);
  if (!UPLOAD_RESPONSE_CONTENT_TYPES.has(contentType)) invalidUploadResponse();
  return contentType;
}

function responseScanStatus(value: string): UploadScanStatus {
  const status = value.trim().toUpperCase();
  if (!UPLOAD_SCAN_STATUSES.has(status as UploadScanStatus)) {
    invalidUploadResponse();
  }
  return status as UploadScanStatus;
}

function responseStatus(value: string): UploadStatus {
  const status = value.trim().toUpperCase();
  if (!UPLOAD_STATUSES.has(status as UploadStatus)) invalidUploadResponse();
  return status as UploadStatus;
}

function attachmentFromResponse(value: unknown): UploadAttachment {
  const data = isRecord(value) && isRecord(value.data) ? value.data : {};
  const attachmentId =
    typeof data.attachmentId === "string" ? data.attachmentId : "";
  const fileName = typeof data.fileName === "string" ? data.fileName : "";
  const contentType =
    typeof data.contentType === "string" ? data.contentType : "";
  const sizeBytes =
    typeof data.sizeBytes === "number" && Number.isSafeInteger(data.sizeBytes)
      ? data.sizeBytes
      : 0;
  const scanStatus =
    typeof data.scanStatus === "string" ? data.scanStatus : "PENDING";
  const status = typeof data.status === "string" ? data.status : "UPLOADED";
  if (!attachmentId || !fileName || !contentType || sizeBytes < 1) {
    invalidUploadResponse();
  }
  const normalizedAttachmentId = safeId(attachmentId, "attachmentId");
  const normalizedContentType = responseContentType(contentType);
  const normalizedFileName = safeFileName(fileName);
  assertFileNameMatchesContentType(normalizedFileName, normalizedContentType);
  return {
    attachmentId: normalizedAttachmentId,
    contentType: normalizedContentType,
    fileName: normalizedFileName,
    scanStatus: responseScanStatus(scanStatus),
    sizeBytes,
    status: responseStatus(status),
  };
}

function attachmentIdFromAttachResponse(
  value: unknown,
  expectedAttachmentId: string,
): string {
  const data = isRecord(value) && isRecord(value.data) ? value.data : {};
  if (typeof data.attachmentId !== "string") return expectedAttachmentId;
  const returnedAttachmentId = safeId(data.attachmentId, "attachmentId");
  if (returnedAttachmentId !== expectedAttachmentId) invalidUploadResponse();
  return returnedAttachmentId;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function errorCode(value: unknown): string {
  if (
    isRecord(value) &&
    isRecord(value.error) &&
    typeof value.error.code === "string"
  ) {
    return value.error.code;
  }
  return "UPLOADS_REQUEST_FAILED";
}

function safeIdempotencyPart(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^A-Za-z0-9_-]/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 80);
  return normalized || "request";
}

function uploadIdempotencyKey(correlationId: string, scope: string): string {
  const entropy =
    globalThis.crypto?.randomUUID?.().replace(/-/gu, "") ??
    Date.now().toString(36);
  return [
    "mobile-upload",
    safeIdempotencyPart(correlationId),
    safeIdempotencyPart(scope),
    entropy,
  ].join("-");
}

export function createUploadsApi(options: UploadsApiOptions): UploadsApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetcher = options.fetcher ?? fetch;
  const createCorrelationId =
    options.createCorrelationId ?? defaultCorrelationId;

  async function send(path: string, init: RequestInit): Promise<unknown> {
    if (
      path !== UPLOADS_API_PREFIX &&
      !path.startsWith(`${UPLOADS_API_PREFIX}/`)
    ) {
      throw new UploadsApiError(
        0,
        "UPLOADS_API_BOUNDARY_VIOLATION",
        "업로드 API 경로가 올바르지 않습니다.",
      );
    }
    let response: Response;
    try {
      response = await fetcher(new Request(`${baseUrl}${path}`, init));
    } catch {
      throw new UploadsApiError(
        0,
        "UPLOADS_NETWORK_ERROR",
        "업로드 요청에 실패했습니다.",
      );
    }
    const parsed = await parseJson(response);
    if (!response.ok) {
      throw new UploadsApiError(
        response.status,
        errorCode(parsed),
        "업로드 요청에 실패했습니다.",
      );
    }
    return parsed;
  }

  return {
    async directUploadCommunityAttachment(input) {
      const { contentType, fileName } = assertCommunityAttachment(input);
      const correlationId = createCorrelationId();
      const headers = new Headers({
        "content-type": contentType,
        "x-client-platform": options.platform,
        "x-correlation-id": correlationId,
        "x-idempotency-key": uploadIdempotencyKey(
          correlationId,
          "community-attachment",
        ),
        "x-upload-file-name": fileName,
        "x-upload-owner-type": "USER",
        "x-upload-purpose": "COMMUNITY_ATTACHMENT",
        "x-upload-visibility": "AUTHENTICATED",
        ...UPLOADS_PRIVACY_HEADERS,
      });
      const parsed = await send(UPLOADS_DIRECT_PATH, {
        body: input.bytes,
        credentials: "include",
        headers,
        method: "POST",
      });
      return attachmentFromResponse(parsed);
    },

    async directUploadVariableExpenseReceipt(input) {
      const { contentType, fileName } = assertVariableExpenseReceipt(input);
      const correlationId = createCorrelationId();
      const headers = new Headers({
        "content-type": contentType,
        "x-client-platform": options.platform,
        "x-correlation-id": correlationId,
        "x-idempotency-key": uploadIdempotencyKey(
          correlationId,
          "variable-expense-receipt",
        ),
        "x-upload-file-name": fileName,
        "x-upload-owner-type": "USER",
        "x-upload-purpose": "VARIABLE_EXPENSE_RECEIPT",
        "x-upload-visibility": "AUTHENTICATED",
        ...UPLOADS_PRIVACY_HEADERS,
      });
      const parsed = await send(UPLOADS_DIRECT_PATH, {
        body: input.bytes,
        credentials: "include",
        headers,
        method: "POST",
      });
      return attachmentFromResponse(parsed);
    },

    async attachToCommunityPost(attachmentId, postId) {
      const safeAttachmentId = safeId(attachmentId, "attachmentId");
      const correlationId = createCorrelationId();
      const body = {
        ownerId: safeId(postId, "postId"),
        ownerType: "COMMUNITY_POST",
      };
      const headers = new Headers({
        "content-type": "application/json",
        "x-client-platform": options.platform,
        "x-correlation-id": correlationId,
        "x-idempotency-key": uploadIdempotencyKey(
          correlationId,
          "community-attach",
        ),
        ...UPLOADS_PRIVACY_HEADERS,
      });
      const parsed = await send(
        `${UPLOADS_API_PREFIX}/${safeAttachmentId}/attach`,
        {
          body: JSON.stringify(body),
          credentials: "include",
          headers,
          method: "POST",
        },
      );
      return {
        attachmentId: attachmentIdFromAttachResponse(parsed, safeAttachmentId),
      };
    },

    async attachToVariableExpense(attachmentId, expenseId) {
      const safeAttachmentId = safeId(attachmentId, "attachmentId");
      const correlationId = createCorrelationId();
      const body = {
        ownerId: safeId(expenseId, "expenseId"),
        ownerType: "VARIABLE_EXPENSE",
      };
      const headers = new Headers({
        "content-type": "application/json",
        "x-client-platform": options.platform,
        "x-correlation-id": correlationId,
        "x-idempotency-key": uploadIdempotencyKey(
          correlationId,
          "variable-expense-attach",
        ),
        ...UPLOADS_PRIVACY_HEADERS,
      });
      const parsed = await send(
        `${UPLOADS_API_PREFIX}/${safeAttachmentId}/attach`,
        {
          body: JSON.stringify(body),
          credentials: "include",
          headers,
          method: "POST",
        },
      );
      return {
        attachmentId: attachmentIdFromAttachResponse(parsed, safeAttachmentId),
      };
    },
  };
}
