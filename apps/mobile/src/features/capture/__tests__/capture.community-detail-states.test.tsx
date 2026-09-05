import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("community detail capture states", () => {
  it("renders native policy, menu, error, and restricted post-detail states", () => {
    expect(
      render(<CapturePreviewScreen kind="community-post-offline" />).getByText(
        "오프라인 상세",
      ),
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-post-comment-restricted" />,
      ).getByText("댓글 작성이 제한됐어요"),
    ).toBeTruthy();
    expect(
      render(<CapturePreviewScreen kind="community-post-own-menu" />).getByText(
        "게시글 관리",
      ),
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-post-sensitive-warning" />,
      ).getByText("민감정보가 포함될 수 있어요"),
    ).toBeTruthy();
    expect(
      render(<CapturePreviewScreen kind="community-post-deleted" />).getByText(
        "삭제된 게시글입니다",
      ),
    ).toBeTruthy();
  });
});
