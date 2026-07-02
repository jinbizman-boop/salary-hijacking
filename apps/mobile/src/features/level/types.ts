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

export type GrowthApiClient = Readonly<{
  getDashboard: () => Promise<GrowthDashboard>;
  listTasks: (options?: {
    readonly page?: number;
    readonly pageSize?: number;
    readonly status?: GrowthTaskStatus;
  }) => Promise<GrowthTaskListResult>;
  recordTaskProgress: (
    taskId: string,
    request: GrowthTaskProgressRequest,
  ) => Promise<GrowthTaskProgressResult>;
}>;
