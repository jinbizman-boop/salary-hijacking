/**
 * packages/types/src/domain/growth.types.ts
 *
 * 급여납치 Salary Hijacking Platform · Growth / LV UP Domain Types
 *
 * 파일 목적
 * - 모바일 앱, 관리자 콘솔, API 서버, 콘텐츠 운영, 추천/알림/커뮤니티 인증 계층이 공유하는
 *   LV UP 도메인 타입 SSOT를 제공한다.
 * - 독서, 뉴스, 영어, 건강/홈트, 금융상식 퀴즈, 일일 미션, 경험치, 레벨, 스트릭,
 *   추천 콘텐츠, 인증, 포인트/이벤트 연동, 광고/제휴 분리, 운영 감사 타입을 한 파일에 고정한다.
 * - 외부 런타임 의존성 없이 type-only package에서 즉시 사용할 수 있게 순수 TypeScript로만 작성한다.
 */

/* -----------------------------------------------------------------------------
 * 1. Contract metadata and primitive aliases
 * -------------------------------------------------------------------------- */

export const GROWTH_TYPES_CONTRACT_VERSION = "2.0.0" as const;
export const GROWTH_TYPES_PACKAGE = "@salary-hijacking/types" as const;
export const GROWTH_TYPES_DOMAIN = "growth" as const;
export const GROWTH_TIMEZONE = "Asia/Seoul" as const;
export const GROWTH_LOCALE = "ko-KR" as const;
export const GROWTH_LEVEL_MIN = 1 as const;
export const GROWTH_LEVEL_MAX = 999 as const;
export const GROWTH_EXP_MIN = 0 as const;
export const GROWTH_EXP_MAX = 100 as const;
export const GROWTH_FORMULA_VERSION = "growth-v1" as const;

export type UUID = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type YearMonthString =
  `${number}${number}${number}${number}-${number}${number}`;
export type UrlString = string;
export type HashString = string;
export type IdempotencyKey = string;
export type RequestId = string;
export type TraceId = string;
export type Locale = typeof GROWTH_LOCALE | "en-US";
export type Timezone = typeof GROWTH_TIMEZONE;
export type Level = number;
export type ExperiencePoint = number;
export type Percentage = number;
export type NonNegativeInteger = number;
export type PositiveInteger = number;

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepReadonly<T[K]>
      : T[K];
};

export interface GrowthDomainEntity {
  readonly id: UUID;
  readonly createdAt: ISODateTimeString;
  readonly updatedAt: ISODateTimeString;
}

export interface GrowthSoftDeletable {
  readonly deletedAt?: Nullable<ISODateTimeString>;
  readonly deletionReason?: Nullable<string>;
}

export interface GrowthTraceableMutation {
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly idempotencyKey?: IdempotencyKey;
}

/* -----------------------------------------------------------------------------
 * 2. Enum constants and literal unions
 * -------------------------------------------------------------------------- */

export const GROWTH_DOMAINS = [
  "READING",
  "NEWS",
  "ENGLISH",
  "HEALTH",
  "QUIZ",
] as const;
export type GrowthDomain = (typeof GROWTH_DOMAINS)[number];

export const GROWTH_TASK_TYPES = [
  "DAILY_READING",
  "DAILY_NEWS",
  "DAILY_ENGLISH",
  "DAILY_HOME_TRAINING",
  "DAILY_FINANCE_QUIZ",
  "WEEKLY_CHALLENGE",
  "COMMUNITY_CERTIFICATION",
  "ADMIN_EVENT",
] as const;
export type GrowthTaskType = (typeof GROWTH_TASK_TYPES)[number];

export const GROWTH_TASK_STATUSES = [
  "LOCKED",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "CLAIMED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type GrowthTaskStatus = (typeof GROWTH_TASK_STATUSES)[number];

export const GROWTH_CONTENT_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
  "HIDDEN",
  "DELETED",
] as const;
export type GrowthContentStatus = (typeof GROWTH_CONTENT_STATUSES)[number];

export const GROWTH_CONTENT_SOURCE_TYPES = [
  "INTERNAL",
  "CURATED",
  "AI_RECOMMENDED",
  "PARTNER",
  "RSS",
  "ADMIN_MANUAL",
] as const;
export type GrowthContentSourceType =
  (typeof GROWTH_CONTENT_SOURCE_TYPES)[number];

export const READING_CATEGORIES = [
  "AI_RECOMMENDED",
  "NOVEL",
  "BUSINESS_ECONOMY",
  "HUMANITIES_PHILOSOPHY",
  "ETC",
] as const;
export type ReadingCategory = (typeof READING_CATEGORIES)[number];

export const NEWS_CATEGORIES = [
  "ALL",
  "ECONOMY",
  "INDUSTRY",
  "SOCIETY",
  "TECH",
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const ENGLISH_SKILLS = [
  "LISTENING",
  "SPEAKING",
  "READING",
  "WRITING",
] as const;
export type EnglishSkill = (typeof ENGLISH_SKILLS)[number];

export const ENGLISH_LEVELS = [
  "BEGINNER",
  "ELEMENTARY",
  "INTERMEDIATE",
  "UPPER_INTERMEDIATE",
  "ADVANCED",
] as const;
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

export const HEALTH_CATEGORIES = [
  "BODY",
  "NUTRITION",
  "RECOVERY",
  "MENTAL",
] as const;
export type HealthCategory = (typeof HEALTH_CATEGORIES)[number];

export const HOME_TRAINING_AREAS = [
  "UPPER_BODY",
  "LOWER_BODY",
  "CORE",
  "FULL_BODY",
  "CARDIO",
  "STRETCHING",
  "REST",
] as const;
export type HomeTrainingArea = (typeof HOME_TRAINING_AREAS)[number];

export const GROWTH_WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type GrowthWeekday = (typeof GROWTH_WEEKDAYS)[number];

export const QUIZ_CATEGORIES = [
  "BUDGET",
  "SAVING",
  "EXPENSE",
  "SALARY",
  "CREDIT",
  "TAX",
  "INVESTMENT_BASIC",
  "CONSUMER_RIGHTS",
] as const;
export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];

export const QUIZ_DIFFICULTIES = ["EASY", "NORMAL", "HARD"] as const;
export type QuizDifficulty = (typeof QUIZ_DIFFICULTIES)[number];

export const GROWTH_RECOMMENDATION_REASONS = [
  "PROFILE_MATCH",
  "LOW_BALANCE_SKILL",
  "DAILY_ROUTINE",
  "TRENDING",
  "CONTINUE_LEARNING",
  "ADMIN_CURATED",
  "PARTNER_CAMPAIGN",
] as const;
export type GrowthRecommendationReason =
  (typeof GROWTH_RECOMMENDATION_REASONS)[number];

export const GROWTH_REWARD_TYPES = [
  "EXP",
  "POINT",
  "BADGE",
  "STREAK",
  "COMMUNITY_CERTIFICATION_UNLOCK",
  "EVENT_ENTRY",
] as const;
export type GrowthRewardType = (typeof GROWTH_REWARD_TYPES)[number];

export const GROWTH_BADGE_TIERS = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "MASTER",
] as const;
export type GrowthBadgeTier = (typeof GROWTH_BADGE_TIERS)[number];

export const GROWTH_CERTIFICATION_STATUSES = [
  "NONE",
  "DRAFT",
  "PUBLISHED",
  "HIDDEN",
  "REPORTED",
  "DELETED",
] as const;
export type GrowthCertificationStatus =
  (typeof GROWTH_CERTIFICATION_STATUSES)[number];

export const GROWTH_ATTACHMENT_TYPES = [
  "IMAGE",
  "AUDIO",
  "DOCUMENT",
  "LINK_PREVIEW",
] as const;
export type GrowthAttachmentType = (typeof GROWTH_ATTACHMENT_TYPES)[number];

export const GROWTH_ATTACHMENT_SCAN_STATUSES = [
  "PENDING",
  "SCANNING",
  "CLEAN",
  "QUARANTINED",
  "REJECTED",
  "FAILED",
] as const;
export type GrowthAttachmentScanStatus =
  (typeof GROWTH_ATTACHMENT_SCAN_STATUSES)[number];

export const GROWTH_SORT_OPTIONS = [
  "latest",
  "recommended",
  "popular",
  "exp_desc",
  "deadline",
  "category",
] as const;
export type GrowthSortBy = (typeof GROWTH_SORT_OPTIONS)[number];

export const GROWTH_ADMIN_SORT_OPTIONS = [
  "latest",
  "scheduled",
  "hidden",
  "archived",
  "completion_desc",
  "risk_desc",
] as const;
export type GrowthAdminSortBy = (typeof GROWTH_ADMIN_SORT_OPTIONS)[number];

export const GROWTH_AUDIT_EVENT_TYPES = [
  "growth.profile.created",
  "growth.profile.updated",
  "growth.content.created",
  "growth.content.updated",
  "growth.content.published",
  "growth.content.hidden",
  "growth.task.generated",
  "growth.task.started",
  "growth.task.completed",
  "growth.reward.claimed",
  "growth.level.changed",
  "growth.streak.changed",
  "growth.certification.created",
  "growth.certification.linked_community",
  "growth.attachment.uploaded",
  "growth.attachment.scan.completed",
  "growth.recommendation.served",
  "growth.idempotency.replayed",
  "growth.admin.adjusted",
] as const;
export type GrowthAuditEventType = (typeof GROWTH_AUDIT_EVENT_TYPES)[number];

export const GROWTH_IDEMPOTENCY_STATUSES = [
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
] as const;
export type GrowthIdempotencyStatus =
  (typeof GROWTH_IDEMPOTENCY_STATUSES)[number];

export const GROWTH_RISK_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
export type GrowthRiskLevel = (typeof GROWTH_RISK_LEVELS)[number];

/* -----------------------------------------------------------------------------
 * 3. Descriptors for UI and operations
 * -------------------------------------------------------------------------- */

export interface GrowthDomainDescriptor<TDomain extends string> {
  readonly domain: TDomain;
  readonly nameKo: string;
  readonly descriptionKo: string;
  readonly emoji: string;
  readonly sortOrder: number;
  readonly dailyMission: boolean;
  readonly active: boolean;
}

export const GROWTH_DOMAIN_DESCRIPTORS: readonly GrowthDomainDescriptor<GrowthDomain>[] =
  Object.freeze([
    {
      domain: "READING",
      nameKo: "오늘의 독서",
      descriptionKo: "도서 추천과 독서 미션으로 역량을 레벨업한다.",
      emoji: "📚",
      sortOrder: 10,
      dailyMission: true,
      active: true,
    },
    {
      domain: "NEWS",
      nameKo: "오늘의 소식",
      descriptionKo: "경제·산업·사회·기술 뉴스를 읽고 정보 감각을 높인다.",
      emoji: "📰",
      sortOrder: 20,
      dailyMission: true,
      active: true,
    },
    {
      domain: "ENGLISH",
      nameKo: "오늘의 영어",
      descriptionKo: "듣기·말하기·읽기·쓰기 루틴으로 영어 실력을 쌓는다.",
      emoji: "🎧",
      sortOrder: 30,
      dailyMission: true,
      active: true,
    },
    {
      domain: "HEALTH",
      nameKo: "오늘의 홈트",
      descriptionKo: "신체·영양·회복·정신 균형을 관리한다.",
      emoji: "🏃",
      sortOrder: 40,
      dailyMission: true,
      active: true,
    },
    {
      domain: "QUIZ",
      nameKo: "오늘의 금융상식",
      descriptionKo: "급여·예산·저축·소비 지식을 퀴즈로 확인한다.",
      emoji: "🟡",
      sortOrder: 50,
      dailyMission: true,
      active: true,
    },
  ]);

export interface GrowthCategoryDescriptor<TCategory extends string> {
  readonly category: TCategory;
  readonly nameKo: string;
  readonly descriptionKo: string;
  readonly emoji: string;
  readonly sortOrder: number;
  readonly active: boolean;
}

export const READING_CATEGORY_DESCRIPTORS: readonly GrowthCategoryDescriptor<ReadingCategory>[] =
  Object.freeze([
    {
      category: "AI_RECOMMENDED",
      nameKo: "AI 추천",
      descriptionKo: "사용자 성장 균형과 관심사 기반 추천 도서",
      emoji: "✨",
      sortOrder: 10,
      active: true,
    },
    {
      category: "NOVEL",
      nameKo: "소설",
      descriptionKo: "서사와 공감 능력을 높이는 도서",
      emoji: "📖",
      sortOrder: 20,
      active: true,
    },
    {
      category: "BUSINESS_ECONOMY",
      nameKo: "경제/경영",
      descriptionKo: "돈, 조직, 사업 감각을 높이는 도서",
      emoji: "💼",
      sortOrder: 30,
      active: true,
    },
    {
      category: "HUMANITIES_PHILOSOPHY",
      nameKo: "인문/철학",
      descriptionKo: "사고력과 관점을 확장하는 도서",
      emoji: "🏛️",
      sortOrder: 40,
      active: true,
    },
    {
      category: "ETC",
      nameKo: "기타",
      descriptionKo: "그 외 자기계발 콘텐츠",
      emoji: "📌",
      sortOrder: 999,
      active: true,
    },
  ]);

export const NEWS_CATEGORY_DESCRIPTORS: readonly GrowthCategoryDescriptor<NewsCategory>[] =
  Object.freeze([
    {
      category: "ALL",
      nameKo: "전체",
      descriptionKo: "모든 뉴스 카테고리",
      emoji: "🗞️",
      sortOrder: 10,
      active: true,
    },
    {
      category: "ECONOMY",
      nameKo: "경제",
      descriptionKo: "금융·거시경제·소비 동향",
      emoji: "💹",
      sortOrder: 20,
      active: true,
    },
    {
      category: "INDUSTRY",
      nameKo: "산업",
      descriptionKo: "기업·산업·노동시장 소식",
      emoji: "🏭",
      sortOrder: 30,
      active: true,
    },
    {
      category: "SOCIETY",
      nameKo: "사회",
      descriptionKo: "생활·정책·사회 이슈",
      emoji: "🏙️",
      sortOrder: 40,
      active: true,
    },
    {
      category: "TECH",
      nameKo: "기술",
      descriptionKo: "AI·IT·과학기술 소식",
      emoji: "🤖",
      sortOrder: 50,
      active: true,
    },
  ]);

export const ENGLISH_SKILL_DESCRIPTORS: readonly GrowthCategoryDescriptor<EnglishSkill>[] =
  Object.freeze([
    {
      category: "LISTENING",
      nameKo: "Listening",
      descriptionKo: "듣기 이해와 쉐도잉",
      emoji: "🎧",
      sortOrder: 10,
      active: true,
    },
    {
      category: "SPEAKING",
      nameKo: "Speaking",
      descriptionKo: "일상·비즈니스 말하기",
      emoji: "🗣️",
      sortOrder: 20,
      active: true,
    },
    {
      category: "READING",
      nameKo: "Reading",
      descriptionKo: "문장 독해와 표현 습득",
      emoji: "📄",
      sortOrder: 30,
      active: true,
    },
    {
      category: "WRITING",
      nameKo: "Writing",
      descriptionKo: "짧은 문장 쓰기와 교정",
      emoji: "✍️",
      sortOrder: 40,
      active: true,
    },
  ]);

export const HEALTH_CATEGORY_DESCRIPTORS: readonly GrowthCategoryDescriptor<HealthCategory>[] =
  Object.freeze([
    {
      category: "BODY",
      nameKo: "신체",
      descriptionKo: "근력·유산소·자세 관리",
      emoji: "💪",
      sortOrder: 10,
      active: true,
    },
    {
      category: "NUTRITION",
      nameKo: "영양",
      descriptionKo: "식사·수분·단백질 루틴",
      emoji: "🥗",
      sortOrder: 20,
      active: true,
    },
    {
      category: "RECOVERY",
      nameKo: "회복",
      descriptionKo: "수면·휴식·스트레칭",
      emoji: "🛌",
      sortOrder: 30,
      active: true,
    },
    {
      category: "MENTAL",
      nameKo: "정신",
      descriptionKo: "마음 안정과 집중력 관리",
      emoji: "🧘",
      sortOrder: 40,
      active: true,
    },
  ]);

/* -----------------------------------------------------------------------------
 * 4. Policy, context and privacy boundary
 * -------------------------------------------------------------------------- */

export interface GrowthPolicyGuard {
  readonly rawPiiIncluded: false;
  readonly rawSecretIncluded: false;
  readonly rawTokenIncluded: false;
  readonly rawFinancialSourceDataIncluded: false;
  readonly adsGrowthDataJoinAllowed: false;
  readonly payrollExpenseDataJoinedForRecommendation: false;
  readonly healthAdviceIsMedicalDiagnosis: false;
  readonly financialContentIsInvestmentAdvice: false;
  readonly aiRecommendationRequiresDisclosure: true;
  readonly partnerContentRequiresDisclosure: true;
  readonly communityCertificationRequiresUserAction: true;
}

export const GROWTH_SAFE_POLICY_GUARD: GrowthPolicyGuard = Object.freeze({
  rawPiiIncluded: false,
  rawSecretIncluded: false,
  rawTokenIncluded: false,
  rawFinancialSourceDataIncluded: false,
  adsGrowthDataJoinAllowed: false,
  payrollExpenseDataJoinedForRecommendation: false,
  healthAdviceIsMedicalDiagnosis: false,
  financialContentIsInvestmentAdvice: false,
  aiRecommendationRequiresDisclosure: true,
  partnerContentRequiresDisclosure: true,
  communityCertificationRequiresUserAction: true,
});

export interface GrowthRequestContext {
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

export interface GrowthOwnerTrace {
  readonly ownerUserId: UUID;
  readonly ownerHash: HashString;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly deviceHash?: HashString;
  readonly retainedUntil: ISODateTimeString;
  readonly serverOnly: true;
}

export interface GrowthAdminActor {
  readonly adminUserId: UUID;
  readonly displayName: string;
  readonly role:
    | "OWNER"
    | "ADMIN"
    | "OPERATOR"
    | "CONTENT_MANAGER"
    | "PARTNER_MANAGER"
    | "VIEWER";
}

/* -----------------------------------------------------------------------------
 * 5. Core entities
 * -------------------------------------------------------------------------- */

export interface GrowthReward {
  readonly rewardType: GrowthRewardType;
  readonly amount: NonNegativeInteger;
  readonly badgeId?: UUID;
  readonly labelKo?: string;
}

export interface GrowthLevelState {
  readonly level: Level;
  readonly exp: ExperiencePoint;
  readonly totalExp: NonNegativeInteger;
  readonly expToNextLevel: ExperiencePoint;
  readonly progressRate: Percentage;
  readonly formulaVersion: typeof GROWTH_FORMULA_VERSION;
}

export interface GrowthStreakState {
  readonly currentStreakDays: NonNegativeInteger;
  readonly longestStreakDays: NonNegativeInteger;
  readonly lastCompletedDate?: Nullable<ISODateString>;
  readonly protectedByFreeze: boolean;
  readonly freezeCount: NonNegativeInteger;
}

export interface GrowthBalanceScores {
  readonly reading: Percentage;
  readonly news: Percentage;
  readonly english: Percentage;
  readonly health: Percentage;
  readonly financeQuiz: Percentage;
}

export interface GrowthProfile extends GrowthDomainEntity {
  readonly userId: UUID;
  readonly displayName: string;
  readonly levelState: GrowthLevelState;
  readonly streakState: GrowthStreakState;
  readonly balanceScores: GrowthBalanceScores;
  readonly completedTaskCount: NonNegativeInteger;
  readonly completedTodayCount: NonNegativeInteger;
  readonly badgeCount: NonNegativeInteger;
  readonly communityCertificationCount: NonNegativeInteger;
  readonly lastActivityAt?: Nullable<ISODateTimeString>;
  readonly policy: GrowthPolicyGuard;
}

export interface GrowthBadge extends GrowthDomainEntity {
  readonly badgeId: UUID;
  readonly code: string;
  readonly tier: GrowthBadgeTier;
  readonly nameKo: string;
  readonly descriptionKo: string;
  readonly iconUrl?: UrlString;
  readonly domain?: GrowthDomain;
  readonly requiredLevel?: Level;
  readonly requiredCompletedTaskCount?: NonNegativeInteger;
  readonly active: boolean;
}

export interface GrowthUserBadge extends GrowthDomainEntity {
  readonly userBadgeId: UUID;
  readonly userId: UUID;
  readonly badgeId: UUID;
  readonly earnedAt: ISODateTimeString;
  readonly sourceTaskId?: UUID;
  readonly sourceCertificationId?: UUID;
}

export interface GrowthContentBase
  extends GrowthDomainEntity, GrowthSoftDeletable {
  readonly contentId: UUID;
  readonly domain: GrowthDomain;
  readonly status: GrowthContentStatus;
  readonly sourceType: GrowthContentSourceType;
  readonly title: string;
  readonly summary: string;
  readonly thumbnailUrl?: UrlString;
  readonly sourceName?: string;
  readonly sourceUrl?: UrlString;
  readonly partnerId?: UUID;
  readonly estimatedMinutes: PositiveInteger;
  readonly difficulty:
    | QuizDifficulty
    | EnglishLevel
    | "EASY"
    | "NORMAL"
    | "HARD";
  readonly tags: readonly string[];
  readonly publishedAt?: Nullable<ISODateTimeString>;
  readonly scheduledAt?: Nullable<ISODateTimeString>;
  readonly expiresAt?: Nullable<ISODateTimeString>;
  readonly policy: GrowthPolicyGuard;
}

export interface ReadingContent extends GrowthContentBase {
  readonly domain: "READING";
  readonly readingCategory: ReadingCategory;
  readonly authorName?: string;
  readonly publisherName?: string;
  readonly isbn?: string;
  readonly bookTitle: string;
  readonly recommendationText: string;
}

export interface NewsContent extends GrowthContentBase {
  readonly domain: "NEWS";
  readonly newsCategory: NewsCategory;
  readonly newsProvider: string;
  readonly originalPublishedAt?: ISODateTimeString;
  readonly factualSummary: string;
  readonly sourceReliabilityScore?: Percentage;
}

export interface EnglishContent extends GrowthContentBase {
  readonly domain: "ENGLISH";
  readonly skill: EnglishSkill;
  readonly level: EnglishLevel;
  readonly phrase: string;
  readonly translationKo: string;
  readonly exampleDialog?: readonly string[];
  readonly audioUrl?: UrlString;
}

export interface HealthContent extends GrowthContentBase {
  readonly domain: "HEALTH";
  readonly healthCategory: HealthCategory;
  readonly trainingArea: HomeTrainingArea;
  readonly weekday?: GrowthWeekday;
  readonly sets?: NonNegativeInteger;
  readonly reps?: NonNegativeInteger;
  readonly durationSeconds?: NonNegativeInteger;
  readonly cautionKo: string;
}

export interface QuizContent extends GrowthContentBase {
  readonly domain: "QUIZ";
  readonly quizCategory: QuizCategory;
  readonly question: string;
  readonly choices: readonly string[];
  readonly answerIndex: number;
  readonly explanationKo: string;
}

export type GrowthContent =
  | ReadingContent
  | NewsContent
  | EnglishContent
  | HealthContent
  | QuizContent;

export interface GrowthRecommendation {
  readonly recommendationId: UUID;
  readonly userId: UUID;
  readonly contentId: UUID;
  readonly domain: GrowthDomain;
  readonly reason: GrowthRecommendationReason;
  readonly score: Percentage;
  readonly rank: PositiveInteger;
  readonly servedAt: ISODateTimeString;
  readonly policy: GrowthPolicyGuard;
}

export interface GrowthTask extends GrowthDomainEntity {
  readonly taskId: UUID;
  readonly userId: UUID;
  readonly type: GrowthTaskType;
  readonly domain: GrowthDomain;
  readonly title: string;
  readonly descriptionKo: string;
  readonly contentId?: UUID;
  readonly category:
    | ReadingCategory
    | NewsCategory
    | EnglishSkill
    | HealthCategory
    | QuizCategory
    | "GENERAL";
  readonly status: GrowthTaskStatus;
  readonly targetDate: ISODateString;
  readonly startedAt?: Nullable<ISODateTimeString>;
  readonly completedAt?: Nullable<ISODateTimeString>;
  readonly claimedAt?: Nullable<ISODateTimeString>;
  readonly expiresAt?: Nullable<ISODateTimeString>;
  readonly expReward: ExperiencePoint;
  readonly pointReward: NonNegativeInteger;
  readonly rewards: readonly GrowthReward[];
  readonly communityCertificationRequired: boolean;
  readonly policy: GrowthPolicyGuard;
}

export interface GrowthTaskCompletion extends GrowthDomainEntity {
  readonly completionId: UUID;
  readonly taskId: UUID;
  readonly userId: UUID;
  readonly domain: GrowthDomain;
  readonly completedAt: ISODateTimeString;
  readonly awardedExp: ExperiencePoint;
  readonly awardedPoint: NonNegativeInteger;
  readonly levelBefore: Level;
  readonly levelAfter: Level;
  readonly expBefore: ExperiencePoint;
  readonly expAfter: ExperiencePoint;
  readonly streakBefore: NonNegativeInteger;
  readonly streakAfter: NonNegativeInteger;
  readonly formulaVersion: typeof GROWTH_FORMULA_VERSION;
  readonly idempotencyKey?: Nullable<IdempotencyKey>;
  readonly policy: GrowthPolicyGuard;
}

export interface GrowthCertification
  extends GrowthDomainEntity, GrowthSoftDeletable {
  readonly certificationId: UUID;
  readonly userId: UUID;
  readonly taskId: UUID;
  readonly domain: GrowthDomain;
  readonly status: GrowthCertificationStatus;
  readonly title: string;
  readonly body: string;
  readonly attachmentIds: readonly UUID[];
  readonly communityPostId?: Nullable<UUID>;
  readonly publishedAt?: Nullable<ISODateTimeString>;
  readonly policy: GrowthPolicyGuard;
}

export interface GrowthAttachment
  extends GrowthDomainEntity, GrowthSoftDeletable {
  readonly attachmentId: UUID;
  readonly userId: UUID;
  readonly taskId?: UUID;
  readonly certificationId?: UUID;
  readonly contentId?: UUID;
  readonly type: GrowthAttachmentType;
  readonly url?: UrlString;
  readonly storageKey?: string;
  readonly fileName?: string;
  readonly contentType?: string;
  readonly sizeBytes?: NonNegativeInteger;
  readonly checksumSha256?: HashString;
  readonly scanStatus: GrowthAttachmentScanStatus;
  readonly scannedAt?: ISODateTimeString;
  readonly blockedReason?: string;
  readonly policy: GrowthPolicyGuard;
}

/* -----------------------------------------------------------------------------
 * 6. Screen aggregate contracts
 * -------------------------------------------------------------------------- */

export interface GrowthTaskCardView {
  readonly taskId: UUID;
  readonly type: GrowthTaskType;
  readonly domain: GrowthDomain;
  readonly emoji: string;
  readonly title: string;
  readonly descriptionKo: string;
  readonly status: GrowthTaskStatus;
  readonly actionLabelKo: string;
  readonly expReward: ExperiencePoint;
  readonly pointReward: NonNegativeInteger;
  readonly completed: boolean;
  readonly contentId?: UUID;
}

export interface GrowthHomeSummary {
  readonly userId: UUID;
  readonly date: ISODateString;
  readonly levelState: GrowthLevelState;
  readonly streakState: GrowthStreakState;
  readonly balanceScores: GrowthBalanceScores;
  readonly todayTasks: readonly GrowthTaskCardView[];
  readonly completedTodayCount: NonNegativeInteger;
  readonly totalTodayCount: NonNegativeInteger;
  readonly certificationAvailableCount: NonNegativeInteger;
  readonly policy: GrowthPolicyGuard;
}

export interface ReadingScreenSummary {
  readonly selectedCategory: ReadingCategory;
  readonly categories: readonly GrowthCategoryDescriptor<ReadingCategory>[];
  readonly recommendations: readonly ReadingContent[];
  readonly balanceScores: GrowthBalanceScores;
}

export interface NewsScreenSummary {
  readonly selectedCategory: NewsCategory;
  readonly categories: readonly GrowthCategoryDescriptor<NewsCategory>[];
  readonly items: readonly NewsContent[];
}

export interface EnglishScreenSummary {
  readonly selectedSkill: EnglishSkill;
  readonly skills: readonly GrowthCategoryDescriptor<EnglishSkill>[];
  readonly level: EnglishLevel;
  readonly items: readonly EnglishContent[];
  readonly dailySentence?: EnglishContent;
}

export interface HealthScreenSummary {
  readonly selectedCategory: HealthCategory;
  readonly categories: readonly GrowthCategoryDescriptor<HealthCategory>[];
  readonly weekdayPlan: readonly HealthContent[];
  readonly todayTraining?: HealthContent;
}

export interface QuizScreenSummary {
  readonly selectedCategory?: QuizCategory;
  readonly items: readonly QuizContent[];
  readonly solvedTodayCount: NonNegativeInteger;
}

export interface GrowthMyPageSummary {
  readonly userId: UUID;
  readonly displayName: string;
  readonly levelState: GrowthLevelState;
  readonly streakState: GrowthStreakState;
  readonly balanceScores: GrowthBalanceScores;
  readonly completedTaskCount: NonNegativeInteger;
  readonly badgeCount: NonNegativeInteger;
  readonly certificationCount: NonNegativeInteger;
  readonly recentBadges: readonly GrowthBadge[];
}

export interface GrowthCalendarDaySummary {
  readonly date: ISODateString;
  readonly completedCount: NonNegativeInteger;
  readonly totalCount: NonNegativeInteger;
  readonly earnedExp: ExperiencePoint;
  readonly streakDay: boolean;
}

export interface GrowthMonthlySummary {
  readonly userId: UUID;
  readonly yearMonth: YearMonthString;
  readonly completedTaskCount: NonNegativeInteger;
  readonly earnedExp: ExperiencePoint;
  readonly earnedPoint: NonNegativeInteger;
  readonly readingCount: NonNegativeInteger;
  readonly newsCount: NonNegativeInteger;
  readonly englishCount: NonNegativeInteger;
  readonly healthCount: NonNegativeInteger;
  readonly quizCount: NonNegativeInteger;
  readonly certificationCount: NonNegativeInteger;
  readonly longestStreakDays: NonNegativeInteger;
  readonly calendar: readonly GrowthCalendarDaySummary[];
  readonly calculatedAt: ISODateTimeString;
}

/* -----------------------------------------------------------------------------
 * 7. API request/response contracts
 * -------------------------------------------------------------------------- */

export interface GrowthListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly cursor?: string;
  readonly sortBy?: GrowthSortBy;
}

export interface GrowthAdminListQuery extends Omit<GrowthListQuery, "sortBy"> {
  readonly sortBy?: GrowthAdminSortBy;
}

export interface GrowthPageInfo {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount?: number;
  readonly nextCursor?: string;
  readonly hasNextPage: boolean;
}

export interface GrowthSuccessResponse<TData> {
  readonly ok: true;
  readonly data: TData;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface GrowthListResponse<TItem> {
  readonly ok: true;
  readonly data: readonly TItem[];
  readonly pageInfo: GrowthPageInfo;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export interface GrowthMutationResponse<
  TData,
> extends GrowthSuccessResponse<TData> {
  readonly mutation: {
    readonly idempotencyKey?: IdempotencyKey;
    readonly replayed: boolean;
    readonly committedAt: ISODateTimeString;
  };
}

export interface GrowthErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  };
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
}

export type GrowthApiResponse<TData> =
  | GrowthSuccessResponse<TData>
  | GrowthErrorResponse;
export type GrowthMutationApiResponse<TData> =
  | GrowthMutationResponse<TData>
  | GrowthErrorResponse;

export interface GetGrowthHomeRequest {
  readonly date?: ISODateString;
  readonly context?: GrowthRequestContext;
}

export interface GetGrowthProfileRequest {
  readonly context?: GrowthRequestContext;
}

export interface ListGrowthTasksRequest extends GrowthListQuery {
  readonly date?: ISODateString;
  readonly domain?: GrowthDomain;
  readonly status?: GrowthTaskStatus;
  readonly context?: GrowthRequestContext;
}

export interface GenerateDailyGrowthTasksRequest extends GrowthTraceableMutation {
  readonly targetDate: ISODateString;
  readonly domains?: readonly GrowthDomain[];
  readonly forceRegenerate?: boolean;
  readonly context?: GrowthRequestContext;
}

export interface StartGrowthTaskRequest extends GrowthTraceableMutation {
  readonly taskId: UUID;
  readonly context?: GrowthRequestContext;
}

export interface CompleteGrowthTaskRequest extends GrowthTraceableMutation {
  readonly taskId: UUID;
  readonly contentId?: UUID;
  readonly answerIndex?: number;
  readonly durationSeconds?: NonNegativeInteger;
  readonly completionMemo?: string;
  readonly context?: GrowthRequestContext;
}

export interface ClaimGrowthRewardRequest extends GrowthTraceableMutation {
  readonly completionId: UUID;
  readonly context?: GrowthRequestContext;
}

export interface ListGrowthContentsRequest extends GrowthListQuery {
  readonly domain?: GrowthDomain;
  readonly readingCategory?: ReadingCategory;
  readonly newsCategory?: NewsCategory;
  readonly englishSkill?: EnglishSkill;
  readonly healthCategory?: HealthCategory;
  readonly quizCategory?: QuizCategory;
  readonly status?: GrowthContentStatus;
  readonly context?: GrowthRequestContext;
}

export interface GetGrowthContentRequest {
  readonly contentId: UUID;
  readonly context?: GrowthRequestContext;
}

export interface ListGrowthRecommendationsRequest extends GrowthListQuery {
  readonly domain?: GrowthDomain;
  readonly date?: ISODateString;
  readonly context?: GrowthRequestContext;
}

export interface CreateGrowthCertificationRequest extends GrowthTraceableMutation {
  readonly taskId: UUID;
  readonly title: string;
  readonly body: string;
  readonly attachments?: readonly GrowthAttachmentInput[];
  readonly publishToCommunity?: boolean;
  readonly context?: GrowthRequestContext;
}

export interface UpdateGrowthCertificationRequest extends GrowthTraceableMutation {
  readonly certificationId: UUID;
  readonly title?: string;
  readonly body?: string;
  readonly attachments?: readonly GrowthAttachmentInput[];
  readonly publishToCommunity?: boolean;
  readonly context?: GrowthRequestContext;
}

export interface DeleteGrowthCertificationRequest extends GrowthTraceableMutation {
  readonly certificationId: UUID;
  readonly reason?: string;
  readonly hardDelete?: false;
  readonly context?: GrowthRequestContext;
}

export interface ListGrowthCertificationsRequest extends GrowthListQuery {
  readonly domain?: GrowthDomain;
  readonly status?: GrowthCertificationStatus;
  readonly context?: GrowthRequestContext;
}

export interface GrowthAttachmentInput {
  readonly type: GrowthAttachmentType;
  readonly uploadId?: UUID;
  readonly url?: UrlString;
  readonly fileName?: string;
  readonly contentType?: string;
  readonly sizeBytes?: NonNegativeInteger;
  readonly checksumSha256?: HashString;
}

export interface UploadGrowthAttachmentRequest extends GrowthTraceableMutation {
  readonly targetType: "CONTENT" | "TASK" | "CERTIFICATION";
  readonly targetId?: UUID;
  readonly attachment: GrowthAttachmentInput;
  readonly context?: GrowthRequestContext;
}

export interface GetGrowthMonthlySummaryRequest {
  readonly yearMonth: YearMonthString;
  readonly context?: GrowthRequestContext;
}

export interface CreateGrowthContentAdminRequest extends GrowthTraceableMutation {
  readonly content: GrowthContentDraft;
  readonly context?: GrowthRequestContext;
}

export interface UpdateGrowthContentAdminRequest extends GrowthTraceableMutation {
  readonly contentId: UUID;
  readonly patch: Partial<GrowthContentDraft>;
  readonly context?: GrowthRequestContext;
}

export interface PublishGrowthContentAdminRequest extends GrowthTraceableMutation {
  readonly contentId: UUID;
  readonly publishedAt?: ISODateTimeString;
  readonly context?: GrowthRequestContext;
}

export interface HideGrowthContentAdminRequest extends GrowthTraceableMutation {
  readonly contentId: UUID;
  readonly reason: string;
  readonly context?: GrowthRequestContext;
}

export interface AdjustGrowthProfileAdminRequest extends GrowthTraceableMutation {
  readonly userId: UUID;
  readonly reason: string;
  readonly level?: Level;
  readonly exp?: ExperiencePoint;
  readonly totalExp?: NonNegativeInteger;
  readonly badgeIdsToGrant?: readonly UUID[];
  readonly badgeIdsToRevoke?: readonly UUID[];
  readonly context?: GrowthRequestContext;
}

export interface GetGrowthMetricsAdminRequest {
  readonly from?: ISODateString;
  readonly to?: ISODateString;
  readonly domain?: GrowthDomain;
  readonly context?: GrowthRequestContext;
}

export type GrowthContentDraft =
  | Omit<
      ReadingContent,
      | keyof GrowthDomainEntity
      | keyof GrowthSoftDeletable
      | "contentId"
      | "policy"
    >
  | Omit<
      NewsContent,
      | keyof GrowthDomainEntity
      | keyof GrowthSoftDeletable
      | "contentId"
      | "policy"
    >
  | Omit<
      EnglishContent,
      | keyof GrowthDomainEntity
      | keyof GrowthSoftDeletable
      | "contentId"
      | "policy"
    >
  | Omit<
      HealthContent,
      | keyof GrowthDomainEntity
      | keyof GrowthSoftDeletable
      | "contentId"
      | "policy"
    >
  | Omit<
      QuizContent,
      | keyof GrowthDomainEntity
      | keyof GrowthSoftDeletable
      | "contentId"
      | "policy"
    >;

export interface GrowthDeleteResult {
  readonly id: UUID;
  readonly deleted: true;
  readonly deletedAt: ISODateTimeString;
}

export type GetGrowthHomeResponse = GrowthSuccessResponse<GrowthHomeSummary>;
export type GetGrowthProfileResponse = GrowthSuccessResponse<GrowthProfile>;
export type ListGrowthTasksResponse = GrowthListResponse<GrowthTask>;
export type GenerateDailyGrowthTasksResponse = GrowthMutationResponse<
  readonly GrowthTask[]
>;
export type StartGrowthTaskResponse = GrowthMutationResponse<GrowthTask>;
export type CompleteGrowthTaskResponse =
  GrowthMutationResponse<GrowthTaskCompletion>;
export type ClaimGrowthRewardResponse =
  GrowthMutationResponse<GrowthTaskCompletion>;
export type ListGrowthContentsResponse = GrowthListResponse<GrowthContent>;
export type GetGrowthContentResponse = GrowthSuccessResponse<GrowthContent>;
export type ListGrowthRecommendationsResponse =
  GrowthListResponse<GrowthRecommendation>;
export type CreateGrowthCertificationResponse =
  GrowthMutationResponse<GrowthCertification>;
export type UpdateGrowthCertificationResponse =
  GrowthMutationResponse<GrowthCertification>;
export type DeleteGrowthCertificationResponse =
  GrowthMutationResponse<GrowthDeleteResult>;
export type ListGrowthCertificationsResponse =
  GrowthListResponse<GrowthCertification>;
export type UploadGrowthAttachmentResponse =
  GrowthMutationResponse<GrowthAttachment>;
export type GetGrowthMonthlySummaryResponse =
  GrowthSuccessResponse<GrowthMonthlySummary>;
export type CreateGrowthContentAdminResponse =
  GrowthMutationResponse<GrowthContent>;
export type UpdateGrowthContentAdminResponse =
  GrowthMutationResponse<GrowthContent>;
export type PublishGrowthContentAdminResponse =
  GrowthMutationResponse<GrowthContent>;
export type HideGrowthContentAdminResponse =
  GrowthMutationResponse<GrowthContent>;
export type AdjustGrowthProfileAdminResponse =
  GrowthMutationResponse<GrowthProfile>;

export type GrowthMutationOperation =
  | "GENERATE_DAILY_TASKS"
  | "START_TASK"
  | "COMPLETE_TASK"
  | "CLAIM_REWARD"
  | "CREATE_CERTIFICATION"
  | "UPDATE_CERTIFICATION"
  | "DELETE_CERTIFICATION"
  | "UPLOAD_ATTACHMENT"
  | "ADMIN_CREATE_CONTENT"
  | "ADMIN_UPDATE_CONTENT"
  | "ADMIN_PUBLISH_CONTENT"
  | "ADMIN_HIDE_CONTENT"
  | "ADMIN_ADJUST_PROFILE";

/* -----------------------------------------------------------------------------
 * 8. Admin, audit, metrics and idempotency
 * -------------------------------------------------------------------------- */

export interface GrowthAuditLog extends GrowthDomainEntity {
  readonly auditLogId: UUID;
  readonly eventType: GrowthAuditEventType;
  readonly actorUserId?: UUID;
  readonly adminActor?: GrowthAdminActor;
  readonly targetType:
    | "PROFILE"
    | "CONTENT"
    | "TASK"
    | "COMPLETION"
    | "CERTIFICATION"
    | "ATTACHMENT"
    | "BADGE";
  readonly targetId: UUID;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  readonly reason?: string;
  readonly requestId?: RequestId;
  readonly traceId?: TraceId;
  readonly ipHash?: HashString;
  readonly userAgentHash?: HashString;
  readonly policy: GrowthPolicyGuard;
}

export interface GrowthIdempotencyRecord extends GrowthDomainEntity {
  readonly userId: UUID;
  readonly idempotencyKey: IdempotencyKey;
  readonly operation: GrowthMutationOperation;
  readonly status: GrowthIdempotencyStatus;
  readonly requestHash: HashString;
  readonly responseReferenceId?: UUID;
  readonly errorCode?: string;
  readonly expiresAt: ISODateTimeString;
}

export interface GrowthAdminRecord<TRecord> {
  readonly record: TRecord;
  readonly ownerTrace?: GrowthOwnerTrace;
  readonly riskLevel: GrowthRiskLevel;
  readonly riskLabels: readonly string[];
  readonly internalNotes: readonly string[];
}

export type GrowthContentAdminRecord = GrowthAdminRecord<GrowthContent>;
export type GrowthProfileAdminRecord = GrowthAdminRecord<GrowthProfile>;
export type GrowthCertificationAdminRecord =
  GrowthAdminRecord<GrowthCertification>;

export interface GrowthMetricsAdmin {
  readonly profileCount: NonNegativeInteger;
  readonly activeUserCount: NonNegativeInteger;
  readonly dailyTaskGeneratedCount: NonNegativeInteger;
  readonly taskCompletionCount: NonNegativeInteger;
  readonly taskCompletionRate: Percentage;
  readonly rewardClaimRate: Percentage;
  readonly certificationCount: NonNegativeInteger;
  readonly communityLinkedCertificationCount: NonNegativeInteger;
  readonly averageLevel: Percentage;
  readonly averageStreakDays: Percentage;
  readonly readingCompletionCount: NonNegativeInteger;
  readonly newsCompletionCount: NonNegativeInteger;
  readonly englishCompletionCount: NonNegativeInteger;
  readonly healthCompletionCount: NonNegativeInteger;
  readonly quizCompletionCount: NonNegativeInteger;
  readonly contentServedCount: NonNegativeInteger;
  readonly recommendationClickRate?: Percentage;
  readonly measuredAt: ISODateTimeString;
}

export type ListGrowthAuditLogsAdminResponse =
  GrowthListResponse<GrowthAuditLog>;
export type GetGrowthMetricsAdminResponse =
  GrowthSuccessResponse<GrowthMetricsAdmin>;

/* -----------------------------------------------------------------------------
 * 9. API path registry
 * -------------------------------------------------------------------------- */

export const GROWTH_API_PATHS = Object.freeze({
  getHome: "/growth/home",
  getProfile: "/growth/profile",
  listTasks: "/growth/tasks",
  generateDailyTasks: "/growth/tasks/generate-daily",
  startTask: "/growth/tasks/:taskId/start",
  completeTask: "/growth/tasks/:taskId/complete",
  claimReward: "/growth/completions/:completionId/claim",
  listContents: "/growth/contents",
  getContent: "/growth/contents/:contentId",
  listRecommendations: "/growth/recommendations",
  createCertification: "/growth/certifications",
  updateCertification: "/growth/certifications/:certificationId",
  deleteCertification: "/growth/certifications/:certificationId",
  listCertifications: "/growth/certifications",
  uploadAttachment: "/growth/attachments",
  getMonthlySummary: "/growth/monthly-summary/:yearMonth",
  adminCreateContent: "/admin/growth/contents",
  adminUpdateContent: "/admin/growth/contents/:contentId",
  adminPublishContent: "/admin/growth/contents/:contentId/publish",
  adminHideContent: "/admin/growth/contents/:contentId/hide",
  adminAdjustProfile: "/admin/growth/profiles/:userId/adjust",
  adminListAuditLogs: "/admin/growth/audit-logs",
  adminMetrics: "/admin/growth/metrics",
} as const);

export type GrowthApiPathName = keyof typeof GROWTH_API_PATHS;
export type GrowthApiPath = (typeof GROWTH_API_PATHS)[GrowthApiPathName];
export type GrowthHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface GrowthEndpointDescriptor<TRequest, TResponse> {
  readonly method: GrowthHttpMethod;
  readonly path: GrowthApiPath;
  readonly request: TRequest;
  readonly response: TResponse;
  readonly authRequired: boolean;
  readonly adminRequired: boolean;
  readonly idempotencyRequired: boolean;
  readonly serverAuthorityCalculation: boolean;
}

export interface GrowthEndpointTypes {
  readonly getHome: GrowthEndpointDescriptor<
    GetGrowthHomeRequest,
    GetGrowthHomeResponse
  >;
  readonly getProfile: GrowthEndpointDescriptor<
    GetGrowthProfileRequest,
    GetGrowthProfileResponse
  >;
  readonly listTasks: GrowthEndpointDescriptor<
    ListGrowthTasksRequest,
    ListGrowthTasksResponse
  >;
  readonly generateDailyTasks: GrowthEndpointDescriptor<
    GenerateDailyGrowthTasksRequest,
    GenerateDailyGrowthTasksResponse
  >;
  readonly startTask: GrowthEndpointDescriptor<
    StartGrowthTaskRequest,
    StartGrowthTaskResponse
  >;
  readonly completeTask: GrowthEndpointDescriptor<
    CompleteGrowthTaskRequest,
    CompleteGrowthTaskResponse
  >;
  readonly claimReward: GrowthEndpointDescriptor<
    ClaimGrowthRewardRequest,
    ClaimGrowthRewardResponse
  >;
  readonly listContents: GrowthEndpointDescriptor<
    ListGrowthContentsRequest,
    ListGrowthContentsResponse
  >;
  readonly getContent: GrowthEndpointDescriptor<
    GetGrowthContentRequest,
    GetGrowthContentResponse
  >;
  readonly listRecommendations: GrowthEndpointDescriptor<
    ListGrowthRecommendationsRequest,
    ListGrowthRecommendationsResponse
  >;
  readonly createCertification: GrowthEndpointDescriptor<
    CreateGrowthCertificationRequest,
    CreateGrowthCertificationResponse
  >;
  readonly updateCertification: GrowthEndpointDescriptor<
    UpdateGrowthCertificationRequest,
    UpdateGrowthCertificationResponse
  >;
  readonly deleteCertification: GrowthEndpointDescriptor<
    DeleteGrowthCertificationRequest,
    DeleteGrowthCertificationResponse
  >;
  readonly listCertifications: GrowthEndpointDescriptor<
    ListGrowthCertificationsRequest,
    ListGrowthCertificationsResponse
  >;
  readonly uploadAttachment: GrowthEndpointDescriptor<
    UploadGrowthAttachmentRequest,
    UploadGrowthAttachmentResponse
  >;
  readonly getMonthlySummary: GrowthEndpointDescriptor<
    GetGrowthMonthlySummaryRequest,
    GetGrowthMonthlySummaryResponse
  >;
  readonly adminCreateContent: GrowthEndpointDescriptor<
    CreateGrowthContentAdminRequest,
    CreateGrowthContentAdminResponse
  >;
  readonly adminUpdateContent: GrowthEndpointDescriptor<
    UpdateGrowthContentAdminRequest,
    UpdateGrowthContentAdminResponse
  >;
  readonly adminPublishContent: GrowthEndpointDescriptor<
    PublishGrowthContentAdminRequest,
    PublishGrowthContentAdminResponse
  >;
  readonly adminHideContent: GrowthEndpointDescriptor<
    HideGrowthContentAdminRequest,
    HideGrowthContentAdminResponse
  >;
  readonly adminAdjustProfile: GrowthEndpointDescriptor<
    AdjustGrowthProfileAdminRequest,
    AdjustGrowthProfileAdminResponse
  >;
  readonly adminListAuditLogs: GrowthEndpointDescriptor<
    GrowthAdminListQuery,
    ListGrowthAuditLogsAdminResponse
  >;
  readonly adminMetrics: GrowthEndpointDescriptor<
    GetGrowthMetricsAdminRequest,
    GetGrowthMetricsAdminResponse
  >;
}

/* -----------------------------------------------------------------------------
 * 10. Runtime-free utility guards and calculators
 * -------------------------------------------------------------------------- */

const includesString = <TValue extends string>(
  values: readonly TValue[],
  value: string,
): value is TValue => (values as readonly string[]).includes(value);

export const isGrowthDomain = (value: string): value is GrowthDomain =>
  includesString(GROWTH_DOMAINS, value);
export const isGrowthTaskType = (value: string): value is GrowthTaskType =>
  includesString(GROWTH_TASK_TYPES, value);
export const isGrowthTaskStatus = (value: string): value is GrowthTaskStatus =>
  includesString(GROWTH_TASK_STATUSES, value);
export const isGrowthContentStatus = (
  value: string,
): value is GrowthContentStatus =>
  includesString(GROWTH_CONTENT_STATUSES, value);
export const isReadingCategory = (value: string): value is ReadingCategory =>
  includesString(READING_CATEGORIES, value);
export const isNewsCategory = (value: string): value is NewsCategory =>
  includesString(NEWS_CATEGORIES, value);
export const isEnglishSkill = (value: string): value is EnglishSkill =>
  includesString(ENGLISH_SKILLS, value);
export const isHealthCategory = (value: string): value is HealthCategory =>
  includesString(HEALTH_CATEGORIES, value);
export const isQuizCategory = (value: string): value is QuizCategory =>
  includesString(QUIZ_CATEGORIES, value);

export const isNonNegativeInteger = (
  value: number,
): value is NonNegativeInteger => Number.isSafeInteger(value) && value >= 0;

export const isPositiveInteger = (value: number): value is PositiveInteger =>
  Number.isSafeInteger(value) && value > 0;

export const clampGrowthLevel = (level: number): Level =>
  Math.max(GROWTH_LEVEL_MIN, Math.min(Math.floor(level), GROWTH_LEVEL_MAX));

export const clampGrowthExp = (exp: number): ExperiencePoint =>
  Math.max(GROWTH_EXP_MIN, Math.min(Math.floor(exp), GROWTH_EXP_MAX));

export const calculateGrowthLevelState = (
  level: Level,
  exp: ExperiencePoint,
  awardedExp = 0,
): GrowthLevelState => {
  let nextLevel = clampGrowthLevel(level);
  let nextExp = Math.max(0, Math.floor(exp + awardedExp));
  while (nextExp >= GROWTH_EXP_MAX && nextLevel < GROWTH_LEVEL_MAX) {
    nextExp -= GROWTH_EXP_MAX;
    nextLevel += 1;
  }
  if (nextLevel >= GROWTH_LEVEL_MAX) nextExp = GROWTH_EXP_MAX;
  const clampedExp = clampGrowthExp(nextExp);
  return {
    level: nextLevel,
    exp: clampedExp,
    totalExp: (nextLevel - GROWTH_LEVEL_MIN) * GROWTH_EXP_MAX + clampedExp,
    expToNextLevel:
      nextLevel >= GROWTH_LEVEL_MAX ? 0 : GROWTH_EXP_MAX - clampedExp,
    progressRate: nextLevel >= GROWTH_LEVEL_MAX ? 100 : clampedExp,
    formulaVersion: GROWTH_FORMULA_VERSION,
  };
};

export const calculateGrowthStreak = (
  previous: GrowthStreakState,
  completedDate: ISODateString,
): GrowthStreakState => {
  if (previous.lastCompletedDate === completedDate) return previous;
  const previousDate = previous.lastCompletedDate
    ? new Date(`${previous.lastCompletedDate}T00:00:00.000Z`)
    : null;
  const currentDate = new Date(`${completedDate}T00:00:00.000Z`);
  const diffDays = previousDate
    ? Math.round((currentDate.getTime() - previousDate.getTime()) / 86_400_000)
    : 0;
  const currentStreakDays =
    previousDate && diffDays === 1 ? previous.currentStreakDays + 1 : 1;
  return {
    currentStreakDays,
    longestStreakDays: Math.max(previous.longestStreakDays, currentStreakDays),
    lastCompletedDate: completedDate,
    protectedByFreeze: false,
    freezeCount: previous.freezeCount,
  };
};

export const assertGrowthPolicyGuard = (guard: GrowthPolicyGuard): void => {
  if (
    guard.rawPiiIncluded !== false ||
    guard.rawSecretIncluded !== false ||
    guard.rawTokenIncluded !== false ||
    guard.rawFinancialSourceDataIncluded !== false ||
    guard.adsGrowthDataJoinAllowed !== false ||
    guard.payrollExpenseDataJoinedForRecommendation !== false ||
    guard.healthAdviceIsMedicalDiagnosis !== false ||
    guard.financialContentIsInvestmentAdvice !== false ||
    guard.aiRecommendationRequiresDisclosure !== true ||
    guard.partnerContentRequiresDisclosure !== true ||
    guard.communityCertificationRequiresUserAction !== true
  ) {
    throw new Error(
      "Unsafe growth policy guard: LV UP payload must not include raw PII, secrets, tokens, raw financial data joins, undisclosed AI/partner content, medical diagnosis, or investment advice.",
    );
  }
};

export const createGrowthPolicyGuard = (): GrowthPolicyGuard => ({
  ...GROWTH_SAFE_POLICY_GUARD,
});

export const getGrowthDomainDescriptor = (
  domain: GrowthDomain,
): GrowthDomainDescriptor<GrowthDomain> => {
  const descriptor = GROWTH_DOMAIN_DESCRIPTORS.find(
    (item) => item.domain === domain,
  );
  if (!descriptor) throw new Error(`Unknown growth domain: ${domain}`);
  return descriptor;
};

export const normalizeGrowthPageSize = (
  pageSize: number | undefined,
  fallback = 20,
  max = 100,
): number => {
  if (typeof pageSize !== "number" || !Number.isFinite(pageSize))
    return fallback;
  return Math.max(1, Math.min(Math.floor(pageSize), max));
};

/* -----------------------------------------------------------------------------
 * 11. Completeness report
 * -------------------------------------------------------------------------- */

export interface GrowthTypesCompletenessReport {
  readonly ok: boolean;
  readonly contractVersion: typeof GROWTH_TYPES_CONTRACT_VERSION;
  readonly domainCount: number;
  readonly taskTypeCount: number;
  readonly readingCategoryCount: number;
  readonly newsCategoryCount: number;
  readonly englishSkillCount: number;
  readonly healthCategoryCount: number;
  readonly quizCategoryCount: number;
  readonly apiPathCount: number;
  readonly hasLevelContract: boolean;
  readonly hasStreakContract: boolean;
  readonly hasCertificationContract: boolean;
  readonly hasRecommendationPolicyGuard: boolean;
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

export const getGrowthTypesCompletenessReport =
  (): GrowthTypesCompletenessReport => {
    const missing: string[] = [];

    requireEvery(
      GROWTH_DOMAINS,
      ["READING", "NEWS", "ENGLISH", "HEALTH", "QUIZ"] as const,
      "domain",
      missing,
    );
    requireEvery(
      GROWTH_TASK_TYPES,
      [
        "DAILY_READING",
        "DAILY_NEWS",
        "DAILY_ENGLISH",
        "DAILY_HOME_TRAINING",
        "DAILY_FINANCE_QUIZ",
        "COMMUNITY_CERTIFICATION",
      ] as const,
      "task type",
      missing,
    );
    requireEvery(
      READING_CATEGORIES,
      [
        "AI_RECOMMENDED",
        "NOVEL",
        "BUSINESS_ECONOMY",
        "HUMANITIES_PHILOSOPHY",
        "ETC",
      ] as const,
      "reading category",
      missing,
    );
    requireEvery(
      NEWS_CATEGORIES,
      ["ALL", "ECONOMY", "INDUSTRY", "SOCIETY", "TECH"] as const,
      "news category",
      missing,
    );
    requireEvery(
      ENGLISH_SKILLS,
      ["LISTENING", "SPEAKING", "READING", "WRITING"] as const,
      "english skill",
      missing,
    );
    requireEvery(
      HEALTH_CATEGORIES,
      ["BODY", "NUTRITION", "RECOVERY", "MENTAL"] as const,
      "health category",
      missing,
    );
    requireEvery(
      QUIZ_CATEGORIES,
      ["BUDGET", "SAVING", "EXPENSE", "SALARY"] as const,
      "quiz category",
      missing,
    );

    for (const pathName of [
      "getHome",
      "getProfile",
      "listTasks",
      "generateDailyTasks",
      "completeTask",
      "claimReward",
      "listContents",
      "listRecommendations",
      "createCertification",
      "listCertifications",
      "getMonthlySummary",
      "adminCreateContent",
      "adminAdjustProfile",
      "adminMetrics",
    ] as const satisfies readonly GrowthApiPathName[]) {
      if (!GROWTH_API_PATHS[pathName])
        missing.push(`missing API path: ${pathName}`);
    }

    if (GROWTH_SAFE_POLICY_GUARD.adsGrowthDataJoinAllowed)
      missing.push("ads-growth data join must not be allowed by default");
    if (GROWTH_SAFE_POLICY_GUARD.payrollExpenseDataJoinedForRecommendation)
      missing.push(
        "payroll/expense raw data must not be joined for growth recommendation",
      );
    if (!GROWTH_SAFE_POLICY_GUARD.aiRecommendationRequiresDisclosure)
      missing.push("AI recommendation disclosure is required");
    if (!GROWTH_SAFE_POLICY_GUARD.partnerContentRequiresDisclosure)
      missing.push("partner content disclosure is required");

    return {
      ok: missing.length === 0,
      contractVersion: GROWTH_TYPES_CONTRACT_VERSION,
      domainCount: GROWTH_DOMAINS.length,
      taskTypeCount: GROWTH_TASK_TYPES.length,
      readingCategoryCount: READING_CATEGORIES.length,
      newsCategoryCount: NEWS_CATEGORIES.length,
      englishSkillCount: ENGLISH_SKILLS.length,
      healthCategoryCount: HEALTH_CATEGORIES.length,
      quizCategoryCount: QUIZ_CATEGORIES.length,
      apiPathCount: Object.keys(GROWTH_API_PATHS).length,
      hasLevelContract: true,
      hasStreakContract: true,
      hasCertificationContract: true,
      hasRecommendationPolicyGuard: true,
      missing,
    };
  };

export const assertGrowthTypesCompleteness = (): void => {
  const report = getGrowthTypesCompletenessReport();
  if (!report.ok)
    throw new Error(
      `Growth types are incomplete: ${report.missing.join(", ")}`,
    );
};

export const GROWTH_TYPES_COMPLETENESS_REPORT = Object.freeze(
  getGrowthTypesCompletenessReport(),
);

export const growthTypes = Object.freeze({
  contractVersion: GROWTH_TYPES_CONTRACT_VERSION,
  packageName: GROWTH_TYPES_PACKAGE,
  domain: GROWTH_TYPES_DOMAIN,
  timezone: GROWTH_TIMEZONE,
  locale: GROWTH_LOCALE,
  formulaVersion: GROWTH_FORMULA_VERSION,
  levelMin: GROWTH_LEVEL_MIN,
  levelMax: GROWTH_LEVEL_MAX,
  expMin: GROWTH_EXP_MIN,
  expMax: GROWTH_EXP_MAX,
  domains: GROWTH_DOMAINS,
  taskTypes: GROWTH_TASK_TYPES,
  taskStatuses: GROWTH_TASK_STATUSES,
  contentStatuses: GROWTH_CONTENT_STATUSES,
  contentSourceTypes: GROWTH_CONTENT_SOURCE_TYPES,
  readingCategories: READING_CATEGORIES,
  newsCategories: NEWS_CATEGORIES,
  englishSkills: ENGLISH_SKILLS,
  englishLevels: ENGLISH_LEVELS,
  healthCategories: HEALTH_CATEGORIES,
  homeTrainingAreas: HOME_TRAINING_AREAS,
  weekdays: GROWTH_WEEKDAYS,
  quizCategories: QUIZ_CATEGORIES,
  quizDifficulties: QUIZ_DIFFICULTIES,
  recommendationReasons: GROWTH_RECOMMENDATION_REASONS,
  rewardTypes: GROWTH_REWARD_TYPES,
  badgeTiers: GROWTH_BADGE_TIERS,
  certificationStatuses: GROWTH_CERTIFICATION_STATUSES,
  attachmentTypes: GROWTH_ATTACHMENT_TYPES,
  attachmentScanStatuses: GROWTH_ATTACHMENT_SCAN_STATUSES,
  sortOptions: GROWTH_SORT_OPTIONS,
  adminSortOptions: GROWTH_ADMIN_SORT_OPTIONS,
  auditEventTypes: GROWTH_AUDIT_EVENT_TYPES,
  idempotencyStatuses: GROWTH_IDEMPOTENCY_STATUSES,
  riskLevels: GROWTH_RISK_LEVELS,
  domainDescriptors: GROWTH_DOMAIN_DESCRIPTORS,
  readingCategoryDescriptors: READING_CATEGORY_DESCRIPTORS,
  newsCategoryDescriptors: NEWS_CATEGORY_DESCRIPTORS,
  englishSkillDescriptors: ENGLISH_SKILL_DESCRIPTORS,
  healthCategoryDescriptors: HEALTH_CATEGORY_DESCRIPTORS,
  apiPaths: GROWTH_API_PATHS,
  safePolicyGuard: GROWTH_SAFE_POLICY_GUARD,
  completenessReport: GROWTH_TYPES_COMPLETENESS_REPORT,
  getCompletenessReport: getGrowthTypesCompletenessReport,
  assertCompleteness: assertGrowthTypesCompleteness,
});

export default growthTypes;
