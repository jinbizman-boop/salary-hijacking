import { StyleSheet, Text, View } from "react-native";

import { componentColors, componentRadius } from "../../../shared/components";
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
    gap: 6,
  },
  pill: {
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.primaryGreenSoft,
    color: componentColors.primaryGreenDark,
    fontSize: 11,
    fontWeight: "900",
  },
});
