import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const APP_ROOT = join(process.cwd(), "app");
const FORBIDDEN_API_HELPERS = [
  "DEFAULT_API_BASE",
  "cleanApiBase(",
  "readPublicEnv(",
] as const;
const INTERNAL_TABS_ROUTE = /(["'`])\/\(tabs\)(?:\/[^"'`]*)?\1/g;
const PROFILE_SCREEN = join(APP_ROOT, "(tabs)", "profile", "index.tsx");
const PROFILE_HUB_SCREEN = join(APP_ROOT, "profile", "index.tsx");
const ROOT_LAYOUT_SCREEN = join(APP_ROOT, "_layout.tsx");
const ONBOARDING_SCREEN = join(APP_ROOT, "onboarding.tsx");
const VERIFY_EMAIL_SCREEN = join(APP_ROOT, "(auth)", "verify-email.tsx");
const OAUTH_CALLBACK_SCREEN = join(APP_ROOT, "auth", "oauth", "callback.tsx");

function collectAppSourceFiles(directory: string): readonly string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...collectAppSourceFiles(path));
      continue;
    }
    if (/\.(?:ts|tsx)$/.test(entry)) files.push(path);
  }

  return files;
}

describe("mobile app screen API and route contracts", () => {
  it("keeps app screens on the shared API base helper", () => {
    const violations = collectAppSourceFiles(APP_ROOT).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return FORBIDDEN_API_HELPERS.filter((marker) =>
        source.includes(marker),
      ).map((marker) => `${relative(process.cwd(), path)} uses ${marker}`);
    });

    expect(violations).toEqual([]);
  });

  it("does not navigate to expo-router group-only /(tabs) URLs", () => {
    const violations = collectAppSourceFiles(APP_ROOT).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return Array.from(source.matchAll(INTERNAL_TABS_ROUTE)).map(
        (match) => `${relative(process.cwd(), path)} contains ${match[0]}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it("keeps the profile withdrawal menu on the request-only API endpoint", () => {
    const source = readFileSync(PROFILE_SCREEN, "utf8");

    expect(source).toContain("/api/v1/users/me/withdrawal-request");
    expect(source).not.toContain('route: "/api/v1/users/me/withdraw"');
  });

  it("keeps the root profile route implemented for header navigation", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const profileHub = readFileSync(PROFILE_HUB_SCREEN, "utf8");

    expect(rootLayout).toContain('const PROFILE_ROUTE = "/profile"');
    expect(profileHub).toContain("ProfileHubScreen");
    expect(profileHub).toContain("/profile/settings");
    expect(profileHub).toContain("/profile/account");
    expect(profileHub).toContain("/profile/support");
    expect(profileHub).toContain("/salary");
    expect(profileHub).toContain("rawFinancialData=false");
  });

  it("refreshes the root bootstrap access token before falling back from a 401", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("/api/v1/mobile/bootstrap");
    expect(source).toContain("/api/v1/auth/refresh");
    expect(source).toContain("requestJsonWithAuthRefresh");
    expect(source).toContain("MOBILE_ACCESS_TOKEN_KEY");
    expect(source).toContain("x-raw-financial-data-exposed");
    expect(source).toContain("x-ad-financial-targeting-used");
  });

  it("does not let cached offline sessions bypass verify-email, onboarding, or MFA gates", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("offlineStatusFromCachedSession");
    expect(source).toContain(
      "offlineStatusFromCachedSession(cached, isPublic)",
    );
    expect(source).toContain('if (session.mfaRequired) return "AUTH_REQUIRED"');
    expect(source).toContain(
      'if (!session.emailVerified) return "VERIFY_EMAIL"',
    );
    expect(source).toContain(
      'if (!session.onboardingCompleted) return "ONBOARDING"',
    );
    expect(source).toContain('return "OFFLINE"');
    expect(source).not.toContain(
      'const cachedStatus = cached.authenticated ? "OFFLINE" : "AUTH_REQUIRED"',
    );
  });

  it("routes an authenticated root launch into the salary home", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain('routeKey === "root"');
    expect(source).toContain("shouldRouteReadyStateToHome");
    expect(source).toContain("router.replace(SALARY_HOME_ROUTE as never)");
  });

  it("keeps the onboarding route implemented for incomplete new users", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const onboarding = readFileSync(ONBOARDING_SCREEN, "utf8");

    expect(rootLayout).toContain('const ONBOARDING_ROUTE = "/onboarding"');
    expect(onboarding).toContain("OnboardingScreen");
    expect(onboarding).toContain("createMobileProfileApi");
    expect(onboarding).toContain("completeOnboarding");
    expect(onboarding).toContain("finishOnboarding");
    expect(onboarding).toContain("/plan");
    expect(onboarding).toContain("/salary");
    expect(onboarding).toContain("serverAuthority=true");
    expect(onboarding).toContain("rawFinancialData=false");
  });

  it("keeps the verify-email route implemented for protected email gates", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const verifyEmail = readFileSync(VERIFY_EMAIL_SCREEN, "utf8");

    expect(rootLayout).toContain(
      'const AUTH_VERIFY_ROUTE = "/(auth)/verify-email"',
    );
    expect(verifyEmail).toContain("VerifyEmailScreen");
    expect(verifyEmail).toContain("verifyEmail");
    expect(verifyEmail).toContain("/api/v1/auth/verify-email");
    expect(verifyEmail).toContain("/salary");
    expect(verifyEmail).toContain("/(auth)/login");
    expect(verifyEmail).toContain("rawPersonalData=false");
  });

  it("keeps the verify-email waiting state readable for OAuth and signup email gates", () => {
    const verifyEmail = readFileSync(VERIFY_EMAIL_SCREEN, "utf8");

    expect(verifyEmail).toContain('setStatus("WAITING")');
    expect(verifyEmail).toContain("이메일 인증이 완료됐어요.");
    expect(verifyEmail).toContain("인증 메일을 확인해 주세요.");
    expect(verifyEmail).toContain("인증 링크를 다시 확인해 주세요.");
    expect(verifyEmail).toContain("로그인으로 돌아가기");
    expect(verifyEmail).toContain(
      "메일의 인증 링크를 열면 서버에서 계정을 확인합니다.",
    );
    expect(verifyEmail).not.toMatch(/[?][가-힣]|[가-힣][?]|�/u);
  });

  it("keeps reset-password available as a public auth recovery route", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain('"forgot-password"');
    expect(source).toContain('routeKey === "(auth)/forgot-password"');
    expect(source).toContain('"reset-password"');
    expect(source).toContain('routeKey === "(auth)/reset-password"');
  });

  it("keeps the OAuth callback route public so social login can finish", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const callbackRoute = readFileSync(OAUTH_CALLBACK_SCREEN, "utf8");

    expect(rootLayout).toContain('"auth/oauth/callback"');
    expect(callbackRoute).toContain("OAuthCallbackScreen");
    expect(callbackRoute).toContain("completeOAuth");
    expect(callbackRoute).toContain("/api/v1/auth/oauth/callback");
    expect(callbackRoute).toContain("/salary");
    expect(callbackRoute).toContain("/(auth)/login");
  });
});
