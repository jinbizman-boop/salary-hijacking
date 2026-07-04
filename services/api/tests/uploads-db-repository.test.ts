import { describe, expect, it } from "vitest";
import { createNeonUploadsRepository } from "../src/repositories/uploads.repository";
import type {
  DirectUploadInput,
  UploadsRouteRuntime,
} from "../src/routes/uploads.routes";

const userId = "11111111-1111-4111-8111-111111111111";
const attachmentId = "22222222-2222-4222-8222-222222222222";

function createRuntime(env: Record<string, unknown>): UploadsRouteRuntime {
  return {
    request: new Request("https://api.test/api/v1/uploads/direct"),
    env,
    execution: { waitUntil: (_promise: Promise<unknown>) => undefined },
    url: new URL("https://api.test/api/v1/uploads/direct"),
    path: "/api/v1/uploads/direct",
    relativePath: "/direct",
    method: "POST",
    requestId: "uploads-db-repository-test",
    now: new Date("2026-07-04T13:00:00.000Z"),
    principal: {
      userId,
      roles: ["USER"],
      permissions: [],
      policyId: null,
    },
    repository: {} as never,
  };
}

const uploadInput: DirectUploadInput = {
  fileName: "receipt-proof.png",
  contentType: "image/png",
  sizeBytes: 4,
  checksumSha256: null,
  idempotencyKey: "uploads-db-idempotency-key-0001",
  purpose: "VARIABLE_EXPENSE_RECEIPT",
  ownerType: "USER",
  ownerId: null,
  visibility: "AUTHENTICATED",
  metadata: { source: "mobile-salary-home" },
  data: new Uint8Array([9, 8, 7, 6]).buffer,
};

describe("Neon uploads repository", () => {
  it("persists direct upload metadata through attachments and stores bytes in R2 without exposing storage keys", async () => {
    const putCalls: Array<{
      readonly key: string;
      readonly bodyLength: number;
      readonly contentType?: string;
    }> = [];
    const calls: Array<{
      readonly operationName: string;
      readonly sqlText: string;
      readonly params: readonly unknown[];
    }> = [];
    const repository = createNeonUploadsRepository({
      query: async (sqlText, params, options) => {
        calls.push({ operationName: options.operationName, sqlText, params });
        if (options.operationName.endsWith(".findByIdempotency")) {
          return { rows: [], rowCount: 0 };
        }
        if (options.operationName.endsWith(".directUpload.create")) {
          return {
            rows: [
              {
                attachment_id: attachmentId,
                owner_type: "USER",
                owner_id: userId,
                file_name: "receipt-proof.png",
                file_url: `/api/v1/uploads/${attachmentId}/content`,
                mime_type: "image/png",
                file_size: "4",
                upload_purpose: "VARIABLE_EXPENSE_RECEIPT",
                upload_visibility: "AUTHENTICATED",
                scan_status: "PASSED",
                status: "AVAILABLE",
                created_at: "2026-07-04T13:00:00.000Z",
                updated_at: "2026-07-04T13:00:00.000Z",
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`Unexpected operation: ${options.operationName}`);
      },
    });
    const runtime = createRuntime({
      APP_ENV: "test",
      UPLOADS_BUCKET: {
        put: async (
          key: string,
          body: ArrayBuffer,
          options?: {
            readonly httpMetadata?: { readonly contentType?: string };
          },
        ) => {
          putCalls.push({
            key,
            bodyLength: body.byteLength,
            contentType: options?.httpMetadata?.contentType,
          });
        },
      },
    });

    const created = await repository.directUpload(uploadInput, runtime);

    expect(created).toMatchObject({
      attachmentId,
      fileName: "receipt-proof.png",
      contentType: "image/png",
      sizeBytes: 4,
      purpose: "VARIABLE_EXPENSE_RECEIPT",
      ownerType: "USER",
      ownerId: userId,
      visibility: "AUTHENTICATED",
      status: "AVAILABLE",
      scanStatus: "PASSED",
      rawStorageValueExposed: false,
      financialRawFileAllowed: false,
    });
    expect(created).not.toHaveProperty("userId");
    expect(created).not.toHaveProperty("storageKey");
    expect(JSON.stringify(created)).not.toMatch(
      /uploads\/11111111-1111-4111-8111-111111111111|r2:\/\/|token|salaryAmount|accountNumber|cardNumber/i,
    );
    expect(putCalls).toEqual([
      expect.objectContaining({
        bodyLength: 4,
        contentType: "image/png",
      }),
    ]);
    expect(putCalls[0]?.key).toMatch(
      /^uploads\/11111111-1111-4111-8111-111111111111\/att_/,
    );
    expect(calls.map((call) => call.operationName)).toEqual([
      "uploads.findByIdempotency",
      "uploads.directUpload.create",
    ]);
    expect(calls[1]?.sqlText).toContain("insert into public.attachments");
    expect(calls[1]?.params).toContain(userId);
  });
});
