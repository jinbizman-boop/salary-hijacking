import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type {
  GrowthRepository,
  GrowthRoutesOptions,
} from "../src/routes/growth.routes";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const authHeaders = Object.freeze({
  "content-type": "application/json",
  "x-auth-context-source": "auth.middleware",
  "x-authenticated-user-id": "11111111-1111-4111-8111-111111111111",
  "x-auth-primary-role": "USER",
  "x-authenticated-roles": "USER",
  "x-auth-account-status": "ACTIVE",
  "x-auth-mfa-verified": "false",
  "x-correlation-id": "mobile-growth-contract",
});

function createMobileGrowthRepository(): GrowthRepository<unknown> {
  const listEmpty = async () => ({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const record = async () => ({
    serverAuthority: true,
    financialRawDataExposed: false,
  });
  return {
    name: "mobile-contract-growth-repository",
    profile: async () => ({
      level: 7,
      totalExp: 620,
      financialRawDataExposed: false,
    }),
    dashboard: async () => ({
      profile: { level: 7, totalExp: 620 },
      activeTaskCount: 4,
      completedTaskCount: 2,
      joinedChallengeCount: 1,
      completedContentCount: 3,
      todaySuggestion: "오늘도 LV UP 미션을 이어가요.",
      financialRawDataExposed: false,
    }),
    listTasks: listEmpty,
    getTask: async () => null,
    createTask: record,
    updateTask: record,
    deleteTask: record,
    recordTaskProgress: record,
    listChallenges: listEmpty,
    joinChallenge: record,
    leaveChallenge: record,
    completeChallenge: record,
    listContents: listEmpty,
    completeContent: record,
    listBadges: async () => [],
    leaderboard: listEmpty,
    recommendations: record,
    summary: record,
  };
}

describe("mobile growth API contract", () => {
  it("lets the app gateway inject a growth repository for DB-backed LV UP runtime wiring", async () => {
    const options = {
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      growthRoutesOptions: {
        repository: createMobileGrowthRepository(),
        exposeRepositoryName: true,
      },
    } satisfies AppOptions<unknown> & {
      readonly growthRoutesOptions: GrowthRoutesOptions<unknown>;
    };
    const app = createApp(options);

    const response = await app.fetch(
      new Request("https://api.test/api/v1/growth/dashboard", {
        headers: authHeaders,
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly profile?: Record<string, unknown>;
        readonly financialRawDataExposed?: boolean;
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-growth-repository")).toBe(
      "mobile-contract-growth-repository",
    );
    expect(body.error?.code).toBeUndefined();
    expect(body.data).toMatchObject({
      profile: { level: 7, totalExp: 620 },
      financialRawDataExposed: false,
    });
    expect(JSON.stringify(body)).not.toContain(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("accepts mobile LV UP detail content completion IDs in the default runtime repository", async () => {
    const app = createApp({
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
    });

    const response = await app.fetch(
      new Request(
        "https://api.test/api/v1/growth/contents/cnt_reading_recommendation/complete",
        {
          body: JSON.stringify({
            idempotencyKey: "mobile-detail-reading-1",
            note: "mobile level detail content complete",
          }),
          headers: authHeaders,
          method: "POST",
        },
      ),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: {
        readonly completion?: Record<string, unknown>;
      };
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(201);
    expect(body.error?.code).toBeUndefined();
    expect(body.data?.completion).toMatchObject({
      contentId: "cnt_reading_recommendation",
      recommendationUsesSensitiveFinancialData: false,
    });
    expect(JSON.stringify(body)).not.toContain(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});
