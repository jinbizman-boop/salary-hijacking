import { createCommunityStore } from "../community.store";
import type { CommunityPost } from "../community.types";

function post(id: string, title: string): CommunityPost {
  return {
    id,
    boardType: "FREE",
    title,
    bodyPreview: "본문 미리보기",
    anonymousDisplayName: "익명 사용자",
    moderationStatus: "SAFE",
    likeCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    createdAt: "2026-06-25T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    adsFinancialTargetingUsed: false,
  };
}

describe("community store", () => {
  it("loads, deduplicates, and immutably appends feed pages", () => {
    const store = createCommunityStore();
    const initial = store.getState();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.beginFeed({
      boardType: "FREE",
      sort: "LATEST",
      page: 1,
      pageSize: 20,
    });
    store.receiveFeed(
      [post("post-1", "첫 글")],
      { page: 1, pageSize: 20, total: 2 },
      false,
    );
    const firstPage = store.getState();
    store.receiveFeed(
      [post("post-1", "수정된 첫 글"), post("post-2", "둘째 글")],
      { page: 2, pageSize: 20, total: 2 },
      true,
    );

    expect(initial).not.toBe(store.getState());
    expect(firstPage.feed.items).toHaveLength(1);
    expect(store.getState().feed.items).toEqual([
      expect.objectContaining({ id: "post-1", title: "수정된 첫 글" }),
      expect.objectContaining({ id: "post-2" }),
    ]);
    expect(store.getState().feed.status).toBe("ready");
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("keeps stale feed data when a refresh fails and updates selected entities", () => {
    const store = createCommunityStore();
    const original = post("post-1", "원본");
    store.receiveFeed([original], { page: 1, pageSize: 20, total: 1 }, false);
    store.failFeed("네트워크 연결을 확인해 주세요.");
    store.selectPost(original);
    store.upsertPost(post("post-1", "서버 갱신"));

    expect(store.getState().feed.status).toBe("stale");
    expect(store.getState().feed.error).toBe("네트워크 연결을 확인해 주세요.");
    expect(store.getState().selectedPost?.title).toBe("서버 갱신");
  });
});
