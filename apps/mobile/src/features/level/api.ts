import {
  GROWTH_CONTENTS_PATH,
  GROWTH_DASHBOARD_PATH,
  GROWTH_GOALS_PATH,
  GROWTH_SAFE_ERROR_MESSAGE,
  GROWTH_SUMMARY_PATH,
  GROWTH_TASKS_PATH,
} from "./constants";
import type {
  GrowthGoalDomain,
  GrowthGoalFrequency,
  GrowthGoalIcon,
  GrowthGoalSaveRequest,
  GrowthGoalSaveResult,
  GrowthGoalSource,
  GrowthSystemIconKey,
  GrowthGoalUnit,
} from "./goal-architecture";
import {
  isMobileLocalApiHost,
  isValidUrlString,
  parseMobileBaseUrlParts,
} from "../../shared/api/url-validation";
import type {
  GrowthApiClient,
  GrowthContentCompleteRequest,
  GrowthContentCompleteResult,
  GrowthContentItem,
  GrowthContentListResult,
  GrowthContentType,
  GrowthDashboard,
  GrowthSummary,
  GrowthSummaryUnit,
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

const CONTENT_TYPES = new Set<GrowthContentType>([
  "READING",
  "NEWS",
  "ENGLISH",
  "HEALTH",
  "ARTICLE",
  "VIDEO",
  "CHECKLIST",
  "ROUTINE",
  "COURSE",
]);
const GOAL_DOMAINS = new Set<GrowthGoalDomain>([
  "HEALTH",
  "LANGUAGE",
  "NEWS",
  "READING",
]);
const GOAL_SOURCES = new Set<GrowthGoalSource>([
  "CUSTOM",
  "DEFAULT",
  "RECOMMENDED",
]);
const GOAL_UNITS = new Set<GrowthGoalUnit>([
  "article",
  "minute",
  "page",
  "sentence",
]);
const GOAL_FREQUENCIES = new Set<GrowthGoalFrequency>([
  "DAILY",
  "WEEKDAYS",
  "WEEKLY",
]);
const SYSTEM_ICON_KEYS = new Set([
  "activity",
  "book-open",
  "briefcase",
  "check",
  "dumbbell",
  "heart",
  "languages",
  "newspaper",
  "piggy-bank",
  "star",
  "target",
  "writing",
]);

const FORBIDDEN_CONTENT_BODY_KEYS = new Set([
  "articleBody",
  "body",
  "bookText",
  "fullText",
  "rawArticle",
  "transcript",
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

function safeIdempotencyPart(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^A-Za-z0-9_-]/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 80);
  return normalized || "request";
}

function growthIdempotencyKey(correlationId: string, method: string): string {
  const entropy =
    globalThis.crypto?.randomUUID?.().replace(/-/gu, "") ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return [
    "mobile-growth",
    safeIdempotencyPart(correlationId),
    safeIdempotencyPart(method.toLowerCase()),
    entropy,
  ].join("-");
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized) return "";

  try {
    if (!isValidUrlString(normalized)) throw new Error("INVALID_URL");
  } catch {
    throw new GrowthApiError(
      0,
      "GROWTH_INVALID_BASE_URL",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }

  const baseUrlParts = parseMobileBaseUrlParts(normalized);
  if (!baseUrlParts || baseUrlParts.containsCredentials) {
    throw new GrowthApiError(
      0,
      "GROWTH_INVALID_BASE_URL",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }

  const localHost = isMobileLocalApiHost(baseUrlParts.hostname);
  if (
    baseUrlParts.protocol !== "https:" &&
    !(baseUrlParts.protocol === "http:" && localHost)
  ) {
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
  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new GrowthApiError(
      response.status,
      "GROWTH_INVALID_RESPONSE",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }
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

function normalizeContentType(value: unknown): GrowthContentType {
  if (
    typeof value === "string" &&
    CONTENT_TYPES.has(value as GrowthContentType)
  ) {
    return value as GrowthContentType;
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

function normalizeDisplayText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return invalidResponse();
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > maxLength ||
    containsRawSensitiveText(normalized)
  ) {
    return invalidResponse();
  }
  return normalized;
}

function normalizeNullableSafeText(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === null || value === undefined) return null;
  return normalizeDisplayText(value, maxLength);
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

function normalizeSummary(value: unknown): GrowthSummary {
  if (!isRecord(value) || !isRecord(value.data)) {
    return invalidResponse();
  }
  const data = value.data;
  if (
    !isDateOnly(data.startDate) ||
    !isDateOnly(data.endDate) ||
    !isNonNegativeInteger(data.progressRecordCount) ||
    !isNonNegativeInteger(data.expEarnedInPeriod) ||
    !isNonNegativeInteger(data.totalExp) ||
    !isPositiveInteger(data.level) ||
    !isNonNegativeInteger(data.taskCount) ||
    !isNonNegativeInteger(data.badgeCount) ||
    data.financialRawDataExposed !== false
  ) {
    return invalidResponse();
  }
  return {
    badgeCount: data.badgeCount,
    domainTotals: normalizeDomainTotals(data.domainTotals),
    endDate: data.endDate,
    expEarnedInPeriod: data.expEarnedInPeriod,
    financialRawDataExposed: false,
    level: data.level,
    missionCompletionCount: isNonNegativeInteger(data.missionCompletionCount)
      ? data.missionCompletionCount
      : data.progressRecordCount,
    missionTargetCount: isNonNegativeInteger(data.missionTargetCount)
      ? data.missionTargetCount
      : Math.max(data.taskCount, data.progressRecordCount),
    progressRecordCount: data.progressRecordCount,
    recentActivities: normalizeRecentActivities(data.recentActivities),
    startDate: data.startDate,
    strongestDomain:
      typeof data.strongestDomain === "string" &&
      GOAL_DOMAINS.has(data.strongestDomain as GrowthGoalDomain)
        ? (data.strongestDomain as GrowthGoalDomain)
        : null,
    streakDays: isNonNegativeInteger(data.streakDays) ? data.streakDays : 0,
    taskCount: data.taskCount,
    totalExp: data.totalExp,
  };
}

function normalizeDomainTotals(value: unknown): GrowthSummary["domainTotals"] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => {
    const domain = normalizeGoalDomain(item.domain);
    const unit = normalizeSummaryUnit(item.unit);
    const quantity = isNonNegativeInteger(item.quantity) ? item.quantity : 0;
    return {
      detail: normalizeDisplayText(item.detail ?? "", 80),
      domain,
      label: normalizeDisplayText(item.label ?? domainLabel(domain), 20),
      quantity,
      unit,
      value: normalizeDisplayText(
        item.value ?? `${quantity}${summaryUnitLabel(unit)}`,
        32,
      ),
    };
  });
}

function normalizeRecentActivities(
  value: unknown,
): GrowthSummary["recentActivities"] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item, index) => {
    const domain = normalizeGoalDomain(item.domain);
    return {
      domain,
      id: normalizeDisplayText(item.id ?? `activity-${index}`, 80),
      label: normalizeDisplayText(item.label ?? domainLabel(domain), 40),
      title: normalizeDisplayText(item.title ?? "활동 기록", 80),
      xp: normalizeDisplayText(item.xp ?? "+0 XP", 16),
    };
  });
}

function normalizeSummaryUnit(value: unknown): GrowthSummaryUnit {
  if (
    value === "ARTICLE" ||
    value === "MINUTE" ||
    value === "PAGE" ||
    value === "SENTENCE"
  ) {
    return value;
  }
  return invalidResponse();
}

function summaryUnitLabel(unit: GrowthSummaryUnit): string {
  if (unit === "ARTICLE") return "개";
  if (unit === "MINUTE") return "분";
  if (unit === "PAGE") return "페이지";
  return "문장";
}

function domainLabel(domain: GrowthGoalDomain): string {
  if (domain === "HEALTH") return "운동";
  if (domain === "LANGUAGE") return "외국어";
  if (domain === "NEWS") return "뉴스";
  return "독서";
}

function normalizeTask(value: unknown): GrowthTask {
  if (!isRecord(value)) return invalidResponse();
  if (
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
    title: normalizeDisplayText(value.title, 100),
    taskType: normalizeTaskType(value.taskType),
    difficulty: normalizeDifficulty(value.difficulty),
    targetCount: value.targetCount,
    progressCount: value.progressCount,
    expReward: value.expReward,
    startDate: value.startDate,
    endDate: normalizeNullableDate(value.endDate),
    note: normalizeNullableSafeText(value.note, 500),
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

function normalizeSourceUrl(value: unknown): string {
  if (typeof value !== "string") return invalidResponse();
  try {
    if (!isValidUrlString(value)) throw new Error("INVALID_URL");
  } catch {
    return invalidResponse();
  }
  const urlParts = parseMobileBaseUrlParts(value);
  if (urlParts?.protocol !== "https:" || urlParts.containsCredentials) {
    return invalidResponse();
  }
  return value.trim();
}

function normalizeAdTargetingSeparated(value: unknown): true {
  if (value === true) return true;
  if (typeof value === "string" && value.trim() === "[REDACTED]") {
    return true;
  }
  return invalidResponse();
}

function hasForbiddenContentBody(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => FORBIDDEN_CONTENT_BODY_KEYS.has(key));
}

function normalizeContentItem(value: unknown): GrowthContentItem {
  if (!isRecord(value) || hasForbiddenContentBody(value)) {
    return invalidResponse();
  }
  if (
    !isPositiveInteger(value.estimatedMinutes) ||
    !Array.isArray(value.topics) ||
    !isNonNegativeInteger(value.xpReward) ||
    value.status !== "PUBLISHED" ||
    !isIsoTimestamp(value.publishedAt) ||
    !isIsoTimestamp(value.createdAt) ||
    !isIsoTimestamp(value.updatedAt) ||
    value.fullTextStored !== false ||
    value.serverAuthority !== true ||
    value.financialRawDataExposed !== false ||
    value.recommendationUsesSensitiveFinancialData !== false
  ) {
    return invalidResponse();
  }
  const adTargetingSeparated = normalizeAdTargetingSeparated(
    value.adTargetingSeparated,
  );
  return {
    contentId: normalizeGrowthId(value.contentId),
    contentType: normalizeContentType(value.contentType),
    title: normalizeDisplayText(value.title, 120),
    subtitle: normalizeNullableSafeText(value.subtitle, 120),
    category: normalizeDisplayText(value.category, 80),
    difficulty: normalizeDifficulty(value.difficulty),
    estimatedMinutes: value.estimatedMinutes,
    topics: value.topics.map((topic) => normalizeDisplayText(topic, 40)),
    summary: normalizeDisplayText(value.summary, 900),
    missionPrompt: normalizeDisplayText(value.missionPrompt, 300),
    recordQuestion: normalizeDisplayText(value.recordQuestion, 180),
    sourceTitle: normalizeDisplayText(value.sourceTitle, 160),
    sourceAuthor: normalizeNullableSafeText(value.sourceAuthor, 120),
    sourceName: normalizeNullableSafeText(value.sourceName, 120),
    sourceUrl: normalizeSourceUrl(value.sourceUrl),
    licenseType: normalizeDisplayText(value.licenseType, 80),
    safetyLevel: normalizeDisplayText(value.safetyLevel, 80),
    viewpointTag: normalizeNullableSafeText(value.viewpointTag, 80),
    xpReward: value.xpReward,
    status: "PUBLISHED",
    publishedAt: value.publishedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    fullTextStored: false,
    serverAuthority: true,
    financialRawDataExposed: false,
    recommendationUsesSensitiveFinancialData: false,
    adTargetingSeparated,
  };
}

function normalizeContentList(value: unknown): GrowthContentListResult {
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
    items: data.items.map(normalizeContentItem),
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

function normalizeContentListOptions(
  options: Parameters<GrowthApiClient["listContents"]>[0] = {},
): Readonly<{
  page: number;
  pageSize: number;
  contentType: GrowthContentType | null;
}> {
  const record = options as Record<string, unknown>;
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const contentType = options.contentType ?? null;
  if (
    !hasOnlyKeys(record, ["page", "pageSize", "contentType"]) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 10_000 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    (contentType !== null && !CONTENT_TYPES.has(contentType))
  ) {
    throw new GrowthApiError(
      0,
      "GROWTH_INVALID_CONTENT_LIST_OPTIONS",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }
  return { page, pageSize, contentType };
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

function normalizeGoalDomain(value: unknown): GrowthGoalDomain {
  if (typeof value === "string" && GOAL_DOMAINS.has(value as GrowthGoalDomain)) {
    return value as GrowthGoalDomain;
  }
  return invalidResponse();
}

function normalizeGoalSource(value: unknown): GrowthGoalSource {
  if (typeof value === "string" && GOAL_SOURCES.has(value as GrowthGoalSource)) {
    return value as GrowthGoalSource;
  }
  return invalidResponse();
}

function normalizeGoalUnit(value: unknown): GrowthGoalUnit {
  if (typeof value === "string" && GOAL_UNITS.has(value as GrowthGoalUnit)) {
    return value as GrowthGoalUnit;
  }
  return invalidResponse();
}

function normalizeGoalFrequency(value: unknown): GrowthGoalFrequency {
  if (
    typeof value === "string" &&
    GOAL_FREQUENCIES.has(value as GrowthGoalFrequency)
  ) {
    return value as GrowthGoalFrequency;
  }
  return invalidResponse();
}

function normalizeGoalIcon(value: unknown): GrowthGoalIcon {
  if (!isRecord(value) || typeof value.iconType !== "string") {
    return invalidResponse();
  }
  if (value.iconType === "SYSTEM_ICON") {
    if (typeof value.iconKey === "string" && SYSTEM_ICON_KEYS.has(value.iconKey)) {
      return {
        iconKey: value.iconKey as GrowthSystemIconKey,
        iconType: "SYSTEM_ICON",
      };
    }
    return invalidResponse();
  }
  if (value.iconType === "EMOJI" && typeof value.emoji === "string") {
    const emoji = value.emoji.trim();
    if (emoji && !emoji.includes("<") && !emoji.includes("http")) {
      return { emoji, iconType: "EMOJI" };
    }
  }
  return invalidResponse();
}

function normalizeGoalSaveResult(value: unknown): GrowthGoalSaveResult {
  if (!isRecord(value) || !isRecord(value.data)) return invalidResponse();
  const data = value.data;
  if (!isRecord(data.activeGoal) || data.serverAuthority !== true) {
    return invalidResponse();
  }
  const activeGoal = data.activeGoal;
  if (
    !Array.isArray(activeGoal.activeDays) ||
    !isPositiveInteger(activeGoal.targetValue) ||
    !isDateOnly(activeGoal.effectiveDate) ||
    data.historicalMissionMutationCount !== 0
  ) {
    return invalidResponse();
  }
  return {
    activeGoal: {
      activeDays: activeGoal.activeDays.map((day) =>
        normalizeDisplayText(day, 10),
      ),
      domain: normalizeGoalDomain(activeGoal.domain),
      domainOption: normalizeDisplayText(activeGoal.domainOption ?? "기본", 40),
      effectiveDate: activeGoal.effectiveDate,
      frequency: normalizeGoalFrequency(activeGoal.frequency),
      icon: normalizeGoalIcon(activeGoal.icon),
      preferredTime: normalizeDisplayText(activeGoal.preferredTime ?? "08:00", 8),
      source: normalizeGoalSource(activeGoal.source),
      targetUnit: normalizeGoalUnit(activeGoal.targetUnit),
      targetValue: activeGoal.targetValue,
      title: normalizeDisplayText(activeGoal.title, 80),
    },
    historicalMissionMutationCount: 0,
    serverAuthority: true,
  };
}

function validGoalSaveRequest(value: GrowthGoalSaveRequest): boolean {
  const record = value as Record<string, unknown>;
  let iconValid = false;
  try {
    normalizeGoalIcon(value.icon);
    iconValid = true;
  } catch {
    iconValid = false;
  }
  return (
    hasOnlyKeys(record, [
      "activeDays",
      "domain",
      "domainOption",
      "effectiveDate",
      "frequency",
      "historicalMissionMutationCount",
      "icon",
      "preferredTime",
      "source",
      "targetUnit",
      "targetValue",
      "title",
    ]) &&
    GOAL_DOMAINS.has(value.domain) &&
    GOAL_SOURCES.has(value.source) &&
    GOAL_UNITS.has(value.targetUnit) &&
    GOAL_FREQUENCIES.has(value.frequency) &&
    isPositiveInteger(value.targetValue) &&
    value.targetValue <= 10_000 &&
    Array.isArray(value.activeDays) &&
    value.activeDays.length > 0 &&
    value.activeDays.length <= 7 &&
    value.activeDays.every((day) => typeof day === "string" && day.length <= 10) &&
    isDateOnly(value.effectiveDate) &&
    value.historicalMissionMutationCount === 0 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    !containsRawSensitiveText(value.title) &&
    typeof value.domainOption === "string" &&
    !containsRawSensitiveText(value.domainOption) &&
    typeof value.preferredTime === "string" &&
    /^\d{2}:\d{2}$/u.test(value.preferredTime) &&
    iconValid
  );
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

function goalPath(domain: GrowthGoalDomain): string {
  if (!GOAL_DOMAINS.has(domain)) {
    throw new GrowthApiError(
      0,
      "GROWTH_INVALID_GOAL_DOMAIN",
      GROWTH_SAFE_ERROR_MESSAGE,
    );
  }
  return `${GROWTH_GOALS_PATH}/${domain}`;
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
    const correlationId = createCorrelationId();
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers({
      accept: "application/json",
      "x-client-platform": options.platform,
      "x-correlation-id": correlationId,
      ...PRIVACY_HEADERS,
    });
    if (init.body !== undefined)
      headers.set("content-type", "application/json");
    if (method !== "GET") {
      headers.set(
        "x-idempotency-key",
        growthIdempotencyKey(correlationId, method),
      );
    }

    let response: Response;
    try {
      response = await fetcher(
        new Request(`${baseUrl}${path}`, {
          ...init,
          headers,
          credentials: "include",
          method,
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

    async getSummary(options = {}): Promise<GrowthSummary> {
      const params = new URLSearchParams();
      if (options.startDate) params.set("startDate", options.startDate);
      if (options.endDate) params.set("endDate", options.endDate);
      const query = params.toString();
      const suffix = query ? `?${query}` : "";
      return normalizeSummary(await request(`${GROWTH_SUMMARY_PATH}${suffix}`));
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

    async listContents(options = {}): Promise<GrowthContentListResult> {
      const { page, pageSize, contentType } =
        normalizeContentListOptions(options);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (contentType) params.set("contentType", contentType);
      return normalizeContentList(
        await request(`${GROWTH_CONTENTS_PATH}?${params}`),
      );
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

    async updateGoal(
      domain: GrowthGoalDomain,
      goalRequest: GrowthGoalSaveRequest,
    ): Promise<GrowthGoalSaveResult> {
      if (!validGoalSaveRequest(goalRequest) || domain !== goalRequest.domain) {
        throw new GrowthApiError(
          0,
          "GROWTH_INVALID_GOAL_REQUEST",
          GROWTH_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeGoalSaveResult(
        await request(goalPath(domain), {
          method: "PATCH",
          body: JSON.stringify(goalRequest),
        }),
      );
    },
  };
}
