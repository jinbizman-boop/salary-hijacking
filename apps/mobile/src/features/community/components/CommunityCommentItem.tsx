import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CommunityComment } from "../community.types";

export type CommunityCommentItemProps = Readonly<{
  comment: CommunityComment;
  canDelete?: boolean;
  onDelete?: (comment: CommunityComment) => void;
  onReport?: (comment: CommunityComment) => void;
}>;

export function CommunityCommentItem({
  comment,
  canDelete = false,
  onDelete,
  onReport,
}: CommunityCommentItemProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.author}>{comment.anonymousDisplayName}</Text>
        <Text style={styles.date}>{formatCommentDate(comment.createdAt)}</Text>
      </View>
      <Text style={styles.content}>{comment.content}</Text>
      <View style={styles.actions}>
        {onReport ? (
          <Pressable
            accessibilityLabel="댓글 신고"
            accessibilityRole="button"
            onPress={() => onReport(comment)}
          >
            <Text style={styles.actionLabel}>신고</Text>
          </Pressable>
        ) : null}
        {canDelete && onDelete ? (
          <Pressable
            accessibilityLabel="댓글 삭제"
            accessibilityRole="button"
            onPress={() => onDelete(comment)}
          >
            <Text style={styles.deleteLabel}>삭제</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function formatCommentDate(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  author: {
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "700",
  },
  date: {
    color: "#6B7280",
    fontSize: 11,
  },
  content: {
    color: "#111827",
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    minHeight: 28,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
  },
  actionLabel: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteLabel: {
    color: "#9B1C1C",
    fontSize: 12,
    fontWeight: "700",
  },
});
