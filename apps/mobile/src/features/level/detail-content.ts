import type { GrowthContentItem, GrowthContentType } from "./types";

function contentItem(
  overrides: Partial<GrowthContentItem> &
    Pick<GrowthContentItem, "contentId" | "contentType" | "title">,
): GrowthContentItem {
  const now = "2026-07-10T00:00:00.000Z";
  const { contentId, contentType, title, ...rest } = overrides;
  return {
    category: "DAILY_GROWTH",
    contentId,
    contentType,
    createdAt: now,
    difficulty: "EASY",
    estimatedMinutes: 5,
    financialRawDataExposed: false,
    fullTextStored: false,
    licenseType: "CURATED_LINK",
    missionPrompt: "오늘 적용할 수 있는 작은 행동을 기록하세요.",
    publishedAt: now,
    recommendationUsesSensitiveFinancialData: false,
    recordQuestion: "오늘 기록할 핵심 한 문장은 무엇인가요?",
    safetyLevel: "GENERAL",
    serverAuthority: true,
    sourceAuthor: "Salary Hijacking",
    sourceName: "Salary Hijacking",
    sourceTitle: "Curated source",
    sourceUrl: "https://salaryhijacking.com/",
    status: "PUBLISHED",
    subtitle: "5분 기록",
    summary: "원문 전체를 저장하지 않고 요약, 미션, 기록 질문만 제공합니다.",
    title,
    topics: ["habit", "growth"],
    updatedAt: now,
    viewpointTag: "FACT_BRIEF",
    xpReward: 30,
    adTargetingSeparated: true,
    ...rest,
  };
}

export const levelDetailContent: Readonly<
  Record<
    Extract<GrowthContentType, "READING" | "NEWS" | "ENGLISH" | "HEALTH">,
    GrowthContentItem
  >
> = {
  READING: contentItem({
    category: "ECONOMY_BUSINESS",
    contentId: "reading_daily_budget_habit",
    contentType: "READING",
    missionPrompt: "급여일 직후 자동으로 지킬 지출 1개를 정리하세요.",
    recordQuestion: "이번 달 지키고 싶은 소비 습관은 무엇인가요?",
    sourceTitle: "Reading curation",
    title: "오늘의 독서 미션",
    topics: ["reading", "budget"],
  }),
  NEWS: contentItem({
    category: "NEWS_BALANCE",
    contentId: "news_balance_daily",
    contentType: "NEWS",
    missionPrompt: "서로 다른 관점 2개를 읽고 차이를 기록하세요.",
    recordQuestion: "오늘 이슈에서 확인한 관점 차이는 무엇인가요?",
    sourceTitle: "News balance source",
    title: "균형 뉴스 루틴",
    topics: ["news", "viewpoint"],
    viewpointTag: "POLICY_CENTER",
  }),
  ENGLISH: contentItem({
    category: "WORK_ENGLISH",
    contentId: "english_commute_phrases",
    contentType: "ENGLISH",
    missionPrompt: "출근길 표현 5문장을 듣고 따라 말하세요.",
    recordQuestion: "오늘 입으로 말해본 영어 표현은 무엇인가요?",
    sourceTitle: "English lesson source",
    title: "출근길 영어 5문장",
    topics: ["listening", "speaking", "writing"],
  }),
  HEALTH: contentItem({
    category: "BEGINNER_WORKOUT",
    contentId: "health_beginner_stretch",
    contentType: "HEALTH",
    estimatedMinutes: 10,
    missionPrompt: "통증이 없을 때만 가볍게 움직이고 완료를 기록하세요.",
    recordQuestion: "오늘 운동 중 불편했던 부위가 있었나요?",
    safetyLevel: "BEGINNER_SAFE",
    sourceTitle: "Workout safety guide",
    title: "10분 초급 홈트",
    topics: ["workout", "recovery"],
  }),
};
