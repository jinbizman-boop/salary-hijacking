import { fireEvent, render } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pressable } from "react-native";

import { CommunityAdDisclosure } from "../components/CommunityAdDisclosure";
import { CommunityCommentItem } from "../components/CommunityCommentItem";
import { CommunityPostCard } from "../components/CommunityPostCard";
import { CommunityWriteForm } from "../components/CommunityWriteForm";
import type {
  CommunityAdDisclosureModel,
  CommunityComment,
  CommunityPost,
  CommunityPostDraft,
  CommunityValidationResult,
} from "../community.types";

const safeDraft: CommunityPostDraft = {
  boardType: "FREE",
  title: "생활 루틴",
  content: "주간 단위로 계획을 점검한 경험을 공유합니다.",
  tags: [],
  anonymous: true,
};

const safeValidation: CommunityValidationResult = {
  valid: true,
  issues: [],
  moderationStatus: "SAFE",
};

const safePost: CommunityPost = {
  adsFinancialTargetingUsed: false,
  anonymousDisplayName: "익명 12",
  boardType: "FREE",
  bodyPreview: "생활비를 일 단위로 나누어 관리한 후기입니다.",
  bookmarkCount: 0,
  commentCount: 3,
  createdAt: "2026-07-04T00:00:00.000Z",
  id: "post_1",
  likeCount: 7,
  moderationStatus: "SAFE",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  title: "이번 주 예산 루틴",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

const safeComment: CommunityComment = {
  anonymousDisplayName: "?듬챸 4",
  content: "?쒓뎅 ?쒓컙 湲곗??쇰줈 ?쒖떆?섎뒗 ?볤?湲곕줉?낅땲??",
  createdAt: "2026-07-11T15:00:00.000Z",
  id: "comment_1",
  likeCount: 0,
  moderationStatus: "SAFE",
  postId: "post_1",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  updatedAt: "2026-07-11T15:00:00.000Z",
};

describe("community components", () => {
  it("keeps write-form labels, placeholders, and actions readable in Korean", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "CommunityWriteForm.tsx"),
      "utf8",
    );

    expect(source).toContain("게시판");
    expect(source).toContain("게시글 제목");
    expect(source).toContain("제목을 입력하세요");
    expect(source).toContain("개인정보와 실제 금융 금액은 입력하지 마세요");
    expect(source).toContain("게시글 발행");
    expect(source).not.toContain("�");
  });

  it("shows an explicit contextual ad disclosure", () => {
    const model: CommunityAdDisclosureModel = {
      id: "ad_1",
      label: "광고",
      title: "일반 생활 서비스",
      description: "현재 커뮤니티 화면 맥락에 따라 표시됩니다.",
      destinationUrl: "https://example.test",
      contextualOnly: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    };
    const screen = render(<CommunityAdDisclosure model={model} />);

    expect(screen.getByText("광고")).toBeTruthy();
    expect(
      screen.getByText("개인 금융정보를 사용하지 않은 문맥형 광고"),
    ).toBeTruthy();
  });

  it("does not expose credentialed contextual ad URLs as pressable links", () => {
    const onPress = jest.fn();
    const model: CommunityAdDisclosureModel = {
      id: "ad_credentialed",
      label: "광고",
      title: "unsafe ad",
      description: "credentialed URL must not be opened",
      destinationUrl: "https://partner:secret@salaryhijacking.com/community-ad",
      contextualOnly: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    };

    const screen = render(
      <CommunityAdDisclosure model={model} onPress={onPress} />,
    );

    expect(screen.queryByLabelText("광고 unsafe ad ?닿린")).toBeNull();
    expect(screen.UNSAFE_queryAllByType(Pressable)).toHaveLength(0);
    expect(screen.getByText("unsafe ad")).toBeTruthy();
    expect(onPress).not.toHaveBeenCalled();
  });

  it("disables publishing when moderation blocks the draft", () => {
    const onSubmit = jest.fn();
    const screen = render(
      <CommunityWriteForm
        draft={safeDraft}
        validation={{
          valid: false,
          issues: [
            {
              code: "PERSONAL_DATA",
              field: "content",
              message: "개인정보를 제거해 주세요.",
            },
          ],
          moderationStatus: "BLOCKED",
        }}
        submitting={false}
        onChange={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("개인정보를 제거해 주세요.")).toBeTruthy();
    const publishButton = screen.getByRole("button", { name: "게시글 발행" });
    expect(publishButton.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(publishButton);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a safe draft", () => {
    const onSubmit = jest.fn();
    const screen = render(
      <CommunityWriteForm
        draft={safeDraft}
        validation={safeValidation}
        submitting={false}
        onChange={jest.fn()}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(screen.getByRole("button", { name: "게시글 발행" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
  it("renders comment dates with the Korean calendar day across UTC boundaries", () => {
    const toLocaleDateStringSpy = jest
      .spyOn(Date.prototype, "toLocaleDateString")
      .mockImplementation((_locale, options) =>
        options?.timeZone === "Asia/Seoul" ? "2026. 7. 12." : "2026. 7. 11.",
      );

    try {
      const screen = render(<CommunityCommentItem comment={safeComment} />);

      expect(screen.getByText("2026. 7. 12.")).toBeTruthy();
      expect(screen.queryByText("2026. 7. 11.")).toBeNull();
      expect(toLocaleDateStringSpy).toHaveBeenCalledWith(
        "ko-KR",
        expect.objectContaining({ timeZone: "Asia/Seoul" }),
      );
    } finally {
      toLocaleDateStringSpy.mockRestore();
    }
  });
});

describe("community post card actions", () => {
  it("exposes selected state on liked community post cards", () => {
    const onLike = jest.fn();
    const screen = render(
      <CommunityPostCard
        liked
        onLike={onLike}
        onPress={jest.fn()}
        post={safePost}
      />,
    );
    const likeButton = screen.getByRole("button", { name: "좋아요 취소" });

    expect(likeButton.props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(likeButton);
    expect(onLike).toHaveBeenCalledWith(safePost, false);
  });
});
