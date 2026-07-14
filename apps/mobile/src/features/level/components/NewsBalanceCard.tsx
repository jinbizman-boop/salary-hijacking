import { Pressable, StyleSheet, Text } from "react-native";

import { SurfaceCard, componentColors } from "../../../shared/components";
import type { GrowthContentItem } from "../types";
import { ContentPolicyPills } from "./ContentPolicyPills";

export type NewsBalanceCardProps = Readonly<{
  content: GrowthContentItem;
  onRecord: (content: GrowthContentItem) => void;
}>;

export function NewsBalanceCard({
  content,
  onRecord,
}: NewsBalanceCardProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel={`${content.title} 뉴스 균형 카드`}>
      <Text style={styles.label}>팩트 먼저 보기</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.summary}>{content.summary}</Text>
      <Text style={styles.viewpoint}>
        관점 태그 {content.viewpointTag ?? "FACT_BRIEF"}
      </Text>
      <ContentPolicyPills content={content} />
      <Pressable
        accessibilityLabel="기록하기"
        accessibilityRole="button"
        onPress={() => onRecord(content)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>생각 기록</Text>
      </Pressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  label: {
    color: componentColors.primaryGreenDark,
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  summary: {
    color: componentColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  viewpoint: {
    color: componentColors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  button: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  buttonText: {
    color: componentColors.primaryGreenDark,
    fontWeight: "900",
  },
});
