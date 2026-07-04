import {
  GROWTH_CONTENTS_PATH,
  GROWTH_DASHBOARD_PATH,
  GROWTH_SAFE_ERROR_MESSAGE,
  GROWTH_TASKS_PATH,
} from "./constants";
import type {
  GrowthApiClient,
  GrowthContentCompleteRequest,
  GrowthContentCompleteResult,
  GrowthDashboard,
  GrowthTask,
  GrowthTaskDifficulty,
  GrowthTaskListResult,
  GrowthTaskProgressRequest,
  GrowthTaskProgressResult,
  GrowthTaskStatus,
  GrowthTaskType,
} from "./types";

export type GrowthApiOptions = Readonly<{
  baseUrl: string;
  platform: "ios" | "android" | "web";
  fetcher?: typeof fetch;
  createCorrelationId?: () => string;
}>;

export class GrowthApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "GrowthApiError";
    this.status = status;
    this.code = code;
  }
}

const PRIVACY_HEADERS = Object.freeze({
  "x-raw-financial-data-exposed": "false",
  "x-raw-personal-data-exposed": "false",
  "x-raw-push-token-exposed": "false",
  "x-ad-financial-targeting-used": "false",
});

const TASK_TYPES = new Set<GrowthTaskType>([
  "READING",
  "EXERCISE",
  "STUDY",
  "SAVING",
  "EXPENSE_LOG",
  "BUDGET_REVIEW",
  "CONTENT",
  "CUSTOM",
]);

const TASK_STATUSES = new Set<GrowthTaskStatus>([
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
  "DELETED",
]);

const TASK_DIFFICULTIES = new Set<GrowthTaskDifficulty>([
  "EASY",
  "NORMAL",
  "HARD",
  "EXTREME",
]);
const RAW_SENSITIVE_TEXT_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/u,
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/u,
  /(?:account|계좌)\s*(?:number|번호)?\s*[:：]?\s*\d{2,6}(?:[-\s]\d{2,6}){1,4}/iu,
  /\b(?:authorization|bearer|session|refresh|push|fcm|token)\b\s*[:=]?\s*[A-Z0-9._~+/=-]{8,}/iu,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u,
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function containsRawSensitiveText(value: string): boolean {
  return RAW_SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function isSafeGrowthId(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/u.test(value.trim());
}

function normalizeGrowthId(value: unknown): string {
  if (typeof value !== "string" || !isSafeGrowthId(value)) {
    return invalidResponse();
  }
  return value.trim();
}

function defaultCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `growth-${Date.now().toString(36)}`
  );
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized) return "";

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new GrowthApiError(
      0,
      "GROWTH_INVALID_BASE_URL",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }

  if (url.username || url.password) {
    throw new GrowthApiError(
      0,
      "GROWTH_INVALID_BASE_URL",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }

  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "10.0.2.2";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new GrowthApiError(
      0,
      "GROWTH_INSECURE_BASE_URL",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }
  return normalized;
}

function errorCode(value: unknown): string {
  if (
    !isRecord(value) ||
    !isRecord(value.error) ||
    typeof value.error.code !== "string"
  ) {
    return "GROWTH_REQUEST_FAILED";
  }
  return value.error.code;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function invalidResponse(): never {
  throw new GrowthApiError(
    0,
    "GROWTH_INVALID_RESPONSE",
    GROWTH_SAFE_ERROR_MESSAGE,
  );
}

function normalizeTaskType(value: unknown): GrowthTaskType {
  if (typeof value === "string" && TASK_TYPES.has(value as GrowthTaskType)) {
    return value as GrowthTaskType;
  }
  return invalidResponse();
}

function normalizeTaskStatus(value: unknown): GrowthTaskStatus {
  if (
    typeof value === "string" &&
    TASK_STATUSES.has(value as GrowthTaskStatus)
  ) {
    return value as GrowthTaskStatus;
  }
  return invalidResponse();
}

function normalizeDifficulty(value: unknown): GrowthTaskDifficulty {
  if (
    typeof value === "string" &&
    TASK_DIFFICULTIES.has(value as GrowthTaskDifficulty)
  ) {
    return value as GrowthTaskDifficulty;
  }
  return invalidResponse();
}

function normalizeNullableDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (isDateOnly(value)) return value;
  return invalidResponse();
}

function normalizeNullableTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (isIsoTimestamp(value)) return value;
  return invalidResponse();
}

function normalizeNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return invalidResponse();
}

function normalizeDashboard(value: unknown): GrowthDashboard {
  if (!isRecord(value) || !isRecord(value.data)) {
    return invalidResponse();
  }
  const data = value.data;
  const profileValue = data.profile;
  if (!isRecord(profileValue)) {
    return invalidResponse();
  }
  const profile = profileValue;
  if (
    !isPositiveInteger(profile.level) ||
    !isNonNegativeInteger(profile.totalExp) ||
    !isNonNegativeInteger(data.activeTaskCount) ||
    !isNonNegativeInteger(data.completedTaskCount) ||
    !isNonNegativeInteger(data.joinedChallengeCount) ||
    !isNonNegativeInteger(data.completedContentCount) ||
    typeof data.todaySuggestion !== "string" ||
    data.financialRawDataExposed !== false
  ) {
    return invalidResponse();
  }
  return {
    profile: {
      level: profile.level,
      totalExp: profile.totalExp,
    },
    activeTaskCount: data.activeTaskCount,
    completedTaskCount: data.completedTaskCount,
    joinedChallengeCount: data.joinedChallengeCount,
    completedContentCount: data.completedContentCount,
    todaySuggestion: data.todaySuggestion,
    financialRawDataExposed: false,
  };
}

function normalizeTask(value: unknown): GrowthTask {
  if (!isRecord(value)) return invalidResponse();
  if (
    typeof value.title !== "string" ||
    !value.title ||
    !isPositiveInteger(value.targetCount) ||
    !isNonNegativeInteger(value.progressCount) ||
    !isNonNegativeInteger(value.expReward) ||
    !isDateOnly(value.startDate) ||
    value.publicShareEnabled === undefined ||
    typeof value.publicShareEnabled !== "boolean" ||
    !isIsoTimestamp(value.createdAt) ||
    !isIsoTimestamp(value.updatedAt) ||
    value.serverAuthority !== true ||
    value.financialRawDataExposed !== false
  ) {
    return invalidResponse();
  }
  return {
    taskId: normalizeGrowthId(value.taskId),
    title: value.title,
    taskType: normalizeTaskType(value.taskType),
    difficulty: normalizeDifficulty(value.difficulty),
    targetCount: value.targetCount,
    progressCount: value.progressCount,
    expReward: value.expReward,
    startDate: value.startDate,
    endDate: normalizeNullableDate(value.endDate),
    note: normalizeNullableString(value.note),
    publicShareEnabled: value.publicShareEnabled,
    status: normalizeTaskStatus(value.status),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    completedAt: normalizeNullableTimestamp(value.completedAt),
    serverAuthority: true,
    financialRawDataExposed: false,
  };
}

function normalizeTaskList(value: unknown): GrowthTaskListResult {
  if (!isRecord(value) || !isRecord(value.data)) return invalidResponse();
  const data = value.data;
  if (
    !Array.isArray(data.items) ||
    !isNonNegativeInteger(data.page) ||
    !isNonNegativeInteger(data.pageSize) ||
    !isNonNegativeInteger(data.total)
  ) {
    return invalidResponse();
  }
  return {
    items: data.items.map(normalizeTask),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
  };
}

function validProgressRequest(value: GrowthTaskProgressRequest): boolean {
  const record = value as Record<string, unknown>;
  return (
    hasOnlyKeys(record, [
      "idempotencyKey",
      "note",
      "occurredAt",
      "progressCount",
    ]) &&
    isPositiveInteger(value.progressCount) &&
    value.progressCount <= 10_000 &&
    (value.note === null ||
      (typeof value.note === "string" &&
        !containsRawSensitiveText(value.note))) &&
    isIsoTimestamp(value.occurredAt) &&
    (value.idempotencyKey === null || typeof value.idempotencyKey === "string")
  );
}

function validContentCompleteRequest(
  value: GrowthContentCompleteRequest,
): boolean {
  const record = value as Record<string, unknown>;
  return (
    hasOnlyKeys(record, ["contentId", "idempotencyKey", "note"]) &&
    /^[A-Za-z0-9_-]+$/u.test(value.contentId) &&
    (value.note === null ||
      (typeof value.note === "string" &&
        !containsRawSensitiveText(value.note))) &&
    (value.idempotencyKey === null || typeof value.idempotencyKey === "string")
  );
}

function normalizeTaskListOptions(
  options: Parameters<GrowthApiClient["listTasks"]>[0] = {},
): Readonly<{ page: number; pageSize: number; status: GrowthTaskStatus }> {
  const record = options as Record<string, unknown>;
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const status = options.status ?? "ACTIVE";
  if (
    !hasOnlyKeys(record, ["page", "pageSize", "status"]) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 10_000 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    !TASK_STATUSES.has(status)
  ) {
    throw new GrowthApiError(
      0,
      "GROWTH_INVALID_TASK_LIST_OPTIONS",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }
  return { page, pageSize, status };
}

function normalizeProgress(value: unknown): GrowthTaskProgressResult {
  if (!isRecord(value) || !isRecord(value.data)) {
    return invalidResponse();
  }
  const data = value.data;
  const progressValue = data.progress;
  if (!isRecord(progressValue)) {
    return invalidResponse();
  }
  const progress = progressValue;
  if (
    !isPositiveInteger(progress.progressCount) ||
    !isNonNegativeInteger(progress.expDelta) ||
    !isIsoTimestamp(progress.occurredAt) ||
    !isIsoTimestamp(progress.createdAt) ||
    !isNonNegativeInteger(data.expDelta) ||
    !Array.isArray(data.badges) ||
    typeof data.idempotentReplay !== "boolean"
  ) {
    return invalidResponse();
  }
  return {
    progress: {
      progressId: normalizeGrowthId(progress.progressId),
      taskId: normalizeGrowthId(progress.taskId),
      progressCount: progress.progressCount,
      note: normalizeNullableString(progress.note),
      occurredAt: progress.occurredAt,
      idempotencyKey: normalizeNullableString(progress.idempotencyKey),
      expDelta: progress.expDelta,
      createdAt: progress.createdAt,
    },
    task: normalizeTask(data.task),
    expDelta: data.expDelta,
    badges: data.badges.filter(isRecord),
    idempotentReplay: data.idempotentReplay,
  };
}

function normalizeContentCompletion(
  value: unknown,
): GrowthContentCompleteResult {
  if (!isRecord(value) || !isRecord(value.data)) {
    return invalidResponse();
  }
  const data = value.data;
  const completionValue = data.completion;
  if (!isRecord(completionValue)) {
    return invalidResponse();
  }
  const completion = completionValue;
  if (
    !isNonNegativeInteger(completion.expDelta) ||
    !isIsoTimestamp(completion.completedAt) ||
    completion.recommendationUsesSensitiveFinancialData !== false ||
    !Array.isArray(data.badges) ||
    typeof data.idempotentReplay !== "boolean"
  ) {
    return invalidResponse();
  }
  return {
    completion: {
      completionId: normalizeGrowthId(completion.completionId),
      contentId: normalizeGrowthId(completion.contentId),
      note: normalizeNullableString(completion.note),
      expDelta: completion.expDelta,
      idempotencyKey: normalizeNullableString(completion.idempotencyKey),
      completedAt: completion.completedAt,
      recommendationUsesSensitiveFinancialData: false,
    },
    badges: data.badges.filter(isRecord),
    idempotentReplay: data.idempotentReplay,
  };
}

function taskProgressPath(taskId: string): string {
  const normalized = taskId.trim();
  if (
    !/^[A-Za-z0-9_-]+$/u.test(normalized) ||
    normalized.length < 3 ||
    normalized.length > 160
  ) {
    throw new GrowthApiError(
      0,
      "GROWTH_INVALID_TASK_ID",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }
  return `${GROWTH_TASKS_PATH}/${encodeURIComponent(normalized)}/progress`;
}

function contentCompletePath(contentId: string): string {
  const normalized = contentId.trim();
  if (
    !/^[A-Za-z0-9_-]+$/u.test(normalized) ||
    normalized.length < 3 ||
    normalized.length > 160
  ) {
    throw new GrowthApiError(
      0,
      "GROWTH_INVALID_CONTENT_ID",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }
  return `${GROWTH_CONTENTS_PATH}/${encodeURIComponent(normalized)}/complete`;
}

export function createGrowthApi(options: GrowthApiOptions): GrowthApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetcher = options.fetcher ?? fetch;
  const createCorrelationId =
    options.createCorrelationId ?? defaultCorrelationId;

  async function request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const headers = new Headers({
      accept: "application/json",
      "x-client-platform": options.platform,
      "x-correlation-id": createCorrelationId(),
      ...PRIVACY_HEADERS,
    });
    if (init.body !== undefined)
      headers.set("content-type", "application/json");

    let response: Response;
    try {
      response = await fetcher(
        new Request(`${baseUrl}${path}`, {
          ...init,
          headers,
          credentials: "include",
        }),
      );
    } catch {
      throw new GrowthApiError(
        0,
        "GROWTH_NETWORK_ERROR",
        GROWTH_SAFE_ERROR_MESSAGE,
      );
    }

    const parsed = await parseJson(response);
    if (!response.ok) {
      throw new GrowthApiError(
        response.status,
        errorCode(parsed),
        GROWTH_SAFE_ERROR_MESSAGE,
      );
    }
    return parsed;
  }

  return {
    async getDashboard(): Promise<GrowthDashboard> {
      return normalizeDashboard(await request(GROWTH_DASHBOARD_PATH));
    },

    async listTasks(options = {}): Promise<GrowthTaskListResult> {
      const { page, pageSize, status } = normalizeTaskListOptions(options);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      params.set("status", status);
      return normalizeTaskList(await request(`${GROWTH_TASKS_PATH}?${params}`));
    },

    async recordTaskProgress(
      taskId: string,
      progressRequest: GrowthTaskProgressRequest,
    ): Promise<GrowthTaskProgressResult> {
      if (!validProgressRequest(progressRequest)) {
        throw new GrowthApiError(
          0,
          "GROWTH_INVALID_PROGRESS_REQUEST",
          GROWTH_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeProgress(
        await request(taskProgressPath(taskId), {
          method: "POST",
          body: JSON.stringify(progressRequest),
        }),
      );
    },

    async completeContent(
      completeRequest: GrowthContentCompleteRequest,
    ): Promise<GrowthContentCompleteResult> {
      if (!validContentCompleteRequest(completeRequest)) {
        throw new GrowthApiError(
          0,
          "GROWTH_INVALID_CONTENT_ID",
          GROWTH_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeContentCompletion(
        await request(contentCompletePath(completeRequest.contentId), {
          method: "POST",
          body: JSON.stringify({
            idempotencyKey: completeRequest.idempotencyKey,
            note: completeRequest.note,
          }),
        }),
      );
    },
  };
}
