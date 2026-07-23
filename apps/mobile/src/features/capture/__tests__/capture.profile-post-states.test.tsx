import { render } from "@testing-library/react-native";

import { CapturePreviewScreen } from "../CapturePreviewScreen";

describe("profile post-management capture states", () => {
  it("renders the Stitch SCR-024 my-post management states as native capture screens", () => {
    const variants = [
      "profile-posts-loading-skeleton",
      "profile-posts-offline",
      "profile-posts-offline-alt",
      "profile-liked-posts",
      "profile-drafts",
      "profile-share-certification-prompt",
      "profile-community-restricted",
      "profile-shared-certification-detail",
      "profile-post-search-empty",
      "profile-post-management-default",
      "profile-written-posts-empty",
    ] as const;

    for (const variant of variants) {
      const screen = render(<CapturePreviewScreen kind={variant} />);

      expect(screen.getByTestId(`capture-${variant}`)).toBeTruthy();
      screen.unmount();
    }
  });
});
