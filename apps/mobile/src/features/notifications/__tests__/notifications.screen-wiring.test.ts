import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("notifications screen wiring", () => {
  it("uses notifications feature components instead of the clean fintech fallback", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "notifications",
        "index.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("NotificationSummaryCard");
    expect(source).toContain("NotificationList");
    expect(source).toContain("NotificationPreferenceStrip");
    expect(source).toContain("NOTIFICATIONS_PATH");
    expect(source).toContain("NOTIFICATIONS_UNREAD_COUNT_PATH");
    expect(source).toContain("push_token_component_guard");
  });
});
