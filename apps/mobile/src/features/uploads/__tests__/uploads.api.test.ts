import { createUploadsApi } from "../api";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("uploads api", () => {
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
