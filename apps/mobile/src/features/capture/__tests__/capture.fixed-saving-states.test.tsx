import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("fixed saving form capture states", () => {
  it("renders the Stitch SCR-010 fixed saving states as native capture screens", () => {
    const variants = [
      "fixed-saving-add-goal",
      "fixed-saving-add-savings-goal",
      "fixed-saving-add-investment",
      "fixed-saving-saving",
      "fixed-saving-save-failure",
      "fixed-saving-edit-savings",
      "fixed-saving-edit-inactive",
      "fixed-saving-delete-confirm",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
