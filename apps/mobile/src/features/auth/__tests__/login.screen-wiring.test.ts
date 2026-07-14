import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("login screen wiring", () => {
  it("uses auth feature components instead of the clean fintech fallback", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).toContain("AuthVisualFrame");
    expect(source).toContain("LoginHero");
    expect(source).toContain("LoginCredentialForm");
    expect(source).toContain("SocialLoginButtons");
    expect(source).toContain("AUTH_LOGIN_PATH");
    expect(source).toContain("raw_credential_component_guard");
  });

  it("keeps the auth visual frame keyboard and safe-area aware", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "AuthVisualFrame.tsx"),
      "utf8",
    );

    expect(source).toContain("KeyboardAvoidingView");
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
    expect(source).toContain("keyboardVerticalOffset={insets.top}");
    expect(source).toContain("paddingBottom: Math.max(insets.bottom, 0)");
    expect(source).toContain("paddingTop: Math.max(insets.top, 0)");
  });
});
