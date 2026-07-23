import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("amount input error modal capture states", () => {
  it("renders the Stitch MOD-001 amount error modal states as native dialogs", () => {
    const variants = [
      "payroll-amount-validation-error",
      "salary-amount-check",
      "amount-input-error",
      "monthly-budget-over-limit",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
