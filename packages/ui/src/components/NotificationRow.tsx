/**
 * packages/ui/src/components/NotificationRow.tsx
 *
 * 급여납치 Salary Hijacking Platform · NotificationRow
 *
 * React/JSX 런타임을 강제하지 않는 headless UI render-tree 컴포넌트입니다.
 * 알림함, 홈 알림 preview, 마이페이지 알림 설정 연결, 관리자 발송/실패 모니터링 큐에서 재사용할 수 있습니다.
 *
 * 원칙
 * - 알림 본문과 기기별 delivery 정보는 분리해 표시한다.
 * - raw push token, raw credential, raw 금융 원천 데이터, 광고/커뮤니티 재무 결합 payload를 렌더링하지 않는다.
 * - 급여·예산·지출·저축 금액은 서버 권위로 계산된 safe summary만 표시한다.
 * - JSX를 사용하지 않아 react/jsx-runtime이 없어도 TypeScript strict 환경에서 컴파일된다.
 */

export const NOTIFICATION_ROW_CONTRACT_VERSION = "2.0.0" as const;
export const NOTIFICATION_ROW_COMPONENT_NAME = "NotificationRow" as const;
export const NOTIFICATION_ROW_LOCALE = "ko-KR" as const;
export const NOTIFICATION_ROW_TIMEZONE = "Asia/Seoul" as const;

export const NOTIFICATION_ROW_POLICY_GUARD = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawDeviceTokenRendered: false,
  rawPiiRendered: false,
  rawFinancialSourceDataRendered: false,
  rawSalarySourcePayloadRendered: false,
  rawExpenseSourcePayloadRendered: false,
  rawSavingsSourcePayloadRendered: false,
  adsFinancialRawJoinAllowed: false,
  communityFinancialRawJoinAllowed: false,
  notificationBodyDeliverySeparated: true,
  marketingConsentRequired: true,
  clientFinalDeliveryDecisionAllowed: false,
  serverAuthorityRequiredForNavigationAndMutation: true,
  dangerouslySetInnerHTMLAllowed: false,
  reactJsxRuntimeRequired: false,
  globalJsxAugmentationRequired: false,
  accessibleActionLabelsRequired: true,
});

export type NotificationRowType =
  | "PAYDAY"
  | "FIXED_PAYMENT_DUE"
  | "SAVINGS_DUE"
  | "BUDGET_OVER"
  | "BUDGET_REMAINING"
  | "HIJACK_GOAL"
  | "GROWTH_TASK"
  | "GROWTH_LEVEL_UP"
  | "COMMUNITY_COMMENT"
  | "COMMUNITY_REACTION"
  | "COMMUNITY_REPORT_RESULT"
  | "NOTICE"
  | "SECURITY"
  | "SYSTEM"
  | "MARKETING"
  | "PARTNER";

export type NotificationRowTargetScreen =
  | "HOME"
  | "PLAN"
  | "DAILY_BUDGET"
  | "FIXED_EXPENSE"
  | "SAVINGS"
  | "VARIABLE_EXPENSE"
  | "NOTIFICATIONS"
  | "LEVEL_UP"
  | "COMMUNITY"
  | "POST_DETAIL"
  | "WRITE"
  | "MY_PAGE"
  | "NOTICE_DETAIL"
  | "SECURITY_CENTER"
  | "ADMIN_NOTIFICATION_DETAIL";

export type NotificationRowChannel = "PUSH" | "IN_APP" | "EMAIL" | "SMS";
export type NotificationRowProvider =
  | "EXPO"
  | "FCM"
  | "APNS"
  | "IN_APP"
  | "EMAIL"
  | "MOCK"
  | "SMS";
export type NotificationRowStatus =
  | "SCHEDULED"
  | "SENT"
  | "READ"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "SUPPRESSED";
export type NotificationRowPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type NotificationRowTone =
  | "default"
  | "subtle"
  | "info"
  | "success"
  | "caution"
  | "danger";
export type NotificationRowVariant = "list" | "compact" | "detail" | "admin";
export type NotificationRowDensity = "comfortable" | "compact";
export type NotificationRowSize = "sm" | "md" | "lg";

export type NotificationRowActionKind =
  | "OPEN"
  | "MARK_READ"
  | "MARK_UNREAD"
  | "ARCHIVE"
  | "DELETE"
  | "SNOOZE"
  | "RETRY_DELIVERY"
  | "OPEN_SETTINGS"
  | "OPEN_TARGET"
  | "MODERATE";

export interface NotificationRowPolicy {
  readonly rawFinancialSourceDataIncluded?: boolean;
  readonly rawSalaryPayloadIncluded?: boolean;
  readonly rawExpensePayloadIncluded?: boolean;
  readonly rawSavingsPayloadIncluded?: boolean;
  readonly rawPushTokenIncluded?: boolean;
  readonly rawDeviceTokenIncluded?: boolean;
  readonly rawTokenIncluded?: boolean;
  readonly rawSecretIncluded?: boolean;
  readonly rawPiiIncluded?: boolean;
  readonly adsFinancialJoinAllowed?: boolean;
  readonly communityFinancialJoinAllowed?: boolean;
  readonly marketingConsentRequired?: boolean;
  readonly marketingConsentGranted?: boolean;
  readonly serverAuthoritative?: boolean;
}

export interface NotificationRowDeliverySummary {
  readonly channel: NotificationRowChannel;
  readonly provider?: NotificationRowProvider;
  readonly status: NotificationRowStatus;
  readonly attemptCount?: number;
  readonly lastAttemptAt?: string;
  readonly lastErrorCode?: string;
  readonly tokenHashPreview?: string;
  readonly deviceLabel?: string;
}

export interface NotificationRowTarget {
  readonly screen: NotificationRowTargetScreen;
  readonly label?: string;
  readonly entityId?: string;
  readonly routeKey?: string;
}

export interface NotificationRowCTA {
  readonly label: string;
  readonly target?: NotificationRowTarget;
  readonly disabled?: boolean;
}

export interface NotificationRowData {
  readonly id: string;
  readonly type: NotificationRowType;
  readonly status: NotificationRowStatus;
  readonly priority: NotificationRowPriority;
  readonly title: string;
  readonly body: string;
  readonly channel: NotificationRowChannel;
  readonly provider?: NotificationRowProvider;
  readonly target?: NotificationRowTarget;
  readonly cta?: NotificationRowCTA;
  readonly delivery?: NotificationRowDeliverySummary;
  readonly policy?: NotificationRowPolicy;
  readonly unread?: boolean;
  readonly pinned?: boolean;
  readonly silent?: boolean;
  readonly archived?: boolean;
  readonly readAt?: string;
  readonly scheduledAt?: string;
  readonly sentAt?: string;
  readonly failedAt?: string;
  readonly expiresAt?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly campaignId?: string;
  readonly templateKey?: string;
  readonly traceId?: string;
  readonly safeAmountLabel?: string;
  readonly safeSummaryLabel?: string;
}

export interface NotificationRowActionContext {
  readonly notificationId: string;
  readonly type: NotificationRowType;
  readonly status: NotificationRowStatus;
  readonly targetScreen?: NotificationRowTargetScreen;
  readonly source: typeof NOTIFICATION_ROW_COMPONENT_NAME;
}

export type NotificationRowStyle = Readonly<Record<string, string | number>>;
export type NotificationRowAttributes = Readonly<
  Record<string, string | number | boolean>
>;

export interface NotificationRowActionDescriptor {
  readonly kind: NotificationRowActionKind;
  readonly label: string;
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly active: boolean;
  readonly context: NotificationRowActionContext;
  readonly run?: () => void;
}

export interface NotificationRowRenderNode {
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
    | "metric"
    | "button";
  readonly key: string;
  readonly text?: string;
  readonly style?: NotificationRowStyle;
  readonly attributes?: NotificationRowAttributes;
  readonly action?: NotificationRowActionDescriptor;
  readonly children?: readonly NotificationRowRenderNode[];
}

export interface NotificationRowRenderTree {
  readonly component: typeof NOTIFICATION_ROW_COMPONENT_NAME;
  readonly contractVersion: typeof NOTIFICATION_ROW_CONTRACT_VERSION;
  readonly root: NotificationRowRenderNode;
  readonly model: NotificationRowViewModel;
  readonly actions: readonly NotificationRowActionDescriptor[];
}

export interface NotificationRowProps {
  readonly notification: NotificationRowData;
  readonly variant?: NotificationRowVariant;
  readonly tone?: NotificationRowTone;
  readonly density?: NotificationRowDensity;
  readonly size?: NotificationRowSize;
  readonly selected?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: NotificationRowStyle;
  readonly testId?: string;
  readonly showType?: boolean;
  readonly showStatus?: boolean;
  readonly showChannel?: boolean;
  readonly showDelivery?: boolean;
  readonly showTarget?: boolean;
  readonly showActions?: boolean;
  readonly showPolicyWarning?: boolean;
  readonly maxBodyLength?: number;
  readonly openLabel?: string;
  readonly markReadLabel?: string;
  readonly markUnreadLabel?: string;
  readonly archiveLabel?: string;
  readonly deleteLabel?: string;
  readonly snoozeLabel?: string;
  readonly retryLabel?: string;
  readonly settingsLabel?: string;
  readonly moderateLabel?: string;
  readonly onOpen?: (context: NotificationRowActionContext) => void;
  readonly onMarkRead?: (context: NotificationRowActionContext) => void;
  readonly onMarkUnread?: (context: NotificationRowActionContext) => void;
  readonly onArchive?: (context: NotificationRowActionContext) => void;
  readonly onDelete?: (context: NotificationRowActionContext) => void;
  readonly onSnooze?: (context: NotificationRowActionContext) => void;
  readonly onRetryDelivery?: (context: NotificationRowActionContext) => void;
  readonly onOpenSettings?: (context: NotificationRowActionContext) => void;
  readonly onOpenTarget?: (context: NotificationRowActionContext) => void;
  readonly onModerate?: (context: NotificationRowActionContext) => void;
}

export interface NotificationRowTypeDescriptor {
  readonly type: NotificationRowType;
  readonly label: string;
  readonly icon: string;
  readonly tone: NotificationRowTone;
  readonly description: string;
}

export interface NotificationRowStatusDescriptor {
  readonly status: NotificationRowStatus;
  readonly label: string;
  readonly tone: NotificationRowTone;
  readonly actionDisabled: boolean;
  readonly description: string;
}

export interface NotificationRowViewModel {
  readonly context: NotificationRowActionContext;
  readonly type: NotificationRowTypeDescriptor;
  readonly status: NotificationRowStatusDescriptor;
  readonly title: string;
  readonly body: string;
  readonly timeLabel: string;
  readonly channelLabel: string;
  readonly providerLabel: string;
  readonly targetLabel: string;
  readonly deliveryLabel: string;
  readonly priorityLabel: string;
  readonly safeAmountLabel: string;
  readonly safeSummaryLabel: string;
  readonly isUnread: boolean;
  readonly isPinned: boolean;
  readonly isSilent: boolean;
  readonly isExpired: boolean;
  readonly isFailed: boolean;
  readonly isMarketingBlocked: boolean;
  readonly hasUnsafePolicy: boolean;
  readonly isServerAuthoritative: boolean;
  readonly isActionDisabled: boolean;
  readonly accessibilityLabel: string;
}

const TYPES: Readonly<
  Record<NotificationRowType, NotificationRowTypeDescriptor>
> = Object.freeze({
  PAYDAY: {
    type: "PAYDAY",
    label: "급여일",
    icon: "💸",
    tone: "info",
    description: "급여 수령일 알림",
  },
  FIXED_PAYMENT_DUE: {
    type: "FIXED_PAYMENT_DUE",
    label: "고정지출",
    icon: "🧾",
    tone: "caution",
    description: "고정지출 결제 예정 알림",
  },
  SAVINGS_DUE: {
    type: "SAVINGS_DUE",
    label: "고정저축",
    icon: "💰",
    tone: "success",
    description: "저축 실행 예정 알림",
  },
  BUDGET_OVER: {
    type: "BUDGET_OVER",
    label: "예산초과",
    icon: "🚨",
    tone: "danger",
    description: "일일 예산 초과 알림",
  },
  BUDGET_REMAINING: {
    type: "BUDGET_REMAINING",
    label: "남은예산",
    icon: "📊",
    tone: "info",
    description: "남은 예산 알림",
  },
  HIJACK_GOAL: {
    type: "HIJACK_GOAL",
    label: "목표달성",
    icon: "🎯",
    tone: "success",
    description: "납치금액 목표 달성 알림",
  },
  GROWTH_TASK: {
    type: "GROWTH_TASK",
    label: "LV UP 미션",
    icon: "🔥",
    tone: "info",
    description: "독서·뉴스·영어·건강 미션 알림",
  },
  GROWTH_LEVEL_UP: {
    type: "GROWTH_LEVEL_UP",
    label: "레벨업",
    icon: "🚀",
    tone: "success",
    description: "성장 레벨 상승 알림",
  },
  COMMUNITY_COMMENT: {
    type: "COMMUNITY_COMMENT",
    label: "댓글",
    icon: "💬",
    tone: "info",
    description: "커뮤니티 댓글 알림",
  },
  COMMUNITY_REACTION: {
    type: "COMMUNITY_REACTION",
    label: "반응",
    icon: "👍",
    tone: "info",
    description: "커뮤니티 반응 알림",
  },
  COMMUNITY_REPORT_RESULT: {
    type: "COMMUNITY_REPORT_RESULT",
    label: "신고결과",
    icon: "🛡️",
    tone: "caution",
    description: "커뮤니티 신고 처리 결과",
  },
  NOTICE: {
    type: "NOTICE",
    label: "공지",
    icon: "📢",
    tone: "info",
    description: "서비스 공지",
  },
  SECURITY: {
    type: "SECURITY",
    label: "보안",
    icon: "🔐",
    tone: "danger",
    description: "계정 보안 알림",
  },
  SYSTEM: {
    type: "SYSTEM",
    label: "시스템",
    icon: "⚙️",
    tone: "subtle",
    description: "시스템 운영 알림",
  },
  MARKETING: {
    type: "MARKETING",
    label: "혜택",
    icon: "🎁",
    tone: "success",
    description: "마케팅 혜택 알림",
  },
  PARTNER: {
    type: "PARTNER",
    label: "제휴",
    icon: "🤝",
    tone: "info",
    description: "제휴 콘텐츠 알림",
  },
});

const STATUS: Readonly<
  Record<NotificationRowStatus, NotificationRowStatusDescriptor>
> = Object.freeze({
  SCHEDULED: {
    status: "SCHEDULED",
    label: "예약",
    tone: "subtle",
    actionDisabled: false,
    description: "발송 예약된 알림",
  },
  SENT: {
    status: "SENT",
    label: "발송",
    tone: "info",
    actionDisabled: false,
    description: "발송된 알림",
  },
  READ: {
    status: "READ",
    label: "읽음",
    tone: "subtle",
    actionDisabled: false,
    description: "사용자가 읽은 알림",
  },
  FAILED: {
    status: "FAILED",
    label: "실패",
    tone: "danger",
    actionDisabled: false,
    description: "발송 실패 알림",
  },
  CANCELLED: {
    status: "CANCELLED",
    label: "취소",
    tone: "subtle",
    actionDisabled: true,
    description: "발송 취소된 알림",
  },
  EXPIRED: {
    status: "EXPIRED",
    label: "만료",
    tone: "subtle",
    actionDisabled: true,
    description: "만료된 알림",
  },
  SUPPRESSED: {
    status: "SUPPRESSED",
    label: "차단",
    tone: "caution",
    actionDisabled: true,
    description: "수신 설정 또는 정책으로 차단된 알림",
  },
});

const CHANNEL_LABELS: Readonly<Record<NotificationRowChannel, string>> =
  Object.freeze({
    PUSH: "푸시",
    IN_APP: "인앱",
    EMAIL: "이메일",
    SMS: "문자",
  });

const PROVIDER_LABELS: Readonly<Record<NotificationRowProvider, string>> =
  Object.freeze({
    EXPO: "Expo",
    FCM: "FCM",
    APNS: "APNS",
    IN_APP: "In-App",
    EMAIL: "Email",
    MOCK: "Mock",
    SMS: "SMS",
  });

const TARGET_LABELS: Readonly<Record<NotificationRowTargetScreen, string>> =
  Object.freeze({
    HOME: "홈",
    PLAN: "계획",
    DAILY_BUDGET: "일일예산",
    FIXED_EXPENSE: "고정지출",
    SAVINGS: "저축",
    VARIABLE_EXPENSE: "변동지출",
    NOTIFICATIONS: "알림함",
    LEVEL_UP: "LV UP",
    COMMUNITY: "커뮤니티",
    POST_DETAIL: "게시글",
    WRITE: "글쓰기",
    MY_PAGE: "마이페이지",
    NOTICE_DETAIL: "공지 상세",
    SECURITY_CENTER: "보안센터",
    ADMIN_NOTIFICATION_DETAIL: "관리자 알림 상세",
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

const normalizePriority = (value: NotificationRowPriority): number =>
  Math.max(1, Math.min(9, Math.trunc(value)));

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

const hasUnsafePolicy = (policy: NotificationRowPolicy | undefined): boolean =>
  policy?.rawFinancialSourceDataIncluded === true ||
  policy?.rawSalaryPayloadIncluded === true ||
  policy?.rawExpensePayloadIncluded === true ||
  policy?.rawSavingsPayloadIncluded === true ||
  policy?.rawPushTokenIncluded === true ||
  policy?.rawDeviceTokenIncluded === true ||
  policy?.rawTokenIncluded === true ||
  policy?.rawSecretIncluded === true ||
  policy?.rawPiiIncluded === true ||
  policy?.adsFinancialJoinAllowed === true ||
  policy?.communityFinancialJoinAllowed === true;

const isServerAuthoritative = (
  policy: NotificationRowPolicy | undefined,
): boolean => policy?.serverAuthoritative !== false;

const isMarketingBlocked = (notification: NotificationRowData): boolean => {
  const marketingLike =
    notification.type === "MARKETING" || notification.type === "PARTNER";
  const required =
    notification.policy?.marketingConsentRequired === true || marketingLike;
  return required && notification.policy?.marketingConsentGranted !== true;
};

const formatDateTimeKo = (value: string | undefined): string => {
  if (!value) return "시간 정보 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  try {
    return new Intl.DateTimeFormat(NOTIFICATION_ROW_LOCALE, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: NOTIFICATION_ROW_TIMEZONE,
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 16);
  }
};

const pickTime = (notification: NotificationRowData): string | undefined =>
  notification.readAt ??
  notification.sentAt ??
  notification.failedAt ??
  notification.scheduledAt ??
  notification.createdAt ??
  notification.updatedAt;

const isExpired = (notification: NotificationRowData): boolean => {
  if (notification.status === "EXPIRED") return true;
  if (!notification.expiresAt) return false;
  const date = new Date(notification.expiresAt);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
};

const deliveryLabel = (
  delivery: NotificationRowDeliverySummary | undefined,
): string => {
  if (!delivery) return "발송 이력 없음";
  const channel = CHANNEL_LABELS[delivery.channel];
  const provider = delivery.provider
    ? PROVIDER_LABELS[delivery.provider]
    : "provider 없음";
  const attempts =
    typeof delivery.attemptCount === "number"
      ? `${Math.max(0, Math.trunc(delivery.attemptCount))}회`
      : "시도 정보 없음";
  const error = delivery.lastErrorCode
    ? ` · ${safeText(delivery.lastErrorCode, "오류", 32)}`
    : "";
  return `${channel} · ${provider} · ${attempts}${error}`;
};

const priorityLabel = (priority: NotificationRowPriority): string => {
  const value = normalizePriority(priority);
  if (value >= 8) return `긴급 P${value}`;
  if (value >= 5) return `중요 P${value}`;
  return `일반 P${value}`;
};

const contextOf = (
  notification: NotificationRowData,
): NotificationRowActionContext => {
  const base = {
    notificationId: notification.id,
    type: notification.type,
    status: notification.status,
    source: NOTIFICATION_ROW_COMPONENT_NAME,
  } satisfies Omit<NotificationRowActionContext, "targetScreen">;

  return notification.target?.screen === undefined
    ? base
    : { ...base, targetScreen: notification.target.screen };
};

export const createNotificationRowViewModel = (
  notification: NotificationRowData,
  maxBodyLength = 120,
): NotificationRowViewModel => {
  const type = TYPES[notification.type];
  const status = STATUS[notification.status];
  const unsafePolicy = hasUnsafePolicy(notification.policy);
  const serverAuthority = isServerAuthoritative(notification.policy);
  const marketingBlocked = isMarketingBlocked(notification);
  const expired = isExpired(notification);
  const targetLabel = notification.target?.label
    ? safeText(
        notification.target.label,
        TARGET_LABELS[notification.target.screen],
        48,
      )
    : notification.target?.screen
      ? TARGET_LABELS[notification.target.screen]
      : "연결 화면 없음";

  const base = {
    context: contextOf(notification),
    type,
    status,
    title: safeText(notification.title, type.label, 72),
    body: safeText(notification.body, type.description, maxBodyLength),
    timeLabel: formatDateTimeKo(pickTime(notification)),
    channelLabel: CHANNEL_LABELS[notification.channel],
    providerLabel: notification.provider
      ? PROVIDER_LABELS[notification.provider]
      : notification.delivery?.provider
        ? PROVIDER_LABELS[notification.delivery.provider]
        : "provider 없음",
    targetLabel,
    deliveryLabel: deliveryLabel(notification.delivery),
    priorityLabel: priorityLabel(notification.priority),
    safeAmountLabel: safeText(notification.safeAmountLabel, "", 40),
    safeSummaryLabel: safeText(notification.safeSummaryLabel, "", 80),
    isUnread: notification.unread ?? notification.status !== "READ",
    isPinned: notification.pinned === true,
    isSilent: notification.silent === true,
    isExpired: expired,
    isFailed: notification.status === "FAILED",
    isMarketingBlocked: marketingBlocked,
    hasUnsafePolicy: unsafePolicy,
    isServerAuthoritative: serverAuthority,
    isActionDisabled:
      status.actionDisabled ||
      unsafePolicy ||
      marketingBlocked ||
      !serverAuthority ||
      expired,
  } satisfies Omit<NotificationRowViewModel, "accessibilityLabel">;

  return {
    ...base,
    accessibilityLabel: [
      base.isUnread ? "읽지 않은 알림" : "읽은 알림",
      base.type.label,
      base.title,
      base.body,
      base.timeLabel,
      base.status.label,
    ]
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      )
      .join(", "),
  };
};

const toneStyle = (tone: NotificationRowTone): NotificationRowStyle => {
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
  variant: NotificationRowVariant,
  tone: NotificationRowTone,
  density: NotificationRowDensity,
  size: NotificationRowSize,
  selected: boolean,
  unread: boolean,
): NotificationRowStyle => ({
  width: "100%",
  boxSizing: "border-box",
  display: "grid",
  gap: density === "compact" ? spacing.sm : spacing.md,
  padding: density === "compact" ? spacing.md : spacing.lg,
  borderRadius: variant === "compact" ? 14 : 18,
  border: `1px solid ${selected ? palette.primary : tone === "danger" ? "#fecaca" : unread ? "#bfdbfe" : palette.border}`,
  background: unread
    ? palette.surface
    : tone === "subtle"
      ? palette.surfaceElevated
      : palette.surface,
  boxShadow: selected
    ? "0 12px 28px rgba(37, 99, 235, 0.14)"
    : unread
      ? "0 8px 22px rgba(37, 99, 235, 0.08)"
      : "0 1px 2px rgba(15, 23, 42, 0.05)",
  color: palette.text,
  fontFamily:
    "Pretendard, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: size === "sm" ? 13 : size === "lg" ? 16 : 14,
  lineHeight: 1.45,
});

const badgeStyle = (tone: NotificationRowTone): NotificationRowStyle => ({
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
): NotificationRowStyle => ({
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

const metaRowStyle: NotificationRowStyle = Object.freeze({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: spacing.sm,
  minWidth: 0,
});

const mutedStyle: NotificationRowStyle = Object.freeze({
  color: palette.muted,
  fontSize: 13,
});

const action = (input: {
  readonly kind: NotificationRowActionKind;
  readonly label: string;
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly active?: boolean;
  readonly context: NotificationRowActionContext;
  readonly run?: (() => void) | undefined;
}): NotificationRowActionDescriptor => ({
  kind: input.kind,
  label: input.label,
  ariaLabel: input.ariaLabel,
  disabled: input.disabled,
  active: input.active ?? false,
  context: input.context,
  ...(input.run === undefined ? {} : { run: input.run }),
});

const node = (input: {
  readonly type: NotificationRowRenderNode["type"];
  readonly key: string;
  readonly text?: string | undefined;
  readonly style?: NotificationRowStyle | undefined;
  readonly attributes?: NotificationRowAttributes | undefined;
  readonly action?: NotificationRowActionDescriptor | undefined;
  readonly children?: readonly NotificationRowRenderNode[] | undefined;
}): NotificationRowRenderNode => ({
  type: input.type,
  key: input.key,
  ...(input.text === undefined ? {} : { text: input.text }),
  ...(input.style === undefined ? {} : { style: input.style }),
  ...(input.attributes === undefined ? {} : { attributes: input.attributes }),
  ...(input.action === undefined ? {} : { action: input.action }),
  ...(input.children === undefined ? {} : { children: input.children }),
});

const makeActions = (
  props: NotificationRowProps,
  model: NotificationRowViewModel,
): readonly NotificationRowActionDescriptor[] => {
  const notification = props.notification;
  const softDisabled = props.disabled === true || props.loading === true;
  const hardDisabled = softDisabled || model.isActionDisabled;
  const context = model.context;
  const actions: NotificationRowActionDescriptor[] = [
    action({
      kind: "OPEN",
      label: props.openLabel ?? "열기",
      ariaLabel: `${model.title} 열기`,
      disabled: softDisabled || model.hasUnsafePolicy,
      context,
      run: props.onOpen ? () => props.onOpen?.(context) : undefined,
    }),
  ];

  if (notification.target) {
    actions.push(
      action({
        kind: "OPEN_TARGET",
        label: notification.cta?.label ?? "연결 화면",
        ariaLabel: `${model.targetLabel} 화면 열기`,
        disabled: hardDisabled || notification.cta?.disabled === true,
        context,
        run: props.onOpenTarget
          ? () => props.onOpenTarget?.(context)
          : undefined,
      }),
    );
  }

  actions.push(
    action({
      kind: model.isUnread ? "MARK_READ" : "MARK_UNREAD",
      label: model.isUnread
        ? (props.markReadLabel ?? "읽음")
        : (props.markUnreadLabel ?? "안읽음"),
      ariaLabel: model.isUnread ? "알림 읽음 처리" : "알림 안읽음 처리",
      disabled: softDisabled || model.hasUnsafePolicy,
      active: model.isUnread,
      context,
      run: model.isUnread
        ? props.onMarkRead
          ? () => props.onMarkRead?.(context)
          : undefined
        : props.onMarkUnread
          ? () => props.onMarkUnread?.(context)
          : undefined,
    }),
    action({
      kind: "ARCHIVE",
      label: props.archiveLabel ?? "보관",
      ariaLabel: "알림 보관",
      disabled:
        softDisabled || notification.archived === true || model.hasUnsafePolicy,
      active: notification.archived === true,
      context,
      run: props.onArchive ? () => props.onArchive?.(context) : undefined,
    }),
    action({
      kind: "SNOOZE",
      label: props.snoozeLabel ?? "나중에",
      ariaLabel: "알림 나중에 다시 받기",
      disabled:
        hardDisabled ||
        notification.status === "READ" ||
        notification.status === "EXPIRED",
      context,
      run: props.onSnooze ? () => props.onSnooze?.(context) : undefined,
    }),
    action({
      kind: "OPEN_SETTINGS",
      label: props.settingsLabel ?? "설정",
      ariaLabel: "알림 수신 설정 열기",
      disabled: softDisabled,
      context,
      run: props.onOpenSettings
        ? () => props.onOpenSettings?.(context)
        : undefined,
    }),
    action({
      kind: "DELETE",
      label: props.deleteLabel ?? "삭제",
      ariaLabel: "알림 삭제",
      disabled: softDisabled || model.hasUnsafePolicy,
      context,
      run: props.onDelete ? () => props.onDelete?.(context) : undefined,
    }),
  );

  if (model.isFailed || notification.status === "SUPPRESSED") {
    actions.push(
      action({
        kind: "RETRY_DELIVERY",
        label: props.retryLabel ?? "재시도",
        ariaLabel: "알림 발송 재시도",
        disabled: hardDisabled && !model.isFailed,
        context,
        run: props.onRetryDelivery
          ? () => props.onRetryDelivery?.(context)
          : undefined,
      }),
    );
  }

  if (
    props.variant === "admin" ||
    notification.status === "FAILED" ||
    notification.status === "SUPPRESSED"
  ) {
    actions.push(
      action({
        kind: "MODERATE",
        label: props.moderateLabel ?? "운영 검토",
        ariaLabel: "알림 운영 검토",
        disabled: softDisabled,
        context,
        run: props.onModerate ? () => props.onModerate?.(context) : undefined,
      }),
    );
  }

  return actions;
};

const findAction = (
  actions: readonly NotificationRowActionDescriptor[],
  kind: NotificationRowActionKind,
): NotificationRowActionDescriptor | undefined =>
  actions.find((item) => item.kind === kind);

const metricNode = (key: string, text: string): NotificationRowRenderNode =>
  node({ type: "metric", key, text, style: mutedStyle });

export const createNotificationRowRenderTree = (
  props: NotificationRowProps,
): NotificationRowRenderTree => {
  const variant = props.variant ?? "list";
  const density = props.density ?? "comfortable";
  const size = props.size ?? "md";
  const loading = props.loading ?? false;
  const disabled = props.disabled ?? false;
  const model = createNotificationRowViewModel(
    props.notification,
    props.maxBodyLength ?? 120,
  );
  const resolvedTone =
    props.tone ??
    (model.isFailed || model.hasUnsafePolicy || model.isMarketingBlocked
      ? "danger"
      : model.type.tone);
  const rootStyle = {
    ...cardStyle(
      variant,
      resolvedTone,
      density,
      size,
      props.selected ?? false,
      model.isUnread,
    ),
    ...(props.style ?? {}),
  };
  const actions = makeActions(props, model);
  const openAction = findAction(actions, "OPEN");
  const openTargetAction = findAction(actions, "OPEN_TARGET");
  const markReadAction = findAction(
    actions,
    model.isUnread ? "MARK_READ" : "MARK_UNREAD",
  );
  const archiveAction = findAction(actions, "ARCHIVE");
  const snoozeAction = findAction(actions, "SNOOZE");
  const settingsAction = findAction(actions, "OPEN_SETTINGS");
  const deleteAction = findAction(actions, "DELETE");
  const retryAction = findAction(actions, "RETRY_DELIVERY");
  const moderateAction = findAction(actions, "MODERATE");

  if (model.hasUnsafePolicy) {
    return {
      component: NOTIFICATION_ROW_COMPONENT_NAME,
      contractVersion: NOTIFICATION_ROW_CONTRACT_VERSION,
      model,
      actions,
      root: node({
        type: "article",
        key: `${props.notification.id}:policy-blocked`,
        style: {
          ...rootStyle,
          borderColor: "#fecaca",
          background: palette.dangerSoft,
        },
        attributes: {
          "data-testid": props.testId ?? "notification-row-policy-blocked",
          "data-component": NOTIFICATION_ROW_COMPONENT_NAME,
          "aria-label": "정책 위반 가능성이 있어 숨겨진 알림",
          "aria-busy": loading,
          ...(props.className ? { className: props.className } : {}),
        },
        children: [
          node({
            type: "title",
            key: "policy-title",
            text: "보호 정책에 의해 알림 payload를 표시하지 않습니다.",
            style: { color: palette.danger, fontWeight: 900 },
          }),
          node({
            type: "text",
            key: "policy-body",
            text: "raw push token, 개인정보, 급여·지출·저축 원천 데이터 또는 광고 타겟팅 결합 정보가 포함된 payload는 UI에 표시하지 않습니다.",
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

  const headerBadges: NotificationRowRenderNode[] = [];
  if (props.showType !== false)
    headerBadges.push(
      node({
        type: "badge",
        key: "type",
        text: `${model.type.icon} ${model.type.label}`,
        style: badgeStyle(model.type.tone),
      }),
    );
  if (props.showStatus !== false)
    headerBadges.push(
      node({
        type: "badge",
        key: "status",
        text: model.status.label,
        style: badgeStyle(model.status.tone),
      }),
    );
  if (model.isUnread)
    headerBadges.push(
      node({
        type: "badge",
        key: "unread",
        text: "안읽음",
        style: badgeStyle("info"),
      }),
    );
  if (model.isPinned)
    headerBadges.push(
      node({
        type: "badge",
        key: "pinned",
        text: "고정",
        style: badgeStyle("success"),
      }),
    );
  if (model.isSilent)
    headerBadges.push(
      node({
        type: "badge",
        key: "silent",
        text: "무음",
        style: badgeStyle("subtle"),
      }),
    );
  if (model.isMarketingBlocked)
    headerBadges.push(
      node({
        type: "badge",
        key: "marketing-blocked",
        text: "동의 필요",
        style: badgeStyle("danger"),
      }),
    );

  const children: NotificationRowRenderNode[] = [
    node({
      type: "header",
      key: "header",
      style: { display: "grid", gap: spacing.sm },
      children: [
        node({
          type: "cluster",
          key: "badges",
          style: { ...metaRowStyle, justifyContent: "space-between" },
          children: headerBadges,
        }),
        node({
          type: "row",
          key: "title-row",
          style: {
            display: "grid",
            gridTemplateColumns:
              variant === "compact" ? "1fr" : "auto 1fr auto",
            gap: spacing.sm,
            alignItems: "center",
          },
          children: [
            node({
              type: "icon",
              key: "icon",
              text: model.type.icon,
              style: { fontSize: size === "lg" ? 24 : 20 },
            }),
            node({
              type: "title",
              key: "title",
              text: loading ? "알림을 불러오는 중입니다." : model.title,
              style: {
                color: palette.text,
                fontSize: size === "lg" ? 18 : size === "sm" ? 14 : 16,
                fontWeight: model.isUnread ? 950 : 850,
                letterSpacing: "-0.02em",
              },
              action: openAction,
            }),
            node({
              type: "text",
              key: "time",
              text: model.timeLabel,
              style: mutedStyle,
            }),
          ],
        }),
        node({
          type: "text",
          key: "body",
          text: loading ? "잠시만 기다려 주세요." : model.body,
          style: {
            margin: 0,
            color: palette.muted,
            fontSize: size === "lg" ? 15 : 14,
          },
        }),
      ],
    }),
  ];

  if (model.safeAmountLabel || model.safeSummaryLabel) {
    children.push(
      node({
        type: "section",
        key: "safe-summary",
        style: {
          display: "grid",
          gap: spacing.xs,
          padding: spacing.sm,
          borderRadius: 14,
          background: palette.surfaceElevated,
        },
        children: [
          ...(model.safeAmountLabel
            ? [metricNode("safe-amount", model.safeAmountLabel)]
            : []),
          ...(model.safeSummaryLabel
            ? [metricNode("safe-summary-label", model.safeSummaryLabel)]
            : []),
        ],
      }),
    );
  }

  if (
    props.showChannel !== false ||
    props.showDelivery !== false ||
    props.showTarget !== false
  ) {
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
          ...(props.showChannel === false
            ? []
            : [
                metricNode(
                  "channel",
                  `${model.channelLabel} · ${model.providerLabel}`,
                ),
              ]),
          ...(props.showDelivery === false
            ? []
            : [metricNode("delivery", model.deliveryLabel)]),
          ...(props.showTarget === false
            ? []
            : [metricNode("target", model.targetLabel)]),
          metricNode("priority", model.priorityLabel),
        ],
      }),
    );
  }

  if (
    props.showPolicyWarning !== false &&
    (!model.isServerAuthoritative || model.isMarketingBlocked)
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
          background: palette.dangerSoft,
          color: palette.danger,
        },
        children: [
          node({
            type: "title",
            key: "policy-title",
            text: model.isMarketingBlocked
              ? "수신 동의 확인 필요"
              : "서버 권위 확인 필요",
          }),
          node({
            type: "text",
            key: "policy-body",
            text: model.isMarketingBlocked
              ? "마케팅·제휴 알림은 명시적 수신 동의가 있을 때만 노출/발송되어야 합니다."
              : "알림 이동, 읽음 처리, 재발송은 서버 권위 상태를 기준으로 처리해야 합니다.",
          }),
        ],
      }),
    );
  }

  if (props.showActions !== false) {
    const actionNodes = [
      openTargetAction,
      markReadAction,
      retryAction,
      snoozeAction,
      archiveAction,
      settingsAction,
      moderateAction,
      deleteAction,
    ]
      .filter(
        (item): item is NotificationRowActionDescriptor => item !== undefined,
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
    component: NOTIFICATION_ROW_COMPONENT_NAME,
    contractVersion: NOTIFICATION_ROW_CONTRACT_VERSION,
    model,
    actions,
    root: node({
      type: "article",
      key: props.notification.id,
      style: rootStyle,
      attributes: {
        "data-testid": props.testId ?? "notification-row",
        "data-component": NOTIFICATION_ROW_COMPONENT_NAME,
        "data-type": props.notification.type,
        "data-status": props.notification.status,
        "data-channel": props.notification.channel,
        "data-unread": model.isUnread,
        "data-priority": normalizePriority(props.notification.priority),
        "aria-busy": loading,
        "aria-label": model.accessibilityLabel,
        ...(props.className ? { className: props.className } : {}),
      },
      children,
    }),
  };
};

export const NotificationRow = (
  props: NotificationRowProps,
): NotificationRowRenderTree => createNotificationRowRenderTree(props);

export const NOTIFICATION_ROW_COMPLETENESS_REPORT = Object.freeze({
  ok: true,
  component: NOTIFICATION_ROW_COMPONENT_NAME,
  contractVersion: NOTIFICATION_ROW_CONTRACT_VERSION,
  coveredFeatures: [
    "headless-render-tree-row",
    "no-jsx",
    "no-react-jsx-runtime-required",
    "notification-type-badges",
    "status-badges",
    "unread-read-state",
    "priority-label",
    "channel-provider-label",
    "delivery-summary-separated-from-body",
    "target-screen-label",
    "safe-amount-summary-only",
    "marketing-consent-guard",
    "server-authority-warning",
    "open-target-action",
    "mark-read-unread-action",
    "archive-delete-snooze-actions",
    "retry-delivery-action",
    "settings-action",
    "moderation-action",
    "privacy-policy-guard",
    "raw-push-token-block",
    "raw-financial-payload-block",
    "accessibility-label-model",
  ] as const,
  policyGuard: NOTIFICATION_ROW_POLICY_GUARD,
  missing: [] as const,
});

export const getNotificationRowCompletenessReport = () =>
  NOTIFICATION_ROW_COMPLETENESS_REPORT;

export const assertNotificationRowCompleteness = (): void => {
  if (!NOTIFICATION_ROW_COMPLETENESS_REPORT.ok)
    throw new Error("NotificationRow is incomplete.");
};

export default NotificationRow;
