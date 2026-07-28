import {
  completeGrowthContentWithServerAuthority,
  loadGrowthContentForType,
  loadGrowthDashboardSnapshot,
} from "../controller";
import type {
  GrowthApiClient,
  GrowthContentCompleteResult,
  GrowthContentItem,
} from "../types";

const content: GrowthContentItem = {
  adTargetingSeparated: true,
  category: "READING",
  contentId: "reading_daily",
  contentType: "READING",
  createdAt: "2026-07-25T00:00:00.000Z",
  difficulty: "EASY",
  estimatedMinutes: 5,
  financialRawDataExposed: false,
  fullTextStored: false,
  licenseType: "CURATED_LINK",
  missionPrompt: "읽고 한 줄로 기록합니다.",
  publishedAt: "2026-07-25T00:00:00.000Z",
  recommendationUsesSensitiveFinancialData: false,
  recordQuestion: "오늘 남길 문장은 무엇인가요?",
  safetyLevel: "GENERAL",
  serverAuthority: true,
  sourceAuthor: "Salary Hijacking",
  sourceName: "Salary Hijacking",
  sourceTitle: "Daily reading",
  sourceUrl: "https://salaryhijacking.com/reading",
  status: "PUBLISHED",
  subtitle: "5분 독서",
  summary: "원문 저장 없이 미션과 기록 질문만 제공합니다.",
  title: "오늘의 독서",
  topics: ["reading"],
  updatedAt: "2026-07-25T00:00:00.000Z",
  viewpointTag: null,
  xpReward: 30,
};

function completion(overrides = {}): GrowthContentCompleteResult {
  return {
    badges: [],
    completion: {
      completedAt: "2026-07-25T00:05:00.000Z",
      completionId: "completion_reading_daily",
      contentId: "reading_daily",
      expDelta: 30,
      idempotencyKey: "growth-content-reading_daily",
      note: "기록 완료",
      recommendationUsesSensitiveFinancialData: false,
    },
    idempotentReplay: false,
    ...overrides,
  };
}

function createApi(overrides: Partial<GrowthApiClient> = {}) {
  return {
    completeContent: jest.fn(async () => completion()),
    getDashboard: jest.fn(async () => ({
      activeTaskCount: 1,
      completedContentCount: 4,
      completedTaskCount: 3,
      financialRawDataExposed: false as const,
      joinedChallengeCount: 1,
      profile: { level: 18, totalExp: 880 },
      todaySuggestion: "오늘의 레벨업",
    })),
    listContents: jest.fn(async () => ({
      items: [content],
      page: 1,
      pageSize: 10,
      total: 1,
    })),
    listTasks: jest.fn(),
    recordTaskProgress: jest.fn(),
    ...overrides,
  } satisfies GrowthApiClient;
}

describe("level growth controller", () => {
  it("loads dashboard and content from the server-authoritative Growth API", async () => {
    const api = createApi();

    await expect(loadGrowthDashboardSnapshot(api)).resolves.toMatchObject({
      financialRawDataExposed: false,
      profile: { level: 18, totalExp: 880 },
    });
    await expect(loadGrowthContentForType(api, "READING")).resolves.toMatchObject(
      {
        contentId: "reading_daily",
        serverAuthority: true,
      },
    );

    expect(api.getDashboard).toHaveBeenCalledTimes(1);
    expect(api.listContents).toHaveBeenCalledWith({
      contentType: "READING",
      page: 1,
      pageSize: 10,
    });
  });

  it("completes content through the server and returns only server XP", async () => {
    const api = createApi();

    await expect(
      completeGrowthContentWithServerAuthority(api, content, "기록 완료"),
    ).resolves.toMatchObject({
      expDelta: 30,
      idempotentReplay: false,
      source: "server",
    });

    expect(api.completeContent).toHaveBeenCalledWith({
      contentId: "reading_daily",
      idempotencyKey: expect.stringMatching(
        /^growth-content-reading_daily-[A-Za-z0-9_-]+$/u,
      ),
      note: "기록 완료",
    });
  });

  it("keeps idempotent replay as a server result instead of double-paying XP", async () => {
    const api = createApi({
      completeContent: jest.fn(async () =>
        completion({
          completion: {
            ...completion().completion,
            expDelta: 0,
          },
          idempotentReplay: true,
        }),
      ),
    });

    await expect(
      completeGrowthContentWithServerAuthority(api, content, "기록 완료"),
    ).resolves.toMatchObject({
      expDelta: 0,
      idempotentReplay: true,
      source: "server",
    });
  });
});
