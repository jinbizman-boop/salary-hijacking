import { Pressable, StyleSheet, Text, View } from "react-native";

import { componentColors, componentRadius } from "../../../shared/components";
import type { CommunityPost } from "../community.types";
import { CommunityModerationBanner } from "./CommunityModerationBanner";

export type CommunityPostCardProps = Readonly<{
  post: CommunityPost;
  liked?: boolean;
  onPress: (post: CommunityPost) => void;
  onLike?: (post: CommunityPost, liked: boolean) => void;
}>;

export function CommunityPostCard({
  post,
  liked = false,
  onPress,
  onLike,
}: CommunityPostCardProps): React.ReactElement {
  return (
    <View style={styles.card}>
      {post.moderationStatus !== "SAFE" ? (
        <CommunityModerationBanner status={post.moderationStatus} />
      ) : null}
      <Pressable
        accessibilityLabel={`${post.title} 게시글 열기`}
        accessibilityRole="button"
        onPress={() => onPress(post)}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.meta}>
          <Text style={styles.author}>{post.anonymousDisplayName}</Text>
          <Text style={styles.board}>{post.boardType}</Text>
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {post.title}
        </Text>
        <Text numberOfLines={3} style={styles.preview}>
          {post.bodyPreview}
        </Text>
      </Pressable>
      <View style={styles.footer}>
        <Text style={styles.count}>댓글 {post.commentCount}</Text>
        {onLike ? (
          <Pressable
            accessibilityLabel={liked ? "좋아요 취소" : "좋아요"}
            accessibilityRole="button"
            accessibilityState={{ selected: liked }}
            onPress={() => onLike(post, !liked)}
            style={styles.likeButton}
          >
            <Text style={[styles.count, liked && styles.liked]}>
              좋아요 {post.likeCount}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.count}>좋아요 {post.likeCount}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surface,
    shadowColor: componentColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  body: {
    gap: 8,
    padding: 16,
  },
  pressed: {
    backgroundColor: componentColors.surfaceSoft,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  author: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  board: {
    color: componentColors.primaryGreen,
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  preview: {
    color: componentColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: componentColors.line,
  },
  likeButton: {
    minHeight: 36,
    justifyContent: "center",
  },
  count: {
    color: componentColors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  liked: {
    color: componentColors.dangerRed,
  },
});
