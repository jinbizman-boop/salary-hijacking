import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { handleQueue, handleScheduled } from "../../src/index";

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(currentDir, "../../src/index.ts"), "utf8");
const jobSources = [
  "../../src/jobs/payday-reminder.job.ts",
  "../../src/jobs/fixed-expense-reminder.job.ts",
  "../../src/jobs/monthly-hijack-close.job.ts",
  "../../src/jobs/data-retention-cleanup.job.ts",
]
  .map((file) => readFileSync(resolve(currentDir, file), "utf8"))
  .join("\n");

describe("Scheduler Worker scheduled dispatcher contract", () => {
  it("plans the same enabled jobs from the scheduled handler regardless of cron expression", async () => {
    const waitUntilPromises: Promise<unknown>[] = [];

    await handleScheduled(
      {
        cron: "0 23 * * *",
        scheduledTime: Date.parse("2026-08-03T23:00:00.000Z"),
      },
      {
        SCHEDULER_DISABLE_NETWORK: "true",
      },
      {
        waitUntil: (promise: Promise<unknown>) => {
          waitUntilPromises.push(promise);
        },
      },
    );

    expect(waitUntilPromises.length).toBeGreaterThanOrEqual(1);
    await expect(Promise.all(waitUntilPromises)).resolves.toBeDefined();
  });

  it("uses cron only as actor metadata, not as a job selector", () => {
    expect(source).toContain("async function runScheduled(");
    expect(source).toContain('job: "payday-reminder"');
    expect(source).toContain('job: "fixed-expense-reminder"');
    expect(source).toContain('job: "monthly-hijack-close"');
    expect(source).toContain('job: "data-retention-cleanup"');
    expect(source).toContain(
      'actorId: `cron:${controller.cron ?? "scheduled"}`',
    );
    expect(source).not.toMatch(/switch\s*\(\s*controller\.cron\s*\)/);
  });

  it("keeps job-level duplicate execution protection wired into the scheduled path", () => {
    expect(source).toContain('"/api/v1/internal/scheduler/locks/acquire"');
    expect(source).toContain('"/api/v1/internal/scheduler/locks/release"');
    expect(jobSources).toContain("options.repository.acquireJobLock");
    expect(jobSources).toContain("options.repository.releaseJobLock");
    expect(jobSources).toContain("idempotencyKey");
    expect(jobSources).toContain("duplicate_reminder_key");
    expect(jobSources).toContain("duplicate_close_prevention");
  });

  it("retries malformed queue jobs instead of acknowledging them", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const retry = vi.fn();
    const ack = vi.fn();

    await handleQueue(
      {
        queue: "scheduler-contract-test",
        messages: [
          {
            body: { type: "RUN_JOB", job: "unknown", action: "run" },
            ack,
            retry,
          },
        ],
      },
      {},
      {},
    );

    expect(retry).toHaveBeenCalledTimes(1);
    expect(ack).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
