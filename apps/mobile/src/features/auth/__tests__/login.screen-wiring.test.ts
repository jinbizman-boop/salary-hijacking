import { readFileSync } from "node:fs";
import { join } from "node:path";

const MOJIBAKE_PATTERN =
  /(?:\u6FE1|\u6E72|\u936E|\u6028|\u5A9B|\u8E30|\uF9CD|\u7457|\?\uAFA9|\?\uB6AF|\?\uBA84|\?\uC495|\?\uB300)/u;

describe("login screen wiring", () => {
  it("uses auth feature components instead of the clean fintech fallback", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
      "utf8",
    );

    expect(source).not.toContain("CleanFintechScreen");
    expect(source).toContain("AuthVisualFrame");
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

  it("keeps the clean-install login lockup above Android system navigation", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
      "utf8",
    );

    expect(source).not.toContain("clampValue(height * 0.245, 118, 245)");
    expect(source).not.toContain("clampValue(height * 0.125, 68, 130)");
    expect(source).not.toContain("clampValue(height * 0.072, 38, 78)");
    expect(source).toContain("styles.topSpacer");
    expect(source).toContain("styles.formGap");
    expect(source).not.toContain("EurekaWorldMark");
  });

  it("matches the final login reference structure instead of the stale centered splash composition", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
      "utf8",
    );
    const authFrame = readFileSync(
      join(__dirname, "..", "components", "AuthVisualFrame.tsx"),
      "utf8",
    );
    const credentials = readFileSync(
      join(__dirname, "..", "components", "LoginCredentialForm.tsx"),
      "utf8",
    );
    const social = readFileSync(
      join(__dirname, "..", "components", "SocialLoginButtons.tsx"),
      "utf8",
    );
    const combined = [source, authFrame, credentials, social].join("\n");

    expect(combined).toContain("Salary Hijacking");
    expect(combined).toContain("금융의 주도권을 되찾으세요");
    expect(combined).toContain("로그인");
    expect(combined).toContain("아이디를 입력하세요");
    expect(combined).toContain("비밀번호를 입력하세요");
    expect(combined).toContain("비밀번호 찾기");
    expect(combined).toContain("카카오로 계속하기");
    expect(combined).toContain("네이버로 계속하기");
    expect(combined).toContain("Apple로 로그인");
    expect(source).not.toContain("EurekaWorldMark");
    expect([source, credentials, social].join("\n")).not.toContain(
      "서버 인증으로 급여 데이터를 안전하게 불러옵니다.",
    );
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
    expect(source).toContain("AUTH_VISUAL_MIN_BOTTOM_SAFE_GAP");
    expect(source).toContain("EUREKA_WORLD_LOGO_ASPECT_RATIO = 177 / 1280");
    expect(source).not.toContain("logoWidth * 0.158");
    expect(source).toContain(
      "clampValue(width * 0.52, 190, Math.min(300, width * 0.84))",
    );
    expect(source).toMatch(
      /paddingBottom:\s*Math\.max\(\s*insets\.bottom\s*\+\s*AUTH_VISUAL_MIN_BOTTOM_SAFE_GAP,\s*64,\s*\)/u,
    );
    expect(source).toContain("paddingTop: Math.max(insets.top, 0)");
  });

  it("keeps first-run auth and splash Korean copy readable", () => {
    const files = [
      join(__dirname, "..", "..", "..", "..", "app", "_layout.tsx"),
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "signup.tsx"),
      join(__dirname, "..", "components", "AuthVisualFrame.tsx"),
      join(__dirname, "..", "components", "LoginCredentialForm.tsx"),
      join(__dirname, "..", "components", "SignupForm.tsx"),
      join(__dirname, "..", "components", "SignupAgreementCard.tsx"),
      join(__dirname, "..", "components", "SignupHero.tsx"),
      join(__dirname, "..", "components", "SocialLoginButtons.tsx"),
      join(__dirname, "..", "components", "SplashLaunchScreen.tsx"),
    ];
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(source).toContain("급여납치");
    expect(source).toContain("아이디");
    expect(source).toContain("비밀번호");
    expect(source).toContain("비밀번호 찾기");
    expect(source).toContain("자동 로그인");
    expect(source).not.toMatch(MOJIBAKE_PATTERN);
  });
});
