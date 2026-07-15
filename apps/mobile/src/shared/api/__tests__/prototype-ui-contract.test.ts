import { readFileSync } from "node:fs";
import { join } from "node:path";

const appRoot = join(process.cwd(), "app");
const srcRoot = join(process.cwd(), "src");

const readApp = (...parts: readonly string[]) =>
  readFileSync(join(appRoot, ...parts), "utf8");
const readSrc = (...parts: readonly string[]) =>
  readFileSync(join(srcRoot, ...parts), "utf8");

const mojibakePattern =
  /[湲蹂吏遺怨而癤]|덉|꾩|꾨|뿬|⑹|섍|젙|쟻|쉷|묒|쑝|몄|솕|댁|쟾|쇱|쒓|컙/u;

describe("mobile prototype UI contract", () => {
  it("uses provided PNG icons and readable Korean labels for the five bottom tabs", () => {
    const source = readApp("(tabs)", "_layout.tsx");

    expect(source).toContain("appIconAssets.bottomTabs.salary");
    expect(source).toContain("appIconAssets.bottomTabs.plan");
    expect(source).toContain("appIconAssets.bottomTabs.level");
    expect(source).toContain("appIconAssets.bottomTabs.community");
    expect(source).toContain("appIconAssets.bottomTabs.profile");
    expect(source).toContain('title: "급여"');
    expect(source).toContain('title: "계획"');
    expect(source).toContain('title: "LV"');
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

    for (const source of [salary, plan, notifications]) {
      expect(source).toContain("SALARY HIJACKING");
    }

    expect(salary).toContain("내 급여 납치 현황");
    expect(salary).toContain("전체 누적 납치 금액");
    expect(salary).toContain("사용자님이 설정한 금일 고정 지출");
    expect(salary).toContain("사용자님이 설정한 일일 사용 예산");
    expect(salary).toContain("사용 예정");
    expect(salary).toContain("사용 완료");

    expect(plan).toContain("사용자님의 급여 납치 목표 달성률");
    expect(plan).toContain("내 급여 납치 계획/설정");
    expect(plan).toContain("월별 고정 지출 계획/설정");
    expect(plan).toContain("월별 고정 적금 계획/설정");
    expect(plan).toContain("일일 생활비 계획/설정");
    expect(plan).toContain("수정하기");

    expect(notifications).toContain("새로운 알림이 있어요");
    expect(notifications).toContain("내 급여 납치 현황 목표 달성");
    expect(notifications).toContain(
      "기획의 정석 2장 FOCUS, 기획이 되려면 읽으러 가기",
    );
  });

  it("does not keep mojibake copy in core prototype screens", () => {
    const sources = [
      readApp("(tabs)", "_layout.tsx"),
      readApp("(tabs)", "salary", "index.tsx"),
      readApp("(tabs)", "plan", "index.tsx"),
      readApp("notifications", "index.tsx"),
      readSrc("features", "salary", "components", "SalaryHomeScreen.tsx"),
      readSrc("features", "plan", "components", "PlanScreen.tsx"),
      readSrc(
        "features",
        "notifications",
        "components",
        "NotificationScreen.tsx",
      ),
      readSrc("features", "payroll-reminders", "interactive-state.ts"),
    ];

    for (const source of sources) {
      expect(source).not.toMatch(mojibakePattern);
    }
  });
});
