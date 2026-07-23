import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("community board capture states", () => {
  it("renders the Stitch SCR-017 community board states as native capture screens", () => {
    const variants = [
      "community-state-board-ko",
      "community-state-board-en-tabs",
      "community-offline-moderation-board",
      "community-state-board",
      "community-hobby-board",
      "community-levelup-board",
      "community-search-results",
      "community-free-board-alt",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
