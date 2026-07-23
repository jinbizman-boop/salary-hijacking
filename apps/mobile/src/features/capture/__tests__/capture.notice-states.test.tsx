import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("notice capture states", () => {
  it("renders the Stitch SCR-027 notice states as native capture screens", () => {
    const variants = [
      "notice-event-detail",
      "notice-ended-event-detail",
      "notice-privacy-policy-change",
      "notice-maintenance-detail",
      "notice-offline-list",
      "notice-unavailable",
      "notice-app-update-detail",
      "notice-empty",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
