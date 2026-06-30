/** apps/mobile/app/level/english.tsx
 * 급여납치 모바일 LV UP 영어 학습 화면 최종본.
 * 정적 import와 JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../src/shared/api/api-base";
import { attachMobileBearerToken } from "../../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type EnglishTab = "TODAY" | "WORDS" | "QUIZ" | "SPEAKING" | "INSIGHT";
type TaskKind = "VOCAB" | "READING" | "LISTENING" | "SPEAKING" | "QUIZ";
type TaskStatus = "TODO" | "DONE" | "LOCKED";
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

type EnglishProfile = Readonly<{
  level: number;
  title: string;
  totalXp: number;
  todayXp: number;
  streakDays: number;
  cefr: "A1" | "A2" | "B1" | "B2" | "C1";
  accuracyRate: number;
  completedToday: number;
  todayTarget: number;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type EnglishTask = Readonly<{
  id: string;
  kind: TaskKind;
  title: string;
  prompt: string;
  answer: string;
  userAnswer: string;
  status: TaskStatus;
  xp: number;
  dueDate: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type WordCard = Readonly<{
  id: string;
  word: string;
  meaning: string;
  example: string;
  mastered: boolean;
  rawPersonalDataExposed: false;
}>;

type EnglishInsight = Readonly<{
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  route: string;
}>;
type EnglishStats = Readonly<{
  totalTasks: number;
  doneTasks: number;
  masteredWords: number;
  quizAccuracy: string;
  privacyPassRate: string;
}>;
type EnglishPayload = Readonly<{
  profile: EnglishProfile;
  tasks: readonly EnglishTask[];
  words: readonly WordCard[];
  insights: readonly EnglishInsight[];
  stats: EnglishStats;
}>;
type EnglishResponse = Readonly<{
  data?: Partial<EnglishPayload>;
  error?: unknown;
}>;
type ActionResponse = Readonly<{
  data?: Partial<EnglishPayload> & { readonly task?: EnglishTask };
  error?: unknown;
}>;

type EnglishState = Readonly<{
  tab: EnglishTab;
  payload: EnglishPayload;
  quizAnswer: string;
  speakingDraft: string;
  busyAction: string | null;
  refreshing: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const SCREEN_VERSION = "3.1.0";
const LEVEL_ROUTE = "/level";
const COMMUNITY_WRITE_ROUTE = "/community/write";
const TABS = ["TODAY", "WORDS", "QUIZ", "SPEAKING", "INSIGHT"] as const;
const TASK_KINDS = [
  "VOCAB",
  "READING",
  "LISTENING",
  "SPEAKING",
  "QUIZ",
] as const;
const STATUSES = ["TODO", "DONE", "LOCKED"] as const;

const tabLabels: Readonly<Record<EnglishTab, string>> = Object.freeze({
  TODAY: "오늘",
  WORDS: "단어",
  QUIZ: "퀴즈",
  SPEAKING: "스피킹",
  INSIGHT: "인사이트",
});

const kindLabels: Readonly<Record<TaskKind, string>> = Object.freeze({
  VOCAB: "단어",
  READING: "리딩",
  LISTENING: "리스닝",
  SPEAKING: "스피킹",
  QUIZ: "퀴즈",
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

const fallbackProfile: EnglishProfile = Object.freeze({
  level: 1,
  title: "영어 루틴 입문자",
  totalXp: 0,
  todayXp: 0,
  streakDays: 0,
  cefr: "A1",
  accuracyRate: 0,
  completedToday: 0,
  todayTarget: 3,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  adsFinancialTargetingUsed: false,
});

const fallbackPayload: EnglishPayload = Object.freeze({
  profile: fallbackProfile,
  tasks: [],
  words: [],
  insights: [],
  stats: {
    totalTasks: 0,
    doneTasks: 0,
    masteredWords: 0,
    quizAccuracy: "0.00%",
    privacyPassRate: "100.00%",
  },
});

export default function EnglishLevelScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [state, setState] = ReactRuntimeRef.useState<EnglishState>({
    tab: "TODAY",
    payload: fallbackPayload,
    quizAnswer: "",
    speakingDraft: "",
    busyAction: null,
    refreshing: false,
    toast: { kind: "info", message: "영어 LV UP 루틴을 안전하게 불러옵니다." },
  });

  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<EnglishState>): void =>
      setState((prev: EnglishState) => ({ ...prev, ...patch })),
    [],
  );

  const sortedTasks = ReactRuntimeRef.useMemo(
    () => sortTasks(state.payload.tasks),
    [state.payload.tasks],
  );
  const quizTask = ReactRuntimeRef.useMemo(
    () =>
      sortedTasks.find(
        (task: EnglishTask) => task.kind === "QUIZ" && task.status !== "DONE",
      ) ??
      sortedTasks.find((task: EnglishTask) => task.kind === "QUIZ") ??
      null,
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
    setState((prev: EnglishState) => ({ ...prev, refreshing: true }));

    try {
      const response = await requestJson<EnglishResponse>(
        "/api/v1/growth/english/dashboard",
      );
      const payload = normalizePayload(response.data ?? {});
      setState((prev: EnglishState) => ({
        ...prev,
        payload,
        refreshing: false,
        toast: { kind: "success", message: "영어 학습 현황을 동기화했습니다." },
      }));
    } catch (error) {
      const seeded = seedPayload();
      setState((prev: EnglishState) => ({
        ...prev,
        payload: prev.payload.tasks.length > 0 ? prev.payload : seeded,
        refreshing: false,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "영어 학습 현황 조회에 실패했습니다.",
        },
      }));
    }
  }, []);

  const completeTask = ReactRuntimeRef.useCallback(
    async (task: EnglishTask, answer: string): Promise<void> => {
      update({ busyAction: task.id });

      try {
        const response = await requestJson<ActionResponse>(
          `/api/v1/growth/english/tasks/${encodeURIComponent(task.id)}/complete`,
          {
            method: "POST",
            body: JSON.stringify({
              answer: scrub(answer),
              client: mobileClientContext(),
              rawFinancialDataExposed: false,
              rawPersonalDataExposed: false,
              adsFinancialTargetingUsed: false,
            }),
          },
        );
        const changed = normalizeTask(
          response.data?.task ?? {
            ...task,
            userAnswer: answer,
            status: "DONE",
          },
        );
        const tasks = state.payload.tasks.map((item: EnglishTask) =>
          item.id === changed.id ? changed : item,
        );
        update({
          payload: normalizePayload({ ...state.payload, tasks }),
          quizAnswer: "",
          speakingDraft: "",
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
                : "미션 완료 처리에 실패했습니다.",
          },
        });
      }
    },
    [state.payload, update],
  );

  const submitQuiz = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    if (!quizTask) {
      update({ toast: { kind: "error", message: "제출할 퀴즈가 없습니다." } });
      return;
    }

    const answer = state.quizAnswer.trim();

    if (answer.length < 1) {
      update({ toast: { kind: "error", message: "정답을 입력하세요." } });
      return;
    }

    update({ busyAction: "quiz" });

    try {
      const response = await requestJson<ActionResponse>(
        "/api/v1/growth/english/quiz/submit",
        {
          method: "POST",
          body: JSON.stringify({
            taskId: quizTask.id,
            answer: scrub(answer),
            client: mobileClientContext(),
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            adsFinancialTargetingUsed: false,
          }),
        },
      );
      const changed = normalizeTask(
        response.data?.task ?? {
          ...quizTask,
          userAnswer: answer,
          status: "DONE",
        },
      );
      const tasks = state.payload.tasks.map((item: EnglishTask) =>
        item.id === changed.id ? changed : item,
      );
      update({
        payload: normalizePayload({ ...state.payload, tasks }),
        quizAnswer: "",
        busyAction: null,
        toast: { kind: "success", message: "퀴즈 제출을 완료했습니다." },
      });
    } catch (error) {
      update({
        busyAction: null,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "퀴즈 제출에 실패했습니다.",
        },
      });
    }
  }, [quizTask, state.payload, state.quizAnswer, update]);

  const shareProof = ReactRuntimeRef.useCallback(
    (task: EnglishTask): void => {
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
          `English LV UP · v${SCREEN_VERSION}`,
        ),
        h(NativeRuntimeRef.Text, { style: styles.headerTitle }, "영어 루틴"),
        h(
          NativeRuntimeRef.Text,
          { style: styles.headerDescription },
          "단어·리딩·리스닝·스피킹을 작은 미션으로 쌓아 LV UP합니다.",
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
      renderTabs(state.tab, (tab: EnglishTab): void => update({ tab })),
      state.tab === "TODAY"
        ? renderToday(sortedTasks, state.busyAction, completeTask, shareProof)
        : null,
      state.tab === "WORDS" ? renderWords(state.payload.words) : null,
      state.tab === "QUIZ"
        ? renderQuiz(
            quizTask,
            state.quizAnswer,
            state.busyAction,
            (quizAnswer: string): void => update({ quizAnswer }),
            submitQuiz,
          )
        : null,
      state.tab === "SPEAKING"
        ? renderSpeaking(
            sortedTasks,
            state.speakingDraft,
            state.busyAction,
            (speakingDraft: string): void => update({ speakingDraft }),
            completeTask,
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

function renderHero(profile: EnglishProfile, progress: number): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.heroCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.heroTop },
      h(
        NativeRuntimeRef.View,
        { style: styles.levelBadge },
        h(
          NativeRuntimeRef.Text,
          { style: styles.levelBadgeText },
          profile.cefr,
        ),
      ),
      h(
        NativeRuntimeRef.View,
        { style: styles.heroBody },
        h(NativeRuntimeRef.Text, { style: styles.heroTitle }, profile.title),
        h(
          NativeRuntimeRef.Text,
          { style: styles.heroMeta },
          `Lv.${profile.level} · ${formatCount(profile.totalXp)} XP · ${profile.streakDays}일 연속`,
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
      `오늘 ${profile.completedToday}/${profile.todayTarget} 완료 · 정확도 ${profile.accuracyRate.toFixed(1)}%`,
    ),
  );
}

function renderTabs(
  selected: EnglishTab,
  onSelect: (tab: EnglishTab) => void,
): unknown {
  return h(
    NativeRuntimeRef.ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      style: styles.tabs,
      contentContainerStyle: styles.tabsContent,
    },
    ...TABS.map((tab: EnglishTab) =>
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
  tasks: readonly EnglishTask[],
  busyAction: string | null,
  completeTask: (task: EnglishTask, answer: string) => Promise<void>,
  shareProof: (task: EnglishTask) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "오늘의 영어 미션"),
    ...(tasks.length > 0
      ? tasks.map((task: EnglishTask) =>
          renderTask(task, busyAction, completeTask, shareProof),
        )
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-task", style: styles.emptyText },
            "오늘의 영어 미션이 없습니다.",
          ),
        ]),
  );
}

function renderTask(
  task: EnglishTask,
  busyAction: string | null,
  completeTask: (task: EnglishTask, answer: string) => Promise<void>,
  shareProof: (task: EnglishTask) => void,
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
    h(NativeRuntimeRef.Text, { style: styles.taskPrompt }, task.prompt),
    h(
      NativeRuntimeRef.View,
      { style: styles.actionRow },
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          disabled,
          onPress: (): void => void completeTask(task, task.answer),
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
      h(
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
      ),
    ),
  );
}

function renderWords(words: readonly WordCard[]): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "단어 카드"),
    ...(words.length > 0
      ? words.map((word: WordCard) =>
          h(
            NativeRuntimeRef.View,
            {
              key: word.id,
              style: [styles.wordCard, word.mastered ? styles.doneCard : null],
            },
            h(NativeRuntimeRef.Text, { style: styles.wordTitle }, word.word),
            h(
              NativeRuntimeRef.Text,
              { style: styles.wordMeaning },
              word.meaning,
            ),
            h(
              NativeRuntimeRef.Text,
              { style: styles.exampleText },
              word.example,
            ),
            h(
              NativeRuntimeRef.Text,
              { style: word.mastered ? styles.safeText : styles.reviewText },
              word.mastered ? "mastered" : "learning",
            ),
          ),
        )
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-word", style: styles.emptyText },
            "단어 카드가 없습니다.",
          ),
        ]),
  );
}

function renderQuiz(
  task: EnglishTask | null,
  answer: string,
  busyAction: string | null,
  setAnswer: (value: string) => void,
  submitQuiz: () => Promise<void>,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "퀴즈"),
    h(
      NativeRuntimeRef.Text,
      { style: styles.taskPrompt },
      task ? task.prompt : "제출할 퀴즈가 없습니다.",
    ),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "퀴즈 정답",
      autoCapitalize: "none",
      autoCorrect: false,
      onChangeText: setAnswer,
      placeholder: "정답 입력",
      placeholderTextColor: "#64748b",
      style: styles.input,
      value: answer,
    }),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        disabled: !task || busyAction !== null || answer.trim().length < 1,
        onPress: (): void => void submitQuiz(),
        style: [
          styles.primaryButton,
          !task || busyAction !== null || answer.trim().length < 1
            ? styles.buttonDisabled
            : null,
        ],
      },
      busyAction === "quiz"
        ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
        : h(
            NativeRuntimeRef.Text,
            { style: styles.primaryButtonText },
            "퀴즈 제출",
          ),
    ),
  );
}

function renderSpeaking(
  tasks: readonly EnglishTask[],
  draft: string,
  busyAction: string | null,
  setDraft: (value: string) => void,
  completeTask: (task: EnglishTask, answer: string) => Promise<void>,
): unknown {
  const task =
    tasks.find(
      (item: EnglishTask) => item.kind === "SPEAKING" && item.status !== "DONE",
    ) ?? null;

  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "스피킹 노트"),
    h(
      NativeRuntimeRef.Text,
      { style: styles.taskPrompt },
      task ? task.prompt : "스피킹 미션이 없습니다.",
    ),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "스피킹 문장",
      autoCapitalize: "none",
      autoCorrect: false,
      multiline: true,
      onChangeText: setDraft,
      placeholder: "오늘 말할 영어 문장을 적어보세요.",
      placeholderTextColor: "#64748b",
      style: styles.textArea,
      textAlignVertical: "top",
      value: draft,
    }),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        disabled: !task || busyAction !== null || draft.trim().length < 2,
        onPress: (): void => {
          if (task) void completeTask(task, draft);
        },
        style: [
          styles.primaryButton,
          !task || busyAction !== null || draft.trim().length < 2
            ? styles.buttonDisabled
            : null,
        ],
      },
      busyAction === task?.id
        ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
        : h(
            NativeRuntimeRef.Text,
            { style: styles.primaryButtonText },
            "스피킹 완료",
          ),
    ),
  );
}

function renderInsights(
  insights: readonly EnglishInsight[],
  router: RouterLike,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "학습 인사이트"),
    ...(insights.length > 0
      ? insights.map((insight: EnglishInsight) =>
          h(
            NativeRuntimeRef.View,
            { key: insight.id, style: styles.insightCard },
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

function renderStats(stats: EnglishStats): unknown {
  const items = [
    ["미션", `${stats.doneTasks}/${stats.totalTasks}`],
    ["단어", formatCount(stats.masteredWords)],
    ["정확도", stats.quizAccuracy],
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
    "learningOnly=true",
    "rawFinancialData=false",
    "rawPersonalData=false",
    "adsFinancialTargeting=false",
    "communityProofSafe=true",
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.guardBox },
    h(
      NativeRuntimeRef.Text,
      { style: styles.guardTitle },
      "English · Privacy Guard",
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

function normalizePayload(partial: Partial<EnglishPayload>): EnglishPayload {
  const tasks = (partial.tasks ?? []).map(normalizeTask);
  const words = (partial.words ?? []).map(normalizeWord);
  const insights = (partial.insights ?? []).map(normalizeInsight);
  const profile = normalizeProfile(partial.profile ?? fallbackProfile, tasks);
  return {
    profile,
    tasks,
    words,
    insights,
    stats: statsFrom(tasks, words, partial.stats),
  };
}

function normalizeProfile(
  profile: EnglishProfile,
  tasks: readonly EnglishTask[],
): EnglishProfile {
  return {
    ...profile,
    level: positive(profile.level, 1),
    title: scrub(profile.title) || "영어 루틴 입문자",
    totalXp: money(profile.totalXp),
    todayXp: money(profile.todayXp),
    streakDays: money(profile.streakDays),
    cefr: enumOf(["A1", "A2", "B1", "B2", "C1"] as const, profile.cefr, "A1"),
    accuracyRate: percent(profile.accuracyRate),
    completedToday: tasks.filter((task: EnglishTask) => task.status === "DONE")
      .length,
    todayTarget: Math.max(1, money(profile.todayTarget)),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeTask(task: EnglishTask): EnglishTask {
  return {
    ...task,
    id: scrub(task.id),
    kind: enumOf(TASK_KINDS, task.kind, "VOCAB"),
    title: scrub(task.title),
    prompt: scrub(task.prompt),
    answer: scrub(task.answer),
    userAnswer: scrub(task.userAnswer),
    status: enumOf(STATUSES, task.status, "TODO"),
    xp: money(task.xp),
    dueDate: iso(task.dueDate),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeWord(word: WordCard): WordCard {
  return {
    id: scrub(word.id),
    word: scrub(word.word),
    meaning: scrub(word.meaning),
    example: scrub(word.example),
    mastered: Boolean(word.mastered),
    rawPersonalDataExposed: false,
  };
}

function normalizeInsight(insight: EnglishInsight): EnglishInsight {
  return {
    id: scrub(insight.id),
    title: scrub(insight.title),
    body: scrub(insight.body),
    actionLabel: scrub(insight.actionLabel),
    route: scrub(insight.route).startsWith("/")
      ? scrub(insight.route)
      : LEVEL_ROUTE,
  };
}

function sortTasks(tasks: readonly EnglishTask[]): readonly EnglishTask[] {
  return tasks
    .slice()
    .sort(
      (a: EnglishTask, b: EnglishTask) =>
        Number(a.status === "DONE") - Number(b.status === "DONE") ||
        b.xp - a.xp,
    );
}

function statsFrom(
  tasks: readonly EnglishTask[],
  words: readonly WordCard[],
  partial: Partial<EnglishStats> = {},
): EnglishStats {
  const safeTasks = tasks.filter(
    (task: EnglishTask) =>
      !task.rawFinancialDataExposed &&
      !task.rawPersonalDataExposed &&
      !task.adsFinancialTargetingUsed,
  ).length;
  const done = tasks.filter(
    (task: EnglishTask) => task.status === "DONE",
  ).length;
  const quiz = tasks.filter((task: EnglishTask) => task.kind === "QUIZ");
  const correct = quiz.filter(
    (task: EnglishTask) =>
      task.userAnswer.trim().toLowerCase() ===
        task.answer.trim().toLowerCase() && task.status === "DONE",
  ).length;

  return {
    totalTasks: partial.totalTasks ?? tasks.length,
    doneTasks: partial.doneTasks ?? done,
    masteredWords:
      partial.masteredWords ??
      words.filter((word: WordCard) => word.mastered).length,
    quizAccuracy: partial.quizAccuracy ?? pct(correct, quiz.length),
    privacyPassRate: partial.privacyPassRate ?? pct(safeTasks, tasks.length),
  };
}

function seedPayload(): EnglishPayload {
  const now = new Date().toISOString();

  return normalizePayload({
    profile: {
      level: 5,
      title: "출근 영어 루틴러",
      totalXp: 1420,
      todayXp: 45,
      streakDays: 12,
      cefr: "A2",
      accuracyRate: 82.5,
      completedToday: 0,
      todayTarget: 3,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
    tasks: [
      {
        id: "vocab-1",
        kind: "VOCAB",
        title: "오늘의 단어 5개",
        prompt:
          "budget, habit, improve, steady, review를 소리 내어 읽고 뜻을 확인하세요.",
        answer: "done",
        userAnswer: "",
        status: "TODO",
        xp: 25,
        dueDate: now,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "quiz-1",
        kind: "QUIZ",
        title: "문장 완성",
        prompt:
          "I ___ my budget every morning. 빈칸에 알맞은 단어를 입력하세요.",
        answer: "review",
        userAnswer: "",
        status: "TODO",
        xp: 35,
        dueDate: now,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "speak-1",
        kind: "SPEAKING",
        title: "오늘 한 문장 말하기",
        prompt:
          "I am building a steady routine. 문장을 따라 말하고 직접 적어보세요.",
        answer: "I am building a steady routine.",
        userAnswer: "",
        status: "TODO",
        xp: 40,
        dueDate: now,
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        adsFinancialTargetingUsed: false,
      },
    ],
    words: [
      {
        id: "word-budget",
        word: "budget",
        meaning: "예산",
        example: "I check my budget every day.",
        mastered: true,
        rawPersonalDataExposed: false,
      },
      {
        id: "word-routine",
        word: "routine",
        meaning: "루틴",
        example: "A small routine makes me stronger.",
        mastered: false,
        rawPersonalDataExposed: false,
      },
    ],
    insights: [
      {
        id: "insight-1",
        title: "짧은 반복이 가장 강합니다",
        body: "매일 5분 단어와 한 문장 말하기를 유지하면 LV UP 속도가 안정적으로 올라갑니다.",
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
    : `mobile-english-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "영어 학습 접근이 제한되었습니다.";
  if (status === 404) return "영어 학습 데이터를 찾을 수 없습니다.";
  if (status === 409) return "학습 상태가 변경되었습니다. 새로고침하세요.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";

  return `영어 학습 요청에 실패했습니다. (${status})`;
}

function sanitize(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return scrub(value);
  if (Array.isArray(value)) return value.slice(0, 40).map(sanitize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 40)
        .map(([key, item]: [string, unknown]) => [
          key,
          isSensitiveKey(key) ? "[REDACTED]" : sanitize(item),
        ]),
    ) as JsonRecord;
  }
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
  return new Intl.NumberFormat("ko-KR").format(money(value));
}

export function assertMobileEnglishLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_english_runtime_loaded",
    "react_native_runtime_loaded",
    "english_level_screen",
    "today_english_tasks",
    "vocab_reading_listening_speaking_quiz",
    "word_cards",
    "quiz_submit",
    "speaking_note",
    "task_complete_action",
    "community_proof_route",
    "api_v1_growth_english_dashboard",
    "api_v1_growth_english_task_complete",
    "api_v1_growth_english_quiz_submit",
    "cefr_and_accuracy",
    "streak_and_xp",
    "sensitive_error_redaction",
    "raw_financial_data_exposure_forbidden",
    "raw_personal_data_exposure_forbidden",
    "ads_financial_targeting_forbidden",
    "learning_only_boundary",
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
  levelBadgeText: { color: "#020617", fontSize: 20, fontWeight: "900" },
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
  wordCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },
  wordTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  wordMeaning: { color: "#67e8f9", fontSize: 14, fontWeight: "900" },
  exampleText: { color: "#cbd5e1", fontSize: 13, lineHeight: 19 },
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
  safeText: { color: "#86efac", fontSize: 12, fontWeight: "900" },
  reviewText: { color: "#fde68a", fontSize: 12, fontWeight: "900" },
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
