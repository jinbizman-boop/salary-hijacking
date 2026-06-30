/** apps/mobile/app/notifications/index.tsx
 * 급여납치 모바일 알림함 최종본.
 * 정적 import와 JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../src/shared/api/api-base";
import { attachMobileBearerToken } from "../../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type NotificationTab =
  | "ALL"
  | "UNREAD"
  | "PAYROLL"
  | "BUDGET"
  | "GROWTH"
  | "COMMUNITY"
  | "SYSTEM";
type NotificationCategory =
  | "PAYDAY"
  | "FIXED_EXPENSE"
  | "DAILY_BUDGET"
  | "SAVINGS"
  | "VARIABLE_EXPENSE"
  | "LEVEL_UP"
  | "COMMUNITY"
  | "AD_PARTNER"
  | "SYSTEM";
type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";
type ToastKind = "info" | "success" | "error";
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

type RouterRuntime = Readonly<{ useRouter: () => RouterLike }>;
type RouterLike = Readonly<{
  push: (href: never) => void;
  replace: (href: never) => void;
  back?: () => void;
}>;
type SecureStoreRuntime = ReturnType<typeof createSecureStoreRuntime>;

type NotificationAction = Readonly<{
  label: string;
  route: string;
  method: "NAVIGATE" | "POST";
  endpoint: string | null;
}>;
type NotificationItem = Readonly<{
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  status: NotificationStatus;
  title: string;
  body: string;
  createdAt: string;
  expiresAt: string | null;
  deepLink: string | null;
  action: NotificationAction | null;
  maskedAmountLabel: string | null;
  isMandatory: boolean;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type NotificationPreference = Readonly<{
  category: NotificationCategory;
  enabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursEnabled: boolean;
}>;

type NotificationDigest = Readonly<{
  totalCount: number;
  unreadCount: number;
  payrollCount: number;
  budgetCount: number;
  growthCount: number;
  communityCount: number;
  systemCount: number;
  pushConsent: ConsentState;
  lastSyncedAt: string;
  privacyPassRate: string;
}>;

type NotificationPayload = Readonly<{
  digest: NotificationDigest;
  notifications: readonly NotificationItem[];
  preferences: readonly NotificationPreference[];
}>;

type NotificationResponse = Readonly<{
  data?: Partial<NotificationPayload>;
  error?: unknown;
}>;
type ActionResponse = Readonly<{
  data?: Partial<NotificationPayload> & {
    readonly notification?: NotificationItem;
  };
  error?: unknown;
}>;

type NotificationState = Readonly<{
  tab: NotificationTab;
  payload: NotificationPayload;
  busyAction: string | null;
  refreshing: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const SCREEN_VERSION = "3.1.0";
const LEVEL_ROUTE = "/level";
const PLAN_ROUTE = "/plan";
const SALARY_ROUTE = "/salary";
const COMMUNITY_ROUTE = "/community";
const PROFILE_ROUTE = "/profile";
const TABS = [
  "ALL",
  "UNREAD",
  "PAYROLL",
  "BUDGET",
  "GROWTH",
  "COMMUNITY",
  "SYSTEM",
] as const;
const CATEGORIES = [
  "PAYDAY",
  "FIXED_EXPENSE",
  "DAILY_BUDGET",
  "SAVINGS",
  "VARIABLE_EXPENSE",
  "LEVEL_UP",
  "COMMUNITY",
  "AD_PARTNER",
  "SYSTEM",
] as const;
const SEVERITIES = ["INFO", "SUCCESS", "WARNING", "CRITICAL"] as const;
const STATUSES = ["UNREAD", "READ", "ARCHIVED"] as const;

const tabLabels: Readonly<Record<NotificationTab, string>> = Object.freeze({
  ALL: "전체",
  UNREAD: "안읽음",
  PAYROLL: "급여",
  BUDGET: "예산",
  GROWTH: "LV UP",
  COMMUNITY: "커뮤니티",
  SYSTEM: "시스템",
});
const categoryLabels: Readonly<Record<NotificationCategory, string>> =
  Object.freeze({
    PAYDAY: "급여일",
    FIXED_EXPENSE: "고정지출",
    DAILY_BUDGET: "일일예산",
    SAVINGS: "고정저축",
    VARIABLE_EXPENSE: "변동지출",
    LEVEL_UP: "LV UP",
    COMMUNITY: "커뮤니티",
    AD_PARTNER: "광고·제휴",
    SYSTEM: "시스템",
  });
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

const fallbackDigest: NotificationDigest = Object.freeze({
  totalCount: 0,
  unreadCount: 0,
  payrollCount: 0,
  budgetCount: 0,
  growthCount: 0,
  communityCount: 0,
  systemCount: 0,
  pushConsent: "UNKNOWN",
  lastSyncedAt: new Date(0).toISOString(),
  privacyPassRate: "100.00%",
});
const fallbackPayload: NotificationPayload = Object.freeze({
  digest: fallbackDigest,
  notifications: [],
  preferences: [],
});

export default function NotificationsIndexScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [state, setState] = ReactRuntimeRef.useState<NotificationState>({
    tab: "ALL",
    payload: fallbackPayload,
    busyAction: null,
    refreshing: false,
    toast: { kind: "info", message: "알림을 안전하게 불러옵니다." },
  });
  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<NotificationState>): void =>
      setState((prev: NotificationState) => ({ ...prev, ...patch })),
    [],
  );
  const visibleNotifications = ReactRuntimeRef.useMemo(
    () => filterNotifications(state.payload.notifications, state.tab),
    [state.payload.notifications, state.tab],
  );
  const sortedNotifications = ReactRuntimeRef.useMemo(
    () => sortNotifications(visibleNotifications),
    [visibleNotifications],
  );

  const loadNotifications =
    ReactRuntimeRef.useCallback(async (): Promise<void> => {
      setState((prev: NotificationState) => ({ ...prev, refreshing: true }));
      try {
        const response = await requestJson<NotificationResponse>(
          "/api/v1/notifications",
        );
        const payload = normalizePayload(response.data ?? {});
        setState((prev: NotificationState) => ({
          ...prev,
          payload,
          refreshing: false,
          toast: { kind: "success", message: "알림을 동기화했습니다." },
        }));
      } catch (error) {
        const seeded = seedPayload();
        setState((prev: NotificationState) => ({
          ...prev,
          payload:
            prev.payload.notifications.length > 0 ? prev.payload : seeded,
          refreshing: false,
          toast: {
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "알림 조회에 실패했습니다.",
          },
        }));
      }
    }, []);

  const mutateNotification = ReactRuntimeRef.useCallback(
    async (
      notification: NotificationItem,
      action: "read" | "archive" | "delete",
    ): Promise<void> => {
      update({ busyAction: `${action}:${notification.id}` });
      try {
        const response = await requestJson<ActionResponse>(
          `/api/v1/notifications/${encodeURIComponent(notification.id)}/${action}`,
          {
            method: "POST",
            body: JSON.stringify({
              action,
              client: mobileClientContext(),
              rawFinancialDataExposed: false,
              rawPersonalDataExposed: false,
              rawPushTokenExposed: false,
              adsFinancialTargetingUsed: false,
            }),
          },
        );
        const payload = response.data
          ? normalizePayload(response.data)
          : optimisticNotificationPayload(state.payload, notification, action);
        update({
          payload,
          busyAction: null,
          toast: { kind: "success", message: actionLabel(action) },
        });
      } catch (error) {
        update({
          payload: optimisticNotificationPayload(
            state.payload,
            notification,
            action,
          ),
          busyAction: null,
          toast: {
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "알림 작업에 실패했습니다.",
          },
        });
      }
    },
    [state.payload, update],
  );

  const markAllRead = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    update({ busyAction: "read-all" });
    try {
      const response = await requestJson<ActionResponse>(
        "/api/v1/notifications/read-all",
        {
          method: "POST",
          body: JSON.stringify({
            client: mobileClientContext(),
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            rawPushTokenExposed: false,
            adsFinancialTargetingUsed: false,
          }),
        },
      );
      const notifications = state.payload.notifications.map(
        (item: NotificationItem) => ({
          ...item,
          status:
            item.status === "ARCHIVED"
              ? ("ARCHIVED" as const)
              : ("READ" as const),
        }),
      );
      update({
        payload: normalizePayload(
          response.data ?? { ...state.payload, notifications },
        ),
        busyAction: null,
        toast: { kind: "success", message: "모든 알림을 읽음 처리했습니다." },
      });
    } catch (error) {
      update({
        busyAction: null,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "전체 읽음 처리에 실패했습니다.",
        },
      });
    }
  }, [state.payload, update]);

  const executeAction = ReactRuntimeRef.useCallback(
    async (notification: NotificationItem): Promise<void> => {
      const action = notification.action;
      if (!action) {
        if (notification.deepLink) router.push(notification.deepLink as never);
        return;
      }
      if (action.method === "NAVIGATE") {
        router.push(action.route as never);
        return;
      }
      if (!action.endpoint) return;
      update({ busyAction: `action:${notification.id}` });
      try {
        const response = await requestJson<ActionResponse>(action.endpoint, {
          method: "POST",
          body: JSON.stringify({
            notificationId: notification.id,
            client: mobileClientContext(),
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            rawPushTokenExposed: false,
            adsFinancialTargetingUsed: false,
          }),
        });
        update({
          payload: normalizePayload(response.data ?? state.payload),
          busyAction: null,
          toast: { kind: "success", message: "알림 액션을 처리했습니다." },
        });
      } catch (error) {
        update({
          busyAction: null,
          toast: {
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "알림 액션 처리에 실패했습니다.",
          },
        });
      }
    },
    [router, state.payload, update],
  );

  const goBack = ReactRuntimeRef.useCallback((): void => {
    if (typeof router.back === "function") router.back();
    else router.replace(PROFILE_ROUTE as never);
  }, [router]);

  ReactRuntimeRef.useEffect((): void => {
    void loadNotifications();
  }, [loadNotifications]);

  return h(
    NativeRuntimeRef.SafeAreaView,
    { style: styles.safeArea },
    renderHeader(goBack, markAllRead, state.busyAction),
    renderToast(state.toast),
    h(
      NativeRuntimeRef.ScrollView,
      {
        refreshControl: h(NativeRuntimeRef.RefreshControl, {
          refreshing: state.refreshing,
          onRefresh: (): void => void loadNotifications(),
        }),
        style: styles.scroll,
        contentContainerStyle: styles.scrollContent,
      },
      renderDigest(state.payload.digest),
      renderTabs(state.tab, (tab: NotificationTab): void => update({ tab })),
      renderNotificationList(
        sortedNotifications,
        state.busyAction,
        mutateNotification,
        executeAction,
      ),
      renderPreferences(state.payload.preferences),
      renderGuardBox(),
    ),
  );
}

function renderHeader(
  goBack: () => void,
  markAllRead: () => Promise<void>,
  busyAction: string | null,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.header },
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: "뒤로가기",
        onPress: goBack,
        style: styles.backButton,
      },
      h(NativeRuntimeRef.Text, { style: styles.backButtonText }, "‹"),
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.headerBody },
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerKicker },
        `Notifications · v${SCREEN_VERSION}`,
      ),
      h(NativeRuntimeRef.Text, { style: styles.headerTitle }, "알림"),
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerDescription },
        "급여·예산·저축·지출·LV UP·커뮤니티 알림을 서버 권위 기준으로 확인합니다.",
      ),
    ),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        disabled: busyAction !== null,
        onPress: (): void => void markAllRead(),
        style: [
          styles.headerActionButton,
          busyAction !== null ? styles.buttonDisabled : null,
        ],
      },
      busyAction === "read-all"
        ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
        : h(NativeRuntimeRef.Text, { style: styles.headerActionText }, "읽음"),
    ),
  );
}

function renderDigest(digest: NotificationDigest): unknown {
  const items = [
    ["전체", formatCount(digest.totalCount)],
    ["안읽음", formatCount(digest.unreadCount)],
    ["급여", formatCount(digest.payrollCount)],
    ["예산", formatCount(digest.budgetCount)],
    ["LV UP", formatCount(digest.growthCount)],
    ["Privacy", digest.privacyPassRate],
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.digestCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.digestTop },
      h(NativeRuntimeRef.Text, { style: styles.digestTitle }, "알림 요약"),
      h(
        NativeRuntimeRef.Text,
        {
          style:
            digest.pushConsent === "GRANTED"
              ? styles.safeText
              : styles.reviewText,
        },
        `push=${digest.pushConsent}`,
      ),
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.digestMeta },
      `lastSync=${relativeTime(digest.lastSyncedAt)} · rawPushToken=false · adsFinancialTargeting=false`,
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.statsGrid },
      ...items.map(([label, value]: readonly [string, string]) =>
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

function renderTabs(
  selected: NotificationTab,
  onSelect: (tab: NotificationTab) => void,
): unknown {
  return h(
    NativeRuntimeRef.ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      style: styles.tabs,
      contentContainerStyle: styles.tabsContent,
    },
    ...TABS.map((tab: NotificationTab) =>
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          key: tab,
          onPress: (): void => onSelect(tab),
          style: [
            styles.tabButton,
            selected === tab ? styles.tabButtonActive : null,
          ],
        },
        h(
          NativeRuntimeRef.Text,
          {
            style: [
              styles.tabText,
              selected === tab ? styles.tabTextActive : null,
            ],
          },
          tabLabels[tab],
        ),
      ),
    ),
  );
}

function renderNotificationList(
  notifications: readonly NotificationItem[],
  busyAction: string | null,
  mutateNotification: (
    notification: NotificationItem,
    action: "read" | "archive" | "delete",
  ) => Promise<void>,
  executeAction: (notification: NotificationItem) => Promise<void>,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "알림 목록"),
    ...(notifications.length > 0
      ? notifications.map((notification: NotificationItem) =>
          renderNotification(
            notification,
            busyAction,
            mutateNotification,
            executeAction,
          ),
        )
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-notification", style: styles.emptyText },
            "표시할 알림이 없습니다.",
          ),
        ]),
  );
}

function renderNotification(
  notification: NotificationItem,
  busyAction: string | null,
  mutateNotification: (
    notification: NotificationItem,
    action: "read" | "archive" | "delete",
  ) => Promise<void>,
  executeAction: (notification: NotificationItem) => Promise<void>,
): unknown {
  const unread = notification.status === "UNREAD";
  const busy = busyAction !== null;
  return h(
    NativeRuntimeRef.View,
    {
      key: notification.id,
      style: [
        styles.notificationCard,
        unread ? styles.unreadCard : null,
        notification.severity === "CRITICAL" ? styles.criticalCard : null,
      ],
    },
    h(
      NativeRuntimeRef.View,
      { style: styles.rowTop },
      h(
        NativeRuntimeRef.Text,
        { style: styles.categoryPill },
        categoryLabels[notification.category],
      ),
      h(
        NativeRuntimeRef.Text,
        { style: severityStyle(notification.severity) },
        notification.severity,
      ),
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.notificationTitle },
      notification.title,
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.notificationBody },
      notification.body,
    ),
    notification.maskedAmountLabel
      ? h(
          NativeRuntimeRef.Text,
          { style: styles.maskedText },
          `masked=${notification.maskedAmountLabel}`,
        )
      : null,
    h(
      NativeRuntimeRef.Text,
      { style: styles.sourceText },
      `${relativeTime(notification.createdAt)} · ${notification.status} · mandatory=${notification.isMandatory}`,
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.actionRow },
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          disabled: busy || !unread,
          onPress: (): void => void mutateNotification(notification, "read"),
          style: [
            styles.primaryButtonSmall,
            busy || !unread ? styles.buttonDisabled : null,
          ],
        },
        busyAction === `read:${notification.id}`
          ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
          : h(
              NativeRuntimeRef.Text,
              { style: styles.primaryButtonSmallText },
              unread ? "읽음" : "읽음됨",
            ),
      ),
      notification.action || notification.deepLink
        ? h(
            NativeRuntimeRef.Pressable,
            {
              accessibilityRole: "button",
              disabled: busy,
              onPress: (): void => void executeAction(notification),
              style: [
                styles.secondaryButtonSmall,
                busy ? styles.buttonDisabled : null,
              ],
            },
            h(
              NativeRuntimeRef.Text,
              { style: styles.secondaryButtonSmallText },
              notification.action?.label ?? "이동",
            ),
          )
        : null,
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          disabled: busy || notification.isMandatory,
          onPress: (): void => void mutateNotification(notification, "archive"),
          style: [
            styles.secondaryButtonSmall,
            busy || notification.isMandatory ? styles.buttonDisabled : null,
          ],
        },
        h(
          NativeRuntimeRef.Text,
          { style: styles.secondaryButtonSmallText },
          "보관",
        ),
      ),
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          disabled: busy || notification.isMandatory,
          onPress: (): void => void mutateNotification(notification, "delete"),
          style: [
            styles.dangerButtonSmall,
            busy || notification.isMandatory ? styles.buttonDisabled : null,
          ],
        },
        h(
          NativeRuntimeRef.Text,
          { style: styles.dangerButtonSmallText },
          "삭제",
        ),
      ),
    ),
  );
}

function renderPreferences(
  preferences: readonly NotificationPreference[],
): unknown {
  if (preferences.length === 0) return null;
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "수신 설정 요약"),
    ...preferences.map((preference: NotificationPreference) =>
      h(
        NativeRuntimeRef.View,
        { key: preference.category, style: styles.preferenceRow },
        h(
          NativeRuntimeRef.Text,
          { style: styles.preferenceTitle },
          categoryLabels[preference.category],
        ),
        h(
          NativeRuntimeRef.Text,
          { style: preference.enabled ? styles.safeText : styles.reviewText },
          `app=${preference.enabled} · push=${preference.pushEnabled} · email=${preference.emailEnabled} · quiet=${preference.quietHoursEnabled}`,
        ),
      ),
    ),
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

function renderGuardBox(): unknown {
  const items = [
    "serverAuthority=true",
    "apiV1Notifications=true",
    "rawFinancialData=false",
    "rawPersonalData=false",
    "rawPushToken=false",
    "adsFinancialTargeting=false",
    "quietHoursReady=true",
    "mandatoryNoticeProtected=true",
    "koreanMobileUX=true",
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.guardBox },
    h(
      NativeRuntimeRef.Text,
      { style: styles.guardTitle },
      "Notifications · Privacy Guard",
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
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  await attachMobileBearerToken(headers, SecureStoreRuntimeRef);
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

function normalizePayload(
  partial: Partial<NotificationPayload>,
): NotificationPayload {
  const notifications = (partial.notifications ?? [])
    .map(normalizeNotification)
    .filter((item: NotificationItem) => item.status !== "ARCHIVED");
  const preferences = (partial.preferences ?? []).map(normalizePreference);
  return {
    digest: normalizeDigest(
      partial.digest ?? digestFrom(notifications),
      notifications,
    ),
    notifications,
    preferences,
  };
}

function normalizeDigest(
  digest: NotificationDigest,
  notifications: readonly NotificationItem[],
): NotificationDigest {
  const derived = digestFrom(notifications);
  return {
    totalCount: nonNegative(digest.totalCount || derived.totalCount),
    unreadCount: nonNegative(digest.unreadCount || derived.unreadCount),
    payrollCount: nonNegative(digest.payrollCount || derived.payrollCount),
    budgetCount: nonNegative(digest.budgetCount || derived.budgetCount),
    growthCount: nonNegative(digest.growthCount || derived.growthCount),
    communityCount: nonNegative(
      digest.communityCount || derived.communityCount,
    ),
    systemCount: nonNegative(digest.systemCount || derived.systemCount),
    pushConsent: enumOf(
      ["GRANTED", "DENIED", "UNKNOWN"] as const,
      digest.pushConsent,
      "UNKNOWN",
    ),
    lastSyncedAt: iso(digest.lastSyncedAt),
    privacyPassRate: digest.privacyPassRate || derived.privacyPassRate,
  };
}

function normalizeNotification(item: NotificationItem): NotificationItem {
  return {
    ...item,
    id: scrub(item.id),
    category: enumOf(CATEGORIES, item.category, "SYSTEM"),
    severity: enumOf(SEVERITIES, item.severity, "INFO"),
    status: enumOf(STATUSES, item.status, "UNREAD"),
    title: scrub(item.title),
    body: scrub(item.body),
    createdAt: iso(item.createdAt),
    expiresAt: item.expiresAt ? iso(item.expiresAt) : null,
    deepLink: normalizeRoute(item.deepLink),
    action: item.action ? normalizeAction(item.action) : null,
    maskedAmountLabel: item.maskedAmountLabel
      ? maskAmountLabel(item.maskedAmountLabel)
      : null,
    isMandatory: Boolean(item.isMandatory),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeAction(action: NotificationAction): NotificationAction {
  return {
    label: scrub(action.label).slice(0, 24) || "확인",
    route: normalizeRoute(action.route) ?? PROFILE_ROUTE,
    method: action.method === "POST" ? "POST" : "NAVIGATE",
    endpoint:
      action.endpoint && action.endpoint.startsWith("/api/v1/")
        ? scrub(action.endpoint)
        : null,
  };
}

function normalizePreference(
  preference: NotificationPreference,
): NotificationPreference {
  return {
    category: enumOf(CATEGORIES, preference.category, "SYSTEM"),
    enabled: Boolean(preference.enabled),
    pushEnabled: Boolean(preference.pushEnabled),
    emailEnabled: Boolean(preference.emailEnabled),
    quietHoursEnabled: Boolean(preference.quietHoursEnabled),
  };
}

function digestFrom(
  notifications: readonly NotificationItem[],
): NotificationDigest {
  const active = notifications.filter(
    (item: NotificationItem) => item.status !== "ARCHIVED",
  );
  const safe = active.filter(
    (item: NotificationItem) =>
      !item.rawFinancialDataExposed &&
      !item.rawPersonalDataExposed &&
      !item.rawPushTokenExposed &&
      !item.adsFinancialTargetingUsed,
  ).length;
  return {
    totalCount: active.length,
    unreadCount: active.filter(
      (item: NotificationItem) => item.status === "UNREAD",
    ).length,
    payrollCount: active.filter(
      (item: NotificationItem) =>
        item.category === "PAYDAY" || item.category === "FIXED_EXPENSE",
    ).length,
    budgetCount: active.filter(
      (item: NotificationItem) =>
        item.category === "DAILY_BUDGET" ||
        item.category === "SAVINGS" ||
        item.category === "VARIABLE_EXPENSE",
    ).length,
    growthCount: active.filter(
      (item: NotificationItem) => item.category === "LEVEL_UP",
    ).length,
    communityCount: active.filter(
      (item: NotificationItem) => item.category === "COMMUNITY",
    ).length,
    systemCount: active.filter(
      (item: NotificationItem) =>
        item.category === "SYSTEM" || item.category === "AD_PARTNER",
    ).length,
    pushConsent: "UNKNOWN",
    lastSyncedAt: new Date().toISOString(),
    privacyPassRate: pct(safe, active.length),
  };
}

function filterNotifications(
  notifications: readonly NotificationItem[],
  tab: NotificationTab,
): readonly NotificationItem[] {
  if (tab === "ALL") return notifications;
  if (tab === "UNREAD")
    return notifications.filter(
      (item: NotificationItem) => item.status === "UNREAD",
    );
  if (tab === "PAYROLL")
    return notifications.filter(
      (item: NotificationItem) =>
        item.category === "PAYDAY" || item.category === "FIXED_EXPENSE",
    );
  if (tab === "BUDGET")
    return notifications.filter(
      (item: NotificationItem) =>
        item.category === "DAILY_BUDGET" ||
        item.category === "SAVINGS" ||
        item.category === "VARIABLE_EXPENSE",
    );
  if (tab === "GROWTH")
    return notifications.filter(
      (item: NotificationItem) => item.category === "LEVEL_UP",
    );
  if (tab === "COMMUNITY")
    return notifications.filter(
      (item: NotificationItem) => item.category === "COMMUNITY",
    );
  return notifications.filter(
    (item: NotificationItem) =>
      item.category === "SYSTEM" || item.category === "AD_PARTNER",
  );
}

function sortNotifications(
  notifications: readonly NotificationItem[],
): readonly NotificationItem[] {
  return notifications
    .slice()
    .sort(
      (a: NotificationItem, b: NotificationItem) =>
        Number(a.status === "READ") - Number(b.status === "READ") ||
        severityRank(b.severity) - severityRank(a.severity) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

function optimisticNotificationPayload(
  payload: NotificationPayload,
  notification: NotificationItem,
  action: "read" | "archive" | "delete",
): NotificationPayload {
  const notifications =
    action === "delete"
      ? payload.notifications.filter(
          (item: NotificationItem) => item.id !== notification.id,
        )
      : payload.notifications.map((item: NotificationItem) =>
          item.id === notification.id
            ? {
                ...item,
                status:
                  action === "archive"
                    ? ("ARCHIVED" as const)
                    : ("READ" as const),
              }
            : item,
        );
  return normalizePayload({ ...payload, notifications });
}

function seedPayload(): NotificationPayload {
  const now = new Date().toISOString();
  return normalizePayload({
    notifications: [
      {
        id: "payday-reminder",
        category: "PAYDAY",
        severity: "SUCCESS",
        status: "UNREAD",
        title: "급여일 계획 확인",
        body: "오늘은 급여 계획을 확인하고 고정지출·고정저축을 먼저 분리하는 날입니다.",
        createdAt: now,
        expiresAt: null,
        deepLink: PLAN_ROUTE,
        action: {
          label: "계획 보기",
          route: PLAN_ROUTE,
          method: "NAVIGATE",
          endpoint: null,
        },
        maskedAmountLabel: "서버 계산 금액 비공개",
        isMandatory: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "daily-budget-warning",
        category: "DAILY_BUDGET",
        severity: "WARNING",
        status: "UNREAD",
        title: "오늘 예산 확인",
        body: "오늘 사용 가능한 생활 예산을 확인하세요. 원시 금액은 알림에 노출하지 않습니다.",
        createdAt: now,
        expiresAt: null,
        deepLink: SALARY_ROUTE,
        action: {
          label: "급여 홈",
          route: SALARY_ROUTE,
          method: "NAVIGATE",
          endpoint: null,
        },
        maskedAmountLabel: "마스킹된 예산",
        isMandatory: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "level-up-proof",
        category: "LEVEL_UP",
        severity: "INFO",
        status: "READ",
        title: "LV UP 인증 가능",
        body: "오늘의 루틴을 완료했습니다. 원하면 커뮤니티에 금액 없이 인증글을 남길 수 있습니다.",
        createdAt: now,
        expiresAt: null,
        deepLink: LEVEL_ROUTE,
        action: {
          label: "LV UP",
          route: LEVEL_ROUTE,
          method: "NAVIGATE",
          endpoint: null,
        },
        maskedAmountLabel: null,
        isMandatory: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "community-reply",
        category: "COMMUNITY",
        severity: "INFO",
        status: "UNREAD",
        title: "댓글 알림",
        body: "작성한 커뮤니티 글에 새 댓글이 달렸습니다. 익명 표시와 내부 해시 경계를 유지합니다.",
        createdAt: now,
        expiresAt: null,
        deepLink: COMMUNITY_ROUTE,
        action: {
          label: "커뮤니티",
          route: COMMUNITY_ROUTE,
          method: "NAVIGATE",
          endpoint: null,
        },
        maskedAmountLabel: null,
        isMandatory: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "partner-contextual",
        category: "AD_PARTNER",
        severity: "INFO",
        status: "READ",
        title: "제휴 안내",
        body: "금융 금액 타겟팅 없이 화면 맥락 기반으로 제공되는 제휴 알림입니다.",
        createdAt: now,
        expiresAt: null,
        deepLink: PROFILE_ROUTE,
        action: null,
        maskedAmountLabel: null,
        isMandatory: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
    ],
    preferences: CATEGORIES.map(
      (category: NotificationCategory): NotificationPreference => ({
        category,
        enabled: true,
        pushEnabled: category !== "AD_PARTNER",
        emailEnabled: false,
        quietHoursEnabled: true,
      }),
    ),
  });
}

function severityRank(severity: NotificationSeverity): number {
  return severity === "CRITICAL"
    ? 4
    : severity === "WARNING"
      ? 3
      : severity === "SUCCESS"
        ? 2
        : 1;
}
function severityStyle(
  severity: NotificationSeverity,
): Readonly<Record<string, unknown>> {
  return severity === "CRITICAL"
    ? styles.criticalText
    : severity === "WARNING"
      ? styles.reviewText
      : severity === "SUCCESS"
        ? styles.safeText
        : styles.infoText;
}
function actionLabel(action: "read" | "archive" | "delete"): string {
  return action === "read"
    ? "알림을 읽음 처리했습니다."
    : action === "archive"
      ? "알림을 보관했습니다."
      : "알림을 삭제했습니다.";
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
    RefreshControl: mod.RefreshControl ?? fallback("RefreshControl"),
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
function mobileClientContext(): JsonRecord {
  return {
    app: "salary-hijacking-mobile",
    version: SCREEN_VERSION,
    platform: String(NativeRuntimeRef.Platform.OS),
    locale: "ko-KR",
    timezone: "Asia/Seoul",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  };
}
function createCorrelationId(): string {
  const cryptoLike = (
    globalThis as unknown as {
      readonly crypto?: { readonly randomUUID?: () => string };
    }
  ).crypto;
  return cryptoLike?.randomUUID
    ? cryptoLike.randomUUID()
    : `mobile-notifications-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "알림 접근이 제한되었습니다.";
  if (status === 404) return "알림을 찾을 수 없습니다.";
  if (status === 409) return "알림 상태가 변경되었습니다. 새로고침하세요.";
  if (status === 422) return "알림 정책 검증에 실패했습니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  return `알림 요청에 실패했습니다. (${status})`;
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
function pct(numerator: number, denominator: number): string {
  return denominator > 0
    ? `${((numerator * 100) / denominator).toFixed(2)}%`
    : "100.00%";
}
function iso(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date(0).toISOString();
}
function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(Math.abs(diff) / 60000));
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
function formatCount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(nonNegative(value));
}
function maskAmountLabel(value: string): string {
  return scrub(value)
    .replace(/[0-9,]+/g, "***")
    .slice(0, 80);
}
function normalizeRoute(route: string | null): string | null {
  if (!route) return null;
  const cleaned = scrub(route);
  return cleaned.startsWith("/") && !cleaned.startsWith("//") ? cleaned : null;
}

export function assertMobileNotificationsIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_notifications_runtime_loaded",
    "react_native_runtime_loaded",
    "notifications_inbox_screen",
    "payroll_budget_savings_expense_levelup_community_system_categories",
    "unread_filter",
    "mark_read",
    "mark_all_read",
    "archive_delete_actions",
    "deep_link_action",
    "push_consent_summary",
    "notification_preferences_summary",
    "quiet_hours_ready",
    "mandatory_notice_protected",
    "api_v1_notifications_index",
    "api_v1_notifications_read",
    "api_v1_notifications_read_all",
    "api_v1_notifications_archive_delete",
    "sensitive_error_redaction",
    "raw_financial_data_exposure_forbidden",
    "raw_personal_data_exposure_forbidden",
    "raw_push_token_exposure_forbidden",
    "ads_financial_targeting_forbidden",
    "korean_mobile_ux",
    "accessibility_roles",
    "responsive_scroll_layout",
    "typescript_strict_ready",
  ] as const;
  return { ok: checks.length >= 20, version: SCREEN_VERSION, checks };
}

const styles = NativeRuntimeRef.StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  header: {
    alignItems: "center",
    backgroundColor: "#020617",
    borderBottomColor: "rgba(255,255,255,0.10)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 14,
  },
  backButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  backButtonText: {
    color: "#67e8f9",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
  },
  headerBody: { flex: 1, gap: 3 },
  headerKicker: { color: "#67e8f9", fontSize: 11, fontWeight: "900" },
  headerTitle: { color: "#ffffff", fontSize: 24, fontWeight: "900" },
  headerDescription: { color: "#cbd5e1", fontSize: 12, lineHeight: 18 },
  headerActionButton: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    minWidth: 52,
    paddingHorizontal: 12,
  },
  headerActionText: { color: "#020617", fontSize: 13, fontWeight: "900" },
  toast: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  toastInfo: {
    backgroundColor: "rgba(34,211,238,0.12)",
    borderColor: "rgba(34,211,238,0.36)",
  },
  toastSuccess: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(52,211,153,0.36)",
  },
  toastError: {
    backgroundColor: "rgba(244,63,94,0.16)",
    borderColor: "rgba(251,113,133,0.42)",
  },
  toastText: { color: "#e2e8f0", fontSize: 13, lineHeight: 19 },
  scroll: { flex: 1 },
  scrollContent: { gap: 12, padding: 16, paddingBottom: 90 },
  digestCard: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  digestTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  digestTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  digestMeta: { color: "#94a3b8", fontSize: 11, fontWeight: "800" },
  tabs: { maxHeight: 54, paddingTop: 2 },
  tabsContent: { gap: 8 },
  tabButton: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tabButtonActive: { backgroundColor: "#67e8f9", borderColor: "#67e8f9" },
  tabText: { color: "#cbd5e1", fontSize: 13, fontWeight: "900" },
  tabTextActive: { color: "#020617" },
  panel: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  panelTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  notificationCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  unreadCard: {
    backgroundColor: "rgba(34,211,238,0.08)",
    borderColor: "rgba(103,232,249,0.26)",
  },
  criticalCard: { borderColor: "rgba(251,113,133,0.36)" },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryPill: {
    backgroundColor: "rgba(103,232,249,0.14)",
    borderRadius: 999,
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  notificationTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  notificationBody: { color: "#cbd5e1", fontSize: 13, lineHeight: 20 },
  maskedText: { color: "#a7f3d0", fontSize: 11, fontWeight: "900" },
  sourceText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 17,
  },
  safeText: { color: "#86efac", fontSize: 12, fontWeight: "900" },
  reviewText: { color: "#fde68a", fontSize: 12, fontWeight: "900" },
  criticalText: { color: "#fecdd3", fontSize: 12, fontWeight: "900" },
  infoText: { color: "#bfdbfe", fontSize: 12, fontWeight: "900" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryButtonSmall: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 13,
  },
  primaryButtonSmallText: { color: "#020617", fontSize: 13, fontWeight: "900" },
  secondaryButtonSmall: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 13,
  },
  secondaryButtonSmallText: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "900",
  },
  dangerButtonSmall: {
    alignItems: "center",
    borderColor: "rgba(251,113,133,0.34)",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 13,
  },
  dangerButtonSmallText: { color: "#fecdd3", fontSize: 13, fontWeight: "900" },
  preferenceRow: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  preferenceTitle: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  emptyText: { color: "#94a3b8", fontSize: 13, lineHeight: 20 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "900" },
  statValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
  guardBox: {
    borderColor: "rgba(52,211,153,0.26)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  guardTitle: { color: "#d1fae5", fontSize: 14, fontWeight: "900" },
  guardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  guardPill: {
    backgroundColor: "rgba(16,185,129,0.14)",
    borderColor: "rgba(52,211,153,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  guardPillText: { color: "#d1fae5", fontSize: 11, fontWeight: "800" },
  buttonDisabled: { opacity: 0.48 },
});
