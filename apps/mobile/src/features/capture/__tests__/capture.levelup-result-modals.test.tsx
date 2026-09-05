import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("level-up result modal capture states", () => {
  it("renders the Stitch MOD-006 level-up result modal states as native dialogs", () => {
    const variants = [
      "english-levelup-share",
      "reading-levelup",
      "levelup-celebration",
      "levelup-result",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
