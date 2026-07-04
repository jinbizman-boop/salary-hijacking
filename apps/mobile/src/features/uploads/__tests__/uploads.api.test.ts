import { createUploadsApi } from "../api";

const fs = jest.requireActual<typeof import("node:fs")>("node:fs");
const path = jest.requireActual<typeof import("node:path")>("node:path");

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("uploads api", () => {
  it("keeps upload sensitive file-name keywords readable for Korean privacy review", () => {
    const source = fs.readFileSync(path.join(__dirname, "../api.ts"), "utf8");

    expect(source).toContain("급여");
    expect(source).toContain("계좌");
    expect(source).toContain("카드");
    expect(source).toContain("주민등록");
    expect(source).not.toMatch(/[�]|\?붽|湲됱|怨꾩|移대|鍮꾨|二쇰|꾪솕|⑹튂/u);
  });

  it("directly uploads community attachment bytes through the API v1 uploads boundary", async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse(
          {
            attachmentId: "att_community_1",
            fileName: "proof.png",
            contentType: "image/png",
            sizeBytes: 4,
            scanStatus: "PENDING",
            status: "UPLOADED",
          },
          201,
        ),
      );
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-1",
      fetcher,
      platform: "android",
    });
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;

    const result = await api.directUploadCommunityAttachment({
      bytes,
      contentType: "image/png",
      fileName: "proof.png",
      sizeBytes: 4,
    });

    expect(result).toEqual({
      attachmentId: "att_community_1",
      contentType: "image/png",
      fileName: "proof.png",
      scanStatus: "PENDING",
      sizeBytes: 4,
      status: "UPLOADED",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [request] = fetcher.mock.calls[0]!;
    expect(request).toBeInstanceOf(Request);
    const sent = request as Request;
    expect(sent.url).toBe(
      "https://api.salaryhijacking.com/api/v1/uploads/direct",
    );
    expect(sent.method).toBe("POST");
    expect(sent.headers.get("content-type")).toBe("image/png");
    expect(sent.headers.get("x-upload-file-name")).toBe("proof.png");
    expect(sent.headers.get("x-upload-purpose")).toBe("COMMUNITY_ATTACHMENT");
    expect(sent.headers.get("x-upload-owner-type")).toBe("USER");
    expect(sent.headers.get("x-upload-visibility")).toBe("AUTHENTICATED");
    expect(sent.headers.get("x-idempotency-key")).toMatch(
      /^mobile-upload-upload-correlation-1-community-attachment-[A-Za-z0-9_-]{8,160}$/u,
    );
    expect(sent.headers.get("x-client-platform")).toBe("android");
    expect(sent.headers.get("x-correlation-id")).toBe("upload-correlation-1");
    expect(sent.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(sent.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(sent.headers.get("x-ad-financial-targeting-used")).toBe("false");
    expect(await sent.arrayBuffer()).toEqual(bytes);
    expect(JSON.stringify(fetcher.mock.calls)).not.toMatch(
      /salaryAmount|accountNumber|cardNumber|refreshToken|pushToken/i,
    );
  });

  it("blocks sensitive Korean, identifier, and token-like upload file names before network access", async () => {
    const fetcher = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-sensitive",
      fetcher,
      platform: "android",
    });
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;

    await expect(
      api.directUploadCommunityAttachment({
        bytes,
        contentType: "image/png",
        fileName:
          "월급_010-1234-5678_eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signatureABC.png",
        sizeBytes: 4,
      }),
    ).rejects.toMatchObject({
      code: "UPLOADS_SENSITIVE_FILE_NAME_FORBIDDEN",
    });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("blocks real Korean financial and identity upload file names before network access", async () => {
    const fetcher = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-korean-sensitive",
      fetcher,
      platform: "android",
    });
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;

    const sensitiveNames = [
      "급여명세서.pdf",
      "월급_입금내역.png",
      "계좌번호_캡처.webp",
      "카드_결제내역.jpg",
      "대출상환표.pdf",
      "주민등록증.png",
      "전화번호_메모.png",
    ];

    for (const fileName of sensitiveNames) {
      await expect(
        api.directUploadCommunityAttachment({
          bytes,
          contentType: "image/png",
          fileName,
          sizeBytes: 4,
        }),
      ).rejects.toMatchObject({
        code: "UPLOADS_SENSITIVE_FILE_NAME_FORBIDDEN",
      });
    }

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects sensitive upload file names echoed by the server response", async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse(
          {
            attachmentId: "att_sensitive_response",
            fileName: "월급_010-1234-5678.png",
            contentType: "image/png",
            sizeBytes: 4,
            scanStatus: "PENDING",
            status: "UPLOADED",
          },
          201,
        ),
      );
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-sensitive-response",
      fetcher,
      platform: "android",
    });
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;

    await expect(
      api.directUploadCommunityAttachment({
        bytes,
        contentType: "image/png",
        fileName: "proof.png",
        sizeBytes: 4,
      }),
    ).rejects.toMatchObject({
      code: "UPLOADS_SENSITIVE_FILE_NAME_FORBIDDEN",
    });
  });

  it("rejects invalid upload response content types and status values", async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            attachmentId: "att_bad_type",
            fileName: "proof.png",
            contentType: "application/x-msdownload",
            sizeBytes: 4,
            scanStatus: "PENDING",
            status: "UPLOADED",
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            attachmentId: "att_bad_status",
            fileName: "proof.png",
            contentType: "image/png",
            sizeBytes: 4,
            scanStatus: "INFECTED",
            status: "READY_WITH_RAW_PAYLOAD",
          },
          201,
        ),
      );
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-bad-response",
      fetcher,
      platform: "android",
    });
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;

    await expect(
      api.directUploadCommunityAttachment({
        bytes,
        contentType: "image/png",
        fileName: "proof.png",
        sizeBytes: 4,
      }),
    ).rejects.toMatchObject({ code: "UPLOADS_INVALID_RESPONSE" });
    await expect(
      api.directUploadCommunityAttachment({
        bytes,
        contentType: "image/png",
        fileName: "proof.png",
        sizeBytes: 4,
      }),
    ).rejects.toMatchObject({ code: "UPLOADS_INVALID_RESPONSE" });
  });

  it("rejects invalid attachment ids returned by direct upload responses", async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            attachmentId: "../att_community_1",
            fileName: "proof.png",
            contentType: "image/png",
            sizeBytes: 4,
            scanStatus: "PENDING",
            status: "UPLOADED",
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            attachmentId: "att_receipt_1\r\nAuthorization",
            fileName: "receipt.png",
            contentType: "image/png",
            sizeBytes: 4,
            scanStatus: "PENDING",
            status: "UPLOADED",
          },
          201,
        ),
      );
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-invalid-direct-id",
      fetcher,
      platform: "android",
    });
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;

    await expect(
      api.directUploadCommunityAttachment({
        bytes,
        contentType: "image/png",
        fileName: "proof.png",
        sizeBytes: 4,
      }),
    ).rejects.toMatchObject({ code: "UPLOADS_INVALID_ID" });
    await expect(
      api.directUploadVariableExpenseReceipt({
        bytes,
        contentType: "image/png",
        fileName: "receipt.png",
        sizeBytes: 4,
      }),
    ).rejects.toMatchObject({ code: "UPLOADS_INVALID_ID" });
  });

  it("rejects upload file names whose extension does not match the declared content type", async () => {
    const fetcher = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-extension",
      fetcher,
      platform: "android",
    });
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;

    await expect(
      api.directUploadCommunityAttachment({
        bytes,
        contentType: "image/png",
        fileName: "community-proof.pdf",
        sizeBytes: 4,
      }),
    ).rejects.toMatchObject({
      code: "UPLOADS_FILE_EXTENSION_MISMATCH",
    });
    await expect(
      api.directUploadVariableExpenseReceipt({
        bytes,
        contentType: "application/pdf",
        fileName: "receipt.png",
        sizeBytes: 4,
      }),
    ).rejects.toMatchObject({
      code: "UPLOADS_FILE_EXTENSION_MISMATCH",
    });
    await expect(
      api.directUploadVariableExpenseReceipt({
        bytes,
        contentType: "image/jpeg",
        fileName: "receipt",
        sizeBytes: 4,
      }),
    ).rejects.toMatchObject({
      code: "UPLOADS_FILE_EXTENSION_REQUIRED",
    });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects raw local file paths before upload file names reach headers", async () => {
    const fetcher = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-raw-path",
      fetcher,
      platform: "android",
    });
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;

    for (const fileName of [
      "file:///Users/telos/Desktop/proof.png",
      "content://media/external/images/media/1.png",
      "C:\\Users\\telos\\Desktop\\proof.png",
      "private/proof.png",
    ]) {
      await expect(
        api.directUploadCommunityAttachment({
          bytes,
          contentType: "image/png",
          fileName,
          sizeBytes: 4,
        }),
      ).rejects.toMatchObject({
        code: "UPLOADS_FILE_PATH_FORBIDDEN",
      });
    }

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects control characters in upload file names before they reach headers", async () => {
    const fetcher = jest.fn<
      ReturnType<typeof fetch>,
      Parameters<typeof fetch>
    >();
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-control",
      fetcher,
      platform: "android",
    });
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;

    for (const fileName of [
      "proof\r\nx-upload-file-name: proof.png",
      "receipt\u0000.png",
      "proof\u2028.png",
    ]) {
      await expect(
        api.directUploadCommunityAttachment({
          bytes,
          contentType: "image/png",
          fileName,
          sizeBytes: 4,
        }),
      ).rejects.toMatchObject({
        code: "UPLOADS_FILE_NAME_CONTROL_FORBIDDEN",
      });
    }

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("attaches a completed upload to a community post without exposing raw file paths", async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ attachmentId: "att_community_1" }));
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-2",
      fetcher,
      platform: "ios",
    });

    await api.attachToCommunityPost("att_community_1", "post_1");

    const [request] = fetcher.mock.calls[0]!;
    const sent = request as Request;
    expect(sent.url).toBe(
      "https://api.salaryhijacking.com/api/v1/uploads/att_community_1/attach",
    );
    expect(sent.method).toBe("POST");
    expect(sent.headers.get("content-type")).toBe("application/json");
    expect(await sent.json()).toEqual({
      ownerId: "post_1",
      ownerType: "COMMUNITY_POST",
    });
    expect(JSON.stringify(fetcher.mock.calls)).not.toMatch(
      /file:\/\/|content:\/\/|salaryAmount|accountNumber|token/i,
    );
  });

  it("rejects invalid attachment ids echoed by attach responses", async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(
        jsonResponse({ attachmentId: "att_community_1\r\nAuthorization" }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ attachmentId: "../att_receipt_1" }),
      );
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-invalid-attach",
      fetcher,
      platform: "ios",
    });

    await expect(
      api.attachToCommunityPost("att_community_1", "post_1"),
    ).rejects.toMatchObject({ code: "UPLOADS_INVALID_ID" });
    await expect(
      api.attachToVariableExpense("att_receipt_1", "vex_1"),
    ).rejects.toMatchObject({ code: "UPLOADS_INVALID_ID" });
  });

  it("rejects mismatched attachment ids echoed by attach responses", async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(jsonResponse({ attachmentId: "att_other_post" }))
      .mockResolvedValueOnce(
        jsonResponse({ attachmentId: "att_other_receipt" }),
      );
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "upload-correlation-mismatch-attach",
      fetcher,
      platform: "ios",
    });

    await expect(
      api.attachToCommunityPost("att_community_1", "post_1"),
    ).rejects.toMatchObject({ code: "UPLOADS_INVALID_RESPONSE" });
    await expect(
      api.attachToVariableExpense("att_receipt_1", "vex_1"),
    ).rejects.toMatchObject({ code: "UPLOADS_INVALID_RESPONSE" });
  });

  it("directly uploads variable expense receipt bytes through the API v1 uploads boundary", async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        jsonResponse(
          {
            attachmentId: "att_receipt_1",
            fileName: "receipt.png",
            contentType: "image/png",
            sizeBytes: 4,
            scanStatus: "PENDING",
            status: "UPLOADED",
          },
          201,
        ),
      );
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "receipt-correlation-1",
      fetcher,
      platform: "android",
    });
    const bytes = new Uint8Array([5, 6, 7, 8]).buffer;

    const result = await api.directUploadVariableExpenseReceipt({
      bytes,
      contentType: "image/png",
      fileName: "receipt.png",
      sizeBytes: 4,
    });

    expect(result.attachmentId).toBe("att_receipt_1");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [request] = fetcher.mock.calls[0]!;
    const sent = request as Request;
    expect(sent.url).toBe(
      "https://api.salaryhijacking.com/api/v1/uploads/direct",
    );
    expect(sent.method).toBe("POST");
    expect(sent.headers.get("content-type")).toBe("image/png");
    expect(sent.headers.get("x-upload-file-name")).toBe("receipt.png");
    expect(sent.headers.get("x-upload-purpose")).toBe(
      "VARIABLE_EXPENSE_RECEIPT",
    );
    expect(sent.headers.get("x-upload-owner-type")).toBe("USER");
    expect(sent.headers.get("x-upload-visibility")).toBe("AUTHENTICATED");
    expect(sent.headers.get("x-idempotency-key")).toMatch(
      /^mobile-upload-receipt-correlation-1-variable-expense-receipt-[A-Za-z0-9_-]{8,160}$/u,
    );
    expect(sent.headers.get("x-raw-financial-data-exposed")).toBe("false");
    expect(sent.headers.get("x-raw-personal-data-exposed")).toBe("false");
    expect(sent.headers.get("x-ad-financial-targeting-used")).toBe("false");
    expect(await sent.arrayBuffer()).toEqual(bytes);
    expect(JSON.stringify(fetcher.mock.calls)).not.toMatch(
      /file:\/\/|content:\/\/|salaryAmount|accountNumber|cardNumber|token/i,
    );
  });

  it("attaches a receipt upload to a variable expense without raw file paths", async () => {
    const fetcher = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ attachmentId: "att_receipt_1" }));
    const api = createUploadsApi({
      baseUrl: "https://api.salaryhijacking.com",
      createCorrelationId: () => "receipt-correlation-2",
      fetcher,
      platform: "ios",
    });

    await api.attachToVariableExpense("att_receipt_1", "vex_1");

    const [request] = fetcher.mock.calls[0]!;
    const sent = request as Request;
    expect(sent.url).toBe(
      "https://api.salaryhijacking.com/api/v1/uploads/att_receipt_1/attach",
    );
    expect(sent.method).toBe("POST");
    expect(sent.headers.get("content-type")).toBe("application/json");
    expect(await sent.json()).toEqual({
      ownerId: "vex_1",
      ownerType: "VARIABLE_EXPENSE",
    });
    expect(JSON.stringify(fetcher.mock.calls)).not.toMatch(
      /file:\/\/|content:\/\/|salaryAmount|accountNumber|token/i,
    );
  });
});
