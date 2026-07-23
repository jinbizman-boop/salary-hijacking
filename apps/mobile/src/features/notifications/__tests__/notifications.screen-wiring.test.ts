import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("notifications screen wiring", () => {
  it("uses the Stitch notification layout with tappable deep links and no bottom navigation", () => {
    const routeSource = readFileSync(
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
    const componentPath = join(
      __dirname,
      "..",
      "components",
      "NotificationScreen.tsx",
    );
    expect(existsSync(componentPath)).toBe(true);
    const componentSource = readFileSync(componentPath, "utf8");
    const source = `${routeSource}\n${componentSource}`;

    expect(routeSource).toContain("NotificationScreen");
    expect(routeSource).not.toContain("NotificationReferenceScreen");
    expect(source).not.toContain("CleanFintechScreen");
    expect(source).not.toContain("bottomTabs");
    expect(source).toContain("useRouter");
    expect(source).toContain("새로운 알림이 있어요");
    expect(source).toContain("내 급여 납치 현황 5,780,000원 달성");
    expect(source).toContain(
      "기획의 정석 2장 FOCUS, 기획이 되려면 읽으러 가기",
    );
    expect(source).toContain("Today, Business Conversation");
    expect(source).toContain("router.push(href as never)");
    expect(source).toContain('router.push("/notifications/settings" as never)');
    expect(source).toContain("/level/reading");
    expect(source).toContain("/level/news");
    expect(source).toContain("/level/english");
    expect(source).toContain("/level/health");
    expect(source).toContain("NOTIFICATIONS_PATH");
    expect(source).toContain("NOTIFICATIONS_UNREAD_COUNT_PATH");
    expect(source).toContain("sensitive_financial_data_component_guard");
  });

  it("adds a dedicated notification settings route without tab chrome", () => {
    const routePath = join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "app",
      "notifications",
      "settings.tsx",
    );
    const componentPath = join(
      __dirname,
      "..",
      "components",
      "NotificationSettingsScreen.tsx",
    );
    expect(existsSync(routePath)).toBe(true);
    expect(existsSync(componentPath)).toBe(true);

    const routeSource = readFileSync(routePath, "utf8");
    const componentSource = readFileSync(componentPath, "utf8");
    expect(routeSource).toContain("NotificationSettingsScreen");
    expect(routeSource).toContain("Linking.openSettings");
    expect(componentSource).toContain("알림 설정");
    expect(componentSource).toContain("푸시 알림");
    expect(componentSource).toContain("금융 원문");
    expect(componentSource).not.toContain("BottomTabBar");
    expect(componentSource).not.toContain("bottomTabs");
  });

  it("does not hardcode production notification token or ad targeting internals", () => {
    const componentPath = join(
      __dirname,
      "..",
      "components",
      "NotificationScreen.tsx",
    );
    const source = readFileSync(componentPath, "utf8");

    expect(source).not.toMatch(/fcm|pushToken|bearer|authorization/iu);
    expect(source).not.toMatch(/adsFinancialTargetingUsed:\\s*true/u);
  });

  it("exports the production notification screens without reference aliases", () => {
    const componentIndex = readFileSync(
      join(__dirname, "..", "components", "index.ts"),
      "utf8",
    );

    expect(componentIndex).toContain("NotificationScreen");
    expect(componentIndex).toContain("NotificationSettingsScreen");
    expect(componentIndex).not.toContain("NotificationReferenceScreen");
    expect(componentIndex).not.toContain("NotificationReferenceHref");
    expect(componentIndex).not.toContain("./NotificationReferenceScreen");
  });
});
