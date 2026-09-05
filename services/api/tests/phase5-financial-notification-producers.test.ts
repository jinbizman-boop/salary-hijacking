import { describe, expect, it } from "vitest";
import { createPhase5FinancialNotificationProducer } from "../src/notifications/phase5-financial-producers";
import type {
  NotificationCreateInput,
  NotificationsRepository,
  NotificationsRouteRuntime,
} from "../src/routes/notifications.routes";
import type { SavingsEvent } from "../src/routes/savings.routes";
import type { VariableExpenseEvent } from "../src/routes/variable-expenses.routes";

const userId = "11111111-1111-4111-8111-111111111111";

function captureRepository() {
  const created: NotificationCreateInput[] = [];
  const repository: NotificationsRepository<unknown> = {
    name: "capture-notifications-repository",
    async list() {
      throw new Error("unused");
    },
    async get() {
      return null;
    },
    async create(input) {
      created.push(input);
      return {
        notificationId: `noti-${created.length}`,
        type: input.type,
        createdAt: "2026-08-18T00:00:00.000Z",
      };
    },
    async markRead() {
      throw new Error("unused");
    },
    async markAllRead() {
      throw new Error("unused");
    },
    async archive() {
      throw new Error("unused");
    },
    async delete() {
      throw new Error("unused");
    },
    async getPreferences() {
      throw new Error("unused");
    },
    async updatePreferences() {
      throw new Error("unused");
    },
    async registerDevice() {
      throw new Error("unused");
    },
    async revokeDevice() {
      throw new Error("unused");
    },
    async listDevices() {
      throw new Error("unused");
    },
    async test() {
      throw new Error("unused");
    },
    async previewRules() {
      throw new Error("unused");
    },
    async unreadCount() {
      throw new Error("unused");
    },
  };
  return { created, repository };
}

function variableEvent(
  budgetImpact: VariableExpenseEvent["budgetImpact"],
): VariableExpenseEvent {
  return {
    event: "variable_expense_budget_impact_calculated",
    requestId: "phase5-producer-test",
    userId,
    expenseId: "expense-1",
    path: "/api/v1/variable-expenses/impact",
    createdAt: "2026-08-18T00:00:00.000Z",
    budgetImpact,
  };
}

function savingsEvent(
  event: SavingsEvent["event"],
  goalSnapshot: SavingsEvent["goalSnapshot"],
): SavingsEvent {
  return {
    event,
    requestId: "phase5-savings-producer-test",
    userId,
    goalId: "goal-1",
    path: "/api/v1/savings/goal-1",
    createdAt: "2026-08-18T00:00:00.000Z",
    goalSnapshot,
  };
}

describe("Phase 5 financial notification producers", () => {
  it("creates a budget warning from server-computed impact without trusting client threshold flags", async () => {
    const { created, repository } = captureRepository();
    const producer = createPhase5FinancialNotificationProducer({
      repository,
      now: () => new Date("2026-08-18T00:00:00.000Z"),
    });

    const result = await producer.handleVariableExpenseEvent(
      variableEvent({
        periodEndDate: "2026-08-18",
        dailyBudgetTotalMinor: 100_000,
        actualVariableExpenseTotalMinor: 82_000,
        dailyBudgetRemainingMinor: 18_000,
        thresholdCrossed: false,
      }),
      {},
      {},
    );

    expect(result.produced).toBe(1);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      type: "BUDGET_WARNING",
      priority: "HIGH",
      deeplink: "salaryhijacking://salary",
    });
    expect(created[0]?.metadata.idempotencyKey).toBe(
      "budget-threshold:2026-08-18:WARNING_80",
    );
    expect(JSON.stringify(created[0])).not.toContain("82000");
    expect(JSON.stringify(created[0])).not.toContain("100000");
  });

  it("creates exactly one exceeded notification for server-authoritative overspend", async () => {
    const { created, repository } = captureRepository();
    const producer = createPhase5FinancialNotificationProducer({
      repository,
      now: () => new Date("2026-08-18T00:00:00.000Z"),
    });

    await producer.handleVariableExpenseEvent(
      variableEvent({
        periodEndDate: "2026-08-18",
        dailyBudgetTotalMinor: 100_000,
        actualVariableExpenseTotalMinor: 120_000,
        dailyBudgetRemainingMinor: -20_000,
      }),
      {},
      {},
    );

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ type: "BUDGET_EXCEEDED" });
    expect(created[0]?.metadata.idempotencyKey).toBe(
      "budget-threshold:2026-08-18:EXCEEDED",
    );
  });

  it("produces saving due and first-hit goal notifications with distinct dedupe keys", async () => {
    const { created, repository } = captureRepository();
    const producer = createPhase5FinancialNotificationProducer({
      repository,
      now: () => new Date("2026-08-18T00:00:00.000Z"),
    });

    await producer.handleSavingsEvent(
      savingsEvent("savings_goal_updated", {
        goalId: "goal-1",
        status: "ACTIVE",
        fixedSaveAmountMinor: 30_000,
        nextDueDate: "2026-08-18",
        targetAmountMinor: 100_000,
        currentAmountMinor: 100_000,
        completionRate: 1,
      }),
      {},
      {},
    );

    expect(created).toHaveLength(2);
    expect(created.map((item) => item.metadata.idempotencyKey)).toEqual([
      "saving-due:goal-1:2026-08-18",
      "saving-goal:goal-1:first-hit",
    ]);
    expect(created.every((item) => item.type === "SAVINGS_GOAL")).toBe(true);
    expect(JSON.stringify(created)).not.toContain("30000");
    expect(JSON.stringify(created)).not.toContain("100000");
  });

  it("skips inactive or future saving plans", async () => {
    const { created, repository } = captureRepository();
    const producer = createPhase5FinancialNotificationProducer({
      repository,
      now: () => new Date("2026-08-18T00:00:00.000Z"),
    });

    const result = await producer.handleSavingsEvent(
      savingsEvent("savings_goal_updated", {
        goalId: "goal-1",
        status: "PAUSED",
        fixedSaveAmountMinor: 30_000,
        nextDueDate: "2026-08-19",
      }),
      {},
      {},
    );

    expect(result.produced).toBe(0);
    expect(created).toHaveLength(0);
  });
});
