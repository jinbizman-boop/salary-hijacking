import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("payroll onboarding capture states", () => {
  it("renders the Stitch SCR-004 payroll onboarding steps as native capture screens", () => {
    const variants = [
      "onboarding-salary-amount-keypad",
      "onboarding-expected-salary-step",
      "onboarding-intro-alt",
      "onboarding-daily-budget-step",
      "onboarding-plan-review",
      "onboarding-payday-step",
      "onboarding-complete",
      "onboarding-fixed-expense-step",
      "onboarding-fixed-savings-step",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
