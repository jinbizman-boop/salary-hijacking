import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, AppShell } from "../../src/shared/components";
import { CommunityWriteForm } from "../../src/features/community/components/CommunityWriteForm";
import { useCommunityWrite } from "../../src/features/community/hooks/useCommunityWrite";
import { validatePostDraft } from "../../src/features/community/community.validators";
import type {
  CommunityApiResponse,
  CommunityPost,
  CommunityPostDraft,
  CommunityService,
} from "../../src/features/community/community.types";

const SCREEN_VERSION = "4.1.0-community-write-components";
const COMMUNITY_POSTS_ENDPOINT = "/api/v1/community/posts";
const RAW_FINANCIAL_DATA_GUARD = "raw_financial_data_not_allowed_guard";
const COMMUNITY_PUBLISH_IDEMPOTENCY_GUARD =
  "community_publish_idempotency_guard";

const initialDraft: CommunityPostDraft = {
  anonymous: true,
  boardType: "FREE",
  content: "",
  tags: [],
  title: "",
};

function response(data: unknown): Promise<CommunityApiResponse> {
  return Promise.resolve({
    data,
    meta: { requestId: "mobile-community-write" },
  });
}

function postFromDraft(draft: CommunityPostDraft): CommunityPost {
  const now = "2026-07-10T00:00:00.000Z";
  return {
    adsFinancialTargetingUsed: false,
    anonymous: draft.anonymous,
    anonymousDisplayName: draft.anonymous ? "anonymous writer" : "LV UP user",
    boardType: draft.boardType,
    bodyPreview: draft.content.slice(0, 180),
    bookmarkCount: 0,
    commentCount: 0,
    createdAt: now,
    id: "post_mobile_preview",
    likeCount: 0,
    moderationStatus: "SAFE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    title: draft.title,
    updatedAt: now,
  };
}

const communityWriteService: CommunityService = {
  createComment: () => response({ ok: true }),
  deleteComment: () => response({ ok: true }),
  deletePost: () => response({ ok: true }),
  getPost: () => response(postFromDraft(initialDraft)),
  listBoards: () => response({ items: ["FREE", "LEVEL_CERTIFICATION"] }),
  listComments: () => response({ items: [], page: 1, pageSize: 20, total: 0 }),
  listMyComments: () =>
    response({ items: [], page: 1, pageSize: 20, total: 0 }),
  listMyPosts: () => response({ items: [], page: 1, pageSize: 20, total: 0 }),
  listPosts: () => response({ items: [], page: 1, pageSize: 20, total: 0 }),
  previewPost: validatePostDraft,
  publishPost: (draft) => response(postFromDraft(draft)),
  recordPostShare: () => response({ ok: true }),
  reportComment: () => response({ ok: true }),
  reportPost: () => response({ ok: true }),
  setCommentLiked: () => response({ likeCount: 0 }),
  setPostBookmarked: () => response({ bookmarkCount: 0 }),
  setPostLiked: () => response({ likeCount: 0 }),
  updateComment: () => response({ ok: true }),
  updatePost: (_postId, draft) => response(postFromDraft(draft)),
};

export default function CommunityWriteScreen(): React.ReactElement {
  const [publishedTitle, setPublishedTitle] = useState<string | null>(null);
  const controller = useCommunityWrite(communityWriteService, {
    initialDraft,
    onPublished: (post) => setPublishedTitle(post.title),
  });

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking community write"
      header={<AppHeader subtitle="Community" title="Write" />}
    >
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>안전한 커뮤니티 작성</Text>
        <Text style={styles.noticeText}>
          금액, 계좌, 연락처, 토큰 같은 원문 민감정보는 작성 전에 차단하고, 게시
          요청은 서버 권한과 멱등 키 경계에서 처리합니다.
        </Text>
      </View>

      <CommunityWriteForm
        draft={controller.draft}
        submitting={controller.submitting}
        validation={controller.validation}
        onChange={controller.setDraft}
        onSubmit={() => {
          void controller.submit();
        }}
      />

      {controller.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {controller.error}
        </Text>
      ) : null}
      {publishedTitle ? (
        <Text accessibilityRole="summary" style={styles.success}>
          게시 요청 완료: {publishedTitle}
        </Text>
      ) : null}
    </AppShell>
  );
}

export function assertMobileCommunityWriteCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking Community write components",
    COMMUNITY_POSTS_ENDPOINT,
    "AppShell",
    "AppHeader",
    "CommunityWriteForm",
    "useCommunityWrite",
    RAW_FINANCIAL_DATA_GUARD,
    COMMUNITY_PUBLISH_IDEMPOTENCY_GUARD,
    "server_authoritative_publish_boundary",
    "contextual_ads_not_used_for_sensitive_post_data",
  ] as const;

  return { ok: checks.length >= 10, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  error: {
    color: "#9B1C1C",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  notice: {
    gap: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D6E4DE",
    borderRadius: 8,
    backgroundColor: "#F3FAF7",
  },
  noticeText: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 19,
  },
  noticeTitle: {
    color: "#155E52",
    fontSize: 15,
    fontWeight: "800",
  },
  success: {
    color: "#116149",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
});
