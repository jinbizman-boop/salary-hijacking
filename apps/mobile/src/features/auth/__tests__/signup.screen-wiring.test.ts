import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("signup screen wiring", () => {
  it("uses auth signup components instead of the clean fintech signup fallback", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "signup.tsx"),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechSignupScreen");
    expect(source).toContain("AuthVisualFrame");
    expect(source).toContain("SignupHero");
    expect(source).toContain("SignupForm");
    expect(source).toContain("SignupAgreementCard");
    expect(source).toContain("AUTH_REGISTER_PATH");
    expect(source).toContain("raw_credential_component_guard");
  });

  it("keeps the signup footer clear of Android system navigation on first view", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "signup.tsx"),
      "utf8",
    );

    expect(source).not.toContain("clampValue(height * 0.19, 88, 190)");
    expect(source).not.toContain("clampValue(height * 0.11, 58, 118)");
    expect(source).not.toContain("clampValue(height * 0.072, 38, 78)");
    expect(source).toContain("styles.signupTopSpacer");
    expect(source).toContain("styles.signupFooterSpacer");
    expect(source).toContain("compactHeight");
  });
});
