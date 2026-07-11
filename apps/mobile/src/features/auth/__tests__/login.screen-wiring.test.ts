import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("login screen wiring", () => {
  it("uses auth feature components instead of the clean fintech fallback", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("LoginHero");
    expect(source).toContain("LoginCredentialForm");
    expect(source).toContain("SocialLoginButtons");
    expect(source).toContain("AUTH_LOGIN_PATH");
    expect(source).toContain("raw_credential_component_guard");
  });
});
