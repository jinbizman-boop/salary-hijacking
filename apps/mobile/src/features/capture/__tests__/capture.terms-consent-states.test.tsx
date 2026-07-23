import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("terms consent capture states", () => {
  it("renders the Stitch SCR-028 terms and consent states as native screens", () => {
    const variants = [
      "terms-ad-data-separation-policy",
      "terms-detailed-consent",
      "terms-fulltext",
      "terms-personalized-ads-consent",
      "terms-consent-alt",
      "terms-review",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
