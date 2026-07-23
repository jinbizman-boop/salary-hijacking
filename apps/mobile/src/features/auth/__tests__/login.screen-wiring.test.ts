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

  it("does not leave production login actions as no-op callbacks", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
      "utf8",
    );

    expect(source).not.toContain("onSubmit={() => undefined}");
    expect(source).not.toContain("onSelectProvider={() => undefined}");
    expect(source).toContain("createMobileAuthApi");
    expect(source).toContain("authApi.login");
    expect(source).toContain("authApi.startOAuth");
  });

  it("does not leave production signup submit as a no-op callback", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "signup.tsx"),
      "utf8",
    );

    expect(source).not.toContain("onSubmit={() => undefined}");
    expect(source).toContain("createMobileAuthApi");
    expect(source).toContain("authApi.register");
  });

  it("does not leave password recovery actions as no-op callbacks", () => {
    const forgot = readFileSync(
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
    const reset = readFileSync(
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

    expect(forgot).not.toContain("onSubmit={() => undefined}");
    expect(forgot).toContain("authApi.requestPasswordReset");
    expect(reset).not.toContain("onSubmit={() => undefined}");
    expect(reset).toContain("authApi.confirmPasswordReset");
  });

  it("does not route preview or staging launches around authentication", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "index.tsx"),
      "utf8",
    );

    expect(source).not.toContain("isPreviewFallbackLaunch");
    expect(source).not.toContain('releaseChannel === "preview"');
    expect(source).not.toContain('environment === "staging"');
    expect(source).not.toContain("preview QA fallback");
    expect(source).toContain("no preview auth bypass");
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
