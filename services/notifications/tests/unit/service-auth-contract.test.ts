import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import worker from "../../src/index";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function validateRequest(token: string): Request {
  return new Request("https://notifications.test/notifications/v1/validate", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-service-token": token,
    },
    body: JSON.stringify({
      token: "native-fcm-registration-token-for-contract-test",
      notification: { title: "QA", body: "Auth contract" },
      data: {
        notificationId: "ntf_service_auth_contract",
        userId: "usr_service_auth_contract",
        type: "NOTICE",
        importance: "SYSTEM_REQUIRED",
        targetScreen: "notifications",
        consentGranted: true,
      },
    }),
  });
}

const context = {
  waitUntil: (_promise: Promise<unknown>) => undefined,
  passThroughOnException: () => undefined,
} as ExecutionContext;

describe("notifications Worker service auth contract", () => {
  it("requires a SHA-256 service-token binding in staging and rejects plaintext-only fallback", async () => {
    const response = await worker.fetch(validateRequest("raw-service-token"), {
      APP_ENV: "staging",
      NOTIFICATIONS_SERVICE_TOKEN: "raw-service-token",
    }, context);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "NOTIFICATIONS_SERVICE_TOKEN_SHA256_REQUIRED",
      },
    });
  });

  it("accepts an incoming raw service token only by hashing it against the expected binding", async () => {
    const response = await worker.fetch(validateRequest("raw-service-token"), {
      APP_ENV: "staging",
      NOTIFICATIONS_SERVICE_TOKEN_SHA256: sha256Hex("raw-service-token"),
    }, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { authMode: "HASH" },
    });
  });
});
