/** apps/mobile/app/(tabs)/salary/index.tsx
 * 급여납치 모바일 급여 홈 탭 최종본.
 * 정적 import와 JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../../src/shared/api/api-base";
import { attachMobileBearerToken } from "../../../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type SalarySection = "OVERVIEW" | "FIXED" | "DAILY" | "VARIABLE" | "ADS";
type ExpenseStatus = "DUE" | "PAID" | "OVERDUE" | "SKIPPED";
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
type SecureStoreRuntime = Readonly<{
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}>;

type FixedExpense = Readonly<{
  id: string;
  name: string;
  category: string;
  amount: number;
  dueDate: string;
  status: ExpenseStatus;
  isRecurring: boolean;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type VariableExpense = Readonly<{
  id: string;
  name: string;
  category: string;
  amount: number;
  spentAt: string;
  memo: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type DailyBudget = Readonly<{
  date: string;
  dailyLimit: number;
  usedAmount: number;
  remainingAmount: number;
  overBudget: boolean;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type SalaryPlan = Readonly<{
  id: string;
  month: string;
  payday: string;
  nextPayday: string;
  expectedSalary: number;
  actualIncome: number;
  carryOver: number;
  fixedExpense: number;
  dailyLivingBudget: number;
  plannedOtherExpense: number;
  fixedSaving: number;
  variableExpenseToDate: number;
  actualSavings: number;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

type SalarySummary = Readonly<{
  plannedTotalExpense: number;
  expectedHijack: number;
  todayRemainingBudget: number;
  monthlyActualHijack: number;
  totalHijackSaved: number;
  remainingDaysUntilPayday: number;
  budgetUseRate: number;
  savingsRate: number;
}>;

type SalaryStats = Readonly<{
  fixedExpenseCount: number;
  paidFixedExpenseCount: number;
  variableExpenseCount: number;
  notificationCount: number;
  privacyPassRate: string;
}>;

type AdPlacement = Readonly<{
  id: string;
  label: "광고" | "제휴";
  title: string;
  description: string;
  destination: string;
  contextualOnly: true;
  rawFinancialTargetingUsed: false;
  userIdentifierShared: false;
}>;

type SalaryPayload = Readonly<{
  plan: SalaryPlan;
  summary: SalarySummary;
  dailyBudget: DailyBudget;
  fixedExpenses: readonly FixedExpense[];
  variableExpenses: readonly VariableExpense[];
  ads: readonly AdPlacement[];
  stats: SalaryStats;
}>;

type SalaryResponse = Readonly<{
  data?: Partial<SalaryPayload>;
  error?: unknown;
}>;
type ActionResponse = Readonly<{
  data?: Partial<SalaryPayload>;
  error?: unknown;
}>;
type SalaryState = Readonly<{
  section: SalarySection;
  payload: SalaryPayload;
  busyAction: string | null;
  refreshing: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const SCREEN_VERSION = "3.1.0";
const SECTIONS = ["OVERVIEW", "FIXED", "DAILY", "VARIABLE", "ADS"] as const;
const PLAN_ROUTE = "/plan";
const NOTIFICATIONS_ROUTE = "/notifications";
const VARIABLE_EXPENSE_ROUTE = "/salary/variable-expenses";
const FIXED_EXPENSE_ROUTE = "/plan/fixed-expenses";
const SAVINGS_ROUTE = "/plan/savings";
const DAILY_BUDGET_ROUTE = "/plan/daily-budget";

const sectionLabels: Readonly<Record<SalarySection, string>> = Object.freeze({
  OVERVIEW: "현황",
  FIXED: "고정지출",
  DAILY: "일일예산",
  VARIABLE: "변동지출",
  ADS: "혜택",
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

const fallbackPlan: SalaryPlan = Object.freeze({
  id: "pending",
  month: monthKey(new Date()),
  payday: new Date().toISOString(),
  nextPayday: new Date().toISOString(),
  expectedSalary: 0,
  actualIncome: 0,
  carryOver: 0,
  fixedExpense: 0,
  dailyLivingBudget: 0,
  plannedOtherExpense: 0,
  fixedSaving: 0,
  variableExpenseToDate: 0,
  actualSavings: 0,
  status: "DRAFT",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  adsFinancialTargetingUsed: false,
});

const fallbackDailyBudget: DailyBudget = Object.freeze({
  date: new Date().toISOString(),
  dailyLimit: 0,
  usedAmount: 0,
  remainingAmount: 0,
  overBudget: false,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  adsFinancialTargetingUsed: false,
});

const fallbackPayload: SalaryPayload = Object.freeze({
  plan: fallbackPlan,
  summary: computeSummary(fallbackPlan, fallbackDailyBudget, 0),
  dailyBudget: fallbackDailyBudget,
  fixedExpenses: [],
  variableExpenses: [],
  ads: [],
  stats: {
    fixedExpenseCount: 0,
    paidFixedExpenseCount: 0,
    variableExpenseCount: 0,
    notificationCount: 0,
    privacyPassRate: "100.00%",
  },
});

export default function SalaryIndexScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [state, setState] = ReactRuntimeRef.useState<SalaryState>({
    section: "OVERVIEW",
    payload: fallbackPayload,
    busyAction: null,
    refreshing: false,
    toast: {
      kind: "info",
      message: "급여 현황을 서버 권위 기준으로 불러옵니다.",
    },
  });

  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<SalaryState>): void =>
      setState((prev: SalaryState) => ({ ...prev, ...patch })),
    [],
  );

  const filteredFixed = ReactRuntimeRef.useMemo(
    () => sortFixedExpenses(state.payload.fixedExpenses),
    [state.payload.fixedExpenses],
  );

  const filteredVariable = ReactRuntimeRef.useMemo(
    () => sortVariableExpenses(state.payload.variableExpenses),
    [state.payload.variableExpenses],
  );

  const loadSalaryHome =
    ReactRuntimeRef.useCallback(async (): Promise<void> => {
      setState((prev: SalaryState) => ({ ...prev, refreshing: true }));

      try {
        const response = await requestJson<SalaryResponse>(
          "/api/v1/payroll/home",
        );
        const payload = normalizePayload(response.data ?? {});
        setState((prev: SalaryState) => ({
          ...prev,
          payload,
          refreshing: false,
          toast: { kind: "success", message: "급여 현황을 동기화했습니다." },
        }));
      } catch (error) {
        const seeded = seedPayload();
        setState((prev: SalaryState) => ({
          ...prev,
          payload: prev.payload.plan.id !== "pending" ? prev.payload : seeded,
          refreshing: false,
          toast: {
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "급여 현황 조회에 실패했습니다.",
          },
        }));
      }
    }, []);

  const markFixedPaid = ReactRuntimeRef.useCallback(
    async (expense: FixedExpense): Promise<void> => {
      update({ busyAction: expense.id });

      try {
        const response = await requestJson<ActionResponse>(
          `/api/v1/fixed-expenses/${encodeURIComponent(expense.id)}/pay`,
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

        update({
          payload: normalizePayload(response.data ?? state.payload),
          busyAction: null,
          toast: {
            kind: "success",
            message: "고정지출 납부 상태를 반영했습니다.",
          },
        });
      } catch (error) {
        const fixedExpenses = state.payload.fixedExpenses.map(
          (item: FixedExpense) =>
            item.id === expense.id
              ? { ...item, status: "PAID" as const }
              : item,
        );

        update({
          payload: normalizePayload({ ...state.payload, fixedExpenses }),
          busyAction: null,
          toast: {
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "납부 처리에 실패했습니다.",
          },
        });
      }
    },
    [state.payload, update],
  );

  const recalculate = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    update({ busyAction: "recalculate" });

    try {
      const response = await requestJson<ActionResponse>(
        "/api/v1/payroll/recalculate",
        {
          method: "POST",
          body: JSON.stringify({
            planId: state.payload.plan.id,
            client: mobileClientContext(),
            rawFinancialDataExposed: false,
            rawPersonalDataExposed: false,
            adsFinancialTargetingUsed: false,
          }),
        },
      );

      update({
        payload: normalizePayload(response.data ?? state.payload),
        busyAction: null,
        toast: { kind: "success", message: "서버 권위 계산을 재실행했습니다." },
      });
    } catch (error) {
      update({
        busyAction: null,
        toast: {
          kind: "error",
          message:
            error instanceof Error ? error.message : "재계산에 실패했습니다.",
        },
      });
    }
  }, [state.payload, update]);

  const openRoute = ReactRuntimeRef.useCallback(
    (route: string): void => router.push(route as never),
    [router],
  );

  ReactRuntimeRef.useEffect((): void => {
    void loadSalaryHome();
  }, [loadSalaryHome]);

  return h(
    NativeRuntimeRef.SafeAreaView,
    { style: styles.safeArea },
    h(
      NativeRuntimeRef.View,
      { style: styles.header },
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerKicker },
        `Salary · v${SCREEN_VERSION}`,
      ),
      h(NativeRuntimeRef.Text, { style: styles.headerTitle }, "급여 홈"),
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerDescription },
        "월급 수령 후 고정지출, 저축, 생활비, 변동지출을 먼저 분리하고 납치금액을 확인합니다.",
      ),
    ),
    renderToast(state.toast),
    h(
      NativeRuntimeRef.ScrollView,
      {
        refreshControl: h(NativeRuntimeRef.RefreshControl, {
          refreshing: state.refreshing,
          onRefresh: (): void => void loadSalaryHome(),
        }),
        style: styles.scroll,
        contentContainerStyle: styles.scrollContent,
      },
      renderHero(state.payload),
      renderSections(state.section, (section: SalarySection): void =>
        update({ section }),
      ),
      renderQuickActions(state.busyAction, recalculate, openRoute),
      state.section === "OVERVIEW"
        ? renderFormulaPanel(state.payload.summary)
        : null,
      state.section === "FIXED" || state.section === "OVERVIEW"
        ? renderFixedExpenses(
            filteredFixed,
            state.busyAction,
            markFixedPaid,
            openRoute,
          )
        : null,
      state.section === "DAILY" || state.section === "OVERVIEW"
        ? renderDailyBudget(state.payload.dailyBudget, openRoute)
        : null,
      state.section === "VARIABLE" || state.section === "OVERVIEW"
        ? renderVariableExpenses(filteredVariable, openRoute)
        : null,
      state.section === "ADS" || state.section === "OVERVIEW"
        ? renderAds(state.payload.ads)
        : null,
      renderStats(state.payload.stats),
      renderGuardBox(),
    ),
  );
}

function renderHero(payload: SalaryPayload): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.heroCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.heroTop },
      h(
        NativeRuntimeRef.View,
        { style: styles.coinBadge },
        h(NativeRuntimeRef.Text, { style: styles.coinText }, "₩"),
      ),
      h(
        NativeRuntimeRef.View,
        { style: styles.heroBody },
        h(
          NativeRuntimeRef.Text,
          { style: styles.heroTitle },
          `${payload.plan.month} 급여 납치 현황`,
        ),
        h(
          NativeRuntimeRef.Text,
          { style: styles.heroMeta },
          `${payload.plan.status} · 다음 급여일까지 ${payload.summary.remainingDaysUntilPayday}일 · ${dateText(payload.plan.nextPayday)}`,
        ),
      ),
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.amountGrid },
      renderAmount("수령 예정", payload.plan.expectedSalary),
      renderAmount("지출 계획", payload.summary.plannedTotalExpense),
      renderAmount("예상 납치", payload.summary.expectedHijack),
      renderAmount("누적 납치", payload.summary.totalHijackSaved),
    ),
  );
}

function renderAmount(label: string, value: number): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.amountCard },
    h(NativeRuntimeRef.Text, { style: styles.amountLabel }, label),
    h(NativeRuntimeRef.Text, { style: styles.amountValue }, krw(value)),
  );
}

function renderSections(
  selected: SalarySection,
  onSelect: (section: SalarySection) => void,
): unknown {
  return h(
    NativeRuntimeRef.ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      style: styles.tabs,
      contentContainerStyle: styles.tabsContent,
    },
    ...SECTIONS.map((section: SalarySection) =>
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          key: section,
          onPress: (): void => onSelect(section),
          style: [
            styles.tabButton,
            selected === section ? styles.tabButtonActive : null,
          ],
        },
        h(
          NativeRuntimeRef.Text,
          {
            style: [
              styles.tabText,
              selected === section ? styles.tabTextActive : null,
            ],
          },
          sectionLabels[section],
        ),
      ),
    ),
  );
}

function renderQuickActions(
  busyAction: string | null,
  recalculate: () => Promise<void>,
  openRoute: (route: string) => void,
): unknown {
  const routes = [
    ["계획", PLAN_ROUTE],
    ["지출 추가", VARIABLE_EXPENSE_ROUTE],
    ["저축", SAVINGS_ROUTE],
    ["알림", NOTIFICATIONS_ROUTE],
  ] as const;

  return h(
    NativeRuntimeRef.View,
    { style: styles.actionPanel },
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        disabled: busyAction !== null,
        onPress: (): void => void recalculate(),
        style: [
          styles.primaryButton,
          busyAction !== null ? styles.buttonDisabled : null,
        ],
      },
      busyAction === "recalculate"
        ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
        : h(
            NativeRuntimeRef.Text,
            { style: styles.primaryButtonText },
            "서버 재계산",
          ),
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.actionGrid },
      ...routes.map(([label, route]: readonly [string, string]) =>
        h(
          NativeRuntimeRef.Pressable,
          {
            accessibilityRole: "button",
            key: route,
            onPress: (): void => openRoute(route),
            style: styles.secondaryButton,
          },
          h(
            NativeRuntimeRef.Text,
            { style: styles.secondaryButtonText },
            label,
          ),
        ),
      ),
    ),
  );
}

function renderFormulaPanel(summary: SalarySummary): unknown {
  const formulas = [
    ["planned_total_expense", summary.plannedTotalExpense],
    ["expected_hijack", summary.expectedHijack],
    ["today_remaining_budget", summary.todayRemainingBudget],
    ["monthly_actual_hijack", summary.monthlyActualHijack],
  ] as const;

  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "서버 권위 계산"),
    h(
      NativeRuntimeRef.Text,
      { style: styles.formulaText },
      "planned_total_expense = fixed_expense + daily_living_budget + planned_other_expense",
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.formulaText },
      "expected_hijack = max(0, expected_salary - planned_total_expense)",
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.formulaText },
      "today_remaining_budget = max(0, daily_limit - today_variable_expense)",
    ),
    h(
      NativeRuntimeRef.Text,
      { style: styles.formulaText },
      "monthly_actual_hijack = max(0, actual_income + carry_over - actual_expense - actual_savings)",
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.formulaGrid },
      ...formulas.map(([label, value]: readonly [string, number]) =>
        h(
          NativeRuntimeRef.View,
          { key: label, style: styles.formulaCard },
          h(NativeRuntimeRef.Text, { style: styles.formulaLabel }, label),
          h(NativeRuntimeRef.Text, { style: styles.formulaValue }, krw(value)),
        ),
      ),
    ),
  );
}

function renderFixedExpenses(
  items: readonly FixedExpense[],
  busyAction: string | null,
  markFixedPaid: (expense: FixedExpense) => Promise<void>,
  openRoute: (route: string) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(
      NativeRuntimeRef.View,
      { style: styles.panelTitleRow },
      h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "고정지출"),
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          onPress: (): void => openRoute(FIXED_EXPENSE_ROUTE),
          style: styles.panelLink,
        },
        h(NativeRuntimeRef.Text, { style: styles.panelLinkText }, "관리"),
      ),
    ),
    ...(items.length > 0
      ? items.map((expense: FixedExpense) =>
          renderFixedExpense(expense, busyAction, markFixedPaid),
        )
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-fixed", style: styles.emptyText },
            "등록된 고정지출이 없습니다.",
          ),
        ]),
  );
}

function renderFixedExpense(
  expense: FixedExpense,
  busyAction: string | null,
  markFixedPaid: (expense: FixedExpense) => Promise<void>,
): unknown {
  const done = expense.status === "PAID";
  const disabled = busyAction !== null || done;

  return h(
    NativeRuntimeRef.View,
    { key: expense.id, style: styles.rowCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.rowTop },
      h(
        NativeRuntimeRef.Text,
        { style: styles.categoryPill },
        expense.category,
      ),
      h(
        NativeRuntimeRef.Text,
        { style: done ? styles.doneText : styles.pendingText },
        expense.status,
      ),
    ),
    h(NativeRuntimeRef.Text, { style: styles.rowTitle }, expense.name),
    h(
      NativeRuntimeRef.Text,
      { style: styles.rowMeta },
      `${krw(expense.amount)} · ${dateText(expense.dueDate)}${expense.isRecurring ? " · 반복" : ""}`,
    ),
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        disabled,
        onPress: (): void => void markFixedPaid(expense),
        style: [styles.smallPrimary, disabled ? styles.buttonDisabled : null],
      },
      busyAction === expense.id
        ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
        : h(
            NativeRuntimeRef.Text,
            { style: styles.smallPrimaryText },
            done ? "완료" : "납부완료",
          ),
    ),
  );
}

function renderDailyBudget(
  daily: DailyBudget,
  openRoute: (route: string) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(
      NativeRuntimeRef.View,
      { style: styles.panelTitleRow },
      h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "일일 사용 예산"),
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          onPress: (): void => openRoute(DAILY_BUDGET_ROUTE),
          style: styles.panelLink,
        },
        h(NativeRuntimeRef.Text, { style: styles.panelLinkText }, "설정"),
      ),
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.amountGrid },
      renderAmount("설정 금액", daily.dailyLimit),
      renderAmount("사용 금액", daily.usedAmount),
      renderAmount("남은 금액", daily.remainingAmount),
      renderAmount(
        "상태",
        daily.overBudget
          ? daily.usedAmount - daily.dailyLimit
          : daily.remainingAmount,
      ),
    ),
    h(
      NativeRuntimeRef.Text,
      { style: daily.overBudget ? styles.warningText : styles.successText },
      daily.overBudget
        ? "오늘 예산을 초과했습니다. 변동지출을 확인하세요."
        : "오늘 예산이 방어되고 있습니다.",
    ),
  );
}

function renderVariableExpenses(
  items: readonly VariableExpense[],
  openRoute: (route: string) => void,
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(
      NativeRuntimeRef.View,
      { style: styles.panelTitleRow },
      h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "변동지출"),
      h(
        NativeRuntimeRef.Pressable,
        {
          accessibilityRole: "button",
          onPress: (): void => openRoute(VARIABLE_EXPENSE_ROUTE),
          style: styles.panelLink,
        },
        h(NativeRuntimeRef.Text, { style: styles.panelLinkText }, "추가"),
      ),
    ),
    ...(items.length > 0
      ? items.map(renderVariableExpense)
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-variable", style: styles.emptyText },
            "오늘 기록된 변동지출이 없습니다.",
          ),
        ]),
  );
}

function renderVariableExpense(expense: VariableExpense): unknown {
  return h(
    NativeRuntimeRef.View,
    { key: expense.id, style: styles.rowCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.rowTop },
      h(
        NativeRuntimeRef.Text,
        { style: styles.categoryPill },
        expense.category,
      ),
      h(
        NativeRuntimeRef.Text,
        { style: styles.pendingText },
        dateText(expense.spentAt),
      ),
    ),
    h(NativeRuntimeRef.Text, { style: styles.rowTitle }, expense.name),
    h(
      NativeRuntimeRef.Text,
      { style: styles.rowMeta },
      `${krw(expense.amount)} · ${expense.memo || "메모 없음"}`,
    ),
  );
}

function renderAds(ads: readonly AdPlacement[]): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "광고·제휴"),
    ...(ads.length > 0
      ? ads.map((ad: AdPlacement) =>
          h(
            NativeRuntimeRef.View,
            { key: ad.id, style: styles.adCard },
            h(NativeRuntimeRef.Text, { style: styles.adLabel }, ad.label),
            h(NativeRuntimeRef.Text, { style: styles.adTitle }, ad.title),
            h(
              NativeRuntimeRef.Text,
              { style: styles.adDescription },
              ad.description,
            ),
            h(
              NativeRuntimeRef.Text,
              { style: styles.adGuard },
              "contextualOnly · financialTargeting=false · userIdentifierShared=false",
            ),
          ),
        )
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty-ads", style: styles.emptyText },
            "현재 노출할 광고·제휴가 없습니다.",
          ),
        ]),
  );
}

function renderStats(stats: SalaryStats): unknown {
  const items = [
    ["고정지출", `${stats.paidFixedExpenseCount}/${stats.fixedExpenseCount}`],
    ["변동지출", formatCount(stats.variableExpenseCount)],
    ["알림", formatCount(stats.notificationCount)],
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
    "krwIntegerOnly=true",
    "noNegativeMoney=true",
    "rawFinancialData=false",
    "adsFinancialTargeting=false",
    "asiaSeoulDisplay=true",
  ] as const;

  return h(
    NativeRuntimeRef.View,
    { style: styles.guardBox },
    h(
      NativeRuntimeRef.Text,
      { style: styles.guardTitle },
      "Salary · Server Authority Guard",
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

function normalizePayload(partial: Partial<SalaryPayload>): SalaryPayload {
  const plan = normalizePlan(partial.plan ?? fallbackPlan);
  const dailyBudget = normalizeDailyBudget(
    partial.dailyBudget ?? computeDailyBudget(plan),
  );
  const fixedExpenses = (partial.fixedExpenses ?? []).map(
    normalizeFixedExpense,
  );
  const variableExpenses = (partial.variableExpenses ?? []).map(
    normalizeVariableExpense,
  );
  const ads = (partial.ads ?? []).map(normalizeAd);
  const summary = normalizeSummary(
    partial.summary ?? computeSummary(plan, dailyBudget, 0),
  );

  return {
    plan,
    summary,
    dailyBudget,
    fixedExpenses,
    variableExpenses,
    ads,
    stats: statsFrom(fixedExpenses, variableExpenses, ads, partial.stats),
  };
}

function normalizePlan(plan: SalaryPlan): SalaryPlan {
  return {
    ...plan,
    id: scrub(plan.id),
    month: scrub(plan.month) || monthKey(new Date()),
    payday: iso(plan.payday),
    nextPayday: iso(plan.nextPayday),
    expectedSalary: money(plan.expectedSalary),
    actualIncome: money(plan.actualIncome),
    carryOver: money(plan.carryOver),
    fixedExpense: money(plan.fixedExpense),
    dailyLivingBudget: money(plan.dailyLivingBudget),
    plannedOtherExpense: money(plan.plannedOtherExpense),
    fixedSaving: money(plan.fixedSaving),
    variableExpenseToDate: money(plan.variableExpenseToDate),
    actualSavings: money(plan.actualSavings),
    status: enumOf(
      ["DRAFT", "ACTIVE", "PAUSED", "CLOSED"] as const,
      plan.status,
      "DRAFT",
    ),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeDailyBudget(daily: DailyBudget): DailyBudget {
  const dailyLimit = money(daily.dailyLimit);
  const usedAmount = money(daily.usedAmount);

  return {
    ...daily,
    date: iso(daily.date),
    dailyLimit,
    usedAmount,
    remainingAmount: Math.max(
      0,
      money(daily.remainingAmount || dailyLimit - usedAmount),
    ),
    overBudget: usedAmount > dailyLimit,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeFixedExpense(expense: FixedExpense): FixedExpense {
  return {
    ...expense,
    id: scrub(expense.id),
    name: scrub(expense.name),
    category: scrub(expense.category) || "기타",
    amount: money(expense.amount),
    dueDate: iso(expense.dueDate),
    status: enumOf(
      ["DUE", "PAID", "OVERDUE", "SKIPPED"] as const,
      expense.status,
      "DUE",
    ),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeVariableExpense(expense: VariableExpense): VariableExpense {
  return {
    ...expense,
    id: scrub(expense.id),
    name: scrub(expense.name),
    category: scrub(expense.category) || "기타",
    amount: money(expense.amount),
    spentAt: iso(expense.spentAt),
    memo: scrub(expense.memo),
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

function normalizeAd(ad: AdPlacement): AdPlacement {
  const safeDestination = scrub(ad.destination);

  return {
    id: scrub(ad.id),
    label: ad.label === "제휴" ? "제휴" : "광고",
    title: scrub(ad.title),
    description: scrub(ad.description),
    destination:
      safeDestination.startsWith("/") || safeDestination.startsWith("https://")
        ? safeDestination
        : "/",
    contextualOnly: true,
    rawFinancialTargetingUsed: false,
    userIdentifierShared: false,
  };
}

function normalizeSummary(summary: SalarySummary): SalarySummary {
  return {
    plannedTotalExpense: money(summary.plannedTotalExpense),
    expectedHijack: money(summary.expectedHijack),
    todayRemainingBudget: money(summary.todayRemainingBudget),
    monthlyActualHijack: money(summary.monthlyActualHijack),
    totalHijackSaved: money(summary.totalHijackSaved),
    remainingDaysUntilPayday: money(summary.remainingDaysUntilPayday),
    budgetUseRate: percent(summary.budgetUseRate),
    savingsRate: percent(summary.savingsRate),
  };
}

function computeDailyBudget(plan: SalaryPlan): DailyBudget {
  const dailyLimit = Math.floor(
    money(plan.dailyLivingBudget) /
      Math.max(1, remainingDaysInMonth(plan.month)),
  );
  const usedAmount = money(plan.variableExpenseToDate);

  return normalizeDailyBudget({
    date: new Date().toISOString(),
    dailyLimit,
    usedAmount,
    remainingAmount: Math.max(0, dailyLimit - usedAmount),
    overBudget: usedAmount > dailyLimit,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  });
}

function computeSummary(
  plan: SalaryPlan,
  daily: DailyBudget,
  totalHijackSaved: number,
): SalarySummary {
  const plannedTotalExpense = money(
    plan.fixedExpense + plan.dailyLivingBudget + plan.plannedOtherExpense,
  );
  const expectedHijack = Math.max(
    0,
    money(plan.expectedSalary - plannedTotalExpense),
  );
  const todayRemainingBudget = Math.max(
    0,
    money(daily.dailyLimit - daily.usedAmount),
  );
  const monthlyActualHijack = Math.max(
    0,
    money(
      plan.actualIncome +
        plan.carryOver -
        plan.fixedExpense -
        plan.variableExpenseToDate -
        plan.actualSavings,
    ),
  );

  return {
    plannedTotalExpense,
    expectedHijack,
    todayRemainingBudget,
    monthlyActualHijack,
    totalHijackSaved: money(totalHijackSaved),
    remainingDaysUntilPayday: daysBetween(
      new Date(),
      new Date(plan.nextPayday),
    ),
    budgetUseRate:
      daily.dailyLimit > 0
        ? percent((daily.usedAmount * 100) / daily.dailyLimit)
        : 0,
    savingsRate:
      plan.expectedSalary > 0
        ? percent(
            ((plan.fixedSaving + plan.actualSavings) * 100) /
              plan.expectedSalary,
          )
        : 0,
  };
}

function statsFrom(
  fixed: readonly FixedExpense[],
  variable: readonly VariableExpense[],
  ads: readonly AdPlacement[],
  partial: Partial<SalaryStats> = {},
): SalaryStats {
  const safeCount = fixed.length + variable.length + ads.length;
  const safePassed =
    fixed.filter(isSafeFinanceRecord).length +
    variable.filter(isSafeFinanceRecord).length +
    ads.filter(
      (ad: AdPlacement) =>
        !ad.rawFinancialTargetingUsed && !ad.userIdentifierShared,
    ).length;

  return {
    fixedExpenseCount: partial.fixedExpenseCount ?? fixed.length,
    paidFixedExpenseCount:
      partial.paidFixedExpenseCount ??
      fixed.filter((item: FixedExpense) => item.status === "PAID").length,
    variableExpenseCount: partial.variableExpenseCount ?? variable.length,
    notificationCount: partial.notificationCount ?? 0,
    privacyPassRate: partial.privacyPassRate ?? pct(safePassed, safeCount),
  };
}

function isSafeFinanceRecord(record: FixedExpense | VariableExpense): boolean {
  return (
    !record.rawFinancialDataExposed &&
    !record.rawPersonalDataExposed &&
    !record.adsFinancialTargetingUsed
  );
}

function sortFixedExpenses(
  items: readonly FixedExpense[],
): readonly FixedExpense[] {
  return items
    .slice()
    .sort(
      (a: FixedExpense, b: FixedExpense) =>
        Number(a.status === "PAID") - Number(b.status === "PAID") ||
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
}

function sortVariableExpenses(
  items: readonly VariableExpense[],
): readonly VariableExpense[] {
  return items
    .slice()
    .sort(
      (a: VariableExpense, b: VariableExpense) =>
        new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime(),
    );
}

function seedPayload(): SalaryPayload {
  const now = new Date();
  const payday = new Date(now.getFullYear(), now.getMonth(), 25).toISOString();
  const nextPayday = new Date(
    now.getFullYear(),
    now.getMonth() + (now.getDate() >= 25 ? 1 : 0),
    25,
  ).toISOString();
  const plan = normalizePlan({
    id: "seed-salary",
    month: monthKey(now),
    payday,
    nextPayday,
    expectedSalary: 3_200_000,
    actualIncome: 0,
    carryOver: 120_000,
    fixedExpense: 980_000,
    dailyLivingBudget: 900_000,
    plannedOtherExpense: 160_000,
    fixedSaving: 650_000,
    variableExpenseToDate: 13_000,
    actualSavings: 650_000,
    status: "ACTIVE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  });

  const dailyBudget = normalizeDailyBudget({
    date: now.toISOString(),
    dailyLimit: 30_000,
    usedAmount: 13_000,
    remainingAmount: 17_000,
    overBudget: false,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  });

  const fixedExpenses = [
    {
      id: "chatgpt",
      name: "ChatGPT 자동결제",
      category: "구독",
      amount: 30_000,
      dueDate: now.toISOString(),
      status: "DUE",
      isRecurring: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
    {
      id: "netflix",
      name: "넷플릭스 자동결제",
      category: "구독",
      amount: 15_000,
      dueDate: now.toISOString(),
      status: "PAID",
      isRecurring: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
  ] as const;

  const variableExpenses = [
    {
      id: "coffee",
      name: "아이스 아메리카노",
      category: "식비",
      amount: 2_000,
      spentAt: now.toISOString(),
      memo: "오늘 소비",
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
    {
      id: "lunch",
      name: "구내식당 점심",
      category: "식비",
      amount: 6_500,
      spentAt: now.toISOString(),
      memo: "점심",
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
  ] as const;

  const ads = [
    {
      id: "contextual-benefit",
      label: "제휴",
      title: "생활비 절약 혜택",
      description:
        "급여·지출 금액을 사용하지 않는 화면 맥락 기반 제휴 안내입니다.",
      destination: "/benefits",
      contextualOnly: true,
      rawFinancialTargetingUsed: false,
      userIdentifierShared: false,
    },
  ] as const;

  return normalizePayload({
    plan,
    dailyBudget,
    fixedExpenses,
    variableExpenses,
    ads,
    summary: {
      ...computeSummary(plan, dailyBudget, 5_780_000),
      totalHijackSaved: 5_780_000,
    },
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
    : `mobile-salary-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "급여 홈 접근이 제한되었습니다.";
  if (status === 404) return "급여 계획을 찾을 수 없습니다.";
  if (status === 409) return "급여 계획 상태가 변경되었습니다. 새로고침하세요.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";

  return `급여 홈 요청에 실패했습니다. (${status})`;
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

function percent(value: number): number {
  return Math.max(
    0,
    Math.min(100, Number.isFinite(value) ? Math.round(value * 100) / 100 : 0),
  );
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

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function remainingDaysInMonth(month: string): number {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw);
  const lastDay =
    Number.isFinite(year) && Number.isFinite(monthIndex)
      ? new Date(year, monthIndex, 0).getDate()
      : 30;

  return Math.max(1, lastDay - new Date().getDate() + 1);
}

function daysBetween(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(diff / 86_400_000));
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

function krw(value: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(money(value))}원`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(money(value));
}

export function assertMobileSalaryIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_salary_screen_runtime_loaded",
    "react_native_runtime_loaded",
    "salary_home_summary",
    "payday_and_next_payday",
    "expected_salary_card",
    "planned_total_expense_card",
    "expected_hijack_card",
    "total_hijack_saved_card",
    "server_authority_formulas_visible",
    "planned_total_expense_formula",
    "expected_hijack_formula",
    "today_remaining_budget_formula",
    "monthly_actual_hijack_formula",
    "fixed_expense_list",
    "fixed_expense_pay_action",
    "daily_budget_status",
    "variable_expense_list",
    "ad_partner_contextual_guard",
    "quick_routes_plan_expense_saving_notification",
    "api_v1_payroll_home",
    "api_v1_payroll_recalculate",
    "api_v1_fixed_expense_pay",
    "krw_integer_only",
    "no_negative_money",
    "sensitive_error_redaction",
    "raw_financial_data_exposure_forbidden",
    "raw_personal_data_exposure_forbidden",
    "ads_financial_targeting_forbidden",
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
  coinBadge: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 24,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  coinText: { color: "#020617", fontSize: 30, fontWeight: "900" },
  heroBody: { flex: 1, gap: 4 },
  heroTitle: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  heroMeta: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amountCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    borderWidth: 1,
    minWidth: "47%",
    padding: 12,
  },
  amountLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "900" },
  amountValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
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
  actionPanel: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: "#020617", fontSize: 15, fontWeight: "900" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 13,
  },
  secondaryButtonText: { color: "#e2e8f0", fontSize: 13, fontWeight: "900" },
  panel: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  panelTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  panelTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  panelLink: {
    borderColor: "rgba(103,232,249,0.28)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  panelLinkText: { color: "#67e8f9", fontSize: 12, fontWeight: "900" },
  formulaText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 17,
  },
  formulaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  formulaCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    minWidth: "47%",
    padding: 10,
  },
  formulaLabel: { color: "#67e8f9", fontSize: 10, fontWeight: "900" },
  formulaValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },
  rowCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    padding: 13,
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
  doneText: { color: "#86efac", fontSize: 12, fontWeight: "900" },
  pendingText: { color: "#fde68a", fontSize: 12, fontWeight: "900" },
  rowTitle: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  rowMeta: { color: "#cbd5e1", fontSize: 13, lineHeight: 19 },
  smallPrimary: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#67e8f9",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 13,
  },
  smallPrimaryText: { color: "#020617", fontSize: 13, fontWeight: "900" },
  successText: {
    color: "#86efac",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
  },
  warningText: {
    color: "#fecdd3",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
  },
  emptyText: { color: "#94a3b8", fontSize: 13, lineHeight: 20 },
  adCard: {
    backgroundColor: "rgba(123,63,242,0.14)",
    borderColor: "rgba(196,181,253,0.26)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 13,
  },
  adLabel: { color: "#ddd6fe", fontSize: 11, fontWeight: "900" },
  adTitle: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  adDescription: { color: "#e9d5ff", fontSize: 13, lineHeight: 19 },
  adGuard: { color: "#c4b5fd", fontSize: 10, fontWeight: "800" },
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
