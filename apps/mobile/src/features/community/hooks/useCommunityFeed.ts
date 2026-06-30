import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import {
  communityResponseData,
  parseCommunityFeedPage,
} from "../community.parsers";
import { communityStore, type CommunityStore } from "../community.store";
import type { CommunityFeedQuery, CommunityService } from "../community.types";
import { redactCommunityError } from "../community.redaction";

export type UseCommunityFeedResult = Readonly<{
  status: ReturnType<CommunityStore["getState"]>["feed"]["status"];
  items: ReturnType<CommunityStore["getState"]>["feed"]["items"];
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}>;

export function useCommunityFeed(
  service: CommunityService,
  query: CommunityFeedQuery = {},
  store: CommunityStore = communityStore,
): UseCommunityFeedResult {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
  const queryKey = JSON.stringify([
    query.boardType ?? null,
    query.sort ?? "LATEST",
    query.pageSize ?? 20,
    query.query ?? null,
  ]);
  const stableQuery = useMemo<CommunityFeedQuery>(
    () => ({
      ...(query.boardType ? { boardType: query.boardType } : {}),
      ...(query.sort ? { sort: query.sort } : { sort: "LATEST" }),
      pageSize: query.pageSize ?? 20,
      ...(query.query?.trim() ? { query: query.query.trim() } : {}),
    }),
    [queryKey],
  );

  const loadPage = useCallback(
    async (page: number, append: boolean): Promise<void> => {
      const requestQuery = { ...stableQuery, page };
      store.beginFeed(requestQuery);
      try {
        const response = await service.listPosts(requestQuery);
        const parsed = parseCommunityFeedPage(communityResponseData(response));
        store.receiveFeed(parsed.items, parsed.meta, append);
      } catch (error) {
        store.failFeed(redactCommunityError(error));
      }
    },
    [service, stableQuery, store],
  );

  const refresh = useCallback(async (): Promise<void> => {
    await loadPage(1, false);
  }, [loadPage]);

  const loadMore = useCallback(async (): Promise<void> => {
    const current = store.getState().feed;
    if (
      current.status === "loading" ||
      current.items.length >= current.meta.total
    )
      return;
    await loadPage(current.meta.page + 1, true);
  }, [loadPage, store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    status: state.feed.status,
    items: state.feed.items,
    error: state.feed.error,
    hasMore: state.feed.items.length < state.feed.meta.total,
    refresh,
    loadMore,
  };
}
