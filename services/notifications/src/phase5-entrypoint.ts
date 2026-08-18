/**
 * PHASE 5 notifications worker entrypoint.
 *
 * This wrapper preserves the proven FCM worker while enforcing the v2.0 queue
 * event envelope at the consumer boundary. Legacy messages are normalized for
 * a staged migration, and known notification types are reconciled to current
 * Expo Router production deep links before FCM dispatch.
 */

import baseWorker, {
  type NotificationQueueMessage,
  type NotificationsEnv,
  type QueueBatchLike,
  type QueueMessageLike,
  type ScheduledControllerLike,
  type WorkerExecutionContext,
} from "./index";
import {
  assertNotificationQueueEnvelope,
  queueEnvelopeFromLegacyMessage,
  withNotificationQueueEnvelope,
} from "./queue-envelope";
import {
  isCanonicalNotificationDeeplink,
  notificationDeeplinkFor,
  type NotificationDeeplinkType,
} from "./deeplink-contract";

export const PHASE5_NOTIFICATIONS_ENTRYPOINT_VERSION = "1.0.0";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function primitiveParams(
  value: unknown,
): Readonly<Record<string, string | number | boolean | null>> {
  const source = record(value);
  if (!source) return {};
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(source)) {
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      result[key] = item;
    }
  }
  return result;
}

function canonicalizeDeeplink(
  message: Record<string, unknown>,
): Record<string, unknown> {
  const payload = record(message.payload);
  const data = record(payload?.data);
  const type = typeof data?.type === "string" ? data.type : null;
  if (!payload || !data || !type) return message;

  const supported = new Set<NotificationDeeplinkType>([
    "PAYDAY",
    "FIXED_PAYMENT_DUE",
    "SAVINGS_DUE",
    "BUDGET_OVER",
    "BUDGET_REMAINING",
    "HIJACK_GOAL",
    "GROWTH_TASK",
    "GROWTH_LEVEL_UP",
    "COMMUNITY_COMMENT",
    "COMMUNITY_REACTION",
    "NOTICE",
    "SECURITY",
    "SYSTEM",
  ]);
  if (!supported.has(type as NotificationDeeplinkType)) return message;

  const notificationType = type as NotificationDeeplinkType;
  const routeParams = primitiveParams(data.routeParams);
  const target = notificationDeeplinkFor(notificationType, routeParams);
  const existing = typeof data.deeplink === "string" ? data.deeplink : "";
  if (
    data.targetScreen === target.targetScreen &&
    isCanonicalNotificationDeeplink(notificationType, existing)
  ) {
    return message;
  }

  return {
    ...message,
    payload: {
      ...payload,
      data: {
        ...data,
        targetScreen: target.targetScreen,
        deeplink: target.deeplink,
      },
    },
  };
}

function normalizeQueueBody(body: NotificationQueueMessage): NotificationQueueMessage {
  const source = canonicalizeDeeplink(body as unknown as Record<string, unknown>);
  try {
    assertNotificationQueueEnvelope(source);
    return source as unknown as NotificationQueueMessage;
  } catch {
    const envelope = queueEnvelopeFromLegacyMessage(source);
    return withNotificationQueueEnvelope(source, envelope) as unknown as NotificationQueueMessage;
  }
}

function normalizeBatch(
  batch: QueueBatchLike<NotificationQueueMessage>,
): QueueBatchLike<NotificationQueueMessage> {
  return {
    queue: batch.queue,
    messages: batch.messages.map(
      (message): QueueMessageLike<NotificationQueueMessage> => ({
        ...message,
        body: normalizeQueueBody(message.body),
      }),
    ),
  };
}

export async function fetch(
  request: Request,
  env: NotificationsEnv,
  context: WorkerExecutionContext,
): Promise<Response> {
  return baseWorker.fetch(request, env, context);
}

export async function scheduled(
  controller: ScheduledControllerLike,
  env: NotificationsEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  return baseWorker.scheduled(controller, env, context);
}

export async function queue(
  batch: QueueBatchLike<NotificationQueueMessage>,
  env: NotificationsEnv,
  context: WorkerExecutionContext,
): Promise<void> {
  return baseWorker.queue(normalizeBatch(batch), env, context);
}

export const phase5NotificationsEntrypointManifest = Object.freeze({
  version: PHASE5_NOTIFICATIONS_ENTRYPOINT_VERSION,
  baseEntrypoint: "services/notifications/src/index.ts",
  activeEntrypoint: "services/notifications/src/phase5-entrypoint.ts",
  legacyQueueMigrationSupported: true,
  queueEnvelopeEnforcedAtConsumerBoundary: true,
  deeplinkCanonicalizationEnabled: true,
  rawFinancialDataAdded: false,
  rawPushTokenAdded: false,
  requirementRefs: Object.freeze(["NOTI-009", "NOTI-010", "OPS-003"]),
});

const worker = Object.freeze({ fetch, scheduled, queue });
export default worker;
