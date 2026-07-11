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
  anonymousDisplayName: "anonymous 12",
  boardType: "LEVEL_CERTIFICATION",
  bodyPreview: "Completed a reading mission without exposing amounts.",
  bookmarkCount: 4,
  commentCount: 8,
  createdAt: "2026-07-10T00:00:00.000Z",
  id: "post_level_1",
  likeCount: 21,
  moderationStatus: "SAFE",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  title: "Level certification routine",
  updatedAt: "2026-07-10T00:00:00.000Z",
};

const safeDraft: CommunityPostDraft = {
  anonymous: true,
  boardType: "FREE",
  content: "I kept the post private from raw salary and account values.",
  tags: ["routine"],
  title: "Weekly routine",
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
      name: "LEVEL_CERTIFICATION board 3 posts",
    });
    expect(selectedTab.props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(
      screen.getByRole("tab", { name: "HEALTH_ROUTINE board 0 posts" }),
    );
    expect(onSelect).toHaveBeenCalledWith("HEALTH_ROUTINE");
    expect(screen.getByText("rawPersonalDataExposed=false")).toBeTruthy();
  });

  it("renders popular posts without raw financial ad targeting", () => {
    const onPressPost = jest.fn();
    const screen = render(
      <PopularPostSection posts={[safePost]} onPressPost={onPressPost} />,
    );

    expect(screen.getByText("Popular posts")).toBeTruthy();
    expect(screen.getByText("Level certification routine")).toBeTruthy();
    expect(screen.getByText("adsFinancialTargetingUsed=false")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", {
        name: "Level certification routine open post",
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

    expect(
      screen.getByLabelText("community compose bottom sheet"),
    ).toBeTruthy();
    expect(screen.getByText("Write community post")).toBeTruthy();
    expect(screen.getByText("contextualOnlyAdBoundary=true")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "close compose" }));
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

    expect(
      screen.queryByLabelText("community compose bottom sheet"),
    ).toBeNull();
  });
});
