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

    expect(screen.getByText("이번 급여에서 지켜낸 돈")).toBeTruthy();
    expect(screen.getByText(/누적 /u)).toBeTruthy();
    expect(screen.getAllByText("사용 예정").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("사용 완료").length).toBeGreaterThanOrEqual(1);
    expect(tree).not.toMatch(/[�]|湲|援|移|鍮|諛|吏|꾩|뚯|/u);
  });

  it("renders plan screen with readable Korean labels and no mojibake markers", () => {
    const screen = render(<PlanScreen />);
    const tree = serializedTree(screen);

    expect(screen.getByText(/급여 납치 목표 달성률/u)).toBeTruthy();
    expect(screen.getByText("고정지출")).toBeTruthy();
    expect(screen.getByText("고정저축")).toBeTruthy();
    expect(screen.getByText("생활비")).toBeTruthy();
    expect(tree).not.toMatch(/[�]|湲|援|移|鍮|諛|吏|꾩|뚯|/u);
  });
});
