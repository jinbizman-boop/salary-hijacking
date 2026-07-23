import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("profile my-page capture states", () => {
  it("renders the Stitch SCR-021 profile page states as native capture screens", () => {
    const variants = [
      "profile-performance-partial-error",
      "profile-offline-performance-preview",
      "profile-page-load-error",
      "profile-page-account-restricted",
      "profile-my-page-alt",
      "profile-my-page-legacy",
      "profile-ad-hidden",
      "profile-loading-skeleton",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
