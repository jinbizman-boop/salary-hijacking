import type { GrowthContentItem, GrowthContentType } from "./types";

function contentItem(
  overrides: Partial<GrowthContentItem> &
    Pick<GrowthContentItem, "contentId" | "contentType" | "title">,
): GrowthContentItem {
  const now = "2026-07-10T00:00:00.000Z";
  const { contentId, contentType, title, ...rest } = overrides;
  return {
    category: "오늘 성장",
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
    sourceTitle: "급여납치 성장 콘텐츠",
    sourceUrl: "https://salaryhijacking.com/",
    status: "PUBLISHED",
    subtitle: "5분 기록",
    summary: "원문 전체를 저장하지 않고 요약, 미션, 기록 질문만 제공합니다.",
    title,
    topics: ["습관", "성장"],
    updatedAt: now,
    viewpointTag: "요약",
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
    category: "경제·경영",
    contentId: "reading_daily_budget_habit",
    contentType: "READING",
    missionPrompt: "급여일 직후 자동으로 지킬 지출 1개를 정리하세요.",
    recordQuestion: "이번 달 지키고 싶은 소비 습관은 무엇인가요?",
    sourceTitle: "급여납치 도서 큐레이션",
    title: "오늘의 독서 미션",
    topics: ["독서", "습관"],
  }),
  NEWS: contentItem({
    category: "경제",
    contentId: "news_balance_daily",
    contentType: "NEWS",
    missionPrompt: "서로 다른 관점 2개를 읽고 차이를 기록하세요.",
    recordQuestion: "오늘 이슈에서 확인한 관점 차이는 무엇인가요?",
    sourceTitle: "급여납치 뉴스 피드",
    title: "균형 뉴스 루틴",
    topics: ["뉴스", "관점"],
    viewpointTag: "균형 보기",
  }),
  ENGLISH: contentItem({
    category: "영어",
    contentId: "english_commute_phrases",
    contentType: "ENGLISH",
    missionPrompt: "출근길 표현 5문장을 듣고 따라 말하세요.",
    recordQuestion: "오늘 입으로 말해본 영어 표현은 무엇인가요?",
    sourceTitle: "급여납치 외국어 콘텐츠",
    title: "출근길 영어 5문장",
    topics: ["Listening", "Speaking", "Writing"],
  }),
  HEALTH: contentItem({
    category: "초급 홈트",
    contentId: "health_beginner_stretch",
    contentType: "HEALTH",
    estimatedMinutes: 10,
    missionPrompt: "통증이 없을 때만 가볍게 움직이고 완료를 기록하세요.",
    recordQuestion: "오늘 운동 중 불편했던 부위가 있었나요?",
    safetyLevel: "초급",
    sourceTitle: "급여납치 운동 루틴",
    title: "10분 초급 홈트",
    topics: ["운동", "회복"],
  }),
};
