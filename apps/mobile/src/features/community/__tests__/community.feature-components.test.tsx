import { fireEvent, render } from "@testing-library/react-native";

import { CommunityTabBar } from "../components/CommunityTabBar";
import { ComposeBottomSheet } from "../components/ComposeBottomSheet";
import { PopularPostSection } from "../components/PopularPostSection";
import type {
  CommunityPost,
  CommunityPostDraft,
  CommunityValidationResult,
} from "../community.types";

const safePost: CommunityPost = {
  adsFinancialTargetingUsed: false,
  anonymousDisplayName: "익명 12",
  boardType: "LEVEL_CERTIFICATION",
  bodyPreview: "민감한 급여 원문 없이 레벨업 인증을 공유했습니다.",
  bookmarkCount: 4,
  commentCount: 8,
  createdAt: "2026-07-10T00:00:00.000Z",
  id: "post_level_1",
  likeCount: 21,
  moderationStatus: "SAFE",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  title: "레벨업 인증 루틴",
  updatedAt: "2026-07-10T00:00:00.000Z",
};

const safeDraft: CommunityPostDraft = {
  anonymous: true,
  boardType: "FREE",
  content: "급여와 계좌 원문 없이 이번 주 루틴을 공유합니다.",
  tags: ["routine"],
  title: "주간 루틴",
};

const safeValidation: CommunityValidationResult = {
  issues: [],
  moderationStatus: "SAFE",
  valid: true,
};

describe("community feature components", () => {
  it("renders board tabs with selected state and safe counts", () => {
    const onSelect = jest.fn();
    const screen = render(
      <CommunityTabBar
        counts={{ FREE: 12, LEVEL_CERTIFICATION: 3 }}
        onSelect={onSelect}
        selected="LEVEL_CERTIFICATION"
        tabs={["FREE", "LEVEL_CERTIFICATION", "HEALTH_ROUTINE"]}
      />,
    );

    const selectedTab = screen.getByRole("tab", {
      name: "레벨업 인증 게시판 3개 글",
    });
    expect(selectedTab.props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(
      screen.getByRole("tab", { name: "취미 게시판 게시판 0개 글" }),
    );
    expect(onSelect).toHaveBeenCalledWith("HEALTH_ROUTINE");
    expect(screen.getByText("익명 경계를 유지해요")).toBeTruthy();
  });

  it("renders popular posts without raw financial ad targeting", () => {
    const onPressPost = jest.fn();
    const screen = render(
      <PopularPostSection posts={[safePost]} onPressPost={onPressPost} />,
    );

    expect(screen.getByText("인기 게시글")).toBeTruthy();
    expect(screen.getByText("레벨업 인증 루틴")).toBeTruthy();
    expect(screen.getByText("문맥형 추천")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", {
        name: "레벨업 인증 루틴 게시글 열기",
      }),
    );
    expect(onPressPost).toHaveBeenCalledWith(safePost);
  });

  it("wraps the write form in an accessible compose bottom sheet", () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();
    const onChange = jest.fn();
    const screen = render(
      <ComposeBottomSheet
        draft={safeDraft}
        open
        submitting={false}
        validation={safeValidation}
        onChange={onChange}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("커뮤니티 글쓰기 바텀시트")).toBeTruthy();
    expect(screen.getByText("커뮤니티 글쓰기")).toBeTruthy();
    expect(screen.getByText("문맥형 커뮤니티 경계를 유지해요")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "글쓰기 닫기" }));
    fireEvent.press(screen.getByRole("button", { name: "게시글 발행" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not render the compose bottom sheet when closed", () => {
    const screen = render(
      <ComposeBottomSheet
        draft={safeDraft}
        open={false}
        submitting={false}
        validation={safeValidation}
        onChange={jest.fn()}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText("커뮤니티 글쓰기 바텀시트")).toBeNull();
  });
});
