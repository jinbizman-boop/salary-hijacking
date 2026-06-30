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
