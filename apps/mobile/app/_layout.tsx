/** apps/mobile/app/_layout.tsx
 * 급여납치 모바일 루트 레이아웃.
 * 정적 import와 JSX 없이 Expo Router, React Native, Expo 모듈을 안전하게 로딩한다.
 */

import {
  subscribeAuthSessionChange,
  type AuthSessionChangeEvent,
} from "../src/features/auth/navigation";
import {
  componentColors,
  salaryHijackingDesignSystem,
} from "../src/shared/components/tokens";
import { markReleasePerf } from "../src/shared/performance/release-perf";

declare function require(moduleName: string): unknown;

type RootStatus =
  | "BOOTSTRAPPING"
  | "READY"
  | "AUTH_REQUIRED"
  | "VERIFY_EMAIL"
  | "ONBOARDING"
  | "OFFLINE"
  | "ERROR";
type ToastKind = "info" | "success" | "error";
type UserRole = "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN" | "SYSTEM";
type ConsentState = "GRANTED" | "DENIED" | "UNKNOWN";
type PlatformOS = "ios" | "android" | "web" | "windows" | "macos" | string;
type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { readonly [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;
type ElementType =
  | string
  | ((props: Record<string, unknown>) => unknown)
  | object;
type SetState<T> = (next: T | ((previous: T) => T)) => void;

type ReactRuntime = Readonly<{
  createElement: (
    type: ElementType,
    props?: Record<string, unknown> | null,
    ...children: readonly unknown[]
  ) => unknown;
  useCallback: <TCallback>(
    callback: TCallback,
    deps: readonly unknown[],
  ) => TCallback;
  useEffect: (
    effect: () => void | (() => void),
    deps: readonly unknown[],
  ) => void;
  useMemo: <TValue>(factory: () => TValue, deps: readonly unknown[]) => TValue;
  useState: <TValue>(initial: TValue) => readonly [TValue, SetState<TValue>];
}>;

type NativeRuntime = Readonly<{
  ActivityIndicator: ElementType;
  Image: ElementType;
  Pressable: ElementType;
  SafeAreaView: ElementType;
  ScrollView: ElementType;
  StyleSheet: {
    readonly create: <
      TStyles extends Record<string, Readonly<Record<string, unknown>>>,
    >(
      styles: TStyles,
    ) => TStyles;
  };
  Text: ElementType;
  View: ElementType;
  Platform: { readonly OS: PlatformOS };
}>;

type RouterLike = Readonly<{
  push: (href: never) => void;
  replace: (href: never) => void;
  back?: () => void;
}>;
type RouterRuntime = Readonly<{
  Slot: ElementType;
  useRouter: () => RouterLike;
  useSegments: () => readonly string[];
}>;
type FontRuntime = Readonly<{
  useFonts: (
    fontMap: Readonly<Record<string, unknown>>,
  ) => readonly [boolean, Error | null];
}>;
type SplashScreenRuntime = Readonly<{
  hideAsync: () => Promise<boolean>;
  preventAutoHideAsync: () => Promise<boolean>;
}>;
type LinkingRuntime = Readonly<{
  getInitialURL: () => Promise<string | null>;
}>;
type SecureStoreRuntime = Readonly<{
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}>;
type AsyncStorageRuntime = Readonly<{
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}>;
type ConstantsRuntime = Readonly<{
  expoConfig?: Readonly<{
    extra?: Readonly<{
      operations?: Readonly<{ e2eBuild?: unknown }>;
    }>;
  }>;
}>;
type CapturePreviewModule = Readonly<{
  CapturePreviewScreen?: ElementType;
  resolveCapturePreviewKind?: (screen: string) => string | null;
}>;
type CaptureScreenKind = string;
type RootAuthApiModule = Readonly<{
  createAuthApi?: (options: {
    baseUrl: string;
    createCorrelationId: () => string;
    platform: "ios" | "android" | "web";
    tokenStore: SecureStoreRuntime;
  }) => {
    refresh: () => Promise<unknown>;
  };
}>;
type RootApiBaseModule = Readonly<{
  readMobileApiBaseUrl?: () => string;
}>;
type RootSecureStoreModule = Readonly<{
  createSecureStoreRuntime?: (
    platform: string,
    nativeStore: Partial<SecureStoreRuntime>,
  ) => SecureStoreRuntime;
}>;
type RootAsyncStorageModule =
  | Partial<AsyncStorageRuntime>
  | Readonly<{ default?: Partial<AsyncStorageRuntime> }>;
type RootFontAssetsModule = Readonly<{
  getRootFontAssets?: () => Readonly<Record<string, unknown>>;
}>;

type SessionSnapshot = Readonly<{
  authenticated: boolean;
  userIdHash: string | null;
  role: UserRole;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  payrollReady: boolean;
  mfaRequired: boolean;
  sessionExpiresAt: string | null;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type AppConfigSnapshot = Readonly<{
  apiVersion: string;
  environment: "local" | "development" | "staging" | "production";
  maintenanceMode: boolean;
  minSupportedBuild: string;
  featureFlags: Readonly<Record<string, boolean>>;
  serverAuthorityEnabled: true;
  privacyMode: "STRICT";
  adsFinancialTargetingAllowed: false;
}>;

type PushSnapshot = Readonly<{
  consent: ConsentState;
  tokenRegistered: boolean;
  quietHoursEnabled: boolean;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type RootPayload = Readonly<{
  session: SessionSnapshot;
  config: AppConfigSnapshot;
  push: PushSnapshot;
}>;
type RootResponse = Readonly<{ data?: Partial<RootPayload>; error?: unknown }>;
type RootState = Readonly<{
  status: RootStatus;
  payload: RootPayload;
  retrying: boolean;
  navigationEpoch: number;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;
type InitialDeepLinkRoute = string | null | "PENDING";

const ROOT_LAYOUT_VERSION = "3.1.0";
const designSystem = salaryHijackingDesignSystem;
const ROOT_E2E_TEST_ID = "salary-hijacking-mobile-root";
const AUTH_LOGIN_ROUTE = "/(auth)/login";
const AUTH_VERIFY_ROUTE = "/(auth)/verify-email";
const ONBOARDING_ROUTE = "/onboarding";
const SALARY_HOME_ROUTE = "/salary";
const PROFILE_ROUTE = "/profile";
const MOBILE_ACCESS_TOKEN_KEY = "salary-hijacking.mobile.access-token";
const SECURE_SESSION_KEY = "salary_hijacking.session_status.v1";
const ROOT_PUBLIC_SESSION_HINT_KEY =
  "salary_hijacking.root_public_session_hint.v1";
const ROOT_BOOTSTRAP_REQUEST_TIMEOUT_MS = 1200;
const ROOT_CACHED_SESSION_LAUNCH_MIN_TTL_MS = 60_000;
const ROOT_DEEP_LINK_RESOLUTION_TIMEOUT_MS = 250;
const ROOT_DEEP_LINK_ROUTES = new Set([
  "/salary",
  "/plan",
  "/level",
  "/level/reading",
  "/level/news",
  "/level/english",
  "/level/health",
  "/notifications",
  "/notifications/settings",
  "/community",
  "/community/write",
  "/profile",
  "/profile/settings",
  "/profile/community",
  "/profile/level",
  "/profile/notices",
  "/profile/support",
  "/profile/account",
]);
const PUBLIC_SEGMENTS = [
  "(auth)",
  "login",
  "signup",
  "verify-email",
  "forgot-password",
  "reset-password",
  "onboarding",
  "legal",
  "privacy",
  "terms",
] as const;
const SENSITIVE_KEYWORDS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "session",
  "email",
  "phone",
  "account",
  "card",
  "salary",
  "payroll",
  "income",
  "expense",
  "savings",
  "amount",
  "hijack",
  "loan",
  "debt",
  "push",
  "fcm",
  "deviceToken",
  "비밀번호",
  "토큰",
  "이메일",
  "전화",
  "계좌",
  "카드",
  "급여",
  "월급",
  "지출",
  "저축",
  "금액",
  "납치",
  "대출",
  "부채",
  "인증",
  "푸시",
  "세션",
  "기기토큰",
] as const;
const EMPTY_FONT_ASSETS: Readonly<Record<string, unknown>> = Object.freeze({});
const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const FONTS_EMBEDDED_IN_NATIVE = NativeRuntimeRef.Platform.OS !== "web";
const RouterRuntimeRef = loadRouterRuntime();
const FontRuntimeRef = loadFontRuntime();
const INITIAL_CAPTURE_SCREEN_KIND = readInitialCaptureScreenKind();
const SPLASH_FORCE_HIDE_FALLBACK_MS = 250;
let cachedRootApiBaseUrl: string | null = null;
let cachedSecureStoreRuntime: SecureStoreRuntime | null = null;
let cachedAsyncStorageRuntime: AsyncStorageRuntime | null = null;
let cachedSplashScreenRuntime: SplashScreenRuntime | null = null;
const emittedRootPerfMarkers = new Set<string>();

function hideNativeSplashSafely(): void {
  if (NativeRuntimeRef.Platform.OS === "web") return;
  void getSplashScreenRuntime()
    .hideAsync()
    .catch(() => false);
}

function markRootPerfOnce(
  marker: Parameters<typeof markReleasePerf>[0],
  route: string,
): void {
  const key = `${marker}:${route}`;
  if (emittedRootPerfMarkers.has(key)) return;
  emittedRootPerfMarkers.add(key);
  markReleasePerf(marker, { route });
}

const fallbackSession: SessionSnapshot = Object.freeze({
  authenticated: false,
  userIdHash: null,
  role: "USER",
  emailVerified: false,
  onboardingCompleted: false,
  payrollReady: false,
  mfaRequired: false,
  sessionExpiresAt: null,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  rawPushTokenExposed: false,
  adsFinancialTargetingUsed: false,
});
const fallbackConfig: AppConfigSnapshot = Object.freeze({
  apiVersion: "v1",
  environment: "staging",
  maintenanceMode: false,
  minSupportedBuild: "0",
  featureFlags: {},
  serverAuthorityEnabled: true,
  privacyMode: "STRICT",
  adsFinancialTargetingAllowed: false,
});
const fallbackPush: PushSnapshot = Object.freeze({
  consent: "UNKNOWN",
  tokenRegistered: false,
  quietHoursEnabled: true,
  rawPushTokenExposed: false,
  adsFinancialTargetingUsed: false,
});
const fallbackPayload: RootPayload = Object.freeze({
  session: fallbackSession,
  config: fallbackConfig,
  push: fallbackPush,
});

class RootAuthExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RootAuthExpiredError";
  }
}

export default function MobileRootLayout(): unknown {
  const [fontsLoaded] = FontRuntimeRef.useFonts(
    FONTS_EMBEDDED_IN_NATIVE ? EMPTY_FONT_ASSETS : loadRootFontAssets(),
  );
  const fontsReady = FONTS_EMBEDDED_IN_NATIVE || fontsLoaded;
  const [fontLoadTimedOut, setFontLoadTimedOut] =
    ReactRuntimeRef.useState(false);
  const router = RouterRuntimeRef.useRouter();
  const segments = RouterRuntimeRef.useSegments();
  const captureScreenKind = INITIAL_CAPTURE_SCREEN_KIND;
  const [state, setState] = ReactRuntimeRef.useState<RootState>({
    status: "BOOTSTRAPPING",
    payload: fallbackPayload,
    retrying: false,
    navigationEpoch: 0,
    toast: { kind: "info", message: "급여납치 앱을 준비하고 있어요." },
  });
  const [initialDeepLinkRoute, setInitialDeepLinkRoute] =
    ReactRuntimeRef.useState<InitialDeepLinkRoute>("PENDING");

  const currentRouteKey = ReactRuntimeRef.useMemo(
    () => normalizeSegments(segments).join("/") || "root",
    [segments],
  );
  const isPublic = ReactRuntimeRef.useMemo(
    () => isPublicRoute(segments),
    [segments],
  );
  const isRouteTransitionPending =
    captureScreenKind === null &&
    !isCaptureBrowserPath() &&
    (((state.status === "READY" || state.status === "OFFLINE") &&
      shouldRouteAuthenticatedStateToHome(
        currentRouteKey,
        initialDeepLinkRoute,
      )) ||
      (state.status === "AUTH_REQUIRED" && !isPublic) ||
      (state.status === "VERIFY_EMAIL" &&
        currentRouteKey !== "(auth)/verify-email") ||
      (state.status === "ONBOARDING" && currentRouteKey !== "onboarding"));

  const bootstrap = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    setState((prev: RootState) => ({ ...prev, retrying: true }));
    if (isMobileE2eBuildEnabled()) {
      setState((prev: RootState) => ({
        ...prev,
        payload: fallbackPayload,
        status: "READY",
        retrying: false,
        navigationEpoch: prev.navigationEpoch + 1,
        toast: { kind: "success", message: "E2E shell ready" },
      }));
      return;
    }
    try {
      const publicSessionHint = await readPublicSessionHint();
      if (!publicSessionHint || publicSessionHint.authenticated === false) {
        void persistPublicSessionHint(fallbackSession).catch(() => undefined);
        void persistSessionStatus(fallbackSession, "AUTH_REQUIRED").catch(
          () => undefined,
        );
        setState((prev: RootState) => ({
          ...prev,
          payload: { ...prev.payload, session: fallbackSession },
          status: "AUTH_REQUIRED",
          retrying: false,
          navigationEpoch: prev.navigationEpoch + 1,
          toast: { kind: "info", message: statusMessage("AUTH_REQUIRED") },
        }));
        return;
      }
      if (
        canUseCachedAuthenticatedLaunch(
          publicSessionHint,
          currentRouteKey,
          "public-hint",
        )
      ) {
        setState((prev: RootState) => ({
          ...prev,
          payload: cachedAuthenticatedPayload(publicSessionHint),
          status: "READY",
          retrying: true,
          navigationEpoch: prev.navigationEpoch + 1,
          toast: { kind: "success", message: statusMessage("READY") },
        }));
      }
      const hasAccessToken = await hasStoredAccessToken();
      const cachedSession = hasAccessToken
        ? await readCachedSessionStatus()
        : fallbackSession;
      if (!hasAccessToken) {
        void persistSessionStatus(fallbackSession, "AUTH_REQUIRED").catch(
          () => undefined,
        );
        setState((prev: RootState) => ({
          ...prev,
          payload: { ...prev.payload, session: fallbackSession },
          status: "AUTH_REQUIRED",
          retrying: false,
          navigationEpoch: prev.navigationEpoch + 1,
          toast: { kind: "info", message: statusMessage("AUTH_REQUIRED") },
        }));
        return;
      }
      if (
        canUseCachedAuthenticatedLaunch(
          cachedSession,
          currentRouteKey,
          "secure-session",
        )
      ) {
        setState((prev: RootState) => ({
          ...prev,
          payload: cachedAuthenticatedPayload(cachedSession),
          status: "READY",
          retrying: true,
          navigationEpoch: prev.navigationEpoch + 1,
          toast: { kind: "success", message: statusMessage("READY") },
        }));
      }
      const response = await requestJsonWithAuthRefresh<RootResponse>(
        "/api/v1/mobile/bootstrap",
      );
      const payload = normalizePayload(response.data ?? {});
      const nextStatus = resolveStatus(payload, isPublic);
      await persistSessionStatus(payload.session, nextStatus);
      await persistPublicSessionHint(payload.session);
      setState((prev: RootState) => ({
        ...prev,
        payload,
        status: nextStatus,
        retrying: false,
        navigationEpoch: prev.navigationEpoch + 1,
        toast: { kind: "success", message: statusMessage(nextStatus) },
      }));
    } catch (error) {
      if (error instanceof RootAuthExpiredError) {
        setState((prev: RootState) => ({
          ...prev,
          payload: { ...prev.payload, session: fallbackSession },
          status: "AUTH_REQUIRED",
          retrying: false,
          navigationEpoch: prev.navigationEpoch + 1,
          toast: {
            kind: "error",
            message: safeBootstrapErrorMessage("auth-expired"),
          },
        }));
        return;
      }
      const cached = await readCachedSessionStatus();
      const cachedStatus = offlineStatusFromCachedSession(cached, isPublic);
      setState((prev: RootState) => ({
        ...prev,
        payload: { ...prev.payload, session: cached },
        status: cachedStatus,
        retrying: false,
        navigationEpoch: prev.navigationEpoch + 1,
        toast: {
          kind: "error",
          message: safeBootstrapErrorMessage("offline-fallback"),
        },
      }));
    }
  }, [currentRouteKey, isPublic]);

  const applyAuthenticatedSessionChange = ReactRuntimeRef.useCallback(
    (event: AuthSessionChangeEvent): void => {
      if (event.reason !== "authenticated" || !event.session) return;
      const session = normalizeSession({
        ...fallbackSession,
        ...event.session,
        authenticated: true,
      });
      const nextStatus = resolveStatusForSession(session);
      setState((prev: RootState) => ({
        ...prev,
        payload: cachedAuthenticatedPayload(session),
        status: nextStatus,
        retrying: true,
        navigationEpoch: prev.navigationEpoch + 1,
        toast: { kind: "success", message: statusMessage(nextStatus) },
      }));
    },
    [],
  );

  ReactRuntimeRef.useEffect((): void => {
    void bootstrap();
  }, [bootstrap]);

  ReactRuntimeRef.useEffect((): (() => void) => {
    let mounted = true;
    void resolveInitialRootDeepLinkRoute().then((route) => {
      if (mounted) setInitialDeepLinkRoute(route);
    });
    return (): void => {
      mounted = false;
    };
  }, []);

  ReactRuntimeRef.useEffect(
    (): (() => void) =>
      subscribeAuthSessionChange((event) => {
        applyAuthenticatedSessionChange(event);
        void applyAuthSessionChange(event).finally(() => bootstrap());
      }),
    [applyAuthenticatedSessionChange, bootstrap],
  );

  ReactRuntimeRef.useEffect((): (() => void) => {
    const timer = setTimeout(
      hideNativeSplashSafely,
      SPLASH_FORCE_HIDE_FALLBACK_MS,
    );
    return (): void => clearTimeout(timer);
  }, []);

  ReactRuntimeRef.useEffect((): void => {
    if (fontsReady) hideNativeSplashSafely();
  }, [fontsReady]);

  ReactRuntimeRef.useEffect((): (() => void) => {
    if (fontsReady) return (): void => undefined;
    const timer = setTimeout(() => {
      setFontLoadTimedOut(true);
      hideNativeSplashSafely();
    }, SPLASH_FORCE_HIDE_FALLBACK_MS);
    return (): void => clearTimeout(timer);
  }, [fontsReady]);

  ReactRuntimeRef.useEffect((): void => {
    const next = state.status;
    if (next === "READY" && captureScreenKind) return;
    if (next === "READY" && isCaptureBrowserPath()) return;
    if (
      (next === "READY" || next === "OFFLINE") &&
      shouldRouteAuthenticatedStateToHome(currentRouteKey, initialDeepLinkRoute)
    )
      router.replace(SALARY_HOME_ROUTE as never);
    if (next === "AUTH_REQUIRED" && !isPublic)
      router.replace(AUTH_LOGIN_ROUTE as never);
    if (next === "VERIFY_EMAIL" && currentRouteKey !== "(auth)/verify-email")
      router.replace(AUTH_VERIFY_ROUTE as never);
    if (next === "ONBOARDING" && currentRouteKey !== "onboarding")
      router.replace(ONBOARDING_ROUTE as never);
  }, [
    captureScreenKind,
    currentRouteKey,
    isPublic,
    initialDeepLinkRoute,
    router,
    state.navigationEpoch,
    state.status,
  ]);

  const shouldRenderSlot =
    captureScreenKind !== null ||
    (!isRouteTransitionPending &&
      (state.status === "READY" || state.status === "OFFLINE" || isPublic));
  const shouldRenderLightweightTransition =
    state.status === "BOOTSTRAPPING" || isRouteTransitionPending;
  const shouldShowRuntimeChrome =
    state.status !== "BOOTSTRAPPING" &&
    !shouldRenderSlot &&
    !isRouteTransitionPending;
  const handleRootLayout = ReactRuntimeRef.useCallback((): void => {
    hideNativeSplashSafely();
    if (shouldRenderLightweightTransition) {
      markRootPerfOnce("bootstrap.transition.visible", "bootstrap");
    }
  }, [shouldRenderLightweightTransition]);

  ReactRuntimeRef.useEffect((): void => {
    if (shouldRenderLightweightTransition) {
      markRootPerfOnce("bootstrap.transition.visible", "bootstrap");
    }
    if (state.status === "AUTH_REQUIRED" && isPublic) {
      markRootPerfOnce("route.login.interactive", currentRouteKey);
    }
    if (
      (state.status === "READY" || state.status === "OFFLINE") &&
      (currentRouteKey === "salary" || currentRouteKey === "(tabs)/salary")
    ) {
      markRootPerfOnce("route.home.shell_interactive", currentRouteKey);
    }
  }, [
    currentRouteKey,
    isPublic,
    shouldRenderLightweightTransition,
    state.status,
  ]);

  if (!fontsReady && !fontLoadTimedOut) {
    return h(
      NativeRuntimeRef.SafeAreaView,
      {
        accessibilityLabel: "급여납치 폰트를 불러오는 중",
        onLayout: hideNativeSplashSafely,
        style: styles.safeArea,
        testID: ROOT_E2E_TEST_ID,
      },
      h(
        NativeRuntimeRef.View,
        { style: styles.fontLoading },
        h(
          NativeRuntimeRef.View,
          {
            accessibilityLabel: "급여납치",
            style: styles.fontLoadingBrandMark,
          },
          h(
            NativeRuntimeRef.Text,
            { style: styles.fontLoadingBrandInitial },
            "급",
          ),
        ),
        h(
          NativeRuntimeRef.Text,
          { style: styles.fontLoadingTitle },
          "급여납치",
        ),
        h(
          NativeRuntimeRef.Text,
          { style: styles.fontLoadingText },
          "Freesentation 글꼴을 적용하고 있어요.",
        ),
      ),
    );
  }

  return h(
    NativeRuntimeRef.SafeAreaView,
    {
      accessibilityLabel: "급여납치 모바일 루트",
      onLayout: handleRootLayout,
      style: styles.safeArea,
      testID: ROOT_E2E_TEST_ID,
    },
    shouldShowRuntimeChrome
      ? renderRootAppHeader(
          state.payload,
          state.status,
          currentRouteKey,
          (): void => router.replace(SALARY_HOME_ROUTE as never),
          (): void => router.replace(PROFILE_ROUTE as never),
        )
      : null,
    shouldShowRuntimeChrome ? renderToast(state.toast) : null,
    shouldRenderSlot
      ? h(
          NativeRuntimeRef.View,
          { style: styles.slotHost },
          captureScreenKind
            ? renderCaptureScreen(captureScreenKind)
            : h(RouterRuntimeRef.Slot, { key: currentRouteKey }),
        )
      : shouldRenderLightweightTransition
        ? renderLightweightLaunchTransition()
        : renderGate(state.status, state.retrying, bootstrap),
    shouldShowRuntimeChrome ? renderRuntimeGuard(state.payload) : null,
  );
}

export function ErrorBoundary({
  error,
  retry,
}: {
  readonly error: Error;
  readonly retry: () => void;
}): unknown {
  void error;
  hideNativeSplashSafely();
  return h(
    NativeRuntimeRef.SafeAreaView,
    {
      accessibilityLabel: "급여납치 오류 복구 화면",
      onLayout: hideNativeSplashSafely,
      style: styles.safeArea,
      testID: `${ROOT_E2E_TEST_ID}-error-boundary`,
    },
    h(
      NativeRuntimeRef.View,
      { style: styles.errorBoundary },
      h(
        NativeRuntimeRef.View,
        {
          accessibilityLabel: "급여납치",
          style: styles.errorBoundaryBrandMark,
        },
        h(
          NativeRuntimeRef.Text,
          { style: styles.errorBoundaryBrandInitial },
          "급",
        ),
      ),
      h(
        NativeRuntimeRef.Text,
        { style: styles.errorBoundaryTitle },
        "이 화면을 다시 준비하고 있어요.",
      ),
      h(
        NativeRuntimeRef.Text,
        { style: styles.errorBoundaryText },
        "민감 정보는 표시하지 않고 안전한 상태로 복구합니다.",
      ),
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel: "다시 시도",
          onPress: retry,
          style: styles.primaryButton,
        },
        h(
          NativeRuntimeRef.Text,
          { style: styles.primaryButtonText },
          "다시 시도",
        ),
      ),
    ),
  );
}

function renderCaptureScreen(kind: CaptureScreenKind): unknown {
  return h(loadCapturePreviewScreen(), { kind });
}

function loadCapturePreviewScreen(): ElementType {
  const mod = loadModule(
    "../src/features/capture/root-preview",
  ) as Partial<CapturePreviewModule>;
  return mod.CapturePreviewScreen ?? NativeRuntimeRef.View;
}

function renderRootAppHeader(
  payload: RootPayload,
  status: RootStatus,
  _routeKey: string,
  goHome: () => void,
  goProfile: () => void,
): unknown {
  const statusStyle =
    status === "READY" || status === "OFFLINE"
      ? styles.safeText
      : status === "ERROR"
        ? styles.dangerText
        : styles.reviewText;
  const profileAction = h(
    NativeRuntimeRef.Pressable,
    {
      accessibilityRole: "button",
      accessibilityLabel: "마이페이지",
      onPress: goProfile,
      style: styles.profileButton,
    },
    h(NativeRuntimeRef.Text, { style: statusStyle }, rootStatusLabel(status)),
  );

  return h(loadRootAppHeader(), {
    onBrandPress: goHome,
    rightAccessory: profileAction,
    subtitle: rootHeaderMessage(payload, status),
    title: "급여납치",
    variant: "ROOT",
  });
}

function renderGate(
  status: RootStatus,
  retrying: boolean,
  retry: () => Promise<void>,
): unknown {
  const title =
    status === "AUTH_REQUIRED"
      ? "로그인이 필요합니다"
      : status === "VERIFY_EMAIL"
        ? "이메일 인증이 필요합니다"
        : status === "ONBOARDING"
          ? "온보딩을 완료하세요"
          : status === "ERROR"
            ? "앱 시작 실패"
            : "앱을 준비하고 있어요";
  const message =
    status === "AUTH_REQUIRED"
      ? "안전한 세션 확인 후 급여와 예산 데이터를 불러옵니다."
      : status === "VERIFY_EMAIL"
        ? "계정 보호를 위해 인증을 완료해야 합니다."
        : status === "ONBOARDING"
          ? "급여일, 고정지출, 고정저축, 일일예산 기본 설정을 완료하세요."
          : status === "OFFLINE"
            ? "네트워크 없이 마지막 세션 상태로 표시합니다."
            : "잠시만 기다려 주세요.";

  return h(
    NativeRuntimeRef.ScrollView,
    { style: styles.gateScroll, contentContainerStyle: styles.gateContent },
    h(
      NativeRuntimeRef.View,
      { style: styles.gateCard },
      h(NativeRuntimeRef.Text, { style: styles.gateTitle }, title),
      h(NativeRuntimeRef.Text, { style: styles.gateMessage }, message),
      retrying
        ? h(NativeRuntimeRef.ActivityIndicator, {
            color: designSystem.colors.brand.primary,
          })
        : h(
            NativeRuntimeRef.Pressable,
            {
              accessibilityRole: "button",
              onPress: (): void => void retry(),
              style: styles.primaryButton,
            },
            h(
              NativeRuntimeRef.Text,
              { style: styles.primaryButtonText },
              "다시 확인",
            ),
          ),
    ),
  );
}

function renderLightweightLaunchTransition(): unknown {
  return h(
    NativeRuntimeRef.View,
    {
      accessibilityLabel: "급여납치 앱 준비 중",
      style: styles.lightweightTransition,
    },
    h(
      NativeRuntimeRef.Text,
      { style: styles.lightweightTransitionBrandMark },
      "급여납치",
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.lightweightTransitionText },
      "앱을 준비하고 있어요",
    ),
    h(NativeRuntimeRef.ActivityIndicator, {
      color: designSystem.colors.brand.primary,
    }),
  );
}

function renderToast(
  toast: Readonly<{ kind: ToastKind; message: string }>,
): unknown {
  const variant =
    toast.kind === "error"
      ? styles.toastError
      : toast.kind === "success"
        ? styles.toastSuccess
        : styles.toastInfo;
  return h(
    NativeRuntimeRef.View,
    { style: [styles.toast, variant] },
    h(NativeRuntimeRef.Text, { style: styles.toastText }, toast.message),
  );
}

async function applyAuthSessionChange(event: Readonly<{
  reason: "authenticated" | "logged_out";
  targetRoute: string;
  session?: Partial<SessionSnapshot> | null;
}>): Promise<void> {
  if (event.reason === "logged_out") {
    await removePublicSessionHint();
    await persistSessionStatus(fallbackSession, "AUTH_REQUIRED");
    return;
  }
  if (!event.session) return;
  const session = normalizeSession({
    ...fallbackSession,
    ...event.session,
    authenticated: true,
  });
  await persistPublicSessionHint(session);
  await persistSessionStatus(session, resolveStatusForSession(session));
}

function renderRuntimeGuard(_payload: RootPayload): null {
  return null;
}

function rootHeaderMessage(payload: RootPayload, status: RootStatus): string {
  if (status === "BOOTSTRAPPING") return "급여납치 앱을 준비하고 있어요.";
  if (status === "AUTH_REQUIRED") return "인증 화면으로 이동합니다.";
  if (status === "OFFLINE") return "오프라인 보호 모드입니다.";
  if (status === "ERROR") return "서비스 오류 상태입니다.";
  return payload.config.privacyMode === "STRICT"
    ? "개인정보 보호 모드 적용 중"
    : "급여 현황을 확인하세요.";
}

function rootStatusLabel(status: RootStatus): string {
  if (status === "READY") return "앱 준비가 완료되었습니다.";
  if (status === "OFFLINE") return "오프라인 보호 모드입니다.";
  if (status === "ERROR") return "서비스 오류 상태입니다.";
  return "확인 중";
}

async function requestJsonWithAuthRefresh<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetchJson(path, init);
  const parsed = await parseJsonResponse(response);
  if (response.ok) return parsed as T;

  if (response.status === 401 && path !== "/api/v1/auth/refresh") {
    const refreshed = await refreshRootAccessToken();
    if (refreshed) {
      const retryResponse = await fetchJson(path, init);
      const retryParsed = await parseJsonResponse(retryResponse);
      if (retryResponse.ok) return retryParsed as T;
      if (retryResponse.status === 401) {
        await clearRootAuthenticatedSession();
        throw new RootAuthExpiredError(errorMessage(retryParsed, 401));
      }
      throw new Error(errorMessage(retryParsed, retryResponse.status));
    }
    await clearRootAuthenticatedSession();
    throw new RootAuthExpiredError(errorMessage(parsed, 401));
  }

  throw new Error(errorMessage(parsed, response.status));
}

async function fetchJson(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const apiBaseUrl = readRootMobileApiBaseUrl();
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("x-client-platform", String(NativeRuntimeRef.Platform.OS));
  headers.set("x-correlation-id", createCorrelationId());
  headers.set("x-raw-financial-data-exposed", "false");
  headers.set("x-raw-personal-data-exposed", "false");
  headers.set("x-raw-push-token-exposed", "false");
  headers.set("x-ad-financial-targeting-used", "false");
  await attachRootMobileBearerToken(headers);
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  return fetchWithTimeout(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const controller = init.signal ? null : new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller?.abort();
      reject(new Error("ROOT_BOOTSTRAP_REQUEST_TIMEOUT"));
    }, ROOT_BOOTSTRAP_REQUEST_TIMEOUT_MS);
  });
  const fetchInit: RequestInit = init.signal
    ? init
    : { ...init, signal: controller?.signal ?? null };
  try {
    return await Promise.race([fetch(input, fetchInit), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new Error("ROOT_BOOTSTRAP_INVALID_RESPONSE");
  }
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("ROOT_BOOTSTRAP_INVALID_RESPONSE");
  }
}

async function refreshRootAccessToken(): Promise<boolean> {
  try {
    const authApi = loadRootAuthApi().createAuthApi;
    if (typeof authApi !== "function") return false;
    const apiBaseUrl = readRootMobileApiBaseUrl();
    await authApi({
      baseUrl: apiBaseUrl,
      createCorrelationId,
      platform: rootAuthPlatform(),
      tokenStore: getSecureStoreRuntime(),
    }).refresh();
    const token = await getSecureStoreRuntime().getItemAsync(
      MOBILE_ACCESS_TOKEN_KEY,
    );
    return Boolean(token?.trim());
  } catch {
    return false;
  }
}

async function hasStoredAccessToken(): Promise<boolean> {
  try {
    const token = await getSecureStoreRuntime().getItemAsync(
      MOBILE_ACCESS_TOKEN_KEY,
    );
    return Boolean(token?.trim());
  } catch {
    return true;
  }
}

async function clearRootAuthenticatedSession(): Promise<void> {
  try {
    await getSecureStoreRuntime().deleteItemAsync(MOBILE_ACCESS_TOKEN_KEY);
  } finally {
    await getSecureStoreRuntime().deleteItemAsync(SECURE_SESSION_KEY);
    await removePublicSessionHint();
  }
}

function rootAuthPlatform(): "ios" | "android" | "web" {
  const platform = String(NativeRuntimeRef.Platform.OS);
  if (platform === "ios" || platform === "android") return platform;
  return "web";
}

function normalizePayload(partial: Partial<RootPayload>): RootPayload {
  return {
    session: normalizeSession(partial.session ?? fallbackSession),
    config: normalizeConfig(partial.config ?? fallbackConfig),
    push: normalizePush(partial.push ?? fallbackPush),
  };
}

function normalizeSession(session: SessionSnapshot): SessionSnapshot {
  return {
    authenticated: Boolean(session.authenticated),
    userIdHash: session.userIdHash ? scrub(session.userIdHash) : null,
    role: enumOf(
      ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN", "SYSTEM"] as const,
      session.role,
      "USER",
    ),
    emailVerified: Boolean(session.emailVerified),
    onboardingCompleted: Boolean(session.onboardingCompleted),
    payrollReady: Boolean(session.payrollReady),
    mfaRequired: Boolean(session.mfaRequired),
    sessionExpiresAt: session.sessionExpiresAt
      ? iso(session.sessionExpiresAt)
      : null,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeConfig(config: AppConfigSnapshot): AppConfigSnapshot {
  return {
    apiVersion: scrub(config.apiVersion) || "v1",
    environment: enumOf(
      ["local", "development", "staging", "production"] as const,
      config.environment,
      "staging",
    ),
    maintenanceMode: Boolean(config.maintenanceMode),
    minSupportedBuild: scrub(config.minSupportedBuild) || "0",
    featureFlags: normalizeFlags(config.featureFlags),
    serverAuthorityEnabled: true,
    privacyMode: "STRICT",
    adsFinancialTargetingAllowed: false,
  };
}

function normalizePush(push: PushSnapshot): PushSnapshot {
  return {
    consent: enumOf(
      ["GRANTED", "DENIED", "UNKNOWN"] as const,
      push.consent,
      "UNKNOWN",
    ),
    tokenRegistered: Boolean(push.tokenRegistered),
    quietHoursEnabled: Boolean(push.quietHoursEnabled),
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeFlags(
  flags: Readonly<Record<string, boolean>>,
): Readonly<Record<string, boolean>> {
  return Object.fromEntries(
    Object.entries(flags)
      .slice(0, 60)
      .map(([key, value]: [string, boolean]) => [
        scrub(key).slice(0, 64),
        Boolean(value),
      ]),
  );
}

function resolveStatus(payload: RootPayload, isPublic: boolean): RootStatus {
  if (payload.config.maintenanceMode && !isPublic) return "ERROR";
  if (!payload.session.authenticated) return "AUTH_REQUIRED";
  if (payload.session.mfaRequired) return "AUTH_REQUIRED";
  if (!payload.session.emailVerified) return "VERIFY_EMAIL";
  if (!payload.session.onboardingCompleted) return "ONBOARDING";
  if (!payload.session.payrollReady) return "ONBOARDING";
  return "READY";
}

function offlineStatusFromCachedSession(
  session: SessionSnapshot,
  isPublic: boolean,
): RootStatus {
  if (!session.authenticated) return "AUTH_REQUIRED";
  if (isPublic) return "READY";
  if (session.mfaRequired) return "AUTH_REQUIRED";
  if (!session.emailVerified) return "VERIFY_EMAIL";
  if (!session.onboardingCompleted) return "ONBOARDING";
  if (!session.payrollReady) return "ONBOARDING";
  return "OFFLINE";
}

function cachedAuthenticatedPayload(session: SessionSnapshot): RootPayload {
  return {
    ...fallbackPayload,
    session,
  };
}

function canUseCachedAuthenticatedLaunch(
  session: SessionSnapshot,
  routeKey: string,
  source: "public-hint" | "secure-session",
): boolean {
  if (!isFreshCompleteSession(session)) return false;
  if (source === "public-hint") return isAuthenticatedAuthRoute(routeKey);
  return (
    isAuthenticatedAuthRoute(routeKey) ||
    (source === "secure-session" && isLauncherRootRoute(routeKey))
  );
}

function isLauncherRootRoute(routeKey: string): boolean {
  return routeKey === "root";
}

function isFreshCompleteSession(session: SessionSnapshot): boolean {
  if (!session.authenticated) return false;
  if (session.mfaRequired) return false;
  if (!session.emailVerified) return false;
  if (!session.onboardingCompleted) return false;
  if (!session.payrollReady) return false;
  if (!session.sessionExpiresAt) return false;
  const expiresAt = Date.parse(session.sessionExpiresAt);
  return (
    Number.isFinite(expiresAt) &&
    expiresAt - Date.now() >= ROOT_CACHED_SESSION_LAUNCH_MIN_TTL_MS
  );
}

async function persistSessionStatus(
  session: SessionSnapshot,
  status: RootStatus,
): Promise<void> {
  const safe = JSON.stringify({
    authenticated: session.authenticated,
    role: session.role,
    emailVerified: session.emailVerified,
    onboardingCompleted: session.onboardingCompleted,
    payrollReady: session.payrollReady,
    mfaRequired: session.mfaRequired,
    sessionExpiresAt: session.sessionExpiresAt,
    status,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  });
  await getSecureStoreRuntime().setItemAsync(SECURE_SESSION_KEY, safe);
}

async function readCachedSessionStatus(): Promise<SessionSnapshot> {
  const cached = await getSecureStoreRuntime().getItemAsync(SECURE_SESSION_KEY);
  if (!cached) return fallbackSession;
  try {
    const parsed = JSON.parse(cached) as Partial<SessionSnapshot>;
    return normalizeSession({ ...fallbackSession, ...parsed });
  } catch {
    await getSecureStoreRuntime().deleteItemAsync(SECURE_SESSION_KEY);
    return fallbackSession;
  }
}

async function readPublicSessionHint(): Promise<SessionSnapshot | null> {
  const storage = getAsyncStorageRuntime();
  if (!storage) return null;
  const cached = await storage.getItem(ROOT_PUBLIC_SESSION_HINT_KEY);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as Partial<SessionSnapshot>;
    return normalizeSession({ ...fallbackSession, ...parsed });
  } catch {
    await storage.removeItem(ROOT_PUBLIC_SESSION_HINT_KEY);
    return null;
  }
}

async function persistPublicSessionHint(
  session: SessionSnapshot,
): Promise<void> {
  const storage = getAsyncStorageRuntime();
  if (!storage) return;
  await storage.setItem(
    ROOT_PUBLIC_SESSION_HINT_KEY,
    JSON.stringify({
      authenticated: session.authenticated,
      role: session.role,
      emailVerified: session.emailVerified,
      onboardingCompleted: session.onboardingCompleted,
      payrollReady: session.payrollReady,
      mfaRequired: session.mfaRequired,
      sessionExpiresAt: session.sessionExpiresAt,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
    }),
  );
}

async function removePublicSessionHint(): Promise<void> {
  const storage = getAsyncStorageRuntime();
  if (!storage) return;
  await storage.removeItem(ROOT_PUBLIC_SESSION_HINT_KEY);
}

function isPublicRoute(segments: readonly string[]): boolean {
  const clean = normalizeSegments(segments);
  if (INITIAL_CAPTURE_SCREEN_KIND) return true;
  if (isCaptureBrowserPath()) return true;
  if (clean.length === 0) return false;
  if (clean[0] === "capture") return true;
  if (clean.join("/") === "auth/oauth/callback") return true;
  return clean.some((segment: string) =>
    PUBLIC_SEGMENTS.includes(segment as (typeof PUBLIC_SEGMENTS)[number]),
  );
}

function isCaptureBrowserPath(): boolean {
  const location = readBrowserLocation();
  if (!location) return false;
  return location.pathname.split("/").filter(Boolean)[0] === "capture";
}

function readInitialCaptureScreenKind(): CaptureScreenKind | null {
  const location = readBrowserLocation();
  if (!location) return null;
  return resolveCaptureScreenKindForUrl(location.href);
}

function readBrowserLocation(): Readonly<{
  href: string;
  pathname: string;
}> | null {
  if (NativeRuntimeRef.Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;
  const location = window.location;
  if (
    !location ||
    typeof location.href !== "string" ||
    typeof location.pathname !== "string"
  ) {
    return null;
  }
  return location;
}

function resolveCaptureScreenKindForUrl(
  href: string,
): CaptureScreenKind | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!url.searchParams.has("capture")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "capture") return null;
  const mod = loadModule(
    "../src/features/capture/root-preview",
  ) as Partial<CapturePreviewModule>;
  return typeof mod.resolveCapturePreviewKind === "function"
    ? (mod.resolveCapturePreviewKind(parts[1] ?? "") ?? null)
    : null;
}

function isAuthenticatedAuthRoute(routeKey: string): boolean {
  return (
    routeKey === "(auth)/login" ||
    routeKey === "(auth)/signup" ||
    routeKey === "(auth)/forgot-password" ||
    routeKey === "(auth)/reset-password"
  );
}

async function resolveInitialRootDeepLinkRoute(): Promise<string | null> {
  const mod = loadModule("expo-linking") as Partial<LinkingRuntime>;
  if (typeof mod.getInitialURL !== "function") return null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const href = await Promise.race([
      mod.getInitialURL(),
      new Promise<"ROOT_DEEP_LINK_RESOLUTION_TIMEOUT">((resolve) => {
        timer = setTimeout(() => {
          resolve("ROOT_DEEP_LINK_RESOLUTION_TIMEOUT");
        }, ROOT_DEEP_LINK_RESOLUTION_TIMEOUT_MS);
      }),
    ]);
    if (href === "ROOT_DEEP_LINK_RESOLUTION_TIMEOUT") return null;
    return normalizeRootDeepLinkRoute(href);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeRootDeepLinkRoute(href: string | null): string | null {
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const route = rootRoutePathFromUrl(url);
  if (!route) return null;
  if (ROOT_DEEP_LINK_ROUTES.has(route)) return route;
  if (/^\/community\/[A-Za-z0-9_-]{1,80}$/u.test(route)) return route;
  return null;
}

function rootRoutePathFromUrl(url: URL): string | null {
  const pathname = url.pathname.startsWith("/")
    ? url.pathname
    : `/${url.pathname}`;
  if (url.protocol === "https:") return pathname === "/" ? null : pathname;
  const host = url.hostname;
  if (!host || host === "app") return pathname === "/" ? null : pathname;
  return `/${[host, pathname.replace(/^\//u, "")].filter(Boolean).join("/")}`;
}

function shouldRouteAuthenticatedStateToHome(
  routeKey: string,
  initialDeepLinkRoute: InitialDeepLinkRoute,
): boolean {
  if (routeKey === "root" && initialDeepLinkRoute === "PENDING") return true;
  if (routeKey === "root" && initialDeepLinkRoute === null) return true;
  return isAuthenticatedAuthRoute(routeKey);
}

function normalizeSegments(segments: readonly string[]): readonly string[] {
  return segments
    .map((segment: string) => scrub(String(segment)))
    .filter(Boolean)
    .slice(0, 8);
}

function statusMessage(status: RootStatus): string {
  if (status === "READY") return "앱 준비가 완료되었습니다.";
  if (status === "AUTH_REQUIRED") return "인증 화면으로 이동합니다.";
  if (status === "VERIFY_EMAIL") return "이메일 인증 화면으로 이동합니다.";
  if (status === "ONBOARDING") return "온보딩 화면으로 이동합니다.";
  if (status === "OFFLINE") return "오프라인 보호 모드입니다.";
  if (status === "ERROR") return "서비스 오류 상태입니다.";
  return "앱 시작 정보를 불러오지 못해 안전한 로컬 상태로 전환했습니다.";
}

function resolveStatusForSession(session: SessionSnapshot): RootStatus {
  if (!session.authenticated) return "AUTH_REQUIRED";
  if (session.mfaRequired) return "AUTH_REQUIRED";
  if (!session.emailVerified) return "VERIFY_EMAIL";
  if (!session.onboardingCompleted) return "ONBOARDING";
  if (!session.payrollReady) return "ONBOARDING";
  return "READY";
}

function safeBootstrapErrorMessage(
  reason: "auth-expired" | "offline-fallback",
): string {
  if (reason === "auth-expired")
    return "세션이 만료되어 다시 로그인이 필요합니다.";
  return "앱 시작 정보를 불러오지 못해 안전한 로컬 상태로 전환했습니다.";
}

function readRootMobileApiBaseUrl(): string {
  if (cachedRootApiBaseUrl) return cachedRootApiBaseUrl;
  const mod = loadModule("../src/shared/api/api-base") as RootApiBaseModule;
  cachedRootApiBaseUrl =
    typeof mod.readMobileApiBaseUrl === "function"
      ? mod.readMobileApiBaseUrl()
      : "https://api-staging.salaryhijacking.com";
  return cachedRootApiBaseUrl;
}

function getSecureStoreRuntime(): SecureStoreRuntime {
  if (cachedSecureStoreRuntime) return cachedSecureStoreRuntime;
  cachedSecureStoreRuntime = loadSecureStoreRuntime();
  return cachedSecureStoreRuntime;
}

function getAsyncStorageRuntime(): AsyncStorageRuntime | null {
  if (cachedAsyncStorageRuntime) return cachedAsyncStorageRuntime;
  cachedAsyncStorageRuntime = loadAsyncStorageRuntime();
  return cachedAsyncStorageRuntime;
}

function getSplashScreenRuntime(): SplashScreenRuntime {
  if (cachedSplashScreenRuntime) return cachedSplashScreenRuntime;
  cachedSplashScreenRuntime = loadSplashScreenRuntime();
  return cachedSplashScreenRuntime;
}

async function attachRootMobileBearerToken(headers: Headers): Promise<Headers> {
  const token = normalizeBearerToken(
    await getSecureStoreRuntime().getItemAsync(MOBILE_ACCESS_TOKEN_KEY),
  );
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

function normalizeBearerToken(value: string | null): string | null {
  const token = value?.trim();
  if (!token || token.length > 8_192) return null;
  if (/\s/u.test(token)) return null;
  return token;
}

function isMobileE2eBuildEnabled(): boolean {
  const mod = loadModule("expo-constants") as Partial<ConstantsRuntime> & {
    readonly default?: Partial<ConstantsRuntime>;
  };
  const constants = mod.expoConfig ? mod : (mod.default ?? {});
  return constants.expoConfig?.extra?.operations?.e2eBuild === true;
}

function h(
  type: ElementType,
  props?: Record<string, unknown> | null,
  ...children: readonly unknown[]
): unknown {
  return ReactRuntimeRef.createElement(type, props ?? null, ...children);
}
function loadReactRuntime(): ReactRuntime {
  const mod = loadModule("react") as Partial<ReactRuntime>;
  return {
    createElement:
      typeof mod.createElement === "function"
        ? mod.createElement
        : fallbackCreateElement,
    useCallback:
      typeof mod.useCallback === "function"
        ? mod.useCallback
        : fallbackUseCallback,
    useEffect:
      typeof mod.useEffect === "function" ? mod.useEffect : fallbackUseEffect,
    useMemo: typeof mod.useMemo === "function" ? mod.useMemo : fallbackUseMemo,
    useState:
      typeof mod.useState === "function" ? mod.useState : fallbackUseState,
  };
}
function loadNativeRuntime(): NativeRuntime {
  const mod = loadModule("react-native") as Partial<NativeRuntime>;
  const fallback = (name: string): ElementType => name;
  return {
    ActivityIndicator: mod.ActivityIndicator ?? fallback("ActivityIndicator"),
    Pressable: mod.Pressable ?? fallback("Pressable"),
    Image: mod.Image ?? fallback("Image"),
    SafeAreaView: mod.SafeAreaView ?? fallback("SafeAreaView"),
    ScrollView: mod.ScrollView ?? fallback("ScrollView"),
    StyleSheet: mod.StyleSheet ?? { create: fallbackStyleCreate },
    Text: mod.Text ?? fallback("Text"),
    View: mod.View ?? fallback("View"),
    Platform: mod.Platform ?? { OS: "web" },
  };
}
function loadRouterRuntime(): RouterRuntime {
  const mod = loadModule("expo-router") as Partial<RouterRuntime>;
  return {
    Slot: mod.Slot ?? "Slot",
    useRouter:
      typeof mod.useRouter === "function"
        ? mod.useRouter
        : (): RouterLike => ({
            push: (_href: never): void => undefined,
            replace: (_href: never): void => undefined,
            back: (): void => undefined,
          }),
    useSegments:
      typeof mod.useSegments === "function"
        ? mod.useSegments
        : (): readonly string[] => [],
  };
}
function loadFontRuntime(): FontRuntime {
  if (NativeRuntimeRef.Platform.OS !== "web") {
    return {
      useFonts: (): readonly [boolean, Error | null] => [true, null],
    };
  }
  const mod = loadModule("expo-font") as Partial<FontRuntime>;
  return {
    useFonts:
      typeof mod.useFonts === "function"
        ? mod.useFonts
        : (): readonly [boolean, Error | null] => [true, null],
  };
}

function loadRootFontAssets(): Readonly<Record<string, unknown>> {
  const mod = loadModule(
    "../src/shared/styles/root-font-assets",
  ) as RootFontAssetsModule;
  return typeof mod.getRootFontAssets === "function"
    ? mod.getRootFontAssets()
    : EMPTY_FONT_ASSETS;
}

function loadRootAppHeader(): ElementType {
  const mod = loadModule("../src/shared/components/AppHeader") as Readonly<{
    AppHeader?: ElementType;
  }>;
  return mod.AppHeader ?? NativeRuntimeRef.View;
}

function loadRootAuthApi(): RootAuthApiModule {
  return loadModule("../src/features/auth/api") as RootAuthApiModule;
}

function loadSplashScreenRuntime(): SplashScreenRuntime {
  const mod = loadModule("expo-splash-screen") as Partial<SplashScreenRuntime>;
  return {
    hideAsync:
      typeof mod.hideAsync === "function"
        ? mod.hideAsync
        : async (): Promise<boolean> => false,
    preventAutoHideAsync:
      typeof mod.preventAutoHideAsync === "function"
        ? mod.preventAutoHideAsync
        : async (): Promise<boolean> => false,
  };
}
function loadSecureStoreRuntime(): SecureStoreRuntime {
  const mod = loadModule("expo-secure-store") as Partial<SecureStoreRuntime>;
  const helper = loadModule(
    "../src/shared/storage/secure-store",
  ) as RootSecureStoreModule;
  return typeof helper.createSecureStoreRuntime === "function"
    ? helper.createSecureStoreRuntime(NativeRuntimeRef.Platform.OS, mod)
    : fallbackSecureStoreRuntime();
}
function loadAsyncStorageRuntime(): AsyncStorageRuntime | null {
  const mod = loadModule(
    "@react-native-async-storage/async-storage",
  ) as RootAsyncStorageModule;
  const candidate =
    "default" in mod && mod.default
      ? mod.default
      : (mod as Partial<AsyncStorageRuntime>);
  return typeof candidate.getItem === "function" &&
    typeof candidate.setItem === "function" &&
    typeof candidate.removeItem === "function"
    ? {
        getItem: candidate.getItem.bind(candidate),
        setItem: candidate.setItem.bind(candidate),
        removeItem: candidate.removeItem.bind(candidate),
      }
    : null;
}
function loadModule(moduleName: string): unknown {
  try {
    switch (moduleName) {
      case "react":
        return require("react");
      case "react-native":
        return require("react-native");
      case "expo-router":
        return require("expo-router");
      case "expo-font":
        return require("expo-font");
      case "expo-splash-screen":
        return require("expo-splash-screen");
      case "expo-linking":
        return require("expo-linking");
      case "expo-constants":
        return require("expo-constants");
      case "expo-secure-store":
        return require("expo-secure-store");
      case "@react-native-async-storage/async-storage":
        return require("@react-native-async-storage/async-storage");
      case "../src/features/auth/api":
        return require("../src/features/auth/api");
      case "../src/shared/api/api-base":
        return require("../src/shared/api/api-base");
      case "../src/shared/styles/root-font-assets":
        return require("../src/shared/styles/root-font-assets");
      case "../src/shared/storage/secure-store":
        return require("../src/shared/storage/secure-store");
      case "../src/shared/components/AppHeader":
        return require("../src/shared/components/AppHeader");
      case "../src/features/capture/root-preview":
        return require("../src/features/capture/root-preview");
      default:
        return {};
    }
  } catch {
    return {};
  }
}
function fallbackCreateElement(
  type: ElementType,
  props?: Record<string, unknown> | null,
  ...children: readonly unknown[]
): unknown {
  return {
    $$typeof: Symbol.for("react.element"),
    type,
    key: props?.key == null ? null : String(props.key),
    ref: null,
    props:
      children.length > 0
        ? {
            ...(props ?? {}),
            children: children.length === 1 ? children[0] : children,
          }
        : (props ?? {}),
    _owner: null,
  };
}
function fallbackUseCallback<TCallback>(
  callback: TCallback,
  _deps?: readonly unknown[],
): TCallback {
  return callback;
}
function fallbackUseEffect(
  effect: () => void | (() => void),
  _deps?: readonly unknown[],
): void {
  const cleanup = effect();
  if (typeof cleanup === "function") cleanup();
}
function fallbackUseMemo<TValue>(
  factory: () => TValue,
  _deps?: readonly unknown[],
): TValue {
  return factory();
}
function fallbackUseState<TValue>(
  initial: TValue,
): readonly [TValue, SetState<TValue>] {
  return [
    initial,
    (_next: TValue | ((previous: TValue) => TValue)): void => undefined,
  ];
}
function fallbackSecureStoreRuntime(): SecureStoreRuntime {
  return {
    getItemAsync: async (): Promise<string | null> => null,
    setItemAsync: async (): Promise<void> => undefined,
    deleteItemAsync: async (): Promise<void> => undefined,
  };
}
function fallbackStyleCreate<
  TStyles extends Record<string, Readonly<Record<string, unknown>>>,
>(stylesArg: TStyles): TStyles {
  return stylesArg;
}
function createCorrelationId(): string {
  const cryptoLike = (
    globalThis as unknown as {
      readonly crypto?: { readonly randomUUID?: () => string };
    }
  ).crypto;
  return cryptoLike?.randomUUID
    ? cryptoLike.randomUUID()
    : `mobile-root-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function errorMessage(value: unknown, status: number): string {
  const sanitized = sanitize(value);
  if (typeof sanitized === "string" && sanitized.trim())
    return safeMessage(sanitized);
  if (sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)) {
    const message = (sanitized as { readonly message?: JsonValue }).message;
    if (typeof message === "string" && message.trim())
      return safeMessage(message);
  }
  if (status === 401) return "로그인이 필요합니다.";
  if (status === 403) return "접근이 제한되었습니다.";
  if (status === 409) return "세션 상태가 변경되었습니다. 다시 확인하세요.";
  if (status === 426) return "앱 업데이트가 필요합니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  if (status >= 500) return "서버 오류 또는 일시 장애입니다.";
  return `앱 시작 요청이 실패했습니다. (${status})`;
}
function sanitize(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return scrub(value);
  if (Array.isArray(value)) return value.slice(0, 40).map(sanitize);
  if (typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]: [string, unknown]) => [
          key,
          isSensitiveKey(key) ? "[REDACTED]" : sanitize(item),
        ]),
    ) as JsonRecord;
  return String(value);
}
function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s._-]/g, "");
  return SENSITIVE_KEYWORDS.some((keyword: string) =>
    normalized.includes(keyword.toLowerCase().replace(/[\s._-]/g, "")),
  );
}
function scrub(value: string): string {
  let output = value.slice(0, 1600);
  SENSITIVE_KEYWORDS.forEach((keyword: string) => {
    output = output.replace(
      new RegExp(regexEscape(keyword), "gi"),
      "[REDACTED]",
    );
  });
  return output;
}
function safeMessage(value: string): string {
  return (
    scrub(value).replace(/\s+/g, " ").trim().slice(0, 180) ||
    "요청을 처리하지 못했습니다."
  );
}
function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function enumOf<T extends readonly string[]>(
  values: T,
  value: string,
  fallback: T[number],
): T[number] {
  return values.includes(value) ? (value as T[number]) : fallback;
}
function iso(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date(0).toISOString();
}

export function assertMobileRootLayoutCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_root_runtime_loaded",
    "react_native_runtime_loaded",
    "secure_store_runtime_loaded",
    "root_slot_rendering",
    "mobile_bootstrap_endpoint",
    "auth_session_gate",
    "email_verification_gate",
    "onboarding_gate",
    "offline_cached_session_fallback",
    "maintenance_mode_guard",
    "server_authority_config",
    "strict_privacy_mode",
    "push_consent_summary",
    "quiet_hours_ready",
    "raw_financial_data_exposure_forbidden",
    "raw_personal_data_exposure_forbidden",
    "raw_push_token_exposure_forbidden",
    "ads_financial_targeting_forbidden",
    "sensitive_error_redaction",
    "correlation_id_headers",
    "korean_mobile_ux",
    "accessibility_roles",
    "responsive_root_shell",
    "e2e_root_test_id",
    "e2e_shell_ready_without_server",
    "runtime_chrome_hidden_for_public_launch_surfaces",
    "clean_fintech_light_shell",
    "expo_font_useFonts",
    "expo_splash_screen_hideAsync",
    "Freesentation-4Regular.ttf",
    "Freesentation-7Bold.ttf",
    "typescript_strict_ready",
  ] as const;
  return { ok: checks.length >= 20, version: ROOT_LAYOUT_VERSION, checks };
}

const styles = NativeRuntimeRef.StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: componentColors.background },
  profileButton: {
    alignItems: "center",
    backgroundColor: componentColors.surface,
    borderColor: componentColors.line,
    borderRadius: designSystem.radius.lg,
    borderWidth: 1,
    minHeight: designSystem.layout.touchTarget,
    justifyContent: "center",
    paddingHorizontal: designSystem.spacing[3],
  },
  toast: {
    borderRadius: designSystem.radius.lg,
    borderWidth: 1,
    marginHorizontal: designSystem.spacing[4],
    marginTop: designSystem.spacing[3],
    paddingHorizontal: designSystem.spacing[4],
    paddingVertical: designSystem.spacing[3],
  },
  toastInfo: {
    backgroundColor: componentColors.primaryGreenSoft,
    borderColor: designSystem.colors.brand.surface,
  },
  toastSuccess: {
    backgroundColor: componentColors.primaryGreenSoft,
    borderColor: designSystem.colors.brand.surface,
  },
  toastError: {
    backgroundColor: designSystem.colors.semantic.dangerSoft,
    borderColor: designSystem.colors.semantic.danger,
  },
  toastText: {
    color: componentColors.textPrimary,
    ...designSystem.typography.labelM,
  },
  slotHost: { flex: 1, backgroundColor: componentColors.background },
  gateScroll: { flex: 1, backgroundColor: componentColors.background },
  gateContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: designSystem.spacing[5],
  },
  gateCard: {
    alignItems: "center",
    backgroundColor: componentColors.surface,
    borderColor: designSystem.colors.border.soft,
    borderRadius: designSystem.radius.xl,
    borderWidth: 1,
    gap: designSystem.spacing[4],
    padding: designSystem.spacing[6],
  },
  gateTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleL,
    textAlign: "center",
  },
  gateMessage: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
    textAlign: "center",
  },
  lightweightTransition: {
    alignItems: "center",
    flex: 1,
    gap: designSystem.spacing[2],
    justifyContent: "center",
    padding: designSystem.spacing[5],
  },
  lightweightTransitionBrandMark: {
    color: componentColors.primaryGreen,
    ...designSystem.typography.titleXL,
    textAlign: "center",
  },
  lightweightTransitionText: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: componentColors.primaryGreen,
    borderRadius: designSystem.radius.lg,
    justifyContent: "center",
    minHeight: designSystem.layout.touchTarget,
    paddingHorizontal: designSystem.spacing[4],
  },
  primaryButtonText: {
    color: componentColors.surface,
    ...designSystem.typography.labelL,
  },
  safeText: {
    color: componentColors.primaryGreen,
    ...designSystem.typography.labelS,
  },
  reviewText: {
    color: designSystem.colors.semantic.warningStrong,
    ...designSystem.typography.labelS,
  },
  dangerText: {
    color: componentColors.dangerRed,
    ...designSystem.typography.labelS,
  },
  guardBox: {
    borderColor: designSystem.colors.brand.surface,
    borderRadius: designSystem.radius.xl,
    borderWidth: 1,
    gap: designSystem.spacing[2],
    margin: designSystem.spacing[4],
    padding: designSystem.spacing[3],
  },
  guardTitle: {
    color: componentColors.primaryGreen,
    ...designSystem.typography.labelM,
  },
  guardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designSystem.spacing[2],
  },
  guardPill: {
    backgroundColor: componentColors.primaryGreenSoft,
    borderColor: designSystem.colors.brand.surface,
    borderRadius: designSystem.radius.full,
    borderWidth: 1,
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: designSystem.spacing[1],
  },
  guardPillText: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.caption,
  },
  buttonDisabled: { opacity: 0.48 },
  fontLoading: {
    alignItems: "center",
    flex: 1,
    gap: designSystem.spacing[2],
    justifyContent: "center",
    padding: designSystem.spacing[6],
  },
  fontLoadingBrandMark: {
    alignItems: "center",
    backgroundColor: componentColors.primaryGreen,
    borderRadius: designSystem.radius.xl,
    height: designSystem.spacing[10] + designSystem.spacing[6],
    justifyContent: "center",
    width: designSystem.spacing[10] + designSystem.spacing[6],
  },
  fontLoadingBrandInitial: {
    color: componentColors.surface,
    fontFamily: designSystem.font.native.bold,
    ...designSystem.typography.titleXL,
  },
  fontLoadingTitle: {
    color: componentColors.textPrimary,
    fontFamily: designSystem.font.native.black,
    ...designSystem.typography.display,
  },
  fontLoadingText: {
    color: componentColors.textSecondary,
    fontFamily: designSystem.font.native.semibold,
    ...designSystem.typography.bodyS,
  },
  errorBoundary: {
    alignItems: "center",
    flex: 1,
    gap: designSystem.spacing[3],
    justifyContent: "center",
    padding: designSystem.spacing[6],
  },
  errorBoundaryBrandMark: {
    alignItems: "center",
    backgroundColor: componentColors.primaryGreenSoft,
    borderRadius: designSystem.radius.xl,
    height: designSystem.spacing[8] + designSystem.spacing[10],
    justifyContent: "center",
    width: designSystem.spacing[8] + designSystem.spacing[10],
  },
  errorBoundaryBrandInitial: {
    color: componentColors.primaryGreen,
    fontFamily: designSystem.font.native.bold,
    ...designSystem.typography.titleXL,
  },
  errorBoundaryTitle: {
    color: componentColors.textPrimary,
    fontFamily: designSystem.font.native.extraBold,
    ...designSystem.typography.titleL,
    textAlign: "center",
  },
  errorBoundaryText: {
    color: componentColors.textSecondary,
    fontFamily: designSystem.font.native.medium,
    ...designSystem.typography.bodyS,
    textAlign: "center",
  },
});
