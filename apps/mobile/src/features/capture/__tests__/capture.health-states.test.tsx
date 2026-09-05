import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("health level capture states", () => {
  it("renders the Stitch SCR-016 health level states as native capture screens", () => {
    const variants = [
      "health-safety-check",
      "health-offline-cached",
      "health-workout-detail",
      "health-safety-unavailable",
      "health-content-load-error",
      "health-workout-in-progress",
      "health-workout-flow",
      "health-workout-record",
      "health-flow",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
