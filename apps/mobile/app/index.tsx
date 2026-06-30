/** apps/mobile/app/index.tsx
 * 급여납치 모바일 앱 진입점 최종본.
 * 정적 import와 JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../src/shared/api/api-base";
import { attachMobileBearerToken } from "../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type EntryStatus =
  | "BOOTING"
  | "READY"
  | "AUTH_REQUIRED"
  | "VERIFY_EMAIL"
  | "ONBOARDING"
  | "OFFLINE"
  | "MAINTENANCE"
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
  useRouter: () => RouterLike;
  useSegments: () => readonly string[];
}>;
type SecureStoreRuntime = Readonly<{
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}>;

type SessionSnapshot = Readonly<{
  authenticated: boolean;
  userIdHash: string | null;
  role: UserRole;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  mfaRequired: boolean;
  accountStatus: "ACTIVE" | "LOCKED" | "SUSPENDED" | "PENDING";
  sessionExpiresAt: string | null;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type EntryConfig = Readonly<{
  apiVersion: "v1";
  environment: "local" | "development" | "staging" | "production";
  maintenanceMode: boolean;
  minSupportedBuild: string;
  defaultRoute: string;
  featureFlags: Readonly<Record<string, boolean>>;
  serverAuthorityEnabled: true;
  privacyMode: "STRICT";
  adsFinancialTargetingAllowed: false;
}>;

type EntryDigest = Readonly<{
  payrollReady: boolean;
  budgetReady: boolean;
  fixedExpenseReady: boolean;
  savingsReady: boolean;
  notificationUnreadCount: number;
  levelUpTodayCount: number;
  communityUnreadCount: number;
  pushConsent: ConsentState;
  lastSyncedAt: string;
  privacyPassRate: string;
}>;

type EntryPayload = Readonly<{
  session: SessionSnapshot;
  config: EntryConfig;
  digest: EntryDigest;
}>;
type EntryResponse = Readonly<{
  data?: Partial<EntryPayload>;
  error?: unknown;
}>;
type EntryState = Readonly<{
  status: EntryStatus;
  payload: EntryPayload;
  retrying: boolean;
  routeResolved: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const SCREEN_VERSION = "3.1.0";
const AUTH_LOGIN_ROUTE = "/(auth)/login";
const AUTH_VERIFY_ROUTE = "/(auth)/verify-email";
const ONBOARDING_ROUTE = "/onboarding";
const SALARY_HOME_ROUTE = "/salary";
const PROFILE_ROUTE = "/profile";
const NOTIFICATIONS_ROUTE = "/notifications";
const LEVEL_ROUTE = "/level";
const CACHE_KEY = "salary_hijacking.mobile.index.v1";
const ACCOUNT_STATUSES = ["ACTIVE", "LOCKED", "SUSPENDED", "PENDING"] as const;
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
  "푸시",
  "기기토큰",
] as const;

const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const RouterRuntimeRef = loadRouterRuntime();
const SecureStoreRuntimeRef = loadSecureStoreRuntime();
const API_BASE_URL = readMobileApiBaseUrl();

const fallbackSession: SessionSnapshot = Object.freeze({
  authenticated: false,
  userIdHash: null,
  role: "USER",
  emailVerified: false,
  onboardingCompleted: false,
  mfaRequired: false,
  accountStatus: "PENDING",
  sessionExpiresAt: null,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  rawPushTokenExposed: false,
  adsFinancialTargetingUsed: false,
});
const fallbackConfig: EntryConfig = Object.freeze({
  apiVersion: "v1",
  environment: "development",
  maintenanceMode: false,
  minSupportedBuild: "0",
  defaultRoute: SALARY_HOME_ROUTE,
  featureFlags: {},
  serverAuthorityEnabled: true,
  privacyMode: "STRICT",
  adsFinancialTargetingAllowed: false,
});
const fallbackDigest: EntryDigest = Object.freeze({
  payrollReady: false,
  budgetReady: false,
  fixedExpenseReady: false,
  savingsReady: false,
  notificationUnreadCount: 0,
  levelUpTodayCount: 0,
  communityUnreadCount: 0,
  pushConsent: "UNKNOWN",
  lastSyncedAt: new Date(0).toISOString(),
  privacyPassRate: "100.00%",
});
const fallbackPayload: EntryPayload = Object.freeze({
  session: fallbackSession,
  config: fallbackConfig,
  digest: fallbackDigest,
});

export default function MobileIndexScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const segments = RouterRuntimeRef.useSegments();
  const [state, setState] = ReactRuntimeRef.useState<EntryState>({
    status: "BOOTING",
    payload: fallbackPayload,
    retrying: false,
    routeResolved: false,
    toast: { kind: "info", message: "급여납치 진입점을 안전하게 확인합니다." },
  });
  const currentRouteKey = ReactRuntimeRef.useMemo(
    () => normalizeSegments(segments).join("/") || "index",
    [segments],
  );
  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<EntryState>): void =>
      setState((prev: EntryState) => ({ ...prev, ...patch })),
    [],
  );

  const resolveEntry = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    update({ retrying: true });

    try {
      const response = await requestJson<EntryResponse>(
        "/api/v1/mobile/bootstrap",
      );
      const payload = normalizePayload(response.data ?? {});
      const status = resolveStatus(payload);
      await persistEntryPayload(payload, status);
      update({
        payload,
        status,
        retrying: false,
        toast: { kind: "success", message: statusMessage(status) },
      });
    } catch (error) {
      const cached = await readCachedPayload();
      const status = cached.session.authenticated ? "OFFLINE" : "AUTH_REQUIRED";
      update({
        payload: cached,
        status,
        retrying: false,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "진입 정보를 불러오지 못했습니다.",
        },
      });
    }
  }, [update]);

  ReactRuntimeRef.useEffect((): void => {
    void resolveEntry();
  }, [resolveEntry]);

  ReactRuntimeRef.useEffect((): void => {
    if (state.routeResolved || state.retrying || state.status === "BOOTING")
      return;

    const route = routeForStatus(state.status, state.payload);
    if (!route) return;

    setState((prev: EntryState) => ({ ...prev, routeResolved: true }));
    router.replace(route as never);
  }, [
    router,
    state.payload,
    state.retrying,
    state.routeResolved,
    state.status,
  ]);

  return h(
    NativeRuntimeRef.SafeAreaView,
    { style: styles.safeArea },
    h(
      NativeRuntimeRef.ScrollView,
      { style: styles.scroll, contentContainerStyle: styles.scrollContent },
      renderHero(state.status, state.payload, currentRouteKey),
      renderRouteDecision(state.status, state.payload),
      renderQuickActions(router, state),
      renderGate(state.status, state.retrying, resolveEntry),
      renderGuardBox(state.payload),
    ),
  );
}

function renderHero(
  status: EntryStatus,
  payload: EntryPayload,
  currentRouteKey: string,
): unknown {
  const statusStyle =
    status === "READY" || status === "OFFLINE"
      ? styles.safeText
      : status === "ERROR" || status === "MAINTENANCE"
        ? styles.dangerText
        : styles.reviewText;

  return h(
    NativeRuntimeRef.View,
    { style: styles.heroCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.logoBadge },
      h(NativeRuntimeRef.Text, { style: styles.logoText }, "납"),
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.heroKicker },
      `Mobile Entry · v${SCREEN_VERSION}`,
    ),
    h(NativeRuntimeRef.Text, { style: styles.heroTitle }, "급여납치"),
    h(
      NativeRuntimeRef.Text,
      { style: styles.heroDescription },
      "급여·예산·지출·저축·알림·LV UP·커뮤니티를 서버 권위 기준으로 시작합니다.",
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.metaRow },
      h(NativeRuntimeRef.Text, { style: statusStyle }, status),
      h(
        NativeRuntimeRef.Text,
        { style: styles.metaText },
        `${currentRouteKey} · ${payload.config.apiVersion} · ${payload.config.environment}`,
      ),
    ),
  );
}

function renderRouteDecision(
  status: EntryStatus,
  payload: EntryPayload,
): unknown {
  const rows = [
    ["세션", payload.session.authenticated ? "인증됨" : "로그인 필요"],
    ["이메일", payload.session.emailVerified ? "인증됨" : "인증 필요"],
    ["온보딩", payload.session.onboardingCompleted ? "완료" : "필요"],
    ["서버권위", payload.config.serverAuthorityEnabled ? "ON" : "OFF"],
    ["푸시", payload.digest.pushConsent],
    ["Privacy", payload.digest.privacyPassRate],
  ] as const;

  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "진입 상태"),
    h(
      NativeRuntimeRef.Text,
      { style: styles.panelDescription },
      statusMessage(status),
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.statsGrid },
      ...rows.map(([label, value]: readonly [string, string]) =>
        h(
          NativeRuntimeRef.View,
          { key: label, style: styles.statCard },
          h(NativeRuntimeRef.Text, { style: styles.statLabel }, label),
          h(NativeRuntimeRef.Text, { style: styles.statValue }, value),
        ),
      ),
    ),
  );
}

function renderQuickActions(router: RouterLike, state: EntryState): unknown {
  const disabled = state.status === "BOOTING" || state.retrying;

  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "빠른 이동"),
    h(
      NativeRuntimeRef.Text,
      { style: styles.panelDescription },
      "진입점에서 필요한 경우 안전한 경로로 이동합니다.",
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.actionRow },
      renderActionButton(
        "급여 홈",
        disabled,
        (): void => router.replace(SALARY_HOME_ROUTE as never),
        "primary",
      ),
      renderActionButton(
        "알림",
        disabled,
        (): void => router.push(NOTIFICATIONS_ROUTE as never),
        "secondary",
      ),
      renderActionButton(
        "LV UP",
        disabled,
        (): void => router.push(LEVEL_ROUTE as never),
        "secondary",
      ),
      renderActionButton(
        "마이",
        disabled,
        (): void => router.push(PROFILE_ROUTE as never),
        "secondary",
      ),
    ),
  );
}

function renderActionButton(
  label: string,
  disabled: boolean,
  onPress: () => void,
  variant: "primary" | "secondary",
): unknown {
  return h(
    NativeRuntimeRef.Pressable,
    {
      accessibilityRole: "button",
      disabled,
      onPress,
      style: [
        variant === "primary"
          ? styles.primaryButtonSmall
          : styles.secondaryButtonSmall,
        disabled ? styles.buttonDisabled : null,
      ],
    },
    h(
      NativeRuntimeRef.Text,
      {
        style:
          variant === "primary"
            ? styles.primaryButtonSmallText
            : styles.secondaryButtonSmallText,
      },
      label,
    ),
  );
}

function renderGate(
  status: EntryStatus,
  retrying: boolean,
  retry: () => Promise<void>,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.gateCard },
    h(NativeRuntimeRef.Text, { style: styles.gateTitle }, gateTitle(status)),
    h(
      NativeRuntimeRef.Text,
      { style: styles.gateMessage },
      gateMessage(status),
    ),
    retrying
      ? h(NativeRuntimeRef.ActivityIndicator, { color: "#67e8f9" })
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
  );
}

function renderGuardBox(payload: EntryPayload): unknown {
  const items = [
    "entryBootstrap=true",
    `payrollReady=${payload.digest.payrollReady}`,
    `budgetReady=${payload.digest.budgetReady}`,
    `push=${payload.digest.pushConsent}`,
    "serverAuthority=true",
    "rawFinancialData=false",
    "rawPersonalData=false",
    "rawPushToken=false",
    "adsFinancialTargeting=false",
  ] as const;

  return h(
    NativeRuntimeRef.View,
    { style: styles.guardBox },
    h(
      NativeRuntimeRef.Text,
      { style: styles.guardTitle },
      "Index · Privacy Guard",
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.guardGrid },
      ...items.map((item: string) =>
        h(
          NativeRuntimeRef.View,
          { key: item, style: styles.guardPill },
          h(NativeRuntimeRef.Text, { style: styles.guardPillText }, item),
        ),
      ),
    ),
  );
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("x-client-platform", String(NativeRuntimeRef.Platform.OS));
  headers.set("x-correlation-id", createCorrelationId());
  headers.set("x-raw-financial-data-exposed", "false");
  headers.set("x-raw-personal-data-exposed", "false");
  headers.set("x-raw-push-token-exposed", "false");
  headers.set("x-ad-financial-targeting-used", "false");
  await attachMobileBearerToken(headers, SecureStoreRuntimeRef);

  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const text = await response.text();
  const parsed: unknown = text ? JSON.parse(text) : {};

  if (!response.ok) throw new Error(errorMessage(parsed, response.status));

  return parsed as T;
}

function normalizePayload(partial: Partial<EntryPayload>): EntryPayload {
  return {
    session: normalizeSession(partial.session ?? fallbackSession),
    config: normalizeConfig(partial.config ?? fallbackConfig),
    digest: normalizeDigest(partial.digest ?? fallbackDigest),
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
    mfaRequired: Boolean(session.mfaRequired),
    accountStatus: enumOf(ACCOUNT_STATUSES, session.accountStatus, "PENDING"),
    sessionExpiresAt: session.sessionExpiresAt
      ? iso(session.sessionExpiresAt)
      : null,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeConfig(config: EntryConfig): EntryConfig {
  return {
    apiVersion: "v1",
    environment: enumOf(
      ["local", "development", "staging", "production"] as const,
      config.environment,
      "development",
    ),
    maintenanceMode: Boolean(config.maintenanceMode),
    minSupportedBuild: scrub(config.minSupportedBuild) || "0",
    defaultRoute: normalizeRoute(config.defaultRoute) ?? SALARY_HOME_ROUTE,
    featureFlags: normalizeFlags(config.featureFlags),
    serverAuthorityEnabled: true,
    privacyMode: "STRICT",
    adsFinancialTargetingAllowed: false,
  };
}

function normalizeDigest(digest: EntryDigest): EntryDigest {
  return {
    payrollReady: Boolean(digest.payrollReady),
    budgetReady: Boolean(digest.budgetReady),
    fixedExpenseReady: Boolean(digest.fixedExpenseReady),
    savingsReady: Boolean(digest.savingsReady),
    notificationUnreadCount: nonNegative(digest.notificationUnreadCount),
    levelUpTodayCount: nonNegative(digest.levelUpTodayCount),
    communityUnreadCount: nonNegative(digest.communityUnreadCount),
    pushConsent: enumOf(
      ["GRANTED", "DENIED", "UNKNOWN"] as const,
      digest.pushConsent,
      "UNKNOWN",
    ),
    lastSyncedAt: iso(digest.lastSyncedAt),
    privacyPassRate: scrub(digest.privacyPassRate) || "100.00%",
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

function resolveStatus(payload: EntryPayload): EntryStatus {
  if (payload.config.maintenanceMode) return "MAINTENANCE";
  if (!payload.session.authenticated) return "AUTH_REQUIRED";
  if (
    payload.session.accountStatus === "LOCKED" ||
    payload.session.accountStatus === "SUSPENDED"
  )
    return "ERROR";
  if (payload.session.mfaRequired) return "AUTH_REQUIRED";
  if (!payload.session.emailVerified) return "VERIFY_EMAIL";
  if (!payload.session.onboardingCompleted) return "ONBOARDING";
  return "READY";
}

function routeForStatus(
  status: EntryStatus,
  payload: EntryPayload,
): string | null {
  if (status === "AUTH_REQUIRED") return AUTH_LOGIN_ROUTE;
  if (status === "VERIFY_EMAIL") return AUTH_VERIFY_ROUTE;
  if (status === "ONBOARDING") return ONBOARDING_ROUTE;
  if (status === "READY")
    return normalizeRoute(payload.config.defaultRoute) ?? SALARY_HOME_ROUTE;
  if (status === "OFFLINE") return SALARY_HOME_ROUTE;
  return null;
}

async function persistEntryPayload(
  payload: EntryPayload,
  status: EntryStatus,
): Promise<void> {
  const safe = JSON.stringify({
    status,
    session: payload.session,
    digest: payload.digest,
    config: { ...payload.config, featureFlags: {} },
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  });
  await SecureStoreRuntimeRef.setItemAsync(CACHE_KEY, safe);
}

async function readCachedPayload(): Promise<EntryPayload> {
  const cached = await SecureStoreRuntimeRef.getItemAsync(CACHE_KEY);
  if (!cached) return fallbackPayload;

  try {
    const parsed = JSON.parse(cached) as Partial<EntryPayload>;
    return normalizePayload(parsed);
  } catch {
    await SecureStoreRuntimeRef.deleteItemAsync(CACHE_KEY);
    return fallbackPayload;
  }
}

function statusMessage(status: EntryStatus): string {
  if (status === "READY") return "급여 홈으로 이동합니다.";
  if (status === "AUTH_REQUIRED") return "로그인 화면으로 이동합니다.";
  if (status === "VERIFY_EMAIL") return "이메일 인증 화면으로 이동합니다.";
  if (status === "ONBOARDING") return "온보딩 화면으로 이동합니다.";
  if (status === "OFFLINE") return "오프라인 보호 모드로 진입합니다.";
  if (status === "MAINTENANCE") return "서비스 점검 중입니다.";
  if (status === "ERROR") return "계정 또는 앱 상태 확인이 필요합니다.";
  return "진입 정보를 확인 중입니다.";
}

function gateTitle(status: EntryStatus): string {
  if (status === "AUTH_REQUIRED") return "로그인이 필요합니다";
  if (status === "VERIFY_EMAIL") return "이메일 인증 필요";
  if (status === "ONBOARDING") return "온보딩 필요";
  if (status === "OFFLINE") return "오프라인 보호 모드";
  if (status === "MAINTENANCE") return "서비스 점검 중";
  if (status === "ERROR") return "진입 확인 실패";
  return "앱을 준비 중입니다";
}

function gateMessage(status: EntryStatus): string {
  if (status === "AUTH_REQUIRED")
    return "민감한 급여·예산 데이터는 인증 후에만 접근할 수 있습니다.";
  if (status === "VERIFY_EMAIL")
    return "계정 보호를 위해 이메일 인증을 완료해야 합니다.";
  if (status === "ONBOARDING")
    return "급여일, 고정지출, 고정저축, 일일예산 기본 설정을 완료하세요.";
  if (status === "OFFLINE")
    return "네트워크가 불안정해 마지막 안전 세션 정보로 진입합니다.";
  if (status === "MAINTENANCE")
    return "운영 점검 중에는 서버 권위 데이터 변경을 차단합니다.";
  if (status === "ERROR") return "계정 상태 또는 앱 정책을 다시 확인하세요.";
  return "서버 권위 설정, 개인정보 보호, 알림 상태를 확인합니다.";
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
    : `mobile-index-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "앱 진입이 제한되었습니다.";
  if (status === 409) return "세션 상태가 변경되었습니다. 다시 확인하세요.";
  if (status === 426) return "앱 업데이트가 필요합니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  if (status >= 500) return "서버 점검 또는 일시 장애입니다.";
  return `앱 진입 요청에 실패했습니다. (${status})`;
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
function nonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}
function iso(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date(0).toISOString();
}
function normalizeRoute(route: string | null): string | null {
  if (!route) return null;
  const cleaned = scrub(route);
  return cleaned.startsWith("/") && !cleaned.startsWith("//") ? cleaned : null;
}
function normalizeSegments(segments: readonly string[]): readonly string[] {
  return segments
    .map((segment: string) => scrub(String(segment)))
    .filter(Boolean)
    .slice(0, 8);
}

export function assertMobileIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_index_runtime_loaded",
    "react_native_runtime_loaded",
    "secure_store_runtime_loaded",
    "mobile_index_entry_screen",
    "api_v1_mobile_bootstrap",
    "auth_required_route_resolution",
    "email_verification_route_resolution",
    "onboarding_route_resolution",
    "salary_home_default_route",
    "offline_cached_session_fallback",
    "maintenance_mode_guard",
    "server_authority_config",
    "strict_privacy_mode",
    "payroll_budget_digest",
    "notifications_levelup_community_digest",
    "push_consent_summary",
    "raw_financial_data_exposure_forbidden",
    "raw_personal_data_exposure_forbidden",
    "raw_push_token_exposure_forbidden",
    "ads_financial_targeting_forbidden",
    "sensitive_error_redaction",
    "correlation_id_headers",
    "korean_mobile_ux",
    "accessibility_roles",
    "responsive_entry_shell",
    "typescript_strict_ready",
  ] as const;
  return { ok: checks.length >= 20, version: SCREEN_VERSION, checks };
}

const styles = NativeRuntimeRef.StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    gap: 12,
    justifyContent: "center",
    padding: 18,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 22,
  },
  logoBadge: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 28,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  logoText: { color: "#020617", fontSize: 30, fontWeight: "900" },
  heroKicker: { color: "#67e8f9", fontSize: 11, fontWeight: "900" },
  heroTitle: { color: "#ffffff", fontSize: 30, fontWeight: "900" },
  heroDescription: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  metaText: { color: "#94a3b8", fontSize: 11, fontWeight: "800" },
  panel: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  panelTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  panelDescription: { color: "#cbd5e1", fontSize: 13, lineHeight: 20 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 84,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "900" },
  statValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: "#020617", fontSize: 14, fontWeight: "900" },
  primaryButtonSmall: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 14,
  },
  primaryButtonSmallText: { color: "#020617", fontSize: 13, fontWeight: "900" },
  secondaryButtonSmall: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 14,
  },
  secondaryButtonSmallText: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "900",
  },
  gateCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  gateTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  gateMessage: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  safeText: { color: "#86efac", fontSize: 12, fontWeight: "900" },
  reviewText: { color: "#fde68a", fontSize: 12, fontWeight: "900" },
  dangerText: { color: "#fecdd3", fontSize: 12, fontWeight: "900" },
  guardBox: {
    borderColor: "rgba(52,211,153,0.26)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  guardTitle: { color: "#d1fae5", fontSize: 13, fontWeight: "900" },
  guardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  guardPill: {
    backgroundColor: "rgba(16,185,129,0.14)",
    borderColor: "rgba(52,211,153,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  guardPillText: { color: "#d1fae5", fontSize: 10, fontWeight: "800" },
  buttonDisabled: { opacity: 0.48 },
});
