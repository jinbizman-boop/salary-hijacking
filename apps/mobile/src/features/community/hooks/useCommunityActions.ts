import { useCallback, useState } from "react";

import type { CommunityAnalytics } from "../community.analytics";
import {
  communityResponseData,
  parseCommunityComment,
  parseCommunityPost,
} from "../community.parsers";
import { communityStore, type CommunityStore } from "../community.store";
import type {
  CommunityCommentDraft,
  CommunityPost,
  CommunityPostDraft,
  CommunityService,
} from "../community.types";
import { redactCommunityError } from "../community.redaction";

export type CommunityActions = Readonly<{
  pendingAction: string | null;
  error: string | null;
  publishPost: (draft: CommunityPostDraft) => Promise<CommunityPost>;
  updatePost: (
    postId: string,
    draft: CommunityPostDraft,
  ) => Promise<CommunityPost>;
  deletePost: (postId: string) => Promise<void>;
  setPostLiked: (postId: string, liked: boolean) => Promise<void>;
  setCommentLiked: (
    postId: string,
    commentId: string,
    liked: boolean,
  ) => Promise<void>;
  createComment: (
    postId: string,
    draft: CommunityCommentDraft,
  ) => Promise<void>;
  updateComment: (
    commentId: string,
    draft: CommunityCommentDraft,
  ) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  reportPost: (
    postId: string,
    reasonType: string,
    reason: string,
  ) => Promise<void>;
  reportComment: (
    commentId: string,
    reasonType: string,
    reason: string,
  ) => Promise<void>;
}>;

export function useCommunityActions(
  service: CommunityService,
  store: CommunityStore = communityStore,
  analytics?: CommunityAnalytics,
): CommunityActions {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(key: string, task: () => Promise<T>): Promise<T> => {
      setPendingAction(key);
      setError(null);
      try {
        return await task();
      } catch (actionError) {
        const message = redactCommunityError(actionError);
        setError(message);
        throw actionError;
      } finally {
        setPendingAction(null);
      }
    },
    [],
  );

  const publishPost = useCallback(
    async (draft: CommunityPostDraft): Promise<CommunityPost> =>
      run("publish-post", async () => {
        analytics?.track("community_post_publish_attempt", {
          boardType: draft.boardType,
          moderationStatus: service.previewPost(draft).moderationStatus,
        });
        const response = await service.publishPost(draft);
        const post = parseCommunityPost(communityResponseData(response));
        store.upsertPost(post);
        analytics?.track("community_post_publish_result", {
          boardType: post.boardType,
          moderationStatus: post.moderationStatus,
          result: "success",
        });
        return post;
      }),
    [analytics, run, service, store],
  );

  const updatePost = useCallback(
    async (postId: string, draft: CommunityPostDraft): Promise<CommunityPost> =>
      run(`update-post:${postId}`, async () => {
        const response = await service.updatePost(postId, draft);
        const post = parseCommunityPost(communityResponseData(response));
        store.upsertPost(post);
        return post;
      }),
    [run, service, store],
  );

  const deletePost = useCallback(
    async (postId: string): Promise<void> => {
      await run(`delete-post:${postId}`, async () => {
        await service.deletePost(postId);
        store.removePost(postId);
        analytics?.track("community_post_reaction", {
          action: "delete",
          result: "success",
        });
      });
    },
    [analytics, run, service, store],
  );

  const setPostLiked = useCallback(
    async (postId: string, liked: boolean): Promise<void> => {
      await run(`like-post:${postId}`, async () => {
        const response = await service.setPostLiked(postId, liked);
        const data = communityResponseData(response);
        const current = store
          .getState()
          .feed.items.find((post) => post.id === postId);
        if (
          current &&
          typeof data === "object" &&
          data !== null &&
          "likeCount" in data &&
          typeof data.likeCount === "number" &&
          Number.isSafeInteger(data.likeCount) &&
          data.likeCount >= 0
        ) {
          store.upsertPost({ ...current, likeCount: data.likeCount });
        }
        analytics?.track("community_post_reaction", {
          action: liked ? "like" : "unlike",
          result: "success",
        });
      });
    },
    [analytics, run, service, store],
  );

  const setCommentLiked = useCallback(
    async (
      postId: string,
      commentId: string,
      liked: boolean,
    ): Promise<void> => {
      await run(`like-comment:${commentId}`, async () => {
        const response = await service.setCommentLiked(commentId, liked);
        const data = communityResponseData(response);
        const current = store
          .getState()
          .commentsByPostId[
            postId
          ]?.find((comment) => comment.id === commentId);
        if (
          current &&
          typeof data === "object" &&
          data !== null &&
          "likeCount" in data &&
          typeof data.likeCount === "number" &&
          Number.isSafeInteger(data.likeCount) &&
          data.likeCount >= 0
        ) {
          store.upsertComment({
            ...current,
            likedByMe: liked,
            likeCount: data.likeCount,
          });
        }
        analytics?.track("community_post_reaction", {
          action: liked ? "like" : "unlike",
          result: "success",
        });
      });
    },
    [analytics, run, service, store],
  );

  const createComment = useCallback(
    async (postId: string, draft: CommunityCommentDraft): Promise<void> => {
      await run(`create-comment:${postId}`, async () => {
        const response = await service.createComment(postId, draft);
        store.upsertComment(
          parseCommunityComment(communityResponseData(response)),
        );
        analytics?.track("community_comment_publish_result", {
          result: "success",
        });
      });
    },
    [analytics, run, service, store],
  );

  const updateComment = useCallback(
    async (commentId: string, draft: CommunityCommentDraft): Promise<void> => {
      await run(`update-comment:${commentId}`, async () => {
        const response = await service.updateComment(commentId, draft);
        store.upsertComment(
          parseCommunityComment(communityResponseData(response)),
        );
      });
    },
    [run, service, store],
  );

  const deleteComment = useCallback(
    async (postId: string, commentId: string): Promise<void> => {
      await run(`delete-comment:${commentId}`, async () => {
        await service.deleteComment(commentId);
        store.removeComment(postId, commentId);
      });
    },
    [run, service, store],
  );

  const reportPost = useCallback(
    async (
      postId: string,
      reasonType: string,
      reason: string,
    ): Promise<void> => {
      await run(`report-post:${postId}`, async () => {
        try {
          await service.reportPost(postId, reasonType, reason);
          analytics?.track("community_report_result", {
            action: "report",
            result: "success",
          });
        } catch (reportError) {
          analytics?.track("community_report_result", {
            action: "report",
            result: "failure",
          });
          throw reportError;
        }
      });
    },
    [analytics, run, service],
  );

  const reportComment = useCallback(
    async (
      commentId: string,
      reasonType: string,
      reason: string,
    ): Promise<void> => {
      await run(`report-comment:${commentId}`, async () => {
        try {
          await service.reportComment(commentId, reasonType, reason);
          analytics?.track("community_report_result", {
            action: "report",
            result: "success",
          });
        } catch (reportError) {
          analytics?.track("community_report_result", {
            action: "report",
            result: "failure",
          });
          throw reportError;
        }
      });
    },
    [analytics, run, service],
  );

  return {
    pendingAction,
    error,
    publishPost,
    updatePost,
    deletePost,
    setPostLiked,
    setCommentLiked,
    createComment,
    updateComment,
    deleteComment,
    reportPost,
    reportComment,
  };
}
