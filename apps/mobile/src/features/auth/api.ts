import {
  normalizeMobileAuthResponse,
  normalizeMobileSignupResponse,
} from "../../shared/api/auth-response";
import { MOBILE_ACCESS_TOKEN_KEY } from "../../shared/storage/auth-token";
import {
  AUTH_LOGOUT_PATH,
  AUTH_LOGIN_PATH,
  AUTH_OAUTH_START_PATH,
  AUTH_PASSWORD_RESET_CONFIRM_PATH,
  AUTH_PASSWORD_RESET_PATH,
  AUTH_REFRESH_PATH,
  AUTH_REGISTER_PATH,
  AUTH_SAFE_ERROR_MESSAGE,
} from "./constants";
import type {
  AuthApiClient,
  AuthLoginRequest,
  AuthLogoutResult,
  AuthOAuthStartRequest,
  AuthOAuthStartResult,
  AuthPasswordResetConfirmRequest,
  AuthPasswordResetConfirmResult,
  AuthPasswordResetRequest,
  AuthPasswordResetResult,
  AuthRefreshRequest,
  AuthRegisterRequest,
  AuthSocialProvider,
  AuthTokenStore,
} from "./types";

export type AuthApiOptions = Readonly<{
  baseUrl: string;
  platform: "ios" | "android" | "web";
  fetcher?: typeof fetch;
  createCorrelationId?: () => string;
  now?: () => Date;
  tokenStore?: AuthTokenStore;
}>;

export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

const PRIVACY_HEADERS = Object.freeze({
  "x-raw-financial-data-exposed": "false",
  "x-raw-personal-data-exposed": "false",
  "x-raw-push-token-exposed": "false",
  "x-ad-financial-targeting-used": "false",
});

const UNSAFE_RESPONSE_FLAGS = [
  "rawFinancialDataExposed",
  "financialRawDataExposed",
  "rawPersonalDataExposed",
  "personalRawDataExposed",
  "rawPushTokenExposed",
  "pushTokenRawDataExposed",
  "adsFinancialTargetingUsed",
] as const;

const SOCIAL_PROVIDERS = new Set<AuthSocialProvider>([
  "KAKAO",
  "NAVER",
  "GOOGLE",
  "APPLE",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultCorrelationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `auth-${Date.now().toString(36)}`;
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized) return "";

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new AuthApiError(0, "AUTH_INVALID_BASE_URL", AUTH_SAFE_ERROR_MESSAGE);
  }

  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "10.0.2.2";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new AuthApiError(
      0,
      "AUTH_INSECURE_BASE_URL",
      AUTH_SAFE_ERROR_MESSAGE,
    );
  }
  return normalized;
}

function errorCode(value: unknown): string {
  if (
    !isRecord(value) ||
    !isRecord(value.error) ||
    typeof value.error.code !== "string"
  ) {
    return "AUTH_REQUEST_FAILED";
  }
  return value.error.code;
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

function cleanText(value: string): string {
  return value.trim();
}

function assertPresent(value: string, code: string): string {
  const normalized = cleanText(value);
  if (!normalized) {
    throw new AuthApiError(0, code, AUTH_SAFE_ERROR_MESSAGE);
  }
  return normalized;
}

function hasUnsafeResponseFlag(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (UNSAFE_RESPONSE_FLAGS.some((flag) => value[flag] === true)) return true;
  return Object.values(value).some((child) => {
    if (Array.isArray(child)) return child.some(hasUnsafeResponseFlag);
    return hasUnsafeResponseFlag(child);
  });
}

function appendOptional(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value !== undefined) target[key] = value;
}

function authHeaders(
  platform: AuthApiOptions["platform"],
  correlationId: string,
  hasJsonBody: boolean,
): Headers {
  const headers = new Headers({
    accept: "application/json",
    "x-client-platform": platform,
    "x-correlation-id": correlationId,
    ...PRIVACY_HEADERS,
  });
  if (hasJsonBody) headers.set("content-type", "application/json");
  return headers;
}

function assertSocialProvider(value: AuthSocialProvider): AuthSocialProvider {
  if (!SOCIAL_PROVIDERS.has(value)) {
    throw new AuthApiError(
      0,
      "AUTH_OAUTH_PROVIDER_INVALID",
      AUTH_SAFE_ERROR_MESSAGE,
    );
  }
  return value;
}

function optionalNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalAuthorizationUrl(value: unknown): string | null {
  const normalized = optionalNonEmptyString(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" ? normalized : null;
  } catch {
    return null;
  }
}

async function persistAccessToken(
  tokenStore: AuthTokenStore | undefined,
  accessToken: string | null | undefined,
): Promise<void> {
  const token = accessToken?.trim();
  if (!token || !tokenStore) return;

  try {
    await tokenStore.setItemAsync(MOBILE_ACCESS_TOKEN_KEY, token);
  } catch {
    throw new AuthApiError(
      0,
      "AUTH_TOKEN_STORE_FAILED",
      AUTH_SAFE_ERROR_MESSAGE,
    );
  }
}

async function clearAccessToken(
  tokenStore: AuthTokenStore | undefined,
): Promise<void> {
  if (!tokenStore?.deleteItemAsync) return;

  try {
    await tokenStore.deleteItemAsync(MOBILE_ACCESS_TOKEN_KEY);
  } catch {
    throw new AuthApiError(
      0,
      "AUTH_TOKEN_STORE_FAILED",
      AUTH_SAFE_ERROR_MESSAGE,
    );
  }
}

function logoutResult(value: unknown): AuthLogoutResult {
  const data = isRecord(value) && isRecord(value.data) ? value.data : {};
  return { revoked: data.revoked === true };
}

function passwordResetResult(value: unknown): AuthPasswordResetResult {
  const data = isRecord(value) && isRecord(value.data) ? value.data : {};
  return { accepted: data.accepted === true };
}

function passwordResetConfirmResult(
  value: unknown,
): AuthPasswordResetConfirmResult {
  const data = isRecord(value) && isRecord(value.data) ? value.data : {};
  return { completed: data.completed === true };
}

function oauthStartResult(value: unknown): AuthOAuthStartResult {
  const data = isRecord(value) && isRecord(value.data) ? value.data : {};
  const provider = data.provider;
  if (
    typeof provider !== "string" ||
    !SOCIAL_PROVIDERS.has(provider as AuthSocialProvider)
  ) {
    throw new AuthApiError(0, "AUTH_INVALID_RESPONSE", AUTH_SAFE_ERROR_MESSAGE);
  }
  const state = optionalNonEmptyString(data.state);
  const redirectUri = optionalNonEmptyString(data.redirectUri);
  if (!state || !redirectUri) {
    throw new AuthApiError(0, "AUTH_INVALID_RESPONSE", AUTH_SAFE_ERROR_MESSAGE);
  }
  return {
    provider: provider as AuthSocialProvider,
    state,
    codeChallenge: optionalNonEmptyString(data.codeChallenge),
    codeChallengeMethod: data.codeChallengeMethod === "S256" ? "S256" : null,
    redirectUri,
    authorizationUrl: optionalAuthorizationUrl(data.authorizationUrl),
  };
}

export function createAuthApi(options: AuthApiOptions): AuthApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetcher = options.fetcher ?? fetch;
  const createCorrelationId =
    options.createCorrelationId ?? defaultCorrelationId;
  const now = options.now ?? (() => new Date());

  async function post(path: string, body: Record<string, unknown>) {
    const headers = authHeaders(options.platform, createCorrelationId(), true);

    let response: Response;
    try {
      response = await fetcher(
        new Request(`${baseUrl}${path}`, {
          body: JSON.stringify(body),
          credentials: "include",
          headers,
          method: "POST",
        }),
      );
    } catch {
      throw new AuthApiError(0, "AUTH_NETWORK_ERROR", AUTH_SAFE_ERROR_MESSAGE);
    }

    const parsed = await parseJson(response);
    if (!response.ok) {
      throw new AuthApiError(
        response.status,
        errorCode(parsed),
        AUTH_SAFE_ERROR_MESSAGE,
      );
    }
    if (hasUnsafeResponseFlag(parsed)) {
      throw new AuthApiError(
        0,
        "AUTH_UNSAFE_RESPONSE",
        AUTH_SAFE_ERROR_MESSAGE,
      );
    }
    return parsed;
  }

  async function get(path: string, query: Record<string, string>) {
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    const headers = authHeaders(options.platform, createCorrelationId(), false);

    let response: Response;
    try {
      response = await fetcher(
        new Request(url.toString(), {
          credentials: "include",
          headers,
          method: "GET",
        }),
      );
    } catch {
      throw new AuthApiError(0, "AUTH_NETWORK_ERROR", AUTH_SAFE_ERROR_MESSAGE);
    }

    const parsed = await parseJson(response);
    if (!response.ok) {
      throw new AuthApiError(
        response.status,
        errorCode(parsed),
        AUTH_SAFE_ERROR_MESSAGE,
      );
    }
    if (hasUnsafeResponseFlag(parsed)) {
      throw new AuthApiError(
        0,
        "AUTH_UNSAFE_RESPONSE",
        AUTH_SAFE_ERROR_MESSAGE,
      );
    }
    return parsed;
  }

  return {
    async login(request: AuthLoginRequest) {
      const body: Record<string, unknown> = {
        email: assertPresent(request.email, "AUTH_EMAIL_REQUIRED"),
        password: assertPresent(request.password, "AUTH_PASSWORD_REQUIRED"),
      };
      appendOptional(body, "rememberMe", request.rememberMe);
      appendOptional(body, "deviceId", request.deviceId);

      const parsed = await post(AUTH_LOGIN_PATH, body);
      let normalized;
      try {
        normalized = normalizeMobileAuthResponse(
          parsed as Readonly<{ data?: unknown; error?: unknown }>,
          now(),
        );
      } catch {
        throw new AuthApiError(
          0,
          "AUTH_INVALID_RESPONSE",
          AUTH_SAFE_ERROR_MESSAGE,
        );
      }
      if (!normalized.data) {
        throw new AuthApiError(
          0,
          "AUTH_INVALID_RESPONSE",
          AUTH_SAFE_ERROR_MESSAGE,
        );
      }
      if (normalized.data.status === "AUTHENTICATED") {
        await persistAccessToken(
          options.tokenStore,
          normalized.data.accessToken,
        );
      }
      return normalized;
    },

    async register(request: AuthRegisterRequest) {
      const body: Record<string, unknown> = {
        email: assertPresent(request.email, "AUTH_EMAIL_REQUIRED"),
        nickname: assertPresent(request.nickname, "AUTH_NICKNAME_REQUIRED"),
        password: assertPresent(request.password, "AUTH_PASSWORD_REQUIRED"),
        privacyAccepted: request.privacyAccepted === true,
        termsAccepted: request.termsAccepted === true,
      };
      appendOptional(body, "marketingAccepted", request.marketingAccepted);
      appendOptional(body, "deviceId", request.deviceId);

      const parsed = await post(AUTH_REGISTER_PATH, body);
      let normalized;
      try {
        normalized = normalizeMobileSignupResponse(
          parsed as Readonly<{ data?: unknown; error?: unknown }>,
          now(),
        );
      } catch {
        throw new AuthApiError(
          0,
          "AUTH_INVALID_RESPONSE",
          AUTH_SAFE_ERROR_MESSAGE,
        );
      }
      if (!normalized.data) {
        throw new AuthApiError(
          0,
          "AUTH_INVALID_RESPONSE",
          AUTH_SAFE_ERROR_MESSAGE,
        );
      }
      if (normalized.data.status === "AUTHENTICATED") {
        await persistAccessToken(
          options.tokenStore,
          normalized.data.accessToken,
        );
      }
      return normalized;
    },

    async startOAuth(request: AuthOAuthStartRequest) {
      const parsed = await get(AUTH_OAUTH_START_PATH, {
        provider: assertSocialProvider(request.provider),
        redirectUri: assertPresent(
          request.redirectUri,
          "AUTH_OAUTH_REDIRECT_URI_REQUIRED",
        ),
      });
      return oauthStartResult(parsed);
    },

    async requestPasswordReset(request: AuthPasswordResetRequest) {
      const parsed = await post(AUTH_PASSWORD_RESET_PATH, {
        email: assertPresent(request.email, "AUTH_EMAIL_REQUIRED"),
      });
      return passwordResetResult(parsed);
    },

    async confirmPasswordReset(request: AuthPasswordResetConfirmRequest) {
      const parsed = await post(AUTH_PASSWORD_RESET_CONFIRM_PATH, {
        token: assertPresent(
          request.token,
          "AUTH_PASSWORD_RESET_TOKEN_REQUIRED",
        ),
        newPassword: assertPresent(
          request.newPassword,
          "AUTH_PASSWORD_REQUIRED",
        ),
      });
      return passwordResetConfirmResult(parsed);
    },

    async refresh(request: AuthRefreshRequest = {}) {
      const body: Record<string, unknown> = {};
      appendOptional(body, "deviceId", request.deviceId);

      let parsed: unknown;
      try {
        parsed = await post(AUTH_REFRESH_PATH, body);
      } catch (error) {
        await clearAccessToken(options.tokenStore);
        throw error;
      }
      let normalized;
      try {
        normalized = normalizeMobileAuthResponse(
          parsed as Readonly<{ data?: unknown; error?: unknown }>,
          now(),
        );
      } catch {
        await clearAccessToken(options.tokenStore);
        throw new AuthApiError(
          0,
          "AUTH_INVALID_RESPONSE",
          AUTH_SAFE_ERROR_MESSAGE,
        );
      }
      if (!normalized.data || normalized.data.status !== "AUTHENTICATED") {
        await clearAccessToken(options.tokenStore);
        throw new AuthApiError(
          0,
          "AUTH_INVALID_RESPONSE",
          AUTH_SAFE_ERROR_MESSAGE,
        );
      }
      await persistAccessToken(options.tokenStore, normalized.data.accessToken);
      return normalized;
    },

    async logout() {
      let parsed: unknown;
      try {
        parsed = await post(AUTH_LOGOUT_PATH, {});
      } finally {
        await clearAccessToken(options.tokenStore);
      }
      return logoutResult(parsed);
    },
  };
}
