import { createCommunityApi } from "../api";
import { createCommunityService } from "../community.service";

describe("community integration", () => {
  it("keeps client-side API error messages readable in Korean", async () => {
    expect(() =>
      createCommunityApi({
        baseUrl: "https://user:password@api.example.test",
        fetcher: jest.fn(),
        platform: "android",
      }),
    ).toThrow("커뮤니티 API 주소를 확인해 주세요.");

    expect(() =>
      createCommunityApi({
        baseUrl: "http://api.example.test",
        fetcher: jest.fn(),
        platform: "android",
      }),
    ).toThrow("안전한 커뮤니티 API 연결이 필요합니다.");

    const api = createCommunityApi({
      baseUrl: "https://api.example.test",
      fetcher: jest.fn(),
      platform: "android",
    });

    await expect(api.request("/api/v1/payroll")).rejects.toMatchObject({
      message: "허용되지 않은 커뮤니티 API 경로입니다.",
    });

    const invalidResponseApi = createCommunityApi({
      baseUrl: "https://api.example.test",
      fetcher: jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
      platform: "android",
    });

    await expect(
      invalidResponseApi.request("/api/v1/community/posts"),
    ).rejects.toMatchObject({
      message: "일시적인 오류입니다. 다시 시도해 주세요.",
    });
  });

  it("previews locally, then publishes through a privacy-safe fetch request", async () => {
    const fetcher = jest
      .fn<Promise<Response>, [input: URL | RequestInfo, init?: RequestInit]>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { postId: "post_1", status: "VISIBLE" },
            meta: { requestId: "req_1" },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      );
    const api = createCommunityApi({
      baseUrl: "https://api.example.test",
      fetcher,
      platform: "android",
      createCorrelationId: () => "correlation-1",
    });
    const service = createCommunityService(api);
    const draft = {
      boardType: "LEVEL_CERTIFICATION",
      title: "영어 루틴 7일 인증",
      content: "금액 비공개로 루틴만 공유합니다.",
      tags: ["영어", "루틴"],
      anonymous: true,
    } as const;

    expect(service.previewPost(draft)).toMatchObject({
      valid: true,
      moderationStatus: "SAFE",
    });
    await service.publishPost(draft);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.test/api/v1/community/posts");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("x-raw-financial-data-exposed")).toBe(
      "false",
    );
    expect(new Headers(init?.headers).get("x-raw-personal-data-exposed")).toBe(
      "false",
    );
    expect(new Headers(init?.headers).get("x-idempotency-key")).toMatch(
      /^mobile-community-correlation-1-post-[A-Za-z0-9_-]{8,160}$/u,
    );
    expect(
      new Headers(init?.headers).get("x-ad-financial-targeting-used"),
    ).toBe("false");
    expect(String(init?.body)).not.toContain("3500000");
  });
});
