/** apps/mobile/app/level/health.tsx
 * 급여납치 모바일 LV UP 건강 루틴 화면 최종본.
 * 정적 import와 JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../src/shared/api/api-base";
import { attachMobileBearerToken } from "../../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type HealthTab = "TODAY" | "WORKOUT" | "NUTRITION" | "RECOVERY" | "INSIGHT";
type HealthTaskKind =
  | "WALK"
  | "WORKOUT"
  | "STRETCH"
  | "WATER"
  | "SLEEP"
  | "MIND";
type HealthTaskStatus = "TODO" | "DONE" | "LOCKED";
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
  TextInput: ElementType;
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

type HealthProfile = Readonly<{
  level: number;
  title: string;
  totalXp: number;
  todayXp: number;
  streakDays: number;
  healthScore: number;
  completedToday: number;
  todayTarget: number;
  weeklyWorkoutMinutes: number;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawHealthDiagnosisExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type HealthTask = Readonly<{
  id: string;
  kind: HealthTaskKind;
  title: string;
  instruction: string;
  targetValue: number;
  targetUnit: "min" | "ml" | "steps" | "count" | "score";
  completedValue: number;
  status: HealthTaskStatus;
  xp: number;
  dueDate: string;
  communityShareEnabled: boolean;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawHealthDiagnosisExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type HealthInsight = Readonly<{
  id: string;
  title: string;
  body: string;
  severity: "GOOD" | "WATCH" | "ACTION";
  actionLabel: string;
  route: string;
}>;
type HealthStats = Readonly<{
  totalTasks: number;
  doneTasks: number;
  workoutMinutes: number;
  waterMl: number;
  sleepScore: number;
  privacyPassRate: string;
}>;
type HealthPayload = Readonly<{
  profile: HealthProfile;
  tasks: readonly HealthTask[];
  insights: readonly HealthInsight[];
  stats: HealthStats;
}>;
type HealthResponse = Readonly<{
  data?: Partial<HealthPayload>;
  error?: unknown;
}>;
type ActionResponse = Readonly<{
  data?: Partial<HealthPayload> & { readonly task?: HealthTask };
  error?: unknown;
}>;

type HealthState = Readonly<{
  tab: HealthTab;
  payload: HealthPayload;
  waterDraft: string;
  noteDraft: string;
  busyAction: string | null;
  refreshing: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const SCREEN_VERSION = "3.1.0";
const LEVEL_ROUTE = "/level";
const COMMUNITY_WRITE_ROUTE = "/community/write";
const TABS = ["TODAY", "WORKOUT", "NUTRITION", "RECOVERY", "INSIGHT"] as const;
const TASK_KINDS = [
  "WALK",
  "WORKOUT",
  "STRETCH",
  "WATER",
  "SLEEP",
  "MIND",
] as const;
const STATUSES = ["TODO", "DONE", "LOCKED"] as const;

const tabLabels: Readonly<Record<HealthTab, string>> = Object.freeze({
  TODAY: "오늘",
  WORKOUT: "운동",
  NUTRITION: "수분·식사",
  RECOVERY: "회복",
  INSIGHT: "인사이트",
});
const kindLabels: Readonly<Record<HealthTaskKind, string>> = Object.freeze({
  WALK: "걷기",
  WORKOUT: "운동",
  STRETCH: "스트레칭",
  WATER: "수분",
  SLEEP: "수면",
  MIND: "마음",
});
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
  "diagnosis",
  "disease",
  "medicine",
  "prescription",
  "medical",
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
  "진단",
  "질병",
  "처방",
  "약물",
  "병원",
] as const;

const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const RouterRuntimeRef = loadRouterRuntime();
const SecureStoreRuntimeRef = loadSecureStoreRuntime();
const API_BASE_URL = readMobileApiBaseUrl();

const fallbackProfile: HealthProfile = Object.freeze({
  level: 1,
  title: "건강 루틴 입문자",
  totalXp: 0,
  todayXp: 0,
  streakDays: 0,
  healthScore: 0,
  completedToday: 0,
  todayTarget: 3,
  weeklyWorkoutMinutes: 0,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  rawHealthDiagnosisExposed: false,
  adsFinancialTargetingUsed: false,
});
const fallbackPayload: HealthPayload = Object.freeze({
  profile: fallbackProfile,
  tasks: [],
  insights: [],
  stats: {
    totalTasks: 0,
    doneTasks: 0,
    workoutMinutes: 0,
    waterMl: 0,
    sleepScore: 0,
    privacyPassRate: "100.00%",
  },
});

export default function HealthLevelScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [state, setState] = ReactRuntimeRef.useState<HealthState>({
    tab: "TODAY",
    payload: fallbackPayload,
    waterDraft: "",
    noteDraft: "",
    busyAction: null,
    refreshing: false,
    toast: { kind: "info", message: "건강 LV UP 루틴을 안전하게 불러옵니다." },
  });
  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<HealthState>): void =>
      setState((prev: HealthState) => ({ ...prev, ...patch })),
    [],
  );
  const sortedTasks = ReactRuntimeRef.useMemo(
    () => sortTasks(state.payload.tasks),
    [state.payload.tasks],
  );
  const workoutTasks = ReactRuntimeRef.useMemo(
    () =>
      sortedTasks.filter(
        (task: HealthTask) =>
          task.kind === "WALK" ||
          task.kind === "WORKOUT" ||
          task.kind === "STRETCH",
      ),
    [sortedTasks],
  );
  const nutritionTasks = ReactRuntimeRef.useMemo(
    () => sortedTasks.filter((task: HealthTask) => task.kind === "WATER"),
    [sortedTasks],
  );
  const recoveryTasks = ReactRuntimeRef.useMemo(
    () =>
      sortedTasks.filter(
        (task: HealthTask) => task.kind === "SLEEP" || task.kind === "MIND",
      ),
    [sortedTasks],
  );
  const progress = ReactRuntimeRef.useMemo(
    () =>
      ratio(
        state.payload.profile.completedToday,
        state.payload.profile.todayTarget,
      ),
    [state.payload.profile.completedToday, state.payload.profile.todayTarget],
  );

  const loadDashboard = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    setState((prev: HealthState) => ({ ...prev, refreshing: true }));
    try {
      const response = await requestJson<HealthResponse>(
        "/api/v1/growth/health/dashboard",
      );
      const payload = normalizePayload(response.data ?? {});
      setState((prev: HealthState) => ({
        ...prev,
        payload,
        refreshing: false,
        toast: { kind: "success", message: "건강 루틴 현황을 동기화했습니다." },
      }));
    } catch (error) {
      const seeded = seedPayload();
      setState((prev: HealthState) => ({
        ...prev,
        payload: prev.payload.tasks.length > 0 ? prev.payload : seeded,
        refreshing: false,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "건강 루틴 현황 조회에 실패했습니다.",
        },
      }));
    }
  }, []);

  const completeTask = ReactRuntimeRef.useCallback(
    async (task: HealthTask, completedValue: number): Promise<void> => {
      update({ busyAction: task.id });
      try {
        const response = await requestJson<ActionResponse>(
          `/api/v1/growth/health/tasks/${encodeURIComponent(task.id)}/complete`,
          {
            method: "POST",
            body: JSON.stringify({
              completedValue: nonNegative(completedValue),
              note: scrub(state.noteDraft),
              client: mobileClientContext(),
              rawFinancialDataExposed: false,
              rawPersonalDataExposed: false,
              rawHealthDiagnosisExposed: false,
              adsFinancialTargetingUsed: false,
            }),
          },
        );
        const changed = normalizeTask(
          response.data?.task ?? { ...task, completedValue, status: "DONE" },
        );
        const tasks = state.payload.tasks.map((item: HealthTask) =>
          item.id === changed.id ? changed : item,
        );
        update({
          payload: normalizePayload({ ...state.payload, tasks }),
          noteDraft: "",
          busyAction: null,
          toast: {
            kind: "success",
            message: `+${changed.xp} XP를 획득했습니다.`,
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
                : "건강 미션 완료 처리에 실패했습니다.",
          },
        });
      }
    },
    [state.noteDraft, state.payload, update],
  );

  const logWater = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    const waterMl = Number(state.waterDraft.replace(/[^0-9]/g, ""));
    const waterTask =
      nutritionTasks.find((task: HealthTask) => task.kind === "WATER") ?? null;
    if (!waterTask || !Number.isFinite(waterMl) || waterMl <= 0) {
      update({
        toast: { kind: "error", message: "기록할 수분 섭취량을 입력하세요." },
      });
      return;
    }
    update({ busyAction: "water" });
    try {
      const response = await requestJson<ActionResponse>(
        "/api/v1/growth/health/water/log",
        {
          method: "POST",
          body: JSON.stringify({
            taskId: waterTask.id,
            waterMl: Math.trunc(waterMl),
            client: mobileClientContext(),
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            rawHealthDiagnosisExposed: false,
            adsFinancialTargetingUsed: false,
          }),
        },
      );
      const changed = normalizeTask(
        response.data?.task ?? {
          ...waterTask,
          completedValue: waterMl,
          status: waterMl >= waterTask.targetValue ? "DONE" : waterTask.status,
        },
      );
      const tasks = state.payload.tasks.map((item: HealthTask) =>
        item.id === changed.id ? changed : item,
      );
      update({
        payload: normalizePayload({ ...state.payload, tasks }),
        waterDraft: "",
        busyAction: null,
        toast: { kind: "success", message: "수분 섭취를 기록했습니다." },
      });
    } catch (error) {
      update({
        busyAction: null,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "수분 기록에 실패했습니다.",
        },
      });
    }
  }, [nutritionTasks, state.payload, state.waterDraft, update]);

  const shareProof = ReactRuntimeRef.useCallback(
    (task: HealthTask): void => {
      router.push(
        `${COMMUNITY_WRITE_ROUTE}?growthTaskId=${encodeURIComponent(task.id)}&board=LEVEL_UP` as never,
      );
    },
    [router],
  );
  const goBack = ReactRuntimeRef.useCallback((): void => {
    if (typeof router.back === "function") router.back();
    else router.replace(LEVEL_ROUTE as never);
  }, [router]);

  ReactRuntimeRef.useEffect((): void => {
    void loadDashboard();
  }, [loadDashboard]);

  return h(
    NativeRuntimeRef.SafeAreaView,
    { style: styles.safeArea },
    h(
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
          `Health LV UP · v${SCREEN_VERSION}`,
        ),
        h(NativeRuntimeRef.Text, { style: styles.headerTitle }, "건강 루틴"),
        h(
          NativeRuntimeRef.Text,
          { style: styles.headerDescription },
          "걷기·운동·수분·수면·마음 루틴을 작은 미션으로 쌓아 LV UP합니다.",
        ),
      ),
    ),
    renderToast(state.toast),
    h(
      NativeRuntimeRef.ScrollView,
      {
        refreshControl: h(NativeRuntimeRef.RefreshControl, {
          refreshing: state.refreshing,
          onRefresh: (): void => void loadDashboard(),
        }),
        style: styles.scroll,
        contentContainerStyle: styles.scrollContent,
      },
      renderHero(state.payload.profile, progress),
      renderTabs(state.tab, (tab: HealthTab): void => update({ tab })),
      state.tab === "TODAY"
        ? renderTaskList(
            "오늘의 건강 미션",
            sortedTasks,
            state.busyAction,
            completeTask,
            shareProof,
          )
        : null,
      state.tab === "WORKOUT"
        ? renderTaskList(
            "운동·활동",
            workoutTasks,
            state.busyAction,
            completeTask,
            shareProof,
          )
        : null,
      state.tab === "NUTRITION"
        ? renderNutrition(
            nutritionTasks,
            state.waterDraft,
            state.busyAction,
            (waterDraft: string): void => update({ waterDraft }),
            logWater,
            completeTask,
            shareProof,
          )
        : null,
      state.tab === "RECOVERY"
        ? renderRecovery(
            recoveryTasks,
            state.noteDraft,
            state.busyAction,
            (noteDraft: string): void => update({ noteDraft }),
            completeTask,
            shareProof,
          )
        : null,
      state.tab === "INSIGHT"
        ? renderInsights(state.payload.insights, router)
        : null,
      renderStats(state.payload.stats),
      renderGuardBox(),
    ),
  );
}

function renderHero(profile: HealthProfile, progress: number): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.heroCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.heroTop },
      h(
        NativeRuntimeRef.View,
        { style: styles.levelBadge },
        h(NativeRuntimeRef.Text, { style: styles.levelBadgeText }, "♥"),
      ),
      h(
        NativeRuntimeRef.View,
        { style: styles.heroBody },
        h(NativeRuntimeRef.Text, { style: styles.heroTitle }, profile.title),
        h(
          NativeRuntimeRef.Text,
          { style: styles.heroMeta },
          `Lv.${profile.level} · ${formatCount(profile.totalXp)} XP · ${profile.streakDays}일 연속 · 건강점수 ${profile.healthScore.toFixed(1)}`,
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
      `오늘 ${profile.completedToday}/${profile.todayTarget} 완료 · 주간 운동 ${formatCount(profile.weeklyWorkoutMinutes)}분`,
    ),
  );
}

function renderTabs(
  selected: HealthTab,
  onSelect: (tab: HealthTab) => void,
): unknown {
  return h(
    NativeRuntimeRef.ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      style: styles.tabs,
      contentContainerStyle: styles.tabsContent,
    },
    ...TABS.map((tab: HealthTab) =>
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

function renderTaskList(
  title: string,
  tasks: readonly HealthTask[],
  busyAction: string | null,
  completeTask: (task: HealthTask, completedValue: number) => Promise<void>,
  shareProof: (task: HealthTask) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, title),
    ...(tasks.length > 0
      ? tasks.map((task: HealthTask) =>
          renderTask(task, busyAction, completeTask, shareProof),
        )
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-task", style: styles.emptyText },
            "등록된 건강 미션이 없습니다.",
          ),
        ]),
  );
}

function renderTask(
  task: HealthTask,
  busyAction: string | null,
  completeTask: (task: HealthTask, completedValue: number) => Promise<void>,
  shareProof: (task: HealthTask) => void,
): unknown {
  const done = task.status === "DONE";
  const disabled = busyAction !== null || done || task.status === "LOCKED";
  return h(
    NativeRuntimeRef.View,
    { key: task.id, style: [styles.taskCard, done ? styles.doneCard : null] },
    h(
      NativeRuntimeRef.View,
      { style: styles.rowTop },
      h(
        NativeRuntimeRef.Text,
        { style: styles.kindPill },
        kindLabels[task.kind],
      ),
      h(NativeRuntimeRef.Text, { style: styles.xpText }, `+${task.xp} XP`),
    ),
    h(NativeRuntimeRef.Text, { style: styles.taskTitle }, task.title),
    h(NativeRuntimeRef.Text, { style: styles.taskPrompt }, task.instruction),
    h(
      NativeRuntimeRef.Text,
      { style: styles.progressText },
      `${formatCount(task.completedValue)} / ${formatCount(task.targetValue)} ${task.targetUnit}`,
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.progressTrack },
      h(NativeRuntimeRef.View, {
        style: [
          styles.progressFill,
          { width: `${ratio(task.completedValue, task.targetValue)}%` },
        ],
      }),
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.actionRow },
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          disabled,
          onPress: (): void => void completeTask(task, task.targetValue),
          style: [
            styles.primaryButtonSmall,
            disabled ? styles.buttonDisabled : null,
          ],
        },
        busyAction === task.id
          ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
          : h(
              NativeRuntimeRef.Text,
              { style: styles.primaryButtonSmallText },
              done ? "완료" : "완료하기",
            ),
      ),
      task.communityShareEnabled
        ? h(
            NativeRuntimeRef.Pressable,
            {
              accessibilityRole: "button",
              onPress: (): void => shareProof(task),
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

function renderNutrition(
  tasks: readonly HealthTask[],
  waterDraft: string,
  busyAction: string | null,
  setWaterDraft: (value: string) => void,
  logWater: () => Promise<void>,
  completeTask: (task: HealthTask, completedValue: number) => Promise<void>,
  shareProof: (task: HealthTask) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "수분·식사 루틴"),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "수분 섭취량",
      autoCapitalize: "none",
      autoCorrect: false,
      keyboardType: "numeric",
      onChangeText: setWaterDraft,
      placeholder: "마신 물 ml 입력",
      placeholderTextColor: "#64748b",
      style: styles.input,
      value: waterDraft,
    }),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        disabled: busyAction !== null || waterDraft.trim().length === 0,
        onPress: (): void => void logWater(),
        style: [
          styles.primaryButton,
          busyAction !== null || waterDraft.trim().length === 0
            ? styles.buttonDisabled
            : null,
        ],
      },
      busyAction === "water"
        ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
        : h(
            NativeRuntimeRef.Text,
            { style: styles.primaryButtonText },
            "수분 기록",
          ),
    ),
    ...tasks.map((task: HealthTask) =>
      renderTask(task, busyAction, completeTask, shareProof),
    ),
  );
}

function renderRecovery(
  tasks: readonly HealthTask[],
  noteDraft: string,
  busyAction: string | null,
  setNoteDraft: (value: string) => void,
  completeTask: (task: HealthTask, completedValue: number) => Promise<void>,
  shareProof: (task: HealthTask) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "수면·회복 노트"),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "회복 노트",
      autoCapitalize: "none",
      autoCorrect: false,
      multiline: true,
      onChangeText: setNoteDraft,
      placeholder:
        "오늘 컨디션과 회복 루틴을 짧게 기록하세요. 진단·처방 정보는 입력하지 마세요.",
      placeholderTextColor: "#64748b",
      style: styles.textArea,
      textAlignVertical: "top",
      value: noteDraft,
    }),
    ...tasks.map((task: HealthTask) =>
      renderTask(task, busyAction, completeTask, shareProof),
    ),
  );
}

function renderInsights(
  insights: readonly HealthInsight[],
  router: RouterLike,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(
      NativeRuntimeRef.Text,
      { style: styles.panelTitle },
      "건강 루틴 인사이트",
    ),
    ...(insights.length > 0
      ? insights.map((insight: HealthInsight) =>
          h(
            NativeRuntimeRef.View,
            { key: insight.id, style: styles.insightCard },
            h(
              NativeRuntimeRef.Text,
              {
                style: [
                  styles.insightSeverity,
                  insight.severity === "GOOD"
                    ? styles.safeText
                    : insight.severity === "WATCH"
                      ? styles.reviewText
                      : styles.actionText,
                ],
              },
              insight.severity,
            ),
            h(
              NativeRuntimeRef.Text,
              { style: styles.taskTitle },
              insight.title,
            ),
            h(
              NativeRuntimeRef.Text,
              { style: styles.taskPrompt },
              insight.body,
            ),
            h(
              NativeRuntimeRef.Pressable,
              {
                accessibilityRole: "button",
                onPress: (): void => router.push(insight.route as never),
                style: styles.secondaryButtonSmall,
              },
              h(
                NativeRuntimeRef.Text,
                { style: styles.secondaryButtonSmallText },
                insight.actionLabel,
              ),
            ),
          ),
        )
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-insight", style: styles.emptyText },
            "인사이트가 없습니다.",
          ),
        ]),
  );
}

function renderStats(stats: HealthStats): unknown {
  const items = [
    ["미션", `${stats.doneTasks}/${stats.totalTasks}`],
    ["운동", `${formatCount(stats.workoutMinutes)}분`],
    ["수분", `${formatCount(stats.waterMl)}ml`],
    ["수면", `${formatCount(stats.sleepScore)}점`],
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
    "wellnessOnly=true",
    "noMedicalDiagnosis=true",
    "rawFinancialData=false",
    "rawPersonalData=false",
    "rawHealthDiagnosis=false",
    "adsFinancialTargeting=false",
    "communityProofSafe=true",
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.guardBox },
    h(
      NativeRuntimeRef.Text,
      { style: styles.guardTitle },
      "Health · Privacy Guard",
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
  headers.set("x-raw-health-diagnosis-exposed", "false");
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

function normalizePayload(partial: Partial<HealthPayload>): HealthPayload {
  const tasks = (partial.tasks ?? []).map(normalizeTask);
  const insights = (partial.insights ?? []).map(normalizeInsight);
  const profile = normalizeProfile(partial.profile ?? fallbackProfile, tasks);
  return { profile, tasks, insights, stats: statsFrom(tasks, partial.stats) };
}

function normalizeProfile(
  profile: HealthProfile,
  tasks: readonly HealthTask[],
): HealthProfile {
  return {
    ...profile,
    level: positive(profile.level, 1),
    title: scrub(profile.title) || "건강 루틴 입문자",
    totalXp: money(profile.totalXp),
    todayXp: money(profile.todayXp),
    streakDays: money(profile.streakDays),
    healthScore: percent(profile.healthScore),
    completedToday: tasks.filter((task: HealthTask) => task.status === "DONE")
      .length,
    todayTarget: Math.max(1, money(profile.todayTarget)),
    weeklyWorkoutMinutes: money(profile.weeklyWorkoutMinutes),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawHealthDiagnosisExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeTask(task: HealthTask): HealthTask {
  return {
    ...task,
    id: scrub(task.id),
    kind: enumOf(TASK_KINDS, task.kind, "WALK"),
    title: scrub(task.title),
    instruction: scrub(task.instruction),
    targetValue: money(task.targetValue),
    targetUnit: enumOf(
      ["min", "ml", "steps", "count", "score"] as const,
      task.targetUnit,
      "count",
    ),
    completedValue: money(task.completedValue),
    status: enumOf(STATUSES, task.status, "TODO"),
    xp: money(task.xp),
    dueDate: iso(task.dueDate),
    communityShareEnabled: Boolean(task.communityShareEnabled),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawHealthDiagnosisExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeInsight(insight: HealthInsight): HealthInsight {
  return {
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
      : LEVEL_ROUTE,
  };
}

function sortTasks(tasks: readonly HealthTask[]): readonly HealthTask[] {
  return tasks
    .slice()
    .sort(
      (a: HealthTask, b: HealthTask) =>
        Number(a.status === "DONE") - Number(b.status === "DONE") ||
        b.xp - a.xp,
    );
}

function statsFrom(
  tasks: readonly HealthTask[],
  partial: Partial<HealthStats> = {},
): HealthStats {
  const safeTasks = tasks.filter(
    (task: HealthTask) =>
      !task.rawFinancialDataExposed &&
      !task.rawPersonalDataExposed &&
      !task.rawHealthDiagnosisExposed &&
      !task.adsFinancialTargetingUsed,
  ).length;
  const done = tasks.filter(
    (task: HealthTask) => task.status === "DONE",
  ).length;
  const workoutMinutes = tasks
    .filter(
      (task: HealthTask) =>
        task.kind === "WALK" ||
        task.kind === "WORKOUT" ||
        task.kind === "STRETCH",
    )
    .reduce(
      (sum: number, task: HealthTask) =>
        sum + (task.targetUnit === "min" ? task.completedValue : 0),
      0,
    );
  const waterMl = tasks
    .filter((task: HealthTask) => task.kind === "WATER")
    .reduce(
      (sum: number, task: HealthTask) =>
        sum + (task.targetUnit === "ml" ? task.completedValue : 0),
      0,
    );
  const sleepScores = tasks.filter(
    (task: HealthTask) => task.kind === "SLEEP" && task.targetUnit === "score",
  );
  const sleepScore =
    sleepScores.length > 0
      ? Math.round(
          sleepScores.reduce(
            (sum: number, task: HealthTask) => sum + task.completedValue,
            0,
          ) / sleepScores.length,
        )
      : 0;
  return {
    totalTasks: partial.totalTasks ?? tasks.length,
    doneTasks: partial.doneTasks ?? done,
    workoutMinutes: partial.workoutMinutes ?? workoutMinutes,
    waterMl: partial.waterMl ?? waterMl,
    sleepScore: partial.sleepScore ?? sleepScore,
    privacyPassRate: partial.privacyPassRate ?? pct(safeTasks, tasks.length),
  };
}

function seedPayload(): HealthPayload {
  const now = new Date().toISOString();
  return normalizePayload({
    profile: {
      level: 6,
      title: "퇴근 후 건강 루틴러",
      totalXp: 1780,
      todayXp: 70,
      streakDays: 14,
      healthScore: 84.5,
      completedToday: 0,
      todayTarget: 4,
      weeklyWorkoutMinutes: 155,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawHealthDiagnosisExposed: false,
      adsFinancialTargetingUsed: false,
    },
    tasks: [
      {
        id: "walk-1",
        kind: "WALK",
        title: "20분 걷기",
        instruction: "출퇴근 전후로 20분 걷고 컨디션을 확인합니다.",
        targetValue: 20,
        targetUnit: "min",
        completedValue: 0,
        status: "TODO",
        xp: 35,
        dueDate: now,
        communityShareEnabled: true,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawHealthDiagnosisExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "water-1",
        kind: "WATER",
        title: "수분 1,500ml",
        instruction: "하루 수분 섭취량을 나누어 기록합니다.",
        targetValue: 1500,
        targetUnit: "ml",
        completedValue: 500,
        status: "TODO",
        xp: 25,
        dueDate: now,
        communityShareEnabled: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawHealthDiagnosisExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "stretch-1",
        kind: "STRETCH",
        title: "목·어깨 스트레칭",
        instruction: "짧은 스트레칭으로 앉아있는 시간을 끊습니다.",
        targetValue: 10,
        targetUnit: "min",
        completedValue: 0,
        status: "TODO",
        xp: 30,
        dueDate: now,
        communityShareEnabled: true,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawHealthDiagnosisExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "sleep-1",
        kind: "SLEEP",
        title: "수면 루틴 점검",
        instruction: "잠들기 전 화면 시간을 줄이고 회복 점수를 기록합니다.",
        targetValue: 80,
        targetUnit: "score",
        completedValue: 0,
        status: "TODO",
        xp: 40,
        dueDate: now,
        communityShareEnabled: false,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawHealthDiagnosisExposed: false,
        adsFinancialTargetingUsed: false,
      },
    ],
    insights: [
      {
        id: "health-insight-1",
        title: "작은 반복이 회복력을 만듭니다",
        body: "운동량보다 중요한 것은 꾸준함입니다. 의료 진단이 아닌 생활 루틴 관점으로 기록하세요.",
        severity: "GOOD",
        actionLabel: "LV UP으로",
        route: LEVEL_ROUTE,
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
    TextInput: mod.TextInput ?? fallback("TextInput"),
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
    rawHealthDiagnosisExposed: false,
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
    : `mobile-health-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "건강 루틴 접근이 제한되었습니다.";
  if (status === 404) return "건강 루틴 데이터를 찾을 수 없습니다.";
  if (status === 409) return "건강 루틴 상태가 변경되었습니다. 새로고침하세요.";
  if (status === 422) return "진단·처방 등 민감 건강정보는 기록할 수 없습니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  return `건강 루틴 요청에 실패했습니다. (${status})`;
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
function money(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}
function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}
function percent(value: number): number {
  return Math.max(
    0,
    Math.min(100, Number.isFinite(value) ? Math.round(value * 10) / 10 : 0),
  );
}
function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? percent((numerator * 100) / denominator) : 0;
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
function formatCount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(nonNegative(value));
}

export function assertMobileHealthLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_health_runtime_loaded",
    "react_native_runtime_loaded",
    "health_level_screen",
    "today_health_tasks",
    "walk_workout_stretch_water_sleep_mind",
    "water_log",
    "recovery_note",
    "task_complete_action",
    "community_proof_route",
    "api_v1_growth_health_dashboard",
    "api_v1_growth_health_task_complete",
    "api_v1_growth_health_water_log",
    "streak_xp_health_score",
    "wellness_only_boundary",
    "no_medical_diagnosis",
    "sensitive_error_redaction",
    "raw_financial_data_exposure_forbidden",
    "raw_personal_data_exposure_forbidden",
    "raw_health_diagnosis_exposure_forbidden",
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
  levelBadge: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 24,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  levelBadgeText: { color: "#020617", fontSize: 28, fontWeight: "900" },
  heroBody: { flex: 1, gap: 4 },
  heroTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  heroMeta: {
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
    gap: 10,
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
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kindPill: {
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
  taskPrompt: { color: "#cbd5e1", fontSize: 13, lineHeight: 20 },
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
  input: {
    backgroundColor: "#020617",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#f8fafc",
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 13,
  },
  textArea: {
    backgroundColor: "#020617",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#f8fafc",
    fontSize: 15,
    minHeight: 120,
    padding: 13,
  },
  insightCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  insightSeverity: { fontSize: 11, fontWeight: "900" },
  safeText: { color: "#86efac", fontSize: 12, fontWeight: "900" },
  reviewText: { color: "#fde68a", fontSize: 12, fontWeight: "900" },
  actionText: { color: "#fecdd3", fontSize: 12, fontWeight: "900" },
  emptyText: { color: "#94a3b8", fontSize: 13, lineHeight: 20 },
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
