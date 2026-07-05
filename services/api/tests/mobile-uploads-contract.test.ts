import { describe, expect, it } from "vitest";
import { createApp, type AppOptions } from "../src/app";
import type {
  UploadsRepository,
  UploadsRoutesOptions,
} from "../src/routes/uploads.routes";

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

function createMobileUploadsRepository(): UploadsRepository<unknown> {
  const notUsed = async (): Promise<Record<string, never>> => ({});
  return {
    name: "mobile-contract-uploads-repository",
    list: async () => ({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    }),
    get: async () => null,
    prepare: notUsed,
    directUpload: notUsed,
    finalize: notUsed,
    update: notUsed,
    scan: notUsed,
    download: notUsed,
    content: async () => new Response(null, { status: 204 }),
    attach: notUsed,
    delete: notUsed,
    quota: async () => ({
      quotaBytes: 123_456,
      usedBytes: 4_096,
      remainingBytes: 119_360,
      fileCount: 7,
      maxDirectUploadBytes: 10 * 1024 * 1024,
    }),
  };
}

describe("mobile uploads API contract", () => {
  it("lets the app gateway inject an uploads repository for DB-backed runtime wiring", async () => {
    const options = {
      enableAuth: false,
      enableAuditGate: false,
      enableRateLimit: false,
      uploadsRoutesOptions: {
        repository: createMobileUploadsRepository(),
        exposeRepositoryName: true,
      },
    } satisfies AppOptions<unknown> & {
      readonly uploadsRoutesOptions: UploadsRoutesOptions<unknown>;
    };
    const app = createApp(options);

    const response = await app.fetch(
      new Request("https://api.test/api/v1/uploads/quota", {
        headers: authHeaders,
      }),
      { APP_ENV: "development" },
      context,
    );
    const body = (await response.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-uploads-repository")).toBe(
      "mobile-contract-uploads-repository",
    );
    expect(body.error?.code).toBeUndefined();
    expect(body.data).toMatchObject({
      quotaBytes: 123_456,
      usedBytes: 4_096,
      remainingBytes: 119_360,
      fileCount: 7,
      maxDirectUploadBytes: 10 * 1024 * 1024,
    });
  });

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

  it("issues API download URLs without exposing R2 storage keys", async () => {
    const fakeBucket = {
      put: async () => null,
    };
    const app = createUploadContractApp();

    const uploadResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: new Uint8Array([7, 7, 7, 7]).buffer,
        headers: {
          ...authHeaders,
          "content-type": "image/png",
          "x-upload-file-name": "download-proof.png",
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

    const downloadResponse = await app.fetch(
      new Request(`https://api.test/api/v1/uploads/${attachmentId}/download`, {
        headers: authHeaders,
        method: "GET",
      }),
      { APP_ENV: "development", UPLOADS_BUCKET: fakeBucket },
      context,
    );
    const downloadBody = (await downloadResponse.json()) as {
      readonly data?: Record<string, unknown>;
      readonly error?: { readonly code?: string };
    };

    expect(uploadResponse.status).toBe(201);
    expect(downloadResponse.status).toBe(200);
    expect(downloadBody.error?.code).toBeUndefined();
    expect(downloadBody.data?.downloadUrl).toBe(
      `/api/v1/uploads/${attachmentId}/content`,
    );
    expect(JSON.stringify(downloadBody)).not.toMatch(
      /r2:\/\/|uploads\/user_mobile_upload_contract|salaryAmount|accountNumber|cardNumber|token/i,
    );
  });

  it("returns readable Korean errors when a download URL is requested before scan completion", async () => {
    const app = createUploadContractApp();

    const uploadResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: new Uint8Array([21, 22, 23, 24]).buffer,
        headers: {
          ...authHeaders,
          "content-type": "application/pdf",
          "x-upload-file-name": "pending-download-proof.pdf",
          "x-upload-owner-type": "USER",
          "x-upload-purpose": "COMMUNITY_ATTACHMENT",
          "x-upload-visibility": "AUTHENTICATED",
        },
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const uploadBody = (await uploadResponse.json()) as {
      readonly data?: Record<string, unknown>;
    };
    const attachmentId = String(uploadBody.data?.attachmentId ?? "");

    const downloadResponse = await app.fetch(
      new Request(`https://api.test/api/v1/uploads/${attachmentId}/download`, {
        headers: authHeaders,
        method: "GET",
      }),
      { APP_ENV: "development" },
      context,
    );
    const downloadBody = (await downloadResponse.json()) as {
      readonly error?: { readonly code?: string; readonly message?: string };
    };

    expect(uploadResponse.status).toBe(201);
    expect(uploadBody.data?.status).toBe("SCANNING");
    expect(downloadResponse.status).toBe(409);
    expect(downloadBody.error).toMatchObject({
      code: "UPLOAD_NOT_AVAILABLE",
      message: "사용 가능한 첨부파일이 아닙니다.",
    });
    expect(JSON.stringify(downloadBody)).not.toMatch(
      /[�]|\\?ъ슜|\\?낅줈|uploads\/user_mobile_upload_contract|salaryAmount|accountNumber|cardNumber|token/i,
    );
  });

  it("streams R2-backed uploaded bytes through the API content endpoint", async () => {
    const storedObjects = new Map<string, ArrayBuffer>();
    const fakeBucket = {
      put: async (
        key: string,
        body: ArrayBuffer,
        _options?: {
          readonly httpMetadata?: { readonly contentType?: string };
        },
      ) => {
        storedObjects.set(key, body.slice(0));
      },
      get: async (key: string) => {
        const body = storedObjects.get(key);
        if (!body) return null;
        return {
          arrayBuffer: async () => body.slice(0),
          httpMetadata: { contentType: "image/png" },
        };
      },
    };
    const app = createUploadContractApp();
    const uploadBytes = new Uint8Array([41, 42, 43, 44]);

    const uploadResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: uploadBytes.buffer.slice(0),
        headers: {
          ...authHeaders,
          "content-type": "image/png",
          "x-upload-file-name": "r2-content-proof.png",
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

    const contentResponse = await app.fetch(
      new Request(`https://api.test/api/v1/uploads/${attachmentId}/content`, {
        headers: authHeaders,
        method: "GET",
      }),
      { APP_ENV: "development", UPLOADS_BUCKET: fakeBucket },
      context,
    );
    const contentBytes = new Uint8Array(await contentResponse.arrayBuffer());

    expect(uploadResponse.status).toBe(201);
    expect(contentResponse.status).toBe(200);
    expect(contentResponse.headers.get("content-type")).toContain("image/png");
    expect(Array.from(contentBytes)).toEqual(Array.from(uploadBytes));
    expect(JSON.stringify([...storedObjects.keys()])).toMatch(
      /^.*uploads\/user_mobile_upload_contract\/att_/,
    );
  });

  it("returns readable Korean errors when uploaded content is unavailable from storage", async () => {
    const fakeBucket = {
      put: async () => null,
      get: async () => null,
    };
    const app = createUploadContractApp();

    const uploadResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: new Uint8Array([31, 32, 33, 34]).buffer,
        headers: {
          ...authHeaders,
          "content-type": "image/png",
          "x-upload-file-name": "missing-content-proof.png",
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

    const contentResponse = await app.fetch(
      new Request(`https://api.test/api/v1/uploads/${attachmentId}/content`, {
        headers: authHeaders,
        method: "GET",
      }),
      { APP_ENV: "development", UPLOADS_BUCKET: fakeBucket },
      context,
    );
    const contentBody = (await contentResponse.json()) as {
      readonly error?: { readonly code?: string; readonly message?: string };
    };

    expect(uploadResponse.status).toBe(201);
    expect(contentResponse.status).toBe(404);
    expect(contentBody.error).toMatchObject({
      code: "UPLOAD_OBJECT_NOT_FOUND",
      message: "업로드 파일 본문을 저장소에서 찾을 수 없습니다.",
    });
    expect(JSON.stringify(contentBody)).not.toMatch(
      /[�]|\\?ъ슜|\\?낅줈|uploads\/user_mobile_upload_contract|salaryAmount|accountNumber|cardNumber|token/i,
    );
  });

  it("returns readable Korean errors when the uploaded attachment is not yet available", async () => {
    const app = createUploadContractApp();

    const uploadResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: new Uint8Array([51, 52, 53, 54]).buffer,
        headers: {
          ...authHeaders,
          "content-type": "application/pdf",
          "x-upload-file-name": "pending-content-proof.pdf",
          "x-upload-owner-type": "USER",
          "x-upload-purpose": "COMMUNITY_ATTACHMENT",
          "x-upload-visibility": "AUTHENTICATED",
        },
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const uploadBody = (await uploadResponse.json()) as {
      readonly data?: Record<string, unknown>;
    };
    const attachmentId = String(uploadBody.data?.attachmentId ?? "");

    const contentResponse = await app.fetch(
      new Request(`https://api.test/api/v1/uploads/${attachmentId}/content`, {
        headers: authHeaders,
        method: "GET",
      }),
      { APP_ENV: "development" },
      context,
    );
    const contentBody = (await contentResponse.json()) as {
      readonly error?: { readonly code?: string; readonly message?: string };
    };

    expect(uploadResponse.status).toBe(201);
    expect(uploadBody.data?.status).toBe("SCANNING");
    expect(contentResponse.status).toBe(409);
    expect(contentBody.error).toMatchObject({
      code: "UPLOAD_NOT_AVAILABLE",
      message: "사용 가능한 첨부파일이 아닙니다.",
    });
    expect(JSON.stringify(contentBody)).not.toMatch(
      /[�]|\\?ъ슜|\\?낅줈|uploads\/user_mobile_upload_contract|salaryAmount|accountNumber|cardNumber|token/i,
    );
  });

  it("streams uploaded bytes through the API content endpoint", async () => {
    const app = createUploadContractApp();
    const uploadBytes = new Uint8Array([10, 20, 30, 40]);

    const uploadResponse = await app.fetch(
      new Request("https://api.test/api/v1/uploads/direct", {
        body: uploadBytes.buffer.slice(0),
        headers: {
          ...authHeaders,
          "content-type": "image/png",
          "x-upload-file-name": "content-proof.png",
          "x-upload-owner-type": "USER",
          "x-upload-purpose": "COMMUNITY_ATTACHMENT",
          "x-upload-visibility": "AUTHENTICATED",
        },
        method: "POST",
      }),
      { APP_ENV: "development" },
      context,
    );
    const uploadBody = (await uploadResponse.json()) as {
      readonly data?: Record<string, unknown>;
    };
    const attachmentId = String(uploadBody.data?.attachmentId ?? "");

    const contentResponse = await app.fetch(
      new Request(`https://api.test/api/v1/uploads/${attachmentId}/content`, {
        headers: authHeaders,
        method: "GET",
      }),
      { APP_ENV: "development" },
      context,
    );
    const contentBytes = new Uint8Array(await contentResponse.arrayBuffer());

    expect(uploadResponse.status).toBe(201);
    expect(contentResponse.status).toBe(200);
    expect(contentResponse.headers.get("content-type")).toContain("image/png");
    expect(Array.from(contentBytes)).toEqual(Array.from(uploadBytes));
    expect(contentResponse.headers.get("x-raw-financial-data-exposed")).toBe(
      "false",
    );
    expect(contentResponse.headers.get("x-raw-personal-data-exposed")).toBe(
      "false",
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
