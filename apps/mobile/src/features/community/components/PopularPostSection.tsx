import { Pressable, StyleSheet, Text, View } from "react-native";

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
        <Text style={styles.title}>Popular posts</Text>
        <Text style={styles.guard}>adsFinancialTargetingUsed=false</Text>
      </View>
      {posts.map((post) => (
        <Pressable
          accessibilityLabel={`${post.title} open post`}
          accessibilityRole="button"
          key={post.id}
          onPress={() => onPressPost(post)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.meta}>
            <Text style={styles.board}>{post.boardType}</Text>
            <Text style={styles.author}>{post.anonymousDisplayName}</Text>
          </View>
          <Text numberOfLines={2} style={styles.postTitle}>
            {post.title}
          </Text>
          <Text numberOfLines={2} style={styles.preview}>
            {post.bodyPreview}
          </Text>
          <Text style={styles.counts}>
            likes {post.likeCount} · comments {post.commentCount} · bookmarks{" "}
            {post.bookmarkCount}
          </Text>
        </Pressable>
      ))}
      <Text style={styles.guard}>rawFinancialDataExposed=false</Text>
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
