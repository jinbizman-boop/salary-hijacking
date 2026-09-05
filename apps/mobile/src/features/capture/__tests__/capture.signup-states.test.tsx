import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("signup capture states", () => {
  it("renders the Stitch SCR-003 signup states as native capture screens", () => {
    const variants = [
      "signup-account-info",
      "signup-social-info",
      "signup-welcome",
      "signup-phone-number-step",
      "signup-password-creation",
      "signup-identity-verification",
      "signup-account-info-alt",
      "signup-complete",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
