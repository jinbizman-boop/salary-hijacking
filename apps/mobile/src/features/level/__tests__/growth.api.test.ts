import { createGrowthApi } from "../api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

const dashboard = {
  profile: {
    userId: "usr_private",
    level: 18,
    totalExp: 380,
  },
  activeTaskCount: 4,
  completedTaskCount: 1,
  joinedChallengeCount: 2,
  completedContentCount: 6,
  todaySuggestion:
    "오늘의 변동지출 기록과 10분 독서를 완료해 LV UP 경험치를 확보하세요.",
  financialRawDataExposed: false,
};

const task = {
  taskId: "gtk_reading",
  userId: "usr_private",
  title: "독서하기",
  taskType: "READING",
  difficulty: "NORMAL",
  targetCount: 1,
  progressCount: 0,
  expReward: 30,
  startDate: "2026-07-02",
  endDate: null,
  note: "AI 추천 도서 한 챕터",
  publicShareEnabled: false,
  status: "ACTIVE",
  createdAt: "2026-07-02T09:00:00.000Z",
  updatedAt: "2026-07-02T09:00:00.000Z",
  serverAuthority: true,
  financialRawDataExposed: false,
};

describe("growth api", () => {
  it("loads the server-authoritative dashboard and active tasks with privacy headers", async () => {
    const calls: Request[] = [];
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "growth-correlation-1",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        if (normalized.url.endsWith("/dashboard")) {
          return jsonResponse({ data: dashboard });
        }
        return jsonResponse({
          data: {
            items: [task],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        });
      },
      platform: "ios",
    });

    await expect(api.getDashboard()).resolves.toMatchObject({
      profile: { level: 18, totalExp: 380 },
      activeTaskCount: 4,
      completedTaskCount: 1,
      financialRawDataExposed: false,
    });
    await expect(api.listTasks()).resolves.toMatchObject({
      items: [
        {
          taskId: "gtk_reading",
          title: "독서하기",
          taskType: "READING",
          expReward: 30,
          serverAuthority: true,
          financialRawDataExposed: false,
        },
      ],
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/growth/dashboard",
    );
    expect(calls[1]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/growth/tasks?page=1&pageSize=20&status=ACTIVE",
    );
    expect(calls[0]?.headers.get("x-client-platform")).toBe("ios");
    expect(calls[0]?.headers.get("x-correlation-id")).toBe(
      "growth-correlation-1",
    );
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-push-token-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
    expect(JSON.stringify(await api.getDashboard())).not.toContain(
      "usr_private",
    );
  });

  it("records task progress with idempotency and rejects invalid counts before network access", async () => {
    const calls: Request[] = [];
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse(
          {
            data: {
              progress: {
                progressId: "gpr_1",
                taskId: "gtk_reading",
                progressCount: 1,
                note: "mobile mission complete",
                occurredAt: "2026-07-02T09:10:00.000Z",
                idempotencyKey: "mission-reading-1",
                expDelta: 30,
                createdAt: "2026-07-02T09:10:01.000Z",
              },
              task: { ...task, progressCount: 1, status: "COMPLETED" },
              expDelta: 30,
              badges: [],
              idempotentReplay: false,
            },
          },
          201,
        );
      },
      platform: "android",
    });

    await expect(
      api.recordTaskProgress("gtk_reading", {
        idempotencyKey: "mission-reading-1",
        note: "mobile mission complete",
        occurredAt: "2026-07-02T09:10:00.000Z",
        progressCount: 1,
      }),
    ).resolves.toMatchObject({
      expDelta: 30,
      task: { taskId: "gtk_reading", status: "COMPLETED" },
      idempotentReplay: false,
    });
    await expect(
      api.recordTaskProgress("gtk_reading", {
        idempotencyKey: "bad",
        note: null,
        occurredAt: "2026-07-02T09:10:00.000Z",
        progressCount: 0,
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_PROGRESS_REQUEST" });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/growth/tasks/gtk_reading/progress",
    );
    expect(calls[0]?.method).toBe("POST");
    const body = await calls[0]?.clone().text();
    expect(JSON.parse(body ?? "{}")).toEqual({
      idempotencyKey: "mission-reading-1",
      note: "mobile mission complete",
      occurredAt: "2026-07-02T09:10:00.000Z",
      progressCount: 1,
    });
  });

  it("rejects unknown growth progress fields before they can enter LV payloads", async () => {
    const calls: Request[] = [];
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "android",
    });

    await expect(
      api.recordTaskProgress("gtk_reading", {
        idempotencyKey: "mission-reading-unknown",
        note: "mobile mission complete",
        occurredAt: "2026-07-02T09:10:00.000Z",
        progressCount: 1,
        rawSalaryMemo: "salary 2,700,000",
      } as never),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_PROGRESS_REQUEST" });

    expect(calls).toHaveLength(0);
  });

  it("rejects unsafe growth task list options before URL construction", async () => {
    const calls: Request[] = [];
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({
          data: { items: [], page: 1, pageSize: 20, total: 0 },
        });
      },
      platform: "android",
    });

    await expect(
      api.listTasks({
        page: 0,
        pageSize: 20,
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_TASK_LIST_OPTIONS" });
    await expect(
      api.listTasks({
        page: 1,
        pageSize: 101,
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_TASK_LIST_OPTIONS" });
    await expect(
      api.listTasks({
        page: 1,
        pageSize: 20,
        status: "ACTIVE\nAuthorization" as never,
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_TASK_LIST_OPTIONS" });
    await expect(
      api.listTasks({
        page: 1,
        pageSize: 20,
        rawSalaryMemo: "salary 2,700,000",
      } as never),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_TASK_LIST_OPTIONS" });

    expect(calls).toHaveLength(0);
  });

  it("completes level detail content through the server growth API without exposing sensitive data", async () => {
    const calls: Request[] = [];
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "growth-content-1",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse(
          {
            data: {
              completion: {
                completionId: "gcc_reading_1",
                contentId: "cnt_reading_recommendation",
                note: "mobile level detail content complete",
                expDelta: 30,
                idempotencyKey: "content-reading-1",
                completedAt: "2026-07-02T09:20:00.000Z",
                recommendationUsesSensitiveFinancialData: false,
              },
              badges: [],
              idempotentReplay: false,
            },
          },
          201,
        );
      },
      platform: "android",
    });

    await expect(
      api.completeContent({
        contentId: "cnt_reading_recommendation",
        idempotencyKey: "content-reading-1",
        note: "mobile level detail content complete",
      }),
    ).resolves.toMatchObject({
      completion: {
        contentId: "cnt_reading_recommendation",
        expDelta: 30,
        recommendationUsesSensitiveFinancialData: false,
      },
      idempotentReplay: false,
    });
    await expect(
      api.completeContent({
        contentId: "../bad-content",
        idempotencyKey: "bad",
        note: null,
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_CONTENT_ID" });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/growth/contents/cnt_reading_recommendation/complete",
    );
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
    const body = await calls[0]?.clone().text();
    expect(JSON.parse(body ?? "{}")).toEqual({
      idempotencyKey: "content-reading-1",
      note: "mobile level detail content complete",
    });
  });

  it("rejects growth progress and content notes with raw sensitive data before network access", async () => {
    const calls: Request[] = [];
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "android",
    });

    await expect(
      api.recordTaskProgress("gtk_reading", {
        idempotencyKey: "mission-reading-sensitive",
        note: "mission owner user@example.com",
        occurredAt: "2026-07-02T09:10:00.000Z",
        progressCount: 1,
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_PROGRESS_REQUEST" });

    await expect(
      api.completeContent({
        contentId: "cnt_reading_recommendation",
        idempotencyKey: "content-reading-sensitive",
        note: "Authorization Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_CONTENT_ID" });

    expect(calls).toHaveLength(0);
  });

  it("rejects overlong growth path ids before network access", async () => {
    const calls: Request[] = [];
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async (request) => {
        calls.push(request instanceof Request ? request : new Request(request));
        return jsonResponse({ data: {} });
      },
      platform: "android",
    });

    await expect(
      api.recordTaskProgress(`gtk_${"a".repeat(300)}`, {
        idempotencyKey: "mission-reading-1",
        note: null,
        occurredAt: "2026-07-02T09:10:00.000Z",
        progressCount: 1,
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_TASK_ID" });

    await expect(
      api.completeContent({
        contentId: `cnt_${"b".repeat(300)}`,
        idempotencyKey: "content-reading-1",
        note: null,
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_CONTENT_ID" });

    expect(calls).toHaveLength(0);
  });

  it("rejects invalid growth task, progress, and content ids returned by the server", async () => {
    const listApi = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            items: [{ ...task, taskId: "../gtk_reading" }],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      platform: "web",
    });
    const progressApi = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            progress: {
              progressId: "gpr_1\r\nAuthorization",
              taskId: "gtk_reading",
              progressCount: 1,
              note: null,
              occurredAt: "2026-07-02T09:10:00.000Z",
              idempotencyKey: "mission-reading-1",
              expDelta: 30,
              createdAt: "2026-07-02T09:10:01.000Z",
            },
            task: { ...task, progressCount: 1 },
            expDelta: 30,
            badges: [],
            idempotentReplay: false,
          },
        }),
      platform: "android",
    });
    const contentApi = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            completion: {
              completionId: "gcc_reading_1",
              contentId: "../cnt_reading_recommendation",
              note: null,
              expDelta: 30,
              idempotencyKey: "content-reading-1",
              completedAt: "2026-07-02T09:20:00.000Z",
              recommendationUsesSensitiveFinancialData: false,
            },
            badges: [],
            idempotentReplay: false,
          },
        }),
      platform: "ios",
    });

    await expect(listApi.listTasks()).rejects.toMatchObject({
      code: "GROWTH_INVALID_RESPONSE",
    });
    await expect(
      progressApi.recordTaskProgress("gtk_reading", {
        idempotencyKey: "mission-reading-1",
        note: null,
        occurredAt: "2026-07-02T09:10:00.000Z",
        progressCount: 1,
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_RESPONSE" });
    await expect(
      contentApi.completeContent({
        contentId: "cnt_reading_recommendation",
        idempotencyKey: "content-reading-1",
        note: null,
      }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_RESPONSE" });
  });
});
