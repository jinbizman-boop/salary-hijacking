import { Pressable, StyleSheet, Text, View } from "react-native";

import { salaryHijackingDesignSystem } from "../../../shared/components";
import { COMMUNITY_BOARD_LABELS } from "../community.constants";
import type { CommunityPost } from "../community.types";

const designSystem = salaryHijackingDesignSystem;

export type PopularPostSectionProps = Readonly<{
  posts: readonly CommunityPost[];
  onPressPost: (post: CommunityPost) => void;
}>;

export function PopularPostSection({
  posts,
  onPressPost,
}: PopularPostSectionProps): React.ReactElement {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>인기 게시글</Text>
        <Text style={styles.guard}>문맥형 추천</Text>
      </View>
      {posts.map((post) => (
        <Pressable
          accessibilityLabel={`${post.title} 게시글 열기`}
          accessibilityRole="button"
          key={post.id}
          onPress={() => onPressPost(post)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.meta}>
            <Text style={styles.board}>
              {COMMUNITY_BOARD_LABELS[post.boardType]}
            </Text>
            <Text style={styles.author}>{post.anonymousDisplayName}</Text>
          </View>
          <Text numberOfLines={2} style={styles.postTitle}>
            {post.title}
          </Text>
          <Text numberOfLines={2} style={styles.preview}>
            {post.bodyPreview}
          </Text>
          <Text style={styles.counts}>
            좋아요 {post.likeCount} · 댓글 {post.commentCount} · 저장{" "}
            {post.bookmarkCount}
          </Text>
        </Pressable>
      ))}
      <Text style={styles.guard}>민감 금액은 게시글에 표시하지 않아요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: designSystem.spacing[3],
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[3],
    justifyContent: "space-between",
  },
  title: {
    ...designSystem.typography.titleM,
    color: designSystem.colors.text.primary,
    fontFamily: designSystem.font.native.black,
  },
  card: {
    backgroundColor: designSystem.colors.surface.default,
    borderColor: designSystem.colors.border.default,
    borderRadius: designSystem.radius.md,
    borderWidth: 1,
    gap: designSystem.spacing[2],
    padding: designSystem.spacing[4],
  },
  pressed: {
    backgroundColor: designSystem.colors.surface.subtle,
  },
  meta: {
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[3],
    justifyContent: "space-between",
  },
  board: {
    ...designSystem.typography.labelS,
    color: designSystem.colors.brand.primaryPressed,
    fontFamily: designSystem.font.native.black,
  },
  author: {
    ...designSystem.typography.caption,
    color: designSystem.colors.text.secondary,
    fontFamily: designSystem.font.native.bold,
  },
  postTitle: {
    ...designSystem.typography.titleM,
    color: designSystem.colors.text.primary,
    fontFamily: designSystem.font.native.black,
  },
  preview: {
    ...designSystem.typography.bodyS,
    color: designSystem.colors.text.secondary,
  },
  counts: {
    ...designSystem.typography.caption,
    color: designSystem.colors.text.secondary,
    fontFamily: designSystem.font.native.bold,
  },
  guard: {
    ...designSystem.typography.caption,
    color: designSystem.colors.text.secondary,
    fontFamily: designSystem.font.native.bold,
  },
});
