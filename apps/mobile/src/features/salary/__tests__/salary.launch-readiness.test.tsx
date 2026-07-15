import { fireEvent, render } from "@testing-library/react-native";

import {
  resetSalaryHomePreviewCacheForTests,
  SalaryHomeScreen,
} from "../components";

describe("salary launch readiness interactions", () => {
  beforeEach(() => {
    resetSalaryHomePreviewCacheForTests();
  });

  it("renders Korean launch copy and keeps planned/completed reminder direction", () => {
    const screen = render(<SalaryHomeScreen />);

    expect(screen.getByText("내 급여 납치 현황")).toBeTruthy();
    expect(screen.getByText("전체 누적 납치 금액")).toBeTruthy();
    expect(
      screen.getByText(
        "\uC0AC\uC6A9\uC790\uB2D8\uC774 \uC124\uC815\uD55C \uC77C\uC77C \uC0AC\uC6A9 \uC608\uC0B0",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("사용 예정").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("사용 완료").length).toBeGreaterThanOrEqual(1);

    fireEvent.press(
      screen.getByRole("button", {
        name: "빽다방 아이스 아메리카노 사용 완료로 변경",
      }),
    );

    expect(screen.getAllByText("사용 완료").length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the variable expense form above the saved table and persists rows across remounts", () => {
    const first = render(<SalaryHomeScreen />);

    fireEvent.press(first.getByRole("button", { name: "변동 지출 추가하기" }));
    expect(
      first.getByText("금일 사용한 변동 지출을 바로 저장합니다"),
    ).toBeTruthy();
    expect(first.getByText("항목")).toBeTruthy();
    expect(first.getByText("세부 내용")).toBeTruthy();
    expect(first.getAllByText("사용 금액").length).toBeGreaterThanOrEqual(1);

    fireEvent.changeText(
      first.getByLabelText("변동 지출 항목 입력"),
      "게임 결제",
    );
    fireEvent.changeText(
      first.getByLabelText("변동 지출 세부 내용 입력"),
      "필드센스 파스콘 구입",
    );
    fireEvent.changeText(first.getByLabelText("변동 지출 금액 입력"), "15000");
    fireEvent.press(first.getByRole("button", { name: "변동 지출 저장" }));

    expect(first.getByText("필드센스 파스콘 구입")).toBeTruthy();
    first.unmount();

    const second = render(<SalaryHomeScreen />);
    expect(second.getByText("필드센스 파스콘 구입")).toBeTruthy();
    expect(second.getByLabelText("변동 지출 합계 30,000원")).toBeTruthy();
  });
});
