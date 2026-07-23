import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("news level-up capture states", () => {
  it("renders the Stitch SCR-014 news states as native capture screens", () => {
    const variants = [
      "news-mission-flow",
      "news-share-review",
      "news-offline-preview",
      "news-flow",
      "news-record-input",
      "news-content-load-error",
      "news-issue-detail",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
