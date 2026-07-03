import { describe, expect, it } from "vitest";
import {
  createNeonAuthRepository,
  shouldUseNeonAuthRepository,
} from "../src/repositories/auth.repository";
import type { AuthRuntime } from "../src/routes/auth.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const identityId = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";

function createRuntime(): AuthRuntime<unknown> {
  return {
    request: new Request("https://api.test/api/v1/auth/login"),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL("https://api.test/api/v1/auth/login"),
    path: "/api/v1/auth/login",
    relativePath: "/login",
    method: "POST",
    requestId: "auth-db-repository-test",
    now: new Date("2026-07-03T05:00:00.000Z"),
    repository: {} as never,
    options: {},
  };
}

function authUserRow(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    user_id: userId,
    email: "user@example.com",
    nickname: "급여납치러",
    provider: "EMAIL",
    status: "ACTIVE",
    level: 1,
    mfa_enabled: false,
    credential_hash: "sha256$salt$hashed-password",
    created_at: "2026-07-03T04:00:00.000Z",
    last_login_at: null,
    roles: ["USER"],
    ...extra,
  };
}

describe("Neon auth repository", () => {
  it("uses Neon only when a supported database URL env is present", () => {
    expect(
      shouldUseNeonAuthRepository({
        SALARY_HIJACKING_DATABASE_URL: "postgres://example.invalid/db",
      }),
    ).toBe(true);
    expect(shouldUseNeonAuthRepository({ APP_ENV: "test" })).toBe(false);
  });

  it("creates an email user through users, auth identity, credential, and consent tables without raw password storage", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonAuthRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows: [authUserRow()], rowCount: 1 };
      },
    });

    const created = await repository.createEmailUser(
      {
        email: "User@Example.COM",
        password: "PlainPassword123!",
        nickname: "급여납치러",
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: false,
        deviceId: "raw-device-id",
      },
      "sha256$salt$hashed-password",
      createRuntime(),
    );

    expect(created).toMatchObject({
      userId,
      emailMasked: "us***@example.com",
      provider: "EMAIL",
      accountStatus: "ACTIVE",
      passwordHash: "sha256$salt$hashed-password",
    });
    expect(calls.map((call) => call.operationName)).toEqual([
      "auth.createEmailUser",
    ]);
    expect(calls[0]?.sqlText).toContain("insert into public.users");
    expect(calls[0]?.sqlText).toContain("public.auth_credentials");
    expect(calls[0]?.sqlText).toContain("public.user_consents");
    expect(calls[0]?.params).toContain("sha256$salt$hashed-password");
    expect(calls[0]?.params).not.toContain("PlainPassword123!");
    expect(calls[0]?.params).not.toContain("raw-device-id");
  });

  it("loads email login credentials without returning raw email, owner ids in public fields, or tokens", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonAuthRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows: [authUserRow()], rowCount: 1 };
      },
    });

    const user = await repository.findUserByEmail(
      "USER@example.com",
      createRuntime(),
    );

    expect(user).toMatchObject({
      userId,
      emailMasked: "us***@example.com",
      passwordHash: "sha256$salt$hashed-password",
      roles: ["USER"],
    });
    expect(calls[0]?.operationName).toBe("auth.findUserByEmail");
    expect(calls[0]?.sqlText).toContain("public.auth_credentials");
    expect(calls[0]?.params).toEqual(["user@example.com"]);
    expect(JSON.stringify(user)).not.toContain("USER@example.com");
    expect(JSON.stringify(user)).not.toContain("rfr_");
  });

  it("stores refresh sessions by hash only and returns no raw device identifier", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonAuthRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            {
              session_id: sessionId,
              user_id: userId,
              refresh_token_hash: "sha256-refresh-token-hash",
              expires_at: "2026-08-02T05:00:00.000Z",
              revoked_at: null,
              created_at: "2026-07-03T05:00:00.000Z",
            },
          ],
          rowCount: 1,
        };
      },
    });

    const session = await repository.createSession(
      {
        sessionId,
        userId,
        refreshTokenHash: "sha256-refresh-token-hash",
        deviceId: "raw-device-id",
        expiresAt: "2026-08-02T05:00:00.000Z",
      },
      createRuntime(),
    );

    expect(session).toMatchObject({
      sessionId,
      userId,
      refreshTokenHash: "sha256-refresh-token-hash",
      deviceId: null,
      revokedAt: null,
    });
    expect(calls[0]?.operationName).toBe("auth.createSession");
    expect(calls[0]?.sqlText).toContain("insert into public.auth_sessions");
    expect(calls[0]?.params).toContain("sha256-refresh-token-hash");
    expect(calls[0]?.params).not.toContain("rfr_raw-token");
    expect(calls[0]?.params).not.toContain("raw-device-id");
  });
});
