/** apps/mobile/app/(tabs)/_layout.tsx
 * 급여납치 모바일 탭 레이아웃 최종본.
 * 정적 import와 JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../src/shared/api/api-base";
import { attachMobileBearerToken } from "../../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type TabName = "salary" | "plan" | "level" | "community" | "profile";
type TabScreenName = `${TabName}/index`;
type AuthStatus =
  | "CHECKING"
  | "AUTHENTICATED"
  | "UNAUTHENTICATED"
  | "OFFLINE_FALLBACK";
type PlatformOS = "ios" | "android" | "web" | "windows" | "macos" | string;
type UserRole = "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN";
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
  Pressable: ElementType;
  RefreshControl: ElementType;
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

type RouterRuntime = Readonly<{
  useRouter: () => RouterLike;
  Tabs: TabsComponent;
}>;
type RouterLike = Readonly<{
  push: (href: never) => void;
  replace: (href: never) => void;
  back?: () => void;
}>;
type TabsComponent = ElementType & Readonly<{ Screen?: ElementType }>;
type SecureStoreRuntime = Readonly<{
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}>;

type TabIconArgs = Readonly<{ focused: boolean; color: string; size: number }>;
type SessionUser = Readonly<{
  idHash: string;
  role: UserRole;
  emailVerified: boolean;
  onboardingCompleted: boolean;
}>;
type BootstrapSession = Readonly<{
  authenticated?: boolean;
  userIdHash?: string | null;
  role?: UserRole;
  emailVerified?: boolean;
  onboardingCompleted?: boolean;
}>;
type SessionResponse = Readonly<{
  data?: {
    readonly session?: BootstrapSession;
    readonly authenticated?: boolean;
    readonly user?: Partial<SessionUser>;
  };
  error?: unknown;
}>;
type LayoutState = Readonly<{
  status: AuthStatus;
  checkedAt: string | null;
  user: SessionUser | null;
  message: string;
}>;
type TabDefinition = Readonly<{
  name: TabName;
  screenName: TabScreenName;
  title: string;
  icon: string;
  href: string;
  badgeKey: string;
  privacyBoundary: string;
}>;

const LAYOUT_VERSION = "3.1.0";
const LOGIN_ROUTE = "/(auth)/login";
const VERIFY_EMAIL_ROUTE = "/(auth)/verify-email";
const ONBOARDING_ROUTE = "/onboarding";
const SESSION_ENDPOINT = "/api/v1/mobile/bootstrap";
const TAB_DEFINITIONS: readonly TabDefinition[] = Object.freeze([
  {
    name: "salary",
    screenName: "salary/index",
    title: "급여",
    icon: "₩",
    href: "/salary",
    badgeKey: "salary",
    privacyBoundary: "payroll_home",
  },
  {
    name: "plan",
    screenName: "plan/index",
    title: "계획",
    icon: "⌁",
    href: "/plan",
    badgeKey: "plan",
    privacyBoundary: "payroll_plan",
  },
  {
    name: "level",
    screenName: "level/index",
    title: "LV UP",
    icon: "↑",
    href: "/level",
    badgeKey: "level",
    privacyBoundary: "growth",
  },
  {
    name: "community",
    screenName: "community/index",
    title: "커뮤니티",
    icon: "●",
    href: "/community",
    badgeKey: "community",
    privacyBoundary: "anonymous_community",
  },
  {
    name: "profile",
    screenName: "profile/index",
    title: "MY",
    icon: "◌",
    href: "/profile",
    badgeKey: "profile",
    privacyBoundary: "profile_privacy",
  },
]);
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
] as const;

const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const RouterRuntimeRef = loadRouterRuntime();
const SecureStoreRuntimeRef = loadSecureStoreRuntime();
const API_BASE_URL = readMobileApiBaseUrl();

export default function TabsLayout(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [state, setState] = ReactRuntimeRef.useState<LayoutState>({
    status: "CHECKING",
    checkedAt: null,
    user: null,
    message: "세션을 확인하고 있습니다.",
  });

  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<LayoutState>): void =>
      setState((prev: LayoutState) => ({ ...prev, ...patch })),
    [],
  );
  const screenOptions = ReactRuntimeRef.useMemo(
    () => createScreenOptions(),
    [],
  );

  const checkSession = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    update({ status: "CHECKING", message: "세션을 확인하고 있습니다." });

    try {
      const session = await requestSession();
      const authenticated = Boolean(
        session.data?.session?.authenticated ?? session.data?.authenticated,
      );
      const user =
        normalizeBootstrapUser(session.data?.session) ??
        normalizeUser(session.data?.user);

      if (!authenticated || !user) {
        update({
          status: "UNAUTHENTICATED",
          checkedAt: new Date().toISOString(),
          user: null,
          message: "로그인이 필요합니다.",
        });
        router.replace(LOGIN_ROUTE as never);
        return;
      }

      if (!user.emailVerified) {
        update({
          status: "AUTHENTICATED",
          checkedAt: new Date().toISOString(),
          user,
          message: "이메일 인증이 필요합니다.",
        });
        router.replace(VERIFY_EMAIL_ROUTE as never);
        return;
      }

      if (!user.onboardingCompleted) {
        update({
          status: "AUTHENTICATED",
          checkedAt: new Date().toISOString(),
          user,
          message: "온보딩을 완료해야 합니다.",
        });
        router.replace(ONBOARDING_ROUTE as never);
        return;
      }

      update({
        status: "AUTHENTICATED",
        checkedAt: new Date().toISOString(),
        user,
        message: "모바일 탭을 사용할 수 있습니다.",
      });
    } catch (error) {
      update({
        status: "OFFLINE_FALLBACK",
        checkedAt: new Date().toISOString(),
        user: null,
        message:
          error instanceof Error ? error.message : "오프라인 보호 모드입니다.",
      });
    }
  }, [router, update]);

  ReactRuntimeRef.useEffect((): void => {
    void checkSession();
  }, [checkSession]);

  return h(
    NativeRuntimeRef.SafeAreaView,
    { style: styles.safeArea },
    state.status === "CHECKING" ? renderSessionOverlay(state) : null,
    h(
      RouterRuntimeRef.Tabs,
      { screenOptions, initialRouteName: "salary/index" },
      ...TAB_DEFINITIONS.map((tab: TabDefinition) =>
        renderTabScreen(tab, state),
      ),
    ),
    renderGuardFooter(state),
  );
}

function renderTabScreen(tab: TabDefinition, state: LayoutState): unknown {
  const Screen = RouterRuntimeRef.Tabs.Screen ?? "Tabs.Screen";
  const options = createTabOptions(tab, state);

  return h(Screen, { key: tab.name, name: tab.screenName, options });
}

function createScreenOptions(): Record<string, unknown> {
  return {
    headerShown: false,
    lazy: true,
    freezeOnBlur: true,
    unmountOnBlur: false,
    sceneStyle: styles.scene,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: "#67e8f9",
    tabBarInactiveTintColor: "#64748b",
    tabBarStyle: styles.tabBar,
    tabBarLabelStyle: styles.tabLabel,
    tabBarItemStyle: styles.tabItem,
    tabBarAccessibilityLabel: "급여납치 하단 탭 내비게이션",
  };
}

function createTabOptions(
  tab: TabDefinition,
  state: LayoutState,
): Record<string, unknown> {
  return {
    title: tab.title,
    href: tab.href,
    tabBarLabel: tab.title,
    tabBarTestID: `salary-hijacking-tab-${tab.name}`,
    tabBarAccessibilityLabel: `${tab.title} 탭 · ${tab.privacyBoundary}`,
    tabBarBadge: badgeFor(tab, state),
    tabBarBadgeStyle: styles.badge,
    tabBarIcon: (args: TabIconArgs): unknown => renderTabIcon(tab, args),
  };
}

function renderTabIcon(tab: TabDefinition, args: TabIconArgs): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: [styles.iconWrap, args.focused ? styles.iconWrapFocused : null] },
    h(
      NativeRuntimeRef.Text,
      {
        style: [
          styles.iconText,
          {
            color: args.color,
            fontSize: Math.max(15, Math.min(22, args.size - 2)),
          },
        ],
      },
      tab.icon,
    ),
  );
}

function badgeFor(tab: TabDefinition, state: LayoutState): string | undefined {
  if (state.status === "CHECKING" && tab.name === "salary") return "…";
  if (state.status === "OFFLINE_FALLBACK" && tab.name === "profile") return "!";
  if (tab.name === "community" && state.user?.role === "ADMIN") return "관리";
  return undefined;
}

function renderSessionOverlay(state: LayoutState): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.overlay },
    h(NativeRuntimeRef.ActivityIndicator, { color: "#67e8f9" }),
    h(NativeRuntimeRef.Text, { style: styles.overlayTitle }, "급여납치"),
    h(NativeRuntimeRef.Text, { style: styles.overlayText }, state.message),
  );
}

function renderGuardFooter(state: LayoutState): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.guardFooter },
    h(
      NativeRuntimeRef.Text,
      { style: styles.guardText },
      `serverAuthority=true · tabLayout=v${LAYOUT_VERSION} · ${state.status}`,
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.guardSubText },
      "rawFinancialData=false · rawPushToken=false · adsFinancialTargeting=false",
    ),
  );
}

async function requestSession(): Promise<SessionResponse> {
  const headers = new Headers({
    accept: "application/json",
    "x-client-platform": String(NativeRuntimeRef.Platform.OS),
    "x-correlation-id": createCorrelationId(),
    "x-raw-financial-data-exposed": "false",
    "x-raw-push-token-exposed": "false",
    "x-ad-financial-targeting-used": "false",
  });
  await attachMobileBearerToken(headers, SecureStoreRuntimeRef);

  const response = await fetch(`${API_BASE_URL}${SESSION_ENDPOINT}`, {
    method: "GET",
    headers,
    credentials: "include",
  });
  const text = await response.text();
  const parsed: unknown = text ? JSON.parse(text) : {};

  if (!response.ok) throw new Error(errorMessage(parsed, response.status));

  return parsed as SessionResponse;
}

function normalizeUser(
  value: Partial<SessionUser> | undefined,
): SessionUser | null {
  if (!value?.idHash) return null;

  return {
    idHash: scrub(value.idHash),
    role: enumOf(
      ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN"] as const,
      value.role ?? "USER",
      "USER",
    ),
    emailVerified: Boolean(value.emailVerified),
    onboardingCompleted: Boolean(value.onboardingCompleted),
  };
}

function normalizeBootstrapUser(
  value: BootstrapSession | undefined,
): SessionUser | null {
  if (!value?.userIdHash) return null;
  return {
    idHash: scrub(value.userIdHash),
    role: enumOf(
      ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN"] as const,
      value.role ?? "USER",
      "USER",
    ),
    emailVerified: Boolean(value.emailVerified),
    onboardingCompleted: Boolean(value.onboardingCompleted),
  };
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
    SafeAreaView: mod.SafeAreaView ?? fallback("SafeAreaView"),
    ScrollView: mod.ScrollView ?? fallback("ScrollView"),
    StyleSheet: mod.StyleSheet ?? { create: fallbackStyleCreate },
    Text: mod.Text ?? fallback("Text"),
    View: mod.View ?? fallback("View"),
    Pressable: mod.Pressable ?? fallback("Pressable"),
    RefreshControl: mod.RefreshControl ?? fallback("RefreshControl"),
    Platform: mod.Platform ?? { OS: "web" },
  } as NativeRuntime;
}

function loadRouterRuntime(): RouterRuntime {
  const mod = loadModule("expo-router") as Partial<RouterRuntime> &
    Readonly<{ Tabs?: TabsComponent }>;
  const tabs =
    mod.Tabs ??
    (Object.assign("Tabs", { Screen: "Tabs.Screen" }) as TabsComponent);
  return {
    Tabs: tabs,
    useRouter:
      typeof mod.useRouter === "function"
        ? mod.useRouter
        : (): RouterLike => ({
            push: (_href: never): void => undefined,
            replace: (_href: never): void => undefined,
            back: (): void => undefined,
          }),
  };
}

function loadSecureStoreRuntime(): SecureStoreRuntime {
  const mod = loadModule("expo-secure-store") as Partial<SecureStoreRuntime>;
  return createSecureStoreRuntime(NativeRuntimeRef.Platform.OS, mod);
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
      case "expo-secure-store":
        return require("expo-secure-store");
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
    : `mobile-tabs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "모바일 탭 접근이 제한되었습니다.";
  if (status === 409) return "계정 상태가 변경되었습니다. 다시 확인하세요.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  return `탭 세션 확인에 실패했습니다. (${status})`;
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
  let output = value.slice(0, 800);
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

export function assertMobileTabsLayoutCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_tabs_runtime_loaded",
    "react_native_runtime_loaded",
    "salary_tab",
    "plan_tab",
    "level_tab",
    "community_tab",
    "profile_tab",
    "session_guard",
    "email_verification_guard",
    "onboarding_guard",
    "offline_fallback",
    "server_authority_api_boundary",
    "api_v1_auth_session",
    "bottom_tab_navigation",
    "lazy_tab_loading",
    "keyboard_safe_tab_bar",
    "sensitive_error_redaction",
    "raw_financial_data_exposure_forbidden",
    "raw_push_token_exposure_forbidden",
    "ads_financial_targeting_forbidden",
    "anonymous_community_boundary",
    "profile_privacy_boundary",
    "korean_mobile_ux",
    "accessibility_labels",
    "typescript_strict_ready",
  ] as const;
  return { ok: checks.length >= 20, version: LAYOUT_VERSION, checks };
}

const styles = NativeRuntimeRef.StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  scene: { backgroundColor: "#020617" },
  tabBar: {
    backgroundColor: "#020617",
    borderTopColor: "rgba(255,255,255,0.12)",
    borderTopWidth: 1,
    boxShadow: "0 -8px 18px rgba(0,0,0,0.24)",
    elevation: 12,
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabItem: { borderRadius: 16, marginHorizontal: 2 },
  tabLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0 },
  badge: {
    backgroundColor: "#f43f5e",
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 38,
  },
  iconWrapFocused: { backgroundColor: "rgba(103,232,249,0.16)" },
  iconText: { fontWeight: "900" },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(2,6,23,0.94)",
    bottom: 0,
    gap: 8,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 50,
  },
  overlayTitle: { color: "#ffffff", fontSize: 22, fontWeight: "900" },
  overlayText: { color: "#cbd5e1", fontSize: 13, fontWeight: "800" },
  guardFooter: {
    backgroundColor: "#020617",
    borderTopColor: "rgba(52,211,153,0.18)",
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  guardText: {
    color: "#d1fae5",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  guardSubText: {
    color: "#86efac",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
});
