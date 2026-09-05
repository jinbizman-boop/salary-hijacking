import { StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { CommunityAttachment } from "../community.types";

const typography = salaryHijackingDesignSystem.typography;

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
    gap: componentSpacing.sm,
  },
  item: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
    paddingHorizontal: componentSpacing.sm,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.card,
  },
  name: {
    flex: 1,
    color: componentColors.textPrimary,
    fontSize: typography.bodyS.fontSize,
  },
  clean: {
    color: componentColors.primaryGreenDark,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  pending: {
    color: componentColors.warningOrange,
    fontSize: typography.bodyS.fontSize,
  },
  rejected: {
    color: componentColors.dangerRed,
    fontSize: typography.bodyS.fontSize,
  },
});
