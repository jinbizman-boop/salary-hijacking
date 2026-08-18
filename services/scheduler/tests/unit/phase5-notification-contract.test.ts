import { describe, expect, it, vi } from "vitest";
import {
  applyPhase5QueueContract,
  assertPhase5QueueEnvelope,
  wrapPhase5QueueBinding,
} from "../../src/phase5-notification-contract";

describe("scheduler Phase 5 queue contract", () => {
  it("adds the v2.0 queue envelope and normalizes PAYDAY to the real Expo route", () => {
    const message = applyPhase5QueueContract(
      {
        type: "FCM_SEND",
        requestId: "req_scheduler_phase5_0001",
        payload: {
          data: {
            type: "PAYDAY",
            idempotencyKey: "payday:user-1:cycle-1:PAYDAY",
            targetScreen: "payroll-home",
            deeplink: "salary-hijacking://payroll/payday/plan-1",
          },
        },
      },
      new Date("2026-08-18T11:30:00.000Z"),
    );

    expect(assertPhase5QueueEnvelope(message).schemaVersion).toBe("1.0");
    expect(message.correlationId).toBe("req_scheduler_phase5_0001");
    expect(message.idempotencyKey).toBe("payday:user-1:cycle-1:PAYDAY");
    expect(message.occurredAt).toBe("2026-08-18T11:30:00.000Z");
    expect(message.payload.data.targetScreen).toBe("salary-home");
    expect(message.payload.data.deeplink).toBe("salary-hijacking://salary");
  });

  it("derives a stable retry key for scheduler operation queue messages", () => {
    const message = applyPhase5QueueContract(
      {
        type: "RUN_JOB",
        job: "payday-reminder",
        action: "run",
        requestId: "req_scheduler_phase5_0002",
      },
      new Date("2026-08-18T11:31:00.000Z"),
    );

    expect(message.idempotencyKey).toBe(
      "scheduler:payday-reminder:run:req_scheduler_phase5_0002",
    );
    expect(message.correlationId).toBe("req_scheduler_phase5_0002");
  });

  it("decorates the actual queue binding before send", async () => {
    const send = vi.fn(async () => undefined);
    const wrapped = wrapPhase5QueueBinding({ send });
    expect(wrapped).toBeDefined();

    await wrapped?.send({
      eventType: "MONTHLY_HIJACK_CLOSED",
      requestId: "req_scheduler_phase5_0003",
      idempotencyKey: "growth:user-3:2026-08:closed",
    });

    expect(send).toHaveBeenCalledTimes(1);
    const sent = send.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sent.schemaVersion).toBe("1.0");
    expect(sent.correlationId).toBe("req_scheduler_phase5_0003");
    expect(sent.idempotencyKey).toBe("growth:user-3:2026-08:closed");
  });
});
