import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function load(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function hasProducer(config: string, binding: string, queue: string): boolean {
  const escapedBinding = binding.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedQueue = queue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\[\\[.*queues\\.producers\\]\\][\\s\\S]*?binding\\s*=\\s*"${escapedBinding}"[\\s\\S]*?queue\\s*=\\s*"${escapedQueue}"`,
    "m",
  );
  return pattern.test(config);
}

function hasConsumer(config: string, queue: string): boolean {
  const escapedQueue = queue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\[\\[.*queues\\.consumers\\]\\][\\s\\S]*?queue\\s*=\\s*"${escapedQueue}"`,
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

  it("does not route cleanup producers to the legacy notifications-operations queues", () => {
    expect(notifications).not.toMatch(
      /binding\s*=\s*"NOTIFICATIONS_OPERATION_QUEUE"[\s\S]{0,200}queue\s*=\s*"salary-hijacking-(?:dev|staging|production)-notifications-operations"/,
    );
  });
});
