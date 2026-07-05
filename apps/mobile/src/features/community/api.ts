import {
  COMMUNITY_API_PREFIX,
  COMMUNITY_PRIVACY_HEADERS,
} from "./community.constants";
import { redactCommunityError } from "./community.redaction";
import type {
  CommunityApiResponse,
  CommunityApiTransport,
  CommunityRequestOptions,
} from "./community.types";

export type CommunityApiOptions = Readonly<{
  baseUrl: string;
  fetcher?: typeof fetch;
  platform: "ios" | "android" | "web";
  createCorrelationId?: () => string;
}>;

export class CommunityApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "CommunityApiError";
    this.status = status;
    this.code = code;
  }
}

function defaultCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `mobile-${Date.now().toString(36)}`
  );
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

function communityIdempotencyKey(
  correlationId: string,
  method: string,
): string {
  const entropy =
    globalThis.crypto?.randomUUID?.().replace(/-/gu, "") ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return [
    "mobile-community",
    safeIdempotencyPart(correlationId),
    safeIdempotencyPart(method.toLowerCase()),
    entropy,
  ].join("-");
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized) return "";
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new CommunityApiError(
      0,
      "COMMUNITY_INVALID_BASE_URL",
      "커뮤니티 API 주소를 확인해 주세요.",
    );
  }
  if (url.username || url.password) {
    throw new CommunityApiError(
      0,
      "COMMUNITY_INVALID_BASE_URL",
      "커뮤니티 API 주소를 확인해 주세요.",
    );
  }
  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "10.0.2.2";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new CommunityApiError(
      0,
      "COMMUNITY_INSECURE_BASE_URL",
      "안전한 커뮤니티 API 연결이 필요합니다.",
    );
  }
  return normalized;
}

function isCommunityPath(path: string): boolean {
  return (
    path === COMMUNITY_API_PREFIX || path.startsWith(`${COMMUNITY_API_PREFIX}/`)
  );
}

function readErrorCode(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "code" in value.error &&
    typeof value.error.code === "string"
  ) {
    return value.error.code;
  }
  return "COMMUNITY_REQUEST_FAILED";
}

export function createCommunityApi(
  options: CommunityApiOptions,
): CommunityApiTransport {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const createCorrelationId =
    options.createCorrelationId ?? defaultCorrelationId;

  return {
    async request(
      path: string,
      requestOptions: CommunityRequestOptions = {},
    ): Promise<CommunityApiResponse> {
      if (!isCommunityPath(path)) {
        throw new CommunityApiError(
          0,
          "COMMUNITY_API_BOUNDARY_VIOLATION",
          "허용되지 않은 커뮤니티 API 경로입니다.",
        );
      }

      const method = requestOptions.method ?? "GET";
      const correlationId = createCorrelationId();
      const headers = new Headers({
        accept: "application/json",
        "x-client-platform": options.platform,
        "x-correlation-id": correlationId,
        ...COMMUNITY_PRIVACY_HEADERS,
      });
      const init: RequestInit = {
        method,
        headers,
        credentials: "include",
      };

      if (method.toUpperCase() !== "GET") {
        headers.set(
          "x-idempotency-key",
          communityIdempotencyKey(correlationId, method),
        );
      }

      if (requestOptions.body !== undefined) {
        headers.set("content-type", "application/json");
        init.body = JSON.stringify(requestOptions.body);
      }

      let response: Response;
      try {
        response = await fetcher(`${baseUrl}${path}`, init);
      } catch {
        throw new CommunityApiError(
          0,
          "COMMUNITY_NETWORK_ERROR",
          redactCommunityError({ status: 0 }),
        );
      }

      let parsed: unknown = {};
      let text: string;
      try {
        text = await response.text();
      } catch {
        throw new CommunityApiError(
          response.status,
          "COMMUNITY_INVALID_RESPONSE",
          redactCommunityError({ status: response.status }),
        );
      }
      if (text) {
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          parsed = {};
        }
      }

      if (!response.ok) {
        throw new CommunityApiError(
          response.status,
          readErrorCode(parsed),
          redactCommunityError({ status: response.status }),
        );
      }
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("data" in parsed)
      ) {
        throw new CommunityApiError(
          response.status,
          "COMMUNITY_INVALID_RESPONSE",
          "일시적인 오류입니다. 다시 시도해 주세요.",
        );
      }

      return parsed as CommunityApiResponse;
    },
  };
}
