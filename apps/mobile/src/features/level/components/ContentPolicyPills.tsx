import { StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { GrowthContentItem } from "../types";

export type ContentPolicyPillsProps = Readonly<{
  content: GrowthContentItem;
}>;

export function ContentPolicyPills({
  content,
}: ContentPolicyPillsProps): React.ReactElement {
  const fullTextLabel = content.fullTextStored
    ? "원문 저장 확인 필요"
    : "원문 전체 저장 없음";
  return (
    <View style={styles.row}>
      <Text style={styles.pill}>{fullTextLabel}</Text>
      <Text style={styles.pill}>{content.licenseType}</Text>
      <Text style={styles.pill}>{content.xpReward} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: salaryHijackingDesignSystem.spacing[2],
  },
  pill: {
    overflow: "hidden",
    paddingHorizontal: salaryHijackingDesignSystem.spacing[3],
    paddingVertical: salaryHijackingDesignSystem.spacing[1],
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.primaryGreenSoft,
    color: componentColors.primaryGreenDark,
    ...salaryHijackingDesignSystem.typography.labelS,
  },
});
