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
    expect(source).toContain("AppShell");
    expect(source).toContain("ProfileHeader");
    expect(source).toContain("ProfileStatGrid");
    expect(source).toContain("ProfileMenuCard");
    expect(source).toContain("/api/v1/users/me/my-page-summary");
    expect(source).toContain("rawPersonalDataExposed={false}");
    expect(source).not.toContain(forbiddenFixtureName);
    expect(source).not.toMatch(
      /totalHijackSaved:\s*5780000|levelXp:\s*880|selfCareScore:\s*84/u,
    );
  });
});
