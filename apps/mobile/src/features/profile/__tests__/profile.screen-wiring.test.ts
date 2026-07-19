import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("profile tab screen wiring", () => {
  it("uses profile feature components instead of the clean fintech fallback", () => {
    const forbiddenFixtureName = ["홍", "길동"].join("");
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

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).toContain("ProfileScreen");
    expect(source).toContain("/api/v1/users/me/my-page-summary");
    expect(source).toContain("onSelectMenu");
    expect(source).not.toContain(forbiddenFixtureName);
    expect(source).not.toMatch(
      /totalHijackSaved:\s*5780000|levelXp:\s*880|selfCareScore:\s*84/u,
    );
  });

  it("does not ship prototype MY page copy or sample profile metrics in the tab route", () => {
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

    expect(source).toContain("ProfileScreen");
    expect(source).not.toMatch(
      /prototype|사용자 기획자님|홍길동|짠테크 기획자님|5,780,000|5780000|18Lv|88%/u,
    );
  });
});
