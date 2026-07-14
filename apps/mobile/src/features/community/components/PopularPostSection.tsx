import { Pressable, StyleSheet, Text, View } from "react-native";

import { COMMUNITY_BOARD_LABELS } from "../community.constants";
import type { CommunityPost } from "../community.types";

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
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  card: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  pressed: {
    backgroundColor: "#F8FAFC",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  board: {
    color: "#176B5B",
    fontSize: 11,
    fontWeight: "900",
  },
  author: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
  },
  postTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  preview: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 20,
  },
  counts: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
  },
  guard: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
  },
});
