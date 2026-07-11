export type GrowthTaskType =
  | "READING"
  | "EXERCISE"
  | "STUDY"
  | "SAVING"
  | "EXPENSE_LOG"
  | "BUDGET_REVIEW"
  | "CONTENT"
  | "CUSTOM";

export type GrowthTaskStatus =
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ARCHIVED"
  | "DELETED";

export type GrowthTaskDifficulty = "EASY" | "NORMAL" | "HARD" | "EXTREME";

export type GrowthContentType =
  | "READING"
  | "NEWS"
  | "ENGLISH"
  | "HEALTH"
  | "ARTICLE"
  | "VIDEO"
  | "CHECKLIST"
  | "ROUTINE"
  | "COURSE";

export type GrowthDashboard = Readonly<{
  profile: Readonly<{
    level: number;
    totalExp: number;
  }>;
  activeTaskCount: number;
  completedTaskCount: number;
  joinedChallengeCount: number;
  completedContentCount: number;
  todaySuggestion: string;
  financialRawDataExposed: false;
}>;

export type GrowthTask = Readonly<{
  taskId: string;
  title: string;
  taskType: GrowthTaskType;
  difficulty: GrowthTaskDifficulty;
  targetCount: number;
  progressCount: number;
  expReward: number;
  startDate: string;
  endDate: string | null;
  note: string | null;
  publicShareEnabled: boolean;
  status: GrowthTaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  serverAuthority: true;
  financialRawDataExposed: false;
}>;

export type GrowthTaskListResult = Readonly<{
  items: readonly GrowthTask[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type GrowthContentItem = Readonly<{
  contentId: string;
  contentType: GrowthContentType;
  title: string;
  subtitle: string | null;
  category: string;
  difficulty: GrowthTaskDifficulty;
  estimatedMinutes: number;
  topics: readonly string[];
  summary: string;
  missionPrompt: string;
  recordQuestion: string;
  sourceTitle: string;
  sourceAuthor: string | null;
  sourceName: string | null;
  sourceUrl: string;
  licenseType: string;
  safetyLevel: string;
  viewpointTag: string | null;
  xpReward: number;
  status: "PUBLISHED";
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  fullTextStored: false;
  serverAuthority: true;
  financialRawDataExposed: false;
  recommendationUsesSensitiveFinancialData: false;
  adTargetingSeparated: true;
}>;

export type GrowthContentListResult = Readonly<{
  items: readonly GrowthContentItem[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type GrowthTaskProgressRequest = Readonly<{
  progressCount: number;
  note: string | null;
  occurredAt: string;
  idempotencyKey: string | null;
}>;

export type GrowthTaskProgressResult = Readonly<{
  progress: Readonly<{
    progressId: string;
    taskId: string;
    progressCount: number;
    note: string | null;
    occurredAt: string;
    idempotencyKey: string | null;
    expDelta: number;
    createdAt: string;
  }>;
  task: GrowthTask;
  expDelta: number;
  badges: readonly Readonly<Record<string, unknown>>[];
  idempotentReplay: boolean;
}>;

export type GrowthContentCompleteRequest = Readonly<{
  contentId: string;
  note: string | null;
  idempotencyKey: string | null;
}>;

export type GrowthContentCompleteResult = Readonly<{
  completion: Readonly<{
    completionId: string;
    contentId: string;
    note: string | null;
    expDelta: number;
    idempotencyKey: string | null;
    completedAt: string;
    recommendationUsesSensitiveFinancialData: false;
  }>;
  badges: readonly Readonly<Record<string, unknown>>[];
  idempotentReplay: boolean;
}>;

export type GrowthApiClient = Readonly<{
  getDashboard: () => Promise<GrowthDashboard>;
  listTasks: (options?: {
    readonly page?: number;
    readonly pageSize?: number;
    readonly status?: GrowthTaskStatus;
  }) => Promise<GrowthTaskListResult>;
  listContents: (options?: {
    readonly page?: number;
    readonly pageSize?: number;
    readonly contentType?: GrowthContentType;
  }) => Promise<GrowthContentListResult>;
  recordTaskProgress: (
    taskId: string,
    request: GrowthTaskProgressRequest,
  ) => Promise<GrowthTaskProgressResult>;
  completeContent: (
    request: GrowthContentCompleteRequest,
  ) => Promise<GrowthContentCompleteResult>;
}>;
