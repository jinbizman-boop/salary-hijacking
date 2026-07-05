import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const authHeaders = Object.freeze({
  "x-auth-context-source": "auth.middleware",
  "x-authenticated-user-id": "user_profile_contract",
  "x-auth-primary-role": "USER",
  "x-authenticated-roles": "USER",
  "x-auth-account-status": "ACTIVE",
  "x-auth-mfa-verified": "false",
});

function createProfileContractApp() {
  return createApp({
    enableAuth: false,
    enableAuditGate: false,
    enableRateLimit: false,
    now: () => new Date("2026-06-29T05:00:00.000Z"),
  });
}

describe("mobile profile API contract", () => {
  it("serves the mobile profile payload at the endpoint used by the Expo profile screen", async () => {
    const app = createProfileContractApp();

    const response = await app.fetch(
      new Request("https://api.test/api/v1/users/me/profile", {
        headers: authHeaders,
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly user?: Record<string, unknown>;
        readonly summary?: Record<string, unknown>;
        readonly privacy?: Record<string, unknown>;
        readonly activities?: readonly unknown[];
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.user).toMatchObject({
      idHash: expect.stringMatching(/^sha256:[a-f0-9]{32}$/),
      role: "USER",
      rawEmailExposed: false,
      rawPhoneExposed: false,
      rawFinancialDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(body.data?.user).not.toHaveProperty("userId");
    expect(body.data?.user).not.toHaveProperty("email");
    expect(body.data?.summary).toMatchObject({
      totalHijackSaved: expect.any(Number),
      privacyPassRate: "100.00%",
    });
    expect(body.data?.privacy).toMatchObject({
      financialDataForAds: false,
      rawPushTokenLogging: false,
      tokenHashOnly: true,
    });
    expect(Array.isArray(body.data?.activities)).toBe(true);
  });

  it("updates the mobile profile payload at the same endpoint used by profile settings", async () => {
    const app = createProfileContractApp();

    const response = await app.fetch(
      new Request("https://api.test/api/v1/users/me/profile", {
        method: "PATCH",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          nickname: "급여 방어자",
          displayBio: "월급을 먼저 지키는 루틴러",
          occupationCategory: "PRODUCT",
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        }),
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly user?: Record<string, unknown>;
        readonly privacy?: Record<string, unknown>;
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.user).toMatchObject({
      nickname: "급여 방어자",
      rawEmailExposed: false,
      rawFinancialDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(body.data?.user).not.toHaveProperty("userId");
    expect(body.data?.privacy).toMatchObject({
      financialDataForAds: false,
      rawPushTokenLogging: false,
      tokenHashOnly: true,
    });
  });

  it("completes mobile onboarding through the server profile boundary", async () => {
    const app = createProfileContractApp();

    const response = await app.fetch(
      new Request("https://api.test/api/v1/users/me/onboarding-complete", {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        }),
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly user?: Record<string, unknown>;
        readonly privacy?: Record<string, unknown>;
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.user).toMatchObject({
      onboardingCompleted: true,
      rawEmailExposed: false,
      rawFinancialDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(body.data?.user).not.toHaveProperty("userId");
    expect(body.data?.privacy).toMatchObject({
      financialDataForAds: false,
      rawPushTokenLogging: false,
      tokenHashOnly: true,
    });
  });

  it("updates mobile account consent settings without enabling financial ad targeting", async () => {
    const app = createProfileContractApp();

    const response = await app.fetch(
      new Request("https://api.test/api/v1/users/consents", {
        method: "PATCH",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          adPartnerAccepted: false,
          analyticsAccepted: false,
          consentVersion: "mobile-v1",
          contentRecommendationAccepted: true,
          marketingAccepted: false,
          privacyAccepted: true,
          sensitiveFinancialTargetingAccepted: false,
          termsAccepted: true,
        }),
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(body.error?.code).toBeUndefined();
    expect(body.data).toMatchObject({
      adPartnerAccepted: false,
      adPartnerFinancialRawDataUsed: false,
      analyticsAccepted: false,
      contentRecommendationAccepted: true,
      marketingAccepted: false,
      privacyAccepted: true,
      sensitiveFinancialTargetingAccepted: false,
      termsAccepted: true,
    });
    expect(body.data).not.toHaveProperty("userId");
    expect(JSON.stringify(body.data)).not.toMatch(
      /salary|expense|saving|hijack|rawToken|email|phone|card|account/iu,
    );
  });

  it("serves the mobile MY page summary alias without raw private or financial data", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableAuth: false,
      enableRateLimit: false,
      usersRoutesOptions: {
        repository: {
          summary: async () => ({
            adPartnerAccepted: false,
            adsFinancialTargetingUsed: false,
            communityComments: 4,
            communityPosts: 3,
            contentRecommendationAccepted: true,
            financialRawDataExposed: false,
            latestExportRequestedAt: "2026-07-03T06:00:00.000Z",
            latestExportStatus: "READY",
            level: 18,
            levelXp: 420,
            nextActions: "Profile ready; review LV UP routine",
            notificationUnread: 2,
            privacyExportCount: 2,
            profileCompleted: true,
            rawPersonalDataExposed: false,
            rawTokenExposed: false,
            selfCareScore: 91,
            sensitiveFinancialTargetingAccepted: false,
            status: "ACTIVE",
            theme: "DARK",
            totalExp: 1740,
          }),
        } as never,
      },
      now: () => new Date("2026-07-03T06:10:00.000Z"),
    });

    const response = await app.fetch(
      new Request("https://api.test/api/v1/users/me/my-page-summary", {
        headers: authHeaders,
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(body.error?.code).toBeUndefined();
    expect(body.data).toMatchObject({
      adsFinancialTargetingUsed: false,
      communityPosts: 3,
      financialRawDataExposed: false,
      rawPersonalDataExposed: false,
      rawTokenExposed: false,
      sensitiveFinancialTargetingAccepted: false,
    });
    expect(body.data).not.toHaveProperty("userId");
    expect(JSON.stringify(body.data)).not.toMatch(
      /raw@example\.com|salary|expense|saving|hijack|phone|card|account/iu,
    );
  });

  it("accepts the mobile privacy export action without exposing raw financial data", async () => {
    const app = createProfileContractApp();

    const response = await app.fetch(
      new Request("https://api.test/api/v1/users/me/privacy-export", {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          reason: "privacy-export",
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        }),
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly privacy?: Record<string, unknown>;
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(202);
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.privacy).toMatchObject({
      exportStatus: "REQUESTED",
      financialDataForAds: false,
      rawPushTokenLogging: false,
      tokenHashOnly: true,
    });
  });

  it("lists mobile privacy exports without raw request reasons or financial payloads", async () => {
    const app = createProfileContractApp();

    const requestResponse = await app.fetch(
      new Request("https://api.test/api/v1/users/me/privacy-export", {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          reason: "app-my-page",
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        }),
      }),
      { APP_ENV: "development" },
      context,
    );
    expect(requestResponse.status).toBe(202);

    const response = await app.fetch(
      new Request("https://api.test/api/v1/users/me/privacy-exports", {
        headers: authHeaders,
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly items?: readonly Record<string, unknown>[];
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(body.error?.code).toBeUndefined();
    expect(Array.isArray(body.data?.items)).toBe(true);
    for (const item of body.data?.items ?? []) {
      expect(item).toMatchObject({
        adsFinancialTargetingUsed: false,
        financialRawDataIncluded: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
      });
      expect(item).not.toHaveProperty("userId");
      expect(item).not.toHaveProperty("reason");
    }
    expect(JSON.stringify(body.data)).not.toMatch(
      /app-my-page|salary|expense|saving|hijack|phone|card|account|token/iu,
    );
  });

  it("accepts a privacy-safe mobile support ticket without echoing sensitive raw data", async () => {
    const app = createProfileContractApp();

    const response = await app.fetch(
      new Request("https://api.test/api/v1/users/me/support-tickets", {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          category: "ACCOUNT",
          subject: "로그인 도움이 필요해요",
          message: "앱 계정 설정 화면에서 로그인 상태를 확인하고 싶어요.",
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        }),
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(202);
    expect(body.error?.code).toBeUndefined();
    expect(body.data).toMatchObject({
      category: "ACCOUNT",
      status: "OPEN",
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(body.data).not.toHaveProperty("userId");
    expect(JSON.stringify(Object.values(body.data ?? {}))).not.toMatch(
      /salary|expense|saving|hijack|token|email|phone|card|accountNumber/iu,
    );
  });

  it("routes mobile support tickets through the injected users repository", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableAuth: false,
      enableRateLimit: false,
      usersRoutesOptions: {
        repository: {
          createSupportTicket: async (input, runtime) => ({
            adsFinancialTargetingUsed: false,
            category: input.category,
            createdAt: runtime.now.toISOString(),
            id: "ticket_injected",
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            rawPushTokenExposed: false,
            status: "OPEN",
            subject: input.subject,
          }),
        } as never,
      },
      now: () => new Date("2026-07-03T06:05:00.000Z"),
    });

    const response = await app.fetch(
      new Request("https://api.test/api/v1/users/me/support-tickets", {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          category: "PRIVACY",
          subject: "개인정보 요청",
          message: "문의 접수 상태를 확인하고 싶어요.",
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        }),
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: Record<string, unknown>;
    };

    expect(response.status).toBe(202);
    expect(body.data).toMatchObject({
      id: "ticket_injected",
      category: "PRIVACY",
      status: "OPEN",
    });
  });

  it("accepts the mobile withdrawal request without performing destructive final withdrawal", async () => {
    const app = createProfileContractApp();

    const response = await app.fetch(
      new Request("https://api.test/api/v1/users/me/withdrawal-request", {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          reason: "withdraw",
          rawFinancialDataExposed: false,
          rawPersonalDataExposed: false,
          rawPushTokenExposed: false,
          adsFinancialTargetingUsed: false,
        }),
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly user?: Record<string, unknown>;
        readonly privacy?: Record<string, unknown>;
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(202);
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.user).toMatchObject({ role: "USER" });
    expect(body.data?.privacy).toMatchObject({
      withdrawalRequested: true,
      financialDataForAds: false,
      rawPushTokenLogging: false,
      tokenHashOnly: true,
    });
  });
});
