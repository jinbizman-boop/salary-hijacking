import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("notifications screen wiring", () => {
  it("uses the user-provided notification reference layout with tappable deep links and no bottom navigation", () => {
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
    const componentSource = readFileSync(
      join(__dirname, "..", "components", "NotificationReferenceScreen.tsx"),
      "utf8",
    );
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
    expect(source).toContain("/level/reading");
    expect(source).toContain("/level/news");
    expect(source).toContain("/level/english");
    expect(source).toContain("/level/health");
    expect(source).toContain("NOTIFICATIONS_PATH");
    expect(source).toContain("NOTIFICATIONS_UNREAD_COUNT_PATH");
    expect(source).toContain("sensitive_financial_data_component_guard");
  });
});
