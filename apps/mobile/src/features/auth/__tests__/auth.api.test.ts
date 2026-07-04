import { MOBILE_ACCESS_TOKEN_KEY } from "../../../shared/storage/auth-token";
import { createAuthApi } from "../api";
import { AUTH_OAUTH_PKCE_VERIFIER_KEY_PREFIX } from "../constants";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("auth api", () => {
  const now = new Date("2026-07-03T00:00:00.000Z");

  it("allows the Android emulator loopback base URL for local native E2E builds", async () => {
    const calls: Request[] = [];
    const api = createAuthApi({
      baseUrl: "http://10.0.2.2:8787",
      createCorrelationId: () => "auth-emulator-loopback-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            user: {
              userId: "usr_emulator",
              roles: "USER",
              accountStatus: "ACTIVE",
            },
            tokens: {
              accessToken: "emulator.access.jwt",
              accessTokenExpiresIn: 900,
            },
          },
        });
      },
      platform: "android",
      tokenStore: {
        setItemAsync: async () => undefined,
      },
    });

    await api.refresh();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://10.0.2.2:8787/api/v1/auth/refresh");
    expect(calls[0]?.headers.get("x-correlation-id")).toBe(
      "auth-emulator-loopback-test",
    );
  });

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

  it("normalizes auth email inputs before sending them to the server", async () => {
    const calls: Request[] = [];
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            accepted: true,
            user: {
              accountStatus: "ACTIVE",
              roles: "USER",
              userId: "usr_normalized",
            },
            tokens: {
              accessToken: "normalized.access.jwt",
              accessTokenExpiresIn: 900,
            },
          },
        });
      },
      now: () => now,
      platform: "android",
      tokenStore: {
        setItemAsync: async () => undefined,
      },
    });

    await api.login({
      email: " User@Example.COM ",
      password: "server-password",
    });
    await api.requestPasswordReset({ email: " Reset@Example.COM " });
    await api.requestEmailVerification({ email: " Verify@Example.COM " });

    const bodies = await Promise.all(
      calls.map((call) => call.clone().json() as Promise<{ email?: string }>),
    );
    expect(bodies.map((body) => body.email)).toEqual([
      "user@example.com",
      "reset@example.com",
      "verify@example.com",
    ]);
  });

  it("rejects malformed auth email inputs before fetch", async () => {
    const calls: Request[] = [];
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "android",
    });

    await expect(
      api.login({ email: "not-an-email", password: "server-password" }),
    ).rejects.toMatchObject({ code: "AUTH_EMAIL_INVALID" });
    await expect(
      api.register({
        email: "new@example",
        nickname: "신규 사용자",
        password: "new-password-1",
        privacyAccepted: true,
        termsAccepted: true,
      }),
    ).rejects.toMatchObject({ code: "AUTH_EMAIL_INVALID" });
    await expect(
      api.requestPasswordReset({ email: "reset at example.com" }),
    ).rejects.toMatchObject({ code: "AUTH_EMAIL_INVALID" });
    await expect(
      api.requestEmailVerification({ email: "verify@example" }),
    ).rejects.toMatchObject({ code: "AUTH_EMAIL_INVALID" });
    expect(calls).toHaveLength(0);
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
          password: "new-password-1",
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
      password: "new-password-1",
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

  it("rejects signup without required legal consents before fetch", async () => {
    const calls: Request[] = [];
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "android",
    });

    await expect(
      api.register({
        email: "new@example.com",
        nickname: "신규 사용자",
        password: "new-password-1",
        privacyAccepted: true,
        termsAccepted: false,
      }),
    ).rejects.toMatchObject({
      code: "AUTH_REQUIRED_CONSENT_MISSING",
    });
    await expect(
      api.register({
        email: "new@example.com",
        nickname: "신규 사용자",
        password: "new-password-1",
        privacyAccepted: false,
        termsAccepted: true,
      }),
    ).rejects.toMatchObject({
      code: "AUTH_REQUIRED_CONSENT_MISSING",
    });
    expect(calls).toHaveLength(0);
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

  it("rejects malformed access tokens before writing secure storage", async () => {
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            user: {
              userId: "usr_malformed",
              roles: "USER",
              accountStatus: "ACTIVE",
            },
            tokens: {
              accessToken: "bad\r\nauthorization-token",
              accessTokenExpiresIn: 900,
            },
          },
        }),
      platform: "android",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    await expect(
      api.login({ email: "user@example.com", password: "server-password" }),
    ).rejects.toMatchObject({
      code: "AUTH_INVALID_RESPONSE",
    });
    expect(stored.size).toBe(0);
  });

  it("rejects bearer-prefixed access tokens before writing secure storage", async () => {
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            user: {
              userId: "usr_bearer_prefixed",
              roles: "USER",
              accountStatus: "ACTIVE",
            },
            tokens: {
              accessToken: "Bearer server-token",
              accessTokenExpiresIn: 900,
            },
          },
        }),
      platform: "android",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    await expect(
      api.login({ email: "user@example.com", password: "server-password" }),
    ).rejects.toMatchObject({
      code: "AUTH_INVALID_RESPONSE",
    });
    expect(stored.size).toBe(0);
  });

  it("rejects whitespace-padded access tokens before writing secure storage", async () => {
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            user: {
              userId: "usr_padded_token",
              roles: "USER",
              accountStatus: "ACTIVE",
            },
            tokens: {
              accessToken: " access.jwt.token ",
              accessTokenExpiresIn: 900,
            },
          },
        }),
      platform: "android",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    await expect(
      api.login({ email: "user@example.com", password: "server-password" }),
    ).rejects.toMatchObject({
      code: "AUTH_INVALID_RESPONSE",
    });
    expect(stored.size).toBe(0);
  });

  it("rejects non-positive access token TTLs before writing secure storage", async () => {
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            user: {
              userId: "usr_bad_ttl",
              roles: "USER",
              accountStatus: "ACTIVE",
            },
            tokens: {
              accessToken: "access.jwt.token",
              accessTokenExpiresIn: 0,
            },
          },
        }),
      platform: "android",
      tokenStore: {
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
      },
    });

    await expect(
      api.login({ email: "user@example.com", password: "server-password" }),
    ).rejects.toMatchObject({
      code: "AUTH_INVALID_RESPONSE",
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

  it("verifies email through the server without storing verification tokens", async () => {
    const calls: Request[] = [];
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "auth-verify-email-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        expect(normalized.url).toBe(
          "https://api.salaryhijacking.com/api/v1/auth/verify-email",
        );
        expect(JSON.parse(await normalized.text())).toEqual({
          token: "email.verify.token",
        });
        return jsonResponse({
          data: {
            verified: true,
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

    const result = await api.verifyEmail({ token: "email.verify.token" });

    expect(result).toEqual({ verified: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.headers.get("x-correlation-id")).toBe(
      "auth-verify-email-test",
    );
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(Array.from(stored.values()).join(" ")).not.toContain(
      "email.verify.token",
    );
  });

  it("requests a new email verification token without storing delivery tokens", async () => {
    const calls: Request[] = [];
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "auth-email-verification-resend-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        expect(normalized.url).toBe(
          "https://api.salaryhijacking.com/api/v1/auth/verify-email/resend",
        );
        expect(normalized.credentials).toBe("include");
        expect(JSON.parse(await normalized.text())).toEqual({
          email: "verify@example.com",
        });
        return jsonResponse({
          data: {
            accepted: true,
            emailVerificationTokenForDelivery: "delivery-only-email-token",
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

    const result = await api.requestEmailVerification({
      email: "verify@example.com",
    });

    expect(result).toEqual({ accepted: true });
    expect(JSON.stringify(result)).not.toContain("delivery-only-email-token");
    expect(stored.size).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.headers.get("x-correlation-id")).toBe(
      "auth-email-verification-resend-test",
    );
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
  });

  it("starts social OAuth with an app-generated PKCE challenge and stores only the local verifier", async () => {
    const calls: Request[] = [];
    const stored = new Map<string, string>();
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "auth-oauth-start-test",
      createOAuthPkcePair: async () => ({
        codeVerifier: "app-local-code-verifier",
        codeChallenge: "app-local-code-challenge",
      }),
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        expect(new URL(normalized.url).searchParams.get("codeChallenge")).toBe(
          "app-local-code-challenge",
        );
        return jsonResponse({
          data: {
            provider: "KAKAO",
            state: "oauth-state-1",
            codeChallenge: "app-local-code-challenge",
            codeChallengeMethod: "S256",
            redirectUri: "salaryhijacking://auth/oauth/callback",
            authorizationUrl:
              "https://accounts.kakao.example/oauth/authorize?state=oauth-state-1",
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

    const result = await api.startOAuth({
      provider: "KAKAO",
      redirectUri: "salaryhijacking://auth/oauth/callback",
    });

    expect(result).toEqual({
      provider: "KAKAO",
      state: "oauth-state-1",
      codeChallenge: "app-local-code-challenge",
      codeChallengeMethod: "S256",
      redirectUri: "salaryhijacking://auth/oauth/callback",
      authorizationUrl:
        "https://accounts.kakao.example/oauth/authorize?state=oauth-state-1",
    });
    expect(JSON.stringify(result)).not.toContain("app-local-code-verifier");
    expect(
      stored.get(`${AUTH_OAUTH_PKCE_VERIFIER_KEY_PREFIX}oauth-state-1`),
    ).toBe("app-local-code-verifier");
    expect(stored.get(MOBILE_ACCESS_TOKEN_KEY)).toBeUndefined();
    expect(stored.size).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("GET");
    const startUrl = new URL(calls[0]?.url ?? "");
    expect(startUrl.origin + startUrl.pathname).toBe(
      "https://api.salaryhijacking.com/api/v1/auth/oauth",
    );
    expect(startUrl.searchParams.get("provider")).toBe("KAKAO");
    expect(startUrl.searchParams.get("redirectUri")).toBe(
      "salaryhijacking://auth/oauth/callback",
    );
    expect(startUrl.searchParams.get("codeChallenge")).toBe(
      "app-local-code-challenge",
    );
    expect(calls[0]?.credentials).toBe("include");
    expect(calls[0]?.headers.get("x-correlation-id")).toBe(
      "auth-oauth-start-test",
    );
    expect(calls[0]?.headers.get("x-client-platform")).toBe("android");
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
  });

  it("completes social OAuth callback with the stored verifier and clears it after token storage", async () => {
    const calls: Request[] = [];
    const stored = new Map<string, string>([
      [
        `${AUTH_OAUTH_PKCE_VERIFIER_KEY_PREFIX}oauth-state-2`,
        "stored-code-verifier",
      ],
    ]);
    const deleted: string[] = [];
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "auth-oauth-callback-test",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        expect(normalized.url).toBe(
          "https://api.salaryhijacking.com/api/v1/auth/oauth/callback",
        );
        expect(normalized.credentials).toBe("include");
        expect(JSON.parse(await normalized.text())).toEqual({
          state: "oauth-state-2",
          code: "provider-callback-code",
          codeVerifier: "stored-code-verifier",
          deviceId: "device-oauth",
        });
        return jsonResponse({
          data: {
            user: {
              userId: "usr_oauth",
              roles: "USER",
              accountStatus: "ACTIVE",
            },
            tokens: {
              accessToken: "oauth.access.jwt",
              refreshToken: "oauth.refresh.cookie",
              accessTokenExpiresIn: 900,
            },
          },
        });
      },
      now: () => now,
      platform: "android",
      tokenStore: {
        getItemAsync: async (key) => stored.get(key) ?? null,
        setItemAsync: async (key, value) => {
          stored.set(key, value);
        },
        deleteItemAsync: async (key) => {
          deleted.push(key);
          stored.delete(key);
        },
      },
    });

    const result = await api.completeOAuth({
      state: "oauth-state-2",
      code: "provider-callback-code",
      deviceId: "device-oauth",
    });

    expect(result.data).toMatchObject({
      status: "AUTHENTICATED",
      accessToken: "oauth.access.jwt",
      user: { id: "usr_oauth", role: "USER" },
    });
    expect(stored.get(MOBILE_ACCESS_TOKEN_KEY)).toBe("oauth.access.jwt");
    expect(JSON.stringify(result)).not.toContain("stored-code-verifier");
    expect(Array.from(stored.values()).join(" ")).not.toContain(
      "oauth.refresh.cookie",
    );
    expect(deleted).toContain(
      `${AUTH_OAUTH_PKCE_VERIFIER_KEY_PREFIX}oauth-state-2`,
    );
    expect(
      stored.has(`${AUTH_OAUTH_PKCE_VERIFIER_KEY_PREFIX}oauth-state-2`),
    ).toBe(false);
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
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

  it("rejects weak signup and reset passwords before fetch", async () => {
    const calls: Request[] = [];
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "android",
    });

    await expect(
      api.register({
        email: "new@example.com",
        nickname: "new user",
        password: "short1",
        privacyAccepted: true,
        termsAccepted: true,
      }),
    ).rejects.toMatchObject({ code: "AUTH_PASSWORD_POLICY_INVALID" });

    await expect(
      api.confirmPasswordReset({
        token: "reset-token-from-link",
        newPassword: "longbutwithoutnumber",
      }),
    ).rejects.toMatchObject({ code: "AUTH_PASSWORD_POLICY_INVALID" });

    expect(calls).toHaveLength(0);
  });

  it("rejects short password reset tokens before fetch", async () => {
    const calls: Request[] = [];
    const api = createAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "android",
    });

    await expect(
      api.confirmPasswordReset({
        token: "short",
        newPassword: "New-safe-password-1!",
      }),
    ).rejects.toMatchObject({ code: "AUTH_PASSWORD_RESET_TOKEN_INVALID" });

    expect(calls).toHaveLength(0);
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
