import { MOBILE_ACCESS_TOKEN_KEY } from "../../../shared/storage/auth-token";
import { createAuthApi } from "../api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("auth api", () => {
  const now = new Date("2026-07-03T00:00:00.000Z");

  it("logs in through the server auth API and stores only the access token", async () => {
    const calls: Request[] = [];
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "auth-login-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        expect(JSON.parse(await normalized.text())).toEqual({
          email: "user@example.com",
          password: "server-password",
          rememberMe: true,
        });
        return jsonResponse({
          data: {
            user: {
              userId: "usr_1",
              roles: "USER",
              accountStatus: "ACTIVE",
            },
            tokens: {
              accessToken: "access.jwt.token",
              refreshToken: "refresh.cookie.token",
              accessTokenExpiresIn: 900,
            },
          },
        });
      },
      now: () => now,
      platform: "android",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    const result = await api.login({
      email: "user@example.com",
      password: "server-password",
      rememberMe: true,
    });

    expect(result.data).toMatchObject({
      status: "AUTHENTICATED",
      accessToken: "access.jwt.token",
      refreshToken: "refresh.cookie.token",
      expiresAt: "2026-07-03T00:15:00.000Z",
      user: {
        id: "usr_1",
        role: "USER",
      },
    });
    expect(stored.get(MOBILE_ACCESS_TOKEN_KEY)).toBe("access.jwt.token");
    expect(Array.from(stored.values()).join(" ")).not.toContain(
      "refresh.cookie.token",
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/auth/login",
    );
    expect(calls[0]?.headers.get("content-type")).toBe("application/json");
    expect(calls[0]?.headers.get("x-correlation-id")).toBe("auth-login-test");
    expect(calls[0]?.headers.get("x-client-platform")).toBe("android");
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
  });

  it("registers with required consents and stores the authenticated access token", async () => {
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "auth-register-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        expect(normalized.url).toBe(
          "https://api.salaryhijacking.com/api/v1/auth/register",
        );
        expect(JSON.parse(await normalized.text())).toEqual({
          email: "new@example.com",
          password: "new-password",
          nickname: "납치러",
          termsAccepted: true,
          privacyAccepted: true,
          marketingAccepted: false,
        });
        return jsonResponse({
          data: {
            user: {
              userId: "usr_new",
              roles: "USER",
              accountStatus: "ACTIVE",
            },
            tokens: {
              accessToken: "new.access.jwt",
              refreshToken: "new.refresh.cookie",
              accessTokenExpiresIn: 900,
            },
            emailVerificationTokenForDelivery: "delivery-token",
          },
        });
      },
      now: () => now,
      platform: "ios",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    const result = await api.register({
      email: "new@example.com",
      marketingAccepted: false,
      nickname: "납치러",
      password: "new-password",
      privacyAccepted: true,
      termsAccepted: true,
    });

    expect(result.data).toMatchObject({
      status: "AUTHENTICATED",
      accessToken: "new.access.jwt",
      emailVerificationRequired: true,
      onboardingRequired: false,
    });
    expect(stored.get(MOBILE_ACCESS_TOKEN_KEY)).toBe("new.access.jwt");
  });

  it("rejects unsafe auth responses before storing a token", async () => {
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            rawPersonalDataExposed: true,
            tokens: {
              accessToken: "unsafe.jwt",
            },
            user: {
              userId: "usr_unsafe",
              roles: "USER",
            },
          },
        }),
      platform: "web",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    await expect(
      api.login({ email: "user@example.com", password: "server-password" }),
    ).rejects.toMatchObject({
      code: "AUTH_UNSAFE_RESPONSE",
    });
    expect(stored.size).toBe(0);
  });

  it("keeps MFA-required logins pending without storing bearer tokens", async () => {
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            mfaRequired: true,
            user: {
              emailMasked: "us***@example.com",
              roles: "USER",
              userId: "usr_mfa",
            },
          },
        }),
      now: () => now,
      platform: "android",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    const result = await api.login({
      email: "user@example.com",
      password: "server-password",
    });

    expect(result.data).toMatchObject({
      status: "MFA_REQUIRED",
      challengeId: "server-mfa-required",
      methods: ["TOTP", "RECOVERY_CODE"],
    });
    expect(stored.size).toBe(0);
  });

  it("requests password reset through the server without storing delivery tokens", async () => {
    const calls: Request[] = [];
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "auth-password-reset-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        expect(normalized.url).toBe(
          "https://api.salaryhijacking.com/api/v1/auth/password-reset",
        );
        expect(normalized.credentials).toBe("include");
        expect(JSON.parse(await normalized.text())).toEqual({
          email: "reset@example.com",
        });
        return jsonResponse({
          data: {
            accepted: true,
            resetTokenForDelivery: "delivery-only-reset-token",
          },
        });
      },
      platform: "android",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    const result = await api.requestPasswordReset({
      email: "reset@example.com",
    });

    expect(result).toEqual({ accepted: true });
    expect(JSON.stringify(result)).not.toContain("delivery-only-reset-token");
    expect(stored.size).toBe(0);
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
  });

  it("confirms password reset through the server without storing reset secrets", async () => {
    const calls: Request[] = [];
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "auth-password-reset-confirm-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        expect(normalized.url).toBe(
          "https://api.salaryhijacking.com/api/v1/auth/password-reset/confirm",
        );
        expect(normalized.credentials).toBe("include");
        expect(JSON.parse(await normalized.text())).toEqual({
          token: "reset-token-from-link",
          newPassword: "New-safe-password-1!",
        });
        return jsonResponse({ data: { completed: true } });
      },
      platform: "android",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    const result = await api.confirmPasswordReset({
      token: "reset-token-from-link",
      newPassword: "New-safe-password-1!",
    });

    expect(result).toEqual({ completed: true });
    expect(stored.size).toBe(0);
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
  });

  it("refreshes the access token through the server refresh cookie without storing refresh tokens", async () => {
    const calls: Request[] = [];
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "auth-refresh-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        expect(normalized.url).toBe(
          "https://api.salaryhijacking.com/api/v1/auth/refresh",
        );
        expect(normalized.credentials).toBe("include");
        expect(JSON.parse(await normalized.text())).toEqual({
          deviceId: "device-1",
        });
        return jsonResponse({
          data: {
            user: {
              userId: "usr_refresh",
              roles: "USER",
              accountStatus: "ACTIVE",
            },
            tokens: {
              accessToken: "refreshed.access.jwt",
              refreshToken: "rotated.refresh.cookie",
              accessTokenExpiresIn: 900,
            },
          },
        });
      },
      now: () => now,
      platform: "android",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    const result = await api.refresh({ deviceId: "device-1" });

    expect(result.data).toMatchObject({
      status: "AUTHENTICATED",
      accessToken: "refreshed.access.jwt",
    });
    expect(stored.get(MOBILE_ACCESS_TOKEN_KEY)).toBe("refreshed.access.jwt");
    expect(Array.from(stored.values()).join(" ")).not.toContain(
      "rotated.refresh.cookie",
    );
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
  });

  it("logs out through the server and clears only the local access token", async () => {
    const calls: Request[] = [];
    const deleted: string[] = [];
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "auth-logout-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        expect(normalized.url).toBe(
          "https://api.salaryhijacking.com/api/v1/auth/logout",
        );
        expect(normalized.credentials).toBe("include");
        expect(JSON.parse(await normalized.text())).toEqual({});
        return jsonResponse({ data: { revoked: true } });
      },
      platform: "ios",
      tokenStore: {
        setItemAsync: async () => undefined,
        deleteItemAsync: async (key) => {
          deleted.push(key);
        },
      },
    });

    const result = await api.logout();

    expect(result).toEqual({ revoked: true });
    expect(deleted).toEqual([MOBILE_ACCESS_TOKEN_KEY]);
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
  });

  it("clears the local access token even when server logout is rejected", async () => {
    const deleted: string[] = [];
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({ error: { code: "AUTH_SESSION_REVOKE_FAILED" } }, 503),
      platform: "android",
      tokenStore: {
        setItemAsync: async () => undefined,
        deleteItemAsync: async (key) => {
          deleted.push(key);
        },
      },
    });

    await expect(api.logout()).rejects.toMatchObject({
      code: "AUTH_SESSION_REVOKE_FAILED",
    });
    expect(deleted).toEqual([MOBILE_ACCESS_TOKEN_KEY]);
  });

  it("clears the local access token when refresh is rejected by the server", async () => {
    const deleted: string[] = [];
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({ error: { code: "AUTH_REFRESH_TOKEN_INVALID" } }, 401),
      platform: "android",
      tokenStore: {
        setItemAsync: async () => undefined,
        deleteItemAsync: async (key) => {
          deleted.push(key);
        },
      },
    });

    await expect(api.refresh()).rejects.toMatchObject({
      code: "AUTH_REFRESH_TOKEN_INVALID",
    });
    expect(deleted).toEqual([MOBILE_ACCESS_TOKEN_KEY]);
  });
});
