import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import {
  hashPasswordForAuth,
  verifyPasswordForAuth,
} from "../src/routes/auth.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const env = Object.freeze({
  APP_ENV: "development",
  JWT_SECRET: "local-test-jwt-secret-with-at-least-32-characters",
  HASH_SECRET: "local-test-hash-secret-with-at-least-32-characters",
  RATE_LIMIT_HASH_SECRET: "local-test-rate-secret-with-at-least-32-characters",
  AUDIT_HASH_SECRET: "local-test-audit-secret-with-at-least-32-characters",
});

async function post(path: string, body: Record<string, unknown>) {
  const app = createApp({
    enableAuditGate: false,
    enableRateLimit: false,
    now: () => new Date("2026-08-14T01:00:00.000Z"),
  });
  const response = await app.fetch(
    new Request(`https://api.test${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    env,
    context,
  );
  return {
    response,
    body: (await response.json()) as {
      readonly data?: {
      readonly tokens?: {
        readonly accessToken?: string;
        readonly refreshToken?: string;
      };
      readonly resetTokenForDelivery?: string;
    };
    readonly error?: { readonly code?: string };
  },
  };
}

describe("Phase 3 auth session security", () => {
  it("uses PBKDF2-SHA256 for new email password hashes and keeps login working", async () => {
    const hash = await hashPasswordForAuth("StrongPass123!");
    expect(hash).toMatch(/^pbkdf2-sha256\$310000\$/);
    expect(hash).not.toContain("StrongPass123!");
    await expect(verifyPasswordForAuth("StrongPass123!", hash)).resolves.toBe(
      true,
    );
    await expect(verifyPasswordForAuth("WrongPass123!", hash)).resolves.toBe(
      false,
    );
  });

  it("detects refresh-token reuse and revokes the rotated token family", async () => {
    const register = await post("/api/v1/auth/register", {
      email: "phase3-refresh@example.test",
      password: "StrongPass123!",
      nickname: "phase3refresh",
      termsAccepted: true,
      privacyAccepted: true,
      marketingAccepted: false,
    });
    expect(register.response.status).toBe(201);
    const firstRefresh = register.body.data?.tokens?.refreshToken;
    expect(firstRefresh).toEqual(expect.any(String));

    const firstRotation = await post("/api/v1/auth/refresh", {
      refreshToken: firstRefresh,
    });
    expect(firstRotation.response.status).toBe(200);
    const secondRefresh = firstRotation.body.data?.tokens?.refreshToken;
    expect(secondRefresh).toEqual(expect.any(String));

    const replay = await post("/api/v1/auth/refresh", {
      refreshToken: firstRefresh,
    });
    expect(replay.response.status).toBe(401);
    expect(replay.body.error?.code).toBe("AUTH_REFRESH_TOKEN_REUSED");

    const revokedFamily = await post("/api/v1/auth/refresh", {
      refreshToken: secondRefresh,
    });
    expect(revokedFamily.response.status).toBe(401);
    expect(revokedFamily.body.error?.code).toBe("AUTH_REFRESH_TOKEN_REUSED");
  });

  it("does not expose email verification or password reset delivery tokens outside local test environments", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-08-14T01:10:00.000Z"),
    });
    const productionLikeEnv = { ...env, APP_ENV: "qa" };

    const registerResponse = await app.fetch(
      new Request("https://api.test/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "phase3-delivery-token@example.test",
          password: "StrongPass123!",
          nickname: "phase3delivery",
          termsAccepted: true,
          privacyAccepted: true,
          marketingAccepted: false,
        }),
      }),
      productionLikeEnv,
      context,
    );
    const registerBody = (await registerResponse.json()) as {
      readonly data?: Record<string, unknown>;
    };

    expect(registerResponse.status).toBe(201);
    expect(registerBody.data).not.toHaveProperty(
      "emailVerificationTokenForDelivery",
    );
    expect(registerBody.data?.emailVerificationDeliveryQueued).toBe(true);

    const resetResponse = await app.fetch(
      new Request("https://api.test/api/v1/auth/password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "phase3-delivery-token@example.test",
        }),
      }),
      productionLikeEnv,
      context,
    );
    const resetBody = (await resetResponse.json()) as {
      readonly data?: Record<string, unknown>;
    };

    expect(resetResponse.status).toBe(200);
    expect(resetBody.data).not.toHaveProperty("resetTokenForDelivery");
    expect(resetBody.data?.resetDeliveryQueued).toBe(true);
  });

  it("blocks password reset token replay after one successful confirmation", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-08-14T01:20:00.000Z"),
    });
    const email = "phase3-reset-replay@example.test";

    const registerResponse = await app.fetch(
      new Request("https://api.test/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password: "StrongPass123!",
          nickname: "phase3reset",
          termsAccepted: true,
          privacyAccepted: true,
          marketingAccepted: false,
        }),
      }),
      env,
      context,
    );
    expect(registerResponse.status).toBe(201);

    const requestResponse = await app.fetch(
      new Request("https://api.test/api/v1/auth/password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      }),
      env,
      context,
    );
    const requestBody = (await requestResponse.json()) as {
      readonly data?: { readonly resetTokenForDelivery?: string };
    };
    expect(requestResponse.status).toBe(200);
    const resetToken = requestBody.data?.resetTokenForDelivery;
    expect(resetToken).toEqual(expect.any(String));

    const firstConfirm = await app.fetch(
      new Request("https://api.test/api/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          newPassword: "NewStrongPass123!",
        }),
      }),
      env,
      context,
    );
    expect(firstConfirm.status).toBe(200);

    const replayConfirm = await app.fetch(
      new Request("https://api.test/api/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          newPassword: "AnotherStrongPass123!",
        }),
      }),
      env,
      context,
    );
    const replayBody = (await replayConfirm.json()) as {
      readonly error?: { readonly code?: string };
    };
    expect(replayConfirm.status).toBe(400);
    expect(replayBody.error?.code).toBe("AUTH_PASSWORD_RESET_INVALID");
  });

  it("allows current-session logout with the refresh token without exposing a bearer token", async () => {
    const register = await post("/api/v1/auth/register", {
      email: "phase3-logout@example.test",
      password: "StrongPass123!",
      nickname: "phase3logout",
      termsAccepted: true,
      privacyAccepted: true,
      marketingAccepted: false,
    });
    expect(register.response.status).toBe(201);
    const refreshToken = register.body.data?.tokens?.refreshToken;
    expect(refreshToken).toEqual(expect.any(String));

    const logout = await post("/api/v1/auth/logout", { refreshToken });
    expect(logout.response.status).toBe(200);
  });
});
