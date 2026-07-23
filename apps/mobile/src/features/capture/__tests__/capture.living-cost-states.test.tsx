import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("living cost capture states", () => {
  it("renders the Stitch SCR-011 daily living cost states as native capture screens", () => {
    const variants = [
      "living-cost-save-failure",
      "living-cost-saving",
      "living-cost-settings",
      "living-cost-alt",
      "living-cost-weekday-weekend",
      "living-cost-saving-alt",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
