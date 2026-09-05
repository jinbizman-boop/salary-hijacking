import { fireEvent, render } from "@testing-library/react-native";

import {
  resetSalaryHomePreviewCacheForTests,
  SalaryHomeScreen,
} from "../../salary/components";
import { PlanScreen } from "../components";

describe("plan launch readiness interactions", () => {
  beforeEach(() => {
    resetSalaryHomePreviewCacheForTests();
  });

  it("treats living cost as daily amount times days and syncs new rows to salary home", () => {
    const plan = render(<PlanScreen />);

    expect(plan.getByText("일일 생활비 계획/설정")).toBeTruthy();
    expect(plan.getByText("일일 생활비 총액")).toBeTruthy();
    expect(plan.getByText("월별 생활비 총액")).toBeTruthy();
    expect(plan.getByText("600,000원")).toBeTruthy();

    fireEvent.press(
      plan.getByRole("button", { name: "일일 생활비 계획/설정 설정" }),
    );
    fireEvent.press(plan.getByRole("button", { name: "일일 생활비 추가하기" }));
    fireEvent.changeText(plan.getByLabelText("계획 항목 카테고리"), "외식");
    fireEvent.changeText(plan.getByLabelText("계획 항목 내용"), "점심 샐러드");
    fireEvent.changeText(plan.getByLabelText("계획 항목 금액"), "8500");
    fireEvent.press(plan.getByRole("button", { name: "계획 항목 저장" }));

    expect(plan.getByText("점심 샐러드")).toBeTruthy();
    expect(plan.getByText("8,500원")).toBeTruthy();

    const salary = render(<SalaryHomeScreen />);
    expect(salary.getByText("점심 샐러드")).toBeTruthy();
    expect(salary.getAllByText("8,500원").length).toBeGreaterThanOrEqual(1);
  });
});
