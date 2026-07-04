/**
 * packages/types/src/domain/community.types.ts
 *
 * 급여납치 Salary Hijacking Platform · Community Domain Types
 *
 * 파일 목적
 * - 모바일 앱, 관리자 콘솔, API 서버, DB 계층이 공유할 커뮤니티 도메인 타입 SSOT를 제공한다.
 * - 커뮤니티 게시판, 인기글, 글쓰기, 댓글/대댓글, 반응, 북마크, 공유, 신고, 첨부, 익명 표시,
 *   관리자 모더레이션, 제재, 감사, 지표, 멱등성 계약을 포함한다.
 * - 급여·예산·지출·저축 원천 데이터, token, secret, 원문 PII, 광고 타겟팅 payload가
 *   커뮤니티 public payload에 섞이지 않도록 타입 레벨의 정책 경계를 명확히 한다.
 * - 외부 런타임 의존성 없이 type-only package에서 즉시 사용할 수 있게 순수 TypeScript로만 작성한다.
 */

/* -----------------------------------------------------------------------------
 * 1. Contract metadata
 * -------------------------------------------------------------------------- */

export const COMMUNITY_TYPES_CONTRACT_VERSION = "2.0.0" as const;
export const COMMUNITY_TYPES_PACKAGE = "@salary-hijacking/types" as const;
export const COMMUNITY_TYPES_DOMAIN = "community" as const;
export const COMMUNITY_TIMEZONE = "Asia/Seoul" as const;
export const COMMUNITY_LOCALE = "ko-KR" as const;
export const COMMUNITY_CURRENCY = "KRW" as const;

export type UUID = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type UrlString = string;
export type HashString = string;
export type IdempotencyKey = string;
export type RequestId = string;
export type TraceId = string;
export type Locale = typeof COMMUNITY_LOCALE | "en-US";
export type Timezone = typeof COMMUNITY_TIMEZONE;
export type Currency = typeof COMMUNITY_CURRENCY;

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepReadonly<T[K]>
      : T[K];
};

export interface CommunityDomainEntity {
  readonly id: UUID;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

export interface CommunitySoftDeletable {
  readonly deletedAt?: Nullable<ISODateTimeString>;
  readonly deletionReason?: Nullable<string>;
}

export interface CommunityTraceableMutation {
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly idempotencyKey?: IdempotencyKey;
}

/* -----------------------------------------------------------------------------
 * 2. Enum constants and literal unions
 * -------------------------------------------------------------------------- */

export const COMMUNITY_BOARDS = [
  "ALL",
  "FREE",
  "LEVEL_UP_CERTIFICATION",
  "CONSUMPTION_CONTROL",
  "SAVING_TIP",
  "SALARY_TALK",
  "HOBBY",
  "NOTICE",
  "EVENT",
  "FAQ",
] as const;
export type CommunityBoard = (typeof COMMUNITY_BOARDS)[number];

export const COMMUNITY_WRITABLE_BOARDS = [
  "FREE",
  "LEVEL_UP_CERTIFICATION",
  "CONSUMPTION_CONTROL",
  "SAVING_TIP",
  "SALARY_TALK",
  "HOBBY",
] as const satisfies readonly CommunityBoard[];
export type CommunityWritableBoard = (typeof COMMUNITY_WRITABLE_BOARDS)[number];

export const COMMUNITY_ADMIN_BOARDS = [
  "NOTICE",
  "EVENT",
  "FAQ",
] as const satisfies readonly CommunityBoard[];
export type CommunityAdminBoard = (typeof COMMUNITY_ADMIN_BOARDS)[number];

export const COMMUNITY_BOARD_DB_KEYS = [
  "general",
  "free",
  "level_up_proof",
  "consumption_control",
  "saving_tip",
  "salary_talk",
  "hobby",
  "notice",
  "event",
  "faq",
] as const;
export type CommunityBoardDbKey = (typeof COMMUNITY_BOARD_DB_KEYS)[number];

export const COMMUNITY_BOARD_DB_MAP: Readonly<
  Record<CommunityBoard, CommunityBoardDbKey>
> = Object.freeze({
  ALL: "general",
  FREE: "free",
  LEVEL_UP_CERTIFICATION: "level_up_proof",
  CONSUMPTION_CONTROL: "consumption_control",
  SAVING_TIP: "saving_tip",
  SALARY_TALK: "salary_talk",
  HOBBY: "hobby",
  NOTICE: "notice",
  EVENT: "event",
  FAQ: "faq",
});

export const COMMUNITY_POST_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "HIDDEN",
  "REPORTED",
  "BLINDED",
  "BLOCKED",
  "LOCKED",
  "ARCHIVED",
  "DELETED",
] as const;
export type CommunityPostStatus = (typeof COMMUNITY_POST_STATUSES)[number];

export const COMMUNITY_COMMENT_STATUSES = [
  "PUBLISHED",
  "HIDDEN",
  "REPORTED",
  "BLINDED",
  "BLOCKED",
  "DELETED",
] as const;
export type CommunityCommentStatus =
  (typeof COMMUNITY_COMMENT_STATUSES)[number];

export const COMMUNITY_VISIBILITIES = [
  "PUBLIC",
  "MEMBERS_ONLY",
  "MODERATORS_ONLY",
  "ADMIN_ONLY",
] as const;
export type CommunityVisibility = (typeof COMMUNITY_VISIBILITIES)[number];

export const COMMUNITY_AUTHOR_DISPLAY_MODES = [
  "NICKNAME",
  "ANONYMOUS",
  "ADMIN",
  "SYSTEM",
  "WITHDRAWN",
] as const;
export type CommunityAuthorDisplayMode =
  (typeof COMMUNITY_AUTHOR_DISPLAY_MODES)[number];

export const COMMUNITY_REACTION_TYPES = [
  "LIKE",
  "EMPATHY",
  "CHEER",
  "THANKS",
  "USEFUL",
  "SAVED_MONEY",
  "LEVEL_UP",
] as const;
export type CommunityReactionType = (typeof COMMUNITY_REACTION_TYPES)[number];

export const COMMUNITY_TARGET_TYPES = [
  "BOARD",
  "POST",
  "COMMENT",
  "REPLY",
  "ATTACHMENT",
  "USER",
] as const;
export type CommunityTargetType = (typeof COMMUNITY_TARGET_TYPES)[number];

export const COMMUNITY_REPORT_TARGET_TYPES = [
  "POST",
  "COMMENT",
  "REPLY",
  "ATTACHMENT",
  "USER",
] as const;
export type CommunityReportTargetType =
  (typeof COMMUNITY_REPORT_TARGET_TYPES)[number];

export const COMMUNITY_REPORT_REASONS = [
  "SPAM",
  "ABUSE",
  "HARASSMENT",
  "HATE_OR_DISCRIMINATION",
  "SEXUAL_CONTENT",
  "MISINFORMATION",
  "FINANCIAL_RISK",
  "ILLEGAL_FINANCE",
  "GAMBLING_OR_SPECULATION",
  "SCAM_OR_PHISHING",
  "PERSONAL_INFORMATION",
  "PRIVACY_LEAK",
  "RAW_FINANCIAL_DATA_EXPOSURE",
  "TOKEN_OR_SECRET_LEAK",
  "AD_OR_PARTNER_POLICY_VIOLATION",
  "COPYRIGHT",
  "ILLEGAL",
  "OTHER",
] as const;
export type CommunityReportReason = (typeof COMMUNITY_REPORT_REASONS)[number];

export const COMMUNITY_REPORT_STATUSES = [
  "OPEN",
  "TRIAGED",
  "IN_REVIEW",
  "ACTION_TAKEN",
  "RESOLVED",
  "REJECTED",
  "DUPLICATED",
  "CLOSED",
  "ESCALATED",
] as const;
export type CommunityReportStatus = (typeof COMMUNITY_REPORT_STATUSES)[number];

export const COMMUNITY_MODERATION_ACTIONS = [
  "NONE",
  "HIDE",
  "UNHIDE",
  "BLIND",
  "DELETE",
  "RESTORE",
  "LOCK_COMMENTS",
  "UNLOCK_COMMENTS",
  "PIN",
  "UNPIN",
  "MARK_ANSWERED",
  "UNMARK_ANSWERED",
  "RESOLVE_REPORT",
  "REJECT_REPORT",
  "WARN_AUTHOR",
  "MUTE_AUTHOR",
  "SUSPEND_AUTHOR",
  "BAN_AUTHOR",
  "ESCALATE",
] as const;
export type CommunityModerationAction =
  (typeof COMMUNITY_MODERATION_ACTIONS)[number];

export const COMMUNITY_MODERATION_EXECUTABLE_ACTIONS =
  COMMUNITY_MODERATION_ACTIONS.filter(
    (action): action is Exclude<CommunityModerationAction, "NONE"> =>
      action !== "NONE",
  );
export type CommunityModerationExecutableAction =
  (typeof COMMUNITY_MODERATION_EXECUTABLE_ACTIONS)[number];

export const COMMUNITY_ATTACHMENT_TYPES = [
  "IMAGE",
  "DOCUMENT",
  "LINK_PREVIEW",
] as const;
export type CommunityAttachmentType =
  (typeof COMMUNITY_ATTACHMENT_TYPES)[number];

export const COMMUNITY_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;
export type CommunityAttachmentMimeType =
  (typeof COMMUNITY_ATTACHMENT_MIME_TYPES)[number];

export const COMMUNITY_ATTACHMENT_SCAN_STATUSES = [
  "PENDING",
  "SCANNING",
  "CLEAN",
  "QUARANTINED",
  "REJECTED",
  "BLOCKED",
  "FAILED",
] as const;
export type CommunityAttachmentScanStatus =
  (typeof COMMUNITY_ATTACHMENT_SCAN_STATUSES)[number];

export const COMMUNITY_SHARE_CHANNELS = [
  "COPY_LINK",
  "SYSTEM_SHARE",
  "KAKAO",
  "NAVER",
  "LINE",
  "X",
  "FACEBOOK",
  "INTERNAL",
  "OTHER",
] as const;
export type CommunityShareChannel = (typeof COMMUNITY_SHARE_CHANNELS)[number];

export const COMMUNITY_SORT_OPTIONS = [
  "latest",
  "popular",
  "commented",
  "reaction",
  "reported",
] as const;
export type CommunitySortBy = (typeof COMMUNITY_SORT_OPTIONS)[number];

export const COMMUNITY_ADMIN_SORT_OPTIONS = [
  "latest",
  "reported",
  "hidden",
  "blinded",
  "deleted",
  "risk",
] as const;
export type CommunityAdminSortBy =
  (typeof COMMUNITY_ADMIN_SORT_OPTIONS)[number];

export const COMMUNITY_SANCTION_KINDS = [
  "WARNING",
  "POST_RESTRICTION",
  "COMMENT_RESTRICTION",
  "TEMPORARY_MUTE",
  "TEMPORARY_BAN",
  "PERMANENT_BAN",
] as const;
export type CommunitySanctionKind = (typeof COMMUNITY_SANCTION_KINDS)[number];

export const COMMUNITY_SANCTION_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "DELETED",
] as const;
export type CommunitySanctionStatus =
  (typeof COMMUNITY_SANCTION_STATUSES)[number];

export const COMMUNITY_FEED_ITEM_TYPES = [
  "POST",
  "PINNED_POST",
  "SYSTEM_NOTICE",
  "NATIVE_AD_PLACEHOLDER",
] as const;
export type CommunityFeedItemType = (typeof COMMUNITY_FEED_ITEM_TYPES)[number];

export const COMMUNITY_AUDIT_EVENT_TYPES = [
  "community.board.created",
  "community.board.updated",
  "community.post.created",
  "community.post.updated",
  "community.post.published",
  "community.post.hidden",
  "community.post.blinded",
  "community.post.deleted",
  "community.post.restored",
  "community.comment.created",
  "community.comment.updated",
  "community.comment.hidden",
  "community.comment.deleted",
  "community.reaction.created",
  "community.reaction.deleted",
  "community.bookmark.created",
  "community.bookmark.deleted",
  "community.share.created",
  "community.report.created",
  "community.report.resolved",
  "community.moderation.applied",
  "community.sanction.applied",
  "community.sanction.revoked",
  "community.attachment.uploaded",
  "community.attachment.scan.completed",
  "community.idempotency.replayed",
] as const;
export type CommunityAuditEventType =
  (typeof COMMUNITY_AUDIT_EVENT_TYPES)[number];

export const COMMUNITY_IDEMPOTENCY_STATUSES = [
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
] as const;
export type CommunityIdempotencyStatus =
  (typeof COMMUNITY_IDEMPOTENCY_STATUSES)[number];

/* -----------------------------------------------------------------------------
 * 3. Policy, privacy and request context
 * -------------------------------------------------------------------------- */

export interface CommunityPolicyGuard {
  readonly rawPiiIncluded: false;
  readonly rawSecretIncluded: false;
  readonly rawTokenIncluded: false;
  readonly rawFinancialSourceDataIncluded: false;
  readonly adsFinancialJoinAllowed: false;
  readonly anonymousAuthorPubliclyIdentifiable: false;
}

export const COMMUNITY_SAFE_POLICY_GUARD: CommunityPolicyGuard = Object.freeze({
  rawPiiIncluded: false,
  rawSecretIncluded: false,
  rawTokenIncluded: false,
  rawFinancialSourceDataIncluded: false,
  adsFinancialJoinAllowed: false,
  anonymousAuthorPubliclyIdentifiable: false,
});

export interface CommunityRequestContext {
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly viewerUserId?: UUID;
  readonly adminUserId?: UUID;
  readonly locale?: Locale;
  readonly timezone?: Timezone;
  readonly appVersion?: string;
  readonly platform?:
    | "IOS"
    | "ANDROID"
    | "WEB"
    | "ADMIN"
    | "SERVER"
    | "UNKNOWN";
}

export interface CommunityOwnerTrace {
  readonly ownerUserId: UUID;
  readonly ownerHash: HashString;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly deviceHash?: HashString;
  readonly retainedUntil: ISODateTimeString;
  readonly serverOnly: true;
}

export interface CommunityPublicAuthor {
  readonly displayMode: CommunityAuthorDisplayMode;
  readonly displayName: string;
  readonly avatarUrl?: UrlString;
  readonly badgeLabels: readonly string[];
  readonly level?: number;
  readonly isMe: boolean;
  readonly withdrawn?: boolean;
}

export interface CommunityAdminActor {
  readonly adminUserId: UUID;
  readonly displayName: string;
  readonly role: "OWNER" | "ADMIN" | "OPERATOR" | "MODERATOR" | "VIEWER";
}

/* ----------------------------------------------------------------------------- */

export interface CommunityBoardDescriptor {
  readonly board: CommunityBoard;
  readonly dbKey: CommunityBoardDbKey;
  readonly slug: string;
  readonly nameKo: string;
  readonly descriptionKo: string;
  readonly sortOrder: number;
  readonly writableByUser: boolean;
  readonly writableByAdmin: boolean;
  readonly allowAnonymous: boolean;
  readonly allowQuestions: boolean;
  readonly allowAttachments: boolean;
  readonly moderationPreRequired: boolean;
  readonly active: boolean;
}

export const COMMUNITY_BOARD_DESCRIPTORS: readonly CommunityBoardDescriptor[] =
  Object.freeze([
    {
      board: "ALL",
      dbKey: "general",
      slug: "all",
      nameKo: "전체 게시판",
      descriptionKo: "급여납치 커뮤니티 전체 글을 모아보는 기본 게시판",
      sortOrder: 10,
      writableByUser: false,
      writableByAdmin: false,
      allowAnonymous: true,
      allowQuestions: true,
      allowAttachments: true,
      moderationPreRequired: false,
      active: true,
    },
    {
      board: "FREE",
      dbKey: "free",
      slug: "free",
      nameKo: "자유 게시판",
      descriptionKo:
        "직장인 일상, 소비 통제, 월급 루틴을 자유롭게 나누는 게시판",
      sortOrder: 20,
      writableByUser: true,
      writableByAdmin: true,
      allowAnonymous: true,
      allowQuestions: true,
      allowAttachments: true,
      moderationPreRequired: false,
      active: true,
    },
    {
      board: "LEVEL_UP_CERTIFICATION",
      dbKey: "level_up_proof",
      slug: "level-up-proof",
      nameKo: "레벨업 인증",
      descriptionKo: "독서, 뉴스, 영어, 건강 미션 완료를 인증하는 게시판",
      sortOrder: 30,
      writableByUser: true,
      writableByAdmin: true,
      allowAnonymous: true,
      allowQuestions: false,
      allowAttachments: true,
      moderationPreRequired: false,
      active: true,
    },
    {
      board: "CONSUMPTION_CONTROL",
      dbKey: "consumption_control",
      slug: "consumption-control",
      nameKo: "소비통제",
      descriptionKo: "일일 예산, 변동지출, 무지출 챌린지를 공유하는 게시판",
      sortOrder: 35,
      writableByUser: true,
      writableByAdmin: true,
      allowAnonymous: true,
      allowQuestions: true,
      allowAttachments: true,
      moderationPreRequired: false,
      active: true,
    },
    {
      board: "SAVING_TIP",
      dbKey: "saving_tip",
      slug: "saving-tip",
      nameKo: "저축 팁",
      descriptionKo: "고정저축, 적금, 목표저축 루틴을 공유하는 게시판",
      sortOrder: 40,
      writableByUser: true,
      writableByAdmin: true,
      allowAnonymous: true,
      allowQuestions: true,
      allowAttachments: true,
      moderationPreRequired: false,
      active: true,
    },
    {
      board: "SALARY_TALK",
      dbKey: "salary_talk",
      slug: "salary-talk",
      nameKo: "월급 토크",
      descriptionKo: "급여일, 고정지출, 생활비 계획을 안전하게 논의하는 게시판",
      sortOrder: 45,
      writableByUser: true,
      writableByAdmin: true,
      allowAnonymous: true,
      allowQuestions: true,
      allowAttachments: true,
      moderationPreRequired: false,
      active: true,
    },
    {
      board: "HOBBY",
      dbKey: "hobby",
      slug: "hobby",
      nameKo: "취미 게시판",
      descriptionKo: "퇴근 후 취미와 자기계발 경험을 공유하는 게시판",
      sortOrder: 50,
      writableByUser: true,
      writableByAdmin: true,
      allowAnonymous: true,
      allowQuestions: true,
      allowAttachments: true,
      moderationPreRequired: false,
      active: true,
    },
    {
      board: "NOTICE",
      dbKey: "notice",
      slug: "notice",
      nameKo: "공지사항",
      descriptionKo: "서비스 운영 공지와 정책 변경 안내 게시판",
      sortOrder: 90,
      writableByUser: false,
      writableByAdmin: true,
      allowAnonymous: false,
      allowQuestions: false,
      allowAttachments: true,
      moderationPreRequired: false,
      active: true,
    },
    {
      board: "EVENT",
      dbKey: "event",
      slug: "event",
      nameKo: "이벤트",
      descriptionKo: "포인트, 제휴, 챌린지 이벤트 안내 게시판",
      sortOrder: 95,
      writableByUser: false,
      writableByAdmin: true,
      allowAnonymous: false,
      allowQuestions: false,
      allowAttachments: true,
      moderationPreRequired: false,
      active: true,
    },
    {
      board: "FAQ",
      dbKey: "faq",
      slug: "faq",
      nameKo: "FAQ",
      descriptionKo: "급여납치 사용법과 자주 묻는 질문 게시판",
      sortOrder: 100,
      writableByUser: false,
      writableByAdmin: true,
      allowAnonymous: false,
      allowQuestions: false,
      allowAttachments: true,
      moderationPreRequired: false,
      active: true,
    },
  ]);

export interface CommunityTag {
  readonly id?: UUID;
  readonly slug: string;
  readonly nameKo: string;
  readonly active: boolean;
}

export interface CommunityCounts {
  readonly viewCount: number;
  readonly commentCount: number;
  readonly reactionCount: number;
  readonly bookmarkCount: number;
  readonly shareCount: number;
  readonly reportCount: number;
  readonly likeCount: number;
}

export interface CommunityReactionSummary {
  readonly like: number;
  readonly empathy: number;
  readonly cheer: number;
  readonly thanks: number;
  readonly useful: number;
  readonly savedMoney: number;
  readonly levelUp: number;
}

export interface CommunityViewerState {
  readonly reactedTypes: readonly CommunityReactionType[];
  readonly bookmarked: boolean;
  readonly reported: boolean;
  readonly editable: boolean;
  readonly deletable: boolean;
  readonly commentWritable: boolean;
  readonly blockedByViewer?: boolean;
  readonly mutedByViewer?: boolean;
}

export const EMPTY_COMMUNITY_COUNTS: CommunityCounts = Object.freeze({
  viewCount: 0,
  commentCount: 0,
  reactionCount: 0,
  bookmarkCount: 0,
  shareCount: 0,
  reportCount: 0,
  likeCount: 0,
});

export const EMPTY_COMMUNITY_REACTION_SUMMARY: CommunityReactionSummary =
  Object.freeze({
    like: 0,
    empathy: 0,
    cheer: 0,
    thanks: 0,
    useful: 0,
    savedMoney: 0,
    levelUp: 0,
  });

/* ----------------------------------------------------------------------------- */

export interface CommunityAttachment
  extends CommunityDomainEntity, CommunitySoftDeletable {
  readonly type: CommunityAttachmentType;
  readonly url?: UrlString;
  readonly storageKey?: string;
  readonly fileName?: string;
  readonly contentType?: CommunityAttachmentMimeType | string;
  readonly sizeBytes?: number;
  readonly width?: number;
  readonly height?: number;
  readonly altText?: string;
  readonly checksumSha256?: HashString;
  readonly scanStatus: CommunityAttachmentScanStatus;
  readonly blockedReason?: string;
  readonly uploadedBy?: UUID;
  readonly scannedAt?: ISODateTimeString;
  readonly policy: CommunityPolicyGuard;
}

export interface CommunityAttachmentInput {
  readonly type: CommunityAttachmentType;
  readonly uploadId?: UUID;
  readonly url?: UrlString;
  readonly altText?: string;
}

export interface CommunityModerationState {
  readonly action: CommunityModerationAction;
  readonly lockedComments: boolean;
  readonly riskScore: number;
  readonly policyLabels: readonly string[];
  readonly reportThresholdExceeded: boolean;
  readonly moderatedAt?: ISODateTimeString;
  readonly moderatorAdminId?: UUID;
  readonly moderationReason?: string;
}

export interface CommunityPostSummary
  extends CommunityDomainEntity, CommunitySoftDeletable {
  readonly board: CommunityBoard;
  readonly boardDbKey: CommunityBoardDbKey;
  readonly status: CommunityPostStatus;
  readonly visibility: CommunityVisibility;
  readonly title: string;
  readonly excerpt: string;
  readonly slug?: string;
  readonly author: CommunityPublicAuthor;
  readonly tags: readonly CommunityTag[];
  readonly counts: CommunityCounts;
  readonly reactions: CommunityReactionSummary;
  readonly viewerState?: CommunityViewerState;
  readonly policy: CommunityPolicyGuard;
  readonly isAnonymous: boolean;
  readonly isQuestion: boolean;
  readonly isAnswered: boolean;
  readonly pinned: boolean;
  readonly locked: boolean;
  readonly qualityScore?: number;
  readonly publishedAt: ISODateTimeString;
}

export interface CommunityPost extends CommunityPostSummary {
  readonly body: string;
  readonly bodyPlainTextHash?: HashString;
  readonly attachments: readonly CommunityAttachment[];
  readonly comments?: readonly CommunityComment[];
  readonly moderation?: CommunityModerationState;
}

export interface CommunityAdminPost extends CommunityPost {
  readonly ownerTrace: CommunityOwnerTrace;
  readonly internalNotes: readonly string[];
  readonly moderation: CommunityModerationState;
  readonly reports?: readonly CommunityReport[];
}

export interface CommunityComment
  extends CommunityDomainEntity, CommunitySoftDeletable {
  readonly postId: UUID;
  readonly parentCommentId: Nullable<UUID>;
  readonly status: CommunityCommentStatus;
  readonly body: string;
  readonly bodyPlainTextHash?: HashString;
  readonly author: CommunityPublicAuthor;
  readonly isAnonymous: boolean;
  readonly counts: {
    readonly replyCount: number;
    readonly reactionCount: number;
    readonly reportCount: number;
    readonly likeCount: number;
  };
  readonly reactions: CommunityReactionSummary;
  readonly viewerState?: CommunityViewerState;
  readonly policy: CommunityPolicyGuard;
  readonly moderation?: CommunityModerationState;
  readonly replies?: readonly CommunityComment[];
  readonly publishedAt: ISODateTimeString;
}

export interface CommunityAdminComment extends CommunityComment {
  readonly ownerTrace: CommunityOwnerTrace;
  readonly moderation: CommunityModerationState;
}

/* ----------------------------------------------------------------------------- */

export interface CommunityReport extends CommunityDomainEntity {
  readonly targetType: CommunityReportTargetType;
  readonly targetId: UUID;
  readonly reason: CommunityReportReason;
  readonly detail?: string;
  readonly status: CommunityReportStatus;
  readonly reporterHash: HashString;
  readonly reporterUserId?: UUID;
  readonly assignedAdminId?: UUID;
  readonly resolvedBy?: UUID;
  readonly resolutionNote?: string;
  readonly reviewedAt?: ISODateTimeString;
  readonly resolvedAt?: ISODateTimeString;
  readonly policy: CommunityPolicyGuard;
}

export interface CommunityModerationActionLog extends CommunityDomainEntity {
  readonly targetType: CommunityTargetType;
  readonly targetId: UUID;
  readonly action: CommunityModerationExecutableAction;
  readonly moderator: CommunityAdminActor;
  readonly reportId?: UUID;
  readonly reason: string;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  readonly effectiveAt: ISODateTimeString;
  readonly policy: CommunityPolicyGuard;
}

export interface CommunityUserSanction
  extends CommunityDomainEntity, CommunitySoftDeletable {
  readonly userId: UUID;
  readonly moderatorAdminId: UUID;
  readonly moderationActionId?: UUID;
  readonly kind: CommunitySanctionKind;
  readonly status: CommunitySanctionStatus;
  readonly reason: string;
  readonly startsAt: ISODateTimeString;
  readonly expiresAt?: ISODateTimeString;
  readonly revokedAt?: ISODateTimeString;
  readonly revokedBy?: UUID;
}

export interface CommunityAuditEvent {
  readonly id: UUID;
  readonly eventType: CommunityAuditEventType;
  readonly actorUserId?: UUID;
  readonly targetUserId?: UUID;
  readonly targetType?: CommunityTargetType;
  readonly targetId?: UUID;
  readonly postId?: UUID;
  readonly commentId?: UUID;
  readonly reportId?: UUID;
  readonly moderationActionId?: UUID;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  readonly reason?: string;
  readonly requestId?: RequestId;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly policy: CommunityPolicyGuard;
  readonly createdAt: ISODateTimeString;
}

export interface CommunityPostMetricsDaily {
  readonly postId: UUID;
  readonly metricDate: ISODateString;
  readonly viewCount: number;
  readonly reactionCount: number;
  readonly commentCount: number;
  readonly shareCount: number;
  readonly reportCount: number;
  readonly healthScore: number;
}

export interface CommunityMetrics {
  readonly postCount: number;
  readonly commentCount: number;
  readonly activeAuthorCount: number;
  readonly reportCount: number;
  readonly hiddenCount: number;
  readonly blindedCount: number;
  readonly deletedCount: number;
  readonly certificationPostRatio: number;
  readonly communityViewUsers?: number;
  readonly postCreatedUsers?: number;
  readonly commentUsers?: number;
  readonly likeUsers?: number;
  readonly reportResolutionSlaHours?: number;
  readonly topBoards: readonly {
    readonly board: CommunityBoard;
    readonly count: number;
  }[];
  readonly measuredAt: ISODateTimeString;
}

export interface CommunityIdempotencyRecord extends CommunityDomainEntity {
  readonly userId: UUID;
  readonly idempotencyKey: IdempotencyKey;
  readonly operation: CommunityMutationOperation;
  readonly status: CommunityIdempotencyStatus;
  readonly requestHash: HashString;
  readonly responseReferenceId?: UUID;
  readonly errorCode?: string;
  readonly expiresAt: ISODateTimeString;
}

export interface CommunityNativeAdPlaceholder {
  readonly itemType: "NATIVE_AD_PLACEHOLDER";
  readonly placementId: string;
  readonly position: number;
  readonly policy: CommunityPolicyGuard;
  readonly financialTargetingUsed: false;
}

export interface CommunitySystemNoticeFeedItem {
  readonly itemType: "SYSTEM_NOTICE";
  readonly id: UUID;
  readonly title: string;
  readonly body: string;
  readonly createdAt: ISODateTimeString;
}

export interface CommunityPostFeedItem {
  readonly itemType: "POST" | "PINNED_POST";
  readonly post: CommunityPostSummary;
}

export type CommunityFeedItem =
  | CommunityPostFeedItem
  | CommunitySystemNoticeFeedItem
  | CommunityNativeAdPlaceholder;

/* ----------------------------------------------------------------------------- */

export interface CommunityListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly cursor?: string;
  readonly sortBy?: CommunitySortBy;
}

export interface CommunityAdminListQuery extends Omit<
  CommunityListQuery,
  "sortBy"
> {
  readonly sortBy?: CommunityAdminSortBy;
}

export interface CommunityPageInfo {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount?: number;
  readonly nextCursor?: string;
  readonly hasNextPage: boolean;
}

export interface CommunityListResponse<TItem> {
  readonly ok: true;
  readonly data: readonly TItem[];
  readonly pageInfo: CommunityPageInfo;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface CommunitySuccessResponse<TData> {
  readonly ok: true;
  readonly data: TData;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface CommunityMutationResponse<
  TData,
> extends CommunitySuccessResponse<TData> {
  readonly mutation: {
    readonly idempotencyKey?: IdempotencyKey;
    readonly replayed: boolean;
    readonly committedAt: ISODateTimeString;
  };
}

export interface CommunityErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  };
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export type CommunityApiResponse<TData> =
  | CommunitySuccessResponse<TData>
  | CommunityErrorResponse;
export type CommunityMutationApiResponse<TData> =
  | CommunityMutationResponse<TData>
  | CommunityErrorResponse;

export interface ListCommunityPostsRequest extends CommunityListQuery {
  readonly board?: CommunityBoard;
  readonly status?: CommunityPostStatus;
  readonly tags?: readonly string[];
  readonly includeViewerState?: boolean;
  readonly context?: CommunityRequestContext;
}

export interface SearchCommunityPostsRequest extends ListCommunityPostsRequest {
  readonly search: string;
}

export interface GetCommunityPostRequest {
  readonly postId: UUID;
  readonly includeComments?: boolean;
  readonly includeViewerState?: boolean;
  readonly context?: CommunityRequestContext;
}

export interface CreateCommunityPostRequest extends CommunityTraceableMutation {
  readonly board: CommunityWritableBoard;
  readonly title: string;
  readonly body: string;
  readonly visibility?: CommunityVisibility;
  readonly tags?: readonly string[];
  readonly attachments?: readonly CommunityAttachmentInput[];
  readonly anonymous?: boolean;
  readonly isQuestion?: boolean;
  readonly context?: CommunityRequestContext;
}

export interface CreateAdminCommunityPostRequest extends CommunityTraceableMutation {
  readonly board: CommunityAdminBoard;
  readonly title: string;
  readonly body: string;
  readonly visibility?: CommunityVisibility;
  readonly tags?: readonly string[];
  readonly attachments?: readonly CommunityAttachmentInput[];
  readonly pinned?: boolean;
  readonly context?: CommunityRequestContext;
}

export interface UpdateCommunityPostRequest extends CommunityTraceableMutation {
  readonly postId: UUID;
  readonly title?: string;
  readonly body?: string;
  readonly visibility?: CommunityVisibility;
  readonly tags?: readonly string[];
  readonly attachments?: readonly CommunityAttachmentInput[];
  readonly isQuestion?: boolean;
  readonly isAnswered?: boolean;
  readonly context?: CommunityRequestContext;
}

export interface DeleteCommunityPostRequest extends CommunityTraceableMutation {
  readonly postId: UUID;
  readonly reason?: string;
  readonly hardDelete?: false;
  readonly context?: CommunityRequestContext;
}

export interface ListCommunityCommentsRequest extends CommunityListQuery {
  readonly postId: UUID;
  readonly parentCommentId?: Nullable<UUID>;
  readonly includeViewerState?: boolean;
  readonly context?: CommunityRequestContext;
}

export interface CreateCommunityCommentRequest extends CommunityTraceableMutation {
  readonly postId: UUID;
  readonly parentCommentId?: Nullable<UUID>;
  readonly body: string;
  readonly anonymous?: boolean;
  readonly context?: CommunityRequestContext;
}

export interface UpdateCommunityCommentRequest extends CommunityTraceableMutation {
  readonly commentId: UUID;
  readonly body: string;
  readonly context?: CommunityRequestContext;
}

export interface DeleteCommunityCommentRequest extends CommunityTraceableMutation {
  readonly commentId: UUID;
  readonly reason?: string;
  readonly hardDelete?: false;
  readonly context?: CommunityRequestContext;
}

export interface LikeCommunityCommentRequest {
  readonly commentId: UUID;
  readonly context?: CommunityRequestContext;
}

export interface UnlikeCommunityCommentRequest {
  readonly commentId: UUID;
  readonly context?: CommunityRequestContext;
}

export interface ReactCommunityTargetRequest extends CommunityTraceableMutation {
  readonly targetType: Extract<
    CommunityReportTargetType,
    "POST" | "COMMENT" | "REPLY"
  >;
  readonly targetId: UUID;
  readonly reactionType: CommunityReactionType;
  readonly enabled: boolean;
  readonly context?: CommunityRequestContext;
}

export interface BookmarkCommunityPostRequest extends CommunityTraceableMutation {
  readonly postId: UUID;
  readonly enabled: boolean;
  readonly context?: CommunityRequestContext;
}

export interface ShareCommunityPostRequest extends CommunityTraceableMutation {
  readonly postId: UUID;
  readonly channel: CommunityShareChannel;
  readonly context?: CommunityRequestContext;
}

export interface ReportCommunityTargetRequest extends CommunityTraceableMutation {
  readonly targetType: CommunityReportTargetType;
  readonly targetId: UUID;
  readonly reason: CommunityReportReason;
  readonly detail?: string;
  readonly context?: CommunityRequestContext;
}

export interface ListCommunityReportsAdminRequest extends CommunityAdminListQuery {
  readonly status?: CommunityReportStatus;
  readonly reason?: CommunityReportReason;
  readonly targetType?: CommunityReportTargetType;
  readonly context?: CommunityRequestContext;
}

export interface GetCommunityPostAdminRequest {
  readonly postId: UUID;
  readonly includeOwnerTrace: true;
  readonly context?: CommunityRequestContext;
}

export interface ModerateCommunityTargetAdminRequest extends CommunityTraceableMutation {
  readonly targetType: CommunityReportTargetType;
  readonly targetId: UUID;
  readonly action: CommunityModerationExecutableAction;
  readonly reason: string;
  readonly reportId?: UUID;
  readonly notifyAuthor?: boolean;
  readonly context?: CommunityRequestContext;
}

export interface ApplyCommunityUserSanctionAdminRequest extends CommunityTraceableMutation {
  readonly userId: UUID;
  readonly kind: CommunitySanctionKind;
  readonly reason: string;
  readonly startsAt?: ISODateTimeString;
  readonly expiresAt?: ISODateTimeString;
  readonly context?: CommunityRequestContext;
}

export interface GetCommunityMetricsAdminRequest {
  readonly from?: ISODateTimeString;
  readonly to?: ISODateTimeString;
  readonly board?: CommunityBoard;
  readonly context?: CommunityRequestContext;
}

export interface CommunityDeleteResult {
  readonly id: UUID;
  readonly deleted: true;
  readonly deletedAt: ISODateTimeString;
}

export interface CommunityReactionResult {
  readonly targetType: Extract<
    CommunityReportTargetType,
    "POST" | "COMMENT" | "REPLY"
  >;
  readonly targetId: UUID;
  readonly reactionType: CommunityReactionType;
  readonly enabled: boolean;
  readonly reactions: CommunityReactionSummary;
}

export interface CommunityCommentLikeResult {
  readonly commentId: UUID;
  readonly state: "LIKED" | "UNLIKED";
  readonly likeCount: number;
  readonly serverAuthority: true;
  readonly financialRawDataExposed: false;
  readonly rawPersonalDataExposed: false;
  readonly adsFinancialTargetingUsed: false;
}

export interface CommunityBookmarkResult {
  readonly postId: UUID;
  readonly enabled: boolean;
  readonly bookmarkCount: number;
}

export interface CommunityShareResult {
  readonly postId: UUID;
  readonly channel: CommunityShareChannel;
  readonly shareCount: number;
  readonly shareUrl?: UrlString;
}

export interface CommunityModerationResult {
  readonly targetType: CommunityReportTargetType;
  readonly targetId: UUID;
  readonly action: CommunityModerationExecutableAction;
  readonly status: "APPLIED" | "QUEUED" | "REJECTED";
  readonly moderatedAt: ISODateTimeString;
}

export type ListCommunityPostsResponse =
  CommunityListResponse<CommunityPostSummary>;
export type SearchCommunityPostsResponse =
  CommunityListResponse<CommunityPostSummary>;
export type GetCommunityPostResponse = CommunitySuccessResponse<CommunityPost>;
export type CreateCommunityPostResponse =
  CommunityMutationResponse<CommunityPost>;
export type UpdateCommunityPostResponse =
  CommunityMutationResponse<CommunityPost>;
export type DeleteCommunityPostResponse =
  CommunityMutationResponse<CommunityDeleteResult>;
export type ListCommunityCommentsResponse =
  CommunityListResponse<CommunityComment>;
export type CreateCommunityCommentResponse =
  CommunityMutationResponse<CommunityComment>;
export type UpdateCommunityCommentResponse =
  CommunityMutationResponse<CommunityComment>;
export type DeleteCommunityCommentResponse =
  CommunityMutationResponse<CommunityDeleteResult>;
export type LikeCommunityCommentResponse =
  CommunityMutationResponse<CommunityCommentLikeResult>;
export type UnlikeCommunityCommentResponse =
  CommunityMutationResponse<CommunityCommentLikeResult>;
export type ReactCommunityTargetResponse =
  CommunityMutationResponse<CommunityReactionResult>;
export type BookmarkCommunityPostResponse =
  CommunityMutationResponse<CommunityBookmarkResult>;
export type ShareCommunityPostResponse =
  CommunityMutationResponse<CommunityShareResult>;
export type ReportCommunityTargetResponse =
  CommunityMutationResponse<CommunityReport>;
export type ListCommunityReportsAdminResponse =
  CommunityListResponse<CommunityReport>;
export type GetCommunityPostAdminResponse =
  CommunitySuccessResponse<CommunityAdminPost>;
export type ModerateCommunityTargetAdminResponse =
  CommunityMutationResponse<CommunityModerationResult>;
export type GetCommunityMetricsAdminResponse =
  CommunitySuccessResponse<CommunityMetrics>;

export type CommunityMutationOperation =
  | "CREATE_POST"
  | "UPDATE_POST"
  | "DELETE_POST"
  | "CREATE_COMMENT"
  | "UPDATE_COMMENT"
  | "DELETE_COMMENT"
  | "LIKE_COMMENT"
  | "UNLIKE_COMMENT"
  | "REACT_TARGET"
  | "BOOKMARK_POST"
  | "SHARE_POST"
  | "REPORT_TARGET"
  | "ADMIN_MODERATE_TARGET"
  | "ADMIN_APPLY_SANCTION";

/* ----------------------------------------------------------------------------- */

export const COMMUNITY_API_PATHS = Object.freeze({
  listPosts: "/community/posts",
  searchPosts: "/community/posts/search",
  getPost: "/community/posts/:postId",
  createPost: "/community/posts",
  createAdminPost: "/admin/community/posts",
  updatePost: "/community/posts/:postId",
  deletePost: "/community/posts/:postId",
  listComments: "/community/posts/:postId/comments",
  createComment: "/community/posts/:postId/comments",
  updateComment: "/community/comments/:commentId",
  deleteComment: "/community/comments/:commentId",
  likeComment: "/community/comments/:commentId/like",
  unlikeComment: "/community/comments/:commentId/like",
  reactTarget: "/community/reactions",
  bookmarkPost: "/community/bookmarks",
  sharePost: "/community/shares",
  reportTarget: "/community/reports",
  adminListReports: "/admin/community/reports",
  adminGetPost: "/admin/community/posts/:postId",
  adminModerateTarget: "/admin/community/moderation",
  adminApplySanction: "/admin/community/sanctions",
  adminMetrics: "/admin/community/metrics",
} as const);

export type CommunityApiPathName = keyof typeof COMMUNITY_API_PATHS;
export type CommunityApiPath =
  (typeof COMMUNITY_API_PATHS)[CommunityApiPathName];
export type CommunityHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface CommunityEndpointDescriptor<TRequest, TResponse> {
  readonly method: CommunityHttpMethod;
  readonly path: CommunityApiPath;
  readonly request: TRequest;
  readonly response: TResponse;
  readonly authRequired: boolean;
  readonly adminRequired: boolean;
  readonly idempotencyRequired: boolean;
}

export interface CommunityEndpointTypes {
  readonly listPosts: CommunityEndpointDescriptor<
    ListCommunityPostsRequest,
    ListCommunityPostsResponse
  >;
  readonly searchPosts: CommunityEndpointDescriptor<
    SearchCommunityPostsRequest,
    SearchCommunityPostsResponse
  >;
  readonly getPost: CommunityEndpointDescriptor<
    GetCommunityPostRequest,
    GetCommunityPostResponse
  >;
  readonly createPost: CommunityEndpointDescriptor<
    CreateCommunityPostRequest,
    CreateCommunityPostResponse
  >;
  readonly createAdminPost: CommunityEndpointDescriptor<
    CreateAdminCommunityPostRequest,
    CreateCommunityPostResponse
  >;
  readonly updatePost: CommunityEndpointDescriptor<
    UpdateCommunityPostRequest,
    UpdateCommunityPostResponse
  >;
  readonly deletePost: CommunityEndpointDescriptor<
    DeleteCommunityPostRequest,
    DeleteCommunityPostResponse
  >;
  readonly listComments: CommunityEndpointDescriptor<
    ListCommunityCommentsRequest,
    ListCommunityCommentsResponse
  >;
  readonly createComment: CommunityEndpointDescriptor<
    CreateCommunityCommentRequest,
    CreateCommunityCommentResponse
  >;
  readonly updateComment: CommunityEndpointDescriptor<
    UpdateCommunityCommentRequest,
    UpdateCommunityCommentResponse
  >;
  readonly deleteComment: CommunityEndpointDescriptor<
    DeleteCommunityCommentRequest,
    DeleteCommunityCommentResponse
  >;
  readonly likeComment: CommunityEndpointDescriptor<
    LikeCommunityCommentRequest,
    LikeCommunityCommentResponse
  >;
  readonly unlikeComment: CommunityEndpointDescriptor<
    UnlikeCommunityCommentRequest,
    UnlikeCommunityCommentResponse
  >;
  readonly reactTarget: CommunityEndpointDescriptor<
    ReactCommunityTargetRequest,
    ReactCommunityTargetResponse
  >;
  readonly bookmarkPost: CommunityEndpointDescriptor<
    BookmarkCommunityPostRequest,
    BookmarkCommunityPostResponse
  >;
  readonly sharePost: CommunityEndpointDescriptor<
    ShareCommunityPostRequest,
    ShareCommunityPostResponse
  >;
  readonly reportTarget: CommunityEndpointDescriptor<
    ReportCommunityTargetRequest,
    ReportCommunityTargetResponse
  >;
  readonly adminListReports: CommunityEndpointDescriptor<
    ListCommunityReportsAdminRequest,
    ListCommunityReportsAdminResponse
  >;
  readonly adminGetPost: CommunityEndpointDescriptor<
    GetCommunityPostAdminRequest,
    GetCommunityPostAdminResponse
  >;
  readonly adminModerateTarget: CommunityEndpointDescriptor<
    ModerateCommunityTargetAdminRequest,
    ModerateCommunityTargetAdminResponse
  >;
  readonly adminApplySanction: CommunityEndpointDescriptor<
    ApplyCommunityUserSanctionAdminRequest,
    CommunityMutationResponse<CommunityUserSanction>
  >;
  readonly adminMetrics: CommunityEndpointDescriptor<
    GetCommunityMetricsAdminRequest,
    GetCommunityMetricsAdminResponse
  >;
}

/* ----------------------------------------------------------------------------- */

const includesString = <TValue extends string>(
  values: readonly TValue[],
  value: string,
): value is TValue => (values as readonly string[]).includes(value);

export const isCommunityBoard = (value: string): value is CommunityBoard =>
  includesString(COMMUNITY_BOARDS, value);
export const isCommunityWritableBoard = (
  value: string,
): value is CommunityWritableBoard =>
  includesString(COMMUNITY_WRITABLE_BOARDS, value);
export const isCommunityAdminBoard = (
  value: string,
): value is CommunityAdminBoard =>
  includesString(COMMUNITY_ADMIN_BOARDS, value);
export const isCommunityPostStatus = (
  value: string,
): value is CommunityPostStatus =>
  includesString(COMMUNITY_POST_STATUSES, value);
export const isCommunityCommentStatus = (
  value: string,
): value is CommunityCommentStatus =>
  includesString(COMMUNITY_COMMENT_STATUSES, value);
export const isCommunityReportReason = (
  value: string,
): value is CommunityReportReason =>
  includesString(COMMUNITY_REPORT_REASONS, value);
export const isCommunityReportStatus = (
  value: string,
): value is CommunityReportStatus =>
  includesString(COMMUNITY_REPORT_STATUSES, value);

export const toCommunityBoardDbKey = (
  board: CommunityBoard,
): CommunityBoardDbKey => COMMUNITY_BOARD_DB_MAP[board];

export const getCommunityBoardDescriptor = (
  board: CommunityBoard,
): CommunityBoardDescriptor => {
  const descriptor = COMMUNITY_BOARD_DESCRIPTORS.find(
    (item) => item.board === board,
  );
  if (!descriptor) throw new Error(`Unknown community board: ${board}`);
  return descriptor;
};

export const isPublicReadablePostStatus = (
  status: CommunityPostStatus,
): boolean => status === "PUBLISHED" || status === "LOCKED";

export const isPublicReadableCommentStatus = (
  status: CommunityCommentStatus,
): boolean => status === "PUBLISHED";

export const shouldMaskCommunityAuthor = (
  displayMode: CommunityAuthorDisplayMode,
): boolean => displayMode === "ANONYMOUS" || displayMode === "WITHDRAWN";

export const createCommunityPolicyGuard = (): CommunityPolicyGuard => ({
  ...COMMUNITY_SAFE_POLICY_GUARD,
});

export const assertCommunityPolicyGuard = (
  guard: CommunityPolicyGuard,
): void => {
  if (
    guard.rawPiiIncluded !== false ||
    guard.rawSecretIncluded !== false ||
    guard.rawTokenIncluded !== false ||
    guard.rawFinancialSourceDataIncluded !== false ||
    guard.adsFinancialJoinAllowed !== false ||
    guard.anonymousAuthorPubliclyIdentifiable !== false
  ) {
    throw new Error(
      "Unsafe community policy guard: public community payload must not include raw PII, secrets, tokens, financial source data, ad-financial joins, or identifiable anonymous authors.",
    );
  }
};

export const createAnonymousCommunityAuthor = (
  label = "익명",
): CommunityPublicAuthor => ({
  displayMode: "ANONYMOUS",
  displayName: label,
  badgeLabels: [],
  isMe: false,
});

export const createSystemCommunityAuthor = (
  label = "급여납치 운영팀",
): CommunityPublicAuthor => ({
  displayMode: "SYSTEM",
  displayName: label,
  badgeLabels: ["SYSTEM"],
  isMe: false,
});

export const createEmptyCommunityViewerState = (): CommunityViewerState => ({
  reactedTypes: [],
  bookmarked: false,
  reported: false,
  editable: false,
  deletable: false,
  commentWritable: true,
});

export const canWriteCommunityBoard = (
  board: CommunityBoard,
  role: "USER" | "ADMIN" | "MODERATOR" = "USER",
): boolean => {
  const descriptor = getCommunityBoardDescriptor(board);
  if (role === "ADMIN" || role === "MODERATOR")
    return descriptor.writableByAdmin;
  return descriptor.writableByUser;
};

export const normalizeCommunityPageSize = (
  pageSize: number | undefined,
  fallback = 20,
  max = 100,
): number => {
  if (typeof pageSize !== "number" || !Number.isFinite(pageSize))
    return fallback;
  return Math.max(1, Math.min(Math.floor(pageSize), max));
};

/* ----------------------------------------------------------------------------- */

export interface CommunityTypesCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof COMMUNITY_TYPES_CONTRACT_VERSION;
  readonly boardCount: number;
  readonly writableBoardCount: number;
  readonly adminBoardCount: number;
  readonly postStatusCount: number;
  readonly commentStatusCount: number;
  readonly reactionTypeCount: number;
  readonly reportReasonCount: number;
  readonly moderationActionCount: number;
  readonly apiPathCount: number;
  readonly missing: readonly string[];
}

const requireEvery = <TValue extends string>(
  source: readonly TValue[],
  required: readonly TValue[],
  label: string,
  missing: string[],
): void => {
  for (const value of required) {
    if (!source.includes(value)) missing.push(`missing ${label}: ${value}`);
  }
};

export const getCommunityTypesCompletenessReport =
  (): CommunityTypesCompletenessReport => {
    const missing: string[] = [];

    requireEvery(
      COMMUNITY_BOARDS,
      [
        "ALL",
        "FREE",
        "LEVEL_UP_CERTIFICATION",
        "HOBBY",
        "NOTICE",
        "EVENT",
      ] as const,
      "board",
      missing,
    );
    requireEvery(
      COMMUNITY_WRITABLE_BOARDS,
      ["FREE", "LEVEL_UP_CERTIFICATION", "HOBBY"] as const,
      "writable board",
      missing,
    );
    requireEvery(
      COMMUNITY_POST_STATUSES,
      ["DRAFT", "PUBLISHED", "HIDDEN", "DELETED"] as const,
      "post status",
      missing,
    );
    requireEvery(
      COMMUNITY_COMMENT_STATUSES,
      ["PUBLISHED", "HIDDEN", "DELETED"] as const,
      "comment status",
      missing,
    );
    requireEvery(
      COMMUNITY_REACTION_TYPES,
      ["LIKE", "EMPATHY", "CHEER", "SAVED_MONEY", "LEVEL_UP"] as const,
      "reaction",
      missing,
    );
    requireEvery(
      COMMUNITY_REPORT_REASONS,
      [
        "SPAM",
        "ABUSE",
        "MISINFORMATION",
        "FINANCIAL_RISK",
        "PRIVACY_LEAK",
        "OTHER",
      ] as const,
      "report reason",
      missing,
    );
    requireEvery(
      COMMUNITY_MODERATION_ACTIONS,
      [
        "HIDE",
        "BLIND",
        "DELETE",
        "RESTORE",
        "LOCK_COMMENTS",
        "WARN_AUTHOR",
        "ESCALATE",
      ] as const,
      "moderation action",
      missing,
    );

    for (const board of COMMUNITY_BOARDS) {
      if (!COMMUNITY_BOARD_DB_MAP[board])
        missing.push(`missing DB board mapping: ${board}`);
      if (
        !COMMUNITY_BOARD_DESCRIPTORS.some(
          (descriptor) => descriptor.board === board,
        )
      ) {
        missing.push(`missing board descriptor: ${board}`);
      }
    }

    for (const pathName of [
      "listPosts",
      "createPost",
      "updatePost",
      "deletePost",
      "listComments",
      "createComment",
      "likeComment",
      "unlikeComment",
      "reactTarget",
      "bookmarkPost",
      "sharePost",
      "reportTarget",
      "adminModerateTarget",
      "adminMetrics",
    ] as const satisfies readonly CommunityApiPathName[]) {
      if (!COMMUNITY_API_PATHS[pathName])
        missing.push(`missing API path: ${pathName}`);
    }

    return {
      ok: missing.length === 0,
      contractVersion: COMMUNITY_TYPES_CONTRACT_VERSION,
      boardCount: COMMUNITY_BOARDS.length,
      writableBoardCount: COMMUNITY_WRITABLE_BOARDS.length,
      adminBoardCount: COMMUNITY_ADMIN_BOARDS.length,
      postStatusCount: COMMUNITY_POST_STATUSES.length,
      commentStatusCount: COMMUNITY_COMMENT_STATUSES.length,
      reactionTypeCount: COMMUNITY_REACTION_TYPES.length,
      reportReasonCount: COMMUNITY_REPORT_REASONS.length,
      moderationActionCount: COMMUNITY_MODERATION_ACTIONS.length,
      apiPathCount: Object.keys(COMMUNITY_API_PATHS).length,
      missing,
    };
  };

export const assertCommunityTypesCompleteness = (): void => {
  const report = getCommunityTypesCompletenessReport();
  if (!report.ok)
    throw new Error(
      `Community types are incomplete: ${report.missing.join(", ")}`,
    );
};

export const COMMUNITY_TYPES_COMPLETENESS_REPORT = Object.freeze(
  getCommunityTypesCompletenessReport(),
);

export const communityTypes = Object.freeze({
  contractVersion: COMMUNITY_TYPES_CONTRACT_VERSION,
  timezone: COMMUNITY_TIMEZONE,
  locale: COMMUNITY_LOCALE,
  currency: COMMUNITY_CURRENCY,
  boards: COMMUNITY_BOARDS,
  writableBoards: COMMUNITY_WRITABLE_BOARDS,
  adminBoards: COMMUNITY_ADMIN_BOARDS,
  boardDbKeys: COMMUNITY_BOARD_DB_KEYS,
  boardDbMap: COMMUNITY_BOARD_DB_MAP,
  boardDescriptors: COMMUNITY_BOARD_DESCRIPTORS,
  postStatuses: COMMUNITY_POST_STATUSES,
  commentStatuses: COMMUNITY_COMMENT_STATUSES,
  visibilities: COMMUNITY_VISIBILITIES,
  authorDisplayModes: COMMUNITY_AUTHOR_DISPLAY_MODES,
  reactionTypes: COMMUNITY_REACTION_TYPES,
  targetTypes: COMMUNITY_TARGET_TYPES,
  reportTargetTypes: COMMUNITY_REPORT_TARGET_TYPES,
  reportReasons: COMMUNITY_REPORT_REASONS,
  reportStatuses: COMMUNITY_REPORT_STATUSES,
  moderationActions: COMMUNITY_MODERATION_ACTIONS,
  moderationExecutableActions: COMMUNITY_MODERATION_EXECUTABLE_ACTIONS,
  attachmentTypes: COMMUNITY_ATTACHMENT_TYPES,
  attachmentMimeTypes: COMMUNITY_ATTACHMENT_MIME_TYPES,
  attachmentScanStatuses: COMMUNITY_ATTACHMENT_SCAN_STATUSES,
  shareChannels: COMMUNITY_SHARE_CHANNELS,
  sortOptions: COMMUNITY_SORT_OPTIONS,
  adminSortOptions: COMMUNITY_ADMIN_SORT_OPTIONS,
  sanctionKinds: COMMUNITY_SANCTION_KINDS,
  sanctionStatuses: COMMUNITY_SANCTION_STATUSES,
  feedItemTypes: COMMUNITY_FEED_ITEM_TYPES,
  auditEventTypes: COMMUNITY_AUDIT_EVENT_TYPES,
  idempotencyStatuses: COMMUNITY_IDEMPOTENCY_STATUSES,
  apiPaths: COMMUNITY_API_PATHS,
  safePolicyGuard: COMMUNITY_SAFE_POLICY_GUARD,
  completenessReport: COMMUNITY_TYPES_COMPLETENESS_REPORT,
  getCompletenessReport: getCommunityTypesCompletenessReport,
  assertCompleteness: assertCommunityTypesCompleteness,
});

export default communityTypes;
