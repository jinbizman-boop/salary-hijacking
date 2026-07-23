import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("level hub capture states", () => {
  it("renders the Stitch SCR-012 LV UP states as native capture screens", () => {
    const variants = [
      "level-mission-status-board",
      "level-record-pending",
      "level-mission-start-confirm",
      "level-quick-mission-detail",
      "level-load-error",
      "level-no-content",
      "level-all-daily-complete",
      "level-main-default",
      "level-mission-progress",
      "level-recommendations",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
