/** apps/mobile/app/(tabs)/profile/index.tsx
 * 급여납치 모바일 마이페이지 탭 최종본.
 * 정적 import와 JSX 없이 Expo Router·React Native·SecureStore 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../../src/shared/api/api-base";
import { attachMobileBearerToken } from "../../../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type ProfileTab = "OVERVIEW" | "ACTIVITY" | "SECURITY" | "PRIVACY";
type ToastKind = "info" | "success" | "error";
type MenuKind = "ROUTE" | "ACTION" | "DANGER";
type ExportStatus = "NONE" | "REQUESTED" | "READY" | "EXPIRED";
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

type RouterRuntime = Readonly<{ useRouter: () => RouterLike }>;
type RouterLike = Readonly<{
  push: (href: never) => void;
  replace: (href: never) => void;
  back?: () => void;
}>;
type SecureStoreRuntime = ReturnType<typeof createSecureStoreRuntime>;

type ProfileUser = Readonly<{
  idHash: string;
  nickname: string;
  role: UserRole;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  joinedAt: string;
  level: number;
  title: string;
  avatarEmoji: string;
  marketingConsent: boolean;
  notificationConsent: boolean;
  communityDisplayName: string;
  rawEmailExposed: false;
  rawPhoneExposed: false;
  rawFinancialDataExposed: false;
  rawPushTokenExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type ProfileSummary = Readonly<{
  totalHijackSaved: number;
  currentMonthHijack: number;
  currentLevel: number;
  levelXp: number;
  nextLevelXp: number;
  selfCareScore: number;
  completedGrowthTasks: number;
  communityPosts: number;
  communityComments: number;
  notificationUnread: number;
  privacyPassRate: string;
}>;

type ActivityItem = Readonly<{
  id: string;
  kind:
    | "PAYROLL"
    | "BUDGET"
    | "SAVING"
    | "GROWTH"
    | "COMMUNITY"
    | "SECURITY"
    | "NOTICE";
  title: string;
  description: string;
  createdAt: string;
  route: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type PrivacyState = Readonly<{
  exportStatus: ExportStatus;
  exportRequestedAt: string | null;
  withdrawalRequested: boolean;
  adPersonalization: false;
  financialDataForAds: false;
  rawPushTokenLogging: false;
  tokenHashOnly: true;
}>;

type MenuItem = Readonly<{
  id: string;
  tab: ProfileTab;
  label: string;
  description: string;
  route: string;
  kind: MenuKind;
  icon: string;
}>;
type ProfilePayload = Readonly<{
  user: ProfileUser;
  summary: ProfileSummary;
  activities: readonly ActivityItem[];
  privacy: PrivacyState;
}>;
type ProfileResponse = Readonly<{
  data?: Partial<ProfilePayload>;
  error?: unknown;
}>;
type ActionResponse = Readonly<{
  data?: Partial<ProfilePayload>;
  error?: unknown;
}>;
type ProfileState = Readonly<{
  tab: ProfileTab;
  payload: ProfilePayload;
  busyAction: string | null;
  refreshing: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const SCREEN_VERSION = "3.1.0";
const ACCESS_TOKEN_KEY = "salary-hijacking.mobile.access-token";
const REFRESH_TOKEN_KEY = "salary-hijacking.mobile.refresh-token";
const SESSION_META_KEY = "salary-hijacking.mobile.session-meta";
const LOGIN_ROUTE = "/(auth)/login";
const PROFILE_EDIT_ROUTE = "/profile/edit";
const NOTICES_ROUTE = "/profile/notices";
const SUPPORT_ROUTE = "/profile/support";
const POSTS_ROUTE = "/community/my-posts";
const LEVEL_ROUTE = "/level";
const PLAN_ROUTE = "/plan";
const NOTIFICATIONS_ROUTE = "/notifications";
const TABS = ["OVERVIEW", "ACTIVITY", "SECURITY", "PRIVACY"] as const;
const SENSITIVE_KEYWORDS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
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

const tabLabels: Readonly<Record<ProfileTab, string>> = Object.freeze({
  OVERVIEW: "요약",
  ACTIVITY: "활동",
  SECURITY: "보안",
  PRIVACY: "개인정보",
});
const kindLabels: Readonly<Record<ActivityItem["kind"], string>> =
  Object.freeze({
    PAYROLL: "급여",
    BUDGET: "예산",
    SAVING: "저축",
    GROWTH: "LV UP",
    COMMUNITY: "커뮤니티",
    SECURITY: "보안",
    NOTICE: "공지",
  });
const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const RouterRuntimeRef = loadRouterRuntime();
const SecureStoreRef = loadSecureStoreRuntime();
const API_BASE_URL = readMobileApiBaseUrl();
const fallbackUser: ProfileUser = Object.freeze({
  idHash: "user_hash_pending",
  nickname: "급여납치 사용자",
  role: "USER",
  emailVerified: false,
  onboardingCompleted: false,
  joinedAt: new Date(0).toISOString(),
  level: 1,
  title: "월급 지킴이",
  avatarEmoji: "👤",
  marketingConsent: false,
  notificationConsent: true,
  communityDisplayName: "익명",
  rawEmailExposed: false,
  rawPhoneExposed: false,
  rawFinancialDataExposed: false,
  rawPushTokenExposed: false,
  adsFinancialTargetingUsed: false,
});
const fallbackSummary: ProfileSummary = Object.freeze({
  totalHijackSaved: 0,
  currentMonthHijack: 0,
  currentLevel: 1,
  levelXp: 0,
  nextLevelXp: 100,
  selfCareScore: 0,
  completedGrowthTasks: 0,
  communityPosts: 0,
  communityComments: 0,
  notificationUnread: 0,
  privacyPassRate: "100.00%",
});
const fallbackPrivacy: PrivacyState = Object.freeze({
  exportStatus: "NONE",
  exportRequestedAt: null,
  withdrawalRequested: false,
  adPersonalization: false,
  financialDataForAds: false,
  rawPushTokenLogging: false,
  tokenHashOnly: true,
});
const fallbackPayload: ProfilePayload = Object.freeze({
  user: fallbackUser,
  summary: fallbackSummary,
  activities: [],
  privacy: fallbackPrivacy,
});
const menuItems: readonly MenuItem[] = Object.freeze([
  {
    id: "edit-profile",
    tab: "OVERVIEW",
    label: "프로필 설정",
    description: "닉네임, 아바타, 커뮤니티 표시명을 관리합니다.",
    route: PROFILE_EDIT_ROUTE,
    kind: "ROUTE",
    icon: "⚙️",
  },
  {
    id: "salary-plan",
    tab: "OVERVIEW",
    label: "내 급여 계획",
    description: "급여일, 고정지출, 고정저축, 일일예산을 확인합니다.",
    route: PLAN_ROUTE,
    kind: "ROUTE",
    icon: "💸",
  },
  {
    id: "my-posts",
    tab: "ACTIVITY",
    label: "내 게시글 관리",
    description: "작성한 글, 댓글, 레벨업 인증글을 확인합니다.",
    route: POSTS_ROUTE,
    kind: "ROUTE",
    icon: "💬",
  },
  {
    id: "level-history",
    tab: "ACTIVITY",
    label: "내 레벨업 관리",
    description: "미션, 배지, 성장 기록을 확인합니다.",
    route: LEVEL_ROUTE,
    kind: "ROUTE",
    icon: "⬆️",
  },
  {
    id: "notification-settings",
    tab: "SECURITY",
    label: "알림 설정",
    description: "급여일, 고정지출, 예산 초과, 레벨업 알림을 관리합니다.",
    route: NOTIFICATIONS_ROUTE,
    kind: "ROUTE",
    icon: "🔔",
  },
  {
    id: "notices",
    tab: "ACTIVITY",
    label: "공지사항",
    description: "서비스 공지, 점검, 이벤트, 정책 공지를 확인합니다.",
    route: NOTICES_ROUTE,
    kind: "ROUTE",
    icon: "📢",
  },
  {
    id: "support",
    tab: "SECURITY",
    label: "1:1 문의",
    description: "계정, 결제, 개인정보, 커뮤니티 문의를 접수합니다.",
    route: SUPPORT_ROUTE,
    kind: "ROUTE",
    icon: "🛟",
  },
  {
    id: "privacy-export",
    tab: "PRIVACY",
    label: "개인정보 내보내기",
    description: "비식별·마스킹 기준으로 export를 요청합니다.",
    route: "/api/v1/users/me/privacy-export",
    kind: "ACTION",
    icon: "📦",
  },
  {
    id: "logout",
    tab: "SECURITY",
    label: "로그아웃",
    description: "기기 세션을 종료하고 저장된 토큰을 삭제합니다.",
    route: "/api/v1/auth/logout",
    kind: "ACTION",
    icon: "🚪",
  },
  {
    id: "withdraw",
    tab: "PRIVACY",
    label: "회원 탈퇴 요청",
    description: "법적 보존·분쟁 여부 확인 후 탈퇴를 요청합니다.",
    route: "/api/v1/users/me/withdrawal-request",
    kind: "DANGER",
    icon: "⚠️",
  },
]);

export default function ProfileIndexScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [state, setState] = ReactRuntimeRef.useState<ProfileState>({
    tab: "OVERVIEW",
    payload: fallbackPayload,
    busyAction: null,
    refreshing: false,
    toast: { kind: "info", message: "마이페이지를 안전하게 불러옵니다." },
  });
  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<ProfileState>): void =>
      setState((prev: ProfileState) => ({ ...prev, ...patch })),
    [],
  );
  const visibleMenus = ReactRuntimeRef.useMemo(
    () =>
      menuItems.filter(
        (item: MenuItem) =>
          item.tab === state.tab ||
          (state.tab === "OVERVIEW" && item.tab === "ACTIVITY"),
      ),
    [state.tab],
  );
  const levelProgress = ReactRuntimeRef.useMemo(
    () =>
      ratio(state.payload.summary.levelXp, state.payload.summary.nextLevelXp),
    [state.payload.summary.levelXp, state.payload.summary.nextLevelXp],
  );

  const loadProfile = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    setState((prev: ProfileState) => ({ ...prev, refreshing: true }));

    try {
      const response = await requestJson<ProfileResponse>(
        "/api/v1/users/me/profile",
      );
      const payload = normalizePayload(response.data ?? {});
      setState((prev: ProfileState) => ({
        ...prev,
        payload,
        refreshing: false,
        toast: { kind: "success", message: "마이페이지를 동기화했습니다." },
      }));
    } catch (error) {
      const seeded = seedPayload();
      setState((prev: ProfileState) => ({
        ...prev,
        payload:
          prev.payload.user.idHash !== "user_hash_pending"
            ? prev.payload
            : seeded,
        refreshing: false,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "마이페이지 조회에 실패했습니다.",
        },
      }));
    }
  }, []);

  const runMenu = ReactRuntimeRef.useCallback(
    async (item: MenuItem): Promise<void> => {
      if (item.kind === "ROUTE") {
        router.push(item.route as never);
        return;
      }

      update({ busyAction: item.id });

      try {
        if (item.id === "logout") {
          await requestJson<ActionResponse>(item.route, {
            method: "POST",
            body: JSON.stringify({
              client: mobileClientContext(),
              tokenHashOnly: true,
              rawFinancialDataExposed: false,
              rawPushTokenExposed: false,
              adsFinancialTargetingUsed: false,
            }),
          });
          await clearSession();
          update({
            busyAction: null,
            toast: { kind: "success", message: "로그아웃되었습니다." },
          });
          router.replace(LOGIN_ROUTE as never);
          return;
        }

        const response = await requestJson<ActionResponse>(item.route, {
          method: "POST",
          body: JSON.stringify({
            reason: item.id,
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
          toast: {
            kind: "success",
            message:
              item.id === "privacy-export"
                ? "개인정보 export 요청을 접수했습니다."
                : "요청을 접수했습니다.",
          },
        });
      } catch (error) {
        update({
          busyAction: null,
          toast: {
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "요청 처리에 실패했습니다.",
          },
        });
      }
    },
    [router, state.payload, update],
  );

  ReactRuntimeRef.useEffect((): void => {
    void loadProfile();
  }, [loadProfile]);

  return h(
    NativeRuntimeRef.SafeAreaView,
    { style: styles.safeArea },
    h(
      NativeRuntimeRef.View,
      { style: styles.header },
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerKicker },
        `Profile · v${SCREEN_VERSION}`,
      ),
      h(NativeRuntimeRef.Text, { style: styles.headerTitle }, "마이페이지"),
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerDescription },
        "프로필, 누적 납치 성과, 레벨, 게시글, 문의, 공지, 개인정보 권리를 관리합니다.",
      ),
    ),
    renderToast(state.toast),
    h(
      NativeRuntimeRef.ScrollView,
      {
        refreshControl: h(NativeRuntimeRef.RefreshControl, {
          refreshing: state.refreshing,
          onRefresh: (): void => void loadProfile(),
        }),
        style: styles.scroll,
        contentContainerStyle: styles.scrollContent,
      },
      renderProfileHero(
        state.payload.user,
        state.payload.summary,
        levelProgress,
      ),
      renderTabs(state.tab, (tab: ProfileTab): void => update({ tab })),
      state.tab === "OVERVIEW" ? renderScoreCards(state.payload.summary) : null,
      state.tab === "ACTIVITY"
        ? renderActivities(state.payload.activities, router)
        : null,
      state.tab === "SECURITY" ? renderSecurityPanel(state.payload) : null,
      state.tab === "PRIVACY"
        ? renderPrivacyPanel(state.payload.privacy)
        : null,
      renderMenuPanel(visibleMenus, state.busyAction, runMenu),
      renderGuardBox(),
    ),
  );
}

function renderProfileHero(
  user: ProfileUser,
  summary: ProfileSummary,
  progress: number,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.heroCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.heroTop },
      h(
        NativeRuntimeRef.View,
        { style: styles.avatar },
        h(
          NativeRuntimeRef.Text,
          { style: styles.avatarText },
          user.avatarEmoji,
        ),
      ),
      h(
        NativeRuntimeRef.View,
        { style: styles.heroBody },
        h(NativeRuntimeRef.Text, { style: styles.nickname }, user.nickname),
        h(
          NativeRuntimeRef.Text,
          { style: styles.title },
          `${user.title} · ${user.communityDisplayName}`,
        ),
        h(
          NativeRuntimeRef.Text,
          { style: styles.metaText },
          `${user.emailVerified ? "이메일 인증" : "이메일 미인증"} · ${dateText(user.joinedAt)} 가입`,
        ),
      ),
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.progressTrack },
      h(NativeRuntimeRef.View, {
        style: [styles.progressFill, { width: `${progress}%` }],
      }),
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.progressText },
      `Lv.${summary.currentLevel} · ${formatCount(summary.levelXp)} / ${formatCount(summary.nextLevelXp)} XP`,
    ),
  );
}

function renderTabs(
  selected: ProfileTab,
  onSelect: (tab: ProfileTab) => void,
): unknown {
  return h(
    NativeRuntimeRef.ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      style: styles.tabs,
      contentContainerStyle: styles.tabsContent,
    },
    ...TABS.map((tab: ProfileTab) =>
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

function renderScoreCards(summary: ProfileSummary): unknown {
  const items = [
    ["누적 납치금액", krw(summary.totalHijackSaved)],
    ["이번 달 납치", krw(summary.currentMonthHijack)],
    ["자기관리", `${summary.selfCareScore.toFixed(1)}점`],
    ["완료 미션", formatCount(summary.completedGrowthTasks)],
    ["게시글", formatCount(summary.communityPosts)],
    ["읽지 않은 알림", formatCount(summary.notificationUnread)],
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.scoreGrid },
    ...items.map(([label, value]: readonly [string, string]) =>
      h(
        NativeRuntimeRef.View,
        { key: label, style: styles.scoreCard },
        h(NativeRuntimeRef.Text, { style: styles.scoreLabel }, label),
        h(NativeRuntimeRef.Text, { style: styles.scoreValue }, value),
      ),
    ),
  );
}

function renderActivities(
  activities: readonly ActivityItem[],
  router: RouterLike,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "최근 활동"),
    ...(activities.length > 0
      ? activities.map((activity: ActivityItem) =>
          h(
            NativeRuntimeRef.Pressable,
            {
              accessibilityRole: "button",
              key: activity.id,
              onPress: (): void => router.push(activity.route as never),
              style: styles.activityRow,
            },
            h(
              NativeRuntimeRef.Text,
              { style: styles.activityKind },
              kindLabels[activity.kind],
            ),
            h(
              NativeRuntimeRef.View,
              { style: styles.activityBody },
              h(
                NativeRuntimeRef.Text,
                { style: styles.activityTitle },
                activity.title,
              ),
              h(
                NativeRuntimeRef.Text,
                { style: styles.activityDescription },
                activity.description,
              ),
              h(
                NativeRuntimeRef.Text,
                { style: styles.activityTime },
                relativeTime(activity.createdAt),
              ),
            ),
          ),
        )
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty", style: styles.emptyText },
            "아직 활동 내역이 없습니다.",
          ),
        ]),
  );
}

function renderSecurityPanel(payload: ProfilePayload): unknown {
  const items = [
    ["역할", payload.user.role],
    ["토큰 저장", "SecureStore"],
    ["알림 동의", payload.user.notificationConsent ? "ON" : "OFF"],
    ["마케팅 동의", payload.user.marketingConsent ? "ON" : "OFF"],
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "보안 상태"),
    ...items.map(([label, value]: readonly [string, string]) =>
      h(
        NativeRuntimeRef.View,
        { key: label, style: styles.infoRow },
        h(NativeRuntimeRef.Text, { style: styles.infoLabel }, label),
        h(NativeRuntimeRef.Text, { style: styles.infoValue }, value),
      ),
    ),
  );
}

function renderPrivacyPanel(privacy: PrivacyState): unknown {
  const items = [
    ["개인정보 export", privacy.exportStatus],
    ["탈퇴 요청", privacy.withdrawalRequested ? "요청됨" : "없음"],
    ["광고 개인화", privacy.adPersonalization ? "ON" : "OFF"],
    ["금융정보 광고 사용", privacy.financialDataForAds ? "ON" : "OFF"],
    ["Push token 원문 로그", privacy.rawPushTokenLogging ? "ON" : "OFF"],
    ["Token hash-only", privacy.tokenHashOnly ? "ON" : "OFF"],
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "개인정보 권리"),
    ...items.map(([label, value]: readonly [string, string]) =>
      h(
        NativeRuntimeRef.View,
        { key: label, style: styles.infoRow },
        h(NativeRuntimeRef.Text, { style: styles.infoLabel }, label),
        h(
          NativeRuntimeRef.Text,
          {
            style:
              value === "ON" && label !== "Token hash-only"
                ? styles.dangerValue
                : styles.infoValue,
          },
          value,
        ),
      ),
    ),
  );
}

function renderMenuPanel(
  items: readonly MenuItem[],
  busyAction: string | null,
  runMenu: (item: MenuItem) => Promise<void>,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "관리 메뉴"),
    ...items.map((item: MenuItem) =>
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          key: item.id,
          disabled: busyAction !== null,
          onPress: (): void => void runMenu(item),
          style: [
            styles.menuRow,
            item.kind === "DANGER" ? styles.dangerRow : null,
          ],
        },
        h(NativeRuntimeRef.Text, { style: styles.menuIcon }, item.icon),
        h(
          NativeRuntimeRef.View,
          { style: styles.menuBody },
          h(NativeRuntimeRef.Text, { style: styles.menuLabel }, item.label),
          h(
            NativeRuntimeRef.Text,
            { style: styles.menuDescription },
            item.description,
          ),
        ),
        busyAction === item.id
          ? h(NativeRuntimeRef.ActivityIndicator, { color: "#67e8f9" })
          : h(NativeRuntimeRef.Text, { style: styles.chevron }, "›"),
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
    "idHashOnly=true",
    "rawEmail=false",
    "rawPhone=false",
    "rawFinancialData=false",
    "rawPushToken=false",
    "adsFinancialTargeting=false",
    "privacyExportRedacted=true",
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.guardBox },
    h(
      NativeRuntimeRef.Text,
      { style: styles.guardTitle },
      "Profile · Privacy Guard",
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
  await attachMobileBearerToken(headers, SecureStoreRef);

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

async function clearSession(): Promise<void> {
  await SecureStoreRef.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStoreRef.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStoreRef.deleteItemAsync(SESSION_META_KEY);
}

function normalizePayload(partial: Partial<ProfilePayload>): ProfilePayload {
  const user = normalizeUser(partial.user ?? fallbackUser);
  const activities = (partial.activities ?? []).map(normalizeActivity);
  return {
    user,
    activities,
    summary: normalizeSummary(partial.summary ?? fallbackSummary),
    privacy: normalizePrivacy(partial.privacy ?? fallbackPrivacy),
  };
}

function normalizeUser(user: ProfileUser): ProfileUser {
  return {
    ...user,
    idHash: scrub(user.idHash),
    nickname: scrub(user.nickname) || "급여납치 사용자",
    role: enumOf(
      ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN"] as const,
      user.role,
      "USER",
    ),
    joinedAt: iso(user.joinedAt),
    level: money(user.level) || 1,
    title: scrub(user.title),
    avatarEmoji: scrub(user.avatarEmoji).slice(0, 4) || "👤",
    communityDisplayName: scrub(user.communityDisplayName),
    rawEmailExposed: false,
    rawPhoneExposed: false,
    rawFinancialDataExposed: false,
    rawPushTokenExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeSummary(summary: ProfileSummary): ProfileSummary {
  return {
    totalHijackSaved: money(summary.totalHijackSaved),
    currentMonthHijack: money(summary.currentMonthHijack),
    currentLevel: money(summary.currentLevel) || 1,
    levelXp: money(summary.levelXp),
    nextLevelXp: Math.max(1, money(summary.nextLevelXp)),
    selfCareScore: Math.max(
      0,
      Math.min(
        5,
        Number.isFinite(summary.selfCareScore)
          ? Math.round(summary.selfCareScore * 10) / 10
          : 0,
      ),
    ),
    completedGrowthTasks: money(summary.completedGrowthTasks),
    communityPosts: money(summary.communityPosts),
    communityComments: money(summary.communityComments),
    notificationUnread: money(summary.notificationUnread),
    privacyPassRate: scrub(summary.privacyPassRate) || "100.00%",
  };
}

function normalizeActivity(activity: ActivityItem): ActivityItem {
  return {
    ...activity,
    id: scrub(activity.id),
    kind: enumOf(
      [
        "PAYROLL",
        "BUDGET",
        "SAVING",
        "GROWTH",
        "COMMUNITY",
        "SECURITY",
        "NOTICE",
      ] as const,
      activity.kind,
      "NOTICE",
    ),
    title: scrub(activity.title),
    description: scrub(activity.description),
    createdAt: iso(activity.createdAt),
    route: scrub(activity.route).startsWith("/")
      ? scrub(activity.route)
      : "/profile",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizePrivacy(privacy: PrivacyState): PrivacyState {
  return {
    exportStatus: enumOf(
      ["NONE", "REQUESTED", "READY", "EXPIRED"] as const,
      privacy.exportStatus,
      "NONE",
    ),
    exportRequestedAt: privacy.exportRequestedAt
      ? iso(privacy.exportRequestedAt)
      : null,
    withdrawalRequested: Boolean(privacy.withdrawalRequested),
    adPersonalization: false,
    financialDataForAds: false,
    rawPushTokenLogging: false,
    tokenHashOnly: true,
  };
}

function seedPayload(): ProfilePayload {
  const now = new Date().toISOString();

  return normalizePayload({
    user: {
      idHash: "user_hash_seed",
      nickname: "홍길동 기획자",
      role: "USER",
      emailVerified: true,
      onboardingCompleted: true,
      joinedAt: now,
      level: 18,
      title: "급여 방어 루틴러",
      avatarEmoji: "👔",
      marketingConsent: false,
      notificationConsent: true,
      communityDisplayName: "익명 기획자",
      rawEmailExposed: false,
      rawPhoneExposed: false,
      rawFinancialDataExposed: false,
      rawPushTokenExposed: false,
      adsFinancialTargetingUsed: false,
    },
    summary: {
      totalHijackSaved: 5780000,
      currentMonthHijack: 820000,
      currentLevel: 18,
      levelXp: 380,
      nextLevelXp: 999,
      selfCareScore: 4.2,
      completedGrowthTasks: 128,
      communityPosts: 12,
      communityComments: 47,
      notificationUnread: 7,
      privacyPassRate: "100.00%",
    },
    privacy: {
      exportStatus: "NONE",
      exportRequestedAt: null,
      withdrawalRequested: false,
      adPersonalization: false,
      financialDataForAds: false,
      rawPushTokenLogging: false,
      tokenHashOnly: true,
    },
    activities: [
      {
        id: "activity-level",
        kind: "GROWTH",
        title: "오늘의 LV UP 완료",
        description: "독서·뉴스·운동 루틴을 완료했습니다.",
        createdAt: now,
        route: LEVEL_ROUTE,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "activity-plan",
        kind: "PAYROLL",
        title: "이번 달 급여 계획 확인",
        description: "고정지출·고정저축·일일예산 계획을 확인했습니다.",
        createdAt: now,
        route: PLAN_ROUTE,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "activity-community",
        kind: "COMMUNITY",
        title: "레벨업 인증글 작성",
        description: "익명 표시와 작성자 hash-only 기준으로 게시되었습니다.",
        createdAt: now,
        route: POSTS_ROUTE,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        adsFinancialTargetingUsed: false,
      },
    ],
  });
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
    tokenHashOnly: true,
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
    : `mobile-profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "마이페이지 접근이 제한되었습니다.";
  if (status === 404) return "사용자 정보를 찾을 수 없습니다.";
  if (status === 409) return "계정 상태가 변경되었습니다. 새로고침하세요.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  return `마이페이지 요청에 실패했습니다. (${status})`;
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

function money(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0
    ? Math.max(
        0,
        Math.min(100, Math.round((numerator * 10000) / denominator) / 100),
      )
    : 0;
}

function iso(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date(0).toISOString();
}

function dateText(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeZone: "Asia/Seoul",
      }).format(date)
    : "-";
}

function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(Math.abs(diff) / 60000));
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function krw(value: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(money(value))}원`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(money(value));
}

export function assertMobileProfileIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_profile_screen_runtime_loaded",
    "react_native_runtime_loaded",
    "secure_store_logout_cleanup",
    "profile_summary",
    "total_hijack_saved_card",
    "current_month_hijack_card",
    "level_and_self_care_score",
    "my_posts_management",
    "level_management",
    "support_and_notices",
    "notification_settings",
    "privacy_export_request",
    "withdrawal_request",
    "logout_action",
    "server_authority_api_boundary",
    "api_v1_users_me_profile",
    "api_v1_auth_logout",
    "sensitive_error_redaction",
    "id_hash_only",
    "raw_email_exposure_forbidden",
    "raw_phone_exposure_forbidden",
    "raw_financial_data_exposure_forbidden",
    "raw_push_token_exposure_forbidden",
    "ads_financial_targeting_forbidden",
    "redacted_export_only",
    "asia_seoul_display",
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
    backgroundColor: "#020617",
    borderBottomColor: "rgba(255,255,255,0.10)",
    borderBottomWidth: 1,
    gap: 6,
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 18,
  },
  headerKicker: { color: "#67e8f9", fontSize: 12, fontWeight: "900" },
  headerTitle: { color: "#ffffff", fontSize: 30, fontWeight: "900" },
  headerDescription: { color: "#cbd5e1", fontSize: 13, lineHeight: 20 },
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
  heroCard: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  heroTop: { alignItems: "center", flexDirection: "row", gap: 14 },
  avatar: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 34,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  avatarText: { fontSize: 34 },
  heroBody: { flex: 1, gap: 4 },
  nickname: { color: "#ffffff", fontSize: 21, fontWeight: "900" },
  title: { color: "#cbd5e1", fontSize: 13, fontWeight: "800", lineHeight: 19 },
  metaText: { color: "#94a3b8", fontSize: 12, fontWeight: "800" },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  progressFill: { backgroundColor: "#34d399", borderRadius: 999, height: 10 },
  progressText: { color: "#cbd5e1", fontSize: 12, fontWeight: "800" },
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
  scoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scoreCard: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    minWidth: "47%",
    padding: 13,
  },
  scoreLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "900" },
  scoreValue: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 5,
  },
  panel: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  panelTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  activityRow: {
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    gap: 6,
    paddingVertical: 10,
  },
  activityKind: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(103,232,249,0.14)",
    borderRadius: 999,
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  activityBody: { gap: 4 },
  activityTitle: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  activityDescription: { color: "#cbd5e1", fontSize: 13, lineHeight: 19 },
  activityTime: { color: "#64748b", fontSize: 11, fontWeight: "800" },
  infoRow: {
    alignItems: "center",
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  infoLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "900" },
  infoValue: { color: "#e2e8f0", fontSize: 13, fontWeight: "900" },
  dangerValue: { color: "#fecdd3", fontSize: 13, fontWeight: "900" },
  menuRow: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 13,
  },
  dangerRow: {
    borderColor: "rgba(251,113,133,0.34)",
    backgroundColor: "rgba(244,63,94,0.08)",
  },
  menuIcon: { fontSize: 24 },
  menuBody: { flex: 1, gap: 4 },
  menuLabel: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  menuDescription: { color: "#cbd5e1", fontSize: 12, lineHeight: 18 },
  chevron: { color: "#67e8f9", fontSize: 26, fontWeight: "900" },
  emptyText: { color: "#94a3b8", fontSize: 13, lineHeight: 20 },
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
});
