import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("remaining Stitch overlay capture states", () => {
  it("renders bottom sheets, report results, registration results, and final confirmation states", () => {
    const variants = [
      "certification-share-review",
      "share-standard-blocked",
      "levelup-share-review",
      "comment-report-reason",
      "post-report-reason",
      "report-reason-selector",
      "report-result-board",
      "comment-report-success",
      "date-selection-collection",
      "recurrence-selector",
      "file-photo-attachment",
      "post-menu-collection",
      "sort-filter",
      "visibility-selector",
      "draft-exit-state-board",
      "device-permission-guide",
      "post-registration-result-board",
      "withdrawal-final-confirm",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
