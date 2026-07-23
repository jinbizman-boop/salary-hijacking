import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("fixed expense capture states", () => {
  it("renders the Stitch SCR-009 fixed expense add/edit states as native screens", () => {
    const variants = [
      "fixed-expense-saving",
      "fixed-expense-edit-inactive",
      "fixed-expense-save-failure",
      "fixed-expense-register",
      "fixed-expense-add-detailed",
      "fixed-expense-edit",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
