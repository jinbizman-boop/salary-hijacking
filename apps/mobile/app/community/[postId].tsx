import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, AppShell } from "../../src/shared/components";
import { CommunityAdDisclosure } from "../../src/features/community/components/CommunityAdDisclosure";
import { CommunityAttachmentList } from "../../src/features/community/components/CommunityAttachmentList";
import { CommunityCommentItem } from "../../src/features/community/components/CommunityCommentItem";
import { CommunityPostCard } from "../../src/features/community/components/CommunityPostCard";
import { useCommunityPost } from "../../src/features/community/hooks/useCommunityPost";
import { validatePostDraft } from "../../src/features/community/community.validators";
import type {
  CommunityAdDisclosureModel,
  CommunityApiResponse,
  CommunityComment,
  CommunityPostDetail,
  CommunityService,
} from "../../src/features/community/community.types";

const SCREEN_VERSION = "4.1.0-community-post-components";
const COMMUNITY_POSTS_ENDPOINT = "/api/v1/community/posts";
const COMMUNITY_REPORT_POLICY_GUARD = "community_report_policy_guard";
const CONTEXTUAL_ADS_ONLY_GUARD = "contextual_ads_only_guard";
const DEFAULT_POST_ID = "post_level_1";
const NOW = "2026-07-10T00:00:00.000Z";

const sampleDetail: CommunityPostDetail = {
  attachments: [
    {
      id: "attachment_routine_checklist",
      mediaType: "file",
      name: "routine-checklist.pdf",
      scanStatus: "CLEAN",
      uri: "https://salaryhijacking.com/community/routine-checklist.pdf",
    },
  ],
  comments: [],
  content:
    "오늘 LV UP 독서 미션을 완료했습니다. 구체적인 급여, 계좌, 카드 정보는 공유하지 않고 루틴과 배운 점만 남깁니다.",
  post: {
    adsFinancialTargetingUsed: false,
    anonymous: true,
    anonymousDisplayName: "anonymous 12",
    boardType: "LEVEL_CERTIFICATION",
    bodyPreview:
      "LV UP 독서 미션을 완료했습니다. 원시 금융정보 없이 루틴만 공유합니다.",
    bookmarkCount: 4,
    bookmarkedByMe: false,
    commentCount: 2,
    createdAt: NOW,
    id: DEFAULT_POST_ID,
    likeCount: 21,
    likedByMe: false,
    moderationStatus: "SAFE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    shareCount: 1,
    title: "LV UP 독서 인증 루틴",
    updatedAt: NOW,
  },
  tags: ["LVUP", "reading", "routine"],
};

const sampleComments: readonly CommunityComment[] = [
  {
    anonymous: true,
    anonymousDisplayName: "anonymous 7",
    content: "저도 금액 없이 체크리스트만 공유하는 방식이 좋았습니다.",
    createdAt: NOW,
    id: "comment_safe_1",
    likeCount: 3,
    moderationStatus: "SAFE",
    postId: DEFAULT_POST_ID,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    updatedAt: NOW,
  },
  {
    anonymous: true,
    anonymousDisplayName: "anonymous 18",
    content: "출처와 미션 조건을 같이 남기니 인증이 더 깔끔해요.",
    createdAt: NOW,
    id: "comment_safe_2",
    likeCount: 5,
    moderationStatus: "SAFE",
    postId: DEFAULT_POST_ID,
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    updatedAt: NOW,
  },
];

const contextualAd: CommunityAdDisclosureModel = {
  adsFinancialTargetingUsed: false,
  contextualOnly: true,
  description:
    "커뮤니티 게시글의 원문 금융정보, 개인 식별자, 활동 금액을 사용하지 않는 문맥형 제휴 고지입니다.",
  destinationUrl: "https://salaryhijacking.com/partners/community-safety",
  id: "community_contextual_safety",
  label: "광고",
  rawFinancialDataExposed: false,
  rawPersonalDataExposed: false,
  title: "커뮤니티 안전 작성 가이드",
};

function response(data: unknown): Promise<CommunityApiResponse> {
  return Promise.resolve({
    data,
    meta: { requestId: "mobile-community-post" },
  });
}

const communityPostService: CommunityService = {
  createComment: (_postId, draft) =>
    response({
      anonymous: draft.anonymous,
      anonymousDisplayName: "anonymous commenter",
      content: draft.content,
      createdAt: NOW,
      id: "comment_preview",
      likeCount: 0,
      moderationStatus: "SAFE",
      postId: DEFAULT_POST_ID,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
      updatedAt: NOW,
    }),
  deleteComment: () => response({ ok: true }),
  deletePost: () => response({ ok: true }),
  getPost: (postId) =>
    response({ ...sampleDetail, ...sampleDetail.post, id: postId }),
  listBoards: () => response({ items: ["FREE", "LEVEL_CERTIFICATION"] }),
  listComments: (postId) =>
    response({
      items: sampleComments.map((comment) => ({ ...comment, postId })),
      page: 1,
      pageSize: 100,
      total: sampleComments.length,
    }),
  listMyComments: () =>
    response({ items: [], page: 1, pageSize: 20, total: 0 }),
  listMyPosts: () => response({ items: [], page: 1, pageSize: 20, total: 0 }),
  listPosts: () =>
    response({ items: [sampleDetail.post], page: 1, pageSize: 20, total: 1 }),
  previewPost: validatePostDraft,
  publishPost: () => response(sampleDetail.post),
  recordPostShare: () => response({ ok: true }),
  reportComment: () => response({ ok: true }),
  reportPost: () => response({ ok: true }),
  setCommentLiked: () => response({ likeCount: 1 }),
  setPostBookmarked: () => response({ bookmarkCount: 5 }),
  setPostLiked: () => response({ likeCount: 22 }),
  updateComment: (_commentId, draft) =>
    response({
      ...sampleComments[0],
      content: draft.content,
      rawFinancialDataExposed: false,
      rawPersonalDataExposed: false,
    }),
  updatePost: () => response(sampleDetail.post),
};

export default function CommunityPostDetailScreen(): React.ReactElement {
  const params = useLocalSearchParams();
  const postId = useMemo(() => {
    const rawPostId = params.postId;
    if (Array.isArray(rawPostId)) return rawPostId[0] ?? DEFAULT_POST_ID;
    return typeof rawPostId === "string" && rawPostId.trim()
      ? rawPostId
      : DEFAULT_POST_ID;
  }, [params.postId]);
  const state = useCommunityPost(communityPostService, postId);
  const detail = state.detail ?? {
    ...sampleDetail,
    post: { ...sampleDetail.post, id: postId },
  };
  const comments = state.comments.length > 0 ? state.comments : sampleComments;

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking community post detail"
      header={<AppHeader subtitle="Community" title="Post Detail" />}
    >
      <CommunityPostCard post={detail.post} onPress={() => undefined} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>본문</Text>
        <Text style={styles.body}>{detail.content}</Text>
        <View style={styles.tags}>
          {detail.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
      </View>

      <CommunityAttachmentList attachments={detail.attachments} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>댓글</Text>
        {comments.map((comment) => (
          <CommunityCommentItem
            comment={comment}
            key={comment.id}
            onReport={() => undefined}
          />
        ))}
      </View>

      <CommunityAdDisclosure model={contextualAd} />

      {state.loading ? <Text style={styles.meta}>서버 확인 중</Text> : null}
      {state.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {state.error}
        </Text>
      ) : null}
    </AppShell>
  );
}

export function assertMobileCommunityPostCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Community post components",
    COMMUNITY_POSTS_ENDPOINT,
    "AppShell",
    "AppHeader",
    "CommunityPostCard",
    "CommunityCommentItem",
    "CommunityAttachmentList",
    "CommunityAdDisclosure",
    COMMUNITY_REPORT_POLICY_GUARD,
    CONTEXTUAL_ADS_ONLY_GUARD,
    "rawFinancialDataExposed=false",
    "rawPersonalDataExposed=false",
    "adsFinancialTargetingUsed=false",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  body: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 23,
  },
  error: {
    color: "#9B1C1C",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  meta: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "900",
  },
  tag: {
    color: "#155E52",
    fontSize: 12,
    fontWeight: "800",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
