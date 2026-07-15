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
const INDEX_SCREEN = join(APP_ROOT, "index.tsx");
const ROOT_LAYOUT_SCREEN = join(APP_ROOT, "_layout.tsx");
const ANDROID_ENTRY = join(process.cwd(), "index.android.js");
const SPLASH_LAUNCH_SCREEN = join(
  process.cwd(),
  "src",
  "features",
  "auth",
  "components",
  "SplashLaunchScreen.tsx",
);
const CAPTURE_PREVIEW_SCREEN = join(
  process.cwd(),
  "src",
  "features",
  "capture",
  "CapturePreviewScreen.tsx",
);
const ONBOARDING_SCREEN = join(APP_ROOT, "onboarding.tsx");
const VERIFY_EMAIL_SCREEN = join(APP_ROOT, "(auth)", "verify-email.tsx");
const OAUTH_CALLBACK_SCREEN = join(APP_ROOT, "auth", "oauth", "callback.tsx");
const TAB_SCREEN_SOURCES = Object.freeze({
  salary: join(APP_ROOT, "(tabs)", "salary", "index.tsx"),
  level: join(APP_ROOT, "(tabs)", "level", "index.tsx"),
  community: join(APP_ROOT, "(tabs)", "community", "index.tsx"),
  profile: join(APP_ROOT, "(tabs)", "profile", "index.tsx"),
});
const INTERNAL_DIAGNOSTIC_MARKERS = [
  "serverAuthority=true",
  "rawFinancialData=false",
  "rawPersonalData=false",
  "rawPushToken=false",
  "adsFinancialTargeting=false",
  "ads_financial_targeting=false",
] as const;

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

  it("keeps app route files free from internal diagnostic privacy markers", () => {
    const violations = collectAppSourceFiles(APP_ROOT).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return INTERNAL_DIAGNOSTIC_MARKERS.filter((marker) =>
        source.includes(marker),
      ).map((marker) => `${relative(process.cwd(), path)} contains ${marker}`);
    });

    expect(violations).toEqual([]);
  });

  it("keeps the Android entry on the real Expo Router app instead of a release-candidate shell", () => {
    const source = readFileSync(ANDROID_ENTRY, "utf8");

    expect(source.trim()).toBe('import "expo-router/entry";');
    expect(source).not.toContain("AndroidReleaseCandidateApp");
    expect(source).not.toContain("AppRegistry.registerComponent");
    expect(source).not.toContain("salary-hijacking-android-rc-root");
    expect(source).toContain('import "expo-router/entry"');
    expect(source).not.toContain("ExpoRoot");
    expect(source).not.toContain("expo-router/_ctx");
    expect(source).not.toContain("?ㅽ뻾 吏꾨떒 ?붾㈃");
  });

  it("keeps tab screen names aligned with Expo Router child segments", () => {
    const source = readFileSync(
      join(APP_ROOT, "(tabs)", "_layout.tsx"),
      "utf8",
    );

    expect(source).toContain('initialRouteName="salary/index"');
    expect(source).toContain('name: "salary/index"');
    expect(source).toContain('name: "plan/index"');
    expect(source).toContain('name: "level/index"');
    expect(source).toContain('name: "community/index"');
    expect(source).toContain('name: "profile/index"');
    expect(source).not.toContain('initialRouteName="salary"');
  });

  it("keeps primary tab visible copy in Korean instead of temporary English labels", () => {
    const tabLayoutSource = readFileSync(
      join(APP_ROOT, "(tabs)", "_layout.tsx"),
      "utf8",
    );
    const salarySource = readFileSync(TAB_SCREEN_SOURCES.salary, "utf8");
    const levelSource = readFileSync(TAB_SCREEN_SOURCES.level, "utf8");
    const communitySource = readFileSync(TAB_SCREEN_SOURCES.community, "utf8");
    const profileSource = readFileSync(TAB_SCREEN_SOURCES.profile, "utf8");

    expect(tabLayoutSource).toContain('title: "급여"');
    expect(tabLayoutSource).toContain('title: "계획"');
    expect(tabLayoutSource).toContain('title: "커뮤니티"');
    expect(tabLayoutSource).toContain('"급여납치 하단 탭 내비게이션"');
    expect(tabLayoutSource).not.toContain("湲됱뿬");
    expect(tabLayoutSource).not.toContain("怨꾪쉷");
    expect(tabLayoutSource).not.toContain("而ㅻ");

    expect(salarySource).toContain("SalaryHomeScreen");
    expect(salarySource).toContain("내 급여 납치 현황");
    expect(salarySource).toContain("사용자님이 설정한 일일 사용 예산");
    expect(salarySource).toContain("Google 광고 영역");
    expect(salarySource).not.toContain("Salary Home");
    expect(salarySource).not.toContain("This month protected");

    expect(levelSource).toContain("오늘의 성장");
    expect(levelSource).toContain("균형 읽기");
    expect(levelSource).not.toContain("balanced read");

    expect(communitySource).toContain("커뮤니티");
    expect(communitySource).toContain("레벨업 인증");
    expect(communitySource).not.toContain("Proof Board");
    expect(communitySource).not.toContain("Write");

    expect(profileSource).toContain("ProfileHeader");
    expect(profileSource).toContain("ProfileStatGrid");
    expect(profileSource).not.toContain("LV 7 Budget Builder");
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
    expect(profileHub).toContain("/profile/community");
    expect(profileHub).toContain("/profile/level");
    expect(profileHub).toContain("/profile/support");
    expect(profileHub).toContain("/profile/notices");
    expect(profileHub).toContain("/salary");
    expect(profileHub).toContain("router.push(item.route as never)");
    expect(profileHub).toContain('router.replace("/salary" as never)');
    expect(profileHub).toContain("서버 기준으로 MY 데이터를 확인해요.");
    expect(profileHub).toContain("금융 원문은 광고나 분석에 쓰지 않아요.");
    expect(profileHub).not.toContain("serverAuthority=true");
    expect(profileHub).not.toContain("rawFinancialData=false");
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

  it("wraps unreadable root bootstrap response bodies before fallback handling", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("ROOT_BOOTSTRAP_INVALID_RESPONSE");
    expect(source).toMatch(
      /try\s*\{\s*text = await response\.text\(\);\s*\}\s*catch\s*\{\s*throw new Error\("ROOT_BOOTSTRAP_INVALID_RESPONSE"\);\s*\}/u,
    );
    expect(source).not.toContain("const text = await response.text();");
  });

  it("clears root auth cache instead of using offline session fallback when refresh rejects a 401", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("RootAuthExpiredError");
    expect(source).toContain("clearRootAuthenticatedSession");
    expect(source).toContain(
      "await SecureStoreRuntimeRef.deleteItemAsync(MOBILE_ACCESS_TOKEN_KEY)",
    );
    expect(source).toContain(
      "await SecureStoreRuntimeRef.deleteItemAsync(SECURE_SESSION_KEY)",
    );
    expect(source).toContain('status: isPublic ? "READY" : "AUTH_REQUIRED"');
    expect(source).toContain("router.replace(AUTH_LOGIN_ROUTE as never)");
    expect(source).toContain("error instanceof RootAuthExpiredError");
    expect(source).not.toContain(
      'const cachedStatus = cached.authenticated ? "OFFLINE" : "AUTH_REQUIRED"',
    );
  });

  it("keeps the root bootstrap gate copy tied to server-authoritative status checks", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("renderGate");
    expect(source).toContain("/api/v1/mobile/bootstrap");
    expect(source).toContain("/api/v1/mobile/bootstrap");
    expect(source).not.toContain("?깆쓣 以鍮?以묒엯?덈떎");
  });

  it("does not let cached offline sessions bypass verify-email, onboarding, or MFA gates", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("offlineStatusFromCachedSession");
    expect(source).toContain(
      "offlineStatusFromCachedSession(cached, isPublic)",
    );
    expect(source).toContain("mfaRequired: session.mfaRequired");
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

  it("lets the launch screen route root starts so cold deep links are not overwritten", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const indexScreen = readFileSync(INDEX_SCREEN, "utf8");

    expect(rootLayout).toContain("shouldRouteReadyStateToHome");
    expect(rootLayout).toContain("isAuthenticatedAuthRoute(routeKey)");
    expect(rootLayout).not.toContain(
      'routeKey === "root" || isAuthenticatedAuthRoute(routeKey)',
    );
    expect(indexScreen).toContain("resolveInitialLaunchTarget");
    expect(indexScreen).toContain("resolveInitialDeepLinkRoute");
    expect(indexScreen).toContain("if (deepLinkRoute) return deepLinkRoute");
    expect(indexScreen).toContain("return resolveInitialRoute()");
  });

  it("preserves screenshot capture routes before Expo Router rewrites them", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const indexScreen = readFileSync(INDEX_SCREEN, "utf8");

    expect(rootLayout).toContain("INITIAL_CAPTURE_SCREEN_KIND");
    expect(rootLayout).toContain("readInitialCaptureScreenKind");
    expect(rootLayout).toContain("CapturePreviewScreen");
    expect(rootLayout).not.toContain("CleanFintechScreen");
    expect(rootLayout).not.toContain("CleanFintechLevelDetailScreen");
    expect(rootLayout).not.toContain("CleanFintechMyLevelProgressScreen");
    expect(rootLayout).not.toContain("CleanFintechSplashScreen");
    expect(rootLayout).not.toContain("CleanFintechSignupScreen");
    expect(rootLayout).not.toContain("CleanFintechWriteScreen");
    expect(rootLayout).toContain("renderCaptureScreen");
    expect(rootLayout).toMatch(
      /captureScreenKind\s*\?\s*renderCaptureScreen\(captureScreenKind\)/u,
    );
    expect(rootLayout).toContain(
      'if (next === "READY" && captureScreenKind) return',
    );
    expect(indexScreen).toContain("resolveCaptureScreenKindForUrl");
    expect(indexScreen).toContain("CapturePreviewScreen");
    expect(indexScreen).toContain("SplashLaunchScreen");
    expect(indexScreen).toContain("readBrowserLocation");
    expect(indexScreen).toContain(
      "return resolveCaptureScreenKindForUrl(location.href)",
    );
    expect(rootLayout).toContain("readBrowserLocation");
    expect(rootLayout).toContain(
      "return resolveCaptureScreenKindForUrl(location.href)",
    );

    const screenshotScript = readFileSync(
      join(
        process.cwd(),
        "..",
        "..",
        "scripts",
        "release",
        "capture-mobile-clean-fintech-screenshots.mjs",
      ),
      "utf8",
    );
    expect(screenshotScript).toContain('["/capture/splash", "01_splash.png"]');
    expect(screenshotScript).toContain('["/capture/login", "02_login.png"]');
    expect(screenshotScript).toContain('["/capture/signup", "03_signup.png"]');
    expect(screenshotScript).toContain(
      '["/capture/reading", "10_level_reading.png"]',
    );
    expect(screenshotScript).toContain(
      '["/capture/news", "11_level_news.png"]',
    );
    expect(screenshotScript).toContain(
      '["/capture/english", "12_level_english.png"]',
    );
    expect(screenshotScript).toContain(
      '["/capture/health", "13_level_health.png"]',
    );
    expect(screenshotScript).toContain(
      '["/capture/community-write", "15_community_write.png"]',
    );
    expect(screenshotScript).toContain(
      '["/capture/profile-level", "17_profile_level.png"]',
    );
  });

  it("keeps screenshot captures representative of the real planned UI surfaces", () => {
    const source = readFileSync(CAPTURE_PREVIEW_SCREEN, "utf8");

    expect(source).toContain("heroAmount");
    expect(source).toContain("metrics");
    expect(source).toContain("quickActions");
    expect(source).toContain("detailRows");
    expect(source).toContain("salary:");
    expect(source).toContain("3,200,000");
    expect(source).toContain("게시판 선택");
    expect(source).toContain("질문");
    expect(source).toContain("익명");
    expect(source).toContain("독서");
    expect(source).toContain("뉴스");
    expect(source).toContain("영어");
    expect(source).toContain("건강");
  });

  it("does not leave the launch route stuck on a static splash screen", () => {
    const source = readFileSync(INDEX_SCREEN, "utf8");

    expect(source).toContain("SplashScreen.hideAsync");
    expect(source).toContain("SPLASH_ROUTE_DELAY_MS = 1200");
    expect(source).toContain("resolveInitialRoute");
    expect(source).toContain("resolveInitialLaunchTarget");
    expect(source).toContain("resolveInitialDeepLinkRoute");
    expect(source).toContain("normalizeInitialDeepLinkRoute");
    expect(source).toContain('Linking.addEventListener("url"');
    expect(source).toContain("Linking.getInitialURL");
    expect(source).toContain("Linking.parseInitialURLAsync");
    expect(source).toContain("parsedToHref");
    expect(source).toContain('"/community/write"');
    expect(source).toContain("MOBILE_ACCESS_TOKEN_KEY");
    expect(source).toContain("router.replace(route as never)");
    expect(source).toContain("setTimeout");
    expect(source).toContain("SplashLaunchScreen");
    expect(source).not.toMatch(
      /export default function MobileIndexScreen\(\): React\.ReactElement \{\s*return <CleanFintechSplashScreen \/>;\s*\}/u,
    );
    expect(source).not.toContain("CleanFintechSplashScreen");
  });

  it("keeps launch and capture UI copy user-facing instead of developer placeholders", () => {
    const splashSource = readFileSync(SPLASH_LAUNCH_SCREEN, "utf8");
    const captureSource = readFileSync(CAPTURE_PREVIEW_SCREEN, "utf8");

    expect(splashSource).toContain("급여납치 시작 화면");
    expect(splashSource).toContain("AuthBrandLogo");
    expect(splashSource).toContain("EurekaWorldMark");
    expect(splashSource).toContain("clampValue");
    expect(captureSource).toContain("안전 화면");
    expect(captureSource).toContain("자동 이동");
    expect(splashSource).not.toContain("Salary Hijacking launch");
    expect(splashSource).not.toContain('subtitle="Launch"');
    expect(splashSource).not.toContain("launch state");
    expect(splashSource).not.toContain("launch progress");
    expect(captureSource).not.toContain("fallback UI");
  });

  it("hides the native splash once the React root is ready to render", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("loadSplashScreenRuntime");
    expect(source).toContain("SplashScreenRuntimeRef.hideAsync");
    expect(source).toContain("fontsLoaded");
    expect(source).toContain("SPLASH_FORCE_HIDE_FALLBACK_MS = 2500");
    expect(source).toContain("hideNativeSplashSafely");
    expect(source).toContain("onLayout: hideNativeSplashSafely");
    expect(source).toMatch(/setTimeout\(\s*hideNativeSplashSafely/);
  });

  it("keeps root render failures on a safe retry screen instead of a blank app", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("export function ErrorBoundary");
    expect(source).toContain("hideNativeSplashSafely()");
    expect(source).toContain("다시 준비하고 있어요");
    expect(source).toContain("다시 시도");
    expect(source).toContain("onPress: retry");
    expect(source).not.toContain("error.message");
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
    expect(onboarding).toContain("서버 기준으로 급여 계획을 저장해요");
    expect(onboarding).toContain("금융 원문은 광고나 분석에 쓰지 않아요");
    expect(onboarding).not.toContain("serverAuthority=true");
    expect(onboarding).not.toContain("rawFinancialData=false");
  });

  it("prevents duplicate onboarding completion before the profile API acknowledges it", () => {
    const onboarding = readFileSync(ONBOARDING_SCREEN, "utf8");

    expect(onboarding).toContain("onboardingCompletionInFlightRef");
    expect(onboarding).toContain("onboardingCompletionInFlightRef.current");
    expect(onboarding).toContain(
      "onboardingCompletionInFlightRef.current = true",
    );
    expect(onboarding).toContain(
      "onboardingCompletionInFlightRef.current = false",
    );
    expect(onboarding).toContain(".completeOnboarding()");
  });

  it("keeps onboarding focused on concrete payroll setup entries", () => {
    const onboarding = readFileSync(ONBOARDING_SCREEN, "utf8");

    expect(onboarding).toContain("ONBOARDING_SETUP_ENTRIES");
    expect(onboarding).toContain("ONBOARDING_SETUP_ENTRIES");
    expect(onboarding).toContain("급여일과 월급");
    expect(onboarding).toContain("KRW 정수만 입력");
    expect(onboarding).toContain("고정지출 먼저 분리");
    expect(onboarding).toContain("고정저축 먼저 확보");
    expect(onboarding).toContain("finishOnboarding");
    expect(onboarding).toContain("목표: 급여 계획부터 설정하기");
    expect(onboarding).toContain("/salary");
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
    expect(verifyEmail).toContain(
      "개인정보 원문 없이 서버에서 인증 상태를 확인해요.",
    );
    expect(verifyEmail).not.toContain("serverAuthority=true");
    expect(verifyEmail).not.toContain("rawPersonalData=false");
  });

  it("prevents duplicate verify-email resend requests before the auth API acknowledges it", () => {
    const verifyEmail = readFileSync(VERIFY_EMAIL_SCREEN, "utf8");

    expect(verifyEmail).toContain("resendEmailVerificationInFlightRef");
    expect(verifyEmail).toContain("resendEmailVerificationInFlightRef.current");
    expect(verifyEmail).toContain(
      "resendEmailVerificationInFlightRef.current = true",
    );
    expect(verifyEmail).toContain(
      "resendEmailVerificationInFlightRef.current = false",
    );
    expect(verifyEmail).toContain("authApi.requestEmailVerification");
  });

  it("keeps the verify-email waiting state readable for OAuth and signup email gates", () => {
    const verifyEmail = readFileSync(VERIFY_EMAIL_SCREEN, "utf8");

    expect(verifyEmail).toContain('setStatus("WAITING")');
    expect(verifyEmail).toContain("이메일 인증이 완료됐어요.");
    expect(verifyEmail).toContain("인증 메일을 확인해 주세요.");
    expect(verifyEmail).toContain("인증 링크를 다시 확인해 주세요.");
    expect(verifyEmail).toContain("returnToLogin");
    expect(verifyEmail).toContain(
      "메일의 인증 링크를 열면 서버에서 계정을 확인합니다.",
    );
    expect(verifyEmail).not.toContain("serverAuthority=true");
  });

  it("keeps verify-email verification failure copy readable in Korean", () => {
    const verifyEmail = readFileSync(VERIFY_EMAIL_SCREEN, "utf8");

    expect(verifyEmail).toContain("이메일 인증 결과가 확인되지 않았습니다.");
    expect(verifyEmail).not.toContain("Email was not verified.");
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
