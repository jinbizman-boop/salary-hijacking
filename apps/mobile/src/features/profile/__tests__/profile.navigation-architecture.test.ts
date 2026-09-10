import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const appRoot = join(__dirname, "..", "..", "..", "..", "app");
const profileTabRoot = join(appRoot, "(tabs)", "profile");
const rootProfileRoot = join(appRoot, "profile");

describe("MY tab navigation architecture", () => {
  it("keeps MY detail routes inside the profile tab stack, not the root stack", () => {
    const expectedNestedRoutes = [
      "_layout.tsx",
      "index.tsx",
      "settings.tsx",
      "account.tsx",
      "community.tsx",
      "level.tsx",
      "notifications.tsx",
      "notices.tsx",
      "support.tsx",
    ] as const;

    for (const route of expectedNestedRoutes) {
      expect(existsSync(join(profileTabRoot, route))).toBe(true);
    }

    for (const route of expectedNestedRoutes.filter(
      (route) => route !== "_layout.tsx" && route !== "index.tsx",
    )) {
      expect(existsSync(join(rootProfileRoot, route))).toBe(false);
    }
    expect(existsSync(join(rootProfileRoot, "index.tsx"))).toBe(false);
  });

  it("defines a profile nested Stack so Android Back pops MY detail history before tab history", () => {
    const layoutSource = readFileSync(join(profileTabRoot, "_layout.tsx"), "utf8");
    const tabsSource = readFileSync(join(appRoot, "(tabs)", "_layout.tsx"), "utf8");
    const profileIndexSource = readFileSync(join(profileTabRoot, "index.tsx"), "utf8");

    expect(layoutSource).toContain('import { Stack } from "expo-router"');
    expect(layoutSource).toContain("anchor: \"index\"");
    expect(layoutSource).toContain("<Stack");
    expect(layoutSource).toContain('name="index"');
    expect(layoutSource).toContain('name="settings"');
    expect(layoutSource).toContain('name="account"');
    expect(layoutSource).toContain('name="notifications"');
    expect(tabsSource).toContain('name: "profile"');
    expect(tabsSource).not.toContain('name: "profile/index"');
    expect(profileIndexSource).toContain('NOTIFICATION_SETTINGS: "/profile/notifications"');
    expect(profileIndexSource).not.toContain('NOTIFICATION_SETTINGS: "/notifications/settings"');
  });

  it("uses push for MY detail navigation and reserves replace for terminal auth boundaries", () => {
    const profileIndexSource = readFileSync(join(profileTabRoot, "index.tsx"), "utf8");
    const allProfileSources = [
      "index.tsx",
      "settings.tsx",
      "account.tsx",
      "community.tsx",
      "level.tsx",
      "notifications.tsx",
      "notices.tsx",
      "support.tsx",
    ]
      .map((route) => readFileSync(join(profileTabRoot, route), "utf8"))
      .join("\n");

    expect(profileIndexSource).toContain("router.push(profileMenuRoutes[key]");
    expect(allProfileSources).not.toMatch(/router\.replace\(\s*["']\/salary/u);
  });

  it("routes MY profile and account/security menu items to their matching detail screens", () => {
    const profileIndexSource = readFileSync(join(profileTabRoot, "index.tsx"), "utf8");

    expect(profileIndexSource).toContain('PROFILE: "/profile/settings"');
    expect(profileIndexSource).toContain('ACCOUNT_SECURITY: "/profile/account"');
  });
});
