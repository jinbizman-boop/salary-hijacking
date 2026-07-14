import { fireEvent, render } from "@testing-library/react-native";

import {
  EnglishLessonCard,
  LevelActionGrid,
  LevelHeroCard,
  NewsBalanceCard,
  ReadingContentCard,
  WorkoutTimerCard,
  XpRewardToast,
} from "../components";
import type { GrowthContentItem, GrowthDashboard } from "../types";

const dashboard: GrowthDashboard = {
  profile: { level: 7, totalExp: 880 },
  activeTaskCount: 4,
  completedTaskCount: 12,
  joinedChallengeCount: 2,
  completedContentCount: 8,
  todaySuggestion: "독서와 건강 루틴을 기록하면 XP가 올라가요.",
  financialRawDataExposed: false,
};

const baseContent: GrowthContentItem = {
  contentId: "cnt_reading",
  contentType: "READING",
  title: "월급 루틴 독서",
  subtitle: "5분 기록",
  category: "ECONOMY_BUSINESS",
  difficulty: "EASY",
  estimatedMinutes: 5,
  topics: ["budget", "habit"],
  summary: "운영자가 작성한 요약으로 원문 전체를 저장하지 않습니다.",
  missionPrompt: "오늘 적용할 한 가지를 기록하세요.",
  recordQuestion: "내 예산 습관에 적용할 문장은 무엇인가요?",
  sourceTitle: "Publisher page",
  sourceAuthor: "Salary Hijacking",
  sourceName: "Publisher",
  sourceUrl: "https://publisher.example/book",
  licenseType: "CURATED_LINK",
  safetyLevel: "GENERAL",
  viewpointTag: "FACT_BRIEF",
  xpReward: 30,
  status: "PUBLISHED",
  publishedAt: "2026-07-10T00:00:00.000Z",
  createdAt: "2026-07-09T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
  fullTextStored: false,
  serverAuthority: true,
  financialRawDataExposed: false,
  recommendationUsesSensitiveFinancialData: false,
  adTargetingSeparated: true,
};

describe("level feature components", () => {
  it("renders level hero and action grid as accessible server-authoritative UI", () => {
    const onSelect = jest.fn();
    const screen = render(
      <>
        <LevelHeroCard dashboard={dashboard} />
        <LevelActionGrid
          actions={[
            { key: "reading", label: "독서", description: "5분 기록" },
            { key: "news", label: "뉴스", description: "균형 읽기" },
          ]}
          onSelect={onSelect}
        />
      </>,
    );

    expect(screen.getByText("LV 7")).toBeTruthy();
    expect(screen.getByLabelText("LV UP 진행률 88%")).toBeTruthy();
    expect(screen.getByText("서버 기준 XP")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "뉴스 균형 읽기" }));
    expect(onSelect).toHaveBeenCalledWith("news");
  });

  it("renders reading, news, english, and workout cards with policy guards", () => {
    const onStart = jest.fn();
    const onRecord = jest.fn();
    const screen = render(
      <>
        <ReadingContentCard
          content={baseContent}
          onRecord={onRecord}
          onStart={onStart}
        />
        <NewsBalanceCard
          content={{
            ...baseContent,
            contentId: "cnt_news",
            contentType: "NEWS",
            title: "균형 뉴스 루틴",
            viewpointTag: "POLICY_CENTER",
          }}
          onRecord={onRecord}
        />
        <EnglishLessonCard
          content={{
            ...baseContent,
            contentId: "cnt_english",
            contentType: "ENGLISH",
            title: "출근 영어 5문장",
          }}
          onRecord={onRecord}
        />
        <WorkoutTimerCard
          content={{
            ...baseContent,
            contentId: "cnt_health",
            contentType: "HEALTH",
            title: "퇴근 후 5분 회복",
            safetyLevel: "BEGINNER_SAFE",
          }}
          onRecord={onRecord}
        />
      </>,
    );

    expect(screen.getAllByText("원문 전체 저장 없음")).toHaveLength(4);
    expect(screen.getByText("비공개 LV UP 기록")).toBeTruthy();
    expect(screen.getByText("관점 태그 POLICY_CENTER")).toBeTruthy();
    expect(screen.getByText("듣기 · 말하기 · 읽기 · 쓰기")).toBeTruthy();
    expect(screen.getByText("통증이 있으면 즉시 중단하세요.")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "독서 시작" }));
    const [recordButton] = screen.getAllByRole("button", { name: "기록하기" });
    if (!recordButton) throw new Error("record button missing");
    fireEvent.press(recordButton);

    expect(onStart).toHaveBeenCalledWith(baseContent);
    expect(onRecord).toHaveBeenCalledWith(baseContent);
  });

  it("renders XP reward toast with user-facing server authority copy", () => {
    const screen = render(
      <XpRewardToast earnedXp={30} rewardSource="READING_COMPLETE" />,
    );

    expect(screen.getByLabelText("독서 기록 완료 30 XP")).toBeTruthy();
    expect(screen.getByText("독서 기록 완료 +30 XP")).toBeTruthy();
    expect(screen.getByText("중복 없이 한 번만 반영했어요")).toBeTruthy();
    expect(screen.queryByText("READING_COMPLETE +30 XP")).toBeNull();
  });
});
