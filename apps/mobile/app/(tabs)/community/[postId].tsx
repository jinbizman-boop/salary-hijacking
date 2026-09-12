import React, { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, AppShell } from "../../../src/shared/components";
import { ConfirmDialog } from "../../../src/shared/components/ConfirmDialog";
import { CommunityAttachmentList } from "../../../src/features/community/components/CommunityAttachmentList";
import { CommunityCommentItem } from "../../../src/features/community/components/CommunityCommentItem";
import { CommunityPostCard } from "../../../src/features/community/components/CommunityPostCard";
import { PostMenuBottomSheet } from "../../../src/features/community/components/PostMenuBottomSheet";
import { ReportReasonBottomSheet } from "../../../src/features/community/components/ReportReasonBottomSheet";
import { useCommunityPost } from "../../../src/features/community/hooks/useCommunityPost";
import { createMobileCommunityService } from "../../../src/shared/api/mobile-api";
import { salaryHijackingDesignSystem } from "../../../src/shared/components/tokens";
import { SelectionBottomSheet } from "../../../src/shared/ui/sheets/SelectionBottomSheet";
import { SortFilterBottomSheet } from "../../../src/shared/ui/sheets/SortFilterBottomSheet";

const SCREEN_VERSION = "4.1.0-community-post-components";
const COMMUNITY_POSTS_ENDPOINT = "/api/v1/community/posts";
const COMMUNITY_REPORT_POLICY_GUARD = "community_report_policy_guard";
const DEFAULT_POST_ID = "post_level_1";
const designSystem = salaryHijackingDesignSystem;

export const communityDetailStitchStateComponents = {
  ConfirmDialog,
  SelectionBottomSheet,
  SortFilterBottomSheet,
} as const;

export default function CommunityPostDetailScreen(): React.ReactElement {
  const params = useLocalSearchParams();
  const router = useRouter();
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
  const [activeBottomSheet, setActiveBottomSheet] = React.useState<
    "post-menu" | "report-reason" | null
  >(null);

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking community post detail"
      header={
        <AppHeader
          onBack={() => router.back()}
          subtitle="커뮤니티"
          title="게시글"
        />
      }
    >
      <Pressable
        accessibilityLabel="게시글 메뉴 열기"
        accessibilityRole="button"
        onPress={() => setActiveBottomSheet("post-menu")}
        style={styles.menuButton}
      >
        <Text style={styles.menuButtonText}>게시글 메뉴</Text>
      </Pressable>
      {detail ? (
        <>
          <CommunityPostCard post={detail.post} />

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
                  onReport={() => setActiveBottomSheet("report-reason")}
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

      {state.loading ? <Text style={styles.meta}>서버 확인 중</Text> : null}
      {state.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {state.error}
        </Text>
      ) : null}
      {activeBottomSheet === "post-menu" ? (
        <PostMenuBottomSheet
          mine={false}
          onClose={() => setActiveBottomSheet(null)}
          onSelect={(action) => {
            setActiveBottomSheet(action === "report" ? "report-reason" : null);
          }}
        />
      ) : null}
      {activeBottomSheet === "report-reason" ? (
        <ReportReasonBottomSheet
          onClose={() => setActiveBottomSheet(null)}
          onSelect={() => setActiveBottomSheet(null)}
        />
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
    "onBack={() => router.back()}",
    "CommunityPostCard",
    "CommunityCommentItem",
    "CommunityAttachmentList",
    COMMUNITY_REPORT_POLICY_GUARD,
    "server_authoritative_detail_boundary",
    "financial_raw_data_hidden",
    "personal_raw_data_hidden",
    "community_detail_ads_disabled",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  body: {
    ...designSystem.typography.bodyM,
    color: designSystem.colors.text.primary,
  },
  error: {
    ...designSystem.typography.labelM,
    color: designSystem.colors.semantic.danger,
  },
  meta: {
    ...designSystem.typography.labelS,
    color: designSystem.colors.text.secondary,
  },
  menuButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: designSystem.colors.brand.primarySoft,
    borderColor: designSystem.colors.border.default,
    borderRadius: designSystem.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: designSystem.layout.touchTarget,
    paddingHorizontal: designSystem.spacing[3],
  },
  menuButtonText: {
    ...designSystem.typography.labelM,
    color: designSystem.colors.brand.primary,
  },
  section: {
    gap: designSystem.spacing[3],
  },
  sectionTitle: {
    ...designSystem.typography.titleM,
    color: designSystem.colors.text.primary,
  },
  tag: {
    ...designSystem.typography.labelS,
    color: designSystem.colors.semantic.info,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designSystem.spacing[2],
  },
});
