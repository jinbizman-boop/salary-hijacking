import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("signup screen wiring", () => {
  it("uses auth signup components instead of the clean fintech signup fallback", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "signup.tsx"),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechSignupScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("SignupHero");
    expect(source).toContain("SignupForm");
    expect(source).toContain("SignupAgreementCard");
    expect(source).toContain("AUTH_REGISTER_PATH");
    expect(source).toContain("raw_credential_component_guard");
  });
});
