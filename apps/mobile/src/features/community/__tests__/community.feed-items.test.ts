import {
  COMMUNITY_FEED_AD_INTERVAL,
  COMMUNITY_FEED_AD_PLACEMENT_ID,
  composeCommunityFeedItems,
} from "../community.feed-items";
import type { CommunityPost } from "../community.types";

function post(index: number): CommunityPost {
  return {
    adsFinancialTargetingUsed: false,
    anonymousDisplayName: `익명 ${index}`,
    boardType: "FREE",
    bodyPreview: "민감정보 없는 커뮤니티 글입니다.",
    bookmarkCount: 0,
    commentCount: 0,
    createdAt: "2026-09-07T00:00:00.000Z",
    id: `post_${index}`,
    likeCount: 0,
    moderationStatus: "SAFE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    title: `글 ${index}`,
    updatedAt: "2026-09-07T00:00:00.000Z",
  };
}

describe("community feed item composition", () => {
  it.each([
    [0, 0],
    [1, 0],
    [4, 0],
    [5, 1],
    [6, 1],
    [9, 1],
    [10, 2],
    [15, 3],
  ])("inserts %i organic posts with %i ads", (postCount, adCount) => {
    const items = composeCommunityFeedItems(
      Array.from({ length: postCount }, (_, index) => post(index + 1)),
      "FREE",
    );

    expect(items.filter((item) => item.type === "ad")).toHaveLength(adCount);
  });

  it("inserts the first ad only after the fifth organic post and repeats every five", () => {
    const items = composeCommunityFeedItems(
      Array.from({ length: 10 }, (_, index) => post(index + 1)),
      "FREE",
    );

    expect(items.map((item) => item.key)).toEqual([
      "post:post_1",
      "post:post_2",
      "post:post_3",
      "post:post_4",
      "post:post_5",
      "ad:community:FREE:1",
      "post:post_6",
      "post:post_7",
      "post:post_8",
      "post:post_9",
      "post:post_10",
      "ad:community:FREE:2",
    ]);
    expect(items[5]).toEqual({
      key: "ad:community:FREE:1",
      occurrenceIndex: 1,
      placementId: COMMUNITY_FEED_AD_PLACEMENT_ID,
      type: "ad",
    });
    expect(COMMUNITY_FEED_AD_INTERVAL).toBe(5);
  });

  it("keeps ad occurrence keys independent per category feed", () => {
    const freeItems = composeCommunityFeedItems(
      Array.from({ length: 12 }, (_, index) => post(index + 1)),
      "FREE",
    );
    const levelItems = composeCommunityFeedItems(
      Array.from({ length: 5 }, (_, index) => post(index + 1)),
      "LEVELUP",
    );
    const hobbyItems = composeCommunityFeedItems(
      Array.from({ length: 4 }, (_, index) => post(index + 1)),
      "HOBBY",
    );

    expect(
      freeItems.filter((item) => item.type === "ad").map((item) => item.key),
    ).toEqual(["ad:community:FREE:1", "ad:community:FREE:2"]);
    expect(
      levelItems.filter((item) => item.type === "ad").map((item) => item.key),
    ).toEqual(["ad:community:LEVELUP:1"]);
    expect(hobbyItems.filter((item) => item.type === "ad")).toHaveLength(0);
  });
});
