import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import CommunityIndexScreen from "../../../../app/(tabs)/community";
import CommunityPostDetailScreen from "../../../../app/(tabs)/community/[postId]";
import CommunityWriteScreen from "../../../../app/(tabs)/community/write";
import CommunityMyPostsScreen from "../../../../app/(tabs)/community/my-posts";
import LevelIndexScreen from "../../../../app/(tabs)/level";
import ReadingScreen from "../../../../app/(tabs)/level/reading";
import ProfileSettingsScreen from "../../../../app/(tabs)/profile/settings";
import { NotificationSettingsScreen } from "../../notifications/components";
import { PlanScreen } from "../../plan/components/PlanScreen";
import { SalaryHomeScreen } from "../../salary/components/SalaryHomeScreen";

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ postId: "post_level_1" }),
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../../../src/shared/performance/release-perf", () => ({
  markReleaseInteractionPerf: jest.fn(),
  markReleasePerf: jest.fn(),
}));

jest.mock("../../../../src/shared/api/mobile-api", () => ({
  createMobileBudgetApi: () => null,
  createMobileCommunityService: () => ({
    createComment: jest.fn(),
    createPost: jest.fn().mockResolvedValue({
      anonymous: true,
      boardType: "FREE",
      bodyPreview: "안전한 테스트 게시글",
      commentCount: 0,
      createdAt: "2026-09-12T00:00:00.000Z",
      id: "post_level_1",
      likeCount: 0,
      moderationStatus: "SAFE",
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      title: "안전한 테스트",
      updatedAt: "2026-09-12T00:00:00.000Z",
    }),
    getPostDetail: jest.fn().mockResolvedValue({
      attachments: [],
      content: "민감정보 없이 작성된 본문입니다.",
      post: {
        anonymousDisplayName: "익명 12",
        boardType: "FREE",
        bodyPreview: "민감정보 없는 본문",
        bookmarkCount: 0,
        commentCount: 1,
        createdAt: "2026-09-12T00:00:00.000Z",
        id: "post_level_1",
        likeCount: 0,
        moderationStatus: "SAFE",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        title: "안전한 게시글",
        updatedAt: "2026-09-12T00:00:00.000Z",
      },
      tags: ["safe"],
    }),
    listComments: jest.fn().mockResolvedValue([
      {
        anonymousDisplayName: "익명 5",
        body: "좋은 루틴입니다.",
        createdAt: "2026-09-12T00:00:00.000Z",
        id: "comment_1",
        mine: false,
        moderationStatus: "SAFE",
        postId: "post_level_1",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
      },
    ]),
    listPosts: jest.fn().mockResolvedValue([
      {
        anonymousDisplayName: "익명 12",
        boardType: "FREE",
        bodyPreview: "민감정보 없는 본문",
        bookmarkCount: 0,
        commentCount: 1,
        createdAt: "2026-09-12T00:00:00.000Z",
        id: "post_level_1",
        likeCount: 2,
        moderationStatus: "SAFE",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        title: "안전한 게시글",
        updatedAt: "2026-09-12T00:00:00.000Z",
      },
    ]),
    toggleLike: jest.fn(),
  }),
  createMobileGrowthApi: () => ({
    completeContent: jest.fn().mockResolvedValue({ expDelta: 12 }),
    getContent: jest.fn().mockResolvedValue(null),
    getDashboard: jest.fn().mockResolvedValue(null),
    getSummary: jest.fn().mockResolvedValue(null),
  }),
  createMobilePayrollApi: () => null,
  createMobilePlanCommitmentsApi: () => null,
}));

jest.mock("../../community/hooks/useCommunityFeed", () => ({
  useCommunityFeed: () => ({
    error: null,
    items: [
      {
        anonymousDisplayName: "익명 12",
        boardType: "FREE",
        bodyPreview: "민감정보 없는 본문",
        bookmarkCount: 0,
        commentCount: 1,
        createdAt: "2026-09-12T00:00:00.000Z",
        id: "post_level_1",
        likeCount: 2,
        moderationStatus: "SAFE",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        title: "안전한 게시글",
        updatedAt: "2026-09-12T00:00:00.000Z",
      },
    ],
    refresh: jest.fn(),
    status: "success",
  }),
}));

jest.mock("../../community/hooks/useCommunityPost", () => ({
  useCommunityPost: () => ({
    comments: [
      {
        anonymousDisplayName: "익명 5",
        body: "좋은 루틴입니다.",
        createdAt: "2026-09-12T00:00:00.000Z",
        id: "comment_1",
        mine: false,
        moderationStatus: "SAFE",
        postId: "post_level_1",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
      },
    ],
    detail: {
      attachments: [],
      content: "민감정보 없이 작성된 본문입니다.",
      post: {
        anonymousDisplayName: "익명 12",
        boardType: "FREE",
        bodyPreview: "민감정보 없는 본문",
        bookmarkCount: 0,
        commentCount: 1,
        createdAt: "2026-09-12T00:00:00.000Z",
        id: "post_level_1",
        likeCount: 2,
        moderationStatus: "SAFE",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        title: "안전한 게시글",
        updatedAt: "2026-09-12T00:00:00.000Z",
      },
      tags: ["safe"],
    },
    error: null,
    loading: false,
  }),
}));

jest.mock("../../community/hooks/useCommunityWrite", () => ({
  useCommunityWrite: () => ({
    draft: {
      anonymous: true,
      boardType: "FREE",
      content: "안전한 본문",
      tags: [],
      title: "안전한 제목",
    },
    error: null,
    setDraft: jest.fn(),
    submit: jest.fn(),
    submitting: false,
    validation: {
      issues: [],
      moderationStatus: "SAFE",
      valid: true,
    },
  }),
}));

jest.mock("../../level/controller", () => ({
  completeGrowthContentWithServerAuthority: jest
    .fn()
    .mockResolvedValue({ expDelta: 12 }),
  loadGrowthContentForType: jest.fn().mockResolvedValue(null),
  loadGrowthDashboardSnapshot: jest.fn().mockResolvedValue({
    activeTaskCount: 4,
    completedContentCount: 8,
    completedTaskCount: 12,
    financialRawDataExposed: false,
    joinedChallengeCount: 2,
    profile: { level: 7, totalExp: 880 },
    todaySuggestion: "오늘은 독서와 운동을 먼저 채우면 균형이 좋아요.",
  }),
  loadGrowthSummarySnapshot: jest.fn().mockResolvedValue({
    badgeCount: 0,
    domainTotals: [],
    endDate: "2026-09-12",
    expEarnedInPeriod: 120,
    financialRawDataExposed: false,
    level: 7,
    missionCompletionCount: 12,
    missionTargetCount: 16,
    progressRecordCount: 12,
    recentActivities: [
      {
        domain: "READING",
        id: "release-reading",
        label: "오늘 · 독서",
        title: "8페이지 읽음",
        xp: "+12 XP",
      },
    ],
    startDate: "2026-09-01",
    strongestDomain: "READING",
    streakDays: 5,
    taskCount: 4,
    totalExp: 880,
  }),
}));

describe("D013 required bottom-sheet runtime coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the denied notification permission guide and keeps switch target at 44dp or larger", () => {
    const screen = render(
      <NotificationSettingsScreen notificationDeviceStatus="denied" />,
    );

    const row = screen.getByTestId("notification-preference-row-push");
    expect(
      StyleSheet.flatten(row.props.style).minHeight,
    ).toBeGreaterThanOrEqual(44);

    fireEvent.press(screen.getByRole("button", { name: "알림 권한 안내" }));
    expect(screen.getByLabelText("알림 권한 필요 바텀시트")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "설정 열기 알림 권한을 허용합니다" }),
    ).toBeTruthy();
  });

  it("opens salary and plan bottom sheets from production user flows", () => {
    const salary = render(<SalaryHomeScreen previewVariant="default" />);
    fireEvent.press(salary.getByRole("button", { name: "변동 지출 추가하기" }));
    fireEvent.press(
      salary.getByRole("button", { name: "변동 지출 카테고리 선택" }),
    );
    expect(salary.getByLabelText("지출 카테고리 바텀시트")).toBeTruthy();
    fireEvent.press(salary.getByRole("button", { name: "닫기" }));
    fireEvent.press(
      salary.getByTestId("variable-expense-delete-variable-game"),
    );
    expect(salary.getByLabelText("지출 무효 처리 사유 바텀시트")).toBeTruthy();

    const plan = render(<PlanScreen />);
    fireEvent.press(plan.getByTestId("fixed-section-settings-button"));
    fireEvent.press(
      plan.getByRole("button", { name: "계획 항목 카테고리 선택" }),
    );
    expect(plan.getByLabelText("계획 카테고리 바텀시트")).toBeTruthy();
    fireEvent.press(plan.getByRole("button", { name: "닫기" }));
    fireEvent.press(plan.getByRole("button", { name: "계획 항목 일자 선택" }));
    expect(plan.getByLabelText("날짜 선택 바텀시트")).toBeTruthy();
    fireEvent.press(plan.getByRole("button", { name: "닫기" }));
    fireEvent.press(plan.getByRole("button", { name: "계획 항목 반복 선택" }));
    expect(plan.getByLabelText("반복 주기 바텀시트")).toBeTruthy();
  });

  it("opens community bottom sheets from write, feed, detail, report, and draft-exit flows", async () => {
    const feed = render(<CommunityIndexScreen />);
    fireEvent.press(feed.getByRole("button", { name: "커뮤니티 정렬 필터" }));
    expect(feed.getByLabelText("정렬 바텀시트")).toBeTruthy();
    fireEvent.press(feed.getByRole("button", { name: "닫기" }));
    fireEvent.press(feed.getByRole("button", { name: "글쓰기 바텀시트 열기" }));
    expect(feed.getByLabelText("커뮤니티 글쓰기 바텀시트")).toBeTruthy();

    const write = render(<CommunityWriteScreen />);
    fireEvent.press(write.getByRole("button", { name: "첨부 방식 선택" }));
    expect(write.getByLabelText("첨부 바텀시트")).toBeTruthy();
    fireEvent.press(write.getByRole("button", { name: "닫기" }));
    fireEvent.press(write.getByRole("button", { name: "공개 범위 선택" }));
    expect(write.getByLabelText("공개 범위 바텀시트")).toBeTruthy();
    fireEvent.press(write.getByRole("button", { name: "닫기" }));
    fireEvent.press(write.getByRole("button", { name: "작성 중 나가기 옵션" }));
    expect(write.getByLabelText("작성 중인 글 바텀시트")).toBeTruthy();

    const detail = render(<CommunityPostDetailScreen />);
    fireEvent.press(detail.getByRole("button", { name: "게시글 메뉴 열기" }));
    expect(detail.getByLabelText("게시글 메뉴 바텀시트")).toBeTruthy();
    const reportActions = detail.getAllByRole("button", { name: "신고" });
    expect(reportActions.length).toBeGreaterThan(0);
    fireEvent.press(reportActions[reportActions.length - 1]!);
    expect(detail.getByLabelText("신고 사유 바텀시트")).toBeTruthy();
  });

  it("opens profile and LV UP share/selector bottom sheets from required flows", async () => {
    const profile = render(<ProfileSettingsScreen />);
    fireEvent.press(
      profile.getByRole("button", { name: "프로필 공개 범위 선택" }),
    );
    expect(profile.getByLabelText("공개 범위 바텀시트")).toBeTruthy();
    fireEvent.press(profile.getByRole("button", { name: "닫기" }));
    fireEvent.press(profile.getByRole("button", { name: "직업 선택" }));
    expect(profile.getByLabelText("직업 선택 바텀시트")).toBeTruthy();

    const myPosts = render(<CommunityMyPostsScreen />);
    fireEvent.press(myPosts.getByRole("button", { name: "인증 공유 옵션" }));
    expect(myPosts.getByLabelText("공유 바텀시트")).toBeTruthy();

    const level = render(<LevelIndexScreen />);
    await waitFor(() =>
      expect(level.queryByLabelText("LV UP 데이터를 불러오는 중")).toBeNull(),
    );
    fireEvent.press(level.getByRole("button", { name: "LV UP 공유 옵션" }));
    expect(level.getByLabelText("공유 바텀시트")).toBeTruthy();

    const reading = render(<ReadingScreen />);
    await waitFor(() =>
      expect(reading.queryByLabelText("독서 데이터를 불러오는 중")).toBeNull(),
    );
    fireEvent.press(
      reading.getByRole("button", { name: "독서 인증 공유 옵션" }),
    );
    expect(reading.getByLabelText("공유 바텀시트")).toBeTruthy();
  });
});
