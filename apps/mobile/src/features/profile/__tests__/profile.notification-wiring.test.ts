import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("profile notification lifecycle wiring", () => {
  it("revokes the current native notification device before logout without blocking logout", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(tabs)",
        "profile",
        "index.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("createMobileNotificationsApi");
    expect(source).toContain(
      "createNativeNotificationRegistrationDependencies",
    );
    expect(source).toContain("revokeNativeNotificationDevice");
    expect(source).toContain("await authApi.logout()");
    expect(source).toContain("routeAfterLogout()");
    expect(source).not.toMatch(/pushToken|FCM native token|bearer/iu);
  });
});
