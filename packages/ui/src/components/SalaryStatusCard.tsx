/**
 * packages/ui/src/components/SalaryStatusCard.tsx
 *
 * 급여납치 Salary Hijacking Platform · SalaryStatusCard
 *
 * React/JSX 런타임을 강제하지 않는 headless UI render-tree 컴포넌트입니다.
 * 급여 홈, 계획/설정 요약, 마이페이지 성과 요약, 관리자 급여/월마감 검토 큐에서 재사용할 수 있습니다.
 *
 * 원칙
 * - 예상/확정/누적 납치금액, 목표 달성률, 초과 지출 상태는 서버 권위 계산 결과를 표시한다.
 * - 클라이언트는 표시용 라벨, 진행률, 접근성 문자열, 액션 descriptor만 산출한다.
 * - raw credential, raw token, raw PII, 급여/지출/저축 원천 payload, 광고/커뮤니티 재무 결합 payload를 렌더링하지 않는다.
 * - JSX를 사용하지 않아 react/jsx-runtime이 없어도 TypeScript strict 환경에서 컴파일된다.
 */

export const SALARY_STATUS_CARD_CONTRACT_VERSION = "2.0.0" as const;
export const SALARY_STATUS_CARD_COMPONENT_NAME = "SalaryStatusCard" as const;
export const SALARY_STATUS_CARD_LOCALE = "ko-KR" as const;
export const SALARY_STATUS_CARD_TIMEZONE = "Asia/Seoul" as const;
export const SALARY_STATUS_CARD_CURRENCY = "KRW" as const;

export const SALARY_STATUS_CARD_POLICY_GUARD = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawPiiRendered: false,
  rawSalarySourcePayloadRendered: false,
  rawExpenseSourcePayloadRendered: false,
  rawSavingsSourcePayloadRendered: false,
  rawFinancialSourceDataRendered: false,
  adsFinancialRawJoinAllowed: false,
  communityFinancialRawJoinAllowed: false,
  clientFinalPayrollCalculationAllowed: false,
  serverAuthorityRequiredForAmounts: true,
  negativeMoneyDisplayAllowed: false,
  decimalMoneyDisplayAllowed: false,
  hijackAmountFloorZeroRequired: true,
  dangerouslySetInnerHTMLAllowed: false,
  reactJsxRuntimeRequired: false,
  globalJsxAugmentationRequired: false,
  accessibleActionLabelsRequired: true,
});

export type SalaryStatusCardCycleStatus =
  | "NOT_SET"
  | "DRAFT"
  | "PLANNED"
  | "PAYDAY_WAITING"
  | "PAYDAY_TODAY"
  | "SALARY_RECEIVED"
  | "CLOSING_READY"
  | "CLOSED"
  | "REOPENED"
  | "LOCKED";

export type SalaryStatusCardCalculationMode =
  | "EXPECTED"
  | "CONFIRMED"
  | "CUMULATIVE";
export type SalaryStatusCardTone =
  | "default"
  | "subtle"
  | "info"
  | "success"
  | "caution"
  | "danger";
export type SalaryStatusCardVariant =
  | "home"
  | "compact"
  | "detail"
  | "admin"
  | "mypage";
export type SalaryStatusCardDensity = "comfortable" | "compact";
export type SalaryStatusCardSize = "sm" | "md" | "lg";
export type SalaryStatusCardTrend =
  | "IMPROVING"
  | "STABLE"
  | "WORSENING"
  | "UNKNOWN";

export type SalaryStatusCardActionKind =
  | "OPEN_DETAIL"
  | "EDIT_PLAN"
  | "ADD_ACTUAL_SALARY"
  | "OPEN_BUDGET"
  | "OPEN_EXPENSES"
  | "OPEN_SAVINGS"
  | "OPEN_NOTIFICATIONS"
  | "CLOSE_MONTH"
  | "REOPEN_MONTH"
  | "REFRESH"
  | "ADMIN_ADJUST";

export interface SalaryStatusCardPolicy {
  readonly rawFinancialSourceDataIncluded?: boolean;
  readonly rawSalaryPayloadIncluded?: boolean;
  readonly rawExpensePayloadIncluded?: boolean;
  readonly rawSavingsPayloadIncluded?: boolean;
  readonly rawTokenIncluded?: boolean;
  readonly rawSecretIncluded?: boolean;
  readonly rawPiiIncluded?: boolean;
  readonly adsFinancialJoinAllowed?: boolean;
  readonly communityFinancialJoinAllowed?: boolean;
  readonly serverAuthoritative?: boolean;
}

export interface SalaryStatusCardCalculationMeta {
  readonly formulaVersion?: string;
  readonly calculatedAt?: string;
  readonly calculationReason?:
    | "INITIAL_PLAN"
    | "PAYROLL_PLAN_UPDATED"
    | "FIXED_EXPENSE_UPDATED"
    | "SAVINGS_UPDATED"
    | "DAILY_BUDGET_UPDATED"
    | "VARIABLE_EXPENSE_UPDATED"
    | "SALARY_RECEIVED"
    | "MONTH_CLOSED"
    | "MONTH_REOPENED"
    | "SERVER_RECALCULATION"
    | "ADMIN_ADJUSTMENT";
  readonly idempotencyKey?: string;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly stale?: boolean;
}

export interface SalaryStatusCardNotificationHint {
  readonly type:
    | "PAYDAY"
    | "HIJACK_GOAL"
    | "BUDGET_OVER"
    | "MONTH_CLOSE"
    | "PLAN_REQUIRED"
    | "SAVINGS_DUE";
  readonly label: string;
  readonly count?: number;
  readonly severity?: "INFO" | "SUCCESS" | "CAUTION" | "DANGER";
}

export interface SalaryStatusCardData {
  readonly payrollPlanId: string;
  readonly userId?: string;
  readonly yearMonth: string;
  readonly cycleStatus: SalaryStatusCardCycleStatus;
  readonly calculationMode?: SalaryStatusCardCalculationMode;
  readonly payday?: string;
  readonly paydayLabel?: string;
  readonly expectedSalaryAmount: number;
  readonly actualSalaryAmount?: number;
  readonly fixedExpenseTotal: number;
  readonly savingsTotal: number;
  readonly dailyBudgetTotal: number;
  readonly variableExpenseTotal: number;
  readonly expectedExpenseAmount: number;
  readonly expectedHijackAmount: number;
  readonly confirmedHijackAmount?: number;
  readonly cumulativeHijackAmount: number;
  readonly goalAmount?: number;
  readonly goalAchievementRate?: number;
  readonly overExpenseAmount?: number;
  readonly remainingBudgetAmount?: number;
  readonly fixedExpenseCount?: number;
  readonly savingsPlanCount?: number;
  readonly variableExpenseCount?: number;
  readonly dailyBudgetCount?: number;
  readonly trend?: SalaryStatusCardTrend;
  readonly policy?: SalaryStatusCardPolicy;
  readonly calculation?: SalaryStatusCardCalculationMeta;
  readonly notificationHints?: readonly SalaryStatusCardNotificationHint[];
  readonly closedAt?: string;
  readonly reopenedAt?: string;
  readonly updatedAt?: string;
}

export interface SalaryStatusCardActionContext {
  readonly payrollPlanId: string;
  readonly yearMonth: string;
  readonly cycleStatus: SalaryStatusCardCycleStatus;
  readonly source: typeof SALARY_STATUS_CARD_COMPONENT_NAME;
}

export type SalaryStatusCardStyle = Readonly<Record<string, string | number>>;
export type SalaryStatusCardAttributes = Readonly<
  Record<string, string | number | boolean>
>;

export interface SalaryStatusCardActionDescriptor {
  readonly kind: SalaryStatusCardActionKind;
  readonly label: string;
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly active: boolean;
  readonly context: SalaryStatusCardActionContext;
  readonly run?: () => void;
}

export interface SalaryStatusCardRenderNode {
  readonly type:
    | "section"
    | "header"
    | "footer"
    | "aside"
    | "row"
    | "cluster"
    | "badge"
    | "title"
    | "text"
    | "amount"
    | "metric"
    | "progress"
    | "button"
    | "hint";
  readonly key: string;
  readonly text?: string;
  readonly style?: SalaryStatusCardStyle;
  readonly attributes?: SalaryStatusCardAttributes;
  readonly action?: SalaryStatusCardActionDescriptor;
  readonly children?: readonly SalaryStatusCardRenderNode[];
}

export interface SalaryStatusCardRenderTree {
  readonly component: typeof SALARY_STATUS_CARD_COMPONENT_NAME;
  readonly contractVersion: typeof SALARY_STATUS_CARD_CONTRACT_VERSION;
  readonly root: SalaryStatusCardRenderNode;
  readonly model: SalaryStatusCardViewModel;
  readonly actions: readonly SalaryStatusCardActionDescriptor[];
}

export interface SalaryStatusCardProps {
  readonly summary: SalaryStatusCardData;
  readonly variant?: SalaryStatusCardVariant;
  readonly tone?: SalaryStatusCardTone;
  readonly density?: SalaryStatusCardDensity;
  readonly size?: SalaryStatusCardSize;
  readonly selected?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: SalaryStatusCardStyle;
  readonly testId?: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly emptyText?: string;
  readonly showPayday?: boolean;
  readonly showProgress?: boolean;
  readonly showBreakdown?: boolean;
  readonly showCounts?: boolean;
  readonly showHints?: boolean;
  readonly showActions?: boolean;
  readonly showPolicyWarning?: boolean;
  readonly maxHints?: number;
  readonly detailLabel?: string;
  readonly editPlanLabel?: string;
  readonly addActualSalaryLabel?: string;
  readonly budgetLabel?: string;
  readonly expensesLabel?: string;
  readonly savingsLabel?: string;
  readonly notificationsLabel?: string;
  readonly closeMonthLabel?: string;
  readonly reopenMonthLabel?: string;
  readonly refreshLabel?: string;
  readonly adminAdjustLabel?: string;
  readonly onOpenDetail?: (context: SalaryStatusCardActionContext) => void;
  readonly onEditPlan?: (context: SalaryStatusCardActionContext) => void;
  readonly onAddActualSalary?: (context: SalaryStatusCardActionContext) => void;
  readonly onOpenBudget?: (context: SalaryStatusCardActionContext) => void;
  readonly onOpenExpenses?: (context: SalaryStatusCardActionContext) => void;
  readonly onOpenSavings?: (context: SalaryStatusCardActionContext) => void;
  readonly onOpenNotifications?: (
    context: SalaryStatusCardActionContext,
  ) => void;
  readonly onCloseMonth?: (context: SalaryStatusCardActionContext) => void;
  readonly onReopenMonth?: (context: SalaryStatusCardActionContext) => void;
  readonly onRefresh?: (context: SalaryStatusCardActionContext) => void;
  readonly onAdminAdjust?: (context: SalaryStatusCardActionContext) => void;
}

export interface SalaryStatusCardCycleDescriptor {
  readonly status: SalaryStatusCardCycleStatus;
  readonly label: string;
  readonly tone: SalaryStatusCardTone;
  readonly actionDisabled: boolean;
  readonly description: string;
}

export interface SalaryStatusCardViewModel {
  readonly context: SalaryStatusCardActionContext;
  readonly status: SalaryStatusCardCycleDescriptor;
  readonly title: string;
  readonly subtitle: string;
  readonly yearMonthLabel: string;
  readonly paydayLabel: string;
  readonly expectedSalaryAmount: number;
  readonly actualSalaryAmount: number;
  readonly fixedExpenseTotal: number;
  readonly savingsTotal: number;
  readonly dailyBudgetTotal: number;
  readonly variableExpenseTotal: number;
  readonly expectedExpenseAmount: number;
  readonly expectedHijackAmount: number;
  readonly confirmedHijackAmount: number;
  readonly currentHijackAmount: number;
  readonly cumulativeHijackAmount: number;
  readonly goalAmount: number;
  readonly overExpenseAmount: number;
  readonly remainingBudgetAmount: number;
  readonly displayExpectedSalary: string;
  readonly displayActualSalary: string;
  readonly displayExpectedHijack: string;
  readonly displayConfirmedHijack: string;
  readonly displayCurrentHijack: string;
  readonly displayCumulativeHijack: string;
  readonly displayGoal: string;
  readonly displayOverExpense: string;
  readonly displayRemainingBudget: string;
  readonly goalAchievementRate: number;
  readonly goalProgressPercent: number;
  readonly expenseRatioPercent: number;
  readonly hijackRatioPercent: number;
  readonly fixedExpenseCount: number;
  readonly savingsPlanCount: number;
  readonly variableExpenseCount: number;
  readonly dailyBudgetCount: number;
  readonly trendLabel: string;
  readonly formulaLabel: string;
  readonly serverAuthorityLabel: string;
  readonly hasUnsafePolicy: boolean;
  readonly isServerAuthoritative: boolean;
  readonly isStale: boolean;
  readonly isClosed: boolean;
  readonly isPaydayToday: boolean;
  readonly isOverExpense: boolean;
  readonly isGoalAchieved: boolean;
  readonly isActionDisabled: boolean;
  readonly accessibilityLabel: string;
}

const STATUS: Readonly<
  Record<SalaryStatusCardCycleStatus, SalaryStatusCardCycleDescriptor>
> = Object.freeze({
  NOT_SET: {
    status: "NOT_SET",
    label: "미설정",
    tone: "subtle",
    actionDisabled: false,
    description: "급여 계획이 아직 설정되지 않았습니다.",
  },
  DRAFT: {
    status: "DRAFT",
    label: "작성중",
    tone: "subtle",
    actionDisabled: false,
    description: "급여 계획을 작성 중입니다.",
  },
  PLANNED: {
    status: "PLANNED",
    label: "계획됨",
    tone: "info",
    actionDisabled: false,
    description: "이번 달 급여 계획이 준비되었습니다.",
  },
  PAYDAY_WAITING: {
    status: "PAYDAY_WAITING",
    label: "급여 대기",
    tone: "info",
    actionDisabled: false,
    description: "급여 수령 전 계획 관리 상태입니다.",
  },
  PAYDAY_TODAY: {
    status: "PAYDAY_TODAY",
    label: "급여일",
    tone: "success",
    actionDisabled: false,
    description: "오늘은 급여 수령일입니다.",
  },
  SALARY_RECEIVED: {
    status: "SALARY_RECEIVED",
    label: "수령완료",
    tone: "success",
    actionDisabled: false,
    description: "실제 급여가 입력되었습니다.",
  },
  CLOSING_READY: {
    status: "CLOSING_READY",
    label: "마감대기",
    tone: "caution",
    actionDisabled: false,
    description: "월마감이 가능한 상태입니다.",
  },
  CLOSED: {
    status: "CLOSED",
    label: "월마감",
    tone: "subtle",
    actionDisabled: true,
    description: "이번 달 급여 계산이 확정되었습니다.",
  },
  REOPENED: {
    status: "REOPENED",
    label: "재오픈",
    tone: "caution",
    actionDisabled: false,
    description: "월마감 후 재오픈된 상태입니다.",
  },
  LOCKED: {
    status: "LOCKED",
    label: "잠김",
    tone: "subtle",
    actionDisabled: true,
    description: "운영 또는 정산 사유로 수정할 수 없습니다.",
  },
});

const palette = Object.freeze({
  surface: "#ffffff",
  surfaceElevated: "#f8fafc",
  surfaceSubtle: "#f1f5f9",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  faint: "#94a3b8",
  primary: "#2563eb",
  primarySoft: "#dbeafe",
  success: "#16a34a",
  successSoft: "#dcfce7",
  warning: "#d97706",
  warningSoft: "#fef3c7",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  gold: "#f7d34d",
  goldSoft: "#fff7d8",
});

const spacing = Object.freeze({ xs: 4, sm: 8, md: 12, lg: 16, xl: 20 });

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const won = (value: number | undefined): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;

const percent = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? clamp(Math.round(value), 0, 999)
    : clamp(Math.round(fallback), 0, 999);

const formatWon = (value: number): string => {
  const safe = won(value);
  try {
    return new Intl.NumberFormat(SALARY_STATUS_CARD_LOCALE, {
      style: "currency",
      currency: SALARY_STATUS_CARD_CURRENCY,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(safe);
  } catch {
    return `${safe.toLocaleString("ko-KR")}원`;
  }
};

const formatNumberKo = (value: number): string => {
  const safe = won(value);
  try {
    return new Intl.NumberFormat(SALARY_STATUS_CARD_LOCALE).format(safe);
  } catch {
    return String(safe);
  }
};

const formatYearMonthKo = (value: string): string => {
  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(SALARY_STATUS_CARD_LOCALE, {
      year: "numeric",
      month: "long",
      timeZone: SALARY_STATUS_CARD_TIMEZONE,
    }).format(date);
  } catch {
    return value;
  }
};

const formatDateKo = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(SALARY_STATUS_CARD_LOCALE, {
      month: "long",
      day: "numeric",
      weekday: "short",
      timeZone: SALARY_STATUS_CARD_TIMEZONE,
    }).format(date);
  } catch {
    return value;
  }
};

const sanitizeText = (value: string | undefined, fallback = ""): string =>
  (value ?? fallback)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const maskSensitiveText = (value: string): string =>
  value
    .replace(/\b\d{6}-\d{7}\b/g, "[개인정보 보호]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일 보호]")
    .replace(/01[016789][- ]?\d{3,4}[- ]?\d{4}/g, "[연락처 보호]")
    .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, "[카드번호 보호]")
    .replace(/\b\d{2,6}[- ]?\d{2,6}[- ]?\d{2,8}\b/g, "[계좌/식별번호 보호]");

const safeText = (
  value: string | undefined,
  fallback: string,
  maxLength: number,
): string => {
  const text = maskSensitiveText(sanitizeText(value, fallback));
  return text.length <= maxLength
    ? text
    : `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const hasUnsafePolicy = (policy: SalaryStatusCardPolicy | undefined): boolean =>
  policy?.rawFinancialSourceDataIncluded === true ||
  policy?.rawSalaryPayloadIncluded === true ||
  policy?.rawExpensePayloadIncluded === true ||
  policy?.rawSavingsPayloadIncluded === true ||
  policy?.rawTokenIncluded === true ||
  policy?.rawSecretIncluded === true ||
  policy?.rawPiiIncluded === true ||
  policy?.adsFinancialJoinAllowed === true ||
  policy?.communityFinancialJoinAllowed === true;

const isServerAuthoritative = (
  policy: SalaryStatusCardPolicy | undefined,
): boolean => policy?.serverAuthoritative !== false;

const trendLabel = (trend: SalaryStatusCardTrend | undefined): string => {
  if (trend === "IMPROVING") return "납치 흐름 개선";
  if (trend === "STABLE") return "납치 흐름 안정";
  if (trend === "WORSENING") return "지출 압박 상승";
  return "흐름 분석 전";
};

const contextOf = (
  summary: SalaryStatusCardData,
): SalaryStatusCardActionContext => ({
  payrollPlanId: summary.payrollPlanId,
  yearMonth: summary.yearMonth,
  cycleStatus: summary.cycleStatus,
  source: SALARY_STATUS_CARD_COMPONENT_NAME,
});

export const createSalaryStatusCardViewModel = (
  summary: SalaryStatusCardData,
): SalaryStatusCardViewModel => {
  const expectedSalaryAmount = won(summary.expectedSalaryAmount);
  const actualSalaryAmount = won(summary.actualSalaryAmount);
  const fixedExpenseTotal = won(summary.fixedExpenseTotal);
  const savingsTotal = won(summary.savingsTotal);
  const dailyBudgetTotal = won(summary.dailyBudgetTotal);
  const variableExpenseTotal = won(summary.variableExpenseTotal);
  const expectedExpenseAmount = won(summary.expectedExpenseAmount);
  const expectedHijackAmount = won(summary.expectedHijackAmount);
  const confirmedHijackAmount = won(summary.confirmedHijackAmount);
  const currentHijackAmount =
    summary.calculationMode === "CONFIRMED" ||
    summary.cycleStatus === "CLOSED" ||
    confirmedHijackAmount > 0
      ? confirmedHijackAmount
      : expectedHijackAmount;
  const cumulativeHijackAmount = won(summary.cumulativeHijackAmount);
  const goalAmount = won(summary.goalAmount);
  const overExpenseAmount = won(summary.overExpenseAmount);
  const remainingBudgetAmount = won(summary.remainingBudgetAmount);
  const goalFallback =
    goalAmount > 0 ? (cumulativeHijackAmount / goalAmount) * 100 : 0;
  const goalAchievementRate = percent(
    summary.goalAchievementRate,
    goalFallback,
  );
  const expenseBasis =
    actualSalaryAmount > 0 ? actualSalaryAmount : expectedSalaryAmount;
  const expenseTotalForRatio =
    summary.calculationMode === "CONFIRMED"
      ? fixedExpenseTotal + savingsTotal + variableExpenseTotal
      : expectedExpenseAmount;
  const expenseRatioPercent =
    expenseBasis > 0
      ? clamp(Math.round((expenseTotalForRatio / expenseBasis) * 100), 0, 999)
      : 0;
  const hijackRatioPercent =
    expenseBasis > 0
      ? clamp(Math.round((currentHijackAmount / expenseBasis) * 100), 0, 999)
      : 0;
  const unsafePolicy = hasUnsafePolicy(summary.policy);
  const serverAuthority = isServerAuthoritative(summary.policy);
  const status = STATUS[summary.cycleStatus];
  const isStale = summary.calculation?.stale === true;
  const formulaLabel = `${summary.calculation?.formulaVersion ? `공식 ${summary.calculation.formulaVersion}` : "서버 계산 결과"}${isStale ? " · 갱신 필요" : ""}`;

  const base = {
    context: contextOf(summary),
    status,
    title: "급여 납치 현황",
    subtitle: "월급이 사라지기 전에 내가 먼저 확보한 금액입니다.",
    yearMonthLabel: formatYearMonthKo(summary.yearMonth),
    paydayLabel: summary.paydayLabel
      ? safeText(summary.paydayLabel, "급여일", 40)
      : formatDateKo(summary.payday, "급여일 미설정"),
    expectedSalaryAmount,
    actualSalaryAmount,
    fixedExpenseTotal,
    savingsTotal,
    dailyBudgetTotal,
    variableExpenseTotal,
    expectedExpenseAmount,
    expectedHijackAmount,
    confirmedHijackAmount,
    currentHijackAmount,
    cumulativeHijackAmount,
    goalAmount,
    overExpenseAmount,
    remainingBudgetAmount,
    displayExpectedSalary: formatWon(expectedSalaryAmount),
    displayActualSalary:
      actualSalaryAmount > 0 ? formatWon(actualSalaryAmount) : "미입력",
    displayExpectedHijack: formatWon(expectedHijackAmount),
    displayConfirmedHijack:
      confirmedHijackAmount > 0 ? formatWon(confirmedHijackAmount) : "미확정",
    displayCurrentHijack: formatWon(currentHijackAmount),
    displayCumulativeHijack: formatWon(cumulativeHijackAmount),
    displayGoal: goalAmount > 0 ? formatWon(goalAmount) : "목표 미설정",
    displayOverExpense: formatWon(overExpenseAmount),
    displayRemainingBudget: formatWon(remainingBudgetAmount),
    goalAchievementRate,
    goalProgressPercent: clamp(goalAchievementRate, 0, 100),
    expenseRatioPercent,
    hijackRatioPercent,
    fixedExpenseCount: won(summary.fixedExpenseCount),
    savingsPlanCount: won(summary.savingsPlanCount),
    variableExpenseCount: won(summary.variableExpenseCount),
    dailyBudgetCount: won(summary.dailyBudgetCount),
    trendLabel: trendLabel(summary.trend),
    formulaLabel,
    serverAuthorityLabel: serverAuthority ? "서버 계산" : "서버 검증 필요",
    hasUnsafePolicy: unsafePolicy,
    isServerAuthoritative: serverAuthority,
    isStale,
    isClosed: summary.cycleStatus === "CLOSED",
    isPaydayToday: summary.cycleStatus === "PAYDAY_TODAY",
    isOverExpense: overExpenseAmount > 0,
    isGoalAchieved: goalAmount > 0 && goalAchievementRate >= 100,
    isActionDisabled: status.actionDisabled || unsafePolicy || !serverAuthority,
  } satisfies Omit<SalaryStatusCardViewModel, "accessibilityLabel">;

  return {
    ...base,
    accessibilityLabel: [
      base.title,
      base.yearMonthLabel,
      `현재 납치금액 ${base.displayCurrentHijack}`,
      `누적 납치금액 ${base.displayCumulativeHijack}`,
      `목표 달성률 ${formatNumberKo(base.goalAchievementRate)}%`,
      base.status.label,
    ].join(", "),
  };
};

const toneStyle = (tone: SalaryStatusCardTone): SalaryStatusCardStyle => {
  if (tone === "success")
    return {
      background: palette.successSoft,
      color: palette.success,
      borderColor: "#bbf7d0",
    };
  if (tone === "caution")
    return {
      background: palette.warningSoft,
      color: palette.warning,
      borderColor: "#fde68a",
    };
  if (tone === "danger")
    return {
      background: palette.dangerSoft,
      color: palette.danger,
      borderColor: "#fecaca",
    };
  if (tone === "info")
    return {
      background: palette.primarySoft,
      color: palette.primary,
      borderColor: "#bfdbfe",
    };
  if (tone === "subtle")
    return {
      background: palette.surfaceSubtle,
      color: palette.muted,
      borderColor: palette.border,
    };
  return {
    background: palette.surfaceElevated,
    color: palette.text,
    borderColor: palette.border,
  };
};

const cardStyle = (
  variant: SalaryStatusCardVariant,
  tone: SalaryStatusCardTone,
  density: SalaryStatusCardDensity,
  size: SalaryStatusCardSize,
  selected: boolean,
): SalaryStatusCardStyle => ({
  width: "100%",
  boxSizing: "border-box",
  display: "grid",
  gap: density === "compact" ? spacing.sm : spacing.md,
  padding: density === "compact" ? spacing.md : spacing.lg,
  borderRadius: variant === "compact" ? 16 : 22,
  border: `1px solid ${selected ? palette.primary : tone === "danger" ? "#fecaca" : palette.border}`,
  background: tone === "subtle" ? palette.surfaceElevated : palette.surface,
  boxShadow: selected
    ? "0 16px 38px rgba(37, 99, 235, 0.16)"
    : "0 10px 24px rgba(15, 23, 42, 0.07)",
  color: palette.text,
  fontFamily:
    "Pretendard, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: size === "sm" ? 13 : size === "lg" ? 16 : 14,
  lineHeight: 1.45,
});

const badgeStyle = (tone: SalaryStatusCardTone): SalaryStatusCardStyle => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 26,
  padding: "4px 9px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
  ...toneStyle(tone),
});

const buttonStyle = (
  active: boolean,
  disabled: boolean,
): SalaryStatusCardStyle => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 36,
  padding: "8px 12px",
  borderRadius: 999,
  border: `1px solid ${active ? palette.primary : palette.border}`,
  background: disabled
    ? palette.surfaceSubtle
    : active
      ? palette.primary
      : palette.surface,
  color: disabled ? palette.faint : active ? "#ffffff" : palette.text,
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
});

const amountStyle = (
  tone: SalaryStatusCardTone,
  emphasis = false,
): SalaryStatusCardStyle => {
  const base = toneStyle(tone);
  return {
    display: "grid",
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 16,
    border: `1px solid ${String(base.borderColor ?? palette.border)}`,
    background: String(base.background ?? palette.surfaceElevated),
    color: String(base.color ?? palette.text),
    fontSize: emphasis ? 22 : 17,
    fontWeight: emphasis ? 950 : 850,
    letterSpacing: "-0.03em",
  };
};

const metaRowStyle: SalaryStatusCardStyle = Object.freeze({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: spacing.sm,
  minWidth: 0,
});

const mutedStyle: SalaryStatusCardStyle = Object.freeze({
  color: palette.muted,
  fontSize: 13,
});

const action = (input: {
  readonly kind: SalaryStatusCardActionKind;
  readonly label: string;
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly active?: boolean;
  readonly context: SalaryStatusCardActionContext;
  readonly run?: (() => void) | undefined;
}): SalaryStatusCardActionDescriptor => ({
  kind: input.kind,
  label: input.label,
  ariaLabel: input.ariaLabel,
  disabled: input.disabled,
  active: input.active ?? false,
  context: input.context,
  ...(input.run === undefined ? {} : { run: input.run }),
});

const node = (input: {
  readonly type: SalaryStatusCardRenderNode["type"];
  readonly key: string;
  readonly text?: string | undefined;
  readonly style?: SalaryStatusCardStyle | undefined;
  readonly attributes?: SalaryStatusCardAttributes | undefined;
  readonly action?: SalaryStatusCardActionDescriptor | undefined;
  readonly children?: readonly SalaryStatusCardRenderNode[] | undefined;
}): SalaryStatusCardRenderNode => ({
  type: input.type,
  key: input.key,
  ...(input.text === undefined ? {} : { text: input.text }),
  ...(input.style === undefined ? {} : { style: input.style }),
  ...(input.attributes === undefined ? {} : { attributes: input.attributes }),
  ...(input.action === undefined ? {} : { action: input.action }),
  ...(input.children === undefined ? {} : { children: input.children }),
});

const makeActions = (
  props: SalaryStatusCardProps,
  model: SalaryStatusCardViewModel,
): readonly SalaryStatusCardActionDescriptor[] => {
  const softDisabled = props.disabled === true || props.loading === true;
  const hardDisabled = softDisabled || model.isActionDisabled;
  const closed = props.summary.cycleStatus === "CLOSED";
  const locked = props.summary.cycleStatus === "LOCKED";
  const context = model.context;
  const actions: SalaryStatusCardActionDescriptor[] = [
    action({
      kind: "OPEN_DETAIL",
      label: props.detailLabel ?? "상세",
      ariaLabel: "급여 현황 상세 보기",
      disabled: softDisabled || model.hasUnsafePolicy,
      context,
      run: props.onOpenDetail ? () => props.onOpenDetail?.(context) : undefined,
    }),
    action({
      kind: "EDIT_PLAN",
      label: props.editPlanLabel ?? "계획 수정",
      ariaLabel: "급여 계획 수정",
      disabled: hardDisabled || closed || locked,
      context,
      run: props.onEditPlan ? () => props.onEditPlan?.(context) : undefined,
    }),
    action({
      kind: "ADD_ACTUAL_SALARY",
      label: props.addActualSalaryLabel ?? "실수령 입력",
      ariaLabel: "실제 수령 급여 입력",
      disabled: hardDisabled || closed || locked,
      context,
      run: props.onAddActualSalary
        ? () => props.onAddActualSalary?.(context)
        : undefined,
    }),
    action({
      kind: "OPEN_BUDGET",
      label: props.budgetLabel ?? "일일예산",
      ariaLabel: "일일 예산 열기",
      disabled: softDisabled,
      context,
      run: props.onOpenBudget ? () => props.onOpenBudget?.(context) : undefined,
    }),
    action({
      kind: "OPEN_EXPENSES",
      label: props.expensesLabel ?? "지출",
      ariaLabel: "지출 내역 열기",
      disabled: softDisabled,
      context,
      run: props.onOpenExpenses
        ? () => props.onOpenExpenses?.(context)
        : undefined,
    }),
    action({
      kind: "OPEN_SAVINGS",
      label: props.savingsLabel ?? "저축",
      ariaLabel: "저축 계획 열기",
      disabled: softDisabled,
      context,
      run: props.onOpenSavings
        ? () => props.onOpenSavings?.(context)
        : undefined,
    }),
    action({
      kind: "OPEN_NOTIFICATIONS",
      label: props.notificationsLabel ?? "알림",
      ariaLabel: "급여 관련 알림 열기",
      disabled: softDisabled,
      context,
      run: props.onOpenNotifications
        ? () => props.onOpenNotifications?.(context)
        : undefined,
    }),
    action({
      kind: "REFRESH",
      label: props.refreshLabel ?? "새로고침",
      ariaLabel: "급여 현황 새로고침",
      disabled: softDisabled,
      context,
      run: props.onRefresh ? () => props.onRefresh?.(context) : undefined,
    }),
  ];

  if (
    props.summary.cycleStatus === "CLOSING_READY" ||
    props.summary.cycleStatus === "SALARY_RECEIVED"
  ) {
    actions.push(
      action({
        kind: "CLOSE_MONTH",
        label: props.closeMonthLabel ?? "월마감",
        ariaLabel: "이번 달 급여 월마감",
        disabled: hardDisabled || locked,
        active: false,
        context,
        run: props.onCloseMonth
          ? () => props.onCloseMonth?.(context)
          : undefined,
      }),
    );
  }

  if (closed || props.summary.cycleStatus === "REOPENED") {
    actions.push(
      action({
        kind: "REOPEN_MONTH",
        label: props.reopenMonthLabel ?? "재오픈",
        ariaLabel: "월마감 재오픈",
        disabled: softDisabled || !model.isServerAuthoritative || locked,
        active: props.summary.cycleStatus === "REOPENED",
        context,
        run: props.onReopenMonth
          ? () => props.onReopenMonth?.(context)
          : undefined,
      }),
    );
  }

  if (props.variant === "admin") {
    actions.push(
      action({
        kind: "ADMIN_ADJUST",
        label: props.adminAdjustLabel ?? "관리자 조정",
        ariaLabel: "급여 계산 관리자 조정",
        disabled: softDisabled,
        context,
        run: props.onAdminAdjust
          ? () => props.onAdminAdjust?.(context)
          : undefined,
      }),
    );
  }

  return actions;
};

const findAction = (
  actions: readonly SalaryStatusCardActionDescriptor[],
  kind: SalaryStatusCardActionKind,
): SalaryStatusCardActionDescriptor | undefined =>
  actions.find((item) => item.kind === kind);

const metricNode = (
  key: string,
  label: string,
  value: string,
): SalaryStatusCardRenderNode =>
  node({
    type: "metric",
    key,
    text: `${label} ${value}`,
    style: mutedStyle,
    attributes: { "aria-label": `${label} ${value}` },
  });

const amountNode = (
  key: string,
  label: string,
  value: string,
  tone: SalaryStatusCardTone,
  emphasis = false,
): SalaryStatusCardRenderNode =>
  node({
    type: "amount",
    key,
    text: `${label} ${value}`,
    style: amountStyle(tone, emphasis),
    attributes: { "aria-label": `${label} ${value}` },
  });

const hintTone = (
  severity: SalaryStatusCardNotificationHint["severity"],
): SalaryStatusCardTone => {
  if (severity === "SUCCESS") return "success";
  if (severity === "CAUTION") return "caution";
  if (severity === "DANGER") return "danger";
  return "info";
};

export const createSalaryStatusCardRenderTree = (
  props: SalaryStatusCardProps,
): SalaryStatusCardRenderTree => {
  const variant = props.variant ?? "home";
  const density = props.density ?? "comfortable";
  const size = props.size ?? "md";
  const loading = props.loading ?? false;
  const disabled = props.disabled ?? false;
  const model = createSalaryStatusCardViewModel(props.summary);
  const resolvedTone =
    props.tone ??
    (model.hasUnsafePolicy ||
    !model.isServerAuthoritative ||
    model.isOverExpense
      ? "danger"
      : model.isGoalAchieved
        ? "success"
        : model.status.tone);
  const rootStyle = {
    ...cardStyle(variant, resolvedTone, density, size, props.selected ?? false),
    ...(props.style ?? {}),
  };
  const actions = makeActions(props, model);
  const detailAction = findAction(actions, "OPEN_DETAIL");
  const editAction = findAction(actions, "EDIT_PLAN");
  const actualSalaryAction = findAction(actions, "ADD_ACTUAL_SALARY");
  const budgetAction = findAction(actions, "OPEN_BUDGET");
  const expensesAction = findAction(actions, "OPEN_EXPENSES");
  const savingsAction = findAction(actions, "OPEN_SAVINGS");
  const notificationAction = findAction(actions, "OPEN_NOTIFICATIONS");
  const closeMonthAction = findAction(actions, "CLOSE_MONTH");
  const reopenMonthAction = findAction(actions, "REOPEN_MONTH");
  const refreshAction = findAction(actions, "REFRESH");
  const adminAdjustAction = findAction(actions, "ADMIN_ADJUST");

  if (model.hasUnsafePolicy) {
    return {
      component: SALARY_STATUS_CARD_COMPONENT_NAME,
      contractVersion: SALARY_STATUS_CARD_CONTRACT_VERSION,
      model,
      actions,
      root: node({
        type: "section",
        key: `${props.summary.payrollPlanId}:policy-blocked`,
        style: {
          ...rootStyle,
          borderColor: "#fecaca",
          background: palette.dangerSoft,
        },
        attributes: {
          "data-testid": props.testId ?? "salary-status-card-policy-blocked",
          "data-component": SALARY_STATUS_CARD_COMPONENT_NAME,
          "aria-label": "정책 위반 가능성이 있어 숨겨진 급여 현황 카드",
          "aria-busy": loading,
          ...(props.className ? { className: props.className } : {}),
        },
        children: [
          node({
            type: "title",
            key: "policy-title",
            text: "보호 정책에 의해 급여 현황 payload를 표시하지 않습니다.",
            style: { color: palette.danger, fontWeight: 900 },
          }),
          node({
            type: "text",
            key: "policy-body",
            text: "급여·지출·저축 원천 데이터, 개인정보, 토큰 또는 광고 타겟팅 결합 정보가 포함된 payload는 UI에 표시하지 않습니다.",
            style: mutedStyle,
          }),
          ...(adminAdjustAction
            ? [
                node({
                  type: "button",
                  key: "admin-adjust",
                  text: adminAdjustAction.label,
                  style: buttonStyle(false, disabled || loading),
                  action: adminAdjustAction,
                }),
              ]
            : []),
        ],
      }),
    };
  }

  const children: SalaryStatusCardRenderNode[] = [
    node({
      type: "header",
      key: "header",
      style: { display: "grid", gap: spacing.sm },
      children: [
        node({
          type: "cluster",
          key: "badges",
          style: { ...metaRowStyle, justifyContent: "space-between" },
          children: [
            node({
              type: "badge",
              key: "status",
              text: model.status.label,
              style: badgeStyle(model.status.tone),
            }),
            node({
              type: "badge",
              key: "authority",
              text: model.serverAuthorityLabel,
              style: badgeStyle(
                model.isServerAuthoritative ? "success" : "danger",
              ),
            }),
            ...(model.isPaydayToday
              ? [
                  node({
                    type: "badge",
                    key: "payday-today",
                    text: "오늘 급여일",
                    style: badgeStyle("success"),
                  }),
                ]
              : []),
            ...(model.isGoalAchieved
              ? [
                  node({
                    type: "badge",
                    key: "goal-achieved",
                    text: "목표 달성",
                    style: badgeStyle("success"),
                  }),
                ]
              : []),
            ...(model.isStale
              ? [
                  node({
                    type: "badge",
                    key: "stale",
                    text: "갱신 필요",
                    style: badgeStyle("caution"),
                  }),
                ]
              : []),
            ...(variant === "admin"
              ? [
                  node({
                    type: "text",
                    key: "id",
                    text: `ID ${safeText(props.summary.payrollPlanId, "-", 18)}`,
                    style: mutedStyle,
                  }),
                ]
              : []),
          ],
        }),
        node({
          type: "title",
          key: "title",
          text: loading
            ? "급여 현황을 불러오는 중입니다."
            : safeText(props.title, model.title, 60),
          style: {
            color: palette.text,
            fontSize: size === "lg" ? 22 : size === "sm" ? 16 : 19,
            fontWeight: 950,
            letterSpacing: "-0.03em",
            lineHeight: 1.24,
          },
          action: detailAction,
        }),
        node({
          type: "text",
          key: "subtitle",
          text: loading
            ? "잠시만 기다려 주세요."
            : safeText(
                props.subtitle,
                model.subtitle ||
                  (props.emptyText ?? "급여 현황 정보가 없습니다."),
                96,
              ),
          style: {
            margin: 0,
            color: palette.muted,
            fontSize: size === "lg" ? 15 : 14,
          },
        }),
      ],
    }),
    node({
      type: "cluster",
      key: "hero-amounts",
      style: {
        display: "grid",
        gridTemplateColumns:
          variant === "compact"
            ? "1fr"
            : "repeat(auto-fit, minmax(150px, 1fr))",
        gap: spacing.sm,
      },
      children: [
        amountNode(
          "current-hijack",
          "이번 달 납치금액",
          model.displayCurrentHijack,
          model.isOverExpense ? "danger" : "success",
          true,
        ),
        amountNode(
          "cumulative-hijack",
          "누적 납치금액",
          model.displayCumulativeHijack,
          "info",
          true,
        ),
        amountNode(
          "goal",
          "목표",
          model.displayGoal,
          model.isGoalAchieved ? "success" : "subtle",
        ),
      ],
    }),
  ];

  if (props.showPayday !== false) {
    children.push(
      node({
        type: "row",
        key: "payday",
        style: {
          ...metaRowStyle,
          justifyContent: "space-between",
          padding: spacing.sm,
          borderRadius: 14,
          background: palette.surfaceElevated,
        },
        children: [
          metricNode("year-month", "기준월", model.yearMonthLabel),
          metricNode("payday", "급여일", model.paydayLabel),
          metricNode("trend", "흐름", model.trendLabel),
          metricNode("formula", "계산", model.formulaLabel),
        ],
      }),
    );
  }

  if (props.showProgress !== false) {
    children.push(
      node({
        type: "section",
        key: "goal-progress",
        style: { display: "grid", gap: spacing.xs },
        children: [
          node({
            type: "row",
            key: "goal-progress-labels",
            style: { ...metaRowStyle, justifyContent: "space-between" },
            children: [
              metricNode(
                "goal-rate",
                "목표 달성률",
                `${formatNumberKo(model.goalAchievementRate)}%`,
              ),
              metricNode(
                "hijack-ratio",
                "급여 확보율",
                `${formatNumberKo(model.hijackRatioPercent)}%`,
              ),
              metricNode(
                "expense-ratio",
                "지출 압박",
                `${formatNumberKo(model.expenseRatioPercent)}%`,
              ),
            ],
          }),
          node({
            type: "progress",
            key: "goal-progressbar",
            style: {
              width: "100%",
              height: 12,
              borderRadius: 999,
              background: palette.surfaceSubtle,
              overflow: "hidden",
            },
            attributes: {
              role: "progressbar",
              "aria-valuemin": 0,
              "aria-valuemax": 100,
              "aria-valuenow": model.goalProgressPercent,
              "aria-label": "납치 목표 달성률",
            },
            children: [
              node({
                type: "progress",
                key: "goal-progressbar-fill",
                style: {
                  width: `${model.goalProgressPercent}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: model.isGoalAchieved
                    ? palette.success
                    : palette.primary,
                  transition: "width 180ms ease",
                },
              }),
            ],
          }),
        ],
      }),
    );
  }

  if (props.showBreakdown !== false) {
    children.push(
      node({
        type: "cluster",
        key: "breakdown",
        style: {
          display: "grid",
          gridTemplateColumns:
            variant === "compact"
              ? "1fr"
              : "repeat(auto-fit, minmax(140px, 1fr))",
          gap: spacing.sm,
        },
        children: [
          amountNode(
            "expected-salary",
            "예상 급여",
            model.displayExpectedSalary,
            "subtle",
          ),
          amountNode(
            "actual-salary",
            "실수령 급여",
            model.displayActualSalary,
            "subtle",
          ),
          amountNode(
            "expected-hijack",
            "예상 납치",
            model.displayExpectedHijack,
            "info",
          ),
          amountNode(
            "confirmed-hijack",
            "확정 납치",
            model.displayConfirmedHijack,
            model.isClosed ? "success" : "subtle",
          ),
          amountNode(
            "over-expense",
            "초과 지출",
            model.displayOverExpense,
            model.isOverExpense ? "danger" : "subtle",
          ),
          amountNode(
            "remaining-budget",
            "남은 예산",
            model.displayRemainingBudget,
            "success",
          ),
        ],
      }),
    );
  }

  if (props.showCounts !== false) {
    children.push(
      node({
        type: "row",
        key: "counts",
        style: {
          ...metaRowStyle,
          justifyContent: "space-between",
          padding: spacing.sm,
          borderRadius: 14,
          background: palette.surfaceElevated,
        },
        children: [
          metricNode(
            "fixed-count",
            "고정지출",
            `${formatNumberKo(model.fixedExpenseCount)}건`,
          ),
          metricNode(
            "savings-count",
            "고정저축",
            `${formatNumberKo(model.savingsPlanCount)}건`,
          ),
          metricNode(
            "variable-count",
            "변동지출",
            `${formatNumberKo(model.variableExpenseCount)}건`,
          ),
          metricNode(
            "budget-count",
            "일일예산",
            `${formatNumberKo(model.dailyBudgetCount)}일`,
          ),
        ],
      }),
    );
  }

  if (
    props.showHints !== false &&
    (props.summary.notificationHints?.length ?? 0) > 0
  ) {
    const maxHints = Math.max(0, Math.trunc(props.maxHints ?? 3));
    children.push(
      node({
        type: "section",
        key: "hints",
        style: { display: "grid", gap: spacing.sm },
        children: (props.summary.notificationHints ?? [])
          .slice(0, maxHints)
          .map((hint, index) =>
            node({
              type: "hint",
              key: `${hint.type}:${index}`,
              text: `${safeText(hint.label, hint.type, 80)}${hint.count === undefined ? "" : ` · ${formatNumberKo(hint.count)}건`}`,
              style: {
                ...badgeStyle(hintTone(hint.severity)),
                justifyContent: "flex-start",
              },
            }),
          ),
      }),
    );
  }

  if (
    props.showPolicyWarning !== false &&
    (!model.isServerAuthoritative || model.isOverExpense)
  ) {
    children.push(
      node({
        type: "aside",
        key: "policy-warning",
        style: {
          display: "grid",
          gap: spacing.xs,
          padding: spacing.md,
          borderRadius: 14,
          background: model.isOverExpense
            ? palette.dangerSoft
            : palette.warningSoft,
          color: model.isOverExpense ? palette.danger : palette.warning,
        },
        children: [
          node({
            type: "title",
            key: "policy-warning-title",
            text: model.isOverExpense
              ? "지출 초과 확인 필요"
              : "서버 권위 계산 확인 필요",
          }),
          node({
            type: "text",
            key: "policy-warning-body",
            text: model.isOverExpense
              ? `초과 지출 ${model.displayOverExpense}이 감지되었습니다. 납치금액은 0원 미만으로 표시하지 않고 초과분은 별도 표시합니다.`
              : "급여·지출·저축 계산 결과는 서버/API/DB 트랜잭션 계산값만 최종값으로 표시해야 합니다.",
          }),
        ],
      }),
    );
  }

  if (props.showActions !== false) {
    const actionNodes = [
      detailAction,
      editAction,
      actualSalaryAction,
      budgetAction,
      expensesAction,
      savingsAction,
      notificationAction,
      closeMonthAction,
      reopenMonthAction,
      refreshAction,
      adminAdjustAction,
    ]
      .filter(
        (item): item is SalaryStatusCardActionDescriptor => item !== undefined,
      )
      .map((item) =>
        node({
          type: "button",
          key: item.kind,
          text: item.label,
          style: buttonStyle(item.active, item.disabled),
          action: item,
        }),
      );

    if (actionNodes.length > 0) {
      children.push(
        node({
          type: "footer",
          key: "actions",
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: spacing.sm,
            alignItems: "center",
            justifyContent: "space-between",
          },
          children: actionNodes,
        }),
      );
    }
  }

  return {
    component: SALARY_STATUS_CARD_COMPONENT_NAME,
    contractVersion: SALARY_STATUS_CARD_CONTRACT_VERSION,
    model,
    actions,
    root: node({
      type: "section",
      key: props.summary.payrollPlanId,
      style: rootStyle,
      attributes: {
        "data-testid": props.testId ?? "salary-status-card",
        "data-component": SALARY_STATUS_CARD_COMPONENT_NAME,
        "data-cycle-status": props.summary.cycleStatus,
        "data-year-month": props.summary.yearMonth,
        "data-goal-achieved": model.isGoalAchieved,
        "data-over-expense": model.isOverExpense,
        "aria-busy": loading,
        "aria-label": model.accessibilityLabel,
        ...(props.className ? { className: props.className } : {}),
      },
      children,
    }),
  };
};

export const SalaryStatusCard = (
  props: SalaryStatusCardProps,
): SalaryStatusCardRenderTree => createSalaryStatusCardRenderTree(props);

export const SALARY_STATUS_CARD_COMPLETENESS_REPORT = Object.freeze({
  ok: true,
  component: SALARY_STATUS_CARD_COMPONENT_NAME,
  contractVersion: SALARY_STATUS_CARD_CONTRACT_VERSION,
  coveredFeatures: [
    "headless-render-tree-card",
    "no-jsx",
    "no-react-jsx-runtime-required",
    "payroll-home-status",
    "expected-salary-display",
    "actual-salary-display",
    "expected-hijack-display",
    "confirmed-hijack-display",
    "cumulative-hijack-display",
    "goal-achievement-progress",
    "payday-status",
    "month-close-reopen-status",
    "fixed-expense-savings-daily-budget-variable-expense-breakdown",
    "over-expense-display",
    "hijack-floor-zero-display-policy",
    "server-authority-warning",
    "calculation-formula-label",
    "stale-calculation-indicator",
    "notification-hints",
    "open-detail-edit-plan-add-actual-salary-actions",
    "budget-expense-savings-notification-actions",
    "month-close-reopen-admin-adjust-actions",
    "krw-integer-formatting",
    "negative-decimal-money-normalization",
    "privacy-policy-guard",
    "raw-financial-payload-block",
    "ads-community-financial-join-block",
    "accessibility-label-model",
  ] as const,
  policyGuard: SALARY_STATUS_CARD_POLICY_GUARD,
  missing: [] as const,
});

export const getSalaryStatusCardCompletenessReport = () =>
  SALARY_STATUS_CARD_COMPLETENESS_REPORT;

export const assertSalaryStatusCardCompleteness = (): void => {
  if (!SALARY_STATUS_CARD_COMPLETENESS_REPORT.ok)
    throw new Error("SalaryStatusCard is incomplete.");
};

export default SalaryStatusCard;
