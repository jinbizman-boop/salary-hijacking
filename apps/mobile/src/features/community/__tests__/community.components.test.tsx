import { fireEvent, render } from "@testing-library/react-native";

import { CommunityAdDisclosure } from "../components/CommunityAdDisclosure";
import { CommunityWriteForm } from "../components/CommunityWriteForm";
import type {
  CommunityAdDisclosureModel,
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

describe("community components", () => {
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
});
