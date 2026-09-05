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
    expect(source).toContain("loadSocialLoginButtons");
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
    expect(source).not.toContain(
      'import { createMobileAuthApi } from "../../src/shared/api/mobile-api"',
    );
    expect(source).toContain('import("../../src/shared/api/mobile-api")');
    expect(source).toContain("getMobileAuthApi");
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
    expect(source).toContain("topSpacerCompact");
    expect(source).toContain("styles.formGap");
    expect(source).toContain("height < 940");
    expect(source).not.toContain("EurekaWorldMark");
  });

  it("keeps first-run auth and tab routes from importing the shared component barrel for tokens", () => {
    const login = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
      "utf8",
    );
    const tabs = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(tabs)", "_layout.tsx"),
      "utf8",
    );

    expect(login).not.toContain('from "../../src/shared/components";');
    expect(tabs).not.toContain('from "../../src/shared/components";');
    expect(login).toContain('from "../../src/shared/components/tokens";');
    expect(tabs).toContain('from "../../src/shared/components/tokens";');
  });

  it("keeps login child components off the shared component barrel during first render", () => {
    const social = readFileSync(
      join(__dirname, "..", "components", "SocialLoginButtons.tsx"),
      "utf8",
    );

    expect(social).not.toContain('from "../../../shared/components";');
    expect(social).toContain('from "../../../shared/components/tokens";');
  });

  it("keeps social login icon assets deferred behind the lazy social component", () => {
    const login = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
      "utf8",
    );
    const social = readFileSync(
      join(__dirname, "..", "components", "SocialLoginButtons.tsx"),
      "utf8",
    );

    expect(login).not.toContain(
      'import { SocialLoginButtons } from "../../src/features/auth/components/SocialLoginButtons";',
    );
    expect(login).toMatch(
      /import\(\s*"\.\.\/\.\.\/src\/features\/auth\/components\/SocialLoginButtons"\s*\)/u,
    );
    expect(login).toContain("socialLoginButtonsPromise");
    expect(social).toContain(
      'require("../../../shared/assets/icons/social/kakao.png")',
    );
    expect(social).toContain(
      'require("../../../shared/assets/icons/social/naver.png")',
    );
    expect(social).toContain("ImageSourcePropType");
    expect(social).toContain("<Image");
    expect(social).not.toContain("provider.shortLabel");
  });

  it("keeps the production login form commercially polished for contrast and touch targets", () => {
    const login = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
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

    expect(login).toContain("formGapCompact");
    expect(login).toContain("brandSubtitleCompact");
    expect(login).toContain("compact={compactHeight}");
    expect(credentials).toContain("minHeight: designSystem.layout.touchTarget");
    expect(credentials).toContain("color: designSystem.colors.text.inverse");
    expect(credentials).toContain("borderRadius: designSystem.radius.sm");
    expect(social).toContain("dividerRowCompact");
    expect(social).toContain("buttonStackCompact");
    expect(social).toContain("styles.iconSlot");
    expect(social).toContain("borderColor: designSystem.colors.border.strong");
  });

  it("prioritizes the credential CTA when the Android soft keyboard is visible", () => {
    const login = readFileSync(
      join(__dirname, "..", "..", "..", "..", "app", "(auth)", "login.tsx"),
      "utf8",
    );
    const credentials = readFileSync(
      join(__dirname, "..", "components", "LoginCredentialForm.tsx"),
      "utf8",
    );

    expect(login).toContain("Keyboard.addListener");
    expect(login).toContain("keyboardVisible");
    expect(login).toContain("keyboardCompact={keyboardVisible}");
    expect(login).toMatch(/!\s*keyboardVisible\s*&&\s*SocialLoginButtonsComponent/u);
    expect(credentials).toContain("keyboardCompact?: boolean");
    expect(credentials).toContain("styles.titleKeyboardHidden");
    expect(credentials).toContain("styles.inputCompact");
    expect(credentials).toContain("styles.submitButtonCompact");
  });

  it("emits the release login-interactive marker from the rendered credential form", () => {
    const credentials = readFileSync(
      join(__dirname, "..", "components", "LoginCredentialForm.tsx"),
      "utf8",
    );

    expect(credentials).toContain("markReleasePerf");
    expect(credentials).toContain('"route.login.interactive"');
  });

  it("keeps login submit press feedback immediate for PERF-014", () => {
    const credentials = readFileSync(
      join(__dirname, "..", "components", "LoginCredentialForm.tsx"),
      "utf8",
    );
    const primaryButton = readFileSync(
      join(
        __dirname,
        "..",
        "..",
        "..",
        "shared",
        "components",
        "PrimaryButton.tsx",
      ),
      "utf8",
    );

    expect(credentials).toContain("unstable_pressDelay={0}");
    expect(primaryButton).toContain("unstable_pressDelay={0}");
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
    expect(combined).toContain("Google로 계속하기");
    expect(combined).not.toContain("Apple로 로그인");
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
    const brandLogoSource = readFileSync(
      join(__dirname, "..", "components", "AuthBrandLogo.tsx"),
      "utf8",
    );

    expect(source).toContain("KeyboardAvoidingView");
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
    expect(source).toContain("keyboardVerticalOffset={insets.top}");
    expect(source).toContain("AUTH_VISUAL_MIN_BOTTOM_SAFE_GAP");
    expect(source).not.toContain("salary-hijacking-platform-logo.png");
    expect(source).not.toContain("eureka-world-logo.jpg");
    expect(brandLogoSource).toContain(
      "EUREKA_WORLD_LOGO_ASPECT_RATIO = 177 / 1280",
    );
    expect(brandLogoSource).not.toContain("logoWidth * 0.158");
    expect(brandLogoSource).toContain(
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
      join(__dirname, "..", "components", "AuthBrandLogo.tsx"),
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
