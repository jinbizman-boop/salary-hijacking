import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("community comment and reaction capture states", () => {
  it("renders native comment thread, input, policy, and confirm states", () => {
    expect(
      render(
        <CapturePreviewScreen kind="community-comments-load-error" />,
      ).getByText("댓글을 불러오지 못했어요"),
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-comment-delete-confirm" />,
      ).getByText("댓글을 삭제할까요?"),
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-comment-edit" />,
      ).getAllByText("댓글 수정")[0],
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-reply-compose" />,
      ).getAllByText("답글 작성")[0],
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-replies-expanded" />,
      ).getByText("답글 3개 펼침"),
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-block-user-confirm" />,
      ).getByText("이 사용자를 차단할까요?"),
    ).toBeTruthy();
    expect(
      render(<CapturePreviewScreen kind="community-no-comments" />).getByText(
        "아직 댓글이 없어요",
      ),
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-comment-thread-policy" />,
      ).getByText("댓글 보호 정책"),
    ).toBeTruthy();
  });
});
