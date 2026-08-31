import { readFileSync } from "node:fs";
import { join } from "node:path";

const appRoot = join(process.cwd(), "app");
const srcRoot = join(process.cwd(), "src");

const readApp = (...parts: readonly string[]) =>
  readFileSync(join(appRoot, ...parts), "utf8");
const readSrc = (...parts: readonly string[]) =>
  readFileSync(join(srcRoot, ...parts), "utf8");

const mojibakePattern = /[�]|湲|됱|뿬|⑹|튂|꾪|솴|袁|筌|臾|紐|뚨|솮/u;

describe("mobile prototype UI contract", () => {
  it("uses provided PNG icons and readable Korean labels for the five bottom tabs", () => {
    const source = readApp("(tabs)", "_layout.tsx");

    expect(source).not.toMatch(
      /from\s+["']\.\.\/\.\.\/src\/shared\/assets\/icons["']/u,
    );
    expect(source).toContain("../../src/shared/assets/icons/bottom-tabs");
    expect(source).toContain("bottomTabIconAssets.salary");
    expect(source).toContain("bottomTabIconAssets.plan");
    expect(source).toContain("bottomTabIconAssets.level");
    expect(source).toContain("bottomTabIconAssets.community");
    expect(source).toContain("bottomTabIconAssets.profile");
    expect(source).toContain('title: "홈"');
    expect(source).toContain('title: "계획"');
    expect(source).toContain('title: "LV UP"');
    expect(source).toContain('title: "커뮤니티"');
    expect(source).toContain('title: "MY"');
  });

  it("keeps primary screen copy readable and aligned to the supplied HTML/JPG prototypes", () => {
    const salary = [
      readApp("(tabs)", "salary", "index.tsx"),
      readSrc("features", "salary", "components", "SalaryHomeScreen.tsx"),
    ].join("\n");
    const plan = [
      readApp("(tabs)", "plan", "index.tsx"),
      readSrc("features", "plan", "components", "PlanScreen.tsx"),
    ].join("\n");
    const notifications = [
      readApp("notifications", "index.tsx"),
      readSrc(
        "features",
        "notifications",
        "components",
        "NotificationScreen.tsx",
      ),
    ].join("\n");

    for (const source of [salary, plan]) {
      expect(source).toContain("SALARY HIJACKING");
    }

    expect(salary).toContain("Salary Hijacking");
    expect(salary).toContain("지켜낸 돈");
    expect(salary).toContain("누적 납치금액");
    expect(salary).toContain("오늘 사용 가능 금액");
    expect(salary).toContain("예정 고정지출");
    expect(salary).toContain("변동지출");
    expect(salary).toContain("Sponsored 광고 영역");
    expect(salary).toContain("사용 예정");
    expect(salary).toContain("사용 완료");

    expect(plan).toContain("님의 급여 납치 목표 달성률");
    expect(plan).toContain("내 급여 납치 계획/설정");
    expect(plan).toContain("월별 고정 지출 계획/설정");
    expect(plan).toContain("월별 고정 적금 계획/설정");
    expect(plan).toContain("일일 생활비 계획/설정");
    expect(plan).toContain("수정하기");

    expect(notifications).toContain("새로운 알림이 있어요");
    expect(notifications).toContain("내 급여 납치 현황 목표 달성");
    expect(notifications).not.toMatch(/5,780,000|5,500,000/u);
    expect(notifications).toContain(
      "기획의 정석 2장 FOCUS, 기획이 되려면 읽으러 가기",
    );
    expect(notifications).toContain("Today, Business Conversation");
    expect(notifications).not.toContain("BottomNavigation");
    expect(notifications).not.toContain('title: "홈"');
  });

  it("does not keep mojibake copy in core prototype screens", () => {
    const sources = [
      readApp("(tabs)", "_layout.tsx"),
      readApp("(tabs)", "salary", "index.tsx"),
      readApp("(tabs)", "plan", "index.tsx"),
      readApp("notifications", "index.tsx"),
      readApp("notifications", "settings.tsx"),
      readSrc("features", "salary", "components", "SalaryHomeScreen.tsx"),
      readSrc("features", "plan", "components", "PlanScreen.tsx"),
      readSrc(
        "features",
        "notifications",
        "components",
        "NotificationScreen.tsx",
      ),
      readSrc(
        "features",
        "notifications",
        "components",
        "NotificationSettingsScreen.tsx",
      ),
      readSrc("features", "payroll-reminders", "interactive-state.ts"),
    ];

    for (const source of sources) {
      expect(source).not.toMatch(mojibakePattern);
    }
  });
});
