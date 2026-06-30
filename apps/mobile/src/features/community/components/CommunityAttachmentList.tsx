import { StyleSheet, Text, View } from "react-native";

import type { CommunityAttachment } from "../community.types";

export type CommunityAttachmentListProps = Readonly<{
  attachments: readonly CommunityAttachment[];
}>;

export function CommunityAttachmentList({
  attachments,
}: CommunityAttachmentListProps): React.ReactElement | null {
  if (attachments.length === 0) return null;

  return (
    <View accessibilityLabel="첨부파일" style={styles.container}>
      {attachments.map((attachment) => {
        if (attachment.scanStatus === "REJECTED") {
          return (
            <Text key={attachment.id} style={styles.rejected}>
              안전 검사에서 제외된 첨부파일입니다.
            </Text>
          );
        }
        if (attachment.scanStatus === "PENDING") {
          return (
            <Text key={attachment.id} style={styles.pending}>
              {attachment.name} 안전 검사 중
            </Text>
          );
        }
        return (
          <View key={attachment.id} style={styles.item}>
            <Text numberOfLines={1} style={styles.name}>
              {attachment.name}
            </Text>
            <Text style={styles.clean}>검사 완료</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  item: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
  },
  name: {
    flex: 1,
    color: "#1F2937",
    fontSize: 13,
  },
  clean: {
    color: "#116149",
    fontSize: 12,
    fontWeight: "700",
  },
  pending: {
    color: "#7A4D00",
    fontSize: 13,
  },
  rejected: {
    color: "#9B1C1C",
    fontSize: 13,
  },
});
