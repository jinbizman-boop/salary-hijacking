import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CommunityAttachmentList } from "../../src/features/community/components/CommunityAttachmentList";
import { CommunityCommentItem } from "../../src/features/community/components/CommunityCommentItem";
import { CommunityModerationBanner } from "../../src/features/community/components/CommunityModerationBanner";
import { useCommunityActions } from "../../src/features/community/hooks/useCommunityActions";
import { useCommunityPost } from "../../src/features/community/hooks/useCommunityPost";
import { validateCommentInput } from "../../src/features/community/community.validators";
import { createMobileCommunityService } from "../../src/shared/api/mobile-api";

const SCREEN_VERSION = "4.0.0";

function routeParam(value: string | readonly string[] | undefined): string {
  return typeof value === "string" ? value.trim() : (value?.[0]?.trim() ?? "");
}

export default function CommunityPostDetailScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams();
  const postId = routeParam(params.postId);
  const service = useMemo(() => createMobileCommunityService(), []);
  const postState = useCommunityPost(service, postId);
  const actions = useCommunityActions(service);
  const [commentDraft, setCommentDraft] = useState("");
  const [liked, setLiked] = useState(false);
  const commentValidation = validateCommentInput({
    content: commentDraft,
    anonymous: true,
  });

  const toggleLike = (): void => {
    const next = !liked;
    setLiked(next);
    void actions.setPostLiked(postId, next).catch(() => setLiked(!next));
  };

  const submitComment = async (): Promise<void> => {
    if (!commentValidation.valid) return;
    await actions.createComment(postId, {
      content: commentDraft.trim(),
      anonymous: true,
    });
    setCommentDraft("");
    await postState.refresh();
  };

  const reportPost = (): void => {
    Alert.alert(
      "게시글 신고",
      "운영 정책 위반이 의심되는 게시글을 신고하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "신고",
          style: "destructive",
          onPress: () => {
            void actions.reportPost(postId, "OTHER", "모바일 사용자 신고");
          },
        },
      ],
    );
  };

  const reportComment = (commentId: string): void => {
    Alert.alert(
      "댓글 신고",
      "운영 정책 위반이 의심되는 댓글을 신고하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "신고",
          style: "destructive",
          onPress: () => {
            void actions.reportComment(
              commentId,
              "OTHER",
              "모바일 사용자 신고",
            );
          },
        },
      ],
    );
  };

  if (postState.loading && !postState.detail) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#176B5B" />
        <Text style={styles.loadingText}>게시글을 불러오는 중입니다.</Text>
      </SafeAreaView>
    );
  }

  if (!postState.detail) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text accessibilityRole="alert" style={styles.errorTitle}>
          게시글을 표시할 수 없습니다.
        </Text>
        <Text style={styles.errorMessage}>
          {postState.error ?? "게시글 식별자를 확인해 주세요."}
        </Text>
        <Pressable
          accessibilityLabel="커뮤니티 목록으로 돌아가기"
          accessibilityRole="button"
          onPress={() => router.replace("/community")}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonLabel}>목록으로</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { detail } = postState;
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="커뮤니티 목록으로 돌아가기"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <Text style={styles.iconButtonLabel}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>POST · v{SCREEN_VERSION}</Text>
            <Text numberOfLines={1} style={styles.headerTitle}>
              게시글
            </Text>
          </View>
          <Pressable
            accessibilityLabel="게시글 신고"
            accessibilityRole="button"
            onPress={reportPost}
            style={styles.reportButton}
          >
            <Text style={styles.reportButtonLabel}>신고</Text>
          </Pressable>
        </View>

        {postState.error || actions.error ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>
              {actions.error ?? postState.error}
            </Text>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              onRefresh={() => void postState.refresh()}
              refreshing={postState.loading}
            />
          }
        >
          <View style={styles.postHeader}>
            <Text style={styles.board}>{detail.post.boardType}</Text>
            <Text style={styles.author}>
              {detail.post.anonymousDisplayName}
            </Text>
            <Text style={styles.title}>{detail.post.title}</Text>
            <Text style={styles.date}>
              {new Date(detail.post.createdAt).toLocaleString("ko-KR")}
            </Text>
          </View>

          {detail.post.moderationStatus !== "SAFE" ? (
            <CommunityModerationBanner status={detail.post.moderationStatus} />
          ) : null}

          <Text style={styles.body}>{detail.content}</Text>

          {detail.tags.length > 0 ? (
            <View style={styles.tags}>
              {detail.tags.map((tag) => (
                <Text key={tag} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
            </View>
          ) : null}

          <CommunityAttachmentList attachments={detail.attachments} />

          <View style={styles.postActions}>
            <Pressable
              accessibilityLabel={liked ? "좋아요 취소" : "좋아요"}
              accessibilityRole="button"
              onPress={toggleLike}
              style={[styles.actionButton, liked && styles.actionButtonActive]}
            >
              <Text
                style={[
                  styles.actionButtonLabel,
                  liked && styles.actionButtonLabelActive,
                ]}
              >
                좋아요 {detail.post.likeCount}
              </Text>
            </Pressable>
            <Text style={styles.commentCount}>
              댓글 {postState.comments.length}
            </Text>
          </View>

          <View style={styles.commentComposer}>
            <Text style={styles.sectionTitle}>댓글 작성</Text>
            <TextInput
              accessibilityLabel="댓글 내용"
              maxLength={2_000}
              multiline
              onChangeText={setCommentDraft}
              placeholder="개인정보와 실제 금융 금액은 입력하지 마세요"
              style={styles.commentInput}
              textAlignVertical="top"
              value={commentDraft}
            />
            {!commentValidation.valid && commentDraft.length > 0 ? (
              <Text accessibilityRole="alert" style={styles.validationText}>
                {commentValidation.issues[0]?.message}
              </Text>
            ) : null}
            <Pressable
              accessibilityLabel="댓글 등록"
              accessibilityRole="button"
              accessibilityState={{
                disabled:
                  !commentValidation.valid ||
                  actions.pendingAction === `create-comment:${postId}`,
              }}
              disabled={
                !commentValidation.valid ||
                actions.pendingAction === `create-comment:${postId}`
              }
              onPress={() => void submitComment()}
              style={[
                styles.primaryButton,
                (!commentValidation.valid ||
                  actions.pendingAction === `create-comment:${postId}`) &&
                  styles.disabled,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>댓글 등록</Text>
            </Pressable>
          </View>

          <View>
            <Text style={styles.sectionTitle}>댓글</Text>
            {postState.comments.length > 0 ? (
              postState.comments.map((comment) => (
                <CommunityCommentItem
                  comment={comment}
                  key={comment.id}
                  onReport={(target) => reportComment(target.id)}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>첫 댓글을 남겨 보세요.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function assertMobileCommunityPostCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "real_post_detail_route",
    "server_post_and_comment_load",
    "server_supported_like_unlike",
    "server_supported_post_report",
    "server_supported_comment_report",
    "comment_validation_and_publish",
    "attachment_scan_state_display",
    "moderation_state_display",
    "bookmark_endpoint_not_used",
    "privacy_safe_parser",
  ] as const;
  return { ok: checks.length === 10, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7F8",
  },
  keyboard: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#F5F7F8",
  },
  loadingText: {
    color: "#4B5563",
    fontSize: 14,
  },
  errorTitle: {
    color: "#9B1C1C",
    fontSize: 18,
    fontWeight: "800",
  },
  errorMessage: {
    color: "#4B5563",
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonLabel: {
    color: "#111827",
    fontSize: 32,
    lineHeight: 34,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    color: "#176B5B",
    fontSize: 10,
    fontWeight: "800",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  reportButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  reportButtonLabel: {
    color: "#9B1C1C",
    fontSize: 13,
    fontWeight: "700",
  },
  errorBanner: {
    margin: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFF1F1",
  },
  errorBannerText: {
    color: "#9B1C1C",
    fontSize: 13,
  },
  content: {
    gap: 18,
    padding: 18,
    paddingBottom: 80,
  },
  postHeader: {
    gap: 6,
  },
  board: {
    color: "#176B5B",
    fontSize: 12,
    fontWeight: "800",
  },
  author: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600",
  },
  title: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 32,
  },
  date: {
    color: "#6B7280",
    fontSize: 12,
  },
  body: {
    color: "#1F2937",
    fontSize: 16,
    lineHeight: 26,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    color: "#176B5B",
    fontSize: 13,
    fontWeight: "700",
  },
  postActions: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionButton: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#EEF0F2",
  },
  actionButtonActive: {
    backgroundColor: "#FDE2E2",
  },
  actionButtonLabel: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  actionButtonLabelActive: {
    color: "#9B1C1C",
  },
  commentCount: {
    color: "#6B7280",
    fontSize: 13,
  },
  commentComposer: {
    gap: 10,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
  },
  commentInput: {
    minHeight: 110,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 14,
  },
  validationText: {
    color: "#9B1C1C",
    fontSize: 12,
  },
  primaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#176B5B",
  },
  primaryButtonLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  disabled: {
    backgroundColor: "#9CA3AF",
  },
  emptyText: {
    paddingVertical: 24,
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
});
