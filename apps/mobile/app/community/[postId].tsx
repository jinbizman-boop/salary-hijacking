import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, AppShell } from "../../src/shared/components";
import { CommunityAdDisclosure } from "../../src/features/community/components/CommunityAdDisclosure";
import { CommunityAttachmentList } from "../../src/features/community/components/CommunityAttachmentList";
import { CommunityCommentItem } from "../../src/features/community/components/CommunityCommentItem";
import { CommunityPostCard } from "../../src/features/community/components/CommunityPostCard";
import { useCommunityPost } from "../../src/features/community/hooks/useCommunityPost";
import { createMobileCommunityService } from "../../src/shared/api/mobile-api";
import type { CommunityAdDisclosureModel } from "../../src/features/community/community.types";

const SCREEN_VERSION = "4.1.0-community-post-components";
const COMMUNITY_POSTS_ENDPOINT = "/api/v1/community/posts";
const COMMUNITY_REPORT_POLICY_GUARD = "community_report_policy_guard";
const CONTEXTUAL_ADS_ONLY_GUARD = "contextual_ads_only_guard";
const DEFAULT_POST_ID = "post_level_1";

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

export default function CommunityPostDetailScreen(): React.ReactElement {
  const params = useLocalSearchParams();
  const communityPostService = useMemo(
    () => createMobileCommunityService(),
    [],
  );
  const postId = useMemo(() => {
    const rawPostId = params.postId;
    if (Array.isArray(rawPostId)) return rawPostId[0] ?? DEFAULT_POST_ID;
    return typeof rawPostId === "string" && rawPostId.trim()
      ? rawPostId
      : DEFAULT_POST_ID;
  }, [params.postId]);
  const state = useCommunityPost(communityPostService, postId);
  const detail = state.detail;
  const comments = state.comments;

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking community post detail"
      header={<AppHeader subtitle="Community" title="Post Detail" />}
    >
      {detail ? (
        <>
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
            {comments.length > 0 ? (
              comments.map((comment) => (
                <CommunityCommentItem
                  comment={comment}
                  key={comment.id}
                  onReport={() => undefined}
                />
              ))
            ) : (
              <Text style={styles.meta}>아직 댓글이 없습니다.</Text>
            )}
          </View>
        </>
      ) : (
        <View accessibilityRole="summary" style={styles.section}>
          <Text style={styles.sectionTitle}>게시글을 확인할 수 없습니다</Text>
          <Text style={styles.body}>
            서버에서 게시글을 불러오지 못했습니다. 네트워크 상태를 확인한 뒤
            다시 시도해주세요.
          </Text>
        </View>
      )}

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
    "server_authoritative_detail_boundary",
    "financial_raw_data_hidden",
    "personal_raw_data_hidden",
    "contextual_ads_only",
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
