import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const env = Object.freeze({
  APP_ENV: "development",
  EXPO_PUBLIC_APP_SCHEME: "salaryhijacking",
  JWT_SECRET: "local-test-jwt-secret-with-at-least-32-characters",
  APPLE_CLIENT_ID: "com.salaryhijacking.app",
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

describe("Apple OAuth nonce contract", () => {
  it("issues a nonce for Apple OAuth and binds it to the authorization URL", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-08-17T09:00:00.000Z"),
    });

    const response = await app.fetch(
      new Request(
        "https://api.test/api/v1/auth/oauth?provider=APPLE&redirectUri=salaryhijacking%3A%2F%2Fauth%2Foauth%2Fcallback&codeChallenge=clientGeneratedPkceChallengeForAppleOAuthStart123",
      ),
      env,
      context,
    );
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.nonce).toEqual(expect.stringMatching(/^onc_/));
    expect(String(body.data?.authorizationUrl)).toContain("nonce=onc_");
  });

  it("rejects an Apple OAuth callback when the nonce is missing or wrong", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-08-17T09:00:00.000Z"),
    });

    const start = await app.fetch(
      new Request(
        "https://api.test/api/v1/auth/oauth?provider=APPLE&redirectUri=salaryhijacking%3A%2F%2Fauth%2Foauth%2Fcallback",
      ),
      env,
      context,
    );
    const startBody = await json(start);
    const state = String(startBody.data?.state);

    const missingNonce = await app.fetch(
      new Request("https://api.test/api/v1/auth/oauth/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          state,
          code: "apple-code",
          codeVerifier: String(startBody.data?.codeVerifier),
        }),
      }),
      env,
      context,
    );
    const missingNonceBody = await json(missingNonce);

    expect(missingNonce.status).toBe(400);
    expect(missingNonceBody.error?.code).toBe("AUTH_OAUTH_NONCE_INVALID");

    const start2 = await app.fetch(
      new Request(
        "https://api.test/api/v1/auth/oauth?provider=APPLE&redirectUri=salaryhijacking%3A%2F%2Fauth%2Foauth%2Fcallback",
      ),
      env,
      context,
    );
    const startBody2 = await json(start2);

    const wrongNonce = await app.fetch(
      new Request("https://api.test/api/v1/auth/oauth/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          state: String(startBody2.data?.state),
          code: "apple-code",
          codeVerifier: String(startBody2.data?.codeVerifier),
          nonce: "onc_wrong",
        }),
      }),
      env,
      context,
    );
    const wrongNonceBody = await json(wrongNonce);

    expect(wrongNonce.status).toBe(400);
    expect(wrongNonceBody.error?.code).toBe("AUTH_OAUTH_NONCE_INVALID");
  });

  it("accepts the matching Apple nonce once and rejects replayed state", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-08-17T09:00:00.000Z"),
    });

    const start = await app.fetch(
      new Request(
        "https://api.test/api/v1/auth/oauth?provider=APPLE&redirectUri=salaryhijacking%3A%2F%2Fauth%2Foauth%2Fcallback",
      ),
      env,
      context,
    );
    const startBody = await json(start);

    const callbackBody = {
      state: String(startBody.data?.state),
      code: "apple-code",
      codeVerifier: String(startBody.data?.codeVerifier),
      nonce: String(startBody.data?.nonce),
    };
    const accepted = await app.fetch(
      new Request("https://api.test/api/v1/auth/oauth/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(callbackBody),
      }),
      env,
      context,
    );
    const acceptedBody = await json(accepted);

    expect(accepted.status).toBe(200);
    expect(acceptedBody.error?.code).toBeUndefined();

    const replay = await app.fetch(
      new Request("https://api.test/api/v1/auth/oauth/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(callbackBody),
      }),
      env,
      context,
    );
    const replayBody = await json(replay);

    expect(replay.status).toBe(400);
    expect(replayBody.error?.code).toBe("AUTH_OAUTH_STATE_INVALID");
  });
});
