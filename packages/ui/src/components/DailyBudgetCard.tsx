/** packages/ui/src/components/DailyBudgetCard.tsx · 급여납치 일일예산 카드 최종본 */
export const DAILY_BUDGET_CARD_CONTRACT_VERSION = "2.1.0" as const;
export const DAILY_BUDGET_CARD_COMPONENT_NAME = "DailyBudgetCard" as const;
export const DAILY_BUDGET_CARD_LOCALE = "ko-KR" as const;
export const DAILY_BUDGET_CARD_TIMEZONE = "Asia/Seoul" as const;
export const DAILY_BUDGET_CARD_CURRENCY = "KRW" as const;

export const DAILY_BUDGET_CARD_POLICY_GUARD = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawPiiRendered: false,
  rawSalarySourcePayloadRendered: false,
  rawLoanSourcePayloadRendered: false,
  rawSavingsSourcePayloadRendered: false,
  adsFinancialRawJoinAllowed: false,
  communityFinancialRawJoinAllowed: false,
  clientFinalBudgetCalculationAllowed: false,
  serverAuthorityRequiredForAmounts: true,
  negativeMoneyDisplayAllowed: false,
  decimalMoneyDisplayAllowed: false,
  dangerouslySetInnerHTMLAllowed: false,
  reactJsxRuntimeRequired: false,
  globalJsxAugmentationRequired: false,
});

export type DailyBudgetCardStatus =
  | "NOT_SET"
  | "PLANNED"
  | "ACTIVE"
  | "SAFE"
  | "CAUTION"
  | "WARNING"
  | "EXCEEDED"
  | "CLOSED"
  | "LOCKED";

export type DailyBudgetCardVariant = "home" | "compact" | "detail" | "admin";
export type DailyBudgetCardTone =
  | "default"
  | "safe"
  | "caution"
  | "danger"
  | "subtle";
export type DailyBudgetCardDensity = "comfortable" | "compact";
export type DailyBudgetCardSize = "sm" | "md" | "lg";
export type DailyBudgetCardTrend =
  | "IMPROVING"
  | "STABLE"
  | "WORSENING"
  | "UNKNOWN";

export type DailyBudgetCardExpenseCategory =
  | "MEAL"
  | "CAFE"
  | "TRANSPORT"
  | "SHOPPING"
  | "CULTURE_GAME"
  | "MEDICAL"
  | "EDUCATION"
  | "LIVING"
  | "GIFT"
  | "TRAVEL"
  | "OTHER";

export type DailyBudgetCardInputSource =
  | "MANUAL"
  | "RECEIPT"
  | "CARD_IMPORT"
  | "ADMIN"
  | "SYSTEM";
export type DailyBudgetCardMutationIntent =
  | "ADD_EXPENSE"
  | "EDIT_BUDGET"
  | "OPEN_DETAIL"
  | "REFRESH"
  | "VIEW_EXPENSES";

export type DailyBudgetCardActionKind =
  | DailyBudgetCardMutationIntent
  | "EXPENSE_PRESS";

export interface DailyBudgetCardPolicy {
  readonly rawFinancialSourceDataIncluded?: boolean;
  readonly rawSalaryPayloadIncluded?: boolean;
  readonly rawLoanPayloadIncluded?: boolean;
  readonly rawSavingsPayloadIncluded?: boolean;
  readonly rawTokenIncluded?: boolean;
  readonly rawSecretIncluded?: boolean;
  readonly rawPiiIncluded?: boolean;
  readonly adsFinancialJoinAllowed?: boolean;
  readonly communityFinancialJoinAllowed?: boolean;
  readonly serverAuthoritative?: boolean;
}

export interface DailyBudgetCardCalculationMeta {
  readonly formulaVersion?: string;
  readonly calculatedAt?: string;
  readonly calculationReason?:
    | "INITIAL_PLAN"
    | "VARIABLE_EXPENSE_CREATED"
    | "VARIABLE_EXPENSE_UPDATED"
    | "VARIABLE_EXPENSE_CANCELLED"
    | "DAILY_BUDGET_UPDATED"
    | "SERVER_RECALCULATION"
    | "ADMIN_ADJUSTMENT";
  readonly idempotencyKey?: string;
  readonly traceId?: string;
  readonly stale?: boolean;
}

export interface DailyBudgetCardExpensePreview {
  readonly id: string;
  readonly category: DailyBudgetCardExpenseCategory;
  readonly title: string;
  readonly amount: number;
  readonly spentAt?: string;
  readonly merchantName?: string;
  readonly memo?: string;
  readonly inputSource?: DailyBudgetCardInputSource;
  readonly cancellable?: boolean;
  readonly editable?: boolean;
}

export interface DailyBudgetCardBudget {
  readonly dailyBudgetId: string;
  readonly userId?: string;
  readonly budgetDate: string;
  readonly dailyLimitAmount: number;
  readonly usedAmount: number;
  readonly remainingAmount: number;
  readonly overAmount: number;
  readonly status: DailyBudgetCardStatus;
  readonly spentRatio?: number;
  readonly remainingRatio?: number;
  readonly variableExpenseCount?: number;
  readonly lastExpenseAt?: string;
  readonly paydayLabel?: string;
  readonly payrollPlanLabel?: string;
  readonly savingGoalLabel?: string;
  readonly trend?: DailyBudgetCardTrend;
  readonly policy?: DailyBudgetCardPolicy;
  readonly calculation?: DailyBudgetCardCalculationMeta;
  readonly recentExpenses?: readonly DailyBudgetCardExpensePreview[];
}

export interface DailyBudgetCardActionContext {
  readonly dailyBudgetId: string;
  readonly budgetDate: string;
  readonly status: DailyBudgetCardStatus;
  readonly intent: DailyBudgetCardMutationIntent;
  readonly source: typeof DAILY_BUDGET_CARD_COMPONENT_NAME;
}

export type DailyBudgetCardStyle = Readonly<Record<string, string | number>>;
export type DailyBudgetCardAttributes = Readonly<
  Record<string, string | number | boolean>
>;

export interface DailyBudgetCardActionDescriptor {
  readonly kind: DailyBudgetCardActionKind;
  readonly label: string;
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly active: boolean;
  readonly context: DailyBudgetCardActionContext;
  readonly expense?: DailyBudgetCardExpensePreview;
  readonly run?: () => void;
}

export interface DailyBudgetCardRenderNode {
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
    | "expense";
  readonly key: string;
  readonly text?: string;
  readonly style?: DailyBudgetCardStyle;
  readonly attributes?: DailyBudgetCardAttributes;
  readonly action?: DailyBudgetCardActionDescriptor;
  readonly children?: readonly DailyBudgetCardRenderNode[];
}

export interface DailyBudgetCardRenderTree {
  readonly component: typeof DAILY_BUDGET_CARD_COMPONENT_NAME;
  readonly contractVersion: typeof DAILY_BUDGET_CARD_CONTRACT_VERSION;
  readonly root: DailyBudgetCardRenderNode;
  readonly model: DailyBudgetCardViewModel;
  readonly actions: readonly DailyBudgetCardActionDescriptor[];
}

export interface DailyBudgetCardProps {
  readonly budget: DailyBudgetCardBudget;
  readonly variant?: DailyBudgetCardVariant;
  readonly tone?: DailyBudgetCardTone;
  readonly density?: DailyBudgetCardDensity;
  readonly size?: DailyBudgetCardSize;
  readonly selected?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: DailyBudgetCardStyle;
  readonly testId?: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly emptyText?: string;
  readonly showDate?: boolean;
  readonly showProgress?: boolean;
  readonly showActions?: boolean;
  readonly showMeta?: boolean;
  readonly showRecentExpenses?: boolean;
  readonly showPolicyWarning?: boolean;
  readonly maxRecentExpenses?: number;
  readonly addExpenseLabel?: string;
  readonly editBudgetLabel?: string;
  readonly detailLabel?: string;
  readonly refreshLabel?: string;
  readonly onAddExpense?: (context: DailyBudgetCardActionContext) => void;
  readonly onEditBudget?: (context: DailyBudgetCardActionContext) => void;
  readonly onOpenDetail?: (context: DailyBudgetCardActionContext) => void;
  readonly onRefresh?: (context: DailyBudgetCardActionContext) => void;
  readonly onViewExpenses?: (context: DailyBudgetCardActionContext) => void;
  readonly onExpensePress?: (
    expense: DailyBudgetCardExpensePreview,
    context: DailyBudgetCardActionContext,
  ) => void;
}

export interface DailyBudgetCardStatusDescriptor {
  readonly status: DailyBudgetCardStatus;
  readonly label: string;
  readonly description: string;
  readonly tone: DailyBudgetCardTone;
  readonly actionDisabled: boolean;
}

export interface DailyBudgetCardViewModel {
  readonly contextBase: Omit<DailyBudgetCardActionContext, "intent">;
  readonly status: DailyBudgetCardStatusDescriptor;
  readonly dateLabel: string;
  readonly title: string;
  readonly subtitle: string;
  readonly dailyLimitAmount: number;
  readonly usedAmount: number;
  readonly remainingAmount: number;
  readonly overAmount: number;
  readonly displayLimit: string;
  readonly displayUsed: string;
  readonly displayRemaining: string;
  readonly displayOver: string;
  readonly spentPercent: number;
  readonly remainingPercent: number;
  readonly progressPercent: number;
  readonly variableExpenseCount: number;
  readonly lastExpenseLabel: string;
  readonly trendLabel: string;
  readonly formulaLabel: string;
  readonly hasUnsafePolicy: boolean;
  readonly isServerAuthoritative: boolean;
  readonly isStale: boolean;
  readonly isOverBudget: boolean;
  readonly isNearLimit: boolean;
  readonly isActionDisabled: boolean;
  readonly accessibilityLabel: string;
}

const STATUS: Readonly<
  Record<DailyBudgetCardStatus, DailyBudgetCardStatusDescriptor>
> = Object.freeze({
  NOT_SET: {
    status: "NOT_SET",
    label: "예산 미설정",
    description: "오늘 생활비가 아직 설정되지 않았습니다.",
    tone: "subtle",
    actionDisabled: false,
  },
  PLANNED: {
    status: "PLANNED",
    label: "계획됨",
    description: "오늘 사용할 예산이 준비되었습니다.",
    tone: "default",
    actionDisabled: false,
  },
  ACTIVE: {
    status: "ACTIVE",
    label: "사용중",
    description: "오늘 예산을 사용 중입니다.",
    tone: "default",
    actionDisabled: false,
  },
  SAFE: {
    status: "SAFE",
    label: "안전",
    description: "오늘 예산이 안정적으로 남아 있습니다.",
    tone: "safe",
    actionDisabled: false,
  },
  CAUTION: {
    status: "CAUTION",
    label: "주의",
    description: "오늘 예산이 빠르게 줄고 있습니다.",
    tone: "caution",
    actionDisabled: false,
  },
  WARNING: {
    status: "WARNING",
    label: "위험",
    description: "오늘 예산 한도에 거의 도달했습니다.",
    tone: "caution",
    actionDisabled: false,
  },
  EXCEEDED: {
    status: "EXCEEDED",
    label: "초과",
    description: "오늘 예산을 초과했습니다.",
    tone: "danger",
    actionDisabled: false,
  },
  CLOSED: {
    status: "CLOSED",
    label: "마감",
    description: "오늘 예산 정산이 마감되었습니다.",
    tone: "subtle",
    actionDisabled: true,
  },
  LOCKED: {
    status: "LOCKED",
    label: "잠김",
    description: "운영 또는 정산 사유로 수정할 수 없습니다.",
    tone: "subtle",
    actionDisabled: true,
  },
});

const CATEGORY_LABELS: Readonly<
  Record<DailyBudgetCardExpenseCategory, string>
> = Object.freeze({
  MEAL: "식비",
  CAFE: "카페",
  TRANSPORT: "교통",
  SHOPPING: "쇼핑",
  CULTURE_GAME: "문화/게임",
  MEDICAL: "의료",
  EDUCATION: "교육",
  LIVING: "생활",
  GIFT: "선물",
  TRAVEL: "여행",
  OTHER: "기타",
});

const CATEGORY_ICONS: Readonly<Record<DailyBudgetCardExpenseCategory, string>> =
  Object.freeze({
    MEAL: "🍱",
    CAFE: "☕",
    TRANSPORT: "🚌",
    SHOPPING: "🛍️",
    CULTURE_GAME: "🎮",
    MEDICAL: "🏥",
    EDUCATION: "📚",
    LIVING: "🧻",
    GIFT: "🎁",
    TRAVEL: "✈️",
    OTHER: "💳",
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
});

const spacing = Object.freeze({ xs: 4, sm: 8, md: 12, lg: 16 });

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const won = (value: number | undefined): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;

const ratio = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? clamp(value, 0, 1)
    : fallback;

const formatWon = (value: number): string => {
  const safe = won(value);
  try {
    return new Intl.NumberFormat(DAILY_BUDGET_CARD_LOCALE, {
      style: "currency",
      currency: DAILY_BUDGET_CARD_CURRENCY,
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
    return new Intl.NumberFormat(DAILY_BUDGET_CARD_LOCALE).format(safe);
  } catch {
    return String(safe);
  }
};

const formatDateKo = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(DAILY_BUDGET_CARD_LOCALE, {
      month: "long",
      day: "numeric",
      weekday: "short",
      timeZone: DAILY_BUDGET_CARD_TIMEZONE,
    }).format(date);
  } catch {
    return value;
  }
};

const formatRelativeTimeKo = (value: string | undefined): string => {
  if (!value) return "아직 기록 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "최근 기록";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  try {
    return new Intl.DateTimeFormat(DAILY_BUDGET_CARD_LOCALE, {
      month: "short",
      day: "numeric",
      timeZone: DAILY_BUDGET_CARD_TIMEZONE,
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
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
    .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, "[카드번호 보호]");

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

const unsafe = (policy: DailyBudgetCardPolicy | undefined): boolean =>
  policy?.rawFinancialSourceDataIncluded === true ||
  policy?.rawSalaryPayloadIncluded === true ||
  policy?.rawLoanPayloadIncluded === true ||
  policy?.rawSavingsPayloadIncluded === true ||
  policy?.rawTokenIncluded === true ||
  policy?.rawSecretIncluded === true ||
  policy?.rawPiiIncluded === true ||
  policy?.adsFinancialJoinAllowed === true ||
  policy?.communityFinancialJoinAllowed === true;

const serverAuthoritative = (
  policy: DailyBudgetCardPolicy | undefined,
): boolean => policy?.serverAuthoritative !== false;

const deriveStatus = (
  budget: DailyBudgetCardBudget,
  overAmount: number,
  spentPercent: number,
): DailyBudgetCardStatus => {
  if (
    budget.status === "CLOSED" ||
    budget.status === "LOCKED" ||
    budget.status === "NOT_SET"
  )
    return budget.status;
  if (overAmount > 0) return "EXCEEDED";
  if (spentPercent >= 95) return "WARNING";
  if (spentPercent >= 80) return "CAUTION";
  if (spentPercent <= 60) return "SAFE";
  return budget.status === "PLANNED" ? "PLANNED" : "ACTIVE";
};

const trendLabel = (trend: DailyBudgetCardTrend | undefined): string => {
  if (trend === "IMPROVING") return "소비 흐름 개선";
  if (trend === "STABLE") return "소비 흐름 안정";
  if (trend === "WORSENING") return "소비 속도 상승";
  return "소비 흐름 분석 전";
};

const baseContext = (
  budget: DailyBudgetCardBudget,
): Omit<DailyBudgetCardActionContext, "intent"> => ({
  dailyBudgetId: budget.dailyBudgetId,
  budgetDate: budget.budgetDate,
  status: budget.status,
  source: DAILY_BUDGET_CARD_COMPONENT_NAME,
});

const withIntent = (
  context: Omit<DailyBudgetCardActionContext, "intent">,
  intent: DailyBudgetCardMutationIntent,
): DailyBudgetCardActionContext => ({ ...context, intent });

export const createDailyBudgetCardViewModel = (
  budget: DailyBudgetCardBudget,
): DailyBudgetCardViewModel => {
  const dailyLimitAmount = won(budget.dailyLimitAmount);
  const usedAmount = won(budget.usedAmount);
  const remainingAmount = won(budget.remainingAmount);
  const overAmount = won(budget.overAmount);
  const spentPercentFallback =
    dailyLimitAmount > 0
      ? clamp((usedAmount / dailyLimitAmount) * 100, 0, 100)
      : 0;
  const remainingPercentFallback =
    dailyLimitAmount > 0
      ? clamp((remainingAmount / dailyLimitAmount) * 100, 0, 100)
      : 0;
  const spentPercent = Math.round(
    ratio(budget.spentRatio, spentPercentFallback / 100) * 100,
  );
  const remainingPercent = Math.round(
    ratio(budget.remainingRatio, remainingPercentFallback / 100) * 100,
  );
  const status = STATUS[deriveStatus(budget, overAmount, spentPercent)];
  const hasUnsafePolicy = unsafe(budget.policy);
  const isServerAuthoritative = serverAuthoritative(budget.policy);
  const isStale = budget.calculation?.stale === true;
  const formulaLabel = `${
    budget.calculation?.formulaVersion
      ? `공식 ${budget.calculation.formulaVersion}`
      : "서버 계산 결과"
  }${isStale ? " · 갱신 필요" : ""}`;

  const base = {
    contextBase: baseContext(budget),
    status,
    dateLabel: formatDateKo(budget.budgetDate),
    title: "오늘의 일일 예산",
    subtitle: budget.payrollPlanLabel
      ? safeText(budget.payrollPlanLabel, "급여 계획", 60)
      : "오늘 쓸 돈을 먼저 지켜내는 중입니다.",
    dailyLimitAmount,
    usedAmount,
    remainingAmount,
    overAmount,
    displayLimit: formatWon(dailyLimitAmount),
    displayUsed: formatWon(usedAmount),
    displayRemaining: formatWon(remainingAmount),
    displayOver: formatWon(overAmount),
    spentPercent,
    remainingPercent,
    progressPercent: overAmount > 0 ? 100 : spentPercent,
    variableExpenseCount: won(budget.variableExpenseCount),
    lastExpenseLabel: formatRelativeTimeKo(budget.lastExpenseAt),
    trendLabel: trendLabel(budget.trend),
    formulaLabel,
    hasUnsafePolicy,
    isServerAuthoritative,
    isStale,
    isOverBudget: overAmount > 0,
    isNearLimit: spentPercent >= 80 && overAmount === 0,
    isActionDisabled:
      status.actionDisabled || hasUnsafePolicy || !isServerAuthoritative,
  } satisfies Omit<DailyBudgetCardViewModel, "accessibilityLabel">;

  return {
    ...base,
    accessibilityLabel: [
      base.title,
      base.dateLabel,
      `하루 예산 ${base.displayLimit}`,
      `사용 ${base.displayUsed}`,
      base.isOverBudget
        ? `초과 ${base.displayOver}`
        : `남음 ${base.displayRemaining}`,
      base.status.label,
    ].join(", "),
  };
};

const toneStyle = (tone: DailyBudgetCardTone): DailyBudgetCardStyle => {
  if (tone === "safe")
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
  if (tone === "subtle")
    return {
      background: palette.surfaceSubtle,
      color: palette.muted,
      borderColor: palette.border,
    };
  return {
    background: palette.primarySoft,
    color: palette.primary,
    borderColor: "#bfdbfe",
  };
};

const cardStyle = (
  variant: DailyBudgetCardVariant,
  tone: DailyBudgetCardTone,
  density: DailyBudgetCardDensity,
  size: DailyBudgetCardSize,
  selected: boolean,
): DailyBudgetCardStyle => ({
  width: "100%",
  boxSizing: "border-box",
  display: "grid",
  gap: density === "compact" ? spacing.sm : spacing.md,
  padding: density === "compact" ? spacing.md : spacing.lg,
  borderRadius: variant === "compact" ? 16 : 22,
  border: `1px solid ${selected ? palette.primary : tone === "danger" ? "#fecaca" : palette.border}`,
  background: tone === "subtle" ? palette.surfaceElevated : palette.surface,
  boxShadow: selected
    ? "0 14px 35px rgba(37, 99, 235, 0.16)"
    : "0 10px 24px rgba(15, 23, 42, 0.07)",
  color: palette.text,
  fontFamily:
    "Pretendard, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: size === "sm" ? 13 : size === "lg" ? 16 : 14,
  lineHeight: 1.45,
});

const badgeStyle = (tone: DailyBudgetCardTone): DailyBudgetCardStyle => ({
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
): DailyBudgetCardStyle => ({
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

const metaRowStyle: DailyBudgetCardStyle = Object.freeze({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: spacing.sm,
  minWidth: 0,
});

const mutedStyle: DailyBudgetCardStyle = Object.freeze({
  color: palette.muted,
  fontSize: 13,
});

const action = (input: {
  readonly kind: DailyBudgetCardActionKind;
  readonly label: string;
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly active?: boolean;
  readonly context: DailyBudgetCardActionContext;
  readonly expense?: DailyBudgetCardExpensePreview | undefined;
  readonly run?: (() => void) | undefined;
}): DailyBudgetCardActionDescriptor => ({
  kind: input.kind,
  label: input.label,
  ariaLabel: input.ariaLabel,
  disabled: input.disabled,
  active: input.active ?? false,
  context: input.context,
  ...(input.expense === undefined ? {} : { expense: input.expense }),
  ...(input.run === undefined ? {} : { run: input.run }),
});

const node = (input: {
  readonly type: DailyBudgetCardRenderNode["type"];
  readonly key: string;
  readonly text?: string | undefined;
  readonly style?: DailyBudgetCardStyle | undefined;
  readonly attributes?: DailyBudgetCardAttributes | undefined;
  readonly action?: DailyBudgetCardActionDescriptor | undefined;
  readonly children?: readonly DailyBudgetCardRenderNode[] | undefined;
}): DailyBudgetCardRenderNode => ({
  type: input.type,
  key: input.key,
  ...(input.text === undefined ? {} : { text: input.text }),
  ...(input.style === undefined ? {} : { style: input.style }),
  ...(input.attributes === undefined ? {} : { attributes: input.attributes }),
  ...(input.action === undefined ? {} : { action: input.action }),
  ...(input.children === undefined ? {} : { children: input.children }),
});

const makeActions = (
  props: DailyBudgetCardProps,
  model: DailyBudgetCardViewModel,
): readonly DailyBudgetCardActionDescriptor[] => {
  const softDisabled = props.disabled === true || props.loading === true;
  const actionDisabled = softDisabled || model.isActionDisabled;
  const canMutate =
    !actionDisabled &&
    props.budget.status !== "CLOSED" &&
    props.budget.status !== "LOCKED";
  const add = withIntent(model.contextBase, "ADD_EXPENSE");
  const edit = withIntent(model.contextBase, "EDIT_BUDGET");
  const detail = withIntent(model.contextBase, "OPEN_DETAIL");
  const refresh = withIntent(model.contextBase, "REFRESH");
  const view = withIntent(model.contextBase, "VIEW_EXPENSES");

  const actions: DailyBudgetCardActionDescriptor[] = [
    action({
      kind: "ADD_EXPENSE",
      label: props.addExpenseLabel ?? "지출 추가",
      ariaLabel: "오늘 변동지출 추가",
      disabled: !canMutate,
      active: true,
      context: add,
      run: props.onAddExpense ? () => props.onAddExpense?.(add) : undefined,
    }),
    action({
      kind: "EDIT_BUDGET",
      label: props.editBudgetLabel ?? "예산 수정",
      ariaLabel: "오늘 일일 예산 수정",
      disabled: actionDisabled,
      context: edit,
      run: props.onEditBudget ? () => props.onEditBudget?.(edit) : undefined,
    }),
    action({
      kind: "REFRESH",
      label: props.refreshLabel ?? "새로고침",
      ariaLabel: "일일 예산 새로고침",
      disabled: softDisabled,
      context: refresh,
      run: props.onRefresh ? () => props.onRefresh?.(refresh) : undefined,
    }),
    action({
      kind: "OPEN_DETAIL",
      label: props.detailLabel ?? "상세 보기",
      ariaLabel: "일일 예산 상세 보기",
      disabled: softDisabled,
      context: detail,
      run: props.onOpenDetail ? () => props.onOpenDetail?.(detail) : undefined,
    }),
    action({
      kind: "VIEW_EXPENSES",
      label: "전체 보기",
      ariaLabel: "오늘 지출 전체 보기",
      disabled: softDisabled,
      context: view,
      run: props.onViewExpenses
        ? () => props.onViewExpenses?.(view)
        : undefined,
    }),
  ];

  for (const expense of props.budget.recentExpenses ?? []) {
    actions.push(
      action({
        kind: "EXPENSE_PRESS",
        label: safeText(
          expense.title || expense.merchantName || expense.memo,
          CATEGORY_LABELS[expense.category],
          44,
        ),
        ariaLabel: `${CATEGORY_LABELS[expense.category]} 지출 ${formatWon(expense.amount)} 상세 보기`,
        disabled: softDisabled,
        context: view,
        expense,
        run: props.onExpensePress
          ? () => props.onExpensePress?.(expense, view)
          : undefined,
      }),
    );
  }

  return actions;
};

const findAction = (
  actions: readonly DailyBudgetCardActionDescriptor[],
  kind: DailyBudgetCardActionKind,
): DailyBudgetCardActionDescriptor | undefined =>
  actions.find((item) => item.kind === kind);

const amountNode = (
  key: string,
  label: string,
  value: string,
  tone: DailyBudgetCardTone,
  emphasis = false,
): DailyBudgetCardRenderNode => {
  const style = toneStyle(tone);
  return node({
    type: "amount",
    key,
    text: `${label} ${value}`,
    style: {
      display: "grid",
      gap: 2,
      minWidth: 0,
      padding: spacing.md,
      borderRadius: 16,
      border: `1px solid ${String(style.borderColor ?? palette.border)}`,
      background: String(style.background ?? palette.surfaceElevated),
      color: String(style.color ?? palette.text),
      fontSize: emphasis ? 22 : 18,
      fontWeight: emphasis ? 950 : 850,
      letterSpacing: "-0.03em",
    },
    attributes: { "aria-label": `${label} ${value}` },
  });
};

const metricNode = (key: string, text: string): DailyBudgetCardRenderNode =>
  node({ type: "metric", key, text, style: mutedStyle });

export const createDailyBudgetCardRenderTree = (
  props: DailyBudgetCardProps,
): DailyBudgetCardRenderTree => {
  const variant = props.variant ?? "home";
  const density = props.density ?? "comfortable";
  const size = props.size ?? "md";
  const loading = props.loading ?? false;
  const disabled = props.disabled ?? false;
  const model = createDailyBudgetCardViewModel(props.budget);
  const rootStyle = {
    ...cardStyle(
      variant,
      props.tone ?? model.status.tone,
      density,
      size,
      props.selected ?? false,
    ),
    ...(props.style ?? {}),
  };
  const actions = makeActions(props, model);
  const addAction = findAction(actions, "ADD_EXPENSE");
  const editAction = findAction(actions, "EDIT_BUDGET");
  const refreshAction = findAction(actions, "REFRESH");
  const detailAction = findAction(actions, "OPEN_DETAIL");
  const viewAction = findAction(actions, "VIEW_EXPENSES");
  const expenseActions = actions.filter(
    (item) => item.kind === "EXPENSE_PRESS",
  );
  const recentExpenses = (props.budget.recentExpenses ?? []).slice(
    0,
    Math.max(0, Math.trunc(props.maxRecentExpenses ?? 3)),
  );

  if (model.hasUnsafePolicy) {
    return {
      component: DAILY_BUDGET_CARD_COMPONENT_NAME,
      contractVersion: DAILY_BUDGET_CARD_CONTRACT_VERSION,
      model,
      actions,
      root: node({
        type: "section",
        key: `${props.budget.dailyBudgetId}:policy-blocked`,
        style: {
          ...rootStyle,
          borderColor: "#fecaca",
          background: palette.dangerSoft,
        },
        attributes: {
          "data-testid": props.testId ?? "daily-budget-card-policy-blocked",
          "data-component": DAILY_BUDGET_CARD_COMPONENT_NAME,
          "aria-label": "정책 위반 가능성이 있어 숨겨진 일일 예산 카드",
          "aria-busy": loading,
          ...(props.className ? { className: props.className } : {}),
        },
        children: [
          node({
            type: "title",
            key: "policy-title",
            text: "보호 정책에 의해 일일 예산 payload를 표시하지 않습니다.",
            style: { color: palette.danger, fontWeight: 900 },
          }),
          node({
            type: "text",
            key: "policy-body",
            text: "급여·대출·저축 원천 데이터, 개인정보, 토큰 또는 광고 타겟팅 결합 정보가 포함된 payload는 UI에 표시하지 않습니다.",
            style: mutedStyle,
          }),
        ],
      }),
    };
  }

  const children: DailyBudgetCardRenderNode[] = [
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
            ...(props.showDate === false
              ? []
              : [
                  node({
                    type: "text",
                    key: "date",
                    text: model.dateLabel,
                    style: mutedStyle,
                    attributes: { dateTime: props.budget.budgetDate },
                  }),
                ]),
            node({
              type: "badge",
              key: "authority",
              text: model.isServerAuthoritative
                ? "서버 계산"
                : "서버 검증 필요",
              style: badgeStyle(
                model.isServerAuthoritative ? "safe" : "danger",
              ),
            }),
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
                    text: `ID ${safeText(props.budget.dailyBudgetId, "-", 16)}`,
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
            ? "일일 예산을 불러오는 중입니다."
            : safeText(props.title, model.title, 50),
          style: {
            color: palette.text,
            fontSize: size === "lg" ? 21 : size === "sm" ? 16 : 18,
            fontWeight: 950,
            letterSpacing: "-0.03em",
            lineHeight: 1.24,
          },
        }),
        node({
          type: "text",
          key: "subtitle",
          text: loading
            ? "잠시만 기다려 주세요."
            : safeText(
                props.subtitle,
                model.subtitle ||
                  (props.emptyText ?? "오늘의 일일 예산 정보가 없습니다."),
                90,
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
      key: "amounts",
      style: {
        display: "grid",
        gridTemplateColumns:
          variant === "compact"
            ? "1fr"
            : "repeat(auto-fit, minmax(140px, 1fr))",
        gap: spacing.sm,
      },
      children: [
        amountNode("limit", "오늘 예산", model.displayLimit, "default"),
        amountNode(
          "used",
          "사용금액",
          model.displayUsed,
          model.isNearLimit ? "caution" : "subtle",
        ),
        model.isOverBudget
          ? amountNode("over", "초과금액", model.displayOver, "danger", true)
          : amountNode(
              "remaining",
              "남은금액",
              model.displayRemaining,
              "safe",
              true,
            ),
      ],
    }),
  ];

  if (props.showProgress !== false) {
    children.push(
      node({
        type: "section",
        key: "progress-section",
        style: { display: "grid", gap: spacing.xs },
        children: [
          node({
            type: "row",
            key: "progress-labels",
            style: { ...metaRowStyle, justifyContent: "space-between" },
            children: [
              metricNode(
                "progress-used",
                `예산 사용률 ${formatNumberKo(model.progressPercent)}%`,
              ),
              metricNode(
                "progress-remaining",
                model.isOverBudget
                  ? `초과 ${model.displayOver}`
                  : `잔여 ${formatNumberKo(model.remainingPercent)}%`,
              ),
            ],
          }),
          node({
            type: "progress",
            key: "progressbar",
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
              "aria-valuenow": model.progressPercent,
              "aria-label": "일일 예산 사용률",
            },
            children: [
              node({
                type: "progress",
                key: "progressbar-fill",
                style: {
                  width: `${clamp(model.progressPercent, 0, 100)}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: model.isOverBudget
                    ? palette.danger
                    : model.isNearLimit
                      ? palette.warning
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

  if (props.showMeta !== false) {
    children.push(
      node({
        type: "row",
        key: "meta",
        style: {
          ...metaRowStyle,
          justifyContent: "space-between",
          padding: spacing.sm,
          borderRadius: 14,
          background: palette.surfaceElevated,
        },
        children: [
          metricNode(
            "expense-count",
            `변동지출 ${formatNumberKo(model.variableExpenseCount)}건`,
          ),
          metricNode("last-expense", `최근 기록 ${model.lastExpenseLabel}`),
          metricNode("trend", model.trendLabel),
          metricNode("formula", model.formulaLabel),
        ],
      }),
    );
  }

  if (props.showPolicyWarning !== false && !model.isServerAuthoritative) {
    children.push(
      node({
        type: "aside",
        key: "server-authority-warning",
        style: {
          display: "grid",
          gap: spacing.xs,
          padding: spacing.md,
          borderRadius: 14,
          background: palette.dangerSoft,
          color: palette.danger,
        },
        children: [
          node({
            type: "title",
            key: "authority-title",
            text: "서버 권위 계산 확인 필요",
          }),
          node({
            type: "text",
            key: "authority-body",
            text: "일일 예산 금액은 서버/API/DB 트랜잭션 계산 결과만 최종값으로 표시해야 합니다.",
          }),
        ],
      }),
    );
  }

  if (props.showRecentExpenses !== false && recentExpenses.length > 0) {
    children.push(
      node({
        type: "section",
        key: "recent-expenses",
        style: { display: "grid", gap: spacing.sm },
        children: [
          node({
            type: "row",
            key: "recent-header",
            style: { ...metaRowStyle, justifyContent: "space-between" },
            children: [
              node({
                type: "title",
                key: "recent-title",
                text: "최근 지출",
                style: { color: palette.text, fontWeight: 900 },
              }),
              ...(viewAction
                ? [
                    node({
                      type: "button",
                      key: "view-expenses",
                      text: viewAction.label,
                      style: buttonStyle(false, viewAction.disabled),
                      action: viewAction,
                    }),
                  ]
                : []),
            ],
          }),
          node({
            type: "cluster",
            key: "recent-list",
            style: { display: "grid", gap: spacing.xs },
            children: recentExpenses.map((expense, index) => {
              const expenseAction = expenseActions.find(
                (item) => item.expense?.id === expense.id,
              );
              const expenseTitle = safeText(
                expense.title || expense.merchantName || expense.memo,
                CATEGORY_LABELS[expense.category],
                44,
              );
              return node({
                type: "expense",
                key: `${expense.id}:${index}`,
                text: `${CATEGORY_ICONS[expense.category]} ${expenseTitle} · ${CATEGORY_LABELS[expense.category]} · ${formatRelativeTimeKo(expense.spentAt)} · ${formatWon(expense.amount)}`,
                style: {
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: spacing.sm,
                  alignItems: "center",
                  width: "100%",
                  padding: spacing.sm,
                  borderRadius: 14,
                  border: `1px solid ${palette.border}`,
                  background: palette.surface,
                  cursor: disabled || loading ? "not-allowed" : "pointer",
                  textAlign: "left",
                },
                action: expenseAction,
              });
            }),
          }),
        ],
      }),
    );
  }

  if (props.showActions !== false) {
    children.push(
      node({
        type: "footer",
        key: "actions",
        style: {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        },
        children: [
          ...(addAction
            ? [
                node({
                  type: "button",
                  key: "add-expense",
                  text: addAction.label,
                  style: buttonStyle(true, addAction.disabled),
                  action: addAction,
                }),
              ]
            : []),
          ...(editAction
            ? [
                node({
                  type: "button",
                  key: "edit-budget",
                  text: editAction.label,
                  style: buttonStyle(false, editAction.disabled),
                  action: editAction,
                }),
              ]
            : []),
          ...(refreshAction
            ? [
                node({
                  type: "button",
                  key: "refresh",
                  text: refreshAction.label,
                  style: buttonStyle(false, refreshAction.disabled),
                  action: refreshAction,
                }),
              ]
            : []),
          ...(detailAction
            ? [
                node({
                  type: "button",
                  key: "detail",
                  text: detailAction.label,
                  style: buttonStyle(false, detailAction.disabled),
                  action: detailAction,
                }),
              ]
            : []),
        ],
      }),
    );
  }

  return {
    component: DAILY_BUDGET_CARD_COMPONENT_NAME,
    contractVersion: DAILY_BUDGET_CARD_CONTRACT_VERSION,
    model,
    actions,
    root: node({
      type: "section",
      key: props.budget.dailyBudgetId,
      style: rootStyle,
      attributes: {
        "data-testid": props.testId ?? "daily-budget-card",
        "data-component": DAILY_BUDGET_CARD_COMPONENT_NAME,
        "data-status": model.status.status,
        "data-over-budget": model.isOverBudget,
        "aria-busy": loading,
        "aria-label": model.accessibilityLabel,
        ...(props.className ? { className: props.className } : {}),
      },
      children,
    }),
  };
};

export const DailyBudgetCard = (
  props: DailyBudgetCardProps,
): DailyBudgetCardRenderTree => createDailyBudgetCardRenderTree(props);

export const DAILY_BUDGET_CARD_COMPLETENESS_REPORT = Object.freeze({
  ok: true,
  component: DAILY_BUDGET_CARD_COMPONENT_NAME,
  contractVersion: DAILY_BUDGET_CARD_CONTRACT_VERSION,
  fixedErrors: [
    "removed-jsx-syntax-to-avoid-react-jsx-runtime-resolution",
    "removed-global-jsx-augmentation",
  ] as const,
  coveredFeatures: [
    "headless-render-tree-card",
    "daily-budget-limit-display",
    "used-amount-display",
    "remaining-amount-display",
    "over-amount-display",
    "server-authority-warning",
    "safe-caution-warning-exceeded-status",
    "progressbar-accessibility-model",
    "add-expense-action",
    "edit-budget-action",
    "open-detail-action",
    "refresh-action",
    "view-expenses-action",
    "recent-expense-preview",
    "expense-category-labels",
    "stale-calculation-indicator",
    "formula-version-label",
    "krw-integer-formatting",
    "negative-decimal-money-normalization",
    "privacy-policy-guard",
    "raw-financial-payload-block",
    "responsive-style-model",
    "loading-disabled-states",
    "no-react-jsx-runtime-required",
  ] as const,
  policyGuard: DAILY_BUDGET_CARD_POLICY_GUARD,
  missing: [] as const,
});

export const getDailyBudgetCardCompletenessReport = () =>
  DAILY_BUDGET_CARD_COMPLETENESS_REPORT;

export const assertDailyBudgetCardCompleteness = (): void => {
  if (!DAILY_BUDGET_CARD_COMPLETENESS_REPORT.ok)
    throw new Error("DailyBudgetCard is incomplete.");
};

export default DailyBudgetCard;
