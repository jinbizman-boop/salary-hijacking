import { describe, expect, it } from "vitest";
import {
  createNeonGrowthRepository,
  shouldUseNeonGrowthRepository,
} from "../src/repositories/growth.repository";
import type { GrowthRouteRuntime } from "../src/routes/growth.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const completionId = "33333333-3333-4333-8333-333333333333";

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
});
