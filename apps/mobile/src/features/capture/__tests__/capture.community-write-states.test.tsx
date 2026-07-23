import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("community write capture states", () => {
  it("renders native compose states, protections, and recovery prompts", () => {
    expect(
      render(
        <CapturePreviewScreen kind="community-write-attachments" />,
      ).getByText("첨부 업로드 중"),
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-write-sensitive-warning" />,
      ).getByText("민감정보가 포함될 수 있어요"),
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-write-restricted" />,
      ).getByText("글쓰기가 제한됐어요"),
    ).toBeTruthy();
    expect(
      render(<CapturePreviewScreen kind="community-write-draft" />).getByText(
        "임시저장된 글",
      ),
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-write-draft-recovery" />,
      ).getByText("임시저장 글을 이어서 쓸까요?"),
    ).toBeTruthy();
    expect(
      render(
        <CapturePreviewScreen kind="community-write-question-anonymous" />,
      ).getByText("질문·익명 설정"),
    ).toBeTruthy();
  });
});
