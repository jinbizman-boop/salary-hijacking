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
    throw new UploadsApiError(0, "UPLOADS_INVALID_BASE_URL", "Invalid API URL");
  }
  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "10.0.2.2";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_INSECURE_BASE_URL",
      "Uploads API requires HTTPS",
    );
  }
  return normalized;
}

function safeId(value: string, name: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_-]{3,160}$/u.test(normalized)) {
    throw new UploadsApiError(0, "UPLOADS_INVALID_ID", `${name} is invalid`);
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
      "File extension is required",
    );
  }
  const allowedExtensions = UPLOAD_FILE_EXTENSIONS_BY_CONTENT_TYPE[contentType];
  if (!allowedExtensions?.includes(extension)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_FILE_EXTENSION_MISMATCH",
      "File extension does not match content type",
    );
  }
}

function safeFileName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[\\/:*?"<>|]/gu, "_")
    .slice(0, 120);
  if (!normalized) {
    throw new UploadsApiError(
      0,
      "UPLOADS_FILE_NAME_REQUIRED",
      "File name is required",
    );
  }
  if (
    hasSensitiveFileNameTerm(normalized) ||
    hasSensitiveFileNameShape(normalized)
  ) {
    throw new UploadsApiError(
      0,
      "UPLOADS_SENSITIVE_FILE_NAME_FORBIDDEN",
      "Sensitive file names are not allowed",
    );
  }
  return normalized;
}

function assertCommunityAttachment(input: DirectCommunityAttachmentUpload): {
  readonly contentType: string;
  readonly fileName: string;
} {
  const contentType = normalizeContentType(input.contentType);
  if (!UPLOADS_COMMUNITY_CONTENT_TYPES.includes(contentType)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_CONTENT_TYPE_FORBIDDEN",
      "Unsupported community attachment type",
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
      "Community attachment size is invalid",
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
  const contentType = normalizeContentType(input.contentType);
  if (!UPLOADS_VARIABLE_EXPENSE_RECEIPT_CONTENT_TYPES.includes(contentType)) {
    throw new UploadsApiError(
      0,
      "UPLOADS_CONTENT_TYPE_FORBIDDEN",
      "Unsupported variable expense receipt type",
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
      "Variable expense receipt size is invalid",
    );
  }
  const fileName = safeFileName(input.fileName);
  assertFileNameMatchesContentType(fileName, contentType);
  return { contentType, fileName };
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
    "Invalid uploads response",
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
  const normalizedContentType = responseContentType(contentType);
  const normalizedFileName = safeFileName(fileName);
  assertFileNameMatchesContentType(normalizedFileName, normalizedContentType);
  return {
    attachmentId,
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
        "Invalid uploads API path",
      );
    }
    const response = await fetcher(new Request(`${baseUrl}${path}`, init));
    const parsed = await parseJson(response);
    if (!response.ok) {
      throw new UploadsApiError(
        response.status,
        errorCode(parsed),
        "Uploads request failed",
      );
    }
    return parsed;
  }

  return {
    async directUploadCommunityAttachment(input) {
      const { contentType, fileName } = assertCommunityAttachment(input);
      const headers = new Headers({
        "content-type": contentType,
        "x-client-platform": options.platform,
        "x-correlation-id": createCorrelationId(),
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
      const headers = new Headers({
        "content-type": contentType,
        "x-client-platform": options.platform,
        "x-correlation-id": createCorrelationId(),
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
      const body = {
        ownerId: safeId(postId, "postId"),
        ownerType: "COMMUNITY_POST",
      };
      const headers = new Headers({
        "content-type": "application/json",
        "x-client-platform": options.platform,
        "x-correlation-id": createCorrelationId(),
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
      const body = {
        ownerId: safeId(expenseId, "expenseId"),
        ownerType: "VARIABLE_EXPENSE",
      };
      const headers = new Headers({
        "content-type": "application/json",
        "x-client-platform": options.platform,
        "x-correlation-id": createCorrelationId(),
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
