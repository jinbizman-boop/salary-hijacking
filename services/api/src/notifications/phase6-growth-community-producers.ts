import {
  createNeonNotificationsRepository,
  shouldUseNeonNotificationsRepository,
} from "../repositories/notifications.repository";
import type { CommunitySecurityEvent } from "../routes/community.routes";
import type { GrowthEvent } from "../routes/growth.routes";
import type {
  NotificationCreateInput,
  NotificationsRepository,
  NotificationsRouteRuntime,
  WaitUntilCapable,
} from "../routes/notifications.routes";

export interface Phase6GrowthCommunityProducerResult {
  readonly produced: number;
  readonly skipped: number;
  readonly reasons: readonly string[];
}

export interface Phase6CommunityEvent extends CommunitySecurityEvent {
  readonly recipientUserId?: string | null | undefined;
  readonly parentPostId?: string | null | undefined;
}

export interface Phase6GrowthCommunityNotificationProducerOptions<
  TEnv = unknown,
> {
  readonly repository?:
    | NotificationsRepository<TEnv>
    | ((env: TEnv) => NotificationsRepository<TEnv> | null | undefined);
  readonly now?: () => Date;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function today(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function resolveRepository<TEnv>(
  env: TEnv,
  options: Phase6GrowthCommunityNotificationProducerOptions<TEnv>,
): NotificationsRepository<TEnv> | null {
  const configured =
    typeof options.repository === "function"
      ? options.repository(env)
      : options.repository;
  if (configured) return configured;
  return shouldUseNeonNotificationsRepository(env)
    ? createNeonNotificationsRepository<TEnv>()
    : null;
}

function notificationRuntime<TEnv>(
  event: Pick<GrowthEvent, "requestId" | "userId" | "path">,
  env: TEnv,
  context: WaitUntilCapable,
  repository: NotificationsRepository<TEnv>,
  now: Date,
): NotificationsRouteRuntime<TEnv> {
  return {
    request: new Request("https://phase6.internal/api/v1/notifications", {
      method: "POST",
      headers: { "x-request-id": event.requestId },
    }),
    env,
    execution: context,
    url: new URL("https://phase6.internal/api/v1/notifications"),
    path: "/api/v1/notifications",
    relativePath: "/",
    method: "POST",
    requestId: event.requestId,
    now,
    principal: {
      userId: event.userId,
      roles: ["SYSTEM"],
      permissions: ["notifications:produce"],
      policyId: "phase6-growth-community-producer",
    },
    repository,
  };
}

function growthDeeplink(event: GrowthEvent): string {
  const targetId = text(event.targetId);
  if (event.targetType === "CONTENT" && targetId)
    return `salaryhijacking://level/content/${encodeURIComponent(targetId)}`;
  if (event.targetType === "TASK" && targetId)
    return `salaryhijacking://level/task/${encodeURIComponent(targetId)}`;
  return "salaryhijacking://level";
}

function createGrowthInput(
  event: GrowthEvent,
  now: Date,
): NotificationCreateInput | null {
  if (
    ![
      "growth_task_progress",
      "growth_challenge_completed",
      "growth_content_completed",
    ].includes(event.event)
  )
    return null;
  if (event.expDelta <= 0) return null;
  const targetId = text(event.targetId) ?? "unknown";
  return {
    type: "GROWTH_REMINDER",
    title: "LV UP 완료",
    message: "성장 활동이 기록되었습니다. 앱에서 진행 상황을 확인하세요.",
    priority: "NORMAL",
    channels: ["IN_APP"],
    deeplink: growthDeeplink(event),
    scheduledAt: null,
    expiresAt: null,
    metadata: {
      idempotencyKey: `growth-completion:${event.targetType}:${targetId}:${today(now)}`,
      producer: "phase6-growth-community-producer",
      sourceEvent: event.event,
      targetType: event.targetType,
      targetId,
      expAwarded: event.expDelta > 0,
      rawFinancialPayloadIncluded: false,
      rawPersonalDataIncluded: false,
    },
  };
}

function communityDeeplink(event: Phase6CommunityEvent): string {
  const postId = text(event.parentPostId) ?? text(event.targetId);
  return postId
    ? `salaryhijacking://community/post/${encodeURIComponent(postId)}`
    : "salaryhijacking://community";
}

function createCommunityInput(
  event: Phase6CommunityEvent,
): NotificationCreateInput | null {
  if (
    ![
      "community_comment_created",
      "community_post_reacted",
      "community_comment_reacted",
      "community_report_created",
    ].includes(event.event)
  )
    return null;
  const recipientUserId = text(event.recipientUserId);
  if (!recipientUserId) return null;
  if (recipientUserId === event.userId) return null;
  const targetId = text(event.targetId) ?? "unknown";
  return {
    type: "COMMUNITY",
    title: "커뮤니티 활동",
    message: "커뮤니티에서 새 활동이 있습니다.",
    priority: "NORMAL",
    channels: ["IN_APP"],
    deeplink: communityDeeplink(event),
    scheduledAt: null,
    expiresAt: null,
    metadata: {
      idempotencyKey: `community-activity:${event.event}:${targetId}:${recipientUserId}`,
      producer: "phase6-growth-community-producer",
      sourceEvent: event.event,
      targetType: event.targetType,
      targetId,
      rawFinancialPayloadIncluded: false,
      rawPersonalDataIncluded: false,
    },
  };
}

async function createOne<TEnv>(
  repository: NotificationsRepository<TEnv>,
  runtime: NotificationsRouteRuntime<TEnv>,
  input: NotificationCreateInput | null,
  emptyReason: string,
): Promise<Phase6GrowthCommunityProducerResult> {
  if (!input) return { produced: 0, skipped: 1, reasons: [emptyReason] };
  try {
    await repository.create(input, runtime);
    return { produced: 1, skipped: 0, reasons: [] };
  } catch (error) {
    return {
      produced: 0,
      skipped: 1,
      reasons: [error instanceof Error ? error.name : "UnknownError"],
    };
  }
}

export function createPhase6GrowthCommunityNotificationProducer<
  TEnv = unknown,
>(
  options: Phase6GrowthCommunityNotificationProducerOptions<TEnv> = {},
) {
  return Object.freeze({
    async handleGrowthEvent(
      event: GrowthEvent,
      env: TEnv,
      context: WaitUntilCapable,
    ): Promise<Phase6GrowthCommunityProducerResult> {
      const repository = resolveRepository(env, options);
      if (!repository)
        return { produced: 0, skipped: 1, reasons: ["NO_REPOSITORY"] };
      const now = options.now?.() ?? new Date();
      return createOne(
        repository,
        notificationRuntime(event, env, context, repository, now),
        createGrowthInput(event, now),
        "NO_GROWTH_NOTIFICATION",
      );
    },
    async handleCommunityEvent(
      event: Phase6CommunityEvent,
      env: TEnv,
      context: WaitUntilCapable,
    ): Promise<Phase6GrowthCommunityProducerResult> {
      if (event.recipientUserId && event.recipientUserId === event.userId)
        return { produced: 0, skipped: 1, reasons: ["SELF_NOTIFICATION"] };
      const repository = resolveRepository(env, options);
      if (!repository)
        return { produced: 0, skipped: 1, reasons: ["NO_REPOSITORY"] };
      const recipientUserId = text(event.recipientUserId);
      if (!recipientUserId)
        return { produced: 0, skipped: 1, reasons: ["NO_RECIPIENT"] };
      const now = options.now?.() ?? new Date();
      return createOne(
        repository,
        notificationRuntime(
          { ...event, userId: recipientUserId },
          env,
          context,
          repository,
          now,
        ),
        createCommunityInput(event),
        "NO_COMMUNITY_NOTIFICATION",
      );
    },
  });
}
