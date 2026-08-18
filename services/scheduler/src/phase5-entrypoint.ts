/**
 * PHASE 5 scheduler entrypoint.
 *
 * This is a compatibility wrapper around the proven scheduler implementation.
 * It decorates every outbound Cloudflare Queue binding with the v2.0 queue
 * event envelope before delegating to the existing worker. The wrapper also
 * normalizes known notification deep links to current Expo Router production
 * routes. No domain calculation or scheduler policy is duplicated here.
 */

import baseWorker, {
  type SchedulerEnv,
  type SchedulerExecutionContext,
  type SchedulerMessageBatch,
  type SchedulerScheduledController,
} from "./index";
import {
  phase5NotificationContractManifest,
  wrapPhase5QueueBinding,
} from "./phase5-notification-contract";

export const PHASE5_SCHEDULER_ENTRYPOINT_VERSION = "1.0.0";

function phase5Env(env: SchedulerEnv): SchedulerEnv {
  const notifications = wrapPhase5QueueBinding(env.NOTIFICATIONS_RETRY_QUEUE);
  const growth = wrapPhase5QueueBinding(env.GROWTH_EVENTS_QUEUE);
  const operations = wrapPhase5QueueBinding(env.SCHEDULER_OPERATION_QUEUE);

  return {
    ...env,
    ...(notifications ? { NOTIFICATIONS_RETRY_QUEUE: notifications } : {}),
    ...(growth ? { GROWTH_EVENTS_QUEUE: growth } : {}),
    ...(operations ? { SCHEDULER_OPERATION_QUEUE: operations } : {}),
  };
}

export async function fetch(
  request: Request,
  env: SchedulerEnv,
  context: SchedulerExecutionContext,
): Promise<Response> {
  return baseWorker.fetch(request, phase5Env(env), context);
}

export async function scheduled(
  controller: SchedulerScheduledController,
  env: SchedulerEnv,
  context: SchedulerExecutionContext,
): Promise<void> {
  return baseWorker.scheduled(controller, phase5Env(env), context);
}

export async function queue(
  batch: SchedulerMessageBatch,
  env: SchedulerEnv,
  context: SchedulerExecutionContext,
): Promise<void> {
  return baseWorker.queue(batch, phase5Env(env), context);
}

export const phase5SchedulerEntrypointManifest = Object.freeze({
  version: PHASE5_SCHEDULER_ENTRYPOINT_VERSION,
  baseEntrypoint: "services/scheduler/src/index.ts",
  activeEntrypoint: "services/scheduler/src/phase5-entrypoint.ts",
  outboundQueueEnvelope: phase5NotificationContractManifest,
  domainCalculationDuplicated: false,
  productionDestructiveBehaviorAdded: false,
  requirementRefs: Object.freeze([
    "NOTI-004",
    "NOTI-005",
    "NOTI-009",
    "NOTI-010",
    "OPS-003",
  ]),
});

const worker = Object.freeze({ fetch, scheduled, queue });
export default worker;
