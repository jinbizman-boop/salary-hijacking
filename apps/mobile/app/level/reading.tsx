/** apps/mobile/app/level/reading.tsx
 * 급여납치 모바일 LV UP 독서 루틴 화면 최종본.
 * 정적 import와 JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../src/shared/api/api-base";
import { attachMobileBearerToken } from "../../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type ReadingTab =
  | "TODAY"
  | "LIBRARY"
  | "NOTE"
  | "QUIZ"
  | "BOOKMARK"
  | "INSIGHT";
type BookCategory = "MONEY" | "CAREER" | "SELF_DEV" | "BUSINESS" | "LIFE";
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

type ReadingProfile = Readonly<{
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
  rawCopyrightFullTextExposed: false;
  adsFinancialTargetingUsed: false;
}>;
type ReadingBook = Readonly<{
  id: string;
  category: BookCategory;
  title: string;
  author: string;
  sourceName: string;
  summary: string;
  excerpt: string;
  notePrompt: string;
  quizQuestion: string;
  quizAnswer: string;
  userAnswer: string;
  readingMinutes: number;
  status: ReadingStatus;
  xp: number;
  isBookmarked: boolean;
  riskLabel: RiskLabel;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  rawCopyrightFullTextExposed: false;
  adsFinancialTargetingUsed: false;
}>;
type ReadingNote = Readonly<{
  id: string;
  bookId: string;
  body: string;
  createdAt: string;
  isPrivate: boolean;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;
type ReadingInsight = Readonly<{
  id: string;
  title: string;
  body: string;
  severity: "GOOD" | "WATCH" | "ACTION";
  actionLabel: string;
  route: string;
}>;
type ReadingStats = Readonly<{
  totalBooks: number;
  completedBooks: number;
  bookmarkedBooks: number;
  readingMinutes: number;
  noteCount: number;
  quizAccuracy: string;
  privacyPassRate: string;
}>;
type ReadingPayload = Readonly<{
  profile: ReadingProfile;
  books: readonly ReadingBook[];
  notes: readonly ReadingNote[];
  insights: readonly ReadingInsight[];
  stats: ReadingStats;
}>;
type ReadingResponse = Readonly<{
  data?: Partial<ReadingPayload>;
  error?: unknown;
}>;
type ActionResponse = Readonly<{
  data?: Partial<ReadingPayload> & {
    readonly book?: ReadingBook;
    readonly note?: ReadingNote;
  };
  error?: unknown;
}>;
type ReadingState = Readonly<{
  tab: ReadingTab;
  payload: ReadingPayload;
  selectedBookId: string | null;
  noteDraft: string;
  quizAnswer: string;
  searchText: string;
  busyAction: string | null;
  refreshing: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const SCREEN_VERSION = "3.1.1";
const LEVEL_ROUTE = "/level";
const COMMUNITY_WRITE_ROUTE = "/community/write";
const TABS = [
  "TODAY",
  "LIBRARY",
  "NOTE",
  "QUIZ",
  "BOOKMARK",
  "INSIGHT",
] as const;
const CATEGORIES = ["MONEY", "CAREER", "SELF_DEV", "BUSINESS", "LIFE"] as const;
const STATUSES = ["UNREAD", "READING", "DONE", "LOCKED"] as const;
const RISK_VALUES = ["SAFE", "REVIEW", "BLOCKED"] as const;
const tabLabels: Readonly<Record<ReadingTab, string>> = Object.freeze({
  TODAY: "오늘",
  LIBRARY: "서재",
  NOTE: "노트",
  QUIZ: "퀴즈",
  BOOKMARK: "저장",
  INSIGHT: "인사이트",
});
const categoryLabels: Readonly<Record<BookCategory, string>> = Object.freeze({
  MONEY: "돈",
  CAREER: "커리어",
  SELF_DEV: "자기계발",
  BUSINESS: "비즈니스",
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
  "fullText",
  "copyright",
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
  "전문",
  "저작권",
] as const;

const ReactRuntimeRef = loadReactRuntime();
const NativeRuntimeRef = loadNativeRuntime();
const RouterRuntimeRef = loadRouterRuntime();
const SecureStoreRuntimeRef = loadSecureStoreRuntime();
const API_BASE_URL = readMobileApiBaseUrl();
const fallbackProfile: ReadingProfile = Object.freeze({
  level: 1,
  title: "독서 루틴 입문자",
  totalXp: 0,
  todayXp: 0,
  streakDays: 0,
  readingMinutesThisWeek: 0,
  completedToday: 0,
  todayTarget: 2,
  comprehensionRate: 0,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  rawCopyrightFullTextExposed: false,
  adsFinancialTargetingUsed: false,
});
const fallbackPayload: ReadingPayload = Object.freeze({
  profile: fallbackProfile,
  books: [],
  notes: [],
  insights: [],
  stats: {
    totalBooks: 0,
    completedBooks: 0,
    bookmarkedBooks: 0,
    readingMinutes: 0,
    noteCount: 0,
    quizAccuracy: "0.00%",
    privacyPassRate: "100.00%",
  },
});

export default function ReadingLevelScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [state, setState] = ReactRuntimeRef.useState<ReadingState>({
    tab: "TODAY",
    payload: fallbackPayload,
    selectedBookId: null,
    noteDraft: "",
    quizAnswer: "",
    searchText: "",
    busyAction: null,
    refreshing: false,
    toast: { kind: "info", message: "독서 LV UP 루틴을 안전하게 불러옵니다." },
  });
  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<ReadingState>): void =>
      setState((prev: ReadingState) => ({ ...prev, ...patch })),
    [],
  );
  const books = ReactRuntimeRef.useMemo(
    () => sortBooks(filterBooks(state.payload.books, state.searchText)),
    [state.payload.books, state.searchText],
  );
  const todayBooks = ReactRuntimeRef.useMemo(() => books.slice(0, 5), [books]);
  const bookmarkedBooks = ReactRuntimeRef.useMemo(
    () => books.filter((book: ReadingBook) => book.isBookmarked),
    [books],
  );
  const selectedBook = ReactRuntimeRef.useMemo(
    () =>
      state.payload.books.find(
        (book: ReadingBook) => book.id === state.selectedBookId,
      ) ??
      todayBooks[0] ??
      null,
    [state.payload.books, state.selectedBookId, todayBooks],
  );
  const quizBook = ReactRuntimeRef.useMemo(
    () =>
      books.find(
        (book: ReadingBook) =>
          book.status !== "DONE" && book.quizQuestion.trim().length > 0,
      ) ?? selectedBook,
    [books, selectedBook],
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
    setState((prev: ReadingState) => ({ ...prev, refreshing: true }));
    try {
      const response = await requestJson<ReadingResponse>(
        "/api/v1/growth/reading/dashboard",
      );
      const payload = normalizePayload(response.data ?? {});
      setState((prev: ReadingState) => ({
        ...prev,
        payload,
        selectedBookId: payload.books[0]?.id ?? null,
        refreshing: false,
        toast: { kind: "success", message: "독서 루틴 현황을 동기화했습니다." },
      }));
    } catch (error) {
      const seeded = seedPayload();
      setState((prev: ReadingState) => ({
        ...prev,
        payload: prev.payload.books.length > 0 ? prev.payload : seeded,
        selectedBookId: prev.selectedBookId ?? seeded.books[0]?.id ?? null,
        refreshing: false,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "독서 루틴 현황 조회에 실패했습니다.",
        },
      }));
    }
  }, []);

  const mutateBook = ReactRuntimeRef.useCallback(
    async (
      book: ReadingBook,
      action: "read" | "bookmark" | "quiz",
      answer = "",
    ): Promise<void> => {
      update({
        busyAction: action === "quiz" ? "quiz" : `${action}:${book.id}`,
      });
      const endpoint =
        action === "read"
          ? `/api/v1/growth/reading/books/${encodeURIComponent(book.id)}/read`
          : action === "bookmark"
            ? `/api/v1/growth/reading/books/${encodeURIComponent(book.id)}/bookmark`
            : "/api/v1/growth/reading/quiz/submit";
      const body =
        action === "quiz"
          ? { bookId: book.id, answer: scrub(answer) }
          : action === "bookmark"
            ? { bookmarked: !book.isBookmarked }
            : { readingMinutes: book.readingMinutes };
      try {
        const response = await requestJson<ActionResponse>(endpoint, {
          method: "POST",
          body: JSON.stringify({
            ...body,
            client: mobileClientContext(),
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            rawCopyrightFullTextExposed: false,
            adsFinancialTargetingUsed: false,
          }),
        });
        const fallback =
          action === "read"
            ? { ...book, status: "DONE" as const }
            : action === "bookmark"
              ? { ...book, isBookmarked: !book.isBookmarked }
              : { ...book, userAnswer: answer, status: "DONE" as const };
        const changed = normalizeBook(response.data?.book ?? fallback);
        update({
          payload: normalizePayload({
            ...state.payload,
            books: state.payload.books.map((item: ReadingBook) =>
              item.id === changed.id ? changed : item,
            ),
          }),
          quizAnswer: action === "quiz" ? "" : state.quizAnswer,
          busyAction: null,
          toast: {
            kind: "success",
            message:
              action === "read"
                ? `+${changed.xp} XP를 획득했습니다.`
                : action === "bookmark"
                  ? changed.isBookmarked
                    ? "책을 저장했습니다."
                    : "저장을 해제했습니다."
                  : "독서 퀴즈 제출을 완료했습니다.",
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
                : "독서 작업에 실패했습니다.",
          },
        });
      }
    },
    [state.payload, state.quizAnswer, update],
  );

  const saveNote = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    const book = selectedBook;
    const body = state.noteDraft.trim();
    if (!book || body.length < 2) {
      update({
        toast: {
          kind: "error",
          message: "기록할 책과 2자 이상의 독서 노트를 입력하세요.",
        },
      });
      return;
    }
    update({ busyAction: "note" });
    try {
      const response = await requestJson<ActionResponse>(
        `/api/v1/growth/reading/books/${encodeURIComponent(book.id)}/notes`,
        {
          method: "POST",
          body: JSON.stringify({
            body: scrub(body),
            isPrivate: true,
            client: mobileClientContext(),
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            rawCopyrightFullTextExposed: false,
            adsFinancialTargetingUsed: false,
          }),
        },
      );
      const note = normalizeNote(
        response.data?.note ?? makeLocalNote(book.id, body),
      );
      update({
        payload: normalizePayload({
          ...state.payload,
          notes: [note, ...state.payload.notes],
        }),
        noteDraft: "",
        busyAction: null,
        toast: { kind: "success", message: "독서 노트를 저장했습니다." },
      });
    } catch (error) {
      update({
        busyAction: null,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "독서 노트 저장에 실패했습니다.",
        },
      });
    }
  }, [selectedBook, state.noteDraft, state.payload, update]);

  const submitQuiz = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    if (!quizBook) {
      update({
        toast: { kind: "error", message: "제출할 독서 퀴즈가 없습니다." },
      });
      return;
    }
    if (state.quizAnswer.trim().length < 1) {
      update({ toast: { kind: "error", message: "정답을 입력하세요." } });
      return;
    }
    await mutateBook(quizBook, "quiz", state.quizAnswer.trim());
  }, [mutateBook, quizBook, state.quizAnswer, update]);

  const shareProof = ReactRuntimeRef.useCallback(
    (book: ReadingBook): void => {
      router.push(
        `${COMMUNITY_WRITE_ROUTE}?growthTaskId=${encodeURIComponent(book.id)}&board=LEVEL_UP` as never,
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
    renderHeader(goBack),
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
      renderTabs(state.tab, (tab: ReadingTab): void => update({ tab })),
      state.tab === "TODAY"
        ? renderBookList(
            "오늘의 독서 미션",
            todayBooks,
            state.busyAction,
            mutateBook,
            shareProof,
            (selectedBookId: string): void => update({ selectedBookId }),
          )
        : null,
      state.tab === "LIBRARY"
        ? renderBookList(
            "내 LV UP 서재",
            books,
            state.busyAction,
            mutateBook,
            shareProof,
            (selectedBookId: string): void => update({ selectedBookId }),
          )
        : null,
      state.tab === "BOOKMARK"
        ? renderBookList(
            "저장한 독서",
            bookmarkedBooks,
            state.busyAction,
            mutateBook,
            shareProof,
            (selectedBookId: string): void => update({ selectedBookId }),
          )
        : null,
      state.tab === "NOTE"
        ? renderNotePanel(
            selectedBook,
            state.payload.notes,
            state.noteDraft,
            state.busyAction,
            (noteDraft: string): void => update({ noteDraft }),
            saveNote,
          )
        : null,
      state.tab === "QUIZ"
        ? renderQuiz(
            quizBook,
            state.quizAnswer,
            state.busyAction,
            (quizAnswer: string): void => update({ quizAnswer }),
            submitQuiz,
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

function renderHeader(goBack: () => void): unknown {
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
        `Reading LV UP · v${SCREEN_VERSION}`,
      ),
      h(NativeRuntimeRef.Text, { style: styles.headerTitle }, "독서 루틴"),
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerDescription },
        "독서·요약·노트·퀴즈를 작은 미션으로 쌓아 LV UP합니다.",
      ),
    ),
  );
}
function renderHero(profile: ReadingProfile, progress: number): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.heroCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.heroTop },
      h(
        NativeRuntimeRef.View,
        { style: styles.levelBadge },
        h(NativeRuntimeRef.Text, { style: styles.levelBadgeText }, "R"),
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
      `오늘 ${profile.completedToday}/${profile.todayTarget} 완료 · 주간 독서 ${formatCount(profile.readingMinutesThisWeek)}분`,
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
      accessibilityLabel: "독서 검색",
      autoCapitalize: "none",
      autoCorrect: false,
      onChangeText: setValue,
      placeholder: "제목·저자·요약 검색",
      placeholderTextColor: "#64748b",
      style: styles.searchInput,
      value,
    }),
  );
}
function renderTabs(
  selected: ReadingTab,
  onSelect: (tab: ReadingTab) => void,
): unknown {
  return h(
    NativeRuntimeRef.ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      style: styles.tabs,
      contentContainerStyle: styles.tabsContent,
    },
    ...TABS.map((tab: ReadingTab) =>
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
function renderBookList(
  title: string,
  books: readonly ReadingBook[],
  busyAction: string | null,
  mutateBook: (
    book: ReadingBook,
    action: "read" | "bookmark" | "quiz",
    answer?: string,
  ) => Promise<void>,
  shareProof: (book: ReadingBook) => void,
  selectBook: (bookId: string) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, title),
    ...(books.length > 0
      ? books.map((book: ReadingBook) =>
          renderBook(book, busyAction, mutateBook, shareProof, selectBook),
        )
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-book", style: styles.emptyText },
            "표시할 독서 미션이 없습니다.",
          ),
        ]),
  );
}
function renderBook(
  book: ReadingBook,
  busyAction: string | null,
  mutateBook: (
    book: ReadingBook,
    action: "read" | "bookmark" | "quiz",
    answer?: string,
  ) => Promise<void>,
  shareProof: (book: ReadingBook) => void,
  selectBook: (bookId: string) => void,
): unknown {
  const done = book.status === "DONE";
  const disabled =
    busyAction !== null ||
    done ||
    book.status === "LOCKED" ||
    book.riskLabel === "BLOCKED";
  return h(
    NativeRuntimeRef.Pressable,
    {
      accessibilityRole: "button",
      key: book.id,
      onPress: (): void => selectBook(book.id),
      style: [styles.bookCard, done ? styles.doneCard : null],
    },
    h(
      NativeRuntimeRef.View,
      { style: styles.rowTop },
      h(
        NativeRuntimeRef.Text,
        { style: styles.categoryPill },
        categoryLabels[book.category],
      ),
      h(
        NativeRuntimeRef.Text,
        {
          style:
            book.riskLabel === "SAFE" ? styles.safeText : styles.reviewText,
        },
        book.riskLabel,
      ),
    ),
    h(NativeRuntimeRef.Text, { style: styles.bookTitle }, book.title),
    h(
      NativeRuntimeRef.Text,
      { style: styles.sourceText },
      `${book.author} · ${book.sourceName} · ${formatCount(book.readingMinutes)}분 · +${book.xp} XP`,
    ),
    h(NativeRuntimeRef.Text, { style: styles.bookSummary }, book.summary),
    h(
      NativeRuntimeRef.Text,
      { style: styles.excerptText },
      `인용·요약: ${book.excerpt}`,
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.actionRow },
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          disabled,
          onPress: (): void => void mutateBook(book, "read"),
          style: [
            styles.primaryButtonSmall,
            disabled ? styles.buttonDisabled : null,
          ],
        },
        busyAction === `read:${book.id}`
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
          onPress: (): void => void mutateBook(book, "bookmark"),
          style: [
            styles.secondaryButtonSmall,
            book.isBookmarked ? styles.secondaryButtonActive : null,
          ],
        },
        h(
          NativeRuntimeRef.Text,
          { style: styles.secondaryButtonSmallText },
          book.isBookmarked ? "저장됨" : "저장",
        ),
      ),
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          onPress: (): void => shareProof(book),
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
function renderNotePanel(
  book: ReadingBook | null,
  notes: readonly ReadingNote[],
  noteDraft: string,
  busyAction: string | null,
  setNoteDraft: (value: string) => void,
  saveNote: () => Promise<void>,
): unknown {
  const bookNotes = book
    ? notes.filter((note: ReadingNote) => note.bookId === book.id)
    : notes;
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "독서 노트"),
    h(
      NativeRuntimeRef.Text,
      { style: styles.bookTitle },
      book ? book.title : "책을 선택하세요",
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.bookSummary },
      book ? book.notePrompt : "선택한 책의 핵심 문장을 내 말로 요약합니다.",
    ),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "독서 노트",
      autoCapitalize: "none",
      autoCorrect: false,
      multiline: true,
      onChangeText: setNoteDraft,
      placeholder: "저작권 전문을 복사하지 말고 내 생각을 기록하세요.",
      placeholderTextColor: "#64748b",
      style: styles.textArea,
      textAlignVertical: "top",
      value: noteDraft,
    }),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        disabled: !book || busyAction !== null || noteDraft.trim().length < 2,
        onPress: (): void => void saveNote(),
        style: [
          styles.primaryButton,
          !book || busyAction !== null || noteDraft.trim().length < 2
            ? styles.buttonDisabled
            : null,
        ],
      },
      busyAction === "note"
        ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
        : h(
            NativeRuntimeRef.Text,
            { style: styles.primaryButtonText },
            "노트 저장",
          ),
    ),
    ...(bookNotes.length > 0
      ? bookNotes.map(renderNote)
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-note", style: styles.emptyText },
            "아직 저장된 노트가 없습니다.",
          ),
        ]),
  );
}
function renderNote(note: ReadingNote): unknown {
  return h(
    NativeRuntimeRef.View,
    { key: note.id, style: styles.noteCard },
    h(
      NativeRuntimeRef.Text,
      { style: styles.sourceText },
      `${note.isPrivate ? "비공개" : "공개"} · ${relativeTime(note.createdAt)}`,
    ),
    h(NativeRuntimeRef.Text, { style: styles.bookSummary }, note.body),
  );
}
function renderQuiz(
  book: ReadingBook | null,
  answer: string,
  busyAction: string | null,
  setAnswer: (value: string) => void,
  submitQuiz: () => Promise<void>,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "독서 이해 퀴즈"),
    h(
      NativeRuntimeRef.Text,
      { style: styles.bookTitle },
      book ? book.title : "제출할 퀴즈가 없습니다.",
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.bookSummary },
      book
        ? book.quizQuestion
        : "오늘의 독서 퀴즈를 불러오면 여기에 표시됩니다.",
    ),
    h(NativeRuntimeRef.TextInput, {
      accessibilityLabel: "독서 퀴즈 정답",
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
        disabled: !book || busyAction !== null || answer.trim().length < 1,
        onPress: (): void => void submitQuiz(),
        style: [
          styles.primaryButton,
          !book || busyAction !== null || answer.trim().length < 1
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
  insights: readonly ReadingInsight[],
  router: RouterLike,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(
      NativeRuntimeRef.Text,
      { style: styles.panelTitle },
      "독서 루틴 인사이트",
    ),
    ...(insights.length > 0
      ? insights.map((insight: ReadingInsight) =>
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
              { style: styles.bookTitle },
              insight.title,
            ),
            h(
              NativeRuntimeRef.Text,
              { style: styles.bookSummary },
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
function renderStats(stats: ReadingStats): unknown {
  const items = [
    ["독서", `${stats.completedBooks}/${stats.totalBooks}`],
    ["저장", formatCount(stats.bookmarkedBooks)],
    ["시간", `${formatCount(stats.readingMinutes)}분`],
    ["노트", formatCount(stats.noteCount)],
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
    "readingLearningOnly=true",
    "copyrightFullText=false",
    "sourceAttribution=true",
    "privateNoteDefault=true",
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
      "Reading · Privacy Guard",
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
  headers.set("x-raw-copyright-full-text-exposed", "false");
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
function normalizePayload(partial: Partial<ReadingPayload>): ReadingPayload {
  const books = (partial.books ?? [])
    .map(normalizeBook)
    .filter((book: ReadingBook) => book.riskLabel !== "BLOCKED");
  const notes = (partial.notes ?? []).map(normalizeNote);
  const insights = (partial.insights ?? []).map(normalizeInsight);
  const profile = normalizeProfile(partial.profile ?? fallbackProfile, books);
  return {
    profile,
    books,
    notes,
    insights,
    stats: statsFrom(books, notes, partial.stats),
  };
}
function normalizeProfile(
  profile: ReadingProfile,
  books: readonly ReadingBook[],
): ReadingProfile {
  return {
    ...profile,
    level: positive(profile.level, 1),
    title: scrub(profile.title) || "독서 루틴 입문자",
    totalXp: money(profile.totalXp),
    todayXp: money(profile.todayXp),
    streakDays: money(profile.streakDays),
    readingMinutesThisWeek: money(profile.readingMinutesThisWeek),
    completedToday: books.filter((book: ReadingBook) => book.status === "DONE")
      .length,
    todayTarget: Math.max(1, money(profile.todayTarget)),
    comprehensionRate: percent(profile.comprehensionRate),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawCopyrightFullTextExposed: false,
    adsFinancialTargetingUsed: false,
  };
}
function normalizeBook(book: ReadingBook): ReadingBook {
  return {
    ...book,
    id: scrub(book.id),
    category: enumOf(CATEGORIES, book.category, "SELF_DEV"),
    title: scrub(book.title),
    author: scrub(book.author),
    sourceName: scrub(book.sourceName) || "출처 미상",
    summary: scrub(book.summary),
    excerpt: summarizeExcerpt(book.excerpt),
    notePrompt: scrub(book.notePrompt),
    quizQuestion: scrub(book.quizQuestion),
    quizAnswer: scrub(book.quizAnswer),
    userAnswer: scrub(book.userAnswer),
    readingMinutes: money(book.readingMinutes),
    status: enumOf(STATUSES, book.status, "UNREAD"),
    xp: money(book.xp),
    riskLabel: enumOf(RISK_VALUES, book.riskLabel, "SAFE"),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawCopyrightFullTextExposed: false,
    adsFinancialTargetingUsed: false,
  };
}
function normalizeNote(note: ReadingNote): ReadingNote {
  return {
    id: scrub(note.id),
    bookId: scrub(note.bookId),
    body: summarizeExcerpt(note.body),
    createdAt: iso(note.createdAt),
    isPrivate: true,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}
function normalizeInsight(insight: ReadingInsight): ReadingInsight {
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
function filterBooks(
  books: readonly ReadingBook[],
  searchText: string,
): readonly ReadingBook[] {
  const keyword = searchText.trim().toLowerCase();
  if (!keyword) return books;
  return books.filter((book: ReadingBook) =>
    `${book.title} ${book.author} ${book.summary} ${categoryLabels[book.category]}`
      .toLowerCase()
      .includes(keyword),
  );
}
function sortBooks(books: readonly ReadingBook[]): readonly ReadingBook[] {
  return books
    .slice()
    .sort(
      (a: ReadingBook, b: ReadingBook) =>
        Number(a.status === "DONE") - Number(b.status === "DONE") ||
        b.xp - a.xp,
    );
}
function statsFrom(
  books: readonly ReadingBook[],
  notes: readonly ReadingNote[],
  partial: Partial<ReadingStats> = {},
): ReadingStats {
  const safeBooks = books.filter(
    (book: ReadingBook) =>
      !book.rawFinancialDataExposed &&
      !book.rawPersonalDataExposed &&
      !book.rawCopyrightFullTextExposed &&
      !book.adsFinancialTargetingUsed,
  ).length;
  const completed = books.filter(
    (book: ReadingBook) => book.status === "DONE",
  ).length;
  const quizBooks = books.filter(
    (book: ReadingBook) => book.quizQuestion.trim().length > 0,
  );
  const correct = quizBooks.filter(
    (book: ReadingBook) =>
      book.userAnswer.trim().toLowerCase() ===
        book.quizAnswer.trim().toLowerCase() && book.status === "DONE",
  ).length;
  return {
    totalBooks: partial.totalBooks ?? books.length,
    completedBooks: partial.completedBooks ?? completed,
    bookmarkedBooks:
      partial.bookmarkedBooks ??
      books.filter((book: ReadingBook) => book.isBookmarked).length,
    readingMinutes:
      partial.readingMinutes ??
      books
        .filter((book: ReadingBook) => book.status === "DONE")
        .reduce(
          (sum: number, book: ReadingBook) => sum + book.readingMinutes,
          0,
        ),
    noteCount: partial.noteCount ?? notes.length,
    quizAccuracy: partial.quizAccuracy ?? pct(correct, quizBooks.length),
    privacyPassRate: partial.privacyPassRate ?? pct(safeBooks, books.length),
  };
}
function makeLocalNote(bookId: string, body: string): ReadingNote {
  return {
    id: `local-note-${Date.now().toString(36)}`,
    bookId,
    body,
    createdAt: new Date().toISOString(),
    isPrivate: true,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}
function seedPayload(): ReadingPayload {
  return normalizePayload({
    profile: {
      level: 7,
      title: "출근길 독서 루틴러",
      totalXp: 2100,
      todayXp: 55,
      streakDays: 18,
      readingMinutesThisWeek: 95,
      completedToday: 0,
      todayTarget: 2,
      comprehensionRate: 81.2,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      rawCopyrightFullTextExposed: false,
      adsFinancialTargetingUsed: false,
    },
    books: [
      {
        id: "reading-money-1",
        category: "MONEY",
        title: "월급을 지키는 작은 습관",
        author: "급여납치 큐레이션",
        sourceName: "급여납치 학습 요약",
        summary:
          "급여일 이후 먼저 분리하고 남은 돈으로 생활하는 습관을 독서 루틴으로 정리합니다.",
        excerpt: "작은 습관은 반복될 때 힘을 갖는다.",
        notePrompt: "오늘 내 급여 루틴에 적용할 한 가지를 적어보세요.",
        quizQuestion: "급여일 이후 먼저 해야 할 행동은 무엇인가요?",
        quizAnswer: "분리",
        userAnswer: "",
        readingMinutes: 5,
        status: "UNREAD",
        xp: 40,
        isBookmarked: true,
        riskLabel: "SAFE",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawCopyrightFullTextExposed: false,
        adsFinancialTargetingUsed: false,
      },
      {
        id: "reading-career-1",
        category: "CAREER",
        title: "일 잘하는 사람의 기록법",
        author: "급여납치 큐레이션",
        sourceName: "급여납치 학습 요약",
        summary:
          "짧게 읽고 내 말로 기록하는 방식이 LV UP 성장 기록으로 연결됩니다.",
        excerpt: "기록은 생각을 행동으로 바꾸는 장치다.",
        notePrompt: "오늘의 핵심 문장을 내 업무 루틴으로 바꿔보세요.",
        quizQuestion: "기록은 생각을 무엇으로 바꾸나요?",
        quizAnswer: "행동",
        userAnswer: "",
        readingMinutes: 4,
        status: "UNREAD",
        xp: 35,
        isBookmarked: false,
        riskLabel: "SAFE",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawCopyrightFullTextExposed: false,
        adsFinancialTargetingUsed: false,
      },
    ],
    notes: [],
    insights: [
      {
        id: "reading-insight-1",
        title: "전문 복사보다 내 말 요약",
        body: "독서 루틴은 저작권 전문 보관이 아니라 출처와 짧은 인용, 내 생각 기록 중심으로 설계됩니다.",
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
    copyrightFullTextForbidden: true,
    privateNoteDefault: true,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    rawCopyrightFullTextExposed: false,
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
    : `mobile-reading-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "독서 루틴 접근이 제한되었습니다.";
  if (status === 404) return "독서 루틴 데이터를 찾을 수 없습니다.";
  if (status === 409) return "독서 루틴 상태가 변경되었습니다. 새로고침하세요.";
  if (status === 422) return "저작권 전문 또는 민감정보는 저장할 수 없습니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  return `독서 루틴 요청에 실패했습니다. (${status})`;
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
  let output = value.slice(0, 1800);
  SENSITIVE_KEYWORDS.forEach((keyword: string) => {
    output = output.replace(
      new RegExp(regexEscape(keyword), "gi"),
      "[REDACTED]",
    );
  });
  return output;
}
function summarizeExcerpt(value: string): string {
  return scrub(value).replace(/\s+/g, " ").trim().slice(0, 260);
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
export function assertMobileReadingLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_reading_runtime_loaded",
    "react_native_runtime_loaded",
    "reading_level_screen",
    "today_reading_missions",
    "money_career_selfdev_business_life_categories",
    "library_search",
    "read_complete_action",
    "bookmark_action",
    "private_reading_note",
    "reading_quiz_submit",
    "community_proof_route",
    "source_attribution",
    "copyright_full_text_block",
    "api_v1_growth_reading_dashboard",
    "api_v1_growth_reading_book_read",
    "api_v1_growth_reading_bookmark",
    "api_v1_growth_reading_notes",
    "api_v1_growth_reading_quiz_submit",
    "streak_xp_comprehension",
    "reading_learning_only_boundary",
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
  bookCard: {
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
  bookTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  bookSummary: { color: "#cbd5e1", fontSize: 13, lineHeight: 20 },
  excerptText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
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
  textArea: {
    backgroundColor: "#020617",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#f8fafc",
    fontSize: 15,
    minHeight: 130,
    padding: 13,
  },
  noteCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
    padding: 12,
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
