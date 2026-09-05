import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("my level-up management capture states", () => {
  it("renders the Stitch SCR-025 my level-up management states as native screens", () => {
    const variants = [
      "my-levelup-activity-records",
      "my-levelup-record-detail",
      "my-levelup-empty-records",
      "my-levelup-statistics",
      "my-levelup-offline-records",
      "my-levelup-xp-history",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
