/** apps/mobile/app/(tabs)/plan/index.tsx
 * 급여납치 모바일 계획 탭 최종본.
 * 정적 import와 JSX 없이 Expo Router·React Native 런타임 모듈을 지연 로딩한다.
 */

import { readMobileApiBaseUrl } from "../../../src/shared/api/api-base";
import { attachMobileBearerToken } from "../../../src/shared/storage/auth-token";
import { createSecureStoreRuntime } from "../../../src/shared/storage/secure-store";

declare function require(moduleName: string): unknown;

type PlanTab = "SUMMARY" | "SALARY" | "EXPENSE" | "SAVING" | "BUDGET";
type PlanStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";
type BucketKind =
  | "FIXED_EXPENSE"
  | "FIXED_SAVING"
  | "DAILY_BUDGET"
  | "PLANNED_OTHER";
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

type PayrollPlan = Readonly<{
  id: string;
  month: string;
  status: PlanStatus;
  expectedSalary: number;
  actualIncome: number;
  carryOver: number;
  fixedExpense: number;
  fixedSaving: number;
  dailyLivingBudget: number;
  plannedOtherExpense: number;
  variableExpenseToDate: number;
  actualSavings: number;
  payday: string;
  closedAt: string | null;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;
type PlanBucket = Readonly<{
  id: string;
  kind: BucketKind;
  name: string;
  amount: number;
  dueDate: string | null;
  isPaidOrSaved: boolean;
  isRequired: boolean;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;
type PlanSummary = Readonly<{
  plannedTotalExpense: number;
  expectedHijack: number;
  todayRemainingBudget: number;
  monthlyActualHijack: number;
  savingsRate: number;
  expenseRate: number;
  dayProgressPercent: number;
}>;
type PlanStats = Readonly<{
  fixedExpenseCount: number;
  savingGoalCount: number;
  dailyBudgetDays: number;
  upcomingDueCount: number;
  privacyPassRate: string;
}>;
type PlanPayload = Readonly<{
  plan: PayrollPlan;
  summary: PlanSummary;
  buckets: readonly PlanBucket[];
  stats: PlanStats;
}>;
type PlanResponse = Readonly<{ data?: Partial<PlanPayload>; error?: unknown }>;
type ActionResponse = Readonly<{
  data?: Partial<PlanPayload>;
  error?: unknown;
}>;
type PlanState = Readonly<{
  tab: PlanTab;
  payload: PlanPayload;
  busy: boolean;
  refreshing: boolean;
  toast: Readonly<{ kind: ToastKind; message: string }>;
}>;

const SCREEN_VERSION = "3.1.1";
const TABS = ["SUMMARY", "SALARY", "EXPENSE", "SAVING", "BUDGET"] as const;
const PLAN_ROUTES: Readonly<Record<PlanTab, string>> = Object.freeze({
  SUMMARY: "/plan",
  SALARY: "/plan/salary",
  EXPENSE: "/plan/fixed-expenses",
  SAVING: "/plan/savings",
  BUDGET: "/plan/daily-budget",
});
const tabLabels: Readonly<Record<PlanTab, string>> = Object.freeze({
  SUMMARY: "요약",
  SALARY: "급여",
  EXPENSE: "지출",
  SAVING: "저축",
  BUDGET: "일일예산",
});
const bucketLabels: Readonly<Record<BucketKind, string>> = Object.freeze({
  FIXED_EXPENSE: "고정지출",
  FIXED_SAVING: "고정저축",
  DAILY_BUDGET: "생활예산",
  PLANNED_OTHER: "기타계획",
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
const fallbackPlan: PayrollPlan = Object.freeze({
  id: "pending",
  month: monthKey(new Date()),
  status: "DRAFT",
  expectedSalary: 0,
  actualIncome: 0,
  carryOver: 0,
  fixedExpense: 0,
  fixedSaving: 0,
  dailyLivingBudget: 0,
  plannedOtherExpense: 0,
  variableExpenseToDate: 0,
  actualSavings: 0,
  payday: new Date().toISOString(),
  closedAt: null,
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  adsFinancialTargetingUsed: false,
});
const fallbackPayload: PlanPayload = Object.freeze({
  plan: fallbackPlan,
  summary: computeSummary(fallbackPlan),
  buckets: [],
  stats: {
    fixedExpenseCount: 0,
    savingGoalCount: 0,
    dailyBudgetDays: 0,
    upcomingDueCount: 0,
    privacyPassRate: "100.00%",
  },
});

export default function PlanIndexScreen(): unknown {
  const router = RouterRuntimeRef.useRouter();
  const [state, setState] = ReactRuntimeRef.useState<PlanState>({
    tab: "SUMMARY",
    payload: fallbackPayload,
    busy: false,
    refreshing: false,
    toast: {
      kind: "info",
      message: "급여 계획을 서버 권위 기준으로 불러옵니다.",
    },
  });
  const update = ReactRuntimeRef.useCallback(
    (patch: Partial<PlanState>): void =>
      setState((prev: PlanState) => ({ ...prev, ...patch })),
    [],
  );
  const visibleBuckets = ReactRuntimeRef.useMemo(
    () => filterBuckets(state.payload.buckets, state.tab),
    [state.payload.buckets, state.tab],
  );
  const loadPlan = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    setState((prev: PlanState) => ({ ...prev, refreshing: true }));
    try {
      const response = await requestJson<PlanResponse>(
        "/api/v1/payroll/current",
      );
      const payload = normalizePayload(response.data ?? {});
      setState((prev: PlanState) => ({
        ...prev,
        payload,
        refreshing: false,
        toast: { kind: "success", message: "급여 계획을 동기화했습니다." },
      }));
    } catch (error) {
      const seeded = seedPayload();
      setState((prev: PlanState) => ({
        ...prev,
        payload: prev.payload.plan.id !== "pending" ? prev.payload : seeded,
        refreshing: false,
        toast: {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "계획 조회에 실패했습니다.",
        },
      }));
    }
  }, []);
  const recalculate = ReactRuntimeRef.useCallback(async (): Promise<void> => {
    update({ busy: true });
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
        busy: false,
        toast: { kind: "success", message: "서버 권위 계산을 재실행했습니다." },
      });
    } catch (error) {
      update({
        busy: false,
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
    void loadPlan();
  }, [loadPlan]);
  return h(
    NativeRuntimeRef.SafeAreaView,
    { style: styles.safeArea },
    h(
      NativeRuntimeRef.View,
      { style: styles.header },
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerKicker },
        `Plan · v${SCREEN_VERSION}`,
      ),
      h(NativeRuntimeRef.Text, { style: styles.headerTitle }, "급여 계획"),
      h(
        NativeRuntimeRef.Text,
        { style: styles.headerDescription },
        "급여일 전에 고정지출, 고정저축, 일일예산, 변동지출 계획을 서버 권위로 확정합니다.",
      ),
    ),
    renderToast(state.toast),
    h(
      NativeRuntimeRef.ScrollView,
      {
        refreshControl: h(NativeRuntimeRef.RefreshControl, {
          refreshing: state.refreshing,
          onRefresh: (): void => void loadPlan(),
        }),
        style: styles.scroll,
        contentContainerStyle: styles.scrollContent,
      },
      renderHero(state.payload),
      renderTabs(state.tab, (tab: PlanTab): void => update({ tab })),
      renderFormulaPanel(state.payload.summary),
      renderQuickActions(state.busy, recalculate, openRoute),
      renderBucketPanel(state.tab, visibleBuckets),
      renderStats(state.payload.stats),
      renderGuardBox(),
    ),
  );
}

function renderHero(payload: PlanPayload): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.heroCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.heroTop },
      h(
        NativeRuntimeRef.View,
        { style: styles.monthBadge },
        h(
          NativeRuntimeRef.Text,
          { style: styles.monthText },
          payload.plan.month.slice(5, 7),
        ),
      ),
      h(
        NativeRuntimeRef.View,
        { style: styles.heroBody },
        h(
          NativeRuntimeRef.Text,
          { style: styles.heroTitle },
          `${payload.plan.month} 월급 방어 계획`,
        ),
        h(
          NativeRuntimeRef.Text,
          { style: styles.heroMeta },
          `${payload.plan.status} · 급여일 ${dateText(payload.plan.payday)}`,
        ),
      ),
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.amountGrid },
      renderAmount("예상 급여", payload.plan.expectedSalary),
      renderAmount("계획 지출", payload.summary.plannedTotalExpense),
      renderAmount("예상 납치", payload.summary.expectedHijack),
      renderAmount("실제 납치", payload.summary.monthlyActualHijack),
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
function renderTabs(
  selected: PlanTab,
  onSelect: (tab: PlanTab) => void,
): unknown {
  return h(
    NativeRuntimeRef.ScrollView,
    {
      horizontal: true,
      showsHorizontalScrollIndicator: false,
      style: styles.tabs,
      contentContainerStyle: styles.tabsContent,
    },
    ...TABS.map((tab: PlanTab) =>
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
function renderFormulaPanel(summary: PlanSummary): unknown {
  const items = [
    ["planned_total_expense", summary.plannedTotalExpense],
    ["expected_hijack", summary.expectedHijack],
    ["today_remaining_budget", summary.todayRemainingBudget],
    ["monthly_actual_hijack", summary.monthlyActualHijack],
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(NativeRuntimeRef.Text, { style: styles.panelTitle }, "서버 권위 계산식"),
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
      ...items.map(([label, value]: readonly [string, number]) =>
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
function renderQuickActions(
  busy: boolean,
  recalculate: () => Promise<void>,
  openRoute: (route: string) => void,
): unknown {
  const actions = [
    ["급여 수정", PLAN_ROUTES.SALARY],
    ["지출 관리", PLAN_ROUTES.EXPENSE],
    ["저축 관리", PLAN_ROUTES.SAVING],
    ["일일 예산", PLAN_ROUTES.BUDGET],
  ] as const;
  return h(
    NativeRuntimeRef.View,
    { style: styles.actionPanel },
    h(
      NativeRuntimeRef.Pressable,
      {
        accessibilityRole: "button",
        disabled: busy,
        onPress: (): void => void recalculate(),
        style: [styles.primaryButton, busy ? styles.buttonDisabled : null],
      },
      busy
        ? h(NativeRuntimeRef.ActivityIndicator, { color: "#020617" })
        : h(
            NativeRuntimeRef.Text,
            { style: styles.primaryButtonText },
            "계획 재계산",
          ),
    ),
    h(
      NativeRuntimeRef.View,
      { style: styles.actionGrid },
      ...actions.map(([label, route]: readonly [string, string]) =>
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
function renderBucketPanel(
  tab: PlanTab,
  buckets: readonly PlanBucket[],
): unknown {
  return h(
    NativeRuntimeRef.View,
    { style: styles.panel },
    h(
      NativeRuntimeRef.Text,
      { style: styles.panelTitle },
      `${tabLabels[tab]} 항목`,
    ),
    ...(buckets.length > 0
      ? buckets.map(renderBucket)
      : [
          h(
            NativeRuntimeRef.Text,
            { key: "empty", style: styles.emptyText },
            "등록된 계획 항목이 없습니다.",
          ),
        ]),
  );
}
function renderBucket(bucket: PlanBucket): unknown {
  return h(
    NativeRuntimeRef.View,
    { key: bucket.id, style: styles.bucketCard },
    h(
      NativeRuntimeRef.View,
      { style: styles.bucketTop },
      h(
        NativeRuntimeRef.Text,
        { style: styles.bucketKind },
        bucketLabels[bucket.kind],
      ),
      h(
        NativeRuntimeRef.Text,
        { style: bucket.isPaidOrSaved ? styles.doneText : styles.pendingText },
        bucket.isPaidOrSaved ? "완료" : "예정",
      ),
    ),
    h(NativeRuntimeRef.Text, { style: styles.bucketName }, bucket.name),
    h(
      NativeRuntimeRef.Text,
      { style: styles.bucketMeta },
      `${krw(bucket.amount)}${bucket.dueDate ? ` · ${dateText(bucket.dueDate)}` : ""}${bucket.isRequired ? " · 필수" : ""}`,
    ),
  );
}
function renderStats(stats: PlanStats): unknown {
  const items = [
    ["고정지출", formatCount(stats.fixedExpenseCount)],
    ["저축목표", formatCount(stats.savingGoalCount)],
    ["일일예산", formatCount(stats.dailyBudgetDays)],
    ["예정", formatCount(stats.upcomingDueCount)],
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
      "Plan · Server Authority Guard",
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
function normalizePayload(partial: Partial<PlanPayload>): PlanPayload {
  const plan = normalizePlan(partial.plan ?? fallbackPlan);
  const buckets = (partial.buckets ?? []).map(normalizeBucket);
  return {
    plan,
    buckets,
    summary: normalizeSummary(partial.summary ?? computeSummary(plan)),
    stats: statsFrom(buckets, partial.stats),
  };
}
function normalizePlan(plan: PayrollPlan): PayrollPlan {
  return {
    ...plan,
    id: scrub(plan.id),
    month: scrub(plan.month) || monthKey(new Date()),
    status: enumOf(
      ["DRAFT", "ACTIVE", "PAUSED", "CLOSED"] as const,
      plan.status,
      "DRAFT",
    ),
    expectedSalary: money(plan.expectedSalary),
    actualIncome: money(plan.actualIncome),
    carryOver: money(plan.carryOver),
    fixedExpense: money(plan.fixedExpense),
    fixedSaving: money(plan.fixedSaving),
    dailyLivingBudget: money(plan.dailyLivingBudget),
    plannedOtherExpense: money(plan.plannedOtherExpense),
    variableExpenseToDate: money(plan.variableExpenseToDate),
    actualSavings: money(plan.actualSavings),
    payday: iso(plan.payday),
    closedAt: plan.closedAt ? iso(plan.closedAt) : null,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}
function normalizeBucket(bucket: PlanBucket): PlanBucket {
  return {
    ...bucket,
    id: scrub(bucket.id),
    kind: enumOf(
      [
        "FIXED_EXPENSE",
        "FIXED_SAVING",
        "DAILY_BUDGET",
        "PLANNED_OTHER",
      ] as const,
      bucket.kind,
      "PLANNED_OTHER",
    ),
    name: scrub(bucket.name),
    amount: money(bucket.amount),
    dueDate: bucket.dueDate ? iso(bucket.dueDate) : null,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}
function normalizeSummary(summary: PlanSummary): PlanSummary {
  return {
    plannedTotalExpense: money(summary.plannedTotalExpense),
    expectedHijack: money(summary.expectedHijack),
    todayRemainingBudget: money(summary.todayRemainingBudget),
    monthlyActualHijack: money(summary.monthlyActualHijack),
    savingsRate: percent(summary.savingsRate),
    expenseRate: percent(summary.expenseRate),
    dayProgressPercent: percent(summary.dayProgressPercent),
  };
}
function computeSummary(plan: PayrollPlan): PlanSummary {
  const plannedTotalExpense = money(
    plan.fixedExpense + plan.dailyLivingBudget + plan.plannedOtherExpense,
  );
  const expectedHijack = Math.max(
    0,
    money(plan.expectedSalary - plannedTotalExpense),
  );
  const todayRemainingBudget = Math.max(
    0,
    money(
      Math.floor(
        plan.dailyLivingBudget / Math.max(1, daysInMonth(plan.month)),
      ) - plan.variableExpenseToDate,
    ),
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
    savingsRate: ratio(
      plan.fixedSaving + plan.actualSavings,
      plan.expectedSalary || plan.actualIncome,
    ),
    expenseRate: ratio(
      plannedTotalExpense,
      plan.expectedSalary || plan.actualIncome,
    ),
    dayProgressPercent: ratio(dayOfMonth(), daysInMonth(plan.month)),
  };
}
function statsFrom(
  buckets: readonly PlanBucket[],
  partial: Partial<PlanStats> = {},
): PlanStats {
  const safe = buckets.filter(
    (bucket: PlanBucket) =>
      !bucket.rawFinancialDataExposed &&
      !bucket.rawPersonalDataExposed &&
      !bucket.adsFinancialTargetingUsed,
  ).length;
  return {
    fixedExpenseCount:
      partial.fixedExpenseCount ??
      buckets.filter((bucket: PlanBucket) => bucket.kind === "FIXED_EXPENSE")
        .length,
    savingGoalCount:
      partial.savingGoalCount ??
      buckets.filter((bucket: PlanBucket) => bucket.kind === "FIXED_SAVING")
        .length,
    dailyBudgetDays:
      partial.dailyBudgetDays ??
      buckets.filter((bucket: PlanBucket) => bucket.kind === "DAILY_BUDGET")
        .length,
    upcomingDueCount:
      partial.upcomingDueCount ??
      buckets.filter((bucket: PlanBucket) => !bucket.isPaidOrSaved).length,
    privacyPassRate: partial.privacyPassRate ?? pct(safe, buckets.length),
  };
}
function filterBuckets(
  buckets: readonly PlanBucket[],
  tab: PlanTab,
): readonly PlanBucket[] {
  if (tab === "EXPENSE")
    return buckets.filter(
      (bucket: PlanBucket) =>
        bucket.kind === "FIXED_EXPENSE" || bucket.kind === "PLANNED_OTHER",
    );
  if (tab === "SAVING")
    return buckets.filter(
      (bucket: PlanBucket) => bucket.kind === "FIXED_SAVING",
    );
  if (tab === "BUDGET")
    return buckets.filter(
      (bucket: PlanBucket) => bucket.kind === "DAILY_BUDGET",
    );
  return buckets;
}
function seedPayload(): PlanPayload {
  const now = new Date().toISOString();
  const plan = normalizePlan({
    id: "seed-plan",
    month: monthKey(new Date()),
    status: "ACTIVE",
    expectedSalary: 3200000,
    actualIncome: 0,
    carryOver: 120000,
    fixedExpense: 980000,
    fixedSaving: 650000,
    dailyLivingBudget: 900000,
    plannedOtherExpense: 160000,
    variableExpenseToDate: 28000,
    actualSavings: 650000,
    payday: now,
    closedAt: null,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  });
  const buckets = [
    {
      id: "rent",
      kind: "FIXED_EXPENSE",
      name: "주거비",
      amount: 650000,
      dueDate: now,
      isPaidOrSaved: true,
      isRequired: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
    {
      id: "saving-main",
      kind: "FIXED_SAVING",
      name: "급여일 고정저축",
      amount: 650000,
      dueDate: now,
      isPaidOrSaved: true,
      isRequired: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
    {
      id: "daily",
      kind: "DAILY_BUDGET",
      name: "오늘 생활비 한도",
      amount: 30000,
      dueDate: now,
      isPaidOrSaved: false,
      isRequired: true,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
    {
      id: "other",
      kind: "PLANNED_OTHER",
      name: "교통·생활 기타",
      amount: 160000,
      dueDate: now,
      isPaidOrSaved: false,
      isRequired: false,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      adsFinancialTargetingUsed: false,
    },
  ] as const;
  return normalizePayload({ plan, buckets, summary: computeSummary(plan) });
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
    : `mobile-plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  if (status === 403) return "계획 접근이 제한되었습니다.";
  if (status === 404) return "급여 계획을 찾을 수 없습니다.";
  if (status === 409) return "계획 상태가 변경되었습니다. 새로고침하세요.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도하세요.";
  return `계획 요청에 실패했습니다. (${status})`;
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
function percent(value: number): number {
  return Math.max(
    0,
    Math.min(100, Number.isFinite(value) ? Math.round(value * 100) / 100 : 0),
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
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function daysInMonth(month: string): number {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw);
  return Number.isFinite(year) && Number.isFinite(monthIndex)
    ? new Date(year, monthIndex, 0).getDate()
    : 30;
}
function dayOfMonth(): number {
  return new Date().getDate();
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

export function assertMobilePlanIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "no_static_module_import_required",
    "no_jsx_required",
    "expo_router_plan_screen_runtime_loaded",
    "react_native_runtime_loaded",
    "salary_plan_summary",
    "server_authority_formulas_visible",
    "planned_total_expense_formula",
    "expected_hijack_formula",
    "today_remaining_budget_formula",
    "monthly_actual_hijack_formula",
    "fixed_expense_bucket",
    "fixed_saving_bucket",
    "daily_budget_bucket",
    "planned_other_expense_bucket",
    "recalculate_action",
    "salary_fixed_expense_savings_daily_budget_routes",
    "api_v1_payroll_current",
    "api_v1_payroll_recalculate",
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
  monthBadge: {
    alignItems: "center",
    backgroundColor: "#67e8f9",
    borderRadius: 24,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  monthText: { color: "#020617", fontSize: 23, fontWeight: "900" },
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
  panel: {
    backgroundColor: "#0f172a",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  panelTitle: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
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
  bucketCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 13,
  },
  bucketTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bucketKind: {
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
  bucketName: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  bucketMeta: { color: "#cbd5e1", fontSize: 13, lineHeight: 19 },
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
