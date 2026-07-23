import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("mission complete modal capture states", () => {
  it("renders the Stitch MOD-005 mission completion modal states as native overlays", () => {
    const variants = [
      "news-mission-complete",
      "health-already-complete",
      "news-already-complete",
      "reading-already-complete",
      "workout-record-complete",
      "mission-complete-xp",
      "xp-result-state-board",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
