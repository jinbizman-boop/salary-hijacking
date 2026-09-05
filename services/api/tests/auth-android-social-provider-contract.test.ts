import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const env = Object.freeze({
  APP_ENV: "development",
  EXPO_PUBLIC_APP_SCHEME: "salaryhijacking",
  JWT_SECRET: "local-test-jwt-secret-with-at-least-32-characters",
  KAKAO_REST_API_KEY: "kakao-public-client-id",
  NAVER_CLIENT_ID: "naver-public-client-id",
  GOOGLE_CLIENT_ID: "google-public-client-id",
  HASH_SECRET: "local-test-hash-secret-with-at-least-32-characters",
  RATE_LIMIT_HASH_SECRET: "local-test-rate-secret-with-at-least-32-characters",
  AUDIT_HASH_SECRET: "local-test-audit-secret-with-at-least-32-characters",
});

async function json(response: Response): Promise<{
  readonly data?: Record<string, unknown>;
  readonly error?: { readonly code?: string };
}> {
  return (await response.json()) as {
    readonly data?: Record<string, unknown>;
    readonly error?: { readonly code?: string };
  };
}

describe("Android launch social provider contract", () => {
  it("rejects stale Apple and Facebook OAuth starts for the Android launch surface", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-09-05T09:00:00.000Z"),
    });
    const redirectUri =
      "salaryhijacking%3A%2F%2Fauth%2Foauth%2Fcallback";

    for (const provider of ["APPLE", "FACEBOOK"] as const) {
      const response = await app.fetch(
        new Request(
          `https://api.test/api/v1/auth/oauth?provider=${provider}&redirectUri=${redirectUri}`,
        ),
        env,
        context,
      );
      const body = await json(response);

      expect(response.status).toBe(400);
      expect(body.error?.code).toBe("AUTH_PROVIDER_UNSUPPORTED");
      expect(JSON.stringify(body)).not.toContain("nonce");
    }
  });

  it("keeps Kakao, Naver, and Google OAuth start URLs wired to provider endpoints", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-09-05T09:00:00.000Z"),
    });
    const codeChallenge = "clientGeneratedPkceChallengeForAndroidSocial123456";
    const redirectUri =
      "salaryhijacking%3A%2F%2Fauth%2Foauth%2Fcallback";
    const cases = [
      ["KAKAO", "https://kauth.kakao.com/oauth/authorize"],
      ["NAVER", "https://nid.naver.com/oauth2.0/authorize"],
      ["GOOGLE", "https://accounts.google.com/o/oauth2/v2/auth"],
    ] as const;

    for (const [provider, endpoint] of cases) {
      const response = await app.fetch(
        new Request(
          `https://api.test/api/v1/auth/oauth?provider=${provider}&redirectUri=${redirectUri}&codeChallenge=${codeChallenge}`,
        ),
        env,
        context,
      );
      const body = await json(response);

      expect(response.status).toBe(200);
      expect(body.error?.code).toBeUndefined();
      expect(body.data?.provider).toBe(provider);
      expect(String(body.data?.authorizationUrl)).toContain(endpoint);
      expect(String(body.data?.authorizationUrl)).toContain(
        `code_challenge=${codeChallenge}`,
      );
    }
  });

  it("does not synthesize social identities without a configured provider verifier", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-09-05T09:00:00.000Z"),
    });

    const tokenLogin = await app.fetch(
      new Request("https://api.test/api/v1/auth/social-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "GOOGLE",
          providerToken: "provider-code-or-token",
          email: "unverified-social@example.test",
          nickname: "unsafe",
        }),
      }),
      env,
      context,
    );
    const tokenLoginBody = await json(tokenLogin);

    expect(tokenLogin.status).toBe(501);
    expect(tokenLoginBody.error?.code).toBe(
      "AUTH_PROVIDER_VERIFICATION_REQUIRED",
    );
    expect(JSON.stringify(tokenLoginBody)).not.toContain(
      "unverified-social@example.test",
    );
  });

  it("requires server-side provider code verification before completing OAuth callback", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-09-05T09:00:00.000Z"),
    });

    const start = await app.fetch(
      new Request(
        "https://api.test/api/v1/auth/oauth?provider=KAKAO&redirectUri=salaryhijacking%3A%2F%2Fauth%2Foauth%2Fcallback",
      ),
      env,
      context,
    );
    const startBody = await json(start);

    const callback = await app.fetch(
      new Request("https://api.test/api/v1/auth/oauth/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          state: String(startBody.data?.state),
          code: "kakao-auth-code",
          codeVerifier: String(startBody.data?.codeVerifier),
        }),
      }),
      env,
      context,
    );
    const callbackBody = await json(callback);

    expect(callback.status).toBe(501);
    expect(callbackBody.error?.code).toBe(
      "AUTH_PROVIDER_VERIFICATION_REQUIRED",
    );
  });
});
