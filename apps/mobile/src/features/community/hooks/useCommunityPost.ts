import { useCallback, useEffect, useState } from "react";

import {
  communityResponseData,
  parseCommunityCommentPage,
  parseCommunityPostDetail,
} from "../community.parsers";
import { communityStore, type CommunityStore } from "../community.store";
import type {
  CommunityComment,
  CommunityPostDetail,
  CommunityService,
} from "../community.types";
import { redactCommunityError } from "../community.redaction";

export type CommunityPostLoadState = Readonly<{
  detail: CommunityPostDetail | null;
  comments: readonly CommunityComment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}>;

export function useCommunityPost(
  service: CommunityService,
  postId: string,
  store: CommunityStore = communityStore,
): CommunityPostLoadState {
  const [detail, setDetail] = useState<CommunityPostDetail | null>(null);
  const [comments, setComments] = useState<readonly CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!postId.trim()) {
      setDetail(null);
      setComments([]);
      setError("게시글 식별자를 확인해 주세요.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [postResponse, commentsResponse] = await Promise.all([
        service.getPost(postId),
        service.listComments(postId, 1, 100),
      ]);
      const nextDetail = parseCommunityPostDetail(
        communityResponseData(postResponse),
      );
      const commentPage = parseCommunityCommentPage(
        communityResponseData(commentsResponse),
      );
      setDetail({ ...nextDetail, comments: commentPage.items });
      setComments(commentPage.items);
      store.selectPost(nextDetail.post);
      store.upsertPost(nextDetail.post);
      store.setComments(postId, commentPage.items);
    } catch (loadError) {
      setError(redactCommunityError(loadError));
    } finally {
      setLoading(false);
    }
  }, [postId, service, store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { detail, comments, loading, error, refresh };
}
