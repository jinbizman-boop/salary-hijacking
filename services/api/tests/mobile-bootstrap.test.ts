import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const testContext = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

describe("GET /api/v1/mobile/bootstrap", () => {
  it("exposes release smoke readiness without bearer while preserving privacy and server-authority signals", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request("https://api.test/api/v1/ready"),
      { APP_ENV: "staging" },
      testContext,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly status?: string;
        readonly environment?: string;
        readonly serverAuthorityEnabled?: boolean;
        readonly rawFinancialDataExposed?: boolean;
        readonly rawPersonalDataExposed?: boolean;
        readonly rawPushTokenExposed?: boolean;
        readonly adsFinancialTargetingUsed?: boolean;
      };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-server-authority")).toBe("true");
    expect(response.headers.get("x-financial-raw-data-exposed")).toBe("false");
    expect(response.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(response.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(response.headers.get("x-ad-financial-targeting")).toBe("separated");
    expect(body.data).toMatchObject({
      status: "ready",
      environment: "staging",
      serverAuthorityEnabled: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(JSON.stringify(body)).not.toMatch(
      /"(salaryAmount|expenseAmount|savingsAmount|hijackAmount|email|pushToken|DATABASE_URL)"\s*:/i,
    );
  });

  it("stays protected by the auth middleware when no bearer token is present", async () => {
    const app = createApp({
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request("https://api.test/api/v1/mobile/bootstrap"),
      {},
      testContext,
    );
    const body = (await response.json()) as {
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(401);
    expect(body.error?.code).toBe("AUTH_TOKEN_MISSING");
  });

  it("returns the mobile entry payload from trusted auth context headers", async () => {
    const app = createApp({
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      now: () => new Date("2026-06-29T05:00:00.000Z"),
    });

    const response = await app.fetch(
      new Request("https://api.test/api/v1/mobile/bootstrap", {
        headers: {
          "x-auth-context-source": "auth.middleware",
          "x-authenticated-user-id": "user_12345",
          "x-auth-primary-role": "USER",
          "x-authenticated-roles": "USER",
          "x-auth-account-status": "ACTIVE",
          "x-auth-mfa-verified": "false",
          "x-session-id": "session_abc",
        },
      }),
      { APP_ENV: "development" },
      testContext,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly session?: Record<string, unknown>;
        readonly config?: Record<string, unknown>;
        readonly digest?: Record<string, unknown>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data?.session).toMatchObject({
      authenticated: true,
      role: "USER",
      emailVerified: true,
      onboardingCompleted: true,
      mfaRequired: false,
      accountStatus: "ACTIVE",
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
    });
    expect(body.data?.session?.userIdHash).toEqual(
      expect.stringMatching(/^sha256:[a-f0-9]{32}$/),
    );
    expect(body.data?.session).not.toHaveProperty("userId");
    expect(body.data?.session).not.toHaveProperty("sessionId");
    expect(body.data?.config).toMatchObject({
      apiVersion: "v1",
      environment: "development",
      maintenanceMode: false,
      defaultRoute: "/salary",
      serverAuthorityEnabled: true,
      privacyMode: "STRICT",
      adsFinancialTargetingAllowed: false,
    });
    expect(body.data?.digest).toMatchObject({
      payrollReady: true,
      budgetReady: true,
      fixedExpenseReady: true,
      savingsReady: true,
      pushConsent: "UNKNOWN",
      privacyPassRate: "100.00%",
    });
  });
});
