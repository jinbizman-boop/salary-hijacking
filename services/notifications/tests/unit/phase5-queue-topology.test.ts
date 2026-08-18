import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function load(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasProducer(config: string, binding: string, queue: string): boolean {
  const pattern = new RegExp(
    `binding\\s*=\\s*"${escapeRegExp(binding)}"[\\s\\S]{0,240}?queue\\s*=\\s*"${escapeRegExp(queue)}"`,
    "m",
  );
  return pattern.test(config);
}

function hasConsumer(config: string, queue: string): boolean {
  const pattern = new RegExp(
    `\\[\\[(?:env\\.(?:staging|production)\\.)?queues\\.consumers\\]\\][\\s\\S]{0,160}?queue\\s*=\\s*"${escapeRegExp(queue)}"`,
    "m",
  );
  return pattern.test(config);
}

describe("PHASE 5 invalid-token cleanup queue topology", () => {
  const notifications = load("wrangler.toml");
  const api = load("../api/wrangler.toml");

  it.each([
    ["development", "salary-hijacking-dev-operations"],
    ["staging", "salary-hijacking-staging-operations"],
    ["production", "salary-hijacking-production-operations"],
  ])("routes %s cleanup events to the API-owned operations queue", (_environment, queue) => {
    expect(hasProducer(notifications, "NOTIFICATIONS_OPERATION_QUEUE", queue)).toBe(true);
    expect(hasConsumer(api, queue)).toBe(true);
  });

  it("removes the obsolete notifications-operations queue topology", () => {
    expect(notifications).not.toMatch(
      /salary-hijacking-(?:dev|staging|production)-notifications-operations/,
    );
  });

  it("keeps notification delivery retries on the notifications-owned retry queues", () => {
    expect(notifications).toContain("salary-hijacking-dev-notifications-retry");
    expect(notifications).toContain("salary-hijacking-staging-notifications-retry");
    expect(notifications).toContain("salary-hijacking-production-notifications-retry");
  });
});
