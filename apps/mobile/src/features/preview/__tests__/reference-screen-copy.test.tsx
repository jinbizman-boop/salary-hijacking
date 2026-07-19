import { render } from "@testing-library/react-native";

import { PlanScreen } from "../../plan/components";
import {
  resetSalaryHomePreviewCacheForTests,
  SalaryHomeScreen,
} from "../../salary/components";

function serializedTree(screen: ReturnType<typeof render>): string {
  return JSON.stringify(screen.toJSON());
}

describe("reference mobile screens Korean copy guard", () => {
  beforeEach(() => {
    resetSalaryHomePreviewCacheForTests();
  });

  it("renders salary home with readable Korean labels and no mojibake markers", () => {
    const screen = render(<SalaryHomeScreen />);
    const tree = serializedTree(screen);

    expect(screen.getByText(/내 급여 납치/u)).toBeTruthy();
    expect(screen.getByText("전체 누적 납치 금액")).toBeTruthy();
    expect(screen.getAllByText("사용 예정").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("사용 완료").length).toBeGreaterThanOrEqual(1);
    expect(tree).not.toMatch(/[�]|湲|援|移|鍮|諛|吏|꾩|뚯|/u);
  });

  it("renders plan screen with readable Korean labels and no mojibake markers", () => {
    const screen = render(<PlanScreen />);
    const tree = serializedTree(screen);

    expect(screen.getByText(/급여 납치 목표 달성률/u)).toBeTruthy();
    expect(screen.getByText("월별 고정 지출 계획/설정")).toBeTruthy();
    expect(screen.getByText("월별 고정 적금 계획/설정")).toBeTruthy();
    expect(screen.getByText("일일 생활비 계획/설정")).toBeTruthy();
    expect(tree).not.toMatch(/[�]|湲|援|移|鍮|諛|吏|꾩|뚯|/u);
  });
});
