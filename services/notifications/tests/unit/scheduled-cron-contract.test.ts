import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetch, queue, scheduled } from "../../src/index";

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(currentDir, "../../src/index.ts"), "utf8");

interface ScheduledDetails {
  readonly cron: string;
  readonly scheduledTime: number;
  readonly fcmClientOk: boolean;
  readonly rawFinancialDataRead: boolean;
  readonly tokenCleanupReady: boolean;
  readonly retryQueueReady: boolean;
}

interface ScheduledEnvelope {
  readonly event: "notification.scheduled";
  readonly operation: "SCHEDULED";
  readonly status: "SUCCESS" | "FAILURE";
  readonly details: ScheduledDetails;
}

async function runScheduled(cron: string): Promise<ScheduledEnvelope> {
  const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

  await scheduled(
    { cron, scheduledTime: Date.parse("2026-08-03T18:00:00.000Z") },
    {
      APP_ENV: "production",
      NOTIFICATIONS_AUDIT_TO_CONSOLE: "true",
    },
    {},
  );

  const eventCall = info.mock.calls.find(
    ([label]) => label === "salary_hijacking_notifications_event",
  );
  expect(eventCall).toBeDefined();
  info.mockRestore();

  return JSON.parse(String(eventCall?.[1])) as ScheduledEnvelope;
}

describe("Notifications Worker scheduled cron contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not branch on the deployed notifications cron expression", () => {
    expect(source).toContain("export async function scheduled(");
    expect(source).toContain("cron: controller.cron");
    expect(source).not.toMatch(/switch\s*\(\s*controller\.cron\s*\)/);
    expect(source).not.toMatch(
      /controller\.cron\s*={2,3}\s*["'`]0 18 \* \* \*["'`]/,
    );
    expect(source).not.toMatch(
      /controller\.cron\s*={2,3}\s*["'`]\*\/5 \* \* \* \*["'`]/,
    );
  });

  it("runs identical readiness/event work for frequent and daily production crons", async () => {
    const frequent = await runScheduled("*/5 * * * *");
    const daily = await runScheduled("0 18 * * *");

    expect(frequent.event).toBe("notification.scheduled");
    expect(daily.event).toBe("notification.scheduled");
    expect(frequent.details.cron).toBe("*/5 * * * *");
    expect(daily.details.cron).toBe("0 18 * * *");

    const normalize = (details: ScheduledDetails) => ({
      fcmClientOk: details.fcmClientOk,
      rawFinancialDataRead: details.rawFinancialDataRead,
      tokenCleanupReady: details.tokenCleanupReady,
      retryQueueReady: details.retryQueueReady,
    });

    expect(normalize(daily)).toEqual(normalize(frequent));
  });

  it("does not enable passThroughOnException in the fetch entrypoint", async () => {
    const passThroughOnException = vi.fn();

    await fetch(
      new Request("https://notifications.test/notifications/v1/health"),
      { APP_ENV: "production" },
      { passThroughOnException },
    );

    expect(passThroughOnException).not.toHaveBeenCalled();
  });

  it("acks poison queue messages with terminal classification instead of retrying forever", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await queue(
      {
        queue: "notifications-poison-test",
        messages: [
          {
            id: "poison-1",
            attempts: 3,
            body: {
              type: "FCM_SEND",
              requestId: "queue-poison-message-test",
              payload: {
                notification: { title: "Safe title", body: "Safe body" },
                data: {
                  notificationId: "ntf_poison",
                  userId: "user-poison",
                  type: "PAYDAY",
                  importance: "TRANSACTIONAL",
                  targetScreen: "NOTIFICATIONS",
                },
              },
            },
            ack,
            retry,
          },
        ],
      },
      {
        APP_ENV: "test",
        NOTIFICATIONS_AUDIT_TO_CONSOLE: "true",
        ENABLE_NOTIFICATION_QUEUE_HANDLER: "true",
      },
      {},
    );

    expect(ack).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();
    const serializedEvents = info.mock.calls
      .filter(([label]) => label === "salary_hijacking_notifications_event")
      .map(([, payload]) => String(payload));
    expect(serializedEvents.join("\n")).toContain("TERMINAL_POISON");
  });
});
