import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const env = Object.freeze({
  APP_ENV: "development",
  JWT_SECRET: "local-test-jwt-secret-with-at-least-32-characters",
  HASH_SECRET: "local-test-hash-secret-with-at-least-32-characters",
  RATE_LIMIT_HASH_SECRET: "local-test-rate-secret-with-at-least-32-characters",
  AUDIT_HASH_SECRET: "local-test-audit-secret-with-at-least-32-characters",
});

async function requestTwice(path: string, body: Record<string, unknown>) {
  const policyId = `phase3-${path.replace(/[^a-z0-9]+/giu, "-")}`;
  const app = createApp({
    enableAuditGate: false,
    rateLimitOptions: {
      prependPolicies: [
        {
          id: policyId,
          pattern: new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
          methods: ["POST"],
          capacity: 1,
          windowSeconds: 60,
          scope: "IP",
          algorithm: "fixed_window",
          severity: "WARNING",
        },
      ],
    },
    now: () => new Date("2026-08-17T09:00:00.000Z"),
  });
  const init = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
    },
    body: JSON.stringify(body),
  };
  const first = await app.fetch(
    new Request(`https://api.test${path}`, init),
    env,
    context,
  );
  const second = await app.fetch(
    new Request(`https://api.test${path}`, init),
    env,
    context,
  );
  const secondBody = (await second.json()) as {
    readonly error?: { readonly code?: string; readonly requestId?: string };
  };
  return { first, second, secondBody };
}

describe("Phase 3 auth/account rate-limit contract", () => {
  it.each([
    [
      "/api/v1/auth/register",
      {
        email: "rate-limit@example.test",
        password: "StrongPass123!",
        nickname: "ratelimit",
        termsAccepted: true,
        privacyAccepted: true,
      },
    ],
    ["/api/v1/auth/login", { email: "missing@example.test", password: "WrongPass123!" }],
    ["/api/v1/auth/password-reset", { email: "missing@example.test" }],
    [
      "/api/v1/users/me/support-tickets",
      {
        category: "PRIVACY",
        subject: "Phase 3 account help",
        message: "Please review my account settings.",
        rawFinancialDataExposed: false,
        rawPersonalDataExposed: false,
        rawPushTokenExposed: false,
        adsFinancialTargetingUsed: false,
      },
    ],
    ["/api/v1/users/me/withdrawal-request", { reason: "phase3", deleteCommunityContent: false }],
    ["/admin/auth/login", { email: "admin@example.test", password: "WrongPass123!" }],
  ])("returns stable 429 contract with Retry-After for %s", async (path, body) => {
    const { first, second, secondBody } = await requestTwice(path, body);

    expect(first.status).not.toBe(429);
    expect(second.status).toBe(429);
    expect(second.headers.get("retry-after")).toEqual(expect.stringMatching(/^\d+$/));
    expect(second.headers.get("x-error-code")).toBe("RATE_LIMIT_EXCEEDED");
    expect(secondBody.error?.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(secondBody.error?.requestId).toEqual(expect.any(String));
    expect(JSON.stringify(secondBody)).not.toContain("StrongPass123!");
  });
});
