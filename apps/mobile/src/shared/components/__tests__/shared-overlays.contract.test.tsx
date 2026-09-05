import { fireEvent, render } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { BottomSheet, ConfirmDialog } from "..";

describe("shared native overlays", () => {
  it("renders confirm dialogs as native accessible actions", () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();

    const screen = render(
      <ConfirmDialog
        cancelLabel="취소"
        confirmLabel="사용 완료"
        description="오늘 예정된 지출을 사용 완료로 변경합니다."
        onCancel={onCancel}
        onConfirm={onConfirm}
        title="지출 상태 변경"
      />,
    );

    expect(screen.getByLabelText("지출 상태 변경 확인 대화상자")).toBeTruthy();
    expect(screen.getByText("지출 상태 변경")).toBeTruthy();
    expect(
      screen.getByText("오늘 예정된 지출을 사용 완료로 변경합니다."),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "취소" }));
    fireEvent.press(screen.getByRole("button", { name: "사용 완료" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders bottom sheets with selectable native rows and safe-area padding", () => {
    const onClose = jest.fn();
    const onSelect = jest.fn();

    const screen = render(
      <BottomSheet
        actions={[
          { key: "food", label: "음식", description: "식사와 카페 지출" },
          { key: "subscription", label: "구독료" },
        ]}
        onClose={onClose}
        onSelect={onSelect}
        title="카테고리 선택"
      />,
    );

    expect(screen.getByLabelText("카테고리 선택 바텀시트")).toBeTruthy();
    expect(screen.getByText("식사와 카페 지출")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", { name: "음식 식사와 카페 지출" }),
    );
    fireEvent.press(screen.getByRole("button", { name: "닫기" }));

    expect(onSelect).toHaveBeenCalledWith("food");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps confirm dialog styling on canonical overlay design tokens", () => {
    const source = readFileSync(
      join(__dirname, "..", "ConfirmDialog.tsx"),
      "utf8",
    );

    expect(source).toContain("salaryHijackingDesignSystem");
    expect(source).not.toMatch(
      /\b(fontSize|lineHeight|gap|padding|borderRadius|elevation):\s*\d+/,
    );
  });

  it("keeps bottom sheet styling on canonical overlay design tokens", () => {
    const source = readFileSync(
      join(__dirname, "..", "BottomSheet.tsx"),
      "utf8",
    );

    expect(source).toContain("salaryHijackingDesignSystem");
    expect(source).not.toMatch(/#[0-9A-Fa-f]{6,8}\b/u);
    expect(source).not.toMatch(
      /\b(fontSize|lineHeight|gap|padding|paddingHorizontal|paddingVertical|borderRadius|elevation):\s*\d+/,
    );
  });
});
