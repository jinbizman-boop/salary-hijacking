import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("reading level-up capture states", () => {
  it("renders the Stitch SCR-013 reading states as native capture screens", () => {
    const variants = [
      "reading-source-unavailable",
      "reading-certification-share-review",
      "reading-book-detail",
      "reading-flow",
      "reading-record-flow",
      "reading-recommendation-error-empty",
      "reading-start-confirm",
      "reading-in-progress",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
