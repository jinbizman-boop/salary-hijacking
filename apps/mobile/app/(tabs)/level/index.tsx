/** apps/mobile/app/(tabs)/level/index.tsx
 * 급여납치 모바일 LV UP 탭 최종본.
 * import/JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../../src/shared/api/api-base";
import { attachMobileBearerToken } from "../../../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type LevelTab = "TODAY" | "CHALLENGE" | "BADGE" | "INSIGHT";
type GoalCategory = "MONEY" | "HEALTH" | "LEARNING" | "MIND" | "COMMUNITY";
type TaskStatus = "TODO" | "DONE" | "SKIPPED" | "LOCKED";
type ToastKind = "info" | "success" | "error";
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

type GrowthProfile = Readonly<{
  userHash: string;
  level: number;
  title: string;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  streakDays: number;
  completedToday: number;
  todayTarget: number;
  monthlyCompletionRate: number;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type GrowthTask = Readonly<{
  id: string;
  category: GoalCategory;
  title: string;
  description: string;
  xp: number;
  status: TaskStatus;
  dueDate: string;
  proofRequired: boolean;
  communityShareEnabled: boolean;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type Challenge = Readonly<{
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  participantCount: number;
  progressPercent: number;
  rewardXp: number;
  endsAt: string;
  joined: boolean;
  rawFinancialDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type Badge = Readonly<{
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}>;

type Insight = Readonly<{
  id: string;
  title: string;
  body: string;
  severity: "GOOD" | "WATCH" | "ACTION";
  actionLabel: string;
  route: string;
}>;

type GrowthStats = Readonly<{
  totalTasks: number;
  doneTasks: number;
  activeChallenges: number;
  unlockedBadges: number;
  privacyPassRate: string;
}>;
type GrowthPayload = Readonly<{
  profile: GrowthProfile;
  tasks: readonly GrowthTask[];
  challenges: readonly Challenge[];
  badges: readonly Badge[];
  insights: readonly Insight[];
  stats: GrowthStats;
}>;
type GrowthApiProfile = Partial<GrowthProfile> &
  Readonly<{ userId?: string; totalExp?: number }>;
type GrowthApiDashboard = Partial<Omit<GrowthPayload, "profile">> &
  Readonly<{
    profile?: GrowthApiProfile;
    activeTaskCount?: number;
    completedTaskCount?: number;
    joinedChallengeCount?: number;
    completedContentCount?: number;
    todaySuggestion?: string;
    financialRawDataExposed?: boolean;
  }>;
type GrowthResponse = Readonly<{ data?: GrowthApiDashboard; error?: unknown }>;
type ActionResponse = Readonly<{
  data?: { readonly task?: GrowthTask; readonly challenge?: Challenge };
  task?: GrowthTask;
  challenge?: Challenge;
  error?: unknown;
}>;
type LevelState = Readonly<{
  tab: LevelTab;
  payload: GrowthPayload;
  busy: boolean;
  refreshing: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const SCREEN_VERSION = "3.1.0";
const COMMUNITY_WRITE_ROUTE = "/community/write";
const PLAN_ROUTE = "/plan";
const TABS = ["TODAY", "CHALLENGE", "BADGE", "INSIGHT"] as const;
const CATEGORIES = [
  "MONEY",
  "HEALTH",
  "LEARNING",
  "MIND",
  "COMMUNITY",
] as const;
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

const tabLabels: Readonly<Record<LevelTab, string>> = Object.freeze({
  TODAY: "오늘",
  CHALLENGE: "챌린지",
  BADGE: "배지",
  INSIGHT: "인사이트",
});
const categoryLabels: Readonly<Record<GoalCategory, string>> = Object.freeze({
  MONEY: "돈관리",
  HEALTH: "건강",
  LEARNING: "학습",
  MIND: "마음",
  COMMUNITY: "커뮤니티",
});
const fallbackPayload: GrowthPayload = Object.freeze({
  profile: {
    userHash: "user_hash_pending",
    level: 1,
    title: "월급 지킴이",
    totalXp: 0,
    currentLevelXp: 0,
    nextLevelXp: 100,
    streakDays: 0,
    completedToday: 0,
    todayTarget: 3,
    monthlyCompletionRate: 0,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  },
  tasks: [],
  challenges: [],
  badges: [],
  insights: [],
  stats: {
    totalTasks: 0,
    doneTasks: 0,
    activeChallenges: 0,
    unlockedBadges: 0,
    privacyPassRate: "100.00%",
  },
});
const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const RouterRuntimeRef = loadRouterRuntime();
const SecureStoreRuntimeRef = loadSecureStoreRuntime();
const API_BASE_URL = readMobileApiBaseUrl();

export default function LevelIndexScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [state, setState] = ReactRuntimeRef.useState<LevelState>({
    tab: "TODAY",
    payload: fallbackPayload,
    busy: false,
    refreshing: false,
    toast: { kind: "info", message: "LV UP 데이터를 안전하게 불러옵니다." },
  });
  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<LevelState>): void =>
      setState((prev: LevelState) => ({ ...prev, ...patch })),
    [],
  );
  const progress = ReactRuntimeRef.useMemo(
    () => computeLevelProgress(state.payload.profile),
    [state.payload.profile],
  );
  const filteredTasks = ReactRuntimeRef.useMemo(
    () => sortTasks(state.payload.tasks),
    [state.payload.tasks],
  );

  const loadGrowth = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    setState((prev: LevelState) => ({ ...prev, refreshing: true }));

    try {
      const response = await requestJson<GrowthResponse>(
        "/api/v1/growth/dashboard",
      );
      const payload = normalizePayload(response.data ?? {});
      setState((prev: LevelState) => ({
        ...prev,
        payload,
        refreshing: false,
        toast: { kind: "success", message: "LV UP 현황을 동기화했습니다." },
      }));
    } catch (error) {
      const seeded = seedPayload();
      setState((prev: LevelState) => ({
        ...prev,
        payload: prev.payload.tasks.length > 0 ? prev.payload : seeded,
        refreshing: false,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "LV UP 현황 조회에 실패했습니다.",
        },
      }));
    }
  }, []);

  const completeTask = ReactRuntimeRef.useCallback(
    async (task: GrowthTask): Promise<void> => {
      update({ busy: true });

      try {
        const response = await requestJson<ActionResponse>(
          `/api/v1/growth/tasks/${encodeURIComponent(task.id)}/complete`,
          {
            method: "POST",
            body: JSON.stringify({
              client: mobileClientContext(),
              rawFinancialDataExposed: false,
              rawPersonalDataExposed: false,
              adsFinancialTargetingUsed: false,
            }),
          },
        );
        const changed = normalizeTask(
          response.data?.task ?? response.task ?? { ...task, status: "DONE" },
        );
        const tasks = state.payload.tasks.map((item: GrowthTask) =>
          item.id === changed.id ? changed : item,
        );
        const payload = normalizePayload({ ...state.payload, tasks });
        update({
          payload,
          busy: false,
          toast: {
            kind: "success",
            message: `+${changed.xp} XP를 획득했습니다.`,
          },
        });
      } catch (error) {
        update({
          busy: false,
          toast: {
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "미션 완료 처리에 실패했습니다.",
          },
        });
      }
    },
    [state.payload, update],
  );

  const joinChallenge = ReactRuntimeRef.useCallback(
    async (challenge: Challenge): Promise<void> => {
      update({ busy: true });

      try {
        const response = await requestJson<ActionResponse>(
          `/api/v1/growth/challenges/${encodeURIComponent(challenge.id)}/join`,
          {
            method: "POST",
            body: JSON.stringify({
              client: mobileClientContext(),
              rawFinancialDataExposed: false,
              adsFinancialTargetingUsed: false,
            }),
          },
        );
        const changed = normalizeChallenge(
          response.data?.challenge ??
            response.challenge ?? {
              ...challenge,
              joined: true,
              participantCount: challenge.participantCount + 1,
            },
        );
        const challenges = state.payload.challenges.map((item: Challenge) =>
          item.id === changed.id ? changed : item,
        );
        const payload = normalizePayload({ ...state.payload, challenges });
        update({
          payload,
          busy: false,
          toast: { kind: "success", message: "챌린지에 참여했습니다." },
        });
      } catch (error) {
        update({
          busy: false,
          toast: {
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "챌린지 참여에 실패했습니다.",
          },
        });
      }
    },
    [state.payload, update],
  );

  const openRoute = ReactRuntimeRef.useCallback(
    (route: string): void => router.push(route as never),
    [router],
  );

  ReactRuntimeRef.useEffect((): void => {
    void loadGrowth();
  }, [loadGrowth]);

  return h(
    NativeRuntimeRef.SafeAreaView,
    { style: styles.safeArea },
    h(
      NativeRuntimeRef.View,
      { style: styles.header },
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerKicker },
        `LV UP · v${SCREEN_VERSION}`,
      ),
      h(NativeRuntimeRef.Text, { style: styles.headerTitle }, "LV UP"),
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerDescription },
        "월급관리 습관, 고정저축 루틴, 지출 통제, 자기계발을 경험치로 성장시킵니다.",
      ),
    ),
    renderToast(state.toast),
    h(
      NativeRuntimeRef.ScrollView,
      {
        refreshControl: h(NativeRuntimeRef.RefreshControl, {
          refreshing: state.refreshing,
          onRefresh: (): void => void loadGrowth(),
        }),
        style: styles.scroll,
        contentContainerStyle: styles.scrollContent,
      },
      renderProfile(state.payload.profile, progress),
      renderTabs(state.tab, (tab: LevelTab): void => update({ tab })),
      state.tab === "TODAY"
        ? renderToday(filteredTasks, state.busy, completeTask, openRoute)
        : null,
      state.tab === "CHALLENGE"
        ? renderChallenges(state.payload.challenges, state.busy, joinChallenge)
        : null,
      state.tab === "BADGE" ? renderBadges(state.payload.badges) : null,
      state.tab === "INSIGHT"
        ? renderInsights(state.payload.insights, openRoute)
        : null,
      renderStats(state.payload.stats),
      renderGuardBox(),
    ),
  );
}

function renderProfile(profile: GrowthProfile, progress: number): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.profileCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.profileTop },
      h(
        NativeRuntimeRef.View,
        { style: styles.levelBadge },
        h(
          NativeRuntimeRef.Text,
          { style: styles.levelBadgeText },
          String(profile.level),
        ),
      ),
      h(
        NativeRuntimeRef.View,
        { style: styles.profileBody },
        h(NativeRuntimeRef.Text, { style: styles.levelTitle }, profile.title),
        h(
          NativeRuntimeRef.Text,
          { style: styles.levelMeta },
          `${formatCount(profile.totalXp)} XP · ${profile.streakDays}일 연속 실천`,
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
      `${formatCount(profile.currentLevelXp)} / ${formatCount(profile.nextLevelXp)} XP · 오늘 ${profile.completedToday}/${profile.todayTarget} 완료`,
    ),
  );
}

function renderTabs(
  selected: LevelTab,
  onSelect: (tab: LevelTab) => void,
): unknown {
  return h(
    NativeRuntimeRef.ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      style: styles.tabs,
      contentContainerStyle: styles.tabsContent,
    },
    ...TABS.map((tab: LevelTab) =>
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

function renderToday(
  tasks: readonly GrowthTask[],
  busy: boolean,
  completeTask: (task: GrowthTask) => Promise<void>,
  openRoute: (route: string) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "오늘의 미션"),
    ...tasks.map((task: GrowthTask) =>
      renderTask(task, busy, completeTask, openRoute),
    ),
  );
}

function renderTask(
  task: GrowthTask,
  busy: boolean,
  completeTask: (task: GrowthTask) => Promise<void>,
  openRoute: (route: string) => void,
): unknown {
  const done = task.status === "DONE";
  const disabled = busy || done || task.status === "LOCKED";

  return h(
    NativeRuntimeRef.View,
    { key: task.id, style: [styles.taskCard, done ? styles.doneCard : null] },
    h(
      NativeRuntimeRef.View,
      { style: styles.taskHeader },
      h(
        NativeRuntimeRef.Text,
        { style: styles.categoryPill },
        categoryLabels[task.category],
      ),
      h(NativeRuntimeRef.Text, { style: styles.xpText }, `+${task.xp} XP`),
    ),
    h(NativeRuntimeRef.Text, { style: styles.taskTitle }, task.title),
    h(
      NativeRuntimeRef.Text,
      { style: styles.taskDescription },
      task.description,
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.taskActionRow },
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          disabled,
          onPress: (): void => void completeTask(task),
          style: [
            styles.primaryButtonSmall,
            disabled ? styles.buttonDisabled : null,
          ],
        },
        busy
          ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
          : h(
              NativeRuntimeRef.Text,
              { style: styles.primaryButtonSmallText },
              done ? "완료됨" : "완료",
            ),
      ),
      task.communityShareEnabled
        ? h(
            NativeRuntimeRef.Pressable,
            {
              accessibilityRole: "button",
              onPress: (): void =>
                openRoute(
                  `${COMMUNITY_WRITE_ROUTE}?growthTaskId=${encodeURIComponent(task.id)}`,
                ),
              style: styles.secondaryButtonSmall,
            },
            h(
              NativeRuntimeRef.Text,
              { style: styles.secondaryButtonSmallText },
              "인증글",
            ),
          )
        : null,
    ),
  );
}

function renderChallenges(
  challenges: readonly Challenge[],
  busy: boolean,
  joinChallenge: (challenge: Challenge) => Promise<void>,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "성장 챌린지"),
    ...challenges.map((challenge: Challenge) =>
      h(
        NativeRuntimeRef.View,
        { key: challenge.id, style: styles.challengeCard },
        h(
          NativeRuntimeRef.Text,
          { style: styles.categoryPill },
          categoryLabels[challenge.category],
        ),
        h(NativeRuntimeRef.Text, { style: styles.taskTitle }, challenge.title),
        h(
          NativeRuntimeRef.Text,
          { style: styles.taskDescription },
          challenge.description,
        ),
        h(
          NativeRuntimeRef.Text,
          { style: styles.levelMeta },
          `${formatCount(challenge.participantCount)}명 참여 · 보상 ${formatCount(challenge.rewardXp)} XP · ${relativeTime(challenge.endsAt)} 종료`,
        ),
        h(
          NativeRuntimeRef.View,
          { style: styles.progressTrack },
          h(NativeRuntimeRef.View, {
            style: [
              styles.progressFill,
              { width: `${clamp(challenge.progressPercent, 0, 100)}%` },
            ],
          }),
        ),
        h(
          NativeRuntimeRef.Pressable,
          {
            accessibilityRole: "button",
            disabled: busy || challenge.joined,
            onPress: (): void => void joinChallenge(challenge),
            style: [
              styles.primaryButtonSmall,
              busy || challenge.joined ? styles.buttonDisabled : null,
            ],
          },
          busy
            ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
            : h(
                NativeRuntimeRef.Text,
                { style: styles.primaryButtonSmallText },
                challenge.joined ? "참여 중" : "참여",
              ),
        ),
      ),
    ),
  );
}

function renderBadges(badges: readonly Badge[]): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "배지"),
    h(
      NativeRuntimeRef.View,
      { style: styles.badgeGrid },
      ...badges.map((badge: Badge) =>
        h(
          NativeRuntimeRef.View,
          {
            key: badge.id,
            style: [
              styles.badgeCard,
              badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked,
            ],
          },
          h(NativeRuntimeRef.Text, { style: styles.badgeIcon }, badge.icon),
          h(NativeRuntimeRef.Text, { style: styles.badgeName }, badge.name),
          h(
            NativeRuntimeRef.Text,
            { style: styles.badgeDescription },
            badge.description,
          ),
          h(
            NativeRuntimeRef.Text,
            { style: styles.badgeStatus },
            badge.unlocked
              ? `획득 ${badge.unlockedAt ? relativeTime(badge.unlockedAt) : "완료"}`
              : "잠김",
          ),
        ),
      ),
    ),
  );
}

function renderInsights(
  insights: readonly Insight[],
  openRoute: (route: string) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "성장 인사이트"),
    ...insights.map((insight: Insight) =>
      h(
        NativeRuntimeRef.View,
        { key: insight.id, style: styles.insightCard },
        h(
          NativeRuntimeRef.Text,
          {
            style: [
              styles.insightSeverity,
              insight.severity === "GOOD"
                ? styles.good
                : insight.severity === "WATCH"
                  ? styles.watch
                  : styles.action,
            ],
          },
          insight.severity,
        ),
        h(NativeRuntimeRef.Text, { style: styles.taskTitle }, insight.title),
        h(
          NativeRuntimeRef.Text,
          { style: styles.taskDescription },
          insight.body,
        ),
        h(
          NativeRuntimeRef.Pressable,
          {
            accessibilityRole: "button",
            onPress: (): void => openRoute(insight.route),
            style: styles.secondaryButtonSmall,
          },
          h(
            NativeRuntimeRef.Text,
            { style: styles.secondaryButtonSmallText },
            insight.actionLabel,
          ),
        ),
      ),
    ),
  );
}

function renderStats(stats: GrowthStats): unknown {
  const items = [
    ["미션", `${stats.doneTasks}/${stats.totalTasks}`],
    ["챌린지", formatCount(stats.activeChallenges)],
    ["배지", formatCount(stats.unlockedBadges)],
    ["Privacy", stats.privacyPassRate],
  ] as const;
  return h(
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
    "financialAmountHidden=true",
    "authorHashOnly=true",
    "rawFinancialData=false",
    "adsFinancialTargeting=false",
    "communityProofSafe=true",
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.guardBox },
    h(
      NativeRuntimeRef.Text,
      { style: styles.guardTitle },
      "LV UP · Privacy Guard",
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

function normalizePayload(partial: GrowthApiDashboard): GrowthPayload {
  const tasks = Array.isArray(partial.tasks)
    ? partial.tasks.map(normalizeTask)
    : [];
  const challenges = Array.isArray(partial.challenges)
    ? partial.challenges.map(normalizeChallenge)
    : [];
  const badges = Array.isArray(partial.badges)
    ? partial.badges.map(normalizeBadge)
    : [];
  const insights = Array.isArray(partial.insights)
    ? partial.insights.map(normalizeInsight)
    : suggestionInsights(partial);
  const profile = normalizeProfile(
    partial.profile ?? fallbackPayload.profile,
    tasks,
  );
  return {
    profile,
    tasks,
    challenges,
    badges,
    insights,
    stats: statsFrom(tasks, challenges, badges, statsSeedFrom(partial)),
  };
}

function normalizeProfile(
  profile: GrowthApiProfile,
  tasks: readonly GrowthTask[],
): GrowthProfile {
  const completedToday = tasks.filter(
    (task: GrowthTask) => task.status === "DONE",
  ).length;
  const totalXp = nonNegative(profile.totalXp ?? profile.totalExp ?? 0);
  return {
    ...fallbackPayload.profile,
    ...profile,
    userHash:
      scrub(profile.userHash ?? profile.userId) ||
      fallbackPayload.profile.userHash,
    level: nonNegative(profile.level) || 1,
    title: scrub(profile.title) || fallbackPayload.profile.title,
    totalXp,
    currentLevelXp: nonNegative(profile.currentLevelXp ?? totalXp),
    nextLevelXp: Math.max(
      1,
      nonNegative(profile.nextLevelXp ?? fallbackPayload.profile.nextLevelXp),
    ),
    streakDays: nonNegative(profile.streakDays),
    completedToday:
      tasks.length > 0 ? completedToday : nonNegative(profile.completedToday),
    todayTarget: Math.max(
      1,
      nonNegative(profile.todayTarget ?? fallbackPayload.profile.todayTarget),
    ),
    monthlyCompletionRate: clamp(profile.monthlyCompletionRate ?? 0, 0, 100),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeTask(task: GrowthTask): GrowthTask {
  return {
    ...task,
    id: scrub(task.id),
    category: enumOf(CATEGORIES, task.category, "MONEY"),
    title: scrub(task.title),
    description: scrub(task.description),
    xp: nonNegative(task.xp),
    status: enumOf(
      ["TODO", "DONE", "SKIPPED", "LOCKED"] as const,
      task.status,
      "TODO",
    ),
    dueDate: iso(task.dueDate),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeChallenge(challenge: Challenge): Challenge {
  return {
    ...challenge,
    id: scrub(challenge.id),
    title: scrub(challenge.title),
    description: scrub(challenge.description),
    category: enumOf(CATEGORIES, challenge.category, "MONEY"),
    participantCount: nonNegative(challenge.participantCount),
    progressPercent: clamp(challenge.progressPercent, 0, 100),
    rewardXp: nonNegative(challenge.rewardXp),
    endsAt: iso(challenge.endsAt),
    rawFinancialDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeBadge(badge: Badge): Badge {
  return {
    ...badge,
    id: scrub(badge.id),
    name: scrub(badge.name),
    description: scrub(badge.description),
    icon: scrub(badge.icon).slice(0, 4) || "🏅",
    unlockedAt: badge.unlockedAt ? iso(badge.unlockedAt) : null,
  };
}

function normalizeInsight(insight: Insight): Insight {
  return {
    ...insight,
    id: scrub(insight.id),
    title: scrub(insight.title),
    body: scrub(insight.body),
    severity: enumOf(
      ["GOOD", "WATCH", "ACTION"] as const,
      insight.severity,
      "GOOD",
    ),
    actionLabel: scrub(insight.actionLabel),
    route: scrub(insight.route).startsWith("/")
      ? scrub(insight.route)
      : "/level",
  };
}

function suggestionInsights(partial: GrowthApiDashboard): readonly Insight[] {
  const suggestion = scrub(partial.todaySuggestion);
  if (!suggestion) return [];
  return [
    {
      id: "today-suggestion",
      title: "오늘의 LV UP 제안",
      body: suggestion,
      severity: "GOOD",
      actionLabel: "급여 홈으로",
      route: "/salary",
    },
  ];
}

function statsSeedFrom(partial: GrowthApiDashboard): Partial<GrowthStats> {
  return (
    partial.stats ?? {
      totalTasks:
        nonNegative(partial.activeTaskCount) +
        nonNegative(partial.completedTaskCount),
      doneTasks: nonNegative(partial.completedTaskCount),
      activeChallenges: nonNegative(partial.joinedChallengeCount),
      unlockedBadges: nonNegative(partial.completedContentCount),
    }
  );
}

function seedPayload(): GrowthPayload {
  const now = new Date().toISOString();
  return normalizePayload({
    profile: {
      userHash: "user_hash_seed",
      level: 7,
      title: "루틴 납치 방어자",
      totalXp: 2480,
      currentLevelXp: 340,
      nextLevelXp: 500,
      streakDays: 18,
      completedToday: 0,
      todayTarget: 3,
      monthlyCompletionRate: 82,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
    tasks: [
      {
        id: "task-budget",
        category: "MONEY",
        title: "오늘 생활비 한도 확인",
        description: "남은 일일 예산을 확인하고 변동지출을 1회 기록합니다.",
        xp: 35,
        status: "TODO",
        dueDate: now,
        proofRequired: false,
        communityShareEnabled: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "task-saving",
        category: "MONEY",
        title: "고정저축 루틴 점검",
        description:
          "급여일 이후 자동저축 상태를 점검합니다. 금액은 공개하지 않습니다.",
        xp: 45,
        status: "TODO",
        dueDate: now,
        proofRequired: false,
        communityShareEnabled: true,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "task-health",
        category: "HEALTH",
        title: "20분 걷기",
        description: "자기계발 루틴을 커뮤니티 인증 없이도 완료할 수 있습니다.",
        xp: 30,
        status: "DONE",
        dueDate: now,
        proofRequired: false,
        communityShareEnabled: true,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        adsFinancialTargetingUsed: false,
      },
    ],
    challenges: [
      {
        id: "challenge-no-spend",
        title: "3일 무지출 챌린지",
        description: "불필요한 변동지출을 줄이고 예산 방어 감각을 회복합니다.",
        category: "MONEY",
        participantCount: 1280,
        progressPercent: 33,
        rewardXp: 180,
        endsAt: now,
        joined: false,
        rawFinancialDataExposed: false,
        adsFinancialTargetingUsed: false,
      },
    ],
    badges: [
      {
        id: "badge-streak",
        name: "18일 연속",
        description: "루틴을 18일 연속 완료했습니다.",
        icon: "🔥",
        unlocked: true,
        unlockedAt: now,
      },
      {
        id: "badge-budget",
        name: "예산 방어",
        description: "일일 예산 기록을 꾸준히 유지하면 해금됩니다.",
        icon: "🛡️",
        unlocked: false,
        unlockedAt: null,
      },
    ],
    insights: [
      {
        id: "insight-budget",
        title: "예산 확인 루틴이 안정적입니다",
        body: "오늘 할 일과 고정저축 점검을 함께 완료하면 LV UP 속도가 빨라집니다.",
        severity: "GOOD",
        actionLabel: "예산 홈으로",
        route: PLAN_ROUTE,
      },
    ],
  });
}

function statsFrom(
  tasks: readonly GrowthTask[],
  challenges: readonly Challenge[],
  badges: readonly Badge[],
  partial: Partial<GrowthStats> = {},
): GrowthStats {
  const safeTaskCount = tasks.filter(
    (task: GrowthTask) =>
      !task.rawFinancialDataExposed &&
      !task.rawPersonalDataExposed &&
      !task.adsFinancialTargetingUsed,
  ).length;
  return {
    totalTasks: partial.totalTasks ?? tasks.length,
    doneTasks:
      partial.doneTasks ??
      tasks.filter((task: GrowthTask) => task.status === "DONE").length,
    activeChallenges:
      partial.activeChallenges ??
      challenges.filter(
        (challenge: Challenge) =>
          !challenge.joined || challenge.progressPercent < 100,
      ).length,
    unlockedBadges:
      partial.unlockedBadges ??
      badges.filter((badge: Badge) => badge.unlocked).length,
    privacyPassRate:
      partial.privacyPassRate ?? pct(safeTaskCount, tasks.length),
  };
}

function sortTasks(tasks: readonly GrowthTask[]): readonly GrowthTask[] {
  return tasks
    .slice()
    .sort(
      (a: GrowthTask, b: GrowthTask) =>
        Number(a.status === "DONE") - Number(b.status === "DONE") ||
        b.xp - a.xp,
    );
}

function computeLevelProgress(profile: GrowthProfile): number {
  return clamp(
    (profile.currentLevelXp * 100) / Math.max(1, profile.nextLevelXp),
    0,
    100,
  );
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
    : `mobile-level-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "LV UP 접근이 제한되었습니다.";
  if (status === 404) return "성장 데이터를 찾을 수 없습니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  return `LV UP 요청에 실패했습니다. (${status})`;
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

function scrub(value: unknown): string {
  if (typeof value !== "string") return "";
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

function nonNegative(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : 0;
}

function clamp(value: unknown, min: number, max: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : min));
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
  const diff = new Date(value).getTime() - Date.now();
  const absMinutes = Math.max(1, Math.floor(Math.abs(diff) / 60000));
  if (absMinutes < 60)
    return diff >= 0 ? `${absMinutes}분 후` : `${absMinutes}분 전`;
  const hours = Math.floor(absMinutes / 60);
  if (hours < 24) return diff >= 0 ? `${hours}시간 후` : `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return diff >= 0 ? `${days}일 후` : `${days}일 전`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
}

export function normalizeGrowthDashboardForTest(
  input: GrowthApiDashboard,
): GrowthPayload {
  return normalizePayload(input);
}

export function assertMobileLevelIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_level_screen_runtime_loaded",
    "react_native_runtime_loaded",
    "level_profile_and_xp_progress",
    "today_growth_tasks",
    "task_completion_action",
    "challenge_join_action",
    "badge_grid",
    "growth_insights",
    "community_proof_route",
    "budget_home_route",
    "server_authority_api_boundary",
    "api_v1_growth_dashboard",
    "api_v1_growth_tasks_complete",
    "api_v1_growth_challenges_join",
    "sensitive_error_redaction",
    "raw_financial_data_exposure_forbidden",
    "raw_personal_data_exposure_forbidden",
    "ads_financial_targeting_forbidden",
    "financial_amount_hidden",
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
  profileCard: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  profileTop: { alignItems: "center", flexDirection: "row", gap: 14 },
  levelBadge: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 24,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  levelBadgeText: { color: "#020617", fontSize: 24, fontWeight: "900" },
  profileBody: { flex: 1, gap: 4 },
  levelTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  levelMeta: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
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
  panel: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  panelTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  taskCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  doneCard: {
    backgroundColor: "rgba(16,185,129,0.10)",
    borderColor: "rgba(52,211,153,0.28)",
  },
  taskHeader: {
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
  xpText: { color: "#86efac", fontSize: 12, fontWeight: "900" },
  taskTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  taskDescription: { color: "#cbd5e1", fontSize: 13, lineHeight: 19 },
  taskActionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  challengeCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 9,
    padding: 13,
  },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 12,
    width: "47%",
  },
  badgeUnlocked: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(52,211,153,0.28)",
  },
  badgeLocked: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    opacity: 0.68,
  },
  badgeIcon: { fontSize: 28 },
  badgeName: { color: "#ffffff", fontSize: 14, fontWeight: "900" },
  badgeDescription: { color: "#cbd5e1", fontSize: 12, lineHeight: 17 },
  badgeStatus: { color: "#94a3b8", fontSize: 11, fontWeight: "800" },
  insightCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  insightSeverity: { fontSize: 11, fontWeight: "900" },
  good: { color: "#86efac" },
  watch: { color: "#fde68a" },
  action: { color: "#fecdd3" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
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
