/**
 * packages/ui/src/components/CommunityPostCard.tsx
 *
 * 급여납치 Salary Hijacking Platform · CommunityPostCard
 *
 * React/JSX 런타임을 강제하지 않는 headless UI render-tree 컴포넌트입니다.
 * 이전 오류 원인인 global JSX index signature와 JSX 문법을 제거해
 * `Duplicate index signature for type 'string'` 및 `react/jsx-runtime` 해석 오류를 방지합니다.
 */

export const COMMUNITY_POST_CARD_CONTRACT_VERSION = "2.1.0" as const;
export const COMMUNITY_POST_CARD_COMPONENT_NAME = "CommunityPostCard" as const;
export const COMMUNITY_POST_CARD_LOCALE = "ko-KR" as const;
export const COMMUNITY_POST_CARD_TIMEZONE = "Asia/Seoul" as const;

export const COMMUNITY_POST_CARD_POLICY_GUARD = Object.freeze({
  rawPasswordRendered: false,
  rawTokenRendered: false,
  rawSecretRendered: false,
  rawPushTokenRendered: false,
  rawFinancialSourceDataRendered: false,
  adsFinancialRawJoinAllowed: false,
  communityFinancialRawJoinAllowed: false,
  dangerouslySetInnerHTMLAllowed: false,
  globalJsxAugmentationRequired: false,
  reactJsxRuntimeRequired: false,
  clientFinalModerationDecisionAllowed: false,
  serverAuthorityRequiredForMutations: true,
  accessibleActionLabelsRequired: true,
});

export type CommunityPostCardBoard =
  | "ALL"
  | "FREE"
  | "LEVEL_UP_CERTIFICATION"
  | "CONSUMPTION_CONTROL"
  | "SAVING_TIP"
  | "SALARY_TALK"
  | "HOBBY"
  | "NOTICE"
  | "EVENT"
  | "FAQ";

export type CommunityPostCardStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "HIDDEN"
  | "REPORTED"
  | "BLINDED"
  | "BLOCKED"
  | "LOCKED"
  | "ARCHIVED"
  | "DELETED";

export type CommunityPostCardVisibility =
  | "PUBLIC"
  | "MEMBERS_ONLY"
  | "MODERATORS_ONLY"
  | "ADMIN_ONLY";
export type CommunityPostCardReactionType =
  | "LIKE"
  | "EMPATHY"
  | "CHEER"
  | "THANKS"
  | "USEFUL"
  | "SAVED_MONEY"
  | "LEVEL_UP";
export type CommunityPostCardVariant = "feed" | "compact" | "detail" | "admin";
export type CommunityPostCardTone =
  | "default"
  | "elevated"
  | "subtle"
  | "danger"
  | "success";
export type CommunityPostCardDensity = "comfortable" | "compact";
export type CommunityPostCardSize = "sm" | "md" | "lg";

export type CommunityPostCardActionKind =
  | "OPEN"
  | "AUTHOR_PRESS"
  | "BOARD_PRESS"
  | "TAG_PRESS"
  | "REACT"
  | "BOOKMARK"
  | "SHARE"
  | "COMMENT"
  | "REPORT"
  | "EDIT"
  | "DELETE"
  | "MODERATE";

export interface CommunityPostCardAuthor {
  readonly id?: string;
  readonly nickname: string;
  readonly displayName?: string;
  readonly level?: number;
  readonly score?: number;
  readonly profileImageUrl?: string;
  readonly displayMode?:
    | "NICKNAME"
    | "ANONYMOUS"
    | "ADMIN"
    | "SYSTEM"
    | "WITHDRAWN";
  readonly badgeLabel?: string;
}

export interface CommunityPostCardTag {
  readonly id?: string;
  readonly slug: string;
  readonly nameKo: string;
  readonly active?: boolean;
}

export interface CommunityPostCardCounts {
  readonly viewCount?: number;
  readonly commentCount?: number;
  readonly reactionCount?: number;
  readonly bookmarkCount?: number;
  readonly shareCount?: number;
  readonly reportCount?: number;
  readonly likeCount?: number;
}

export interface CommunityPostCardReactionSummary {
  readonly like?: number;
  readonly empathy?: number;
  readonly cheer?: number;
  readonly thanks?: number;
  readonly useful?: number;
  readonly savedMoney?: number;
  readonly levelUp?: number;
}

export interface CommunityPostCardViewerState {
  readonly reactedTypes?: readonly CommunityPostCardReactionType[];
  readonly bookmarked?: boolean;
  readonly reported?: boolean;
  readonly editable?: boolean;
  readonly deletable?: boolean;
  readonly commentWritable?: boolean;
  readonly blockedByViewer?: boolean;
  readonly mutedByViewer?: boolean;
}

export interface CommunityPostCardPolicy {
  readonly rawFinancialSourceDataIncluded?: boolean;
  readonly rawTokenIncluded?: boolean;
  readonly rawSecretIncluded?: boolean;
  readonly rawPiiIncluded?: boolean;
  readonly adsFinancialJoinAllowed?: boolean;
  readonly communityFinancialJoinAllowed?: boolean;
}

export interface CommunityPostCardModerationState {
  readonly lockedComments?: boolean;
  readonly riskScore?: number;
  readonly reportThresholdExceeded?: boolean;
  readonly policyLabels?: readonly string[];
  readonly moderationReason?: string;
}

export interface CommunityPostCardAttachmentPreview {
  readonly type: "IMAGE" | "DOCUMENT" | "LINK" | "OTHER" | string;
  readonly url?: string;
  readonly altText?: string;
  readonly fileName?: string;
  readonly width?: number;
  readonly height?: number;
  readonly scanStatus?: "PENDING" | "CLEAN" | "BLOCKED" | "FAILED" | string;
}

export interface CommunityPostCardPost {
  readonly id: string;
  readonly board: CommunityPostCardBoard;
  readonly status: CommunityPostCardStatus;
  readonly visibility?: CommunityPostCardVisibility;
  readonly title: string;
  readonly excerpt?: string;
  readonly body?: string;
  readonly slug?: string;
  readonly author: CommunityPostCardAuthor;
  readonly tags?: readonly CommunityPostCardTag[];
  readonly counts?: CommunityPostCardCounts;
  readonly reactions?: CommunityPostCardReactionSummary;
  readonly viewerState?: CommunityPostCardViewerState;
  readonly policy?: CommunityPostCardPolicy;
  readonly isAnonymous?: boolean;
  readonly isQuestion?: boolean;
  readonly isAnswered?: boolean;
  readonly pinned?: boolean;
  readonly locked?: boolean;
  readonly qualityScore?: number;
  readonly publishedAt?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly attachments?: readonly CommunityPostCardAttachmentPreview[];
  readonly moderation?: CommunityPostCardModerationState;
}

export interface CommunityPostCardActionContext {
  readonly postId: string;
  readonly board: CommunityPostCardBoard;
  readonly status: CommunityPostCardStatus;
  readonly source: typeof COMMUNITY_POST_CARD_COMPONENT_NAME;
}

export interface CommunityPostCardActionDescriptor {
  readonly kind: CommunityPostCardActionKind;
  readonly label: string;
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly active: boolean;
  readonly context: CommunityPostCardActionContext;
  readonly reactionType?: CommunityPostCardReactionType;
  readonly tag?: CommunityPostCardTag;
  readonly authorId?: string;
  readonly run?: () => void;
}

export type CommunityPostCardStyle = Readonly<Record<string, string | number>>;
export type CommunityPostCardAttributes = Readonly<
  Record<string, string | number | boolean>
>;

export interface CommunityPostCardRenderNode {
  readonly type:
    | "article"
    | "header"
    | "section"
    | "footer"
    | "aside"
    | "row"
    | "cluster"
    | "badge"
    | "title"
    | "text"
    | "metric"
    | "avatar"
    | "tag"
    | "attachment"
    | "button";
  readonly key: string;
  readonly text?: string;
  readonly style?: CommunityPostCardStyle;
  readonly attributes?: CommunityPostCardAttributes;
  readonly action?: CommunityPostCardActionDescriptor;
  readonly children?: readonly CommunityPostCardRenderNode[];
}

export interface CommunityPostCardRenderTree {
  readonly component: typeof COMMUNITY_POST_CARD_COMPONENT_NAME;
  readonly contractVersion: typeof COMMUNITY_POST_CARD_CONTRACT_VERSION;
  readonly root: CommunityPostCardRenderNode;
  readonly model: CommunityPostCardViewModel;
  readonly actions: readonly CommunityPostCardActionDescriptor[];
}

export interface CommunityPostCardProps {
  readonly post: CommunityPostCardPost;
  readonly variant?: CommunityPostCardVariant;
  readonly tone?: CommunityPostCardTone;
  readonly density?: CommunityPostCardDensity;
  readonly size?: CommunityPostCardSize;
  readonly selected?: boolean;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CommunityPostCardStyle;
  readonly testId?: string;
  readonly maxExcerptLength?: number;
  readonly showBoard?: boolean;
  readonly showAuthor?: boolean;
  readonly showTags?: boolean;
  readonly showStats?: boolean;
  readonly showModeration?: boolean;
  readonly showAttachments?: boolean;
  readonly preferredReactionType?: CommunityPostCardReactionType;
  readonly emptyText?: string;
  readonly openLabel?: string;
  readonly onOpen?: (context: CommunityPostCardActionContext) => void;
  readonly onAuthorPress?: (
    authorId: string | undefined,
    context: CommunityPostCardActionContext,
  ) => void;
  readonly onBoardPress?: (
    board: CommunityPostCardBoard,
    context: CommunityPostCardActionContext,
  ) => void;
  readonly onTagPress?: (
    tag: CommunityPostCardTag,
    context: CommunityPostCardActionContext,
  ) => void;
  readonly onReact?: (
    reactionType: CommunityPostCardReactionType,
    context: CommunityPostCardActionContext,
  ) => void;
  readonly onBookmark?: (context: CommunityPostCardActionContext) => void;
  readonly onShare?: (context: CommunityPostCardActionContext) => void;
  readonly onComment?: (context: CommunityPostCardActionContext) => void;
  readonly onReport?: (context: CommunityPostCardActionContext) => void;
  readonly onEdit?: (context: CommunityPostCardActionContext) => void;
  readonly onDelete?: (context: CommunityPostCardActionContext) => void;
  readonly onModerate?: (context: CommunityPostCardActionContext) => void;
}

export interface CommunityBoardDescriptorForCard {
  readonly board: CommunityPostCardBoard;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
}

export interface CommunityPostStatusDescriptorForCard {
  readonly status: CommunityPostCardStatus;
  readonly label: string;
  readonly tone: CommunityPostCardTone;
  readonly publicReadable: boolean;
  readonly actionDisabled: boolean;
}

export interface CommunityPostCardModelOptions {
  readonly disabled?: boolean | undefined;
  readonly maxExcerptLength?: number | undefined;
  readonly preferredReactionType?: CommunityPostCardReactionType | undefined;
}

export interface CommunityPostCardViewModel {
  readonly context: CommunityPostCardActionContext;
  readonly board: CommunityBoardDescriptorForCard;
  readonly status: CommunityPostStatusDescriptorForCard;
  readonly title: string;
  readonly excerpt: string;
  readonly authorName: string;
  readonly authorMeta: string;
  readonly publishedLabel: string;
  readonly counts: Required<CommunityPostCardCounts>;
  readonly reactions: Required<CommunityPostCardReactionSummary>;
  readonly viewerState: Required<
    Pick<
      CommunityPostCardViewerState,
      "bookmarked" | "reported" | "editable" | "deletable" | "commentWritable"
    >
  > & {
    readonly reactedTypes: readonly CommunityPostCardReactionType[];
    readonly blockedByViewer: boolean;
    readonly mutedByViewer: boolean;
  };
  readonly primaryReactionType: CommunityPostCardReactionType;
  readonly primaryReactionLabel: string;
  readonly hasUnsafePolicy: boolean;
  readonly hasAttachments: boolean;
  readonly isEngagementDisabled: boolean;
  readonly accessibilityLabel: string;
}

const BOARD_DESCRIPTORS: Readonly<
  Record<CommunityPostCardBoard, CommunityBoardDescriptorForCard>
> = Object.freeze({
  ALL: {
    board: "ALL",
    label: "전체 게시판",
    shortLabel: "전체",
    description: "급여납치 커뮤니티 전체 글",
  },
  FREE: {
    board: "FREE",
    label: "자유 게시판",
    shortLabel: "자유",
    description: "직장인 일상과 루틴 공유",
  },
  LEVEL_UP_CERTIFICATION: {
    board: "LEVEL_UP_CERTIFICATION",
    label: "레벨업 인증",
    shortLabel: "LV UP",
    description: "독서·뉴스·영어·건강 미션 인증",
  },
  CONSUMPTION_CONTROL: {
    board: "CONSUMPTION_CONTROL",
    label: "소비통제",
    shortLabel: "소비통제",
    description: "일일예산과 무지출 챌린지 공유",
  },
  SAVING_TIP: {
    board: "SAVING_TIP",
    label: "저축 팁",
    shortLabel: "저축",
    description: "고정저축과 목표 달성 팁",
  },
  SALARY_TALK: {
    board: "SALARY_TALK",
    label: "월급 이야기",
    shortLabel: "월급",
    description: "급여일 루틴과 계획 공유",
  },
  HOBBY: {
    board: "HOBBY",
    label: "취미 게시판",
    shortLabel: "취미",
    description: "저비용 취미와 자기관리 공유",
  },
  NOTICE: {
    board: "NOTICE",
    label: "공지사항",
    shortLabel: "공지",
    description: "운영 공지",
  },
  EVENT: {
    board: "EVENT",
    label: "이벤트",
    shortLabel: "이벤트",
    description: "포인트와 제휴 이벤트",
  },
  FAQ: {
    board: "FAQ",
    label: "FAQ",
    shortLabel: "FAQ",
    description: "자주 묻는 질문",
  },
});

const STATUS_DESCRIPTORS: Readonly<
  Record<CommunityPostCardStatus, CommunityPostStatusDescriptorForCard>
> = Object.freeze({
  DRAFT: {
    status: "DRAFT",
    label: "임시저장",
    tone: "subtle",
    publicReadable: false,
    actionDisabled: true,
  },
  PENDING_REVIEW: {
    status: "PENDING_REVIEW",
    label: "검토중",
    tone: "subtle",
    publicReadable: false,
    actionDisabled: true,
  },
  PUBLISHED: {
    status: "PUBLISHED",
    label: "게시중",
    tone: "success",
    publicReadable: true,
    actionDisabled: false,
  },
  HIDDEN: {
    status: "HIDDEN",
    label: "숨김",
    tone: "danger",
    publicReadable: false,
    actionDisabled: true,
  },
  REPORTED: {
    status: "REPORTED",
    label: "신고됨",
    tone: "danger",
    publicReadable: true,
    actionDisabled: false,
  },
  BLINDED: {
    status: "BLINDED",
    label: "블라인드",
    tone: "danger",
    publicReadable: false,
    actionDisabled: true,
  },
  BLOCKED: {
    status: "BLOCKED",
    label: "차단",
    tone: "danger",
    publicReadable: false,
    actionDisabled: true,
  },
  LOCKED: {
    status: "LOCKED",
    label: "댓글 잠김",
    tone: "subtle",
    publicReadable: true,
    actionDisabled: false,
  },
  ARCHIVED: {
    status: "ARCHIVED",
    label: "보관됨",
    tone: "subtle",
    publicReadable: false,
    actionDisabled: true,
  },
  DELETED: {
    status: "DELETED",
    label: "삭제됨",
    tone: "danger",
    publicReadable: false,
    actionDisabled: true,
  },
});

const REACTION_LABELS: Readonly<Record<CommunityPostCardReactionType, string>> =
  Object.freeze({
    LIKE: "좋아요",
    EMPATHY: "공감",
    CHEER: "응원",
    THANKS: "고마워요",
    USEFUL: "유용해요",
    SAVED_MONEY: "절약했어요",
    LEVEL_UP: "레벨업",
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
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  warning: "#d97706",
  warningSoft: "#fef3c7",
});

const spacing = Object.freeze({ xs: 4, sm: 8, md: 12, lg: 16 });

const normalizeNonNegativeInteger = (value: number | undefined): number => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value)
  )
    return 0;
  return Math.max(0, Math.trunc(value));
};

const normalizeCounts = (
  counts: CommunityPostCardCounts | undefined,
): Required<CommunityPostCardCounts> => ({
  viewCount: normalizeNonNegativeInteger(counts?.viewCount),
  commentCount: normalizeNonNegativeInteger(counts?.commentCount),
  reactionCount: normalizeNonNegativeInteger(counts?.reactionCount),
  bookmarkCount: normalizeNonNegativeInteger(counts?.bookmarkCount),
  shareCount: normalizeNonNegativeInteger(counts?.shareCount),
  reportCount: normalizeNonNegativeInteger(counts?.reportCount),
  likeCount: normalizeNonNegativeInteger(counts?.likeCount),
});

const normalizeReactions = (
  reactions: CommunityPostCardReactionSummary | undefined,
): Required<CommunityPostCardReactionSummary> => ({
  like: normalizeNonNegativeInteger(reactions?.like),
  empathy: normalizeNonNegativeInteger(reactions?.empathy),
  cheer: normalizeNonNegativeInteger(reactions?.cheer),
  thanks: normalizeNonNegativeInteger(reactions?.thanks),
  useful: normalizeNonNegativeInteger(reactions?.useful),
  savedMoney: normalizeNonNegativeInteger(reactions?.savedMoney),
  levelUp: normalizeNonNegativeInteger(reactions?.levelUp),
});

const normalizeViewerState = (
  viewerState: CommunityPostCardViewerState | undefined,
): CommunityPostCardViewModel["viewerState"] => ({
  reactedTypes: viewerState?.reactedTypes ?? [],
  bookmarked: viewerState?.bookmarked ?? false,
  reported: viewerState?.reported ?? false,
  editable: viewerState?.editable ?? false,
  deletable: viewerState?.deletable ?? false,
  commentWritable: viewerState?.commentWritable ?? false,
  blockedByViewer: viewerState?.blockedByViewer ?? false,
  mutedByViewer: viewerState?.mutedByViewer ?? false,
});

const sanitizeCommunityText = (
  value: string | undefined,
  fallback = "",
): string =>
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
    .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, "[카드번호 보호]")
    .replace(/\b\d{2,6}[- ]?\d{2,6}[- ]?\d{2,8}\b/g, "[계좌/식별번호 보호]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일 보호]")
    .replace(/01[016789][- ]?\d{3,4}[- ]?\d{4}/g, "[연락처 보호]");

const safeDisplayText = (
  value: string | undefined,
  fallback: string,
  maxLength: number,
): string => {
  const text = maskSensitiveText(sanitizeCommunityText(value, fallback));
  return text.length <= maxLength
    ? text
    : `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const hasUnsafePolicy = (
  policy: CommunityPostCardPolicy | undefined,
): boolean =>
  policy?.rawFinancialSourceDataIncluded === true ||
  policy?.rawTokenIncluded === true ||
  policy?.rawSecretIncluded === true ||
  policy?.rawPiiIncluded === true ||
  policy?.adsFinancialJoinAllowed === true ||
  policy?.communityFinancialJoinAllowed === true;

const formatNumberKo = (value: number): string => {
  try {
    return new Intl.NumberFormat(COMMUNITY_POST_CARD_LOCALE).format(value);
  } catch {
    return String(value);
  }
};

const formatDateTimeKo = (value: string | undefined): string => {
  if (!value) return "방금 전";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금 전";
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  try {
    return new Intl.DateTimeFormat(COMMUNITY_POST_CARD_LOCALE, {
      month: "short",
      day: "numeric",
      timeZone: COMMUNITY_POST_CARD_TIMEZONE,
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

const getAuthorName = (post: CommunityPostCardPost): string => {
  if (post.isAnonymous || post.author.displayMode === "ANONYMOUS")
    return "익명 납치러";
  if (post.author.displayMode === "ADMIN")
    return post.author.displayName ?? "운영자";
  if (post.author.displayMode === "SYSTEM") return "급여납치 시스템";
  if (post.author.displayMode === "WITHDRAWN") return "탈퇴한 사용자";
  return post.author.displayName ?? post.author.nickname;
};

const getAuthorMeta = (author: CommunityPostCardAuthor): string =>
  [
    typeof author.level === "number"
      ? `Lv.${Math.max(1, Math.trunc(author.level))}`
      : undefined,
    author.badgeLabel,
  ]
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(" · ");

const getToneStyle = (tone: CommunityPostCardTone): CommunityPostCardStyle => {
  if (tone === "danger")
    return {
      background: palette.dangerSoft,
      color: palette.danger,
      borderColor: "#fecaca",
    };
  if (tone === "success")
    return {
      background: palette.successSoft,
      color: palette.success,
      borderColor: "#bbf7d0",
    };
  if (tone === "elevated")
    return {
      background: palette.primarySoft,
      color: palette.primary,
      borderColor: "#bfdbfe",
    };
  return {
    background: palette.surfaceSubtle,
    color: palette.muted,
    borderColor: palette.border,
  };
};

const badgeStyle = (tone: CommunityPostCardTone): CommunityPostCardStyle => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 8px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1,
  whiteSpace: "nowrap",
  ...getToneStyle(tone),
});

const buttonStyle = (
  active: boolean,
  disabled: boolean,
): CommunityPostCardStyle => ({
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
      ? palette.primarySoft
      : palette.surface,
  color: disabled ? palette.faint : active ? palette.primary : palette.text,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
});

const cardStyle = (
  variant: CommunityPostCardVariant,
  tone: CommunityPostCardTone,
  density: CommunityPostCardDensity,
  size: CommunityPostCardSize,
  selected: boolean,
): CommunityPostCardStyle => ({
  width: "100%",
  boxSizing: "border-box",
  display: "grid",
  gap: density === "compact" ? spacing.sm : spacing.md,
  padding: density === "compact" ? spacing.md : spacing.lg,
  borderRadius: variant === "compact" ? 16 : 20,
  border: `1px solid ${selected ? palette.primary : tone === "danger" ? "#fecaca" : palette.border}`,
  background: tone === "subtle" ? palette.surfaceElevated : palette.surface,
  boxShadow:
    tone === "elevated" || selected
      ? "0 14px 35px rgba(15, 23, 42, 0.10)"
      : "0 1px 2px rgba(15, 23, 42, 0.04)",
  color: palette.text,
  fontFamily:
    "Pretendard, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: size === "sm" ? 13 : size === "lg" ? 16 : 14,
  lineHeight: 1.45,
});

const metaRowStyle: CommunityPostCardStyle = Object.freeze({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: spacing.sm,
  minWidth: 0,
});
const mutedStyle: CommunityPostCardStyle = Object.freeze({
  color: palette.muted,
  fontSize: 13,
});

const buildActionContext = (
  post: CommunityPostCardPost,
): CommunityPostCardActionContext => ({
  postId: post.id,
  board: post.board,
  status: post.status,
  source: COMMUNITY_POST_CARD_COMPONENT_NAME,
});

const accessibilityLabel = (
  model: Omit<CommunityPostCardViewModel, "accessibilityLabel">,
): string =>
  [
    model.board.shortLabel,
    model.status.publicReadable ? undefined : model.status.label,
    model.title,
    model.authorName,
    `${model.counts.commentCount}개 댓글`,
    `${model.counts.reactionCount}개 반응`,
  ]
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(", ");

export const createCommunityPostCardViewModel = (
  post: CommunityPostCardPost,
  options: CommunityPostCardModelOptions = {},
): CommunityPostCardViewModel => {
  const board = BOARD_DESCRIPTORS[post.board];
  const status = STATUS_DESCRIPTORS[post.status];
  const counts = normalizeCounts(post.counts);
  const reactions = normalizeReactions(post.reactions);
  const viewerState = normalizeViewerState(post.viewerState);
  const primaryReactionType =
    options.preferredReactionType ??
    (post.board === "LEVEL_UP_CERTIFICATION" ? "LEVEL_UP" : "LIKE");
  const unsafePolicy = hasUnsafePolicy(post.policy);

  const base = {
    context: buildActionContext(post),
    board,
    status,
    title: safeDisplayText(post.title, "제목 없음", 96),
    excerpt: safeDisplayText(
      post.excerpt ?? post.body,
      "내용 미리보기가 없습니다.",
      options.maxExcerptLength ?? 140,
    ),
    authorName: safeDisplayText(getAuthorName(post), "익명 납치러", 40),
    authorMeta: safeDisplayText(getAuthorMeta(post.author), "", 40),
    publishedLabel: formatDateTimeKo(
      post.publishedAt ?? post.createdAt ?? post.updatedAt,
    ),
    counts,
    reactions,
    viewerState,
    primaryReactionType,
    primaryReactionLabel: REACTION_LABELS[primaryReactionType],
    hasUnsafePolicy: unsafePolicy,
    hasAttachments: (post.attachments?.length ?? 0) > 0,
    isEngagementDisabled:
      status.actionDisabled ||
      post.locked === true ||
      unsafePolicy ||
      options.disabled === true,
  } satisfies Omit<CommunityPostCardViewModel, "accessibilityLabel">;

  return { ...base, accessibilityLabel: accessibilityLabel(base) };
};

const action = (input: {
  readonly kind: CommunityPostCardActionKind;
  readonly label: string;
  readonly ariaLabel: string;
  readonly disabled: boolean;
  readonly active?: boolean;
  readonly context: CommunityPostCardActionContext;
  readonly run?: (() => void) | undefined;
  readonly reactionType?: CommunityPostCardReactionType | undefined;
  readonly tag?: CommunityPostCardTag | undefined;
  readonly authorId?: string | undefined;
}): CommunityPostCardActionDescriptor => ({
  kind: input.kind,
  label: input.label,
  ariaLabel: input.ariaLabel,
  disabled: input.disabled,
  active: input.active ?? false,
  context: input.context,
  ...(input.run === undefined ? {} : { run: input.run }),
  ...(input.reactionType === undefined
    ? {}
    : { reactionType: input.reactionType }),
  ...(input.tag === undefined ? {} : { tag: input.tag }),
  ...(input.authorId === undefined ? {} : { authorId: input.authorId }),
});

const node = (input: {
  readonly type: CommunityPostCardRenderNode["type"];
  readonly key: string;
  readonly text?: string | undefined;
  readonly style?: CommunityPostCardStyle | undefined;
  readonly attributes?: CommunityPostCardAttributes | undefined;
  readonly action?: CommunityPostCardActionDescriptor | undefined;
  readonly children?: readonly CommunityPostCardRenderNode[] | undefined;
}): CommunityPostCardRenderNode => ({
  type: input.type,
  key: input.key,
  ...(input.text === undefined ? {} : { text: input.text }),
  ...(input.style === undefined ? {} : { style: input.style }),
  ...(input.attributes === undefined ? {} : { attributes: input.attributes }),
  ...(input.action === undefined ? {} : { action: input.action }),
  ...(input.children === undefined ? {} : { children: input.children }),
});

const makeActions = (
  props: CommunityPostCardProps,
  model: CommunityPostCardViewModel,
): readonly CommunityPostCardActionDescriptor[] => {
  const softDisabled = props.disabled === true || props.loading === true;
  const hardDisabled = softDisabled || model.isEngagementDisabled;
  const ctx = model.context;
  const actions: CommunityPostCardActionDescriptor[] = [
    action({
      kind: "OPEN",
      label: props.openLabel ?? "게시글 열기",
      ariaLabel: `${props.openLabel ?? "게시글 열기"}: ${model.title}`,
      disabled: softDisabled,
      context: ctx,
      run: props.onOpen ? () => props.onOpen?.(ctx) : undefined,
    }),
    action({
      kind: "BOARD_PRESS",
      label: model.board.shortLabel,
      ariaLabel: `${model.board.label} 열기`,
      disabled: softDisabled,
      context: ctx,
      run: props.onBoardPress
        ? () => props.onBoardPress?.(props.post.board, ctx)
        : undefined,
    }),
    action({
      kind: "AUTHOR_PRESS",
      label: model.authorName,
      ariaLabel: `작성자 ${model.authorName}`,
      disabled: softDisabled || !props.post.author.id,
      context: ctx,
      authorId: props.post.author.id,
      run: props.onAuthorPress
        ? () => props.onAuthorPress?.(props.post.author.id, ctx)
        : undefined,
    }),
    action({
      kind: "REACT",
      label: model.primaryReactionLabel,
      ariaLabel: `${model.primaryReactionLabel} 반응`,
      disabled: hardDisabled,
      active: model.viewerState.reactedTypes.includes(
        model.primaryReactionType,
      ),
      context: ctx,
      reactionType: model.primaryReactionType,
      run: props.onReact
        ? () => props.onReact?.(model.primaryReactionType, ctx)
        : undefined,
    }),
    action({
      kind: "COMMENT",
      label: `댓글 ${formatNumberKo(model.counts.commentCount)}`,
      ariaLabel: `댓글 ${formatNumberKo(model.counts.commentCount)}개 보기`,
      disabled: hardDisabled || !model.viewerState.commentWritable,
      context: ctx,
      run: props.onComment ? () => props.onComment?.(ctx) : undefined,
    }),
    action({
      kind: "BOOKMARK",
      label: model.viewerState.bookmarked ? "저장됨" : "저장",
      ariaLabel: model.viewerState.bookmarked ? "저장 취소" : "게시글 저장",
      disabled: softDisabled,
      active: model.viewerState.bookmarked,
      context: ctx,
      run: props.onBookmark ? () => props.onBookmark?.(ctx) : undefined,
    }),
    action({
      kind: "SHARE",
      label: "공유",
      ariaLabel: "게시글 공유",
      disabled: softDisabled,
      context: ctx,
      run: props.onShare ? () => props.onShare?.(ctx) : undefined,
    }),
  ];

  if (model.viewerState.editable)
    actions.push(
      action({
        kind: "EDIT",
        label: "수정",
        ariaLabel: "게시글 수정",
        disabled: softDisabled,
        context: ctx,
        run: props.onEdit ? () => props.onEdit?.(ctx) : undefined,
      }),
    );
  if (model.viewerState.deletable)
    actions.push(
      action({
        kind: "DELETE",
        label: "삭제",
        ariaLabel: "게시글 삭제",
        disabled: softDisabled,
        context: ctx,
        run: props.onDelete ? () => props.onDelete?.(ctx) : undefined,
      }),
    );

  if (props.variant === "admin" || props.showModeration === true) {
    actions.push(
      action({
        kind: "MODERATE",
        label: "운영 검토",
        ariaLabel: "운영 검토 열기",
        disabled: softDisabled,
        context: ctx,
        run: props.onModerate ? () => props.onModerate?.(ctx) : undefined,
      }),
    );
  } else {
    actions.push(
      action({
        kind: "REPORT",
        label: model.viewerState.reported ? "신고됨" : "신고",
        ariaLabel: model.viewerState.reported
          ? "이미 신고한 게시글"
          : "게시글 신고",
        disabled: softDisabled || model.viewerState.reported,
        active: model.viewerState.reported,
        context: ctx,
        run: props.onReport ? () => props.onReport?.(ctx) : undefined,
      }),
    );
  }

  for (const tag of (props.post.tags ?? [])
    .filter((item) => item.active !== false)
    .slice(0, 6)) {
    actions.push(
      action({
        kind: "TAG_PRESS",
        label: `#${safeDisplayText(tag.nameKo, tag.slug, 20)}`,
        ariaLabel: `태그 ${safeDisplayText(tag.nameKo, tag.slug, 20)} 열기`,
        disabled: softDisabled,
        context: ctx,
        tag,
        run: props.onTagPress ? () => props.onTagPress?.(tag, ctx) : undefined,
      }),
    );
  }

  return actions;
};

const findAction = (
  actions: readonly CommunityPostCardActionDescriptor[],
  kind: CommunityPostCardActionKind,
): CommunityPostCardActionDescriptor | undefined =>
  actions.find((item) => item.kind === kind);

const metric = (
  key: string,
  label: string,
  value: number,
): CommunityPostCardRenderNode =>
  node({
    type: "metric",
    key,
    text: `${label} ${formatNumberKo(value)}`,
    style: mutedStyle,
    attributes: { "aria-label": `${label} ${formatNumberKo(value)}` },
  });

export const createCommunityPostCardRenderTree = (
  props: CommunityPostCardProps,
): CommunityPostCardRenderTree => {
  const variant = props.variant ?? "feed";
  const tone = props.tone ?? "default";
  const density = props.density ?? "comfortable";
  const size = props.size ?? "md";
  const selected = props.selected ?? false;
  const loading = props.loading ?? false;
  const disabled = props.disabled ?? false;
  const model = createCommunityPostCardViewModel(props.post, {
    disabled,
    maxExcerptLength: props.maxExcerptLength,
    preferredReactionType: props.preferredReactionType,
  });
  const actions = makeActions(props, model);
  const rootStyle = {
    ...cardStyle(variant, tone, density, size, selected),
    ...(props.style ?? {}),
  };
  const canShowAdminActions =
    variant === "admin" || props.showModeration === true;

  if (model.hasUnsafePolicy) {
    const moderate = findAction(actions, "MODERATE");
    return {
      component: COMMUNITY_POST_CARD_COMPONENT_NAME,
      contractVersion: COMMUNITY_POST_CARD_CONTRACT_VERSION,
      model,
      actions,
      root: node({
        type: "article",
        key: `${props.post.id}:policy-blocked`,
        style: {
          ...rootStyle,
          borderColor: "#fecaca",
          background: palette.dangerSoft,
        },
        attributes: {
          "data-testid": props.testId ?? "community-post-card-policy-blocked",
          "data-component": COMMUNITY_POST_CARD_COMPONENT_NAME,
          "aria-label": "정책 위반 가능성이 있어 숨겨진 커뮤니티 게시글",
          "aria-busy": loading,
        },
        children: [
          node({
            type: "title",
            key: "policy-title",
            text: "보호 정책에 의해 숨겨진 게시글입니다.",
            style: { color: palette.danger, fontWeight: 900 },
          }),
          node({
            type: "text",
            key: "policy-body",
            text: "급여·지출·저축 원천 데이터, 개인정보, 토큰 또는 광고 타겟팅 결합 정보가 포함된 payload는 UI에 표시하지 않습니다.",
            style: mutedStyle,
          }),
          ...(canShowAdminActions && moderate
            ? [
                node({
                  type: "button",
                  key: "policy-moderate",
                  text: moderate.label,
                  style: buttonStyle(false, disabled || loading),
                  action: moderate,
                }),
              ]
            : []),
        ],
      }),
    };
  }

  const open = findAction(actions, "OPEN");
  const board = findAction(actions, "BOARD_PRESS");
  const author = findAction(actions, "AUTHOR_PRESS");
  const react = findAction(actions, "REACT");
  const comment = findAction(actions, "COMMENT");
  const bookmark = findAction(actions, "BOOKMARK");
  const share = findAction(actions, "SHARE");
  const edit = findAction(actions, "EDIT");
  const remove = findAction(actions, "DELETE");
  const moderate = findAction(actions, "MODERATE");
  const report = findAction(actions, "REPORT");
  const tagActions = actions.filter((item) => item.kind === "TAG_PRESS");

  const badges: CommunityPostCardRenderNode[] = [];
  if (props.showBoard !== false && board)
    badges.push(
      node({
        type: "button",
        key: "board",
        text: model.board.shortLabel,
        style: badgeStyle(
          props.post.board === "LEVEL_UP_CERTIFICATION" ? "elevated" : "subtle",
        ),
        action: board,
      }),
    );
  if (props.post.pinned === true)
    badges.push(
      node({
        type: "badge",
        key: "pinned",
        text: "고정",
        style: badgeStyle("elevated"),
      }),
    );
  if (props.post.isQuestion === true)
    badges.push(
      node({
        type: "badge",
        key: "question",
        text: props.post.isAnswered ? "답변완료" : "질문",
        style: badgeStyle(props.post.isAnswered ? "success" : "subtle"),
      }),
    );
  if (!model.status.publicReadable)
    badges.push(
      node({
        type: "badge",
        key: "status",
        text: model.status.label,
        style: badgeStyle(model.status.tone),
      }),
    );
  if (props.post.locked === true)
    badges.push(
      node({
        type: "badge",
        key: "locked",
        text: "댓글 잠김",
        style: badgeStyle("subtle"),
      }),
    );

  const children: CommunityPostCardRenderNode[] = [
    node({
      type: "header",
      key: "header",
      style: { display: "grid", gap: spacing.sm },
      children: [
        node({
          type: "cluster",
          key: "badges",
          style: { ...metaRowStyle, justifyContent: "space-between" },
          children: badges,
        }),
        node({
          type: "text",
          key: "published",
          text: model.publishedLabel,
          style: mutedStyle,
          attributes: {
            dateTime:
              props.post.publishedAt ??
              props.post.createdAt ??
              props.post.updatedAt ??
              "",
          },
        }),
        node({
          type: "button",
          key: "open-title",
          text: loading
            ? "게시글을 불러오는 중입니다."
            : model.title ||
              (props.emptyText ?? "표시할 게시글 내용이 없습니다."),
          style: {
            color: palette.text,
            fontSize: size === "lg" ? 20 : size === "sm" ? 15 : 17,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            lineHeight: 1.28,
          },
          action: open,
        }),
        ...(variant === "compact"
          ? []
          : [
              node({
                type: "text",
                key: "excerpt",
                text: loading
                  ? "잠시만 기다려 주세요."
                  : model.excerpt ||
                    (props.emptyText ?? "표시할 게시글 내용이 없습니다."),
                style: {
                  margin: 0,
                  color: palette.muted,
                  fontSize: size === "lg" ? 15 : 14,
                },
              }),
            ]),
      ],
    }),
  ];

  if (props.showAuthor !== false) {
    children.push(
      node({
        type: "row",
        key: "author-row",
        style: {
          ...metaRowStyle,
          justifyContent: "space-between",
          borderTop: `1px solid ${palette.border}`,
          paddingTop: spacing.sm,
        },
        children: [
          node({
            type: "avatar",
            key: "author-avatar",
            text: model.authorName.slice(0, 1),
            style: {
              width: 34,
              height: 34,
              borderRadius: 999,
              background: palette.primarySoft,
              color: palette.primary,
              fontWeight: 900,
            },
            action: author,
          }),
          node({
            type: "text",
            key: "author-name",
            text: model.authorMeta
              ? `${model.authorName} · ${model.authorMeta}`
              : model.authorName,
            style: { color: palette.text, fontSize: 13, fontWeight: 800 },
            action: author,
          }),
          ...(props.post.qualityScore === undefined
            ? []
            : [
                node({
                  type: "text",
                  key: "quality",
                  text: `품질 ${Math.max(0, Math.min(100, Math.round(props.post.qualityScore)))}점`,
                  style: mutedStyle,
                }),
              ]),
        ],
      }),
    );
  }

  if (props.showAttachments !== false && model.hasAttachments) {
    children.push(
      node({
        type: "cluster",
        key: "attachments",
        style: { display: "flex", flexWrap: "wrap", gap: spacing.sm },
        children: (props.post.attachments ?? [])
          .slice(0, 3)
          .map((attachment, index) =>
            node({
              type: "attachment",
              key: `${props.post.id}:attachment:${index}`,
              text: `첨부 ${index + 1}${attachment.scanStatus && attachment.scanStatus !== "CLEAN" ? ` · ${attachment.scanStatus}` : ""}`,
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 9px",
                borderRadius: 12,
                background: palette.surfaceElevated,
                color: palette.muted,
                border: `1px solid ${palette.border}`,
                fontSize: 12,
                fontWeight: 700,
              },
            }),
          ),
      }),
    );
  }

  if (props.showTags !== false && tagActions.length > 0) {
    children.push(
      node({
        type: "cluster",
        key: "tags",
        style: { display: "flex", flexWrap: "wrap", gap: spacing.sm },
        children: tagActions.map((tagAction, index) =>
          node({
            type: "tag",
            key: `${props.post.id}:tag:${index}`,
            text: tagAction.label,
            style: {
              display: "inline-flex",
              alignItems: "center",
              minHeight: 28,
              padding: "5px 8px",
              borderRadius: 999,
              border: `1px solid ${palette.border}`,
              background: palette.surfaceElevated,
              color: palette.muted,
              fontSize: 12,
              fontWeight: 700,
              cursor: tagAction.disabled ? "not-allowed" : "pointer",
            },
            action: tagAction,
          }),
        ),
      }),
    );
  }

  if (props.showStats !== false) {
    children.push(
      node({
        type: "row",
        key: "stats",
        style: { ...metaRowStyle, justifyContent: "space-between" },
        children: [
          metric("views", "조회", model.counts.viewCount),
          metric("comments", "댓글", model.counts.commentCount),
          metric("reactions", "반응", model.counts.reactionCount),
          ...(model.counts.reportCount > 0 && canShowAdminActions
            ? [metric("reports", "신고", model.counts.reportCount)]
            : []),
        ],
      }),
    );
  }

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
      children: [
        ...(react
          ? [
              node({
                type: "button",
                key: "react",
                text: `${model.primaryReactionLabel} ${formatNumberKo(model.reactions.like + model.reactions.levelUp + model.reactions.savedMoney)}`,
                style: buttonStyle(react.active, react.disabled),
                action: react,
              }),
            ]
          : []),
        ...(comment
          ? [
              node({
                type: "button",
                key: "comment",
                text: comment.label,
                style: buttonStyle(comment.active, comment.disabled),
                action: comment,
              }),
            ]
          : []),
        ...(bookmark
          ? [
              node({
                type: "button",
                key: "bookmark",
                text: bookmark.label,
                style: buttonStyle(bookmark.active, bookmark.disabled),
                action: bookmark,
              }),
            ]
          : []),
        ...(share
          ? [
              node({
                type: "button",
                key: "share",
                text: share.label,
                style: buttonStyle(share.active, share.disabled),
                action: share,
              }),
            ]
          : []),
        ...(edit
          ? [
              node({
                type: "button",
                key: "edit",
                text: edit.label,
                style: buttonStyle(edit.active, edit.disabled),
                action: edit,
              }),
            ]
          : []),
        ...(remove
          ? [
              node({
                type: "button",
                key: "delete",
                text: remove.label,
                style: buttonStyle(remove.active, remove.disabled),
                action: remove,
              }),
            ]
          : []),
        ...(moderate
          ? [
              node({
                type: "button",
                key: "moderate",
                text: moderate.label,
                style: buttonStyle(moderate.active, moderate.disabled),
                action: moderate,
              }),
            ]
          : []),
        ...(report
          ? [
              node({
                type: "button",
                key: "report",
                text: report.label,
                style: buttonStyle(report.active, report.disabled),
                action: report,
              }),
            ]
          : []),
      ],
    }),
  );

  if (props.showModeration === true && props.post.moderation) {
    children.push(
      node({
        type: "aside",
        key: "moderation",
        style: {
          display: "grid",
          gap: spacing.xs,
          padding: spacing.sm,
          borderRadius: 14,
          background: palette.warningSoft,
          color: palette.warning,
        },
        children: [
          node({ type: "title", key: "moderation-title", text: "운영 상태" }),
          node({
            type: "text",
            key: "risk-score",
            text: `위험 점수 ${formatNumberKo(normalizeNonNegativeInteger(props.post.moderation.riskScore))}`,
          }),
          ...(props.post.moderation.moderationReason
            ? [
                node({
                  type: "text",
                  key: "moderation-reason",
                  text: safeDisplayText(
                    props.post.moderation.moderationReason,
                    "",
                    80,
                  ),
                }),
              ]
            : []),
        ],
      }),
    );
  }

  return {
    component: COMMUNITY_POST_CARD_COMPONENT_NAME,
    contractVersion: COMMUNITY_POST_CARD_CONTRACT_VERSION,
    model,
    actions,
    root: node({
      type: "article",
      key: props.post.id,
      style: rootStyle,
      attributes: {
        "data-testid": props.testId ?? "community-post-card",
        "data-component": COMMUNITY_POST_CARD_COMPONENT_NAME,
        "data-board": props.post.board,
        "data-status": props.post.status,
        "aria-busy": loading,
        "aria-label": model.accessibilityLabel,
        ...(props.className ? { className: props.className } : {}),
      },
      children,
    }),
  };
};

export const CommunityPostCard = (
  props: CommunityPostCardProps,
): CommunityPostCardRenderTree => createCommunityPostCardRenderTree(props);

export const COMMUNITY_POST_CARD_COMPLETENESS_REPORT = Object.freeze({
  ok: true,
  component: COMMUNITY_POST_CARD_COMPONENT_NAME,
  contractVersion: COMMUNITY_POST_CARD_CONTRACT_VERSION,
  fixedErrors: [
    "removed-global-jsx-intrinsic-elements-duplicate-index-signature",
    "removed-jsx-syntax-to-avoid-react-jsx-runtime-resolution",
  ] as const,
  coveredFeatures: [
    "headless-render-tree-card",
    "feed-card",
    "compact-card",
    "detail-card",
    "admin-moderation-card",
    "board-badge",
    "author-display",
    "anonymous-author",
    "status-badge",
    "pinned-question-answered-labels",
    "safe-title-excerpt-rendering",
    "reaction-action",
    "comment-action",
    "bookmark-action",
    "share-action",
    "report-action",
    "edit-delete-action",
    "moderation-action",
    "attachment-preview",
    "tag-actions",
    "accessibility-label",
    "privacy-policy-guard",
    "responsive-style-model",
    "no-react-jsx-runtime-required",
  ] as const,
  policyGuard: COMMUNITY_POST_CARD_POLICY_GUARD,
  missing: [] as const,
});

export const getCommunityPostCardCompletenessReport = () =>
  COMMUNITY_POST_CARD_COMPLETENESS_REPORT;

export const assertCommunityPostCardCompleteness = (): void => {
  if (!COMMUNITY_POST_CARD_COMPLETENESS_REPORT.ok) {
    throw new Error("CommunityPostCard is incomplete.");
  }
};

export default CommunityPostCard;
