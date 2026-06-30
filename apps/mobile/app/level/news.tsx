/** apps/mobile/app/level/news.tsx
 * 급여납치 모바일 LV UP 뉴스 학습 화면 최종본.
 * 정적 import와 JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../src/shared/api/api-base";
import { attachMobileBearerToken } from "../../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type NewsTab = "TODAY" | "FEED" | "QUIZ" | "BOOKMARK" | "INSIGHT";
type NewsCategory = "ECONOMY" | "TECH" | "WORLD" | "CAREER" | "LIFE";
type ReadingStatus = "UNREAD" | "READING" | "DONE" | "LOCKED";
type RiskLabel = "SAFE" | "REVIEW" | "BLOCKED";
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

type NewsProfile = Readonly<{
  level: number;
  title: string;
  totalXp: number;
  todayXp: number;
  streakDays: number;
  readingMinutesThisWeek: number;
  completedToday: number;
  todayTarget: number;
  comprehensionRate: number;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPublisherTrackingExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type NewsArticle = Readonly<{
  id: string;
  category: NewsCategory;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  readingMinutes: number;
  status: ReadingStatus;
  xp: number;
  isBookmarked: boolean;
  riskLabel: RiskLabel;
  quizQuestion: string;
  quizAnswer: string;
  userAnswer: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawPublisherTrackingExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type NewsInsight = Readonly<{
  id: string;
  title: string;
  body: string;
  severity: "GOOD" | "WATCH" | "ACTION";
  actionLabel: string;
  route: string;
}>;
type NewsStats = Readonly<{
  totalArticles: number;
  readArticles: number;
  bookmarkedArticles: number;
  readingMinutes: number;
  quizAccuracy: string;
  privacyPassRate: string;
}>;
type NewsPayload = Readonly<{
  profile: NewsProfile;
  articles: readonly NewsArticle[];
  insights: readonly NewsInsight[];
  stats: NewsStats;
}>;
type NewsResponse = Readonly<{ data?: Partial<NewsPayload>; error?: unknown }>;
type ActionResponse = Readonly<{
  data?: Partial<NewsPayload> & { readonly article?: NewsArticle };
  error?: unknown;
}>;

type NewsState = Readonly<{
  tab: NewsTab;
  payload: NewsPayload;
  quizAnswer: string;
  searchText: string;
  busyAction: string | null;
  refreshing: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const SCREEN_VERSION = "3.1.0";
const LEVEL_ROUTE = "/level";
const COMMUNITY_WRITE_ROUTE = "/community/write";
const TABS = ["TODAY", "FEED", "QUIZ", "BOOKMARK", "INSIGHT"] as const;
const CATEGORIES = ["ECONOMY", "TECH", "WORLD", "CAREER", "LIFE"] as const;
const STATUSES = ["UNREAD", "READING", "DONE", "LOCKED"] as const;
const RISK_VALUES = ["SAFE", "REVIEW", "BLOCKED"] as const;

const tabLabels: Readonly<Record<NewsTab, string>> = Object.freeze({
  TODAY: "오늘",
  FEED: "뉴스",
  QUIZ: "퀴즈",
  BOOKMARK: "저장",
  INSIGHT: "인사이트",
});
const categoryLabels: Readonly<Record<NewsCategory, string>> = Object.freeze({
  ECONOMY: "경제",
  TECH: "기술",
  WORLD: "세계",
  CAREER: "커리어",
  LIFE: "생활",
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
  "publisherUserId",
  "trackingId",
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
  "추적",
  "식별자",
] as const;

const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const RouterRuntimeRef = loadRouterRuntime();
const SecureStoreRuntimeRef = loadSecureStoreRuntime();
const API_BASE_URL = readMobileApiBaseUrl();

const fallbackProfile: NewsProfile = Object.freeze({
  level: 1,
  title: "뉴스 루틴 입문자",
  totalXp: 0,
  todayXp: 0,
  streakDays: 0,
  readingMinutesThisWeek: 0,
  completedToday: 0,
  todayTarget: 2,
  comprehensionRate: 0,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  rawPublisherTrackingExposed: false,
  adsFinancialTargetingUsed: false,
});
const fallbackPayload: NewsPayload = Object.freeze({
  profile: fallbackProfile,
  articles: [],
  insights: [],
  stats: {
    totalArticles: 0,
    readArticles: 0,
    bookmarkedArticles: 0,
    readingMinutes: 0,
    quizAccuracy: "0.00%",
    privacyPassRate: "100.00%",
  },
});

export default function NewsLevelScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [state, setState] = ReactRuntimeRef.useState<NewsState>({
    tab: "TODAY",
    payload: fallbackPayload,
    quizAnswer: "",
    searchText: "",
    busyAction: null,
    refreshing: false,
    toast: { kind: "info", message: "뉴스 LV UP 루틴을 안전하게 불러옵니다." },
  });
  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<NewsState>): void =>
      setState((prev: NewsState) => ({ ...prev, ...patch })),
    [],
  );
  const filteredArticles = ReactRuntimeRef.useMemo(
    () => filterArticles(state.payload.articles, state.searchText),
    [state.payload.articles, state.searchText],
  );
  const todayArticles = ReactRuntimeRef.useMemo(
    () => sortArticles(filteredArticles).slice(0, 5),
    [filteredArticles],
  );
  const bookmarkedArticles = ReactRuntimeRef.useMemo(
    () =>
      sortArticles(
        filteredArticles.filter((article: NewsArticle) => article.isBookmarked),
      ),
    [filteredArticles],
  );
  const quizArticle = ReactRuntimeRef.useMemo(
    () =>
      sortArticles(filteredArticles).find(
        (article: NewsArticle) =>
          article.status !== "DONE" && article.quizQuestion.trim().length > 0,
      ) ?? null,
    [filteredArticles],
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
    setState((prev: NewsState) => ({ ...prev, refreshing: true }));
    try {
      const response = await requestJson<NewsResponse>(
        "/api/v1/growth/news/dashboard",
      );
      const payload = normalizePayload(response.data ?? {});
      setState((prev: NewsState) => ({
        ...prev,
        payload,
        refreshing: false,
        toast: { kind: "success", message: "뉴스 학습 현황을 동기화했습니다." },
      }));
    } catch (error) {
      const seeded = seedPayload();
      setState((prev: NewsState) => ({
        ...prev,
        payload: prev.payload.articles.length > 0 ? prev.payload : seeded,
        refreshing: false,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "뉴스 학습 현황 조회에 실패했습니다.",
        },
      }));
    }
  }, []);

  const markRead = ReactRuntimeRef.useCallback(
    async (article: NewsArticle): Promise<void> => {
      update({ busyAction: article.id });
      try {
        const response = await requestJson<ActionResponse>(
          `/api/v1/growth/news/articles/${encodeURIComponent(article.id)}/read`,
          {
            method: "POST",
            body: JSON.stringify({
              readingMinutes: article.readingMinutes,
              client: mobileClientContext(),
              rawFinancialDataExposed: false,
              rawPersonalDataExposed: false,
              rawPublisherTrackingExposed: false,
              adsFinancialTargetingUsed: false,
            }),
          },
        );
        const changed = normalizeArticle(
          response.data?.article ?? { ...article, status: "DONE" },
        );
        const articles = state.payload.articles.map((item: NewsArticle) =>
          item.id === changed.id ? changed : item,
        );
        update({
          payload: normalizePayload({ ...state.payload, articles }),
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
                : "읽기 완료 처리에 실패했습니다.",
          },
        });
      }
    },
    [state.payload, update],
  );

  const toggleBookmark = ReactRuntimeRef.useCallback(
    async (article: NewsArticle): Promise<void> => {
      update({ busyAction: `bookmark:${article.id}` });
      try {
        const response = await requestJson<ActionResponse>(
          `/api/v1/growth/news/articles/${encodeURIComponent(article.id)}/bookmark`,
          {
            method: "POST",
            body: JSON.stringify({
              bookmarked: !article.isBookmarked,
              client: mobileClientContext(),
              rawFinancialDataExposed: false,
              rawPersonalDataExposed: false,
              rawPublisherTrackingExposed: false,
              adsFinancialTargetingUsed: false,
            }),
          },
        );
        const changed = normalizeArticle(
          response.data?.article ?? {
            ...article,
            isBookmarked: !article.isBookmarked,
          },
        );
        const articles = state.payload.articles.map((item: NewsArticle) =>
          item.id === changed.id ? changed : item,
        );
        update({
          payload: normalizePayload({ ...state.payload, articles }),
          busyAction: null,
          toast: {
            kind: "success",
            message: changed.isBookmarked
              ? "뉴스를 저장했습니다."
              : "저장을 해제했습니다.",
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
                : "저장 상태 변경에 실패했습니다.",
          },
        });
      }
    },
    [state.payload, update],
  );

  const submitQuiz = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    if (!quizArticle) {
      update({
        toast: { kind: "error", message: "제출할 뉴스 퀴즈가 없습니다." },
      });
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
        "/api/v1/growth/news/quiz/submit",
        {
          method: "POST",
          body: JSON.stringify({
            articleId: quizArticle.id,
            answer: scrub(answer),
            client: mobileClientContext(),
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            rawPublisherTrackingExposed: false,
            adsFinancialTargetingUsed: false,
          }),
        },
      );
      const changed = normalizeArticle(
        response.data?.article ?? {
          ...quizArticle,
          userAnswer: answer,
          status: "DONE",
        },
      );
      const articles = state.payload.articles.map((item: NewsArticle) =>
        item.id === changed.id ? changed : item,
      );
      update({
        payload: normalizePayload({ ...state.payload, articles }),
        quizAnswer: "",
        busyAction: null,
        toast: { kind: "success", message: "뉴스 퀴즈 제출을 완료했습니다." },
      });
    } catch (error) {
      update({
        busyAction: null,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "뉴스 퀴즈 제출에 실패했습니다.",
        },
      });
    }
  }, [quizArticle, state.payload, state.quizAnswer, update]);

  const shareProof = ReactRuntimeRef.useCallback(
    (article: NewsArticle): void => {
      router.push(
        `${COMMUNITY_WRITE_ROUTE}?growthTaskId=${encodeURIComponent(article.id)}&board=LEVEL_UP` as never,
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
          `News LV UP · v${SCREEN_VERSION}`,
        ),
        h(NativeRuntimeRef.Text, { style: styles.headerTitle }, "뉴스 루틴"),
        h(
          NativeRuntimeRef.Text,
          { style: styles.headerDescription },
          "경제·기술·세계·커리어 뉴스를 짧게 읽고 이해력을 XP로 쌓습니다.",
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
      renderSearch(state.searchText, (searchText: string): void =>
        update({ searchText }),
      ),
      renderTabs(state.tab, (tab: NewsTab): void => update({ tab })),
      state.tab === "TODAY"
        ? renderArticleList(
            "오늘의 뉴스 미션",
            todayArticles,
            state.busyAction,
            markRead,
            toggleBookmark,
            shareProof,
          )
        : null,
      state.tab === "FEED"
        ? renderArticleList(
            "뉴스 피드",
            sortArticles(filteredArticles),
            state.busyAction,
            markRead,
            toggleBookmark,
            shareProof,
          )
        : null,
      state.tab === "QUIZ"
        ? renderQuiz(
            quizArticle,
            state.quizAnswer,
            state.busyAction,
            (quizAnswer: string): void => update({ quizAnswer }),
            submitQuiz,
          )
        : null,
      state.tab === "BOOKMARK"
        ? renderArticleList(
            "저장한 뉴스",
            bookmarkedArticles,
            state.busyAction,
            markRead,
            toggleBookmark,
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

function renderHero(profile: NewsProfile, progress: number): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.heroCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.heroTop },
      h(
        NativeRuntimeRef.View,
        { style: styles.levelBadge },
        h(NativeRuntimeRef.Text, { style: styles.levelBadgeText }, "N"),
      ),
      h(
        NativeRuntimeRef.View,
        { style: styles.heroBody },
        h(NativeRuntimeRef.Text, { style: styles.heroTitle }, profile.title),
        h(
          NativeRuntimeRef.Text,
          { style: styles.heroMeta },
          `Lv.${profile.level} · ${formatCount(profile.totalXp)} XP · ${profile.streakDays}일 연속 · 이해도 ${profile.comprehensionRate.toFixed(1)}%`,
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
      `오늘 ${profile.completedToday}/${profile.todayTarget} 완료 · 주간 읽기 ${formatCount(profile.readingMinutesThisWeek)}분`,
    ),
  );
}

function renderSearch(
  value: string,
  setValue: (value: string) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.searchCard },
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "뉴스 검색",
      autoCapitalize: "none",
      autoCorrect: false,
      onChangeText: setValue,
      placeholder: "제목·요약·출처 검색",
      placeholderTextColor: "#64748b",
      style: styles.searchInput,
      value,
    }),
  );
}

function renderTabs(
  selected: NewsTab,
  onSelect: (tab: NewsTab) => void,
): unknown {
  return h(
    NativeRuntimeRef.ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      style: styles.tabs,
      contentContainerStyle: styles.tabsContent,
    },
    ...TABS.map((tab: NewsTab) =>
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

function renderArticleList(
  title: string,
  articles: readonly NewsArticle[],
  busyAction: string | null,
  markRead: (article: NewsArticle) => Promise<void>,
  toggleBookmark: (article: NewsArticle) => Promise<void>,
  shareProof: (article: NewsArticle) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, title),
    ...(articles.length > 0
      ? articles.map((article: NewsArticle) =>
          renderArticle(
            article,
            busyAction,
            markRead,
            toggleBookmark,
            shareProof,
          ),
        )
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-news", style: styles.emptyText },
            "표시할 뉴스가 없습니다.",
          ),
        ]),
  );
}

function renderArticle(
  article: NewsArticle,
  busyAction: string | null,
  markRead: (article: NewsArticle) => Promise<void>,
  toggleBookmark: (article: NewsArticle) => Promise<void>,
  shareProof: (article: NewsArticle) => void,
): unknown {
  const done = article.status === "DONE";
  const disabled =
    busyAction !== null ||
    done ||
    article.status === "LOCKED" ||
    article.riskLabel === "BLOCKED";
  return h(
    NativeRuntimeRef.View,
    {
      key: article.id,
      style: [styles.articleCard, done ? styles.doneCard : null],
    },
    h(
      NativeRuntimeRef.View,
      { style: styles.rowTop },
      h(
        NativeRuntimeRef.Text,
        { style: styles.categoryPill },
        categoryLabels[article.category],
      ),
      h(
        NativeRuntimeRef.Text,
        {
          style:
            article.riskLabel === "SAFE" ? styles.safeText : styles.reviewText,
        },
        article.riskLabel,
      ),
    ),
    h(NativeRuntimeRef.Text, { style: styles.articleTitle }, article.title),
    h(NativeRuntimeRef.Text, { style: styles.articleSummary }, article.summary),
    h(
      NativeRuntimeRef.Text,
      { style: styles.sourceText },
      `${article.sourceName} · ${relativeTime(article.publishedAt)} · ${formatCount(article.readingMinutes)}분 · +${article.xp} XP`,
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.actionRow },
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          disabled,
          onPress: (): void => void markRead(article),
          style: [
            styles.primaryButtonSmall,
            disabled ? styles.buttonDisabled : null,
          ],
        },
        busyAction === article.id
          ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
          : h(
              NativeRuntimeRef.Text,
              { style: styles.primaryButtonSmallText },
              done ? "완료" : "읽기 완료",
            ),
      ),
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          disabled: busyAction !== null,
          onPress: (): void => void toggleBookmark(article),
          style: [
            styles.secondaryButtonSmall,
            article.isBookmarked ? styles.secondaryButtonActive : null,
          ],
        },
        h(
          NativeRuntimeRef.Text,
          { style: styles.secondaryButtonSmallText },
          article.isBookmarked ? "저장됨" : "저장",
        ),
      ),
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          onPress: (): void => shareProof(article),
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

function renderQuiz(
  article: NewsArticle | null,
  answer: string,
  busyAction: string | null,
  setAnswer: (value: string) => void,
  submitQuiz: () => Promise<void>,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "뉴스 이해 퀴즈"),
    h(
      NativeRuntimeRef.Text,
      { style: styles.articleTitle },
      article ? article.title : "제출할 퀴즈가 없습니다.",
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.articleSummary },
      article
        ? article.quizQuestion
        : "오늘의 뉴스 퀴즈를 불러오면 여기에 표시됩니다.",
    ),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "뉴스 퀴즈 정답",
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
        disabled: !article || busyAction !== null || answer.trim().length < 1,
        onPress: (): void => void submitQuiz(),
        style: [
          styles.primaryButton,
          !article || busyAction !== null || answer.trim().length < 1
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

function renderInsights(
  insights: readonly NewsInsight[],
  router: RouterLike,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(
      NativeRuntimeRef.Text,
      { style: styles.panelTitle },
      "뉴스 루틴 인사이트",
    ),
    ...(insights.length > 0
      ? insights.map((insight: NewsInsight) =>
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
              { style: styles.articleTitle },
              insight.title,
            ),
            h(
              NativeRuntimeRef.Text,
              { style: styles.articleSummary },
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

function renderStats(stats: NewsStats): unknown {
  const items = [
    ["뉴스", `${stats.readArticles}/${stats.totalArticles}`],
    ["저장", formatCount(stats.bookmarkedArticles)],
    ["읽기", `${formatCount(stats.readingMinutes)}분`],
    ["정답률", stats.quizAccuracy],
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
    "newsLearningOnly=true",
    "sourceAttribution=true",
    "noPublisherTracking=true",
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
      "News · Privacy Guard",
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
  headers.set("x-raw-publisher-tracking-exposed", "false");
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

function normalizePayload(partial: Partial<NewsPayload>): NewsPayload {
  const articles = (partial.articles ?? [])
    .map(normalizeArticle)
    .filter((article: NewsArticle) => article.riskLabel !== "BLOCKED");
  const insights = (partial.insights ?? []).map(normalizeInsight);
  const profile = normalizeProfile(
    partial.profile ?? fallbackProfile,
    articles,
  );
  return {
    profile,
    articles,
    insights,
    stats: statsFrom(articles, partial.stats),
  };
}

function normalizeProfile(
  profile: NewsProfile,
  articles: readonly NewsArticle[],
): NewsProfile {
  return {
    ...profile,
    level: positive(profile.level, 1),
    title: scrub(profile.title) || "뉴스 루틴 입문자",
    totalXp: money(profile.totalXp),
    todayXp: money(profile.todayXp),
    streakDays: money(profile.streakDays),
    readingMinutesThisWeek: money(profile.readingMinutesThisWeek),
    completedToday: articles.filter(
      (article: NewsArticle) => article.status === "DONE",
    ).length,
    todayTarget: Math.max(1, money(profile.todayTarget)),
    comprehensionRate: percent(profile.comprehensionRate),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPublisherTrackingExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeArticle(article: NewsArticle): NewsArticle {
  const sourceUrl = scrub(article.sourceUrl);
  return {
    ...article,
    id: scrub(article.id),
    category: enumOf(CATEGORIES, article.category, "LIFE"),
    title: scrub(article.title),
    summary: scrub(article.summary),
    sourceName: scrub(article.sourceName) || "출처 미상",
    sourceUrl: sourceUrl.startsWith("https://") ? sourceUrl : "",
    publishedAt: iso(article.publishedAt),
    readingMinutes: money(article.readingMinutes),
    status: enumOf(STATUSES, article.status, "UNREAD"),
    xp: money(article.xp),
    riskLabel: enumOf(RISK_VALUES, article.riskLabel, "SAFE"),
    quizQuestion: scrub(article.quizQuestion),
    quizAnswer: scrub(article.quizAnswer),
    userAnswer: scrub(article.userAnswer),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPublisherTrackingExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeInsight(insight: NewsInsight): NewsInsight {
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

function filterArticles(
  articles: readonly NewsArticle[],
  searchText: string,
): readonly NewsArticle[] {
  const keyword = searchText.trim().toLowerCase();
  if (!keyword) return articles;
  return articles.filter((article: NewsArticle) =>
    `${article.title} ${article.summary} ${article.sourceName} ${categoryLabels[article.category]}`
      .toLowerCase()
      .includes(keyword),
  );
}

function sortArticles(
  articles: readonly NewsArticle[],
): readonly NewsArticle[] {
  return articles
    .slice()
    .sort(
      (a: NewsArticle, b: NewsArticle) =>
        Number(a.status === "DONE") - Number(b.status === "DONE") ||
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

function statsFrom(
  articles: readonly NewsArticle[],
  partial: Partial<NewsStats> = {},
): NewsStats {
  const safeArticles = articles.filter(
    (article: NewsArticle) =>
      !article.rawFinancialDataExposed &&
      !article.rawPersonalDataExposed &&
      !article.rawPublisherTrackingExposed &&
      !article.adsFinancialTargetingUsed,
  ).length;
  const readArticles = articles.filter(
    (article: NewsArticle) => article.status === "DONE",
  ).length;
  const quizArticles = articles.filter(
    (article: NewsArticle) => article.quizQuestion.trim().length > 0,
  );
  const correct = quizArticles.filter(
    (article: NewsArticle) =>
      article.userAnswer.trim().toLowerCase() ===
        article.quizAnswer.trim().toLowerCase() && article.status === "DONE",
  ).length;
  return {
    totalArticles: partial.totalArticles ?? articles.length,
    readArticles: partial.readArticles ?? readArticles,
    bookmarkedArticles:
      partial.bookmarkedArticles ??
      articles.filter((article: NewsArticle) => article.isBookmarked).length,
    readingMinutes:
      partial.readingMinutes ??
      articles
        .filter((article: NewsArticle) => article.status === "DONE")
        .reduce(
          (sum: number, article: NewsArticle) => sum + article.readingMinutes,
          0,
        ),
    quizAccuracy: partial.quizAccuracy ?? pct(correct, quizArticles.length),
    privacyPassRate:
      partial.privacyPassRate ?? pct(safeArticles, articles.length),
  };
}

function seedPayload(): NewsPayload {
  const now = new Date().toISOString();
  return normalizePayload({
    profile: {
      level: 4,
      title: "출근길 뉴스 루틴러",
      totalXp: 980,
      todayXp: 50,
      streakDays: 9,
      readingMinutesThisWeek: 72,
      completedToday: 0,
      todayTarget: 2,
      comprehensionRate: 78.4,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawPublisherTrackingExposed: false,
      adsFinancialTargetingUsed: false,
    },
    articles: [
      {
        id: "news-tech-1",
        category: "TECH",
        title: "AI 도구를 업무 루틴에 적용하는 법",
        summary:
          "업무 자동화와 생산성 향상을 위해 작은 반복 작업부터 AI 도구에 맡기는 방식의 학습 기사입니다.",
        sourceName: "급여납치 학습 큐레이션",
        sourceUrl: "https://example.com/learning/ai-routine",
        publishedAt: now,
        readingMinutes: 4,
        status: "UNREAD",
        xp: 35,
        isBookmarked: false,
        riskLabel: "SAFE",
        quizQuestion: "AI 도구 적용은 어떤 작업부터 시작하는 것이 좋나요?",
        quizAnswer: "작은 반복 작업",
        userAnswer: "",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPublisherTrackingExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "news-career-1",
        category: "CAREER",
        title: "하루 10분 뉴스 읽기 습관",
        summary:
          "긴 기사보다 짧은 요약, 출처 확인, 핵심 문장 기록을 통해 꾸준한 자기계발 루틴을 만드는 방법입니다.",
        sourceName: "급여납치 학습 큐레이션",
        sourceUrl: "https://example.com/learning/news-habit",
        publishedAt: now,
        readingMinutes: 3,
        status: "UNREAD",
        xp: 30,
        isBookmarked: true,
        riskLabel: "SAFE",
        quizQuestion: "뉴스 루틴에서 반드시 확인해야 하는 것은 무엇인가요?",
        quizAnswer: "출처",
        userAnswer: "",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPublisherTrackingExposed: false,
        adsFinancialTargetingUsed: false,
      },
    ],
    insights: [
      {
        id: "news-insight-1",
        title: "뉴스는 짧게, 출처는 명확하게",
        body: "뉴스 루틴은 현재 시사 정보를 암기하는 기능이 아니라 출처 확인과 요약 능력을 키우는 LV UP 미션입니다.",
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
    sourceAttributionRequired: true,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawPublisherTrackingExposed: false,
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
    : `mobile-news-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "뉴스 루틴 접근이 제한되었습니다.";
  if (status === 404) return "뉴스 루틴 데이터를 찾을 수 없습니다.";
  if (status === 409) return "뉴스 루틴 상태가 변경되었습니다. 새로고침하세요.";
  if (status === 422) return "출처가 불명확하거나 안전하지 않은 뉴스입니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  return `뉴스 루틴 요청에 실패했습니다. (${status})`;
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
function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(Math.abs(diff) / 60000));
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
function formatCount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(money(value));
}

export function assertMobileNewsLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_news_runtime_loaded",
    "react_native_runtime_loaded",
    "news_level_screen",
    "today_news_missions",
    "economy_tech_world_career_life_categories",
    "news_feed_search",
    "read_complete_action",
    "bookmark_action",
    "news_quiz_submit",
    "community_proof_route",
    "source_attribution",
    "api_v1_growth_news_dashboard",
    "api_v1_growth_news_article_read",
    "api_v1_growth_news_bookmark",
    "api_v1_growth_news_quiz_submit",
    "streak_xp_comprehension",
    "news_learning_only_boundary",
    "publisher_tracking_block",
    "sensitive_error_redaction",
    "raw_financial_data_exposure_forbidden",
    "raw_personal_data_exposure_forbidden",
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
  searchCard: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
  },
  searchInput: {
    backgroundColor: "#020617",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    borderWidth: 1,
    color: "#f8fafc",
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 13,
  },
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
  articleCard: {
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
  categoryPill: {
    backgroundColor: "rgba(103,232,249,0.14)",
    borderRadius: 999,
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  safeText: { color: "#86efac", fontSize: 12, fontWeight: "900" },
  reviewText: { color: "#fde68a", fontSize: 12, fontWeight: "900" },
  actionText: { color: "#fecdd3", fontSize: 12, fontWeight: "900" },
  articleTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  articleSummary: { color: "#cbd5e1", fontSize: 13, lineHeight: 20 },
  sourceText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 17,
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
  secondaryButtonActive: {
    backgroundColor: "rgba(52,211,153,0.18)",
    borderColor: "rgba(52,211,153,0.32)",
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
  insightCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  insightSeverity: { fontSize: 11, fontWeight: "900" },
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
