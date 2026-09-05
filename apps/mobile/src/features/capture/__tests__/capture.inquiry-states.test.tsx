import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("inquiry capture states", () => {
  it("renders the Stitch SCR-026 inquiry states as native screens", () => {
    const variants = [
      "inquiry-detail-answered",
      "inquiry-empty",
      "inquiry-detail-pending",
      "inquiry-offline-preview",
      "inquiry-submitted",
      "inquiry-create",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
