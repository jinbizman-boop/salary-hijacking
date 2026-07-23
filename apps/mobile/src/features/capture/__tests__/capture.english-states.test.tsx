import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("english level-up capture states", () => {
  it("renders the Stitch SCR-015 English level-up states as native screens", () => {
    const variants = [
      "english-daily-detail",
      "english-learning-flow",
      "english-record-success-flow",
      "english-learning-session-flow",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
