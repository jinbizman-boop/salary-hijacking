import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const context = Object.freeze({
  waitUntil: (_promise: Promise<unknown>) => undefined,
});

const authHeaders = Object.freeze({
  "x-auth-context-source": "auth.middleware",
  "x-authenticated-user-id": "user_mobile_upload_contract",
  "x-auth-primary-role": "USER",
  "x-authenticated-roles": "USER",
  "x-auth-account-status": "ACTIVE",
  "x-auth-mfa-verified": "false",
  "x-correlation-id": "mobile-uploads-contract",
});

function createUploadContractApp() {
  return createApp({
    enableAuth: false,
    enableAuditGate: false,
    enableRateLimit: false,
    now: () => new Date("2026-07-03T04:00:00.000Z"),
  });
}

describe("mobile uploads API contract", () => {
  it("stores direct upload bytes in the runtime R2 bucket without exposing storage keys", async () => {
    const putCalls: Array<{
      readonly key: string;
      readonly bodyLength: number;
      readonly contentType?: string;
    }> = [];
    const fakeBucket = {
      put: async (
        key: string,
        body: ArrayBuffer,
        options?: { readonly httpMetadata?: { readonly contentType?: string } },
      ) => {
        putCalls.push({
          key,
          bodyLength: body.byteLength,
          contentType: options?.httpMetadata?.contentType,
        });
        return null;
      },
    };
    const app = createUploadContractApp();

    const uploadResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: new Uint8Array([4, 3, 2, 1]).buffer,
        headers: {
          ...authHeaders,
          "content-type": "image/png",
          "x-upload-file-name": "r2-proof.png",
          "x-upload-owner-type": "USER",
          "x-upload-purpose": "COMMUNITY_ATTACHMENT",
          "x-upload-visibility": "AUTHENTICATED",
        },
        method: "POST",
      }),
      { APP_ENV: "development", UPLOADS_BUCKET: fakeBucket },
      context,
    );
    const uploadBody = (await uploadResponse.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(uploadResponse.status).toBe(201);
    expect(uploadBody.error?.code).toBeUndefined();
    expect(putCalls).toEqual([
      expect.objectContaining({
        bodyLength: 4,
        contentType: "image/png",
      }),
    ]);
    expect(putCalls[0]?.key).toMatch(
      /^uploads\/user_mobile_upload_contract\/att_/,
    );
    expect(JSON.stringify(uploadBody)).not.toMatch(
      /uploads\/user_mobile_upload_contract|r2:\/\/|salaryAmount|accountNumber|cardNumber|token/i,
    );
    expect(uploadBody.data).toMatchObject({
      contentType: "image/png",
      fileName: "r2-proof.png",
      rawStorageValueExposed: false,
    });
  });

  it("deletes the R2 object when a direct upload attachment is deleted", async () => {
    const deleteCalls: string[] = [];
    const fakeBucket = {
      put: async () => null,
      delete: async (key: string) => {
        deleteCalls.push(key);
      },
    };
    const app = createUploadContractApp();

    const uploadResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: new Uint8Array([5, 6, 7, 8]).buffer,
        headers: {
          ...authHeaders,
          "content-type": "image/png",
          "x-upload-file-name": "delete-proof.png",
          "x-upload-owner-type": "USER",
          "x-upload-purpose": "COMMUNITY_ATTACHMENT",
          "x-upload-visibility": "AUTHENTICATED",
        },
        method: "POST",
      }),
      { APP_ENV: "development", UPLOADS_BUCKET: fakeBucket },
      context,
    );
    const uploadBody = (await uploadResponse.json()) as {
      readonly data?: Record<string, unknown>;
    };
    const attachmentId = String(uploadBody.data?.attachmentId ?? "");

    const deleteResponse = await app.fetch(
      new Request(`https://api.test/api/v1/uploads/${attachmentId}`, {
        body: JSON.stringify({ reason: "user removed attachment" }),
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        method: "DELETE",
      }),
      { APP_ENV: "development", UPLOADS_BUCKET: fakeBucket },
      context,
    );
    const deleteBody = (await deleteResponse.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(uploadResponse.status).toBe(201);
    expect(deleteResponse.status).toBe(200);
    expect(deleteBody.error?.code).toBeUndefined();
    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0]).toMatch(
      /^uploads\/user_mobile_upload_contract\/att_/,
    );
    expect(JSON.stringify(deleteBody)).not.toMatch(
      /uploads\/user_mobile_upload_contract|r2:\/\/|salaryAmount|accountNumber|cardNumber|token/i,
    );
  });

  it("deduplicates retried direct uploads by user and idempotency key", async () => {
    const app = createUploadContractApp();
    const receiptBytes = new Uint8Array([9, 8, 7, 6]).buffer;
    const requestHeaders = {
      ...authHeaders,
      "content-type": "image/png",
      "x-idempotency-key": "mobile-upload-contract-retry-key",
      "x-upload-file-name": "retry-proof.png",
      "x-upload-owner-type": "USER",
      "x-upload-purpose": "COMMUNITY_ATTACHMENT",
      "x-upload-visibility": "AUTHENTICATED",
    };

    const firstResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: receiptBytes.slice(0),
        headers: requestHeaders,
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const secondResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: receiptBytes.slice(0),
        headers: requestHeaders,
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );

    const firstBody = (await firstResponse.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };
    const secondBody = (await secondResponse.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(200);
    expect(firstBody.error?.code).toBeUndefined();
    expect(secondBody.error?.code).toBeUndefined();
    expect(firstBody.data?.attachmentId).toBe(secondBody.data?.attachmentId);
    expect(secondBody.data).toMatchObject({
      contentType: "image/png",
      fileName: "retry-proof.png",
      financialRawFileAllowed: false,
      purpose: "COMMUNITY_ATTACHMENT",
    });
    expect(JSON.stringify(secondBody)).not.toMatch(
      /user_mobile_upload_contract|mobile-upload-contract-retry-key|salaryAmount|accountNumber|cardNumber|token/i,
    );
  });

  it("rejects same-key direct upload retries when the uploaded bytes differ", async () => {
    const app = createUploadContractApp();
    const requestHeaders = {
      ...authHeaders,
      "content-type": "image/png",
      "x-idempotency-key": "mobile-upload-contract-conflict-key",
      "x-upload-file-name": "conflict-proof.png",
      "x-upload-owner-type": "USER",
      "x-upload-purpose": "COMMUNITY_ATTACHMENT",
      "x-upload-visibility": "AUTHENTICATED",
    };

    const firstResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: new Uint8Array([1, 1, 1, 1]).buffer,
        headers: requestHeaders,
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const secondResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: new Uint8Array([2, 2, 2, 2]).buffer,
        headers: requestHeaders,
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const secondBody = (await secondResponse.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(409);
    expect(secondBody.error?.code).toBe("UPLOAD_IDEMPOTENCY_CONFLICT");
    expect(JSON.stringify(secondBody)).not.toMatch(
      /mobile-upload-contract-conflict-key|user_mobile_upload_contract|salaryAmount|accountNumber|cardNumber|token/i,
    );
  });

  it("accepts variable expense receipt uploads and attaches them to the expense owner", async () => {
    const app = createUploadContractApp();
    const receiptBytes = new Uint8Array([1, 2, 3, 4]).buffer;

    const uploadResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: receiptBytes,
        headers: {
          ...authHeaders,
          "content-type": "image/png",
          "x-upload-file-name": "coffee-receipt.png",
          "x-upload-owner-type": "USER",
          "x-upload-purpose": "VARIABLE_EXPENSE_RECEIPT",
          "x-upload-visibility": "AUTHENTICATED",
        },
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const uploadBody = (await uploadResponse.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(uploadResponse.status).toBe(201);
    expect(uploadBody.error?.code).toBeUndefined();
    expect(uploadBody.data).toMatchObject({
      contentType: "image/png",
      fileName: "coffee-receipt.png",
      financialRawFileAllowed: false,
      ownerType: "USER",
      purpose: "VARIABLE_EXPENSE_RECEIPT",
      sizeBytes: 4,
    });
    expect(JSON.stringify(uploadBody)).not.toMatch(
      /user_mobile_upload_contract|salaryAmount|accountNumber|cardNumber|token/i,
    );

    const attachmentId = String(uploadBody.data?.attachmentId ?? "");
    const attachResponse = await app.fetch(
      new Request(`https://api.test/api/v1/uploads/${attachmentId}/attach`, {
        body: JSON.stringify({
          ownerId: "vex_receipt_1",
          ownerType: "VARIABLE_EXPENSE",
        }),
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const attachBody = (await attachResponse.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(attachResponse.status).toBe(200);
    expect(attachBody.error?.code).toBeUndefined();
    expect(attachBody.data).toMatchObject({
      attachmentId,
      ownerId: "vex_receipt_1",
      ownerType: "VARIABLE_EXPENSE",
      purpose: "VARIABLE_EXPENSE_RECEIPT",
    });
    expect(JSON.stringify(attachBody)).not.toMatch(
      /user_mobile_upload_contract|salaryAmount|accountNumber|cardNumber|token/i,
    );
  });
});
