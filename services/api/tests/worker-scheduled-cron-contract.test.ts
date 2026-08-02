import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/index";

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(currentDir, "../src/index.ts"), "utf8");

interface ScheduledDetails {
  readonly cron: string;
  readonly scheduledTime: number;
  readonly readinessStatus: number;
  readonly completenessOk: boolean;
  readonly routeCount: number;
  readonly durationMs: number;
  readonly rawFinancialDataRead: boolean;
  readonly rawFinancialDataLogged: boolean;
  readonly adFinancialTargetingUsed: boolean;
}

interface ScheduledEnvelope {
  readonly type: "scheduled";
  readonly details: ScheduledDetails;
}

async function runScheduled(cron: string): Promise<ScheduledEnvelope> {
  const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const waitUntilPromises: Promise<unknown>[] = [];

  await worker.scheduled(
    { cron, scheduledTime: Date.parse("2026-08-03T15:00:00.000Z") },
    {
      APP_ENV: "production",
      APP_PUBLIC_BASE_URL: "https://api.test.salary-hijacking.local",
      INDEX_AUDIT_TO_CONSOLE: "true",
    },
    {
      waitUntil: (promise: Promise<unknown>) => {
        waitUntilPromises.push(promise);
      },
    },
  );

  await Promise.all(waitUntilPromises);
  const eventCall = info.mock.calls.find(
    ([label]) => label === "salary_hijacking_worker_event",
  );
  expect(eventCall).toBeDefined();
  info.mockRestore();

  return JSON.parse(String(eventCall?.[1])) as ScheduledEnvelope;
}

describe("API Worker scheduled cron contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not branch on the deployed API cron expression", () => {
    expect(source).toContain("async function handleScheduled(");
    expect(source).toContain("cron: controller.cron");
    expect(source).not.toMatch(/switch\s*\(\s*controller\.cron\s*\)/);
    expect(source).not.toMatch(
      /controller\.cron\s*={2,3}\s*["'`]0 15 \* \* \*["'`]/,
    );
    expect(source).not.toMatch(
      /controller\.cron\s*={2,3}\s*["'`]\*\/10 \* \* \* \*["'`]/,
    );
  });

  it("runs identical readiness/completeness work for frequent and daily production crons", async () => {
    const frequent = await runScheduled("*/10 * * * *");
    const daily = await runScheduled("0 15 * * *");

    expect(frequent.type).toBe("scheduled");
    expect(daily.type).toBe("scheduled");
    expect(frequent.details.cron).toBe("*/10 * * * *");
    expect(daily.details.cron).toBe("0 15 * * *");

    const normalize = (details: ScheduledDetails) => ({
      readinessStatus: details.readinessStatus,
      completenessOk: details.completenessOk,
      routeCount: details.routeCount,
      rawFinancialDataRead: details.rawFinancialDataRead,
      rawFinancialDataLogged: details.rawFinancialDataLogged,
      adFinancialTargetingUsed: details.adFinancialTargetingUsed,
    });

    expect(normalize(daily)).toEqual(normalize(frequent));
    expect(daily.details.durationMs).toBeGreaterThanOrEqual(0);
    expect(frequent.details.durationMs).toBeGreaterThanOrEqual(0);
  });
});
