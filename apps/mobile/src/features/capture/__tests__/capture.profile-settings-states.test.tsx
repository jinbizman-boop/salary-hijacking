import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("profile settings capture states", () => {
  it("renders the Stitch SCR-022 profile settings states as native capture screens", () => {
    const variants = [
      "profile-settings-validation-error",
      "profile-settings-save-failure",
      "profile-settings-alt",
      "profile-visibility-sheet",
      "profile-image-delete-confirm",
      "profile-uploading",
      "profile-job-selector",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
