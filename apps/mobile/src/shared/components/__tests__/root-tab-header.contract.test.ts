import { readFileSync } from "node:fs";
import { join } from "node:path";

const MOBILE_ROOT = join(__dirname, "..", "..", "..", "..");
const APP_ROOT = join(MOBILE_ROOT, "app");
const SRC_ROOT = join(MOBILE_ROOT, "src");

function readMobile(path: string): string {
  return readFileSync(join(MOBILE_ROOT, path), "utf8");
}

describe("root tab header contract", () => {
  const componentSource = readMobile("src/shared/components/RootTabHeader.tsx");

  it("uses the approved brand lockup and exact Korean root subtitles", () => {
    expect(componentSource).toContain("Salary HiJacking");
    expect(componentSource).toContain("급여납치 메인");
    expect(componentSource).toContain("급여납치 계획");
    expect(componentSource).toContain("급여납치 레벨업");
    expect(componentSource).toContain("급여납치 커뮤니티");
    expect(componentSource).toContain("급여납치 마이페이지");
    expect(componentSource).toContain("salary-hijacking-platform-logo.png");
  });

  it("keeps the exact root action matrix", () => {
    expect(componentSource).toContain("HOME_HEADER_ACTIONS");
    expect(componentSource).toContain("NOTIFICATION_ONLY");
    expect(componentSource).toContain("PLAN_HEADER_ACTIONS");
    expect(componentSource).toContain("NONE");
    expect(componentSource).toContain("LVUP_HEADER_ACTIONS");
    expect(componentSource).toContain("GOAL_MANAGEMENT_ONLY");
    expect(componentSource).toContain("COMMUNITY_HEADER_ACTIONS");
    expect(componentSource).toContain("MY_POSTS_MANAGEMENT_ONLY");
    expect(componentSource).toContain("MY_HEADER_ACTIONS");
  });

  it("publishes the LV UP golden geometry as a shared root header contract", () => {
    expect(componentSource).toContain("ROOT_TAB_HEADER_GEOMETRY");
    expect(componentSource).toContain("headerMinHeight");
    expect(componentSource).toContain("designSystem.header.height");
    expect(componentSource).toContain("logoSize: 40");
    expect(componentSource).toContain("actionHitTarget: 48");
    expect(componentSource).toContain(
      "designSystem.navigation.bottomTabs.iconSize",
    );
    expect(componentSource).toContain(
      "minHeight: ROOT_TAB_HEADER_GEOMETRY.headerMinHeight",
    );
    expect(componentSource).toContain(
      "width: ROOT_TAB_HEADER_GEOMETRY.logoSize",
    );
  });

  it("is the only header used by the five root tab screens", () => {
    const rootScreens = [
      join(APP_ROOT, "(tabs)", "salary", "index.tsx"),
      join(APP_ROOT, "(tabs)", "plan", "index.tsx"),
      join(APP_ROOT, "(tabs)", "level", "index.tsx"),
      join(APP_ROOT, "(tabs)", "community", "index.tsx"),
      join(APP_ROOT, "(tabs)", "profile", "index.tsx"),
    ];

    for (const route of rootScreens) {
      const source = readFileSync(route, "utf8");
      expect(source).toContain("RootTabHeader");
      expect(source).not.toContain("<AppHeader");
      expect(source).not.toContain('brandLabel="SALARY HIJACKING"');
    }
  });

  it("keeps RootTabHeader out of detail screens", () => {
    const detailSources = [
      join(APP_ROOT, "(tabs)", "level", "goals.tsx"),
      join(APP_ROOT, "(tabs)", "level", "reading.tsx"),
      join(APP_ROOT, "(tabs)", "community", "write.tsx"),
      join(APP_ROOT, "(tabs)", "profile", "settings.tsx"),
    ];

    for (const route of detailSources) {
      const source = readFileSync(route, "utf8");
      expect(source).not.toContain("RootTabHeader");
    }
  });

  it("exports RootTabHeader through the shared component barrel", () => {
    const barrel = readFileSync(
      join(SRC_ROOT, "shared", "components", "index.ts"),
      "utf8",
    );

    expect(barrel).toContain("RootTabHeader");
    expect(barrel).toContain("RootTabHeaderTab");
    expect(barrel).toContain("ROOT_TAB_HEADER_GEOMETRY");
  });
});
