import { act, renderHook, waitFor } from "@testing-library/react-native";

import { createCommunityStore } from "../community.store";
import type {
  CommunityApiResponse,
  CommunityService,
} from "../community.types";
import { useCommunityFeed } from "../hooks/useCommunityFeed";
import { useCommunityPost } from "../hooks/useCommunityPost";

function serverPost(id: string, title: string): Record<string, unknown> {
  return {
    postId: id,
    boardType: "FREE",
    title,
    content: `${title} 본문`,
    authorMasked: "익명 사용자",
    status: "VISIBLE",
    likeCount: 0,
    commentCount: 0,
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
    financialRawDataExposed: false,
  };
}

describe("community hooks", () => {
  it("loads and appends server feed pages through an isolated store", async () => {
    const listPosts = jest.fn(
      async (query): Promise<CommunityApiResponse> => ({
        data: {
          items: [
            serverPost(
              query?.page === 2 ? "post_2" : "post_1",
              query?.page === 2 ? "둘째 글" : "첫 글",
            ),
          ],
          page: query?.page ?? 1,
          pageSize: 1,
          total: 2,
        },
      }),
    );
    const service = { listPosts } as unknown as CommunityService;
    const store = createCommunityStore();
    const { result } = renderHook(() =>
      useCommunityFeed(
        service,
        { boardType: "FREE", sort: "LATEST", pageSize: 1 },
        store,
      ),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items.map((post) => post.id)).toEqual(["post_1"]);
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    expect(result.current.items.map((post) => post.id)).toEqual([
      "post_1",
      "post_2",
    ]);
    expect(result.current.hasMore).toBe(false);
  });

  it("combines post detail and comments without exposing owner ids", async () => {
    const service = {
      getPost: jest.fn(
        async (): Promise<CommunityApiResponse> => ({
          data: {
            ...serverPost("post_1", "상세 글"),
            ownerUserId: "usr_private",
            tags: "루틴,예산",
          },
        }),
      ),
      listComments: jest.fn(
        async (): Promise<CommunityApiResponse> => ({
          data: {
            items: [
              {
                commentId: "comment_1",
                postId: "post_1",
                ownerUserId: "usr_private",
                authorMasked: "익명 사용자",
                content: "좋은 방법입니다.",
                status: "VISIBLE",
                createdAt: "2026-06-25T00:00:00.000Z",
                updatedAt: "2026-06-25T00:00:00.000Z",
              },
            ],
            page: 1,
            pageSize: 20,
            total: 1,
          },
        }),
      ),
    } as unknown as CommunityService;
    const store = createCommunityStore();
    const { result } = renderHook(() =>
      useCommunityPost(service, "post_1", store),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.detail?.tags).toEqual(["루틴", "예산"]);
    expect(result.current.comments).toHaveLength(1);
    expect(JSON.stringify(result.current)).not.toContain("usr_private");
  });
});
