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
  const localHost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
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

      const headers = new Headers({
        accept: "application/json",
        "x-client-platform": options.platform,
        "x-correlation-id": createCorrelationId(),
        ...COMMUNITY_PRIVACY_HEADERS,
      });
      const init: RequestInit = {
        method: requestOptions.method ?? "GET",
        headers,
        credentials: "include",
      };

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
      const text = await response.text();
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
