import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("plan capture states", () => {
  it("renders the Stitch SCR-008 plan state variants as native capture screens", () => {
    const variants = [
      "plan-current-summary",
      "plan-budget-summary-alt",
      "plan-salary-info-edit",
      "plan-previous-picker",
      "plan-empty",
      "plan-budget-detail-summary",
      "plan-validation-warning",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
