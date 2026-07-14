import { createGrowthApi } from "../api";
import { GROWTH_SAFE_ERROR_MESSAGE } from "../constants";

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

const content = {
  contentId: "cnt_reading_finance_habit",
  contentType: "READING",
  title: "Money habit reading",
  subtitle: "One curated mission",
  category: "ECONOMY_BUSINESS",
  difficulty: "NORMAL",
  estimatedMinutes: 12,
  topics: ["budget", "habit", "reflection"],
  summary:
    "Operator-written summary that introduces the book without storing full text.",
  missionPrompt: "Read the source context and write one private note.",
  recordQuestion: "What budget habit will you test today?",
  sourceTitle: "Publisher information page",
  sourceAuthor: "Salary Hijacking content desk",
  sourceUrl: "https://publisher.example/books/money-habit",
  licenseType: "CURATED_LINK",
  safetyLevel: "GENERAL",
  xpReward: 30,
  status: "PUBLISHED",
  publishedAt: "2026-07-03T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z",
  serverAuthority: true,
  financialRawDataExposed: false,
  recommendationUsesSensitiveFinancialData: false,
  fullTextStored: false,
  adTargetingSeparated: true,
};

describe("growth api", () => {
  it("keeps the safe fallback error message readable in Korean", () => {
    expect(GROWTH_SAFE_ERROR_MESSAGE).toBe(
      "LV UP 데이터를 잠시 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.",
    );
    expect(GROWTH_SAFE_ERROR_MESSAGE).not.toMatch(
      /Growth data|temporarily unavailable|try again later/u,
    );
  });

  it("wraps unreadable response bodies in a safe growth API error", async () => {
    const response = jsonResponse({ data: dashboard });
    Object.defineProperty(response, "text", {
      value: async () => {
        throw new Error("raw growth stream internal detail");
      },
    });
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () => response,
      platform: "android",
    });

    await expect(api.getDashboard()).rejects.toMatchObject({
      code: "GROWTH_INVALID_RESPONSE",
      message: GROWTH_SAFE_ERROR_MESSAGE,
      status: 200,
    });
  });

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
    for (const call of calls) {
      expect(call.headers.get("x-idempotency-key")).toBeNull();
    }
    expect(JSON.stringify(await api.getDashboard())).not.toContain(
      "usr_private",
    );
  });

  it("records task progress with idempotency and rejects invalid counts before network access", async () => {
    const calls: Request[] = [];
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "growth-progress-1",
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
    expect(calls[0]?.headers.get("x-idempotency-key")).toMatch(
      /^mobile-growth-growth-progress-1-post-[a-z0-9]+$/u,
    );
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

  it("lists curated LV UP content with source, license, and safety metadata", async () => {
    const calls: Request[] = [];
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "growth-content-list-1",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            items: [content],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        });
      },
      platform: "android",
    });

    await expect(
      api.listContents({
        contentType: "READING",
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toMatchObject({
      items: [
        {
          contentId: "cnt_reading_finance_habit",
          contentType: "READING",
          sourceUrl: "https://publisher.example/books/money-habit",
          licenseType: "CURATED_LINK",
          safetyLevel: "GENERAL",
          fullTextStored: false,
          adTargetingSeparated: true,
          recommendationUsesSensitiveFinancialData: false,
        },
      ],
      total: 1,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/growth/contents?page=1&pageSize=20&contentType=READING",
    );
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
  });

  it("lists health LV UP content through the HEALTH content contract", async () => {
    const calls: Request[] = [];
    const api = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "growth-health-content-1",
      fetcher: async (request) => {
        const normalized =
          request instanceof Request ? request : new Request(request);
        calls.push(normalized);
        return jsonResponse({
          data: {
            items: [
              {
                ...content,
                contentId: "cnt_health_stretching",
                contentType: "HEALTH",
                title: "Safe stretching routine",
                category: "HEALTH_ROUTINE",
                sourceTitle: "Internal wellness safety checklist",
                sourceUrl: "https://salaryhijacking.com/wellness-safety",
                safetyLevel: "GENERAL",
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        });
      },
      platform: "android",
    });

    await expect(
      api.listContents({
        contentType: "HEALTH",
      }),
    ).resolves.toMatchObject({
      items: [
        {
          contentId: "cnt_health_stretching",
          contentType: "HEALTH",
          sourceUrl: "https://salaryhijacking.com/wellness-safety",
          fullTextStored: false,
          adTargetingSeparated: true,
          recommendationUsesSensitiveFinancialData: false,
        },
      ],
      total: 1,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.salaryhijacking.com/api/v1/growth/contents?page=1&pageSize=20&contentType=HEALTH",
    );
    expect(calls[0]?.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(calls[0]?.headers.get("x-ad-financial-targeting-used")).toBe(
      "false",
    );
  });

  it("rejects LV UP content responses that store full article/body text or omit required trust flags", async () => {
    const fullTextApi = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            items: [
              {
                ...content,
                contentId: "cnt_news_full_text",
                contentType: "NEWS",
                fullTextStored: true,
                articleBody: "copied full article body",
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      platform: "web",
    });
    const unsafeApi = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            items: [
              {
                ...content,
                sourceUrl: null,
                licenseType: null,
                safetyLevel: null,
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      platform: "ios",
    });

    await expect(
      fullTextApi.listContents({ contentType: "NEWS" }),
    ).rejects.toMatchObject({ code: "GROWTH_INVALID_RESPONSE" });
    await expect(unsafeApi.listContents()).rejects.toMatchObject({
      code: "GROWTH_INVALID_RESPONSE",
    });
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
    expect(calls[0]?.headers.get("x-idempotency-key")).toMatch(
      /^mobile-growth-growth-content-1-post-[a-z0-9]+$/u,
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

  it("rejects growth task response title and note values with raw sensitive data", async () => {
    const titleApi = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            items: [
              {
                ...task,
                taskId: "gtk_sensitive_title",
                title: "card 1234-5678-9012-3456",
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      platform: "android",
    });
    const noteApi = createGrowthApi({
      baseUrl: "https://api.salaryhijacking.com",
      fetcher: async () =>
        jsonResponse({
          data: {
            items: [
              {
                ...task,
                taskId: "gtk_sensitive_note",
                note: "mission owner user@example.com",
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      platform: "ios",
    });

    await expect(titleApi.listTasks()).rejects.toMatchObject({
      code: "GROWTH_INVALID_RESPONSE",
    });
    await expect(noteApi.listTasks()).rejects.toMatchObject({
      code: "GROWTH_INVALID_RESPONSE",
    });
  });
});
