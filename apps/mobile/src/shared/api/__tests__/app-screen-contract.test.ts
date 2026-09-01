import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
const TABS_LAYOUT_SCREEN = join(APP_ROOT, "(tabs)", "_layout.tsx");
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
const CAPTURE_ROUTE_SCREEN = join(APP_ROOT, "capture", "[screen].tsx");
const CAPTURE_WEB_ROUTE_SCREEN = join(APP_ROOT, "capture", "[screen].web.tsx");
const ONBOARDING_SCREEN = join(APP_ROOT, "onboarding.tsx");
const VERIFY_EMAIL_SCREEN = join(APP_ROOT, "(auth)", "verify-email.tsx");
const OAUTH_CALLBACK_SCREEN = join(APP_ROOT, "auth", "oauth", "callback.tsx");
const SRC_ROOT = join(process.cwd(), "src");
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
const MOJIBAKE_PATTERN =
  /(?:\u6FE1|\u6E72|\u936E|\u6028|\u5A9B|\u8E30|\uF9CD|\u7457|\u7E79|\u8AED|\u7B4C|\u63F6|\u7515|\u75AB|\?\uAFA9|\?\uB6AF|\?\uBA84|\?\uC495|\?\uB300)/u;

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

function collectProductionUiSourceFiles(directory: string): readonly string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      if (
        path.includes(join("src", "features", "capture")) ||
        path.includes(join("src", "shared", "styles")) ||
        path.includes(join("src", "shared", "navigation")) ||
        path.includes("__tests__")
      ) {
        continue;
      }
      files.push(...collectProductionUiSourceFiles(path));
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

  it("keeps bottom tab labels aligned with the final visual reference without mojibake", () => {
    const source = readFileSync(TABS_LAYOUT_SCREEN, "utf8");

    for (const label of ["홈", "계획", "LV UP", "커뮤니티", "MY"]) {
      expect(source).toContain(`title: "${label}"`);
    }
    expect(source).toContain(
      'tabBarAccessibilityLabel: "급여납치 하단 탭 내비게이션"',
    );
    expect(source).not.toMatch(MOJIBAKE_PATTERN);
    expect(source).not.toContain("??");
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

  it("keeps the Android entry on the full Expo Router production app registration", () => {
    const source = readFileSync(ANDROID_ENTRY, "utf8");

    expect(source).toContain("expo-router/entry");
    expect(source).toContain("react-native-gesture-handler");
    expect(source).not.toContain("./src/android-safe-entry");
    expect(source).not.toContain("./src/android-direct-entry");
    expect(source).not.toContain("AndroidReleaseCandidateApp");
    expect(source).not.toContain("AppRegistry.registerComponent");
    expect(source).not.toContain("salary-hijacking-android-rc-root");
    expect(source).not.toContain("android-safe-entry");
  });

  it("keeps the deprecated Android safe-entry source out of production source", () => {
    expect(
      existsSync(join(process.cwd(), "src", "android-safe-entry.tsx")),
    ).toBe(false);
  });

  it("keeps the deprecated Android direct QA APK entry source out of production source", () => {
    expect(
      existsSync(join(process.cwd(), "src", "android-direct-entry.tsx")),
    ).toBe(false);

    const salaryHomeSource = readFileSync(
      join(
        process.cwd(),
        "src",
        "features",
        "salary",
        "components",
        "SalaryHomeScreen.tsx",
      ),
      "utf8",
    );
    const combinedRuntimeSurface = salaryHomeSource;

    expect(combinedRuntimeSurface).toContain("\uC9C0\uCF1C\uB0B8 \uB3C8");
    expect(combinedRuntimeSurface).toContain(
      "\uB204\uC801 \uB0A9\uCE58\uAE08\uC561",
    );
    expect(combinedRuntimeSurface).toContain(
      "\uC624\uB298 \uC0AC\uC6A9 \uAC00\uB2A5 \uAE08\uC561",
    );
    expect(combinedRuntimeSurface).toContain("\uC0AC\uC6A9 \uC608\uC815");
    expect(combinedRuntimeSurface).toContain("\uC0AC\uC6A9 \uC644\uB8CC");

    const mojibakeMarkers = [
      "\u6E72",
      "\u6028",
      "\u800C\u316B",
      "\uB35A",
      "\u907A",
      "\u934C",
      "\uC392",
      "\uFFFD",
    ] as const;
    expect(
      mojibakeMarkers.filter((marker) =>
        combinedRuntimeSurface.includes(marker),
      ),
    ).toEqual([]);
  });

  it("keeps tab screen names aligned with Expo Router folder route segments", () => {
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

    expect(tabLayoutSource).toContain('title: "\uD648"');
    expect(tabLayoutSource).toContain('title: "\uACC4\uD68D"');
    expect(tabLayoutSource).toContain('title: "LV UP"');
    expect(tabLayoutSource).toContain('title: "\uCEE4\uBBA4\uB2C8\uD2F0"');
    expect(tabLayoutSource).toContain(
      '"\uAE09\uC5EC\uB0A9\uCE58 \uD558\uB2E8 \uD0ED \uB0B4\uBE44\uAC8C\uC774\uC158"',
    );
    expect(tabLayoutSource).toContain("expo_router_index_segment_tabs");
    expect(tabLayoutSource).not.toContain("Salary Home");
    expect(tabLayoutSource).not.toContain("Proof Board");

    expect(salarySource).toContain("SalaryHomeScreen");
    expect(salarySource).not.toContain("Salary Home");
    expect(salarySource).not.toContain("This month protected");

    expect(levelSource).not.toContain("balanced read");

    expect(communitySource).not.toContain("Proof Board");
    expect(communitySource).not.toContain("Write");

    expect(profileSource).toContain("ProfileScreen");
    expect(profileSource).toContain("/api/v1/users/me/my-page-summary");
    expect(profileSource).toContain('ACCOUNT_SETTINGS: "/profile/account"');
    expect(profileSource).not.toContain(
      'ACCOUNT_SETTINGS: "/profile/settings"',
    );
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
    expect(profileHub).toContain("최신 MY 기록을 안전하게 확인해요.");
    expect(profileHub).toContain(
      "\uAE08\uC735 \uC6D0\uBB38\uC740 \uAD11\uACE0\uB098 \uBD84\uC11D\uC5D0 \uC4F0\uC9C0 \uC54A\uC544\uC694.",
    );
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

  it("keeps the full auth API client off the native launch critical path", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).not.toContain(
      'import { createAuthApi } from "../src/features/auth/api";',
    );
    expect(source).toContain("function loadRootAuthApi()");
    expect(source).toContain('loadModule("../src/features/auth/api")');
    expect(source).toContain("const authApi = loadRootAuthApi().createAuthApi");
    expect(source).toContain('if (typeof authApi !== "function") return false');
  });

  it("keeps API base and e2e config resolution off the root module-load path", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).not.toContain(
      'import { readMobileApiBaseUrl } from "../src/shared/api/api-base";',
    );
    expect(source).not.toContain("const API_BASE_URL = readMobileApiBaseUrl()");
    expect(source).not.toContain(
      "const IS_E2E_BUILD = readMobileE2eBuildEnabled()",
    );
    expect(source).toContain("function readRootMobileApiBaseUrl()");
    expect(source).toContain("function isMobileE2eBuildEnabled()");
    expect(source).toContain('loadModule("../src/shared/api/api-base")');
    expect(source).toContain("const apiBaseUrl = readRootMobileApiBaseUrl()");
  });

  it("keeps secure storage runtime resolution off the root module-load path", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).not.toContain('from "../src/shared/storage/auth-token"');
    expect(source).not.toContain('from "../src/shared/storage/secure-store"');
    expect(source).not.toContain(
      "const SecureStoreRuntimeRef = loadSecureStoreRuntime()",
    );
    expect(source).toContain(
      'const MOBILE_ACCESS_TOKEN_KEY = "salary-hijacking.mobile.access-token"',
    );
    expect(source).toContain("function getSecureStoreRuntime()");
    expect(source).toMatch(
      /loadModule\(\s*"\.\.\/src\/shared\/storage\/secure-store",?\s*\)/u,
    );
  });

  it("bounds root bootstrap network waits before resolving the public login destination", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("ROOT_BOOTSTRAP_REQUEST_TIMEOUT_MS = 1200");
    expect(source).toContain("fetchWithTimeout");
    expect(source).toContain("AbortController");
    expect(source).toContain("Promise.race");
    expect(source).toContain("ROOT_BOOTSTRAP_REQUEST_TIMEOUT");
    expect(source).toContain("clearTimeout(timer)");
    expect(source).toContain(
      "const cachedStatus = offlineStatusFromCachedSession(cached, isPublic)",
    );
    expect(source).toContain("status: cachedStatus");
    expect(source).toContain("router.replace(AUTH_LOGIN_ROUTE as never)");
  });

  it("resolves clean unauthenticated launches without waiting for bootstrap networking", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("async function hasStoredAccessToken()");
    expect(source).toContain(
      "const hasAccessToken = await hasStoredAccessToken()",
    );
    expect(source).toContain("if (!hasAccessToken)");
    expect(source).toContain(
      'void persistSessionStatus(fallbackSession, "AUTH_REQUIRED")',
    );
    expect(source).toContain('status: "AUTH_REQUIRED"');
    expect(source.indexOf("if (!hasAccessToken)")).toBeLessThan(
      source.indexOf(
        'requestJsonWithAuthRefresh<RootResponse>(\n        "/api/v1/mobile/bootstrap"',
      ),
    );
    expect(source).toMatch(
      /const token = await getSecureStoreRuntime\(\)\.getItemAsync\(\s*MOBILE_ACCESS_TOKEN_KEY,?\s*\)/u,
    );
    expect(source).toContain("return Boolean(token?.trim())");
    expect(source).toMatch(/catch\s*\{\s*return true;\s*\}/u);
  });

  it("does not let launcher home restoration wait indefinitely on deep-link probing", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("ROOT_DEEP_LINK_RESOLUTION_TIMEOUT_MS = 250");
    expect(source).toContain("resolveInitialRootDeepLinkRoute");
    expect(source).toContain("Promise.race");
    expect(source).toContain("ROOT_DEEP_LINK_RESOLUTION_TIMEOUT");
    expect(source).toContain("clearTimeout(timer)");
    expect(source).toContain(
      'if (routeKey === "root" && initialDeepLinkRoute === "PENDING") return true',
    );
    expect(source.indexOf('initialDeepLinkRoute === "PENDING"')).toBeLessThan(
      source.indexOf("initialDeepLinkRoute === null"),
    );
  });

  it("does not render root Home from a cached authenticated session before bootstrap verification", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("ROOT_CACHED_SESSION_LAUNCH_MIN_TTL_MS");
    expect(source).toMatch(
      /const cachedSession = hasAccessToken\s*\?\s*await readCachedSessionStatus\(\)\s*:\s*fallbackSession/u,
    );
    expect(source).toContain(
      "canUseCachedAuthenticatedLaunch(cachedSession, currentRouteKey)",
    );
    expect(source).toContain(
      "payload: cachedAuthenticatedPayload(cachedSession)",
    );
    expect(source).toContain('status: "READY"');
    expect(source).toContain("retrying: true");
    expect(source.indexOf("canUseCachedAuthenticatedLaunch")).toBeLessThan(
      source.indexOf(
        'requestJsonWithAuthRefresh<RootResponse>(\n        "/api/v1/mobile/bootstrap"',
      ),
    );
    expect(source).not.toContain('if (routeKey === "root") return true');
    expect(source).toContain("return isAuthenticatedAuthRoute(routeKey)");
    expect(source).toContain("sessionExpiresAt: session.sessionExpiresAt");
  });

  it("uses a non-sensitive launch session hint before touching SecureStore on root startup", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("ROOT_PUBLIC_SESSION_HINT_KEY");
    expect(source).toContain("readPublicSessionHint");
    expect(source).toContain("persistPublicSessionHint");
    expect(source).toContain("removePublicSessionHint");
    expect(source).toContain("loadAsyncStorageRuntime");
    expect(source).toContain('case "@react-native-async-storage/async-storage"');
    expect(
      source.indexOf("const publicSessionHint = await readPublicSessionHint()"),
    ).toBeLessThan(
      source.indexOf("const hasAccessToken = await hasStoredAccessToken()"),
    );
    expect(source).toContain("publicSessionHint.authenticated === false");
    expect(source).toContain('status: "AUTH_REQUIRED"');
    expect(source).not.toContain("userIdHash: publicSessionHint.userIdHash");
  });

  it("publishes login readiness to the root auth gate without screen-local home navigation", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const authNavigation = readFileSync(
      join(process.cwd(), "src", "features", "auth", "navigation.ts"),
      "utf8",
    );

    expect(authNavigation).toContain("snapshotFromAuthenticatedUser");
    expect(authNavigation).toContain("session: snapshotFromAuthenticatedUser");
    expect(authNavigation).toContain("response.data.expiresAt");
    expect(authNavigation).toContain("sessionExpiresAt: expiresAt");
    expect(rootLayout).toContain("applyAuthSessionChange");
    expect(rootLayout).toContain("event.session");
    expect(rootLayout).toContain("persistPublicSessionHint(session)");
    expect(rootLayout).not.toContain("router.replace(event.targetRoute as never)");
  });

  it("applies authenticated login readiness immediately before background bootstrap verification", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const listenerIndex = rootLayout.indexOf("subscribeAuthSessionChange((event) => {");
    const immediateStateIndex = rootLayout.indexOf(
      "applyAuthenticatedSessionChange(event)",
      listenerIndex,
    );
    const bootstrapIndex = rootLayout.indexOf(
      "finally(() => bootstrap())",
      listenerIndex,
    );

    expect(listenerIndex).toBeGreaterThanOrEqual(0);
    expect(immediateStateIndex).toBeGreaterThan(listenerIndex);
    expect(bootstrapIndex).toBeGreaterThan(immediateStateIndex);
    expect(rootLayout).toContain("resolveStatusForSession(session)");
    expect(rootLayout).toContain("payload: cachedAuthenticatedPayload(session)");
  });

  it("waits for auth-session persistence before re-running bootstrap verification", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const listenerIndex = rootLayout.indexOf("subscribeAuthSessionChange((event) => {");
    const persistThenBootstrapIndex = rootLayout.indexOf(
      "void applyAuthSessionChange(event).finally(() => bootstrap())",
      listenerIndex,
    );
    const oldRaceIndex = rootLayout.indexOf(
      "applyAuthSessionChange(event);\n        void bootstrap();",
      listenerIndex,
    );

    expect(listenerIndex).toBeGreaterThanOrEqual(0);
    expect(persistThenBootstrapIndex).toBeGreaterThan(listenerIndex);
    expect(oldRaceIndex).toBe(-1);
  });

  it("limits cached authenticated launch to verified auth recovery routes", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const launchFunctionStart = source.indexOf(
      "function canUseCachedAuthenticatedLaunch(",
    );
    const launchFunctionEnd = source.indexOf(
      "function isFreshCompleteSession(",
      launchFunctionStart,
    );
    const launchFunction = source.slice(launchFunctionStart, launchFunctionEnd);

    expect(launchFunctionStart).toBeGreaterThanOrEqual(0);
    expect(launchFunctionEnd).toBeGreaterThan(launchFunctionStart);
    expect(launchFunction).toContain("isFreshCompleteSession(session)");
    expect(launchFunction).not.toContain('routeKey === "root"');
    expect(launchFunction).toContain("isAuthenticatedAuthRoute(routeKey)");
    expect(source).toContain("isFreshCompleteSession(session)");
    expect(source).toContain("isAuthenticatedAuthRoute(routeKey)");
    expect(source).toContain("Date.parse(session.sessionExpiresAt)");
    expect(source).toContain(
      "expiresAt - Date.now() >= ROOT_CACHED_SESSION_LAUNCH_MIN_TTL_MS",
    );
    expect(source).toContain("if (session.mfaRequired) return false");
    expect(source).toContain("if (!session.emailVerified) return false");
    expect(source).toContain("if (!session.onboardingCompleted) return false");
  });

  it("keeps root bootstrap runtime fallback on staging instead of development", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("const fallbackConfig: AppConfigSnapshot");
    expect(source).toContain('environment: "staging"');
    expect(source).not.toContain('environment: "development",');
    expect(source).toMatch(/config\.environment,\s*"staging",\s*\)/u);
  });

  it("keeps root layout Korean user-facing strings readable", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const mojibakeMarkers = [
      0xfffd, 0x6e72, 0x6028, 0x91ab, 0xafa9, 0xca0c, 0x5a9b, 0xf9e4, 0x936e,
      0x7652, 0x6fe1, 0xb301, 0xc10f, 0xbc40, 0x7570,
    ].map((codePoint) => String.fromCodePoint(codePoint));

    mojibakeMarkers.forEach((marker) => {
      expect(source).not.toContain(marker);
    });
    expect(source).toContain("급여납치 앱을 준비하고 있어요");
    expect(source).toContain("앱을 준비하고 있어요");
    expect(source).toContain("앱 시작 요청이 실패했습니다");
    expect(source).not.toContain("서버 권위 앱 상태 확인 중");
    expect(source).not.toContain("서버 권위 설정");
    expect(source).not.toContain("개인정보 보호 경계를 확인");
    expect(source).not.toContain("앱 상태를 확인하고 있어요");
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
      "await getSecureStoreRuntime().deleteItemAsync(MOBILE_ACCESS_TOKEN_KEY)",
    );
    expect(source).toContain(
      "await getSecureStoreRuntime().deleteItemAsync(SECURE_SESSION_KEY)",
    );
    expect(source).toContain('status: "AUTH_REQUIRED"');
    expect(source).toContain("router.replace(AUTH_LOGIN_ROUTE as never)");
    expect(source).toContain("error instanceof RootAuthExpiredError");
    expect(source).not.toContain(
      'const cachedStatus = cached.authenticated ? "OFFLINE" : "AUTH_REQUIRED"',
    );
  });

  it("keeps unauthenticated public auth routes out of READY state", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain(
      'if (!payload.session.authenticated) return "AUTH_REQUIRED"',
    );
    expect(source).toContain(
      'if (!session.authenticated) return "AUTH_REQUIRED"',
    );
    expect(source).toContain('status: "AUTH_REQUIRED"');
    expect(
      source.indexOf('if (!session.authenticated) return "AUTH_REQUIRED"'),
    ).toBeLessThan(source.indexOf('if (isPublic) return "READY"'));
    expect(source).not.toContain('return isPublic ? "READY" : "AUTH_REQUIRED"');
    expect(source).not.toContain(
      'status: isPublic ? "READY" : "AUTH_REQUIRED"',
    );
  });

  it("keeps the root bootstrap gate copy user-facing while tied to authenticated status checks", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("renderGate");
    expect(source).toContain("/api/v1/mobile/bootstrap");
    expect(source).toContain("/api/v1/mobile/bootstrap");
    expect(source).toContain("앱을 준비하고 있어요");
    expect(source).toContain("급여납치 앱을 준비하고 있어요.");
    expect(source).not.toContain("개인정보 보호 경계");
    expect(source).not.toContain("환경 검사");
    expect(source).not.toContain("토큰 검증");
    expect(source).not.toContain("DB 검사");
    expect(source).not.toMatch(MOJIBAKE_PATTERN);
  });

  it("does not expose server-authority implementation language in production UI copy", () => {
    const files = [
      ...collectProductionUiSourceFiles(APP_ROOT),
      ...collectProductionUiSourceFiles(join(SRC_ROOT, "features")),
    ];
    const violations = files.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return [
        "서버 권위",
        "server authority",
        "app state validation",
        "privacy boundary validation",
        "environment validation",
        "bootstrap diagnostics",
      ]
        .filter((marker) => source.includes(marker))
        .map((marker) => `${relative(process.cwd(), path)} exposes ${marker}`);
    });

    expect(violations).toEqual([]);
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
    expect(source).toContain('if (!session.payrollReady) return "ONBOARDING"');
    expect(source).toContain('return "OFFLINE"');
    expect(source).not.toContain(
      'const cachedStatus = cached.authenticated ? "OFFLINE" : "AUTH_REQUIRED"',
    );
  });

  it("keeps payroll setup readiness in the root auth gate before salary home", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("payrollReady: boolean");
    expect(source).toContain("payrollReady: Boolean(session.payrollReady)");
    expect(source).toContain(
      'if (!payload.session.payrollReady) return "ONBOARDING"',
    );
    expect(source).toContain("if (!session.payrollReady) return false");
    expect(source).toContain("payrollReady: session.payrollReady");
  });

  it("keeps launch routing subordinate to the root auth gate so login and home do not compete", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const indexScreen = readFileSync(INDEX_SCREEN, "utf8");

    expect(rootLayout).toContain("shouldRouteAuthenticatedStateToHome");
    expect(rootLayout).toContain("isAuthenticatedAuthRoute(routeKey)");
    expect(rootLayout).toContain(
      'routeKey === "root" && initialDeepLinkRoute === null',
    );
    expect(rootLayout).toContain("resolveInitialRootDeepLinkRoute");
    expect(rootLayout).toContain("ROOT_DEEP_LINK_ROUTES");
    expect(rootLayout).not.toContain(
      'return routeKey === "root" || isAuthenticatedAuthRoute(routeKey)',
    );
    expect(indexScreen).toContain("root auth gate owns launch routing");
    expect(indexScreen).not.toContain("resolveInitialLaunchTarget");
    expect(indexScreen).not.toContain("resolveInitialDeepLinkRoute");
    expect(indexScreen).not.toContain("MOBILE_ACCESS_TOKEN_KEY");
    expect(indexScreen).not.toContain("resolveInitialRoute");
    expect(indexScreen).not.toContain("router.replace");
  });

  it("routes cached offline authenticated root sessions away from the launch splash", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(rootLayout).toContain("shouldRouteAuthenticatedStateToHome");
    expect(rootLayout).toMatch(
      /if\s*\(\s*\(\s*next === "READY"\s*\|\|\s*next === "OFFLINE"\s*\)\s*&&\s*shouldRouteAuthenticatedStateToHome\(currentRouteKey,\s*initialDeepLinkRoute\)\s*\)/u,
    );
    expect(rootLayout).toContain(
      'if (routeKey === "root" && initialDeepLinkRoute === null) return true',
    );
    expect(rootLayout).toContain("router.replace(SALARY_HOME_ROUTE as never)");
    expect(rootLayout.indexOf('next === "OFFLINE"')).toBeLessThan(
      rootLayout.indexOf("renderGate(state.status, state.retrying, bootstrap)"),
    );
  });

  it("keeps pending root auth redirects off the launch Slot and duplicated chrome path", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(rootLayout).toContain("const isRouteTransitionPending =");
    expect(rootLayout).toContain("shouldRouteAuthenticatedStateToHome");
    expect(rootLayout).toContain(
      'state.status === "AUTH_REQUIRED" && !isPublic',
    );
    expect(rootLayout).toMatch(
      /state\.status === "VERIFY_EMAIL" &&\s*currentRouteKey !== "\(auth\)\/verify-email"/u,
    );
    expect(rootLayout).toMatch(
      /state\.status === "ONBOARDING" && currentRouteKey !== "onboarding"/u,
    );
    expect(rootLayout).toMatch(
      /shouldRenderSlot\s*=\s*[\s\S]*!isRouteTransitionPending/u,
    );
    expect(rootLayout).toContain('state.status !== "BOOTSTRAPPING"');
  });

  it("does not combine Expo Router href with custom tabBarButton in production tabs", () => {
    const tabsLayout = readFileSync(TABS_LAYOUT_SCREEN, "utf8");

    expect(tabsLayout).toContain("tabBarButton: renderMeasuredTabBarButton");
    expect(tabsLayout).not.toContain("href: tab.href as never");
    expect(tabsLayout).not.toMatch(/href:\s*[^,\n]+/u);
  });

  it("preserves screenshot capture routes before Expo Router rewrites them", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const indexScreen = readFileSync(INDEX_SCREEN, "utf8");
    const capturePreviewScreen = readFileSync(CAPTURE_PREVIEW_SCREEN, "utf8");
    const captureRouteScreen = readFileSync(CAPTURE_ROUTE_SCREEN, "utf8");
    const captureWebRouteScreen = readFileSync(
      CAPTURE_WEB_ROUTE_SCREEN,
      "utf8",
    );

    expect(rootLayout).toContain("INITIAL_CAPTURE_SCREEN_KIND");
    expect(rootLayout).toContain("readInitialCaptureScreenKind");
    expect(rootLayout).not.toContain(
      'import { CapturePreviewScreen } from "../src/features/capture"',
    );
    expect(rootLayout).toContain("loadCapturePreviewScreen");
    expect(indexScreen).not.toContain(
      'from "../src/features/capture/stitch-state-registry"',
    );
    expect(indexScreen).not.toContain("const captureScreens");
    expect(indexScreen).not.toContain("resolveCaptureScreenKindLazily");
    expect(capturePreviewScreen).toContain("resolveCapturePreviewKind");
    expect(captureRouteScreen).not.toContain("resolveCaptureKindForStitchSlug");
    expect(captureRouteScreen).not.toContain("CapturePreviewScreen");
    expect(captureWebRouteScreen).toContain("resolveCapturePreviewKindLazily");
    expect(captureWebRouteScreen).toContain("loadCapturePreviewScreen");
    expect(captureWebRouteScreen).toContain(
      "../../src/features/capture/root-preview",
    );
    expect(captureWebRouteScreen).not.toContain(
      'require("../../src/features/capture")',
    );
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
    expect(rootLayout).toContain("../src/features/capture/root-preview");
    expect(rootLayout).not.toContain('require("../src/features/capture")');
    expect(indexScreen).not.toContain("resolveCaptureScreenKindForUrl");
    expect(indexScreen).not.toContain("loadCapturePreviewScreen");
    expect(indexScreen).not.toContain("LaunchTransitionScreen");
    expect(indexScreen).not.toContain("readBrowserLocation");
    expect(indexScreen).toContain("no index capture preview runtime");
    expect(rootLayout).toContain("readBrowserLocation");
    expect(rootLayout).toContain(
      "return resolveCaptureScreenKindForUrl(location.href)",
    );
    expect(rootLayout).not.toContain("CAPTURE_SCREENS");
    expect(rootLayout).not.toContain("salary-no-plan");
    expect(rootLayout).not.toContain("profile-withdrawal-requested");

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
    for (const expenseCapture of [
      "expense-form-edit",
      "expense-form-refund",
      "expense-form-validation",
      "expense-delete-blocked",
      "expense-invalidate-reason",
    ]) {
      expect(rootLayout).not.toContain(`"${expenseCapture}"`);
      expect(capturePreviewScreen).toContain(`"${expenseCapture}"`);
      expect(screenshotScript).toContain(`/capture/${expenseCapture}`);
    }
  });

  it("keeps screenshot capture routes web-only so native production cannot show preview screens", () => {
    const source = readFileSync(CAPTURE_ROUTE_SCREEN, "utf8");
    const webSource = readFileSync(CAPTURE_WEB_ROUTE_SCREEN, "utf8");

    expect(source).toContain('<Redirect href="/salary" />');
    expect(source).not.toContain('import { Platform } from "react-native"');
    expect(source).not.toContain("CapturePreviewScreen");
    expect(source).not.toContain("captureScreens");
    expect(webSource).toContain("resolveCapturePreviewKindLazily");
    expect(webSource).toContain("loadCapturePreviewScreen");
    expect(webSource).not.toContain("captureScreens");
    expect(webSource).not.toContain('from "../../src/features/capture"');
  });

  it("keeps root capture preview rendering behind a web platform guard and index production-only", () => {
    const rootLayout = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");
    const indexScreen = readFileSync(INDEX_SCREEN, "utf8");

    expect(rootLayout).toContain('NativeRuntimeRef.Platform.OS !== "web"');
    expect(rootLayout).toMatch(
      /function readBrowserLocation\(\):[\s\S]*?NativeRuntimeRef\.Platform\.OS !== "web"[\s\S]*?window\.location/u,
    );
    expect(indexScreen).not.toContain("Platform");
    expect(indexScreen).not.toContain("window.location");
    expect(indexScreen).toContain("root auth gate owns launch routing");
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

  it("keeps the launch route as a thin root auth gate entry", () => {
    const source = readFileSync(INDEX_SCREEN, "utf8");

    expect(source).toContain("root auth gate owns launch routing");
    expect(source).not.toContain("hideNativeSplashSafely");
    expect(source).not.toContain(
      'import * as SplashScreen from "expo-splash-screen"',
    );
    expect(source).not.toContain(
      'import { SplashLaunchScreen } from "../src/features/auth/components"',
    );
    expect(source).not.toContain("SPLASH_ROUTE_DELAY_MS");
    expect(source).not.toContain("resolveInitialDeepLinkRoute");
    expect(source).not.toContain("normalizeInitialDeepLinkRoute");
    expect(source).not.toContain('addEventListener?.("url"');
    expect(source).not.toContain("linking.getInitialURL?.()");
    expect(source).not.toContain("linking.parseInitialURLAsync?.()");
    expect(source).not.toContain('require("expo-linking")');
    expect(source).not.toContain('import * as Linking from "expo-linking"');
    expect(source).not.toContain("parsedToHref");
    expect(source).not.toContain("pathname || SALARY_HOME_ROUTE");
    expect(source).not.toContain("router.replace");
    expect(source).not.toContain("setTimeout(() =>");
    expect(source).not.toContain("LaunchTransitionScreen");
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

    expect(source).not.toContain(
      "const SplashScreenRuntimeRef = loadSplashScreenRuntime()",
    );
    expect(source).not.toContain(
      "void SplashScreenRuntimeRef.preventAutoHideAsync()",
    );
    expect(source).toContain(
      'if (NativeRuntimeRef.Platform.OS === "web") return',
    );
    expect(source).toMatch(/getSplashScreenRuntime\(\)\s*\.\s*hideAsync\(\)/u);
    expect(source).toContain("fontsLoaded");
    expect(source).toContain("FONTS_EMBEDDED_IN_NATIVE");
    expect(source).toContain("function loadRootFontAssets()");
    expect(source).toContain("../src/shared/styles/root-font-assets");
    expect(source).not.toContain("function loadOfficialBiLogo()");
    expect(source).toContain("function loadRootAppHeader()");
    expect(source).toMatch(
      /FontRuntimeRef\.useFonts\(\s*FONTS_EMBEDDED_IN_NATIVE \? EMPTY_FONT_ASSETS : loadRootFontAssets\(\),?\s*\)/u,
    );
    expect(source).not.toContain("const FONT_ASSETS");
    expect(source).not.toContain(
      'import { appImageAssets } from "../src/shared/assets/images";',
    );
    expect(source).not.toContain(
      'import { AppHeader } from "../src/shared/components/AppHeader";',
    );
    expect(source).not.toContain("const OFFICIAL_BI_LOGO");
    expect(source).toContain(
      "const fontsReady = FONTS_EMBEDDED_IN_NATIVE || fontsLoaded",
    );
    expect(source).not.toContain("if (!fontsLoaded && !fontLoadTimedOut)");
    expect(source).toContain("SPLASH_FORCE_HIDE_FALLBACK_MS = 250");
    expect(source).toContain("hideNativeSplashSafely");
    expect(source).toContain("onLayout: hideNativeSplashSafely");
    expect(source).toMatch(/setTimeout\(\s*hideNativeSplashSafely/);
  });

  it("keeps the root bootstrap surface independent from large brand image assets", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).not.toContain("salary-hijacking-platform-logo.png");
    expect(source).not.toContain("loadOfficialBiLogo");
    expect(source).toContain("renderLightweightLaunchTransition");
    expect(source).toContain("lightweightTransitionBrandMark");
  });

  it("keeps root render failures on a safe retry screen instead of a blank app", () => {
    const source = readFileSync(ROOT_LAYOUT_SCREEN, "utf8");

    expect(source).toContain("export function ErrorBoundary");
    expect(source).toContain("hideNativeSplashSafely()");
    expect(source).toContain("이 화면을 다시 준비하고 있어요.");
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
    expect(onboarding).toContain("급여 계획을 안전하게 저장해요.");
    expect(onboarding).toContain("금융 원문은 광고나 분석에 쓰지 않아요.");
    expect(onboarding).not.toContain("serverAuthority=true");
    expect(onboarding).not.toContain("rawFinancialData=false");
  });

  it("keeps onboarding on the canonical native shell and design tokens", () => {
    const onboarding = readFileSync(ONBOARDING_SCREEN, "utf8");

    expect(onboarding).toContain("AppShell");
    expect(onboarding).toContain("AppHeader");
    expect(onboarding).toContain("PrimaryButton");
    expect(onboarding).toContain("SurfaceCard");
    expect(onboarding).toContain("salaryHijackingDesignSystem");
    expect(onboarding).not.toMatch(/#[0-9A-Fa-f]{6,8}\b/u);
    expect(onboarding).not.toMatch(
      /\b(fontSize|lineHeight|gap|padding|paddingHorizontal|paddingVertical|borderRadius|elevation):\s*\d+/,
    );
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
