import {
  NOTIFICATIONS_DEVICES_PATH,
  NOTIFICATIONS_PATH,
  NOTIFICATIONS_PREFERENCES_PATH,
  NOTIFICATIONS_READ_ALL_PATH,
  NOTIFICATIONS_SAFE_ERROR_MESSAGE,
  NOTIFICATIONS_UNREAD_COUNT_PATH,
} from "./constants";
import type {
  NotificationChannel,
  NotificationDevice,
  NotificationDevicePlatform,
  NotificationDeviceRegistrationRequest,
  NotificationDeviceStatus,
  NotificationItem,
  NotificationListResult,
  NotificationPriority,
  NotificationPreferences,
  NotificationPreferencesUpdateRequest,
  NotificationReadAllResult,
  NotificationStatus,
  NotificationType,
  NotificationUnreadCount,
  NotificationsApiClient,
} from "./types";

export type NotificationsApiOptions = Readonly<{
  baseUrl: string;
  platform: "ios" | "android" | "web";
  fetcher?: typeof fetch;
  createCorrelationId?: () => string;
}>;

export class NotificationsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "NotificationsApiError";
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
const RAW_SENSITIVE_TEXT_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
  /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/u,
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/u,
  /(?:account|계좌)\s*(?:number|번호)?\s*[:：]?\s*\d{2,6}(?:[-\s]\d{2,6}){1,4}/iu,
  /\b(?:authorization|bearer|session|refresh|push|fcm|token)\b\s*[:=]?\s*[A-Z0-9._~+/=-]{8,}/iu,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u,
] as const;

const NOTIFICATION_TYPES = new Set<NotificationType>([
  "PAYDAY",
  "PAYMENT_DUE",
  "BUDGET_WARNING",
  "BUDGET_EXCEEDED",
  "SAVINGS_GOAL",
  "LEVEL_UP",
  "COMMUNITY",
  "NOTICE",
  "SECURITY",
  "CONTENT_RECOMMENDATION",
  "AD_PARTNER",
]);

const NOTIFICATION_CHANNELS = new Set<NotificationChannel>([
  "IN_APP",
  "PUSH",
  "EMAIL",
]);

const NOTIFICATION_STATUSES = new Set<NotificationStatus>([
  "UNREAD",
  "READ",
  "ARCHIVED",
  "DELETED",
]);

const NOTIFICATION_PRIORITIES = new Set<NotificationPriority>([
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
]);

const NOTIFICATION_DEVICE_PLATFORMS = new Set<NotificationDevicePlatform>([
  "IOS",
  "ANDROID",
  "WEB",
]);

const NOTIFICATION_DEVICE_STATUSES = new Set<NotificationDeviceStatus>([
  "ACTIVE",
  "REVOKED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function containsRawSensitiveText(value: string): boolean {
  return RAW_SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isSafeNotificationId(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/u.test(value.trim());
}

function isSafeDeviceId(value: string): boolean {
  return /^[A-Za-z0-9_.:-]+$/u.test(value.trim());
}

function invalidNotificationsResponse(): never {
  throw new NotificationsApiError(
    0,
    "NOTIFICATION_INVALID_RESPONSE",
    NOTIFICATIONS_SAFE_ERROR_MESSAGE,
  );
}

function defaultCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `notifications-${Date.now().toString(36)}`
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

function notificationsIdempotencyKey(
  correlationId: string,
  method: string,
): string {
  const entropy =
    globalThis.crypto?.randomUUID?.().replace(/-/gu, "") ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return [
    "mobile-notifications",
    safeIdempotencyPart(correlationId),
    safeIdempotencyPart(method.toLowerCase()),
    entropy,
  ].join("-");
}

function normalizeBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized) return "";

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_BASE_URL",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }

  if (url.username || url.password) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_BASE_URL",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }

  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "10.0.2.2";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INSECURE_BASE_URL",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
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
    return "NOTIFICATION_REQUEST_FAILED";
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

function normalizeType(value: unknown): NotificationType {
  if (
    typeof value === "string" &&
    NOTIFICATION_TYPES.has(value as NotificationType)
  ) {
    return value as NotificationType;
  }
  return invalidNotificationsResponse();
}

function normalizePriority(value: unknown): NotificationPriority {
  if (
    typeof value === "string" &&
    NOTIFICATION_PRIORITIES.has(value as NotificationPriority)
  ) {
    return value as NotificationPriority;
  }
  return invalidNotificationsResponse();
}

function normalizeStatus(value: unknown): NotificationStatus {
  if (
    typeof value === "string" &&
    NOTIFICATION_STATUSES.has(value as NotificationStatus)
  ) {
    return value as NotificationStatus;
  }
  return invalidNotificationsResponse();
}

function normalizeChannels(value: unknown): readonly NotificationChannel[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const channels = raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is NotificationChannel =>
      NOTIFICATION_CHANNELS.has(item as NotificationChannel),
    );
  if (!channels.length) {
    return invalidNotificationsResponse();
  }
  return channels;
}

function normalizeNullableTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (isIsoTimestamp(value)) return value;
  return invalidNotificationsResponse();
}

function normalizeMetadata(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) =>
        !/salary|income|expense|saving|token|phone|email|card|account/iu.test(
          key,
        ),
    ),
  );
}

function normalizeNotificationItem(value: unknown): NotificationItem {
  if (!isRecord(value)) {
    return invalidNotificationsResponse();
  }
  if (
    typeof value.notificationId !== "string" ||
    !isSafeNotificationId(value.notificationId) ||
    typeof value.title !== "string" ||
    !value.title ||
    containsRawSensitiveText(value.title) ||
    typeof value.message !== "string" ||
    containsRawSensitiveText(value.message) ||
    !isIsoTimestamp(value.createdAt) ||
    value.sensitiveFinancialDataExposed !== false ||
    value.adTargetingSeparated !== true
  ) {
    return invalidNotificationsResponse();
  }

  return {
    notificationId: value.notificationId.trim(),
    type: normalizeType(value.type),
    title: value.title,
    message: value.message,
    priority: normalizePriority(value.priority),
    channels: normalizeChannels(value.channels),
    deeplink: typeof value.deeplink === "string" ? value.deeplink : null,
    status: normalizeStatus(value.status),
    scheduledAt: normalizeNullableTimestamp(value.scheduledAt),
    expiresAt: normalizeNullableTimestamp(value.expiresAt),
    isMandatory: value.isMandatory === true,
    metadata: normalizeMetadata(value.metadata),
    createdAt: value.createdAt,
    readAt: normalizeNullableTimestamp(value.readAt),
    archivedAt: normalizeNullableTimestamp(value.archivedAt),
    sensitiveFinancialDataExposed: false,
    adTargetingSeparated: true,
  };
}

function normalizeListResult(value: unknown): NotificationListResult {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  const data = value.data;
  if (
    !Array.isArray(data.items) ||
    !isNonNegativeInteger(data.page) ||
    !isNonNegativeInteger(data.pageSize) ||
    !isNonNegativeInteger(data.total)
  ) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  return {
    items: data.items.map(normalizeNotificationItem),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
  };
}

function normalizeUnreadCount(value: unknown): NotificationUnreadCount {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  const data = value.data;
  if (
    !isNonNegativeInteger(data.unreadCount) ||
    !isRecord(data.byType) ||
    !isIsoTimestamp(data.updatedAt)
  ) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  return {
    unreadCount: data.unreadCount,
    byType: Object.fromEntries(
      Object.entries(data.byType).filter(
        ([key, count]) =>
          NOTIFICATION_TYPES.has(key as NotificationType) &&
          isNonNegativeInteger(count),
      ),
    ) as Partial<Record<NotificationType, number>>,
    updatedAt: data.updatedAt,
  };
}

function normalizeReadAllResult(value: unknown): NotificationReadAllResult {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  const data = value.data;
  if (
    !isNonNegativeInteger(data.markedReadCount) ||
    !isIsoTimestamp(data.updatedAt)
  ) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  return {
    markedReadCount: data.markedReadCount,
    updatedAt: data.updatedAt,
  };
}

const PREFERENCE_BOOLEAN_KEYS = [
  "adPartnerEnabled",
  "budgetExceededEnabled",
  "budgetWarningEnabled",
  "communityEnabled",
  "contentRecommendationEnabled",
  "emailEnabled",
  "inAppEnabled",
  "levelUpEnabled",
  "paymentDueEnabled",
  "paydayEnabled",
  "pushEnabled",
  "savingsGoalEnabled",
  "securityEnabled",
] as const;

function normalizeBooleanPreference(
  value: Record<string, unknown>,
  key: (typeof PREFERENCE_BOOLEAN_KEYS)[number],
): boolean {
  if (typeof value[key] === "boolean") return value[key];
  throw new NotificationsApiError(
    0,
    "NOTIFICATION_INVALID_RESPONSE",
    NOTIFICATIONS_SAFE_ERROR_MESSAGE,
  );
}

function normalizeTimeWindow(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && /^\d{2}:\d{2}$/u.test(value)) return value;
  throw new NotificationsApiError(
    0,
    "NOTIFICATION_INVALID_RESPONSE",
    NOTIFICATIONS_SAFE_ERROR_MESSAGE,
  );
}

function isSafeTimezone(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timezone = value.trim();
  return (
    timezone.length >= 3 &&
    timezone.length <= 64 &&
    /^[A-Za-z]+(?:[._-]?[A-Za-z0-9]+)*(?:\/[A-Za-z]+(?:[._-]?[A-Za-z0-9]+)*){0,3}$/u.test(
      timezone,
    ) &&
    !containsRawSensitiveText(timezone)
  );
}

function normalizePreferences(value: unknown): NotificationPreferences {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  const data = value.data;
  if (
    !isSafeTimezone(data.timezone) ||
    !isIsoTimestamp(data.updatedAt) ||
    data.sensitiveFinancialTargetingConsent !== false
  ) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }

  return {
    adPartnerEnabled: normalizeBooleanPreference(data, "adPartnerEnabled"),
    budgetExceededEnabled: normalizeBooleanPreference(
      data,
      "budgetExceededEnabled",
    ),
    budgetWarningEnabled: normalizeBooleanPreference(
      data,
      "budgetWarningEnabled",
    ),
    communityEnabled: normalizeBooleanPreference(data, "communityEnabled"),
    contentRecommendationEnabled: normalizeBooleanPreference(
      data,
      "contentRecommendationEnabled",
    ),
    emailEnabled: normalizeBooleanPreference(data, "emailEnabled"),
    inAppEnabled: normalizeBooleanPreference(data, "inAppEnabled"),
    levelUpEnabled: normalizeBooleanPreference(data, "levelUpEnabled"),
    paymentDueEnabled: normalizeBooleanPreference(data, "paymentDueEnabled"),
    paydayEnabled: normalizeBooleanPreference(data, "paydayEnabled"),
    pushEnabled: normalizeBooleanPreference(data, "pushEnabled"),
    savingsGoalEnabled: normalizeBooleanPreference(data, "savingsGoalEnabled"),
    securityEnabled: normalizeBooleanPreference(data, "securityEnabled"),
    quietHoursEnd: normalizeTimeWindow(data.quietHoursEnd),
    quietHoursStart: normalizeTimeWindow(data.quietHoursStart),
    sensitiveFinancialTargetingConsent: false,
    timezone: data.timezone,
    updatedAt: data.updatedAt,
  };
}

function normalizeDevicePlatform(value: unknown): NotificationDevicePlatform {
  if (
    typeof value === "string" &&
    NOTIFICATION_DEVICE_PLATFORMS.has(value as NotificationDevicePlatform)
  ) {
    return value as NotificationDevicePlatform;
  }
  return invalidNotificationsResponse();
}

function normalizeDeviceStatus(value: unknown): NotificationDeviceStatus {
  if (
    typeof value === "string" &&
    NOTIFICATION_DEVICE_STATUSES.has(value as NotificationDeviceStatus)
  ) {
    return value as NotificationDeviceStatus;
  }
  return invalidNotificationsResponse();
}

function normalizePushTokenPreview(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== "string" ||
    containsRawSensitiveText(value) ||
    /\b(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]{8,}\]/u.test(value)
  ) {
    return invalidNotificationsResponse();
  }
  return value;
}

function normalizeNotificationDevice(value: unknown): NotificationDevice {
  if (!isRecord(value)) {
    return invalidNotificationsResponse();
  }
  if (
    typeof value.deviceId !== "string" ||
    !isSafeDeviceId(value.deviceId) ||
    value.pushTokenHashOnly !== true ||
    "pushToken" in value ||
    !isIsoTimestamp(value.registeredAt) ||
    !isIsoTimestamp(value.updatedAt)
  ) {
    return invalidNotificationsResponse();
  }

  return {
    deviceId: value.deviceId.trim(),
    platform: normalizeDevicePlatform(value.platform),
    pushTokenHashOnly: true,
    pushTokenPreview: normalizePushTokenPreview(value.pushTokenPreview),
    status: normalizeDeviceStatus(value.status),
    registeredAt: value.registeredAt,
    updatedAt: value.updatedAt,
    revokedAt: normalizeNullableTimestamp(value.revokedAt),
  };
}

function normalizeNotificationDevices(
  value: unknown,
): readonly NotificationDevice[] {
  if (!isRecord(value)) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  const rawDevices = Array.isArray(value.data)
    ? value.data
    : isRecord(value.data) && Array.isArray(value.data.items)
      ? value.data.items
      : null;
  if (!rawDevices) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  return rawDevices.map(normalizeNotificationDevice);
}

function validPreferenceUpdate(
  request: NotificationPreferencesUpdateRequest,
): boolean {
  if (!isRecord(request) || Object.keys(request).length === 0) return false;
  for (const [key, value] of Object.entries(request)) {
    if (PREFERENCE_BOOLEAN_KEYS.includes(key as never)) {
      if (typeof value !== "boolean") return false;
      continue;
    }
    if (key === "quietHoursStart" || key === "quietHoursEnd") {
      if (value !== null && !normalizeTimeWindow(value)) return false;
      continue;
    }
    if (key === "timezone") {
      if (!isSafeTimezone(value)) return false;
      continue;
    }
    return false;
  }
  return true;
}

function validRegistrationRequest(
  request: NotificationDeviceRegistrationRequest,
): boolean {
  const record = request as Record<string, unknown>;
  const optionalSafeText = (
    value: string | null | undefined,
    maxLength: number,
  ): boolean =>
    value === undefined ||
    value === null ||
    (typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= maxLength &&
      !containsRawSensitiveText(value));

  return (
    isRecord(request) &&
    hasOnlyKeys(record, [
      "appVersion",
      "deviceId",
      "locale",
      "platform",
      "pushToken",
    ]) &&
    typeof request.deviceId === "string" &&
    /^[A-Za-z0-9_.:-]+$/u.test(request.deviceId) &&
    NOTIFICATION_DEVICE_PLATFORMS.has(request.platform) &&
    typeof request.pushToken === "string" &&
    request.pushToken.trim().length > 0 &&
    request.pushToken.length <= 500 &&
    optionalSafeText(request.appVersion, 80) &&
    optionalSafeText(request.locale, 40)
  );
}

function normalizeRegistrationDevicePlatform(
  value: unknown,
): NotificationDevicePlatform | null {
  if (typeof value !== "string") return null;
  const platform = value.trim().toUpperCase();
  if (
    NOTIFICATION_DEVICE_PLATFORMS.has(platform as NotificationDevicePlatform)
  ) {
    return platform as NotificationDevicePlatform;
  }
  return null;
}

function normalizeRegistrationRequest(
  request: NotificationDeviceRegistrationRequest,
): NotificationDeviceRegistrationRequest | null {
  if (!isRecord(request)) return null;
  if (
    !hasOnlyKeys(request as Record<string, unknown>, [
      "appVersion",
      "deviceId",
      "locale",
      "platform",
      "pushToken",
    ])
  ) {
    return null;
  }
  const platform = normalizeRegistrationDevicePlatform(request.platform);
  if (!platform) return null;
  const normalizedRequest = {
    ...(request.appVersion !== undefined
      ? { appVersion: request.appVersion }
      : {}),
    deviceId: request.deviceId,
    ...(request.locale !== undefined ? { locale: request.locale } : {}),
    platform,
    pushToken: request.pushToken,
  } as NotificationDeviceRegistrationRequest;
  return validRegistrationRequest(normalizedRequest) ? normalizedRequest : null;
}

function notificationResourcePath(notificationId: string): string {
  const normalized = notificationId.trim();
  if (
    !/^[A-Za-z0-9_-]+$/u.test(normalized) ||
    normalized.length < 3 ||
    normalized.length > 160
  ) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_ID",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  return `${NOTIFICATIONS_PATH}/${encodeURIComponent(normalized)}`;
}

function notificationPath(
  notificationId: string,
  action: "archive" | "read",
): string {
  return `${notificationResourcePath(notificationId)}/${action}`;
}

function notificationDevicePath(deviceId: string): string {
  const normalized = deviceId.trim();
  if (
    !/^[A-Za-z0-9_.:-]+$/u.test(normalized) ||
    normalized.length < 3 ||
    normalized.length > 160
  ) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_DEVICE_ID",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  return `${NOTIFICATIONS_DEVICES_PATH}/${encodeURIComponent(normalized)}`;
}

function normalizeListOptions(options: {
  readonly page?: number;
  readonly pageSize?: number;
  readonly status?: NotificationStatus;
}): {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: NotificationStatus;
} {
  if (
    !hasOnlyKeys(options as Record<string, unknown>, [
      "page",
      "pageSize",
      "status",
    ])
  ) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_LIST_OPTIONS",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 10_000 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    (options.status !== undefined && !NOTIFICATION_STATUSES.has(options.status))
  ) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_LIST_OPTIONS",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  return options.status === undefined
    ? { page, pageSize }
    : { page, pageSize, status: options.status };
}

export function createNotificationsApi(
  options: NotificationsApiOptions,
): NotificationsApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetcher = options.fetcher ?? fetch;
  const createCorrelationId =
    options.createCorrelationId ?? defaultCorrelationId;

  async function request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const method = init.method ?? "GET";
    const correlationId = createCorrelationId();
    const headers = new Headers({
      accept: "application/json",
      "x-client-platform": options.platform,
      "x-correlation-id": correlationId,
      ...PRIVACY_HEADERS,
    });
    if (method.toUpperCase() !== "GET") {
      headers.set(
        "x-idempotency-key",
        notificationsIdempotencyKey(correlationId, method),
      );
    }
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
      throw new NotificationsApiError(
        0,
        "NOTIFICATION_NETWORK_ERROR",
        NOTIFICATIONS_SAFE_ERROR_MESSAGE,
      );
    }

    const parsed = await parseJson(response);
    if (!response.ok) {
      throw new NotificationsApiError(
        response.status,
        errorCode(parsed),
        NOTIFICATIONS_SAFE_ERROR_MESSAGE,
      );
    }
    return parsed;
  }

  return {
    async list(options = {}): Promise<NotificationListResult> {
      const { page, pageSize, status } = normalizeListOptions(options);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (status) params.set("status", status);
      return normalizeListResult(
        await request(`${NOTIFICATIONS_PATH}?${params}`),
      );
    },

    async unreadCount(): Promise<NotificationUnreadCount> {
      return normalizeUnreadCount(
        await request(NOTIFICATIONS_UNREAD_COUNT_PATH),
      );
    },

    async markRead(notificationId: string): Promise<NotificationItem> {
      const result = await request(notificationPath(notificationId, "read"), {
        method: "POST",
      });
      if (!isRecord(result) || !("data" in result)) {
        throw new NotificationsApiError(
          0,
          "NOTIFICATION_INVALID_RESPONSE",
          NOTIFICATIONS_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeNotificationItem(result.data);
    },

    async archive(notificationId: string): Promise<NotificationItem> {
      const result = await request(
        notificationPath(notificationId, "archive"),
        {
          method: "POST",
        },
      );
      if (!isRecord(result) || !("data" in result)) {
        throw new NotificationsApiError(
          0,
          "NOTIFICATION_INVALID_RESPONSE",
          NOTIFICATIONS_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeNotificationItem(result.data);
    },

    async delete(notificationId: string): Promise<NotificationItem> {
      const result = await request(notificationResourcePath(notificationId), {
        method: "DELETE",
      });
      if (!isRecord(result) || !("data" in result)) {
        throw new NotificationsApiError(
          0,
          "NOTIFICATION_INVALID_RESPONSE",
          NOTIFICATIONS_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeNotificationItem(result.data);
    },

    async markAllRead(): Promise<NotificationReadAllResult> {
      return normalizeReadAllResult(
        await request(NOTIFICATIONS_READ_ALL_PATH, { method: "POST" }),
      );
    },

    async getPreferences(): Promise<NotificationPreferences> {
      return normalizePreferences(
        await request(NOTIFICATIONS_PREFERENCES_PATH),
      );
    },

    async updatePreferences(
      preferencesRequest: NotificationPreferencesUpdateRequest,
    ): Promise<NotificationPreferences> {
      if (!validPreferenceUpdate(preferencesRequest)) {
        throw new NotificationsApiError(
          0,
          "NOTIFICATION_INVALID_PREFERENCES_UPDATE",
          NOTIFICATIONS_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizePreferences(
        await request(NOTIFICATIONS_PREFERENCES_PATH, {
          method: "PATCH",
          body: JSON.stringify(preferencesRequest),
        }),
      );
    },

    async listDevices(): Promise<readonly NotificationDevice[]> {
      return normalizeNotificationDevices(
        await request(NOTIFICATIONS_DEVICES_PATH),
      );
    },

    async registerDevice(
      registrationRequest: NotificationDeviceRegistrationRequest,
    ): Promise<NotificationDevice> {
      const normalizedRegistrationRequest =
        normalizeRegistrationRequest(registrationRequest);
      if (!normalizedRegistrationRequest) {
        throw new NotificationsApiError(
          0,
          "NOTIFICATION_INVALID_DEVICE_REGISTRATION",
          NOTIFICATIONS_SAFE_ERROR_MESSAGE,
        );
      }
      const result = await request(NOTIFICATIONS_DEVICES_PATH, {
        method: "POST",
        body: JSON.stringify(normalizedRegistrationRequest),
      });
      if (!isRecord(result) || !("data" in result)) {
        throw new NotificationsApiError(
          0,
          "NOTIFICATION_INVALID_RESPONSE",
          NOTIFICATIONS_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeNotificationDevice(result.data);
    },

    async revokeDevice(deviceId: string): Promise<NotificationDevice> {
      const result = await request(notificationDevicePath(deviceId), {
        method: "DELETE",
      });
      if (!isRecord(result) || !("data" in result)) {
        throw new NotificationsApiError(
          0,
          "NOTIFICATION_INVALID_RESPONSE",
          NOTIFICATIONS_SAFE_ERROR_MESSAGE,
        );
      }
      return normalizeNotificationDevice(result.data);
    },
  };
}
