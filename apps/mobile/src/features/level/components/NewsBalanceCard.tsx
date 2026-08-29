import { Pressable, StyleSheet, Text } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentRadius,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { GrowthContentItem } from "../types";
import { ContentPolicyPills } from "./ContentPolicyPills";

const typography = salaryHijackingDesignSystem.typography;

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
    color: componentColors.primaryGreen,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
  summary: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyS.fontSize,
    lineHeight: typography.bodyS.lineHeight,
  },
  viewpoint: {
    color: componentColors.textPrimary,
    fontSize: typography.labelM.fontSize,
    fontWeight: typography.labelM.fontWeight,
  },
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.primaryGreen,
  },
  buttonText: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
    fontWeight: typography.labelM.fontWeight,
  },
});
