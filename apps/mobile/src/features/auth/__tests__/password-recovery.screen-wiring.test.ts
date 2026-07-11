import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("password recovery screen wiring", () => {
  it("uses auth recovery components for forgot-password", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(auth)",
        "forgot-password.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechForgotPasswordScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("PasswordRecoveryHero");
    expect(source).toContain("ForgotPasswordForm");
    expect(source).toContain("AUTH_PASSWORD_RESET_PATH");
    expect(source).toContain("raw_credential_component_guard");
  });

  it("uses auth recovery components for reset-password", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "app",
        "(auth)",
        "reset-password.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechResetPasswordScreen");
    expect(source).toContain("AppShell");
    expect(source).toContain("PasswordRecoveryHero");
    expect(source).toContain("ResetPasswordForm");
    expect(source).toContain("AUTH_PASSWORD_RESET_CONFIRM_PATH");
    expect(source).toContain("reset_token_component_guard");
  });
});
