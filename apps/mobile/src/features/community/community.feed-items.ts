import type { CommunityBoardType, CommunityPost } from "./community.types";

export const COMMUNITY_FEED_AD_PLACEMENT_ID =
  "AD-APP-COMMUNITY-FEED-01" as const;
export const COMMUNITY_FEED_AD_INTERVAL = 5;

export type CommunityFeedPostItem = Readonly<{
  type: "post";
  key: string;
  post: CommunityPost;
}>;

export type CommunityFeedAdItem = Readonly<{
  type: "ad";
  key: string;
  placementId: typeof COMMUNITY_FEED_AD_PLACEMENT_ID;
  occurrenceIndex: number;
}>;

export type CommunityFeedItem = CommunityFeedPostItem | CommunityFeedAdItem;

export function composeCommunityFeedItems(
  posts: readonly CommunityPost[],
  categoryKey: CommunityBoardType,
): readonly CommunityFeedItem[] {
  return posts.flatMap((post, index): readonly CommunityFeedItem[] => {
    const organicPosition = index + 1;
    const postItem: CommunityFeedPostItem = {
      key: `post:${post.id}`,
      post,
      type: "post",
    };
    if (organicPosition % COMMUNITY_FEED_AD_INTERVAL !== 0) return [postItem];
    const occurrenceIndex = organicPosition / COMMUNITY_FEED_AD_INTERVAL;
    return [
      postItem,
      {
        key: `ad:community:${categoryKey}:${occurrenceIndex}`,
        occurrenceIndex,
        placementId: COMMUNITY_FEED_AD_PLACEMENT_ID,
        type: "ad",
      },
    ];
  });
}
