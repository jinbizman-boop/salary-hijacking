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
  HASH_SECRET: "local-test-hash-secret-with-at-least-32-characters",
  RATE_LIMIT_HASH_SECRET: "local-test-rate-secret-with-at-least-32-characters",
  AUDIT_HASH_SECRET: "local-test-audit-secret-with-at-least-32-characters",
});

describe("auth route env secret wiring", () => {
  it("allows the verified mobile app scheme as an OAuth redirect target", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-06-29T05:00:00.000Z"),
    });

    const response = await app.fetch(
      new Request(
        "https://api.test/api/v1/auth/oauth?provider=KAKAO&redirectUri=salaryhijacking%3A%2F%2Fauth%2Foauth%2Fcallback",
      ),
      env,
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly authorizationUrl?: string;
        readonly redirectUri?: string;
        readonly state?: string;
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.redirectUri).toBe(
      "salaryhijacking://auth/oauth/callback",
    );
    expect(body.data?.state).toEqual(expect.stringMatching(/^ost_/));
    expect(body.data?.authorizationUrl).toContain(
      "https://kauth.kakao.com/oauth/authorize?",
    );
    expect(body.data?.authorizationUrl).toContain(
      "client_id=kakao-public-client-id",
    );
    expect(body.data?.authorizationUrl).toContain(
      "redirect_uri=salaryhijacking%3A%2F%2Fauth%2Foauth%2Fcallback",
    );
    expect(body.data?.authorizationUrl).toContain("code_challenge_method=S256");
  });

  it("passes AppEnv JWT_SECRET into auth routes and keeps the fallback repository stable across auth requests", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-06-29T05:00:00.000Z"),
    });

    const response = await app.fetch(
      new Request("https://api.test/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "env-secret@example.com",
          password: "StrongPass123!",
          nickname: "envsecret",
          termsAccepted: true,
          privacyAccepted: true,
          marketingAccepted: false,
        }),
      }),
      env,
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly tokens?: {
          readonly accessToken?: string;
          readonly refreshToken?: string;
        };
        readonly user?: {
          readonly userId?: string;
        };
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(201);
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.tokens?.accessToken).toEqual(expect.any(String));
    expect(body.data?.tokens?.refreshToken).toEqual(expect.any(String));
    expect(body.data?.user?.userId).toEqual(expect.stringMatching(/^usr_/));

    const loginResponse = await app.fetch(
      new Request("https://api.test/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "env-secret@example.com",
          password: "StrongPass123!",
        }),
      }),
      env,
      context,
    );
    const loginBody = (await loginResponse.json()) as {
      readonly data?: {
        readonly tokens?: {
          readonly accessToken?: string;
          readonly refreshToken?: string;
        };
      };
      readonly error?: { readonly code?: string };
    };

    expect(loginResponse.status).toBe(200);
    expect(loginBody.error?.code).toBeUndefined();
    expect(loginBody.data?.tokens?.accessToken).toEqual(expect.any(String));
    expect(loginBody.data?.tokens?.refreshToken).toEqual(expect.any(String));
  });
});
