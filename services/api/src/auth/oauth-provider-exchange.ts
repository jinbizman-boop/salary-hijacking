import {
  AuthRouteError,
  type AuthProvider,
  type AuthRuntime,
  type ProviderProfile,
} from "../routes/auth.routes";

interface TokenPayload {
  readonly access_token?: unknown;
  readonly id_token?: unknown;
  readonly token_type?: unknown;
}

interface GoogleProfilePayload {
  readonly sub?: unknown;
  readonly email?: unknown;
  readonly name?: unknown;
}

interface KakaoProfilePayload {
  readonly id?: unknown;
  readonly kakao_account?: {
    readonly email?: unknown;
    readonly profile?: { readonly nickname?: unknown };
  };
  readonly properties?: { readonly nickname?: unknown };
}

interface NaverProfilePayload {
  readonly response?: {
    readonly id?: unknown;
    readonly email?: unknown;
    readonly nickname?: unknown;
    readonly name?: unknown;
  };
}

const TOKEN_ENDPOINTS: Record<AuthProvider, string | null> = {
  EMAIL: null,
  GOOGLE: "https://oauth2.googleapis.com/token",
  KAKAO: "https://kauth.kakao.com/oauth/token",
  NAVER: "https://nid.naver.com/oauth2.0/token",
};

const PROFILE_ENDPOINTS: Record<AuthProvider, string | null> = {
  EMAIL: null,
  GOOGLE: "https://openidconnect.googleapis.com/v1/userinfo",
  KAKAO: "https://kapi.kakao.com/v2/user/me",
  NAVER: "https://openapi.naver.com/v1/nid/me",
};

function envText<TEnv>(runtime: AuthRuntime<TEnv>, key: string): string | null {
  const value = (runtime.env as Record<string, unknown> | null)?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /^replace-with-/iu.test(trimmed)) return null;
  return trimmed;
}

function clientId<TEnv>(
  provider: AuthProvider,
  runtime: AuthRuntime<TEnv>,
): string | null {
  if (provider === "GOOGLE") return envText(runtime, "GOOGLE_CLIENT_ID");
  if (provider === "KAKAO") return envText(runtime, "KAKAO_REST_API_KEY");
  if (provider === "NAVER") return envText(runtime, "NAVER_CLIENT_ID");
  return null;
}

function clientSecret<TEnv>(
  provider: AuthProvider,
  runtime: AuthRuntime<TEnv>,
): string | null {
  if (provider === "GOOGLE") return envText(runtime, "GOOGLE_CLIENT_SECRET");
  if (provider === "KAKAO") return envText(runtime, "KAKAO_CLIENT_SECRET");
  if (provider === "NAVER") return envText(runtime, "NAVER_CLIENT_SECRET");
  return null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function tokenFromPayload(payload: unknown): string {
  const accessToken = optionalString((payload as TokenPayload | null)?.access_token);
  if (!accessToken)
    throw new AuthRouteError(
      503,
      "AUTH_SOCIAL_TOKEN_EXCHANGE_FAILED",
      "일시적으로 소셜 로그인을 사용할 수 없습니다.",
    );
  return accessToken;
}

function providerConfigError(provider: AuthProvider): AuthRouteError {
  return new AuthRouteError(
    501,
    "AUTH_PROVIDER_VERIFICATION_REQUIRED",
    `${provider} OAuth provider 검증 구성이 필요합니다.`,
  );
}

function providerExchangeError(): AuthRouteError {
  return new AuthRouteError(
    503,
    "AUTH_SOCIAL_TOKEN_EXCHANGE_FAILED",
    "일시적으로 소셜 로그인을 사용할 수 없습니다.",
  );
}

async function requestToken<TEnv>(
  provider: AuthProvider,
  code: string,
  codeVerifier: string,
  redirectUri: string,
  runtime: AuthRuntime<TEnv>,
): Promise<string> {
  const endpoint = TOKEN_ENDPOINTS[provider];
  const id = clientId(provider, runtime);
  if (!endpoint || !id) throw providerConfigError(provider);
  const secret = clientSecret(provider, runtime);
  if (provider === "NAVER" && !secret) throw providerConfigError(provider);

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("client_id", id);
  if (secret) body.set("client_secret", secret);
  body.set("code", code);
  body.set("redirect_uri", redirectUri);
  body.set("code_verifier", codeVerifier);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });
  if (!response.ok) throw providerExchangeError();
  return tokenFromPayload(await parseJson(response));
}

async function requestProfile(
  provider: AuthProvider,
  accessToken: string,
): Promise<unknown> {
  const endpoint = PROFILE_ENDPOINTS[provider];
  if (!endpoint) throw providerConfigError(provider);
  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) throw providerExchangeError();
  return parseJson(response);
}

function googleProfile(payload: unknown): ProviderProfile {
  const body = payload as GoogleProfilePayload | null;
  const subject = optionalString(body?.sub);
  if (!subject)
    throw new AuthRouteError(
      422,
      "AUTH_PROVIDER_ID_MISSING",
      "소셜 계정 정보를 확인할 수 없습니다.",
    );
  return {
    provider: "GOOGLE",
    subject,
    email: optionalString(body?.email),
    nickname: optionalString(body?.name),
  };
}

function kakaoProfile(payload: unknown): ProviderProfile {
  const body = payload as KakaoProfilePayload | null;
  const rawId = body?.id;
  const subject =
    typeof rawId === "number" || typeof rawId === "string" ? String(rawId) : "";
  if (!subject)
    throw new AuthRouteError(
      422,
      "AUTH_PROVIDER_ID_MISSING",
      "소셜 계정 정보를 확인할 수 없습니다.",
    );
  return {
    provider: "KAKAO",
    subject,
    email: optionalString(body?.kakao_account?.email),
    nickname:
      optionalString(body?.kakao_account?.profile?.nickname) ??
      optionalString(body?.properties?.nickname),
  };
}

function naverProfile(payload: unknown): ProviderProfile {
  const body = payload as NaverProfilePayload | null;
  const subject = optionalString(body?.response?.id);
  if (!subject)
    throw new AuthRouteError(
      422,
      "AUTH_PROVIDER_ID_MISSING",
      "소셜 계정 정보를 확인할 수 없습니다.",
    );
  return {
    provider: "NAVER",
    subject,
    email: optionalString(body?.response?.email),
    nickname:
      optionalString(body?.response?.nickname) ??
      optionalString(body?.response?.name),
  };
}

function normalizeProfile(
  provider: AuthProvider,
  payload: unknown,
): ProviderProfile {
  if (provider === "GOOGLE") return googleProfile(payload);
  if (provider === "KAKAO") return kakaoProfile(payload);
  if (provider === "NAVER") return naverProfile(payload);
  throw providerConfigError(provider);
}

export async function exchangeOAuthCodeWithProvider<TEnv>(
  provider: AuthProvider,
  code: string,
  codeVerifier: string,
  redirectUri: string,
  runtime: AuthRuntime<TEnv>,
): Promise<ProviderProfile> {
  const accessToken = await requestToken(
    provider,
    code,
    codeVerifier,
    redirectUri,
    runtime,
  );
  return normalizeProfile(provider, await requestProfile(provider, accessToken));
}
