import { describe, expect, it, vi } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type { VerifiedJwt } from "../src/middlewares/auth.middleware";
import type {
  PayrollRepository,
  PayrollRouteRuntime,
  PayrollRoutesOptions,
} from "../src/routes/payroll.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const sessionId = "33333333-3333-4333-8333-333333333333";
const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const observedQueries: Array<{
  readonly text: string;
  readonly values: readonly unknown[] | undefined;
}> = [];
let sessionRevokedAt: string | null = "2026-07-03T06:00:00.000Z";

vi.mock("@neondatabase/serverless", () => {
  class Pool {
    async query(text: string, values?: readonly unknown[]) {
      observedQueries.push({ text, values });
      return {
        rowCount: 1,
        rows: [
          {
            session_id: sessionId,
            user_id: userId,
            status: sessionRevokedAt ? "REVOKED" : "ACTIVE",
            expires_at: "2026-07-03T07:00:00.000Z",
            revoked_at: sessionRevokedAt,
            user_status: "ACTIVE",
            roles: ["USER"],
          },
        ],
      };
    }

    async end() {
      return undefined;
    }
  }

  return { Pool, neonConfig: {} };
});

function verifiedJwt(): VerifiedJwt {
  return {
    header: { alg: "HS256", typ: "JWT" },
    rawToken: "test-access-token",
    tokenKind: "ACCESS",
    claims: {
      iss: "salary-hijacking-api",
      aud: "salary-hijacking-mobile",
      sub: userId,
      roles: ["USER"],
      permissions: ["payroll:read"],
      sessionId,
      accountStatus: "ACTIVE",
      iat: 1_783_000_000,
      nbf: 1_783_000_000,
      exp: 1_783_000_900,
    },
  };
}

function createPayrollRepository(): PayrollRepository<unknown> {
  const notUsed = async (): Promise<Record<string, never>> => ({});
  return {
    name: "auth-session-resolver-payroll-repository",
    listPlans: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
    getPlan: async () => null,
    getCurrentPlan: async () => null,
    createPlan: notUsed,
    updatePlan: notUsed,
    deletePlan: notUsed,
    activatePlan: notUsed,
    pausePlan: notUsed,
    archivePlan: notUsed,
    home: async (_runtime: PayrollRouteRuntime<unknown>) => ({
      currentPlan: null,
      headline: "Protected payroll route reached",
      nextAction: "급여 계획을 등록하세요",
      recommendedDailyBudgetMinor: 0,
      availableForDailyBudgetMinor: 0,
      serverAuthority: true,
      financialRawDataExposed: false,
    }),
    summary: notUsed,
    calendar: notUsed,
    recalculate: notUsed,
    simulate: notUsed,
  };
}

function createProtectedApp(): ReturnType<typeof createApp<unknown>> {
  const options = {
    enableAuditGate: false,
    enableRateLimit: false,
    now: () => new Date("2026-07-03T06:10:00.000Z"),
    authOptions: {
      verifyJwt: async () => verifiedJwt(),
    },
    payrollRoutesOptions: {
      repository: createPayrollRepository(),
    },
  } satisfies AppOptions<unknown> & {
    readonly payrollRoutesOptions: PayrollRoutesOptions<unknown>;
  };
  return createApp(options);
}

describe("API auth DB session resolver", () => {
  it("rejects a protected API request when the DB-backed access-token session was revoked", async () => {
    observedQueries.length = 0;
    sessionRevokedAt = "2026-07-03T06:00:00.000Z";

    const response = await createProtectedApp().fetch(
      new Request("https://api.test/api/v1/payroll/home", {
        headers: { authorization: "Bearer test-access-token" },
      }),
      {
        APP_ENV: "production",
        DATABASE_URL: "postgres://example.invalid/salary_hijacking",
      },
      context,
    );
    const body = (await response.json()) as {
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(401);
    expect(body.error?.code).toBe("AUTH_SESSION_REVOKED");
    expect(observedQueries[0]?.text).toContain("public.auth_sessions");
    expect(observedQueries[0]?.values).toContain(sessionId);
    expect(JSON.stringify(body)).not.toContain("postgres://");
  });

  it("allows a protected API request when the DB-backed access-token session is active", async () => {
    observedQueries.length = 0;
    sessionRevokedAt = null;

    const response = await createProtectedApp().fetch(
      new Request("https://api.test/api/v1/payroll/home", {
        headers: { authorization: "Bearer test-access-token" },
      }),
      {
        APP_ENV: "production",
        DATABASE_URL: "postgres://example.invalid/salary_hijacking",
      },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: { readonly headline?: string };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.headline).toBe("Protected payroll route reached");
    expect(observedQueries[0]?.values).toContain(sessionId);
  });
});
