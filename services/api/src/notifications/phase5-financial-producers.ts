import {
  createNeonNotificationsRepository,
  shouldUseNeonNotificationsRepository,
} from "../repositories/notifications.repository";
import type {
  NotificationCreateInput,
  NotificationsRepository,
  NotificationsRouteRuntime,
  WaitUntilCapable,
} from "../routes/notifications.routes";
import type { SavingsEvent } from "../routes/savings.routes";
import type { VariableExpenseEvent } from "../routes/variable-expenses.routes";

export interface Phase5FinancialProducerResult {
  readonly produced: number;
  readonly skipped: number;
  readonly reasons: readonly string[];
}

export interface Phase5FinancialNotificationProducerOptions<TEnv = unknown> {
  readonly repository?:
    | NotificationsRepository<TEnv>
    | ((env: TEnv) => NotificationsRepository<TEnv> | null | undefined);
  readonly now?: () => Date;
}

type AnyRecord = Record<string, unknown>;

function record(value: unknown): AnyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateText(value: unknown, fallback: string): string {
  const candidate = text(value);
  return candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate)
    ? candidate
    : fallback;
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
  options: Phase5FinancialNotificationProducerOptions<TEnv>,
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
  event:
    | Pick<VariableExpenseEvent, "requestId" | "userId" | "path">
    | Pick<SavingsEvent, "requestId" | "userId" | "path">,
  env: TEnv,
  context: WaitUntilCapable,
  repository: NotificationsRepository<TEnv>,
  now: Date,
): NotificationsRouteRuntime<TEnv> {
  const path = "/api/v1/notifications";
  return {
    request: new Request("https://phase5.internal/api/v1/notifications", {
      method: "POST",
      headers: { "x-request-id": event.requestId },
    }),
    env,
    execution: context,
    url: new URL("https://phase5.internal/api/v1/notifications"),
    path,
    relativePath: "/",
    method: "POST",
    requestId: event.requestId,
    now,
    principal: {
      userId: event.userId,
      roles: ["SYSTEM"],
      permissions: ["notifications:produce"],
      policyId: "phase5-financial-producer",
    },
    repository,
  };
}

function createBudgetThresholdInput(
  event: VariableExpenseEvent,
  now: Date,
): NotificationCreateInput | null {
  if (event.event !== "variable_expense_budget_impact_calculated") return null;
  const impact = record(event.budgetImpact);
  if (!impact) return null;
  const total = numberValue(impact.dailyBudgetTotalMinor);
  const actual = numberValue(impact.actualVariableExpenseTotalMinor);
  const remaining = numberValue(impact.dailyBudgetRemainingMinor);
  const ratio =
    total && total > 0 && actual !== null ? actual / total : null;
  const exceeded = impact.overDailyBudget === true || (remaining ?? 0) < 0;
  const warning = !exceeded && ratio !== null && ratio >= 0.8;
  if (!exceeded && !warning) return null;
  const threshold = exceeded ? "EXCEEDED" : "WARNING_80";
  const periodEndDate = dateText(impact.periodEndDate, today(now));
  return {
    type: exceeded ? "BUDGET_EXCEEDED" : "BUDGET_WARNING",
    title: exceeded ? "일일 예산 초과" : "일일 예산 80% 사용",
    message: "예산 상태가 변경되었습니다. 앱에서 현재 예산을 확인하세요.",
    priority: exceeded ? "URGENT" : "HIGH",
    channels: ["IN_APP"],
    deeplink: "salaryhijacking://salary",
    scheduledAt: null,
    expiresAt: null,
    metadata: {
      idempotencyKey: `budget-threshold:${periodEndDate}:${threshold}`,
      producer: "phase5-financial-producer",
      sourceEvent: event.event,
      threshold,
      periodEndDate,
      expenseId: text(event.expenseId),
      rawFinancialPayloadIncluded: false,
    },
  };
}

function savingSnapshot(event: SavingsEvent): AnyRecord | null {
  return record(event.goalSnapshot);
}

function isActiveSaving(snapshot: AnyRecord): boolean {
  const status = String(snapshot.status ?? "ACTIVE").toUpperCase();
  return !["PAUSED", "ARCHIVED", "DELETED", "CANCELLED"].includes(status);
}

function createSavingDueInput(
  event: SavingsEvent,
  now: Date,
): NotificationCreateInput | null {
  if (
    ![
      "savings_goal_created",
      "savings_goal_updated",
      "savings_impact_calculated",
    ].includes(event.event)
  )
    return null;
  const snapshot = savingSnapshot(event);
  if (!snapshot || !isActiveSaving(snapshot)) return null;
  const fixed = numberValue(snapshot.fixedSaveAmountMinor) ?? 0;
  if (fixed <= 0) return null;
  const dueDate = dateText(
    snapshot.nextDueDate ?? snapshot.nextSaveDate ?? snapshot.startDate,
    today(now),
  );
  if (dueDate > today(now)) return null;
  const goalId = text(event.goalId) ?? text(snapshot.goalId) ?? "unknown";
  return {
    type: "SAVINGS_GOAL",
    title: "저축 예정일",
    message: "저축 예정일입니다. 앱에서 저축 계획을 확인하세요.",
    priority: "HIGH",
    channels: ["IN_APP"],
    deeplink: "salaryhijacking://plan",
    scheduledAt: null,
    expiresAt: null,
    metadata: {
      idempotencyKey: `saving-due:${goalId}:${dueDate}`,
      producer: "phase5-financial-producer",
      sourceEvent: event.event,
      reminderType: "SAVING_DUE",
      goalId,
      dueDate,
      rawFinancialPayloadIncluded: false,
    },
  };
}

function createSavingGoalInput(event: SavingsEvent): NotificationCreateInput | null {
  if (!["savings_goal_updated", "savings_transaction_recorded"].includes(event.event))
    return null;
  const snapshot = savingSnapshot(event);
  if (!snapshot) return null;
  const target = numberValue(snapshot.targetAmountMinor) ?? 0;
  const current = numberValue(snapshot.currentAmountMinor) ?? 0;
  const completionRate = numberValue(snapshot.completionRate);
  const completed =
    target > 0 && (current >= target || (completionRate ?? 0) >= 1);
  if (!completed) return null;
  const goalId = text(event.goalId) ?? text(snapshot.goalId) ?? "unknown";
  return {
    type: "SAVINGS_GOAL",
    title: "저축 목표 달성",
    message: "저축 목표를 달성했습니다. 앱에서 결과를 확인하세요.",
    priority: "NORMAL",
    channels: ["IN_APP"],
    deeplink: "salaryhijacking://salary",
    scheduledAt: null,
    expiresAt: null,
    metadata: {
      idempotencyKey: `saving-goal:${goalId}:first-hit`,
      producer: "phase5-financial-producer",
      sourceEvent: event.event,
      milestone: "FIRST_HIT_100",
      goalId,
      rawFinancialPayloadIncluded: false,
    },
  };
}

async function createMany<TEnv>(
  repository: NotificationsRepository<TEnv>,
  runtime: NotificationsRouteRuntime<TEnv>,
  inputs: readonly (NotificationCreateInput | null)[],
): Promise<Phase5FinancialProducerResult> {
  const reasons: string[] = [];
  let produced = 0;
  let skipped = 0;
  for (const input of inputs) {
    if (!input) {
      skipped += 1;
      continue;
    }
    try {
      await repository.create(input, runtime);
      produced += 1;
    } catch (error) {
      skipped += 1;
      reasons.push(error instanceof Error ? error.name : "UnknownError");
    }
  }
  return { produced, skipped, reasons };
}

export function createPhase5FinancialNotificationProducer<TEnv = unknown>(
  options: Phase5FinancialNotificationProducerOptions<TEnv> = {},
) {
  return Object.freeze({
    async handleVariableExpenseEvent(
      event: VariableExpenseEvent,
      env: TEnv,
      context: WaitUntilCapable,
    ): Promise<Phase5FinancialProducerResult> {
      const repository = resolveRepository(env, options);
      if (!repository) return { produced: 0, skipped: 1, reasons: ["NO_REPOSITORY"] };
      const now = options.now?.() ?? new Date();
      return createMany(repository, notificationRuntime(event, env, context, repository, now), [
        createBudgetThresholdInput(event, now),
      ]);
    },
    async handleSavingsEvent(
      event: SavingsEvent,
      env: TEnv,
      context: WaitUntilCapable,
    ): Promise<Phase5FinancialProducerResult> {
      const repository = resolveRepository(env, options);
      if (!repository) return { produced: 0, skipped: 2, reasons: ["NO_REPOSITORY"] };
      const now = options.now?.() ?? new Date();
      return createMany(repository, notificationRuntime(event, env, context, repository, now), [
        createSavingDueInput(event, now),
        createSavingGoalInput(event),
      ]);
    },
  });
}
