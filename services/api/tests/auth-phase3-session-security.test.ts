import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import {
  type AuthRepository,
  type AuthUser,
  createAuthRoutes,
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

async function legacySha256Hash(password: string): Promise<string> {
  const salt = "legacy-salt";
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `sha256$${salt}$${hex}`;
}

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses PBKDF2-SHA256 for new email password hashes and keeps login working", async () => {
    const hash = await hashPasswordForAuth("StrongPass123!");
    expect(hash).toMatch(/^pbkdf2-sha256\$\d+\$/);
    const iterations = Number(hash.split("$")[1]);
    expect(iterations).toBeGreaterThanOrEqual(100_000);
    expect(iterations).toBeLessThanOrEqual(100_000);
    expect(hash).not.toContain("StrongPass123!");
    await expect(verifyPasswordForAuth("StrongPass123!", hash)).resolves.toBe(
      true,
    );
    await expect(verifyPasswordForAuth("WrongPass123!", hash)).resolves.toBe(
      false,
    );
  });

  it("logs unexpected auth route diagnostics without raw secrets or PII", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const routes = createAuthRoutes({
      jwtSecret: env.JWT_SECRET,
      repository: {
        name: "throwing-auth-repository",
        async findUserByEmail() {
          return null;
        },
        async findUserByProvider() {
          return null;
        },
        async findUserById() {
          return null;
        },
        async createEmailUser() {
          throw new Error(
            "insert failed password=StrongPass123! token=raw-token email=phase3@example.test",
          );
        },
        async upsertSocialUser() {
          throw new Error("not used");
        },
        async updateLastLogin() {},
        async createSession() {
          throw new Error("not used");
        },
        async findSessionByRefreshHash() {
          return null;
        },
        async revokeSession() {},
        async revokeAllUserSessions() {
          return 0;
        },
        async storeEmailVerification() {},
        async verifyEmail() {
          return null;
        },
        async storePasswordReset() {},
        async resetPassword() {
          return null;
        },
        async storeOAuthState() {},
        async consumeOAuthState() {
          return null;
        },
        async verifyMfa() {
          return false;
        },
      } satisfies AuthRepository<typeof env>,
    });

    const response = await routes(
      new Request("https://api.test/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "phase3@example.test",
          password: "StrongPass123!",
          nickname: "phase3",
          termsAccepted: true,
          privacyAccepted: true,
        }),
      }),
      env,
      context,
    );

    expect(response.status).toBe(500);
    expect(warn).toHaveBeenCalledWith(
      "auth_routes_unexpected_error",
      expect.objectContaining({
        name: "Error",
        message: expect.stringContaining("[REDACTED]"),
      }),
    );
    const serialized = JSON.stringify(warn.mock.calls);
    expect(serialized).not.toContain("StrongPass123!");
    expect(serialized).not.toContain("raw-token");
    expect(serialized).not.toContain("phase3@example.test");
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

  it("upgrades a valid legacy SHA-256 credential to PBKDF2 after successful login", async () => {
    const user: AuthUser = {
      userId: "usr_legacy_rehash",
      emailMasked: "le***@example.test",
      nickname: "legacy",
      provider: "EMAIL",
      roles: ["USER"],
      permissions: [],
      accountStatus: "ACTIVE",
      level: 1,
      mfaEnabled: false,
      passwordHash: await legacySha256Hash("StrongPass123!"),
      createdAt: "2026-08-14T01:00:00.000Z",
      lastLoginAt: null,
    };
    let upgradedHash: string | null = null;
    const sessions = new Map<string, string>();
    const repository: AuthRepository<(typeof env)> = {
      name: "phase3-legacy-rehash-test-repository",
      async findUserByEmail() {
        return { ...user, passwordHash: upgradedHash ?? user.passwordHash };
      },
      async findUserByProvider() {
        return null;
      },
      async findUserById() {
        return { ...user, passwordHash: upgradedHash ?? user.passwordHash };
      },
      async createEmailUser() {
        throw new Error("not used");
      },
      async upsertSocialUser() {
        throw new Error("not used");
      },
      async updateLastLogin() {},
      async upgradePasswordHash(_userId, passwordHash) {
        upgradedHash = passwordHash;
      },
      async createSession(input) {
        sessions.set(input.refreshTokenHash, input.sessionId);
        return {
          ...input,
          createdAt: "2026-08-14T01:00:00.000Z",
          revokedAt: null,
        };
      },
      async findSessionByRefreshHash() {
        return null;
      },
      async revokeSession() {},
      async revokeAllUserSessions() {
        return 0;
      },
      async storeEmailVerification() {},
      async verifyEmail() {
        return null;
      },
      async storePasswordReset() {},
      async resetPassword() {
        return null;
      },
      async storeOAuthState() {},
      async consumeOAuthState() {
        return null;
      },
      async verifyMfa() {
        return false;
      },
    };
    const handler = createAuthRoutes<(typeof env)>({
      repository,
      jwtSecret: env.JWT_SECRET,
      now: () => new Date("2026-08-14T01:30:00.000Z"),
    });

    const login = await handler(
      new Request("https://api.test/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "legacy@example.test",
          password: "StrongPass123!",
        }),
      }),
      env,
      context,
    );

    expect(login.status).toBe(200);
    expect(upgradedHash).toMatch(/^pbkdf2-sha256\$100000\$/);
    expect(upgradedHash).not.toContain("StrongPass123!");
  });
});
