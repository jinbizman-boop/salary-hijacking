import { describe, expect, it } from "vitest";
import {
  createNeonGrowthRepository,
  shouldUseNeonGrowthRepository,
} from "../src/repositories/growth.repository";
import type { GrowthRouteRuntime } from "../src/routes/growth.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const completionId = "33333333-3333-4333-8333-333333333333";
const contentId = "44444444-4444-4444-8444-444444444444";
const contentProgressId = "55555555-5555-4555-8555-555555555555";

function createRuntime(
  path = "/api/v1/growth/tasks",
): GrowthRouteRuntime<unknown> {
  return {
    request: new Request(`https://api.test${path}`, {
      headers: { "x-idempotency-key": "growth-test-key" },
    }),
    env: { APP_ENV: "test" },
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL(`https://api.test${path}`),
    path,
    relativePath: path.replace("/api/v1/growth", "") || "/",
    method: "GET",
    requestId: "growth-db-repository-test",
    now: new Date("2026-07-03T04:00:00.000Z"),
    principal: {
      userId,
      roles: ["USER"],
      permissions: [],
      policyId: null,
    },
    repository: {} as never,
  };
}

function taskRow(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    growth_task_id: taskId,
    type: "READING",
    category: "READING",
    title: "Read one chapter",
    description: "Read one finance habit chapter.",
    exp_reward: 30,
    active_from: "2026-07-01T00:00:00.000Z",
    active_to: null,
    status: "ACTIVE",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    progress_count: "0",
    total_count: "1",
    ...extra,
  };
}

function contentRow(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    content_id: contentId,
    content_type: "READING",
    title: "Money habit reading",
    subtitle: "One operator-written reading mission",
    category: "ECONOMY_BUSINESS",
    difficulty: "NORMAL",
    estimated_minutes: 12,
    topics: ["budget", "habit", "reflection"],
    summary:
      "Operator curated summary that explains the book without storing full text.",
    mission_prompt:
      "Read the linked source context and write one private note.",
    record_question: "What budget habit will you test today?",
    source_title: "Publisher information page",
    source_author: "Salary Hijacking content desk",
    source_url: "https://publisher.example/books/money-habit",
    license_type: "CURATED_LINK",
    safety_level: "GENERAL",
    exp_reward: 30,
    status: "PUBLISHED",
    published_at: "2026-07-03T00:00:00.000Z",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    total_count: "1",
    ...extra,
  };
}

describe("Neon growth repository", () => {
  it("uses Neon only when a supported database URL env is present", () => {
    expect(
      shouldUseNeonGrowthRepository({
        SALARY_HIJACKING_DATABASE_URL: "postgres://example.invalid/db",
      }),
    ).toBe(true);
    expect(shouldUseNeonGrowthRepository({ APP_ENV: "test" })).toBe(false);
  });

  it("lists active growth tasks without returning owner identifiers or financial data", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonGrowthRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows: [taskRow()], rowCount: 1 };
      },
    });

    const result = await repository.listTasks(
      { status: "ACTIVE" },
      { page: 1, pageSize: 20, offset: 0, limit: 20 },
      createRuntime(),
    );

    expect(result).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      items: [
        {
          taskId,
          title: "Read one chapter",
          taskType: "READING",
          difficulty: "NORMAL",
          targetCount: 1,
          progressCount: 0,
          expReward: 30,
          status: "ACTIVE",
          serverAuthority: true,
          financialRawDataExposed: false,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(calls[0]?.operationName).toBe("growth.listTasks");
    expect(calls[0]?.sqlText).toContain("public.growth_tasks");
    expect(calls[0]?.sqlText).toContain("public.growth_task_completions");
    expect(calls[0]?.params).toContain(userId);
  });

  it("records task progress through growth_task_completions and returns a mobile-safe payload", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonGrowthRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        if (options.operationName === "growth.recordTaskProgress") {
          return {
            rows: [
              {
                completion_id: completionId,
                growth_task_id: taskId,
                earned_exp: 30,
                proof_text: "done",
                completion_date: "2026-07-03",
                completed_at: "2026-07-03T04:00:00.000Z",
                created_at: "2026-07-03T04:00:00.000Z",
              },
            ],
            rowCount: 1,
          };
        }
        if (options.operationName === "growth.getTaskAfterProgress") {
          return { rows: [taskRow({ progress_count: "1" })], rowCount: 1 };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });

    const result = await repository.recordTaskProgress(
      taskId,
      {
        progressCount: 1,
        note: "done",
        occurredAt: "2026-07-03T04:00:00.000Z",
        idempotencyKey: "growth-progress-key",
      },
      createRuntime(`/api/v1/growth/tasks/${taskId}/progress`),
    );

    expect(result).toMatchObject({
      progress: {
        progressId: completionId,
        taskId,
        progressCount: 1,
        note: "done",
        occurredAt: "2026-07-03T04:00:00.000Z",
        expDelta: 30,
      },
      task: {
        taskId,
        progressCount: 1,
        serverAuthority: true,
        financialRawDataExposed: false,
      },
      expDelta: 30,
      badges: [],
      idempotentReplay: false,
    });
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(calls.map((call) => call.operationName)).toEqual([
      "growth.recordTaskProgress",
      "growth.getTaskAfterProgress",
    ]);
    expect(calls[0]?.sqlText).toContain(
      "insert into public.growth_task_completions",
    );
    expect(calls[0]?.params).toContain(userId);
  });

  it("lists published LV UP content from the database with source and safety metadata", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonGrowthRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return { rows: [contentRow()], rowCount: 1 };
      },
    });

    const result = await repository.listContents(
      { contentType: "READING" },
      { page: 1, pageSize: 20, offset: 0, limit: 20 },
      createRuntime("/api/v1/growth/contents?contentType=READING"),
    );

    expect(result).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      items: [
        {
          contentId,
          contentType: "READING",
          title: "Money habit reading",
          category: "ECONOMY_BUSINESS",
          estimatedMinutes: 12,
          topics: ["budget", "habit", "reflection"],
          sourceUrl: "https://publisher.example/books/money-habit",
          licenseType: "CURATED_LINK",
          safetyLevel: "GENERAL",
          xpReward: 30,
          status: "PUBLISHED",
          fullTextStored: false,
          serverAuthority: true,
          financialRawDataExposed: false,
          recommendationUsesSensitiveFinancialData: false,
          adTargetingSeparated: true,
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(calls[0]?.operationName).toBe("growth.listContents");
    expect(calls[0]?.sqlText).toContain("public.growth_content_items");
    expect(calls[0]?.params).toContain("READING");
  });

  it("completes LV UP content through user content progress with server XP and idempotency", async () => {
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonGrowthRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        return {
          rows: [
            {
              progress_id: contentProgressId,
              content_id: contentId,
              record_text: "I will try one budget habit today.",
              earned_exp: 30,
              idempotency_key: "content-reading-1",
              completed_at: "2026-07-03T04:00:00.000Z",
              created_at: "2026-07-03T04:00:00.000Z",
              newly_completed: true,
            },
          ],
          rowCount: 1,
        };
      },
    });

    const result = await repository.completeContent(
      {
        contentId,
        note: "I will try one budget habit today.",
        idempotencyKey: "content-reading-1",
      },
      createRuntime(`/api/v1/growth/contents/${contentId}/complete`),
    );

    expect(result).toMatchObject({
      completion: {
        completionId: contentProgressId,
        contentId,
        note: "I will try one budget habit today.",
        expDelta: 30,
        idempotencyKey: "content-reading-1",
        completedAt: "2026-07-03T04:00:00.000Z",
        recommendationUsesSensitiveFinancialData: false,
      },
      badges: [],
      idempotentReplay: false,
    });
    expect(JSON.stringify(result)).not.toContain(userId);
    expect(calls[0]?.operationName).toBe("growth.completeContent");
    expect(calls[0]?.sqlText).toContain("public.growth_content_items");
    expect(calls[0]?.sqlText).toContain("public.user_level_content_progress");
    expect(calls[0]?.sqlText).toContain("saved_progress.newly_completed");
    expect(calls[0]?.params).toContain(userId);
    expect(calls[0]?.params).toContain(contentId);
  });

  it("does not award duplicate XP when a same-day LV UP content completion is replayed", async () => {
    const repository = createNeonGrowthRepository({
      query: async () => ({
        rows: [
          {
            progress_id: contentProgressId,
            content_id: contentId,
            record_text: "I already recorded this mission.",
            earned_exp: 30,
            idempotency_key: "content-reading-1",
            completed_at: "2026-07-03T04:00:00.000Z",
            created_at: "2026-07-03T04:00:00.000Z",
            idempotent_replay: true,
          },
        ],
        rowCount: 1,
      }),
    });

    const result = await repository.completeContent(
      {
        contentId,
        note: "I already recorded this mission.",
        idempotencyKey: "content-reading-1",
      },
      createRuntime(`/api/v1/growth/contents/${contentId}/complete`),
    );

    expect(result).toMatchObject({
      completion: {
        contentId,
        expDelta: 0,
      },
      idempotentReplay: true,
    });
  });
});
