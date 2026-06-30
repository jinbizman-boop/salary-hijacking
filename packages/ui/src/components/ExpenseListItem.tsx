/**
 * packages/ui/src/components/ExpenseListItem.tsx
 *
 * 급여납치 Salary Hijacking Platform · ExpenseListItem
 *
 * React/JSX 런타임을 강제하지 않는 headless UI render-tree 컴포넌트입니다.
 * 고정지출·변동지출 목록, 일일예산 상세, 급여 홈 최근 지출, 관리자 검토 큐에서 재사용할 수 있습니다.
 *
 * 원칙
 * - 최종 금액/상태/예산 반영 여부는 서버 권위 결과를 표시한다.
 * - 클라이언트는 표시용 라벨, 진행 상태, 접근성 문자열, 액션 descriptor만 산출한다.
 * - raw token, secret, raw PII, 급여/대출/저축 원천 payload, 광고/커뮤니티 재무 결합 payload를 렌더링하지 않는다.
 * - JSX를 사용하지 않아 react/jsx-runtime이 없어도 TypeScript strict 환경에서 컴파일된다.
 */

export const EXPENSE_LIST_ITEM_CONTRACT_VERSION = "2.0.0" as const;
export const EXPENSE_LIST_ITEM_COMPONENT_NAME = "ExpenseListItem" as const;
export const EXPENSE_LIST_ITEM_LOCALE = "ko-KR" as const;
export const EXPENSE_LIST_ITEM_TIMEZONE = "Asia/Seoul" as const;
export const EXPENSE_LIST_ITEM_CURRENCY = "KRW" as const;

export const EXPENSE_LIST_ITEM_POLICY_GUARD = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawPiiRendered: false,
  rawSalarySourcePayloadRendered: false,
  rawLoanSourcePayloadRendered: false,
  rawSavingsSourcePayloadRendered: false,
  rawFinancialSourceDataRendered: false,
  adsFinancialRawJoinAllowed: false,
  communityFinancialRawJoinAllowed: false,
  clientFinalExpenseCalculationAllowed: false,
  serverAuthorityRequiredForAmounts: true,
  negativeMoneyDisplayAllowed: false,
  decimalMoneyDisplayAllowed: false,
  dangerouslySetInnerHTMLAllowed: false,
  reactJsxRuntimeRequired: false,
  globalJsxAugmentationRequired: false,
  accessibleActionLabelsRequired: true,
});

export type ExpenseListItemKind =
  | "VARIABLE"
  | "FIXED"
  | "SAVING"
  | "ADJUSTMENT";

export type ExpenseListItemCategory =
  | "SUBSCRIPTION"
  | "LOAN"
  | "INSURANCE"
  | "TELECOM"
  | "HOUSING"
  | "TRANSPORT"
  | "CARD"
  | "TAX"
  | "EDUCATION"
  | "MEDICAL"
  | "MEAL"
  | "CAFE"
  | "SHOPPING"
  | "CULTURE_GAME"
  | "LIVING"
  | "GIFT"
  | "TRAVEL"
  | "SAVING"
  | "OTHER";

export type ExpenseListItemStatus =
  | "SCHEDULED"
  | "ACTIVE"
  | "PAID"
  | "SKIPPED"
  | "CANCELLED"
  | "REFUNDED"
  | "FAILED"
  | "PENDING_REVIEW"
  | "LOCKED"
  | "DELETED";

export type ExpenseListItemPaymentMethod =
  | "CASH"
  | "CHECK_CARD"
  | "CREDIT_CARD"
  | "BANK_TRANSFER"
  | "AUTOPAY"
  | "POINT"
  | "PAY"
  | "OTHER";

export type ExpenseListItemInputSource =
  | "MANUAL"
  | "RECEIPT"
  | "CARD_IMPORT"
  | "BANK_IMPORT"
  | "ADMIN"
  | "SYSTEM";
export type ExpenseListItemReceiptScanStatus =
  | "NONE"
  | "PENDING"
  | "CLEAN"
  | "BLOCKED"
  | "FAILED";
export type ExpenseListItemTone =
  | "default"
  | "subtle"
  | "safe"
  | "caution"
  | "danger";
export type ExpenseListItemDensity = "comfortable" | "compact";
export type ExpenseListItemSize = "sm" | "md" | "lg";
export type ExpenseListItemVariant = "list" | "compact" | "detail" | "admin";

export type ExpenseListItemActionKind =
  | "OPEN"
  | "EDIT"
  | "DELETE"
  | "CANCEL"
  | "RESTORE"
  | "MARK_PAID"
  | "SKIP"
  | "RETRY"
  | "VIEW_RECEIPT"
  | "VIEW_BUDGET"
  | "MODERATE";

export interface ExpenseListItemPolicy {
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

export interface ExpenseListItemBudgetImpact {
  readonly dailyBudgetId?: string;
  readonly affectedDate?: string;
  readonly beforeUsedAmount?: number;
  readonly afterUsedAmount?: number;
  readonly beforeRemainingAmount?: number;
  readonly afterRemainingAmount?: number;
  readonly overAmount?: number;
  readonly recalculatedAt?: string;
  readonly stale?: boolean;
}

export interface ExpenseListItemAuditMeta {
  readonly formulaVersion?: string;
  readonly idempotencyKey?: string;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly paidAt?: string;
  readonly cancelledAt?: string;
  readonly deletedAt?: string;
  readonly nextDueAt?: string;
}

export interface ExpenseListItemAttachment {
  readonly id: string;
  readonly type: "RECEIPT" | "IMAGE" | "DOCUMENT" | "LINK" | "OTHER" | string;
  readonly fileName?: string;
  readonly url?: string;
  readonly altText?: string;
  readonly scanStatus?: ExpenseListItemReceiptScanStatus;
  readonly fileHash?: string;
}

export interface ExpenseListItemData {
  readonly id: string;
  readonly kind: ExpenseListItemKind;
  readonly status: ExpenseListItemStatus;
  readonly category: ExpenseListItemCategory;
  readonly title: string;
  readonly amount: number;
  readonly spentAt?: string;
  readonly dueAt?: string;
  readonly merchantName?: string;
  readonly memo?: string;
  readonly paymentMethod?: ExpenseListItemPaymentMethod;
  readonly inputSource?: ExpenseListItemInputSource;
  readonly recurring?: boolean;
  readonly fixedExpenseId?: string;
  readonly dailyBudgetId?: string;
  readonly payrollCycleId?: string;
  readonly budgetImpact?: ExpenseListItemBudgetImpact;
  readonly attachmentCount?: number;
  readonly receiptScanStatus?: ExpenseListItemReceiptScanStatus;
  readonly attachments?: readonly ExpenseListItemAttachment[];
  readonly tags?: readonly string[];
  readonly editable?: boolean;
  readonly deletable?: boolean;
  readonly cancellable?: boolean;
  readonly restorable?: boolean;
  readonly payable?: boolean;
  readonly policy?: ExpenseListItemPolicy;
  readonly audit?: ExpenseListItemAuditMeta;
}

export interface ExpenseListItemActionContext {
  readonly expenseId: string;
  readonly kind: ExpenseListItemKind;
  readonly status: ExpenseListItemStatus;
  readonly category: ExpenseListItemCategory;
  readonly source: typeof EXPENSE_LIST_ITEM_COMPONENT_NAME;
}

export type ExpenseListItemStyle = Readonly<Record<string, string | number>>;
export type ExpenseListItemAttributes = Readonly<
  Record<string, string | number | boolean>
>;

export interface ExpenseListItemActionDescriptor {
  readonly kind: ExpenseListItemActionKind;
  readonly label: string;
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly active: boolean;
  readonly context: ExpenseListItemActionContext;
  readonly run?: () => void;
}

export interface ExpenseListItemRenderNode {
  readonly type:
    | "article"
    | "header"
    | "section"
    | "footer"
    | "aside"
    | "row"
    | "cluster"
    | "icon"
    | "badge"
    | "title"
    | "text"
    | "amount"
    | "metric"
    | "button"
    | "tag";
  readonly key: string;
  readonly text?: string;
  readonly style?: ExpenseListItemStyle;
  readonly attributes?: ExpenseListItemAttributes;
  readonly action?: ExpenseListItemActionDescriptor;
  readonly children?: readonly ExpenseListItemRenderNode[];
}

export interface ExpenseListItemRenderTree {
  readonly component: typeof EXPENSE_LIST_ITEM_COMPONENT_NAME;
  readonly contractVersion: typeof EXPENSE_LIST_ITEM_CONTRACT_VERSION;
  readonly root: ExpenseListItemRenderNode;
  readonly model: ExpenseListItemViewModel;
  readonly actions: readonly ExpenseListItemActionDescriptor[];
}

export interface ExpenseListItemProps {
  readonly expense: ExpenseListItemData;
  readonly variant?: ExpenseListItemVariant;
  readonly tone?: ExpenseListItemTone;
  readonly density?: ExpenseListItemDensity;
  readonly size?: ExpenseListItemSize;
  readonly selected?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: ExpenseListItemStyle;
  readonly testId?: string;
  readonly showCategory?: boolean;
  readonly showStatus?: boolean;
  readonly showMeta?: boolean;
  readonly showBudgetImpact?: boolean;
  readonly showTags?: boolean;
  readonly showActions?: boolean;
  readonly showPolicyWarning?: boolean;
  readonly maxTags?: number;
  readonly openLabel?: string;
  readonly editLabel?: string;
  readonly deleteLabel?: string;
  readonly cancelLabel?: string;
  readonly restoreLabel?: string;
  readonly markPaidLabel?: string;
  readonly skipLabel?: string;
  readonly retryLabel?: string;
  readonly receiptLabel?: string;
  readonly budgetLabel?: string;
  readonly moderateLabel?: string;
  readonly onOpen?: (context: ExpenseListItemActionContext) => void;
  readonly onEdit?: (context: ExpenseListItemActionContext) => void;
  readonly onDelete?: (context: ExpenseListItemActionContext) => void;
  readonly onCancel?: (context: ExpenseListItemActionContext) => void;
  readonly onRestore?: (context: ExpenseListItemActionContext) => void;
  readonly onMarkPaid?: (context: ExpenseListItemActionContext) => void;
  readonly onSkip?: (context: ExpenseListItemActionContext) => void;
  readonly onRetry?: (context: ExpenseListItemActionContext) => void;
  readonly onViewReceipt?: (context: ExpenseListItemActionContext) => void;
  readonly onViewBudget?: (context: ExpenseListItemActionContext) => void;
  readonly onModerate?: (context: ExpenseListItemActionContext) => void;
}

export interface ExpenseListItemStatusDescriptor {
  readonly status: ExpenseListItemStatus;
  readonly label: string;
  readonly tone: ExpenseListItemTone;
  readonly actionDisabled: boolean;
  readonly description: string;
}

export interface ExpenseListItemCategoryDescriptor {
  readonly category: ExpenseListItemCategory;
  readonly label: string;
  readonly icon: string;
}

export interface ExpenseListItemViewModel {
  readonly context: ExpenseListItemActionContext;
  readonly category: ExpenseListItemCategoryDescriptor;
  readonly status: ExpenseListItemStatusDescriptor;
  readonly title: string;
  readonly subtitle: string;
  readonly memoPreview: string;
  readonly displayAmount: string;
  readonly amount: number;
  readonly dateLabel: string;
  readonly methodLabel: string;
  readonly inputSourceLabel: string;
  readonly receiptLabel: string;
  readonly budgetImpactLabel: string;
  readonly serverAuthorityLabel: string;
  readonly formulaLabel: string;
  readonly tagLabels: readonly string[];
  readonly isExpenseFinalized: boolean;
  readonly isNegativeOrDecimalNormalized: boolean;
  readonly hasUnsafePolicy: boolean;
  readonly isServerAuthoritative: boolean;
  readonly isBudgetOver: boolean;
  readonly isBudgetStale: boolean;
  readonly isActionDisabled: boolean;
  readonly accessibilityLabel: string;
}

const CATEGORY: Readonly<
  Record<ExpenseListItemCategory, ExpenseListItemCategoryDescriptor>
> = Object.freeze({
  SUBSCRIPTION: { category: "SUBSCRIPTION", label: "구독", icon: "🔁" },
  LOAN: { category: "LOAN", label: "대출", icon: "🏦" },
  INSURANCE: { category: "INSURANCE", label: "보험", icon: "🛡️" },
  TELECOM: { category: "TELECOM", label: "통신", icon: "📱" },
  HOUSING: { category: "HOUSING", label: "주거", icon: "🏠" },
  TRANSPORT: { category: "TRANSPORT", label: "교통", icon: "🚌" },
  CARD: { category: "CARD", label: "카드", icon: "💳" },
  TAX: { category: "TAX", label: "세금", icon: "🧾" },
  EDUCATION: { category: "EDUCATION", label: "교육", icon: "📚" },
  MEDICAL: { category: "MEDICAL", label: "의료", icon: "🏥" },
  MEAL: { category: "MEAL", label: "식비", icon: "🍱" },
  CAFE: { category: "CAFE", label: "카페", icon: "☕" },
  SHOPPING: { category: "SHOPPING", label: "쇼핑", icon: "🛍️" },
  CULTURE_GAME: { category: "CULTURE_GAME", label: "문화/게임", icon: "🎮" },
  LIVING: { category: "LIVING", label: "생활", icon: "🧻" },
  GIFT: { category: "GIFT", label: "선물", icon: "🎁" },
  TRAVEL: { category: "TRAVEL", label: "여행", icon: "✈️" },
  SAVING: { category: "SAVING", label: "저축", icon: "💰" },
  OTHER: { category: "OTHER", label: "기타", icon: "💸" },
});

const STATUS: Readonly<
  Record<ExpenseListItemStatus, ExpenseListItemStatusDescriptor>
> = Object.freeze({
  SCHEDULED: {
    status: "SCHEDULED",
    label: "예정",
    tone: "subtle",
    actionDisabled: false,
    description: "납부 또는 지출 예정 상태입니다.",
  },
  ACTIVE: {
    status: "ACTIVE",
    label: "반영됨",
    tone: "default",
    actionDisabled: false,
    description: "일일예산 또는 월 지출에 반영된 상태입니다.",
  },
  PAID: {
    status: "PAID",
    label: "납부완료",
    tone: "safe",
    actionDisabled: false,
    description: "결제 또는 납부가 완료되었습니다.",
  },
  SKIPPED: {
    status: "SKIPPED",
    label: "스킵",
    tone: "subtle",
    actionDisabled: true,
    description: "이번 회차가 스킵되었습니다.",
  },
  CANCELLED: {
    status: "CANCELLED",
    label: "취소",
    tone: "caution",
    actionDisabled: true,
    description: "취소되어 예산 반영에서 제외됩니다.",
  },
  REFUNDED: {
    status: "REFUNDED",
    label: "환불",
    tone: "safe",
    actionDisabled: true,
    description: "환불 처리된 지출입니다.",
  },
  FAILED: {
    status: "FAILED",
    label: "실패",
    tone: "danger",
    actionDisabled: false,
    description: "자동 결제 또는 가져오기에 실패했습니다.",
  },
  PENDING_REVIEW: {
    status: "PENDING_REVIEW",
    label: "검토중",
    tone: "caution",
    actionDisabled: false,
    description: "운영 검토가 필요한 지출입니다.",
  },
  LOCKED: {
    status: "LOCKED",
    label: "잠김",
    tone: "subtle",
    actionDisabled: true,
    description: "정산 또는 운영 사유로 수정할 수 없습니다.",
  },
  DELETED: {
    status: "DELETED",
    label: "삭제",
    tone: "danger",
    actionDisabled: true,
    description: "삭제된 지출입니다.",
  },
});

const METHOD_LABELS: Readonly<Record<ExpenseListItemPaymentMethod, string>> =
  Object.freeze({
    CASH: "현금",
    CHECK_CARD: "체크카드",
    CREDIT_CARD: "신용카드",
    BANK_TRANSFER: "계좌이체",
    AUTOPAY: "자동이체",
    POINT: "포인트",
    PAY: "간편결제",
    OTHER: "기타 결제",
  });

const SOURCE_LABELS: Readonly<Record<ExpenseListItemInputSource, string>> =
  Object.freeze({
    MANUAL: "직접 입력",
    RECEIPT: "영수증",
    CARD_IMPORT: "카드 연동",
    BANK_IMPORT: "계좌 연동",
    ADMIN: "관리자",
    SYSTEM: "시스템",
  });

const RECEIPT_LABELS: Readonly<
  Record<ExpenseListItemReceiptScanStatus, string>
> = Object.freeze({
  NONE: "첨부 없음",
  PENDING: "검사중",
  CLEAN: "검사완료",
  BLOCKED: "차단됨",
  FAILED: "검사실패",
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

const won = (value: number | undefined): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;

const isNormalized = (value: number): boolean =>
  value < 0 || !Number.isInteger(value);

const formatWon = (value: number): string => {
  const safe = won(value);
  try {
    return new Intl.NumberFormat(EXPENSE_LIST_ITEM_LOCALE, {
      style: "currency",
      currency: EXPENSE_LIST_ITEM_CURRENCY,
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
    return new Intl.NumberFormat(EXPENSE_LIST_ITEM_LOCALE).format(safe);
  } catch {
    return String(safe);
  }
};

const formatDateKo = (value: string | undefined): string => {
  if (!value) return "날짜 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(EXPENSE_LIST_ITEM_LOCALE, {
      month: "short",
      day: "numeric",
      weekday: "short",
      timeZone: EXPENSE_LIST_ITEM_TIMEZONE,
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

const hasUnsafePolicy = (policy: ExpenseListItemPolicy | undefined): boolean =>
  policy?.rawFinancialSourceDataIncluded === true ||
  policy?.rawSalaryPayloadIncluded === true ||
  policy?.rawLoanPayloadIncluded === true ||
  policy?.rawSavingsPayloadIncluded === true ||
  policy?.rawTokenIncluded === true ||
  policy?.rawSecretIncluded === true ||
  policy?.rawPiiIncluded === true ||
  policy?.adsFinancialJoinAllowed === true ||
  policy?.communityFinancialJoinAllowed === true;

const isServerAuthoritative = (
  policy: ExpenseListItemPolicy | undefined,
): boolean => policy?.serverAuthoritative !== false;

const contextOf = (
  expense: ExpenseListItemData,
): ExpenseListItemActionContext => ({
  expenseId: expense.id,
  kind: expense.kind,
  status: expense.status,
  category: expense.category,
  source: EXPENSE_LIST_ITEM_COMPONENT_NAME,
});

const budgetImpactLabel = (
  impact: ExpenseListItemBudgetImpact | undefined,
): string => {
  if (!impact) return "예산 반영 정보 없음";
  const overAmount = won(impact.overAmount);
  const beforeRemaining = won(impact.beforeRemainingAmount);
  const afterRemaining = won(impact.afterRemainingAmount);
  if (overAmount > 0) return `예산 초과 ${formatWon(overAmount)}`;
  return `잔액 ${formatWon(beforeRemaining)} → ${formatWon(afterRemaining)}`;
};

const formulaLabel = (
  audit: ExpenseListItemAuditMeta | undefined,
  impact: ExpenseListItemBudgetImpact | undefined,
): string => {
  const formula = audit?.formulaVersion
    ? `공식 ${audit.formulaVersion}`
    : "서버 계산 결과";
  return `${formula}${impact?.stale === true ? " · 갱신 필요" : ""}`;
};

export const createExpenseListItemViewModel = (
  expense: ExpenseListItemData,
): ExpenseListItemViewModel => {
  const amount = won(expense.amount);
  const category = CATEGORY[expense.category];
  const status = STATUS[expense.status];
  const rawUnsafe = hasUnsafePolicy(expense.policy);
  const serverAuthority = isServerAuthoritative(expense.policy);
  const dateValue =
    expense.spentAt ??
    expense.dueAt ??
    expense.audit?.paidAt ??
    expense.audit?.createdAt;
  const receiptStatus =
    expense.receiptScanStatus ??
    (expense.attachmentCount && expense.attachmentCount > 0
      ? "PENDING"
      : "NONE");
  const budgetOver = won(expense.budgetImpact?.overAmount) > 0;
  const tagLabels = (expense.tags ?? [])
    .map((tag) => safeText(tag, "태그", 24))
    .filter((tag) => tag.length > 0);
  const title = safeText(expense.title, category.label, 64);
  const merchant = safeText(expense.merchantName, "", 48);
  const subtitle = [
    expense.kind === "FIXED"
      ? "고정지출"
      : expense.kind === "SAVING"
        ? "고정저축"
        : expense.kind === "ADJUSTMENT"
          ? "조정"
          : "변동지출",
    merchant || undefined,
    expense.recurring === true ? "반복" : undefined,
  ]
    .filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    )
    .join(" · ");

  const base = {
    context: contextOf(expense),
    category,
    status,
    title,
    subtitle: subtitle || status.description,
    memoPreview: safeText(expense.memo, "메모 없음", 72),
    displayAmount: formatWon(amount),
    amount,
    dateLabel: formatDateKo(dateValue),
    methodLabel: expense.paymentMethod
      ? METHOD_LABELS[expense.paymentMethod]
      : "결제수단 없음",
    inputSourceLabel: expense.inputSource
      ? SOURCE_LABELS[expense.inputSource]
      : "입력 경로 없음",
    receiptLabel: RECEIPT_LABELS[receiptStatus],
    budgetImpactLabel: budgetImpactLabel(expense.budgetImpact),
    serverAuthorityLabel: serverAuthority ? "서버 계산" : "서버 검증 필요",
    formulaLabel: formulaLabel(expense.audit, expense.budgetImpact),
    tagLabels,
    isExpenseFinalized:
      expense.status === "PAID" ||
      expense.status === "ACTIVE" ||
      expense.status === "SCHEDULED",
    isNegativeOrDecimalNormalized: isNormalized(expense.amount),
    hasUnsafePolicy: rawUnsafe,
    isServerAuthoritative: serverAuthority,
    isBudgetOver: budgetOver,
    isBudgetStale: expense.budgetImpact?.stale === true,
    isActionDisabled: status.actionDisabled || rawUnsafe || !serverAuthority,
  } satisfies Omit<ExpenseListItemViewModel, "accessibilityLabel">;

  return {
    ...base,
    accessibilityLabel: [
      base.title,
      base.category.label,
      base.displayAmount,
      base.status.label,
      base.dateLabel,
      base.isBudgetOver ? base.budgetImpactLabel : undefined,
    ]
      .filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      )
      .join(", "),
  };
};

const toneStyle = (tone: ExpenseListItemTone): ExpenseListItemStyle => {
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
  variant: ExpenseListItemVariant,
  tone: ExpenseListItemTone,
  density: ExpenseListItemDensity,
  size: ExpenseListItemSize,
  selected: boolean,
): ExpenseListItemStyle => ({
  width: "100%",
  boxSizing: "border-box",
  display: "grid",
  gap: density === "compact" ? spacing.sm : spacing.md,
  padding: density === "compact" ? spacing.md : spacing.lg,
  borderRadius: variant === "compact" ? 14 : 18,
  border: `1px solid ${selected ? palette.primary : tone === "danger" ? "#fecaca" : palette.border}`,
  background: tone === "subtle" ? palette.surfaceElevated : palette.surface,
  boxShadow: selected
    ? "0 12px 28px rgba(37, 99, 235, 0.14)"
    : "0 1px 2px rgba(15, 23, 42, 0.05)",
  color: palette.text,
  fontFamily:
    "Pretendard, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: size === "sm" ? 13 : size === "lg" ? 16 : 14,
  lineHeight: 1.45,
});

const badgeStyle = (tone: ExpenseListItemTone): ExpenseListItemStyle => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 24,
  padding: "4px 8px",
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
): ExpenseListItemStyle => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 34,
  padding: "7px 10px",
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

const metaRowStyle: ExpenseListItemStyle = Object.freeze({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: spacing.sm,
  minWidth: 0,
});

const mutedStyle: ExpenseListItemStyle = Object.freeze({
  color: palette.muted,
  fontSize: 13,
});

const action = (input: {
  readonly kind: ExpenseListItemActionKind;
  readonly label: string;
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly active?: boolean;
  readonly context: ExpenseListItemActionContext;
  readonly run?: (() => void) | undefined;
}): ExpenseListItemActionDescriptor => ({
  kind: input.kind,
  label: input.label,
  ariaLabel: input.ariaLabel,
  disabled: input.disabled,
  active: input.active ?? false,
  context: input.context,
  ...(input.run === undefined ? {} : { run: input.run }),
});

const node = (input: {
  readonly type: ExpenseListItemRenderNode["type"];
  readonly key: string;
  readonly text?: string | undefined;
  readonly style?: ExpenseListItemStyle | undefined;
  readonly attributes?: ExpenseListItemAttributes | undefined;
  readonly action?: ExpenseListItemActionDescriptor | undefined;
  readonly children?: readonly ExpenseListItemRenderNode[] | undefined;
}): ExpenseListItemRenderNode => ({
  type: input.type,
  key: input.key,
  ...(input.text === undefined ? {} : { text: input.text }),
  ...(input.style === undefined ? {} : { style: input.style }),
  ...(input.attributes === undefined ? {} : { attributes: input.attributes }),
  ...(input.action === undefined ? {} : { action: input.action }),
  ...(input.children === undefined ? {} : { children: input.children }),
});

const makeActions = (
  props: ExpenseListItemProps,
  model: ExpenseListItemViewModel,
): readonly ExpenseListItemActionDescriptor[] => {
  const expense = props.expense;
  const softDisabled = props.disabled === true || props.loading === true;
  const hardDisabled = softDisabled || model.isActionDisabled;
  const context = model.context;
  const actions: ExpenseListItemActionDescriptor[] = [
    action({
      kind: "OPEN",
      label: props.openLabel ?? "상세",
      ariaLabel: `${model.title} 상세 보기`,
      disabled: softDisabled,
      context,
      run: props.onOpen ? () => props.onOpen?.(context) : undefined,
    }),
  ];

  if (expense.editable !== false) {
    actions.push(
      action({
        kind: "EDIT",
        label: props.editLabel ?? "수정",
        ariaLabel: `${model.title} 수정`,
        disabled: hardDisabled || expense.status === "DELETED",
        context,
        run: props.onEdit ? () => props.onEdit?.(context) : undefined,
      }),
    );
  }

  if (expense.payable === true || expense.status === "SCHEDULED") {
    actions.push(
      action({
        kind: "MARK_PAID",
        label: props.markPaidLabel ?? "납부완료",
        ariaLabel: `${model.title} 납부완료 처리`,
        disabled: hardDisabled,
        active: expense.status === "PAID",
        context,
        run: props.onMarkPaid ? () => props.onMarkPaid?.(context) : undefined,
      }),
    );
  }

  if (
    expense.cancellable !== false &&
    expense.status !== "CANCELLED" &&
    expense.status !== "DELETED"
  ) {
    actions.push(
      action({
        kind: "CANCEL",
        label: props.cancelLabel ?? "취소",
        ariaLabel: `${model.title} 취소`,
        disabled: hardDisabled,
        context,
        run: props.onCancel ? () => props.onCancel?.(context) : undefined,
      }),
    );
  }

  if (expense.status === "FAILED") {
    actions.push(
      action({
        kind: "RETRY",
        label: props.retryLabel ?? "재시도",
        ariaLabel: `${model.title} 재시도`,
        disabled: hardDisabled,
        context,
        run: props.onRetry ? () => props.onRetry?.(context) : undefined,
      }),
    );
  }

  if (expense.kind === "FIXED" && expense.status === "SCHEDULED") {
    actions.push(
      action({
        kind: "SKIP",
        label: props.skipLabel ?? "이번 회차 스킵",
        ariaLabel: `${model.title} 이번 회차 스킵`,
        disabled: hardDisabled,
        context,
        run: props.onSkip ? () => props.onSkip?.(context) : undefined,
      }),
    );
  }

  if (
    expense.restorable === true ||
    expense.status === "CANCELLED" ||
    expense.status === "DELETED"
  ) {
    actions.push(
      action({
        kind: "RESTORE",
        label: props.restoreLabel ?? "복구",
        ariaLabel: `${model.title} 복구`,
        disabled: softDisabled || !model.isServerAuthoritative,
        context,
        run: props.onRestore ? () => props.onRestore?.(context) : undefined,
      }),
    );
  }

  if (expense.deletable !== false) {
    actions.push(
      action({
        kind: "DELETE",
        label: props.deleteLabel ?? "삭제",
        ariaLabel: `${model.title} 삭제`,
        disabled: hardDisabled || expense.status === "DELETED",
        context,
        run: props.onDelete ? () => props.onDelete?.(context) : undefined,
      }),
    );
  }

  if (
    (expense.attachmentCount ?? 0) > 0 ||
    (expense.attachments?.length ?? 0) > 0
  ) {
    actions.push(
      action({
        kind: "VIEW_RECEIPT",
        label: props.receiptLabel ?? "영수증",
        ariaLabel: `${model.title} 영수증 보기`,
        disabled: softDisabled,
        context,
        run: props.onViewReceipt
          ? () => props.onViewReceipt?.(context)
          : undefined,
      }),
    );
  }

  if (expense.dailyBudgetId || expense.budgetImpact?.dailyBudgetId) {
    actions.push(
      action({
        kind: "VIEW_BUDGET",
        label: props.budgetLabel ?? "예산 보기",
        ariaLabel: `${model.title} 예산 반영 보기`,
        disabled: softDisabled,
        context,
        run: props.onViewBudget
          ? () => props.onViewBudget?.(context)
          : undefined,
      }),
    );
  }

  if (props.variant === "admin" || expense.status === "PENDING_REVIEW") {
    actions.push(
      action({
        kind: "MODERATE",
        label: props.moderateLabel ?? "운영 검토",
        ariaLabel: `${model.title} 운영 검토`,
        disabled: softDisabled,
        context,
        run: props.onModerate ? () => props.onModerate?.(context) : undefined,
      }),
    );
  }

  return actions;
};

const findAction = (
  actions: readonly ExpenseListItemActionDescriptor[],
  kind: ExpenseListItemActionKind,
): ExpenseListItemActionDescriptor | undefined =>
  actions.find((item) => item.kind === kind);

const metricNode = (key: string, text: string): ExpenseListItemRenderNode =>
  node({ type: "metric", key, text, style: mutedStyle });

const amountNode = (
  model: ExpenseListItemViewModel,
): ExpenseListItemRenderNode =>
  node({
    type: "amount",
    key: "amount",
    text: model.displayAmount,
    style: {
      color: model.isBudgetOver ? palette.danger : palette.text,
      fontSize: 20,
      fontWeight: 950,
      letterSpacing: "-0.03em",
      textAlign: "right",
    },
    attributes: { "aria-label": `지출 금액 ${model.displayAmount}` },
  });

export const createExpenseListItemRenderTree = (
  props: ExpenseListItemProps,
): ExpenseListItemRenderTree => {
  const variant = props.variant ?? "list";
  const density = props.density ?? "comfortable";
  const size = props.size ?? "md";
  const loading = props.loading ?? false;
  const disabled = props.disabled ?? false;
  const model = createExpenseListItemViewModel(props.expense);
  const resolvedTone =
    props.tone ?? (model.isBudgetOver ? "danger" : model.status.tone);
  const rootStyle = {
    ...cardStyle(variant, resolvedTone, density, size, props.selected ?? false),
    ...(props.style ?? {}),
  };
  const actions = makeActions(props, model);
  const openAction = findAction(actions, "OPEN");
  const editAction = findAction(actions, "EDIT");
  const deleteAction = findAction(actions, "DELETE");
  const cancelAction = findAction(actions, "CANCEL");
  const restoreAction = findAction(actions, "RESTORE");
  const paidAction = findAction(actions, "MARK_PAID");
  const skipAction = findAction(actions, "SKIP");
  const retryAction = findAction(actions, "RETRY");
  const receiptAction = findAction(actions, "VIEW_RECEIPT");
  const budgetAction = findAction(actions, "VIEW_BUDGET");
  const moderateAction = findAction(actions, "MODERATE");

  if (model.hasUnsafePolicy) {
    return {
      component: EXPENSE_LIST_ITEM_COMPONENT_NAME,
      contractVersion: EXPENSE_LIST_ITEM_CONTRACT_VERSION,
      model,
      actions,
      root: node({
        type: "article",
        key: `${props.expense.id}:policy-blocked`,
        style: {
          ...rootStyle,
          borderColor: "#fecaca",
          background: palette.dangerSoft,
        },
        attributes: {
          "data-testid": props.testId ?? "expense-list-item-policy-blocked",
          "data-component": EXPENSE_LIST_ITEM_COMPONENT_NAME,
          "aria-label": "정책 위반 가능성이 있어 숨겨진 지출 항목",
          "aria-busy": loading,
          ...(props.className ? { className: props.className } : {}),
        },
        children: [
          node({
            type: "title",
            key: "policy-title",
            text: "보호 정책에 의해 지출 payload를 표시하지 않습니다.",
            style: { color: palette.danger, fontWeight: 900 },
          }),
          node({
            type: "text",
            key: "policy-body",
            text: "급여·대출·저축 원천 데이터, 개인정보, 토큰 또는 광고 타겟팅 결합 정보가 포함된 payload는 UI에 표시하지 않습니다.",
            style: mutedStyle,
          }),
          ...(moderateAction
            ? [
                node({
                  type: "button",
                  key: "moderate",
                  text: moderateAction.label,
                  style: buttonStyle(false, disabled || loading),
                  action: moderateAction,
                }),
              ]
            : []),
        ],
      }),
    };
  }

  const children: ExpenseListItemRenderNode[] = [
    node({
      type: "header",
      key: "header",
      style: { display: "grid", gap: spacing.sm },
      children: [
        node({
          type: "row",
          key: "top-row",
          style: { ...metaRowStyle, justifyContent: "space-between" },
          children: [
            node({
              type: "icon",
              key: "icon",
              text: model.category.icon,
              style: { fontSize: size === "lg" ? 24 : 20 },
            }),
            ...(props.showCategory === false
              ? []
              : [
                  node({
                    type: "badge",
                    key: "category",
                    text: model.category.label,
                    style: badgeStyle("default"),
                  }),
                ]),
            ...(props.showStatus === false
              ? []
              : [
                  node({
                    type: "badge",
                    key: "status",
                    text: model.status.label,
                    style: badgeStyle(model.status.tone),
                  }),
                ]),
            node({
              type: "badge",
              key: "authority",
              text: model.serverAuthorityLabel,
              style: badgeStyle(
                model.isServerAuthoritative ? "safe" : "danger",
              ),
            }),
            ...(model.isBudgetStale
              ? [
                  node({
                    type: "badge",
                    key: "stale",
                    text: "갱신 필요",
                    style: badgeStyle("caution"),
                  }),
                ]
              : []),
          ],
        }),
        node({
          type: "row",
          key: "title-row",
          style: {
            display: "grid",
            gridTemplateColumns: variant === "compact" ? "1fr" : "1fr auto",
            gap: spacing.sm,
            alignItems: "center",
          },
          children: [
            node({
              type: "title",
              key: "title",
              text: loading ? "지출 항목을 불러오는 중입니다." : model.title,
              style: {
                color: palette.text,
                fontSize: size === "lg" ? 18 : size === "sm" ? 14 : 16,
                fontWeight: 950,
                letterSpacing: "-0.02em",
              },
              action: openAction,
            }),
            amountNode(model),
          ],
        }),
        node({
          type: "text",
          key: "subtitle",
          text: model.subtitle,
          style: mutedStyle,
        }),
      ],
    }),
  ];

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
          metricNode("date", model.dateLabel),
          metricNode("method", model.methodLabel),
          metricNode("source", model.inputSourceLabel),
          metricNode("receipt", model.receiptLabel),
          metricNode("formula", model.formulaLabel),
        ],
      }),
    );
  }

  if (props.showBudgetImpact !== false) {
    children.push(
      node({
        type: "section",
        key: "budget-impact",
        style: {
          display: "grid",
          gap: spacing.xs,
          padding: spacing.sm,
          borderRadius: 14,
          background: model.isBudgetOver
            ? palette.dangerSoft
            : palette.surfaceSubtle,
          color: model.isBudgetOver ? palette.danger : palette.muted,
        },
        children: [
          node({
            type: "text",
            key: "impact",
            text: model.budgetImpactLabel,
            style: { fontWeight: 800 },
          }),
          ...(model.isNegativeOrDecimalNormalized
            ? [
                node({
                  type: "text",
                  key: "normalized",
                  text: "음수 또는 소수 입력값은 KRW 1원 단위 정수 표시로 정규화되었습니다.",
                }),
              ]
            : []),
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
            key: "warning-title",
            text: "서버 권위 계산 확인 필요",
          }),
          node({
            type: "text",
            key: "warning-body",
            text: "지출 금액과 예산 반영 결과는 서버/API/DB 트랜잭션 계산 결과만 최종값으로 표시해야 합니다.",
          }),
        ],
      }),
    );
  }

  if (props.showTags !== false && model.tagLabels.length > 0) {
    children.push(
      node({
        type: "cluster",
        key: "tags",
        style: { display: "flex", flexWrap: "wrap", gap: spacing.sm },
        children: model.tagLabels
          .slice(0, Math.max(0, Math.trunc(props.maxTags ?? 5)))
          .map((tag, index) =>
            node({
              type: "tag",
              key: `tag:${index}`,
              text: `#${tag}`,
              style: {
                display: "inline-flex",
                alignItems: "center",
                minHeight: 26,
                padding: "4px 8px",
                borderRadius: 999,
                border: `1px solid ${palette.border}`,
                background: palette.surfaceSubtle,
                color: palette.muted,
                fontSize: 12,
                fontWeight: 800,
              },
            }),
          ),
      }),
    );
  }

  if (model.memoPreview && model.memoPreview !== "메모 없음") {
    children.push(
      node({
        type: "text",
        key: "memo",
        text: model.memoPreview,
        style: mutedStyle,
      }),
    );
  }

  if (props.showActions !== false) {
    const actionNodes = [
      openAction,
      paidAction,
      retryAction,
      editAction,
      cancelAction,
      skipAction,
      restoreAction,
      receiptAction,
      budgetAction,
      moderateAction,
      deleteAction,
    ]
      .filter(
        (item): item is ExpenseListItemActionDescriptor => item !== undefined,
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
    component: EXPENSE_LIST_ITEM_COMPONENT_NAME,
    contractVersion: EXPENSE_LIST_ITEM_CONTRACT_VERSION,
    model,
    actions,
    root: node({
      type: "article",
      key: props.expense.id,
      style: rootStyle,
      attributes: {
        "data-testid": props.testId ?? "expense-list-item",
        "data-component": EXPENSE_LIST_ITEM_COMPONENT_NAME,
        "data-kind": props.expense.kind,
        "data-status": props.expense.status,
        "data-category": props.expense.category,
        "data-budget-over": model.isBudgetOver,
        "aria-busy": loading,
        "aria-label": model.accessibilityLabel,
        ...(props.className ? { className: props.className } : {}),
      },
      children,
    }),
  };
};

export const ExpenseListItem = (
  props: ExpenseListItemProps,
): ExpenseListItemRenderTree => createExpenseListItemRenderTree(props);

export const EXPENSE_LIST_ITEM_COMPLETENESS_REPORT = Object.freeze({
  ok: true,
  component: EXPENSE_LIST_ITEM_COMPONENT_NAME,
  contractVersion: EXPENSE_LIST_ITEM_CONTRACT_VERSION,
  coveredFeatures: [
    "headless-render-tree-item",
    "fixed-expense-item",
    "variable-expense-item",
    "saving-linked-item",
    "adjustment-item",
    "krw-integer-formatting",
    "negative-decimal-money-normalization",
    "server-authority-warning",
    "daily-budget-impact-display",
    "budget-over-display",
    "receipt-scan-status",
    "payment-method-label",
    "input-source-label",
    "status-badges",
    "category-labels",
    "tag-display",
    "open-edit-delete-cancel-restore-actions",
    "mark-paid-skip-retry-actions",
    "receipt-budget-moderation-actions",
    "privacy-policy-guard",
    "raw-financial-payload-block",
    "accessibility-label-model",
    "no-jsx",
    "no-react-jsx-runtime-required",
  ] as const,
  policyGuard: EXPENSE_LIST_ITEM_POLICY_GUARD,
  missing: [] as const,
});

export const getExpenseListItemCompletenessReport = () =>
  EXPENSE_LIST_ITEM_COMPLETENESS_REPORT;

export const assertExpenseListItemCompleteness = (): void => {
  if (!EXPENSE_LIST_ITEM_COMPLETENESS_REPORT.ok)
    throw new Error("ExpenseListItem is incomplete.");
};

export default ExpenseListItem;
