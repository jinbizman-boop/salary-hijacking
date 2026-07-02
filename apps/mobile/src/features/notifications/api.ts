import {
  NOTIFICATIONS_PATH,
  NOTIFICATIONS_READ_ALL_PATH,
  NOTIFICATIONS_SAFE_ERROR_MESSAGE,
  NOTIFICATIONS_UNREAD_COUNT_PATH,
} from "./constants";
import type {
  NotificationChannel,
  NotificationItem,
  NotificationListResult,
  NotificationPriority,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function defaultCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `notifications-${Date.now().toString(36)}`
  );
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

  const localHost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
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
  throw new NotificationsApiError(
    0,
    "NOTIFICATION_INVALID_RESPONSE",
    NOTIFICATIONS_SAFE_ERROR_MESSAGE,
  );
}

function normalizePriority(value: unknown): NotificationPriority {
  if (
    typeof value === "string" &&
    NOTIFICATION_PRIORITIES.has(value as NotificationPriority)
  ) {
    return value as NotificationPriority;
  }
  throw new NotificationsApiError(
    0,
    "NOTIFICATION_INVALID_RESPONSE",
    NOTIFICATIONS_SAFE_ERROR_MESSAGE,
  );
}

function normalizeStatus(value: unknown): NotificationStatus {
  if (
    typeof value === "string" &&
    NOTIFICATION_STATUSES.has(value as NotificationStatus)
  ) {
    return value as NotificationStatus;
  }
  throw new NotificationsApiError(
    0,
    "NOTIFICATION_INVALID_RESPONSE",
    NOTIFICATIONS_SAFE_ERROR_MESSAGE,
  );
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
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  return channels;
}

function normalizeNullableTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (isIsoTimestamp(value)) return value;
  throw new NotificationsApiError(
    0,
    "NOTIFICATION_INVALID_RESPONSE",
    NOTIFICATIONS_SAFE_ERROR_MESSAGE,
  );
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
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  if (
    typeof value.notificationId !== "string" ||
    !value.notificationId ||
    typeof value.title !== "string" ||
    !value.title ||
    typeof value.message !== "string" ||
    !isIsoTimestamp(value.createdAt) ||
    value.sensitiveFinancialDataExposed !== false ||
    value.adTargetingSeparated !== true
  ) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_RESPONSE",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }

  return {
    notificationId: value.notificationId,
    type: normalizeType(value.type),
    title: value.title,
    message: value.message,
    priority: normalizePriority(value.priority),
    channels: normalizeChannels(value.channels),
    deeplink: typeof value.deeplink === "string" ? value.deeplink : null,
    status: normalizeStatus(value.status),
    scheduledAt: normalizeNullableTimestamp(value.scheduledAt),
    expiresAt: normalizeNullableTimestamp(value.expiresAt),
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

function notificationPath(notificationId: string, action: "read"): string {
  if (!/^[A-Za-z0-9_-]+$/u.test(notificationId)) {
    throw new NotificationsApiError(
      0,
      "NOTIFICATION_INVALID_ID",
      NOTIFICATIONS_SAFE_ERROR_MESSAGE,
    );
  }
  return `${NOTIFICATIONS_PATH}/${encodeURIComponent(notificationId)}/${action}`;
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
      const page = options.page ?? 1;
      const pageSize = options.pageSize ?? 20;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (options.status) params.set("status", options.status);
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

    async markAllRead(): Promise<NotificationReadAllResult> {
      return normalizeReadAllResult(
        await request(NOTIFICATIONS_READ_ALL_PATH, { method: "POST" }),
      );
    },
  };
}
