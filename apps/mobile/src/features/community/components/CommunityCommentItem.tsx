import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  salaryHijackingDesignSystem,
} from "../../../shared/components/tokens";
import type { CommunityComment } from "../community.types";

const designSystem = salaryHijackingDesignSystem;

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
    gap: designSystem.spacing[2],
    paddingVertical: designSystem.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: componentColors.line,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: designSystem.spacing[3],
  },
  author: {
    color: componentColors.textPrimary,
    ...designSystem.typography.labelM,
  },
  date: {
    color: componentColors.textSecondary,
    ...designSystem.typography.caption,
  },
  content: {
    color: componentColors.textPrimary,
    ...designSystem.typography.bodyS,
  },
  actions: {
    minHeight: designSystem.layout.touchTarget,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: designSystem.spacing[4],
  },
  actionLabel: {
    color: componentColors.textSecondary,
    ...designSystem.typography.labelS,
  },
  deleteLabel: {
    color: designSystem.colors.semantic.dangerStrong,
    ...designSystem.typography.labelS,
  },
});
