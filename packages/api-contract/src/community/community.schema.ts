/**
 * packages/api-contract/src/community/community.schema.ts
 *
 * 급여납치 Salary Hijacking Platform · Community API Contract
 *
 * 파일 목적:
 * - 모바일 앱, 관리자 콘솔, API 서버가 공유하는 커뮤니티 API 계약을 정의한다.
 * - 커뮤니티 목록, 상세, 글쓰기, 수정, 삭제, 댓글, 대댓글, 반응, 북마크, 공유, 신고, 첨부, 검색, 관리자 모더레이션 계약을 포함한다.
 * - 익명 표시와 내부 소유권 추적을 분리한다.
 * - public 응답에는 작성자 식별정보, 원문 PII, token, secret, raw IP, raw User-Agent, 재무 원천 데이터를 노출하지 않는다.
 * - 커뮤니티 데이터와 급여·지출·저축·예산·납치금액 원천 데이터를 결합하지 않는다.
 * - 광고/제휴 이벤트와 커뮤니티 민감 콘텐츠의 직접 결합을 방지한다.
 */

import { z } from "zod";
import {
  IdempotencyKeySchema,
  IsoDateTimeSchema,
  ListQuerySchema,
  RequestIdSchema,
  TraceIdSchema,
  UrlSchema,
  UuidSchema,
  createListResponseSchema,
  createMutationResponseSchema,
  createSuccessResponseSchema,
} from "../common/response.schema";

/* -----------------------------------------------------------------------------
 * 1. Contract metadata
 * -------------------------------------------------------------------------- */

export const COMMUNITY_CONTRACT_VERSION = "1.0.0" as const;
export const COMMUNITY_TIMEZONE = "Asia/Seoul" as const;
export const COMMUNITY_DEFAULT_LOCALE = "ko-KR" as const;

/* -----------------------------------------------------------------------------
 * 2. Enum schemas
 * -------------------------------------------------------------------------- */

export const CommunityBoardSchema = z.enum([
  "ALL",
  "FREE",
  "LEVEL_UP_CERTIFICATION",
  "CONSUMPTION_CONTROL",
  "SAVING_TIP",
  "SALARY_TALK",
  "HOBBY",
  "NOTICE",
  "EVENT",
]);

export const CommunityWritableBoardSchema = z.enum([
  "FREE",
  "LEVEL_UP_CERTIFICATION",
  "CONSUMPTION_CONTROL",
  "SAVING_TIP",
  "SALARY_TALK",
  "HOBBY",
]);

export const CommunityAdminBoardSchema = z.enum(["NOTICE", "EVENT"]);

export const CommunityPostStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "HIDDEN",
  "BLINDED",
  "DELETED",
  "ARCHIVED",
]);

export const CommunityCommentStatusSchema = z.enum([
  "PUBLISHED",
  "HIDDEN",
  "BLINDED",
  "DELETED",
]);

export const CommunityVisibilitySchema = z.enum([
  "PUBLIC",
  "MEMBERS_ONLY",
  "ADMIN_ONLY",
]);

export const CommunityAuthorDisplayModeSchema = z.enum([
  "NICKNAME",
  "ANONYMOUS",
  "ADMIN",
  "SYSTEM",
]);

export const CommunityReactionTypeSchema = z.enum([
  "LIKE",
  "EMPATHY",
  "CHEER",
  "SAVED_MONEY",
  "LEVEL_UP",
]);

export const CommunityReportTargetTypeSchema = z.enum([
  "POST",
  "COMMENT",
  "REPLY",
  "ATTACHMENT",
]);

export const CommunityReportReasonSchema = z.enum([
  "SPAM",
  "ABUSE",
  "HATE_OR_DISCRIMINATION",
  "HARASSMENT",
  "SEXUAL_CONTENT",
  "ILLEGAL_FINANCE",
  "GAMBLING_OR_SPECULATION",
  "SCAM_OR_PHISHING",
  "PERSONAL_INFORMATION",
  "RAW_FINANCIAL_DATA_EXPOSURE",
  "AD_OR_PARTNER_POLICY_VIOLATION",
  "MISINFORMATION",
  "OTHER",
]);

export const CommunityReportStatusSchema = z.enum([
  "OPEN",
  "IN_REVIEW",
  "ACTION_TAKEN",
  "REJECTED",
  "CLOSED",
]);

export const CommunityModerationActionSchema = z.enum([
  "NONE",
  "HIDE",
  "BLIND",
  "DELETE",
  "RESTORE",
  "LOCK_COMMENTS",
  "UNLOCK_COMMENTS",
  "WARN_AUTHOR",
  "SUSPEND_AUTHOR",
  "ESCALATE",
]);

export const CommunityModerationExecutableActionSchema = z.enum([
  "HIDE",
  "BLIND",
  "DELETE",
  "RESTORE",
  "LOCK_COMMENTS",
  "UNLOCK_COMMENTS",
  "WARN_AUTHOR",
  "SUSPEND_AUTHOR",
  "ESCALATE",
]);

export const CommunityAttachmentTypeSchema = z.enum([
  "IMAGE",
  "DOCUMENT",
  "LINK_PREVIEW",
]);

export const CommunityAttachmentScanStatusSchema = z.enum([
  "PENDING",
  "CLEAN",
  "QUARANTINED",
  "REJECTED",
  "FAILED",
]);

export const CommunitySortBySchema = z.enum([
  "latest",
  "popular",
  "commented",
  "reaction",
  "reported",
]);

export const CommunityAdminSortBySchema = z.enum([
  "latest",
  "reported",
  "hidden",
  "blinded",
  "deleted",
  "risk",
]);

/* -----------------------------------------------------------------------------
 * 3. Primitive and policy schemas
 * -------------------------------------------------------------------------- */

export const CommunityTitleSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .describe(
    "Community post title. Must not include raw PII or raw financial data.",
  );

export const CommunityBodySchema = z
  .string()
  .trim()
  .min(1)
  .max(10000)
  .describe(
    "Community post body. Must not include token, secret or raw financial data.",
  );

export const CommunityExcerptSchema = z.string().trim().min(0).max(300);

export const CommunityCommentBodySchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .describe("Community comment body.");

export const CommunityTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .regex(/^[가-힣a-zA-Z0-9._-]+$/);

export const CommunitySlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9-]+$/);

export const CommunitySafeDisplayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .describe(
    "Public-safe display name. Raw email, phone number or account id is not allowed.",
  );

export const CommunitySafeHashSchema = z
  .string()
  .trim()
  .min(16)
  .max(256)
  .regex(/^[a-zA-Z0-9._:$/-]+$/)
  .describe("Hash or pseudonymous identifier. Raw PII is not allowed.");

export const CommunityRequestContextSchema = z
  .object({
    requestId: RequestIdSchema.optional(),
    traceId: TraceIdSchema.optional(),
    viewerUserId: UuidSchema.optional(),
    adminUserId: UuidSchema.optional(),
  })
  .strict();

export const CommunityPolicyGuardSchema = z
  .object({
    rawPiiIncluded: z.literal(false).default(false),
    rawSecretIncluded: z.literal(false).default(false),
    rawTokenIncluded: z.literal(false).default(false),
    rawFinancialSourceDataIncluded: z.literal(false).default(false),
    adsFinancialJoinAllowed: z.literal(false).default(false),
    anonymousAuthorPubliclyIdentifiable: z.literal(false).default(false),
  })
  .strict();

export const CommunityCountsSchema = z
  .object({
    viewCount: z.number().int().min(0).default(0),
    commentCount: z.number().int().min(0).default(0),
    reactionCount: z.number().int().min(0).default(0),
    bookmarkCount: z.number().int().min(0).default(0),
    reportCount: z.number().int().min(0).default(0),
    shareCount: z.number().int().min(0).default(0),
  })
  .strict();

export const CommunityReactionSummarySchema = z
  .object({
    like: z.number().int().min(0).default(0),
    empathy: z.number().int().min(0).default(0),
    cheer: z.number().int().min(0).default(0),
    savedMoney: z.number().int().min(0).default(0),
    levelUp: z.number().int().min(0).default(0),
  })
  .strict();

export const CommunityViewerStateSchema = z
  .object({
    reactedTypes: z.array(CommunityReactionTypeSchema).max(5).default([]),
    bookmarked: z.boolean().default(false),
    reported: z.boolean().default(false),
    editable: z.boolean().default(false),
    deletable: z.boolean().default(false),
    commentWritable: z.boolean().default(true),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 4. Author, owner trace and attachment schemas
 * -------------------------------------------------------------------------- */

export const CommunityPublicAuthorSchema = z
  .object({
    displayMode: CommunityAuthorDisplayModeSchema,
    displayName: CommunitySafeDisplayNameSchema,
    avatarUrl: UrlSchema.optional(),
    badgeLabels: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
    isMe: z.boolean().default(false),
  })
  .strict()
  .describe(
    "Public author view. Must not expose owner user id, email or phone.",
  );

export const CommunityOwnerTraceSchema = z
  .object({
    ownerUserId: UuidSchema,
    ownerHash: CommunitySafeHashSchema,
    ipHash: CommunitySafeHashSchema.optional(),
    userAgentHash: CommunitySafeHashSchema.optional(),
    deviceHash: CommunitySafeHashSchema.optional(),
    retainedUntil: IsoDateTimeSchema,
  })
  .strict()
  .describe("Admin/server-only owner trace. Never expose in public response.");

export const CommunityAttachmentSchema = z
  .object({
    id: UuidSchema,
    type: CommunityAttachmentTypeSchema,
    url: UrlSchema.optional(),
    fileName: z.string().trim().min(1).max(255).optional(),
    contentType: z.string().trim().min(1).max(120).optional(),
    sizeBytes: z
      .number()
      .int()
      .min(0)
      .max(20 * 1024 * 1024)
      .optional(),
    width: z.number().int().min(1).max(10000).optional(),
    height: z.number().int().min(1).max(10000).optional(),
    altText: z.string().trim().max(200).optional(),
    scanStatus: CommunityAttachmentScanStatusSchema,
    createdAt: IsoDateTimeSchema,
  })
  .strict();

export const CommunityAttachmentInputSchema = z
  .object({
    type: CommunityAttachmentTypeSchema,
    uploadId: UuidSchema.optional(),
    url: UrlSchema.optional(),
    altText: z.string().trim().max(200).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.uploadId === undefined && value.url === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either uploadId or url is required.",
        path: ["uploadId"],
      });
    }
  });

/* -----------------------------------------------------------------------------
 * 5. Post, comment, report and moderation schemas
 * -------------------------------------------------------------------------- */

export const CommunityModerationStateSchema = z
  .object({
    action: CommunityModerationActionSchema.default("NONE"),
    lockedComments: z.boolean().default(false),
    riskScore: z.number().int().min(0).max(100).default(0),
    policyLabels: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    moderatedAt: IsoDateTimeSchema.optional(),
    moderatorAdminId: UuidSchema.optional(),
    moderationReason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();

export const CommunityPostSummarySchema = z
  .object({
    id: UuidSchema,
    board: CommunityBoardSchema,
    status: CommunityPostStatusSchema,
    visibility: CommunityVisibilitySchema,
    title: CommunityTitleSchema,
    excerpt: CommunityExcerptSchema,
    slug: CommunitySlugSchema.optional(),
    author: CommunityPublicAuthorSchema,
    tags: z.array(CommunityTagSchema).max(10).default([]),
    counts: CommunityCountsSchema,
    reactions: CommunityReactionSummarySchema,
    viewerState: CommunityViewerStateSchema.optional(),
    policy: CommunityPolicyGuardSchema.default({
      rawPiiIncluded: false,
      rawSecretIncluded: false,
      rawTokenIncluded: false,
      rawFinancialSourceDataIncluded: false,
      adsFinancialJoinAllowed: false,
      anonymousAuthorPubliclyIdentifiable: false,
    }),
    pinned: z.boolean().default(false),
    publishedAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const CommunityPostSchema = CommunityPostSummarySchema.extend({
  body: CommunityBodySchema,
  attachments: z.array(CommunityAttachmentSchema).max(10).default([]),
  moderation: CommunityModerationStateSchema.optional(),
}).strict();

export const CommunityAdminPostSchema = CommunityPostSchema.extend({
  ownerTrace: CommunityOwnerTraceSchema,
  internalNotes: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
}).strict();

export const CommunityCommentSchema = z
  .object({
    id: UuidSchema,
    postId: UuidSchema,
    parentCommentId: UuidSchema.nullable().default(null),
    status: CommunityCommentStatusSchema,
    body: CommunityCommentBodySchema,
    author: CommunityPublicAuthorSchema,
    counts: z
      .object({
        replyCount: z.number().int().min(0).default(0),
        reactionCount: z.number().int().min(0).default(0),
        reportCount: z.number().int().min(0).default(0),
      })
      .strict(),
    reactions: CommunityReactionSummarySchema,
    viewerState: CommunityViewerStateSchema.optional(),
    policy: CommunityPolicyGuardSchema.default({
      rawPiiIncluded: false,
      rawSecretIncluded: false,
      rawTokenIncluded: false,
      rawFinancialSourceDataIncluded: false,
      adsFinancialJoinAllowed: false,
      anonymousAuthorPubliclyIdentifiable: false,
    }),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict();

export const CommunityAdminCommentSchema = CommunityCommentSchema.extend({
  ownerTrace: CommunityOwnerTraceSchema,
  moderation: CommunityModerationStateSchema.optional(),
}).strict();

export const CommunityReportSchema = z
  .object({
    id: UuidSchema,
    targetType: CommunityReportTargetTypeSchema,
    targetId: UuidSchema,
    reason: CommunityReportReasonSchema,
    detail: z.string().trim().max(1000).optional(),
    status: CommunityReportStatusSchema,
    reporterHash: CommunitySafeHashSchema,
    assignedAdminId: UuidSchema.optional(),
    createdAt: IsoDateTimeSchema,
    reviewedAt: IsoDateTimeSchema.optional(),
    resolvedAt: IsoDateTimeSchema.optional(),
  })
  .strict();

export const CommunityMetricsSchema = z
  .object({
    postCount: z.number().int().min(0),
    commentCount: z.number().int().min(0),
    activeAuthorCount: z.number().int().min(0),
    reportCount: z.number().int().min(0),
    hiddenCount: z.number().int().min(0),
    blindedCount: z.number().int().min(0),
    deletedCount: z.number().int().min(0),
    topBoards: z
      .array(
        z
          .object({
            board: CommunityBoardSchema,
            count: z.number().int().min(0),
          })
          .strict(),
      )
      .max(20),
    measuredAt: IsoDateTimeSchema,
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 6. Request schemas
 * -------------------------------------------------------------------------- */

export const ListCommunityPostsRequestSchema = ListQuerySchema.extend({
  board: CommunityBoardSchema.default("ALL"),
  status: CommunityPostStatusSchema.default("PUBLISHED"),
  sortBy: CommunitySortBySchema.default("latest"),
  tags: z.array(CommunityTagSchema).max(10).default([]),
  includeViewerState: z.boolean().default(true),
  context: CommunityRequestContextSchema.optional(),
}).strict();

export const SearchCommunityPostsRequestSchema =
  ListCommunityPostsRequestSchema.extend({
    search: z.string().trim().min(1).max(120),
  }).strict();

export const GetCommunityPostRequestSchema = z
  .object({
    postId: UuidSchema,
    includeComments: z.boolean().default(true),
    includeViewerState: z.boolean().default(true),
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const CreateCommunityPostRequestSchema = z
  .object({
    board: CommunityWritableBoardSchema,
    title: CommunityTitleSchema,
    body: CommunityBodySchema,
    visibility: CommunityVisibilitySchema.default("PUBLIC"),
    tags: z.array(CommunityTagSchema).max(10).default([]),
    attachments: z.array(CommunityAttachmentInputSchema).max(10).default([]),
    anonymous: z.boolean().default(false),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const CreateAdminCommunityPostRequestSchema = z
  .object({
    board: CommunityAdminBoardSchema,
    title: CommunityTitleSchema,
    body: CommunityBodySchema,
    visibility: CommunityVisibilitySchema.default("PUBLIC"),
    tags: z.array(CommunityTagSchema).max(10).default([]),
    attachments: z.array(CommunityAttachmentInputSchema).max(10).default([]),
    pinned: z.boolean().default(false),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const UpdateCommunityPostRequestSchema = z
  .object({
    postId: UuidSchema,
    title: CommunityTitleSchema.optional(),
    body: CommunityBodySchema.optional(),
    visibility: CommunityVisibilitySchema.optional(),
    tags: z.array(CommunityTagSchema).max(10).optional(),
    attachments: z.array(CommunityAttachmentInputSchema).max(10).optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasPatch =
      value.title !== undefined ||
      value.body !== undefined ||
      value.visibility !== undefined ||
      value.tags !== undefined ||
      value.attachments !== undefined;

    if (!hasPatch) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one post update field is required.",
        path: ["postId"],
      });
    }
  });

export const DeleteCommunityPostRequestSchema = z
  .object({
    postId: UuidSchema,
    reason: z.string().trim().min(1).max(500).optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const ListCommunityCommentsRequestSchema = ListQuerySchema.extend({
  postId: UuidSchema,
  parentCommentId: UuidSchema.nullable().optional(),
  includeViewerState: z.boolean().default(true),
  context: CommunityRequestContextSchema.optional(),
}).strict();

export const CreateCommunityCommentRequestSchema = z
  .object({
    postId: UuidSchema,
    parentCommentId: UuidSchema.nullable().default(null),
    body: CommunityCommentBodySchema,
    anonymous: z.boolean().default(false),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const UpdateCommunityCommentRequestSchema = z
  .object({
    commentId: UuidSchema,
    body: CommunityCommentBodySchema,
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const DeleteCommunityCommentRequestSchema = z
  .object({
    commentId: UuidSchema,
    reason: z.string().trim().min(1).max(500).optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const LikeCommunityCommentRequestSchema = z
  .object({
    commentId: UuidSchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const UnlikeCommunityCommentRequestSchema = z
  .object({
    commentId: UuidSchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const ReactCommunityTargetRequestSchema = z
  .object({
    targetType: z.enum(["POST", "COMMENT"]),
    targetId: UuidSchema,
    reactionType: CommunityReactionTypeSchema,
    enabled: z.boolean(),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const BookmarkCommunityPostRequestSchema = z
  .object({
    postId: UuidSchema,
    enabled: z.boolean(),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const ShareCommunityPostRequestSchema = z
  .object({
    postId: UuidSchema,
    channel: z.enum(["COPY_LINK", "KAKAO", "NAVER", "SYSTEM_SHARE", "OTHER"]),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const ReportCommunityTargetRequestSchema = z
  .object({
    targetType: CommunityReportTargetTypeSchema,
    targetId: UuidSchema,
    reason: CommunityReportReasonSchema,
    detail: z.string().trim().max(1000).optional(),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const ListCommunityReportsAdminRequestSchema = ListQuerySchema.extend({
  status: CommunityReportStatusSchema.optional(),
  reason: CommunityReportReasonSchema.optional(),
  targetType: CommunityReportTargetTypeSchema.optional(),
  sortBy: CommunityAdminSortBySchema.default("reported"),
  context: CommunityRequestContextSchema.optional(),
}).strict();

export const GetCommunityPostAdminRequestSchema = z
  .object({
    postId: UuidSchema,
    includeOwnerTrace: z.literal(true).default(true),
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const ModerateCommunityTargetAdminRequestSchema = z
  .object({
    targetType: CommunityReportTargetTypeSchema,
    targetId: UuidSchema,
    action: CommunityModerationExecutableActionSchema,
    reason: z.string().trim().min(1).max(1000),
    reportId: UuidSchema.optional(),
    notifyAuthor: z.boolean().default(true),
    idempotencyKey: IdempotencyKeySchema,
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

export const GetCommunityMetricsAdminRequestSchema = z
  .object({
    from: IsoDateTimeSchema.optional(),
    to: IsoDateTimeSchema.optional(),
    board: CommunityBoardSchema.optional(),
    context: CommunityRequestContextSchema.optional(),
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 7. Result schemas
 * -------------------------------------------------------------------------- */

export const CommunityDeleteResultSchema = z
  .object({
    id: UuidSchema,
    deleted: z.literal(true),
    deletedAt: IsoDateTimeSchema,
  })
  .strict();

export const CommunityReactionResultSchema = z
  .object({
    targetType: z.enum(["POST", "COMMENT"]),
    targetId: UuidSchema,
    reactionType: CommunityReactionTypeSchema,
    enabled: z.boolean(),
    reactions: CommunityReactionSummarySchema,
  })
  .strict();

export const CommunityCommentLikeResultSchema = z
  .object({
    commentId: UuidSchema,
    state: z.enum(["LIKED", "UNLIKED"]),
    likeCount: z.number().int().min(0),
    serverAuthority: z.literal(true),
    financialRawDataExposed: z.literal(false),
    rawPersonalDataExposed: z.literal(false),
    adsFinancialTargetingUsed: z.literal(false),
  })
  .strict();

export const CommunityBookmarkResultSchema = z
  .object({
    postId: UuidSchema,
    enabled: z.boolean(),
    bookmarkCount: z.number().int().min(0),
  })
  .strict();

export const CommunityShareResultSchema = z
  .object({
    postId: UuidSchema,
    channel: z.enum(["COPY_LINK", "KAKAO", "NAVER", "SYSTEM_SHARE", "OTHER"]),
    shareCount: z.number().int().min(0),
    shareUrl: UrlSchema.optional(),
  })
  .strict();

export const CommunityModerationResultSchema = z
  .object({
    targetType: CommunityReportTargetTypeSchema,
    targetId: UuidSchema,
    action: CommunityModerationExecutableActionSchema,
    status: z.enum(["APPLIED", "QUEUED", "REJECTED"]),
    moderatedAt: IsoDateTimeSchema,
  })
  .strict();

/* -----------------------------------------------------------------------------
 * 8. Response schemas
 * -------------------------------------------------------------------------- */

export const ListCommunityPostsResponseSchema = createListResponseSchema(
  CommunityPostSummarySchema,
);

export const SearchCommunityPostsResponseSchema = createListResponseSchema(
  CommunityPostSummarySchema,
);

export const GetCommunityPostResponseSchema =
  createSuccessResponseSchema(CommunityPostSchema);

export const CreateCommunityPostResponseSchema =
  createMutationResponseSchema(CommunityPostSchema);

export const UpdateCommunityPostResponseSchema =
  createMutationResponseSchema(CommunityPostSchema);

export const DeleteCommunityPostResponseSchema = createMutationResponseSchema(
  CommunityDeleteResultSchema,
);

export const ListCommunityCommentsResponseSchema = createListResponseSchema(
  CommunityCommentSchema,
);

export const CreateCommunityCommentResponseSchema =
  createMutationResponseSchema(CommunityCommentSchema);

export const UpdateCommunityCommentResponseSchema =
  createMutationResponseSchema(CommunityCommentSchema);

export const DeleteCommunityCommentResponseSchema =
  createMutationResponseSchema(CommunityDeleteResultSchema);

export const ReactCommunityTargetResponseSchema = createMutationResponseSchema(
  CommunityReactionResultSchema,
);

export const LikeCommunityCommentResponseSchema = createMutationResponseSchema(
  CommunityCommentLikeResultSchema,
);

export const UnlikeCommunityCommentResponseSchema =
  createMutationResponseSchema(CommunityCommentLikeResultSchema);

export const BookmarkCommunityPostResponseSchema = createMutationResponseSchema(
  CommunityBookmarkResultSchema,
);

export const ShareCommunityPostResponseSchema = createMutationResponseSchema(
  CommunityShareResultSchema,
);

export const ReportCommunityTargetResponseSchema = createMutationResponseSchema(
  CommunityReportSchema,
);

export const ListCommunityReportsAdminResponseSchema = createListResponseSchema(
  CommunityReportSchema,
);

export const GetCommunityPostAdminResponseSchema = createSuccessResponseSchema(
  CommunityAdminPostSchema,
);

export const ModerateCommunityTargetAdminResponseSchema =
  createMutationResponseSchema(CommunityModerationResultSchema);

export const GetCommunityMetricsAdminResponseSchema =
  createSuccessResponseSchema(CommunityMetricsSchema);

/* -----------------------------------------------------------------------------
 * 9. API paths and endpoint contract
 * -------------------------------------------------------------------------- */

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
  adminMetrics: "/admin/community/metrics",
} as const);

export const CommunityEndpointContract = Object.freeze({
  listPosts: {
    method: "GET",
    path: COMMUNITY_API_PATHS.listPosts,
    request: ListCommunityPostsRequestSchema,
    response: ListCommunityPostsResponseSchema,
  },
  searchPosts: {
    method: "GET",
    path: COMMUNITY_API_PATHS.searchPosts,
    request: SearchCommunityPostsRequestSchema,
    response: SearchCommunityPostsResponseSchema,
  },
  getPost: {
    method: "GET",
    path: COMMUNITY_API_PATHS.getPost,
    request: GetCommunityPostRequestSchema,
    response: GetCommunityPostResponseSchema,
  },
  createPost: {
    method: "POST",
    path: COMMUNITY_API_PATHS.createPost,
    request: CreateCommunityPostRequestSchema,
    response: CreateCommunityPostResponseSchema,
  },
  createAdminPost: {
    method: "POST",
    path: COMMUNITY_API_PATHS.createAdminPost,
    request: CreateAdminCommunityPostRequestSchema,
    response: CreateCommunityPostResponseSchema,
  },
  updatePost: {
    method: "PATCH",
    path: COMMUNITY_API_PATHS.updatePost,
    request: UpdateCommunityPostRequestSchema,
    response: UpdateCommunityPostResponseSchema,
  },
  deletePost: {
    method: "DELETE",
    path: COMMUNITY_API_PATHS.deletePost,
    request: DeleteCommunityPostRequestSchema,
    response: DeleteCommunityPostResponseSchema,
  },
  listComments: {
    method: "GET",
    path: COMMUNITY_API_PATHS.listComments,
    request: ListCommunityCommentsRequestSchema,
    response: ListCommunityCommentsResponseSchema,
  },
  createComment: {
    method: "POST",
    path: COMMUNITY_API_PATHS.createComment,
    request: CreateCommunityCommentRequestSchema,
    response: CreateCommunityCommentResponseSchema,
  },
  updateComment: {
    method: "PATCH",
    path: COMMUNITY_API_PATHS.updateComment,
    request: UpdateCommunityCommentRequestSchema,
    response: UpdateCommunityCommentResponseSchema,
  },
  deleteComment: {
    method: "DELETE",
    path: COMMUNITY_API_PATHS.deleteComment,
    request: DeleteCommunityCommentRequestSchema,
    response: DeleteCommunityCommentResponseSchema,
  },
  likeComment: {
    method: "POST",
    path: COMMUNITY_API_PATHS.likeComment,
    request: LikeCommunityCommentRequestSchema,
    response: LikeCommunityCommentResponseSchema,
  },
  unlikeComment: {
    method: "DELETE",
    path: COMMUNITY_API_PATHS.unlikeComment,
    request: UnlikeCommunityCommentRequestSchema,
    response: UnlikeCommunityCommentResponseSchema,
  },
  reactTarget: {
    method: "POST",
    path: COMMUNITY_API_PATHS.reactTarget,
    request: ReactCommunityTargetRequestSchema,
    response: ReactCommunityTargetResponseSchema,
  },
  bookmarkPost: {
    method: "POST",
    path: COMMUNITY_API_PATHS.bookmarkPost,
    request: BookmarkCommunityPostRequestSchema,
    response: BookmarkCommunityPostResponseSchema,
  },
  sharePost: {
    method: "POST",
    path: COMMUNITY_API_PATHS.sharePost,
    request: ShareCommunityPostRequestSchema,
    response: ShareCommunityPostResponseSchema,
  },
  reportTarget: {
    method: "POST",
    path: COMMUNITY_API_PATHS.reportTarget,
    request: ReportCommunityTargetRequestSchema,
    response: ReportCommunityTargetResponseSchema,
  },
  adminListReports: {
    method: "GET",
    path: COMMUNITY_API_PATHS.adminListReports,
    request: ListCommunityReportsAdminRequestSchema,
    response: ListCommunityReportsAdminResponseSchema,
  },
  adminGetPost: {
    method: "GET",
    path: COMMUNITY_API_PATHS.adminGetPost,
    request: GetCommunityPostAdminRequestSchema,
    response: GetCommunityPostAdminResponseSchema,
  },
  adminModerateTarget: {
    method: "POST",
    path: COMMUNITY_API_PATHS.adminModerateTarget,
    request: ModerateCommunityTargetAdminRequestSchema,
    response: ModerateCommunityTargetAdminResponseSchema,
  },
  adminMetrics: {
    method: "GET",
    path: COMMUNITY_API_PATHS.adminMetrics,
    request: GetCommunityMetricsAdminRequestSchema,
    response: GetCommunityMetricsAdminResponseSchema,
  },
} as const);

/* -----------------------------------------------------------------------------
 * 10. Public schema registry
 * -------------------------------------------------------------------------- */

export const CommunitySchemas = Object.freeze({
  enums: {
    CommunityBoardSchema,
    CommunityWritableBoardSchema,
    CommunityAdminBoardSchema,
    CommunityPostStatusSchema,
    CommunityCommentStatusSchema,
    CommunityVisibilitySchema,
    CommunityAuthorDisplayModeSchema,
    CommunityReactionTypeSchema,
    CommunityReportTargetTypeSchema,
    CommunityReportReasonSchema,
    CommunityReportStatusSchema,
    CommunityModerationActionSchema,
    CommunityModerationExecutableActionSchema,
    CommunityAttachmentTypeSchema,
    CommunityAttachmentScanStatusSchema,
    CommunitySortBySchema,
    CommunityAdminSortBySchema,
  },
  primitives: {
    CommunityTitleSchema,
    CommunityBodySchema,
    CommunityExcerptSchema,
    CommunityCommentBodySchema,
    CommunityTagSchema,
    CommunitySlugSchema,
    CommunitySafeDisplayNameSchema,
    CommunitySafeHashSchema,
  },
  policy: {
    CommunityRequestContextSchema,
    CommunityPolicyGuardSchema,
    CommunityCountsSchema,
    CommunityReactionSummarySchema,
    CommunityViewerStateSchema,
  },
  author: {
    CommunityPublicAuthorSchema,
    CommunityOwnerTraceSchema,
  },
  attachment: {
    CommunityAttachmentSchema,
    CommunityAttachmentInputSchema,
  },
  entity: {
    CommunityModerationStateSchema,
    CommunityPostSummarySchema,
    CommunityPostSchema,
    CommunityAdminPostSchema,
    CommunityCommentSchema,
    CommunityAdminCommentSchema,
    CommunityReportSchema,
    CommunityMetricsSchema,
  },
  request: {
    ListCommunityPostsRequestSchema,
    SearchCommunityPostsRequestSchema,
    GetCommunityPostRequestSchema,
    CreateCommunityPostRequestSchema,
    CreateAdminCommunityPostRequestSchema,
    UpdateCommunityPostRequestSchema,
    DeleteCommunityPostRequestSchema,
    ListCommunityCommentsRequestSchema,
    CreateCommunityCommentRequestSchema,
    UpdateCommunityCommentRequestSchema,
    DeleteCommunityCommentRequestSchema,
    LikeCommunityCommentRequestSchema,
    UnlikeCommunityCommentRequestSchema,
    ReactCommunityTargetRequestSchema,
    BookmarkCommunityPostRequestSchema,
    ShareCommunityPostRequestSchema,
    ReportCommunityTargetRequestSchema,
    ListCommunityReportsAdminRequestSchema,
    GetCommunityPostAdminRequestSchema,
    ModerateCommunityTargetAdminRequestSchema,
    GetCommunityMetricsAdminRequestSchema,
  },
  result: {
    CommunityDeleteResultSchema,
    CommunityReactionResultSchema,
    CommunityCommentLikeResultSchema,
    CommunityBookmarkResultSchema,
    CommunityShareResultSchema,
    CommunityModerationResultSchema,
  },
  response: {
    ListCommunityPostsResponseSchema,
    SearchCommunityPostsResponseSchema,
    GetCommunityPostResponseSchema,
    CreateCommunityPostResponseSchema,
    UpdateCommunityPostResponseSchema,
    DeleteCommunityPostResponseSchema,
    ListCommunityCommentsResponseSchema,
    CreateCommunityCommentResponseSchema,
    UpdateCommunityCommentResponseSchema,
    DeleteCommunityCommentResponseSchema,
    LikeCommunityCommentResponseSchema,
    UnlikeCommunityCommentResponseSchema,
    ReactCommunityTargetResponseSchema,
    BookmarkCommunityPostResponseSchema,
    ShareCommunityPostResponseSchema,
    ReportCommunityTargetResponseSchema,
    ListCommunityReportsAdminResponseSchema,
    GetCommunityPostAdminResponseSchema,
    ModerateCommunityTargetAdminResponseSchema,
    GetCommunityMetricsAdminResponseSchema,
  },
} as const);

/* -----------------------------------------------------------------------------
 * 11. Parse helpers
 * -------------------------------------------------------------------------- */

export const parseCommunityPost = (input: unknown): CommunityPost =>
  CommunityPostSchema.parse(input);

export const safeParseCommunityPost = (
  input: unknown,
): ReturnType<typeof CommunityPostSchema.safeParse> =>
  CommunityPostSchema.safeParse(input);

export const parseCommunityPostSummary = (
  input: unknown,
): CommunityPostSummary => CommunityPostSummarySchema.parse(input);

export const safeParseCommunityPostSummary = (
  input: unknown,
): ReturnType<typeof CommunityPostSummarySchema.safeParse> =>
  CommunityPostSummarySchema.safeParse(input);

export const parseCommunityComment = (input: unknown): CommunityComment =>
  CommunityCommentSchema.parse(input);

export const safeParseCommunityComment = (
  input: unknown,
): ReturnType<typeof CommunityCommentSchema.safeParse> =>
  CommunityCommentSchema.safeParse(input);

export const parseCommunityReport = (input: unknown): CommunityReport =>
  CommunityReportSchema.parse(input);

export const safeParseCommunityReport = (
  input: unknown,
): ReturnType<typeof CommunityReportSchema.safeParse> =>
  CommunityReportSchema.safeParse(input);

export type CommunityContractSafeParseResult<TSchema extends z.ZodTypeAny> =
  z.SafeParseReturnType<z.input<TSchema>, z.output<TSchema>>;

export const safeParseCommunityContractInput = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown,
): CommunityContractSafeParseResult<TSchema> =>
  schema.safeParse(input) as CommunityContractSafeParseResult<TSchema>;

/* -----------------------------------------------------------------------------
 * 12. Type exports
 * -------------------------------------------------------------------------- */

export type CommunityBoard = z.infer<typeof CommunityBoardSchema>;
export type CommunityWritableBoard = z.infer<
  typeof CommunityWritableBoardSchema
>;
export type CommunityAdminBoard = z.infer<typeof CommunityAdminBoardSchema>;
export type CommunityPostStatus = z.infer<typeof CommunityPostStatusSchema>;
export type CommunityCommentStatus = z.infer<
  typeof CommunityCommentStatusSchema
>;
export type CommunityVisibility = z.infer<typeof CommunityVisibilitySchema>;
export type CommunityAuthorDisplayMode = z.infer<
  typeof CommunityAuthorDisplayModeSchema
>;
export type CommunityReactionType = z.infer<typeof CommunityReactionTypeSchema>;
export type CommunityReportTargetType = z.infer<
  typeof CommunityReportTargetTypeSchema
>;
export type CommunityReportReason = z.infer<typeof CommunityReportReasonSchema>;
export type CommunityReportStatus = z.infer<typeof CommunityReportStatusSchema>;
export type CommunityModerationAction = z.infer<
  typeof CommunityModerationActionSchema
>;
export type CommunityModerationExecutableAction = z.infer<
  typeof CommunityModerationExecutableActionSchema
>;
export type CommunityAttachmentType = z.infer<
  typeof CommunityAttachmentTypeSchema
>;
export type CommunityAttachmentScanStatus = z.infer<
  typeof CommunityAttachmentScanStatusSchema
>;
export type CommunitySortBy = z.infer<typeof CommunitySortBySchema>;
export type CommunityAdminSortBy = z.infer<typeof CommunityAdminSortBySchema>;

export type CommunityRequestContext = z.infer<
  typeof CommunityRequestContextSchema
>;
export type CommunityPolicyGuard = z.infer<typeof CommunityPolicyGuardSchema>;
export type CommunityCounts = z.infer<typeof CommunityCountsSchema>;
export type CommunityReactionSummary = z.infer<
  typeof CommunityReactionSummarySchema
>;
export type CommunityViewerState = z.infer<typeof CommunityViewerStateSchema>;
export type CommunityPublicAuthor = z.infer<typeof CommunityPublicAuthorSchema>;
export type CommunityOwnerTrace = z.infer<typeof CommunityOwnerTraceSchema>;
export type CommunityAttachment = z.infer<typeof CommunityAttachmentSchema>;
export type CommunityAttachmentInput = z.infer<
  typeof CommunityAttachmentInputSchema
>;
export type CommunityModerationState = z.infer<
  typeof CommunityModerationStateSchema
>;
export type CommunityPostSummary = z.infer<typeof CommunityPostSummarySchema>;
export type CommunityPost = z.infer<typeof CommunityPostSchema>;
export type CommunityAdminPost = z.infer<typeof CommunityAdminPostSchema>;
export type CommunityComment = z.infer<typeof CommunityCommentSchema>;
export type CommunityAdminComment = z.infer<typeof CommunityAdminCommentSchema>;
export type CommunityReport = z.infer<typeof CommunityReportSchema>;
export type CommunityMetrics = z.infer<typeof CommunityMetricsSchema>;

export type ListCommunityPostsRequest = z.infer<
  typeof ListCommunityPostsRequestSchema
>;
export type SearchCommunityPostsRequest = z.infer<
  typeof SearchCommunityPostsRequestSchema
>;
export type GetCommunityPostRequest = z.infer<
  typeof GetCommunityPostRequestSchema
>;
export type CreateCommunityPostRequest = z.infer<
  typeof CreateCommunityPostRequestSchema
>;
export type CreateAdminCommunityPostRequest = z.infer<
  typeof CreateAdminCommunityPostRequestSchema
>;
export type UpdateCommunityPostRequest = z.infer<
  typeof UpdateCommunityPostRequestSchema
>;
export type DeleteCommunityPostRequest = z.infer<
  typeof DeleteCommunityPostRequestSchema
>;
export type ListCommunityCommentsRequest = z.infer<
  typeof ListCommunityCommentsRequestSchema
>;
export type CreateCommunityCommentRequest = z.infer<
  typeof CreateCommunityCommentRequestSchema
>;
export type UpdateCommunityCommentRequest = z.infer<
  typeof UpdateCommunityCommentRequestSchema
>;
export type DeleteCommunityCommentRequest = z.infer<
  typeof DeleteCommunityCommentRequestSchema
>;
export type LikeCommunityCommentRequest = z.infer<
  typeof LikeCommunityCommentRequestSchema
>;
export type UnlikeCommunityCommentRequest = z.infer<
  typeof UnlikeCommunityCommentRequestSchema
>;
export type ReactCommunityTargetRequest = z.infer<
  typeof ReactCommunityTargetRequestSchema
>;
export type BookmarkCommunityPostRequest = z.infer<
  typeof BookmarkCommunityPostRequestSchema
>;
export type ShareCommunityPostRequest = z.infer<
  typeof ShareCommunityPostRequestSchema
>;
export type ReportCommunityTargetRequest = z.infer<
  typeof ReportCommunityTargetRequestSchema
>;
export type ListCommunityReportsAdminRequest = z.infer<
  typeof ListCommunityReportsAdminRequestSchema
>;
export type GetCommunityPostAdminRequest = z.infer<
  typeof GetCommunityPostAdminRequestSchema
>;
export type ModerateCommunityTargetAdminRequest = z.infer<
  typeof ModerateCommunityTargetAdminRequestSchema
>;
export type GetCommunityMetricsAdminRequest = z.infer<
  typeof GetCommunityMetricsAdminRequestSchema
>;

export type CommunityDeleteResult = z.infer<typeof CommunityDeleteResultSchema>;
export type CommunityReactionResult = z.infer<
  typeof CommunityReactionResultSchema
>;
export type CommunityCommentLikeResult = z.infer<
  typeof CommunityCommentLikeResultSchema
>;
export type CommunityBookmarkResult = z.infer<
  typeof CommunityBookmarkResultSchema
>;
export type CommunityShareResult = z.infer<typeof CommunityShareResultSchema>;
export type CommunityModerationResult = z.infer<
  typeof CommunityModerationResultSchema
>;

export type CommunityEndpointKey = keyof typeof CommunityEndpointContract;
