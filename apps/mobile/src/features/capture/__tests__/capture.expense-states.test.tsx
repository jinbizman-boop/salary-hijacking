import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("expense capture states", () => {
  it("renders edit, refund, validation, blocked, and invalidate native expense states", () => {
    const edit = render(<CapturePreviewScreen kind="expense-form-edit" />);
    expect(edit.getAllByText("변동 지출 수정").length).toBeGreaterThan(0);
    expect(edit.getByDisplayValue("폴드센스 파스콘 구입")).toBeTruthy();

    const refund = render(<CapturePreviewScreen kind="expense-form-refund" />);
    expect(refund.getAllByText("환불 처리").length).toBeGreaterThan(0);
    expect(
      refund.getByText("서버 승인 전에는 지출 합계에 반영하지 않습니다."),
    ).toBeTruthy();

    const validation = render(
      <CapturePreviewScreen kind="expense-form-validation" />,
    );
    expect(
      validation.getAllByText("입력값을 확인해 주세요").length,
    ).toBeGreaterThan(0);
    expect(validation.getByText("금액은 1원 이상이어야 합니다.")).toBeTruthy();

    const blocked = render(
      <CapturePreviewScreen kind="expense-delete-blocked" />,
    );
    expect(blocked.getByText("삭제할 수 없는 지출입니다")).toBeTruthy();
    expect(
      blocked.getByText("정산이 완료된 지출은 취소 요청으로 처리합니다."),
    ).toBeTruthy();

    const invalidateReason = render(
      <CapturePreviewScreen kind="expense-invalidate-reason" />,
    );
    expect(invalidateReason.getByText("무효 처리 사유")).toBeTruthy();
    expect(invalidateReason.getByText("중복 입력")).toBeTruthy();
  });
});
