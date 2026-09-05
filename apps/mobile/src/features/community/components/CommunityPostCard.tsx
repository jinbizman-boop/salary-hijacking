import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { CommunityPost } from "../community.types";
import { CommunityModerationBanner } from "./CommunityModerationBanner";

const typography = salaryHijackingDesignSystem.typography;
const elevation = salaryHijackingDesignSystem.elevation;

export type CommunityPostCardProps = Readonly<{
  post: CommunityPost;
  liked?: boolean;
  onPress?: (post: CommunityPost) => void;
  onLike?: (post: CommunityPost, liked: boolean) => void;
}>;

export function CommunityPostCard({
  post,
  liked = false,
  onPress,
  onLike,
}: CommunityPostCardProps): React.ReactElement {
  const body = (
    <View style={styles.body}>
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
    </View>
  );

  return (
    <View style={styles.card}>
      {post.moderationStatus !== "SAFE" ? (
        <CommunityModerationBanner status={post.moderationStatus} />
      ) : null}
      {onPress ? (
        <Pressable
          accessibilityLabel={`${post.title} 게시글 열기`}
          accessibilityRole="button"
          onPress={() => onPress(post)}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}
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
  author: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
  board: {
    color: componentColors.primaryGreen,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  body: {
    gap: componentSpacing.sm,
    padding: componentSpacing.md,
  },
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surface,
    ...elevation.low,
  },
  count: {
    color: componentColors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
  footer: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: componentSpacing.md,
    paddingHorizontal: componentSpacing.md,
    borderTopWidth: 1,
    borderTopColor: componentColors.line,
  },
  likeButton: {
    minHeight: 36,
    justifyContent: "center",
  },
  liked: {
    color: componentColors.dangerRed,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
  },
  pressed: {
    backgroundColor: componentColors.surfaceSoft,
  },
  preview: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyS.fontSize,
    lineHeight: typography.bodyS.lineHeight,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
    lineHeight: typography.titleM.lineHeight,
  },
});
