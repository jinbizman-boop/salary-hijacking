export type CommunityBoardType =
  | "SALARY_TALK"
  | "BUDGET_TIP"
  | "EXPENSE_CUT"
  | "SAVINGS_GOAL"
  | "LEVEL_CERTIFICATION"
  | "SIDE_HUSTLE"
  | "HEALTH_ROUTINE"
  | "FREE";

export type CommunitySort = "LATEST" | "POPULAR" | "COMMENTS" | "BOOKMARKED";
export type CommunityShareChannel =
  | "SYSTEM_SHARE"
  | "COPY_LINK"
  | "KAKAO"
  | "NAVER"
  | "OTHER";
export type ModerationStatus =
  | "SAFE"
  | "REVIEW"
  | "BLOCKED"
  | "HIDDEN"
  | "DELETED";
export type AttachmentScanStatus = "PENDING" | "CLEAN" | "REJECTED";
export type CommunityIssueCode =
  | "REQUIRED"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "TOO_MANY_TAGS"
  | "INVALID_TAG"
  | "PERSONAL_DATA"
  | "FINANCIAL_DATA"
  | "RISKY_ADVICE"
  | "ABUSIVE_CONTENT"
  | "EXTERNAL_LINK";

export type CommunityPostDraft = Readonly<{
  boardType: CommunityBoardType;
  title: string;
  content: string;
  tags: readonly string[];
  anonymous: boolean;
}>;

export type CommunityCommentDraft = Readonly<{
  content: string;
  anonymous: boolean;
}>;

export type CommunityValidationIssue = Readonly<{
  code: CommunityIssueCode;
  field: "title" | "content" | "tags";
  message: string;
}>;

export type CommunityValidationResult = Readonly<{
  valid: boolean;
  issues: readonly CommunityValidationIssue[];
  moderationStatus: "SAFE" | "REVIEW" | "BLOCKED";
}>;

export type CommunityPost = Readonly<{
  id: string;
  boardType: CommunityBoardType;
  title: string;
  bodyPreview: string;
  anonymousDisplayName: string;
  moderationStatus: ModerationStatus;
  likeCount: number;
  likedByMe?: boolean;
  commentCount: number;
  bookmarkCount: number;
  bookmarkedByMe?: boolean;
  shareCount?: number;
  createdAt: string;
  updatedAt: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

export type CommunityComment = Readonly<{
  id: string;
  postId: string;
  content: string;
  anonymousDisplayName: string;
  moderationStatus: ModerationStatus;
  likeCount: number;
  likedByMe?: boolean;
  createdAt: string;
  updatedAt: string;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
}>;

export type CommunityAttachment = Readonly<{
  id: string;
  name: string;
  mediaType: "image" | "file";
  uri: string | null;
  scanStatus: AttachmentScanStatus;
}>;

export type CommunityPostDetail = Readonly<{
  post: CommunityPost;
  content: string;
  tags: readonly string[];
  attachments: readonly CommunityAttachment[];
  comments: readonly CommunityComment[];
}>;

export type CommunityFeedQuery = Readonly<{
  boardType?: CommunityBoardType;
  sort?: CommunitySort;
  page?: number;
  pageSize?: number;
  query?: string;
}>;

export type CommunityPageMeta = Readonly<{
  page: number;
  pageSize: number;
  total: number;
}>;

export type CommunityFeedPage = Readonly<{
  items: readonly CommunityPost[];
  meta: CommunityPageMeta;
}>;

export type CommunityAdDisclosureModel = Readonly<{
  id: string;
  label: "광고" | "제휴";
  title: string;
  description: string;
  destinationUrl: string;
  contextualOnly: true;
  rawFinancialDataExposed: false;
  rawPersonalDataExposed: false;
  adsFinancialTargetingUsed: false;
}>;

export type CommunityRequestOptions = Readonly<{
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}>;

export type CommunityApiResponse = Readonly<{
  data: unknown;
  meta?: Readonly<{ requestId?: string }>;
}>;

export type CommunityApiTransport = Readonly<{
  request: (
    path: string,
    options?: CommunityRequestOptions,
  ) => Promise<CommunityApiResponse>;
}>;

export type CommunityService = Readonly<{
  listBoards: () => Promise<CommunityApiResponse>;
  listPosts: (query?: CommunityFeedQuery) => Promise<CommunityApiResponse>;
  getPost: (postId: string) => Promise<CommunityApiResponse>;
  previewPost: (draft: CommunityPostDraft) => CommunityValidationResult;
  publishPost: (draft: CommunityPostDraft) => Promise<CommunityApiResponse>;
  updatePost: (
    postId: string,
    draft: CommunityPostDraft,
  ) => Promise<CommunityApiResponse>;
  deletePost: (postId: string) => Promise<CommunityApiResponse>;
  setPostLiked: (
    postId: string,
    liked: boolean,
  ) => Promise<CommunityApiResponse>;
  setCommentLiked: (
    commentId: string,
    liked: boolean,
  ) => Promise<CommunityApiResponse>;
  setPostBookmarked: (
    postId: string,
    bookmarked: boolean,
  ) => Promise<CommunityApiResponse>;
  recordPostShare: (
    postId: string,
    channel: CommunityShareChannel,
  ) => Promise<CommunityApiResponse>;
  listComments: (
    postId: string,
    page?: number,
    pageSize?: number,
  ) => Promise<CommunityApiResponse>;
  createComment: (
    postId: string,
    draft: CommunityCommentDraft,
  ) => Promise<CommunityApiResponse>;
  updateComment: (
    commentId: string,
    draft: CommunityCommentDraft,
  ) => Promise<CommunityApiResponse>;
  deleteComment: (commentId: string) => Promise<CommunityApiResponse>;
  reportPost: (
    postId: string,
    reasonType: string,
    reason: string,
  ) => Promise<CommunityApiResponse>;
  reportComment: (
    commentId: string,
    reasonType: string,
    reason: string,
  ) => Promise<CommunityApiResponse>;
  listMyPosts: (
    page?: number,
    pageSize?: number,
  ) => Promise<CommunityApiResponse>;
  listMyComments: (
    page?: number,
    pageSize?: number,
  ) => Promise<CommunityApiResponse>;
}>;
