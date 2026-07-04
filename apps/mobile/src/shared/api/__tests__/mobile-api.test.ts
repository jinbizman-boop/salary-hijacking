import {
  createMobileAuthenticatedFetcher,
  createMobileAuthApi,
  createMobileBudgetApi,
  createMobilePublicConfigApi,
  createMobileUploadsApi,
} from "../mobile-api";
import { MOBILE_ACCESS_TOKEN_KEY } from "../../storage/auth-token";

describe("mobile api factory", () => {
  it("loads public app links for partner benefits without bearer tokens or financial payloads", async () => {
    const calls: Request[] = [];
    const publicConfigApi = createMobilePublicConfigApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (input, init) => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        calls.push(request);
        return new Response(
          JSON.stringify({
            data: {
              links: {
                landingUrl: "https://salaryhijacking.com",
                partnerBenefitsUrl: "https://salaryhijacking.com/partners",
                privacyUrl: "https://salaryhijacking.com/privacy",
                supportUrl: "https://salaryhijacking.com/support",
                termsUrl: "https://salaryhijacking.com/terms",
              },
              privacy: {
                rawPayrollDataForAds: false,
                rawExpenseDataForAds: false,
                rawSavingsDataForAds: false,
                advertiserUserIdentifierExposure: false,
              },
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
      tokenStore: {
        getItemAsync: async () => "must-not-be-used",
      },
    });

    await expect(publicConfigApi.getPublicAppConfig()).resolves.toMatchObject({
      links: {
        partnerBenefitsUrl: "https://salaryhijacking.com/partners",
      },
      privacy: {
        rawPayrollDataForAds: false,
        rawExpenseDataForAds: false,
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/public/app-config",
    );
    expect(calls[0]?.headers.has("authorization")).toBe(false);
    expect(JSON.stringify(calls[0])).not.toMatch(
      /salaryAmount|expenseAmount|savingsAmount|hijackAmount|pushToken|must-not-be-used/i,
    );
  });

  it("rejects public app config responses that contain sensitive raw payload keys", async () => {
    const calls: Request[] = [];
    const publicConfigApi = createMobilePublicConfigApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (input, init) => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        calls.push(request);
        return new Response(
          JSON.stringify({
            data: {
              links: {
                landingUrl: "https://salaryhijacking.com",
                partnerBenefitsUrl: "https://salaryhijacking.com/partners",
                privacyUrl: "https://salaryhijacking.com/privacy",
                supportUrl: "https://salaryhijacking.com/support",
                termsUrl: "https://salaryhijacking.com/terms",
              },
              privacy: {
                rawPayrollDataForAds: false,
                rawExpenseDataForAds: false,
                rawSavingsDataForAds: false,
                advertiserUserIdentifierExposure: false,
              },
              salaryAmount: 2_700_000,
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
      tokenStore: {
        getItemAsync: async () => "must-not-be-used",
      },
    });

    await expect(publicConfigApi.getPublicAppConfig()).rejects.toThrow(
      "PUBLIC_APP_CONFIG_SENSITIVE_PAYLOAD",
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers.has("authorization")).toBe(false);
  });

  it("attaches the stored access token to feature API requests without exposing refresh tokens", async () => {
    const calls: Request[] = [];
    const budgetApi = createMobileBudgetApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "mobile-api-auth-test",
      fetcher: async (input, init) => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        calls.push(request);
        return new Response(
          JSON.stringify({
            data: {
              budgetId: "budget_1",
              budgetDate: "2026-07-03",
              availableAmountMinor: 20_000,
              spentAmountMinor: 7_000,
              remainingAmountMinor: 13_000,
              usageRate: 0.35,
              currency: "KRW",
              serverAuthority: true,
              financialRawDataExposed: false,
              adTargetingSeparated: true,
              updatedAt: "2026-07-03T00:00:00.000Z",
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
      tokenStore: {
        getItemAsync: async () => " access.jwt.token ",
      },
    });

    await budgetApi.getToday();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers.get("authorization")).toBe(
      "Bearer access.jwt.token",
    );
    expect(calls[0]?.headers.get("authorization")).not.toContain("refresh");
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
  });

  it("drops malformed stored tokens before a request leaves the app", async () => {
    const calls: Request[] = [];
    const fetcher = createMobileAuthenticatedFetcher({
      fetcher: async (input, init) => {
        calls.push(input instanceof Request ? input : new Request(input, init));
        return new Response("{}", {
          headers: { "content-type": "application/json" },
        });
      },
      tokenStore: {
        getItemAsync: async () => "bad\nbearer",
      },
    });

    await fetcher("https://api.salaryhijacking.com/api/v1/users/me/profile");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers.has("authorization")).toBe(false);
  });

  it("lets the auth API factory use the provided token store for login and logout", async () => {
    const stored: Array<readonly [string, string]> = [];
    const deleted: string[] = [];
    const authApi = createMobileAuthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (input, init) => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        if (request.url.endsWith("/api/v1/auth/login")) {
          return new Response(
            JSON.stringify({
              data: {
                user: {
                  userId: "usr_mobile_factory",
                  roles: "USER",
                  accountStatus: "ACTIVE",
                },
                tokens: {
                  accessToken: "factory.access.jwt",
                  refreshToken: "factory.refresh.cookie",
                  accessTokenExpiresIn: 900,
                },
              },
            }),
            { headers: { "content-type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ data: { revoked: true } }), {
          headers: { "content-type": "application/json" },
        });
      },
      tokenStore: {
        getItemAsync: async () => null,
        setItemAsync: async (key, value) => {
          stored.push([key, value]);
        },
        deleteItemAsync: async (key) => {
          deleted.push(key);
        },
      },
    });

    await authApi.login({
      email: "user@example.com",
      password: "server-password",
    });
    await authApi.logout();

    expect(stored).toEqual([
      ["salary-hijacking.mobile.access-token", "factory.access.jwt"],
    ]);
    expect(stored.map(([, value]) => value).join(" ")).not.toContain(
      "factory.refresh.cookie",
    );
    expect(deleted).toEqual(["salary-hijacking.mobile.access-token"]);
  });

  it("refreshes an expired access token once and retries the original feature request", async () => {
    const calls: Request[] = [];
    let storedToken = "expired.access.jwt";
    const budgetApi = createMobileBudgetApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "mobile-api-refresh-retry-test",
      fetcher: async (input, init) => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        calls.push(request);
        if (request.url.endsWith("/api/v1/auth/refresh")) {
          return new Response(
            JSON.stringify({
              data: {
                user: {
                  userId: "usr_refresh_retry",
                  roles: "USER",
                  accountStatus: "ACTIVE",
                },
                tokens: {
                  accessToken: "rotated.access.jwt",
                  refreshToken: "server.http-only.cookie",
                  accessTokenExpiresIn: 900,
                },
              },
            }),
            { headers: { "content-type": "application/json" } },
          );
        }
        if (
          calls.filter((call) => call.url.includes("daily-budgets")).length ===
          1
        ) {
          expect(request.headers.get("authorization")).toBe(
            "Bearer expired.access.jwt",
          );
          return new Response(
            JSON.stringify({ error: { code: "TOKEN_EXPIRED" } }),
            {
              headers: { "content-type": "application/json" },
              status: 401,
            },
          );
        }
        expect(request.headers.get("authorization")).toBe(
          "Bearer rotated.access.jwt",
        );
        return new Response(
          JSON.stringify({
            data: {
              budgetId: "budget_retry",
              budgetDate: "2026-07-03",
              availableAmountMinor: 20_000,
              spentAmountMinor: 8_000,
              remainingAmountMinor: 12_000,
              usageRate: 0.4,
              currency: "KRW",
              serverAuthority: true,
              financialRawDataExposed: false,
              adTargetingSeparated: true,
              updatedAt: "2026-07-03T00:00:00.000Z",
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
      tokenStore: {
        getItemAsync: async () => storedToken,
        setItemAsync: async (_key, value) => {
          storedToken = value;
        },
        deleteItemAsync: async () => undefined,
      },
    });

    await expect(budgetApi.getToday()).resolves.toMatchObject({
      data: {
        snapshot: {
          remainingToday: 12_000,
        },
      },
    });

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/api/v1/daily-budgets/today",
      "/api/v1/auth/refresh",
      "/api/v1/daily-budgets/today",
    ]);
    expect(storedToken).toBe("rotated.access.jwt");
    expect(calls[1]?.credentials).toBe("include");
    expect(calls[1]?.headers.has("authorization")).toBe(false);
  });

  it("shares one refresh attempt across concurrent protected requests", async () => {
    const calls: Request[] = [];
    let refreshCount = 0;
    let allowSuccess = false;
    const fetcher = createMobileAuthenticatedFetcher({
      fetcher: async (input, init) => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        calls.push(request);
        if (!allowSuccess) {
          return new Response(
            JSON.stringify({ error: { code: "TOKEN_EXPIRED" } }),
            {
              headers: { "content-type": "application/json" },
              status: 401,
            },
          );
        }
        return new Response(JSON.stringify({ data: { ok: true } }), {
          headers: { "content-type": "application/json" },
        });
      },
      refreshAccessToken: async () => {
        refreshCount += 1;
        await Promise.resolve();
        allowSuccess = true;
      },
      tokenStore: {
        getItemAsync: async () => "expired.access.jwt",
        setItemAsync: async () => undefined,
      },
    });

    const [first, second] = await Promise.all([
      fetcher("https://api.salaryhijacking.com/api/v1/payroll/current"),
      fetcher("https://api.salaryhijacking.com/api/v1/users/me/profile"),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(refreshCount).toBe(1);
    expect(calls).toHaveLength(4);
  });

  it("clears the stored access token when refresh fails after a protected request", async () => {
    const calls: Request[] = [];
    const deleted: string[] = [];
    const budgetApi = createMobileBudgetApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (input, init) => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        calls.push(request);
        return new Response(
          JSON.stringify({ error: { code: "TOKEN_EXPIRED" } }),
          {
            headers: { "content-type": "application/json" },
            status: 401,
          },
        );
      },
      tokenStore: {
        getItemAsync: async () => "expired.access.jwt",
        setItemAsync: async () => undefined,
        deleteItemAsync: async (key) => {
          deleted.push(key);
        },
      },
    });

    await expect(budgetApi.getToday()).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
    });

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/api/v1/daily-budgets/today",
      "/api/v1/auth/refresh",
    ]);
    expect(deleted).toEqual([MOBILE_ACCESS_TOKEN_KEY]);
  });

  it("creates an authenticated uploads API for community attachments", async () => {
    const calls: Request[] = [];
    const uploadsApi = createMobileUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "mobile-upload-factory-test",
      fetcher: async (input, init) => {
        const request =
          input instanceof Request ? input : new Request(input, init);
        calls.push(request);
        return new Response(
          JSON.stringify({
            data: {
              attachmentId: "att_factory_1",
              contentType: "image/png",
              fileName: "proof.png",
              scanStatus: "PENDING",
              sizeBytes: 4,
              status: "UPLOADED",
            },
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
      tokenStore: {
        getItemAsync: async () => "upload.access.jwt",
      },
    });

    await uploadsApi.directUploadCommunityAttachment({
      bytes: new Uint8Array([1, 2, 3, 4]).buffer,
      contentType: "image/png",
      fileName: "proof.png",
      sizeBytes: 4,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/uploads/direct",
    );
    expect(calls[0]?.headers.get("authorization")).toBe(
      "Bearer upload.access.jwt",
    );
    expect(calls[0]?.headers.get("x-upload-purpose")).toBe(
      "COMMUNITY_ATTACHMENT",
    );
  });
});
