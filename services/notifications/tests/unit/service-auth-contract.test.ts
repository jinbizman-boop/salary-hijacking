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

  it("does not require raw user id in the FCM provider payload", async () => {
    const response = await worker.fetch(
      new Request("https://notifications.test/notifications/v1/validate", {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-service-token": "raw-service-token",
        },
        body: JSON.stringify({
          token: "native-fcm-registration-token-without-user-id",
          notification: { title: "QA", body: "No raw user id" },
          data: {
            notificationId: "ntf_without_user_id",
            type: "NOTICE",
            importance: "SYSTEM_REQUIRED",
            targetScreen: "notifications",
          },
        }),
      }),
      {
        APP_ENV: "staging",
        NOTIFICATIONS_SERVICE_TOKEN_SHA256: sha256Hex("raw-service-token"),
      },
      context,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { valid: true, authMode: "HASH" },
    });
  });

  it("treats the FCM target token as opaque while keeping it out of the response body", async () => {
    const response = await worker.fetch(
      new Request("https://notifications.test/notifications/v1/validate", {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-service-token": "raw-service-token",
        },
        body: JSON.stringify({
          token: "opaque-native-fcm-token-containing-salary-fragment",
          notification: { title: "QA", body: "Opaque token contract" },
          data: {
            notificationId: "ntf_opaque_token_contract",
            userId: "usr_opaque_token_contract",
            type: "NOTICE",
            importance: "SYSTEM_REQUIRED",
            targetScreen: "notifications",
          },
          android: {
            priority: "HIGH",
            channelId: "salary-hijacking-default",
            clickAction: "OPEN_NOTIFICATION",
          },
        }),
      }),
      {
        APP_ENV: "staging",
        NOTIFICATIONS_SERVICE_TOKEN_SHA256: sha256Hex("raw-service-token"),
      },
      context,
    );

    expect(response.status).toBe(200);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain("opaque-native-fcm-token");
  });
});
