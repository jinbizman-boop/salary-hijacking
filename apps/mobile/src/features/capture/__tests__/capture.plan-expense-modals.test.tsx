import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("plan and expense modal capture states", () => {
  it("renders the Stitch delete, plan save, and budget warning modal states as native dialogs", () => {
    const variants = [
      "expense-delete-confirm-alt",
      "deletion-processing",
      "plan-save-success",
      "plan-save-success-alt",
      "budget-plan-warning",
      "daily-budget-overrun",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
