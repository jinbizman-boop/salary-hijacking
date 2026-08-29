import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { GrowthContentItem } from "../types";
import { ContentPolicyPills } from "./ContentPolicyPills";

const typography = salaryHijackingDesignSystem.typography;

export type WorkoutTimerCardProps = Readonly<{
  content: GrowthContentItem;
  onRecord: (content: GrowthContentItem) => void;
}>;

export function WorkoutTimerCard({
  content,
  onRecord,
}: WorkoutTimerCardProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel={`${content.title} 건강 루틴`}>
      <View style={styles.row}>
        <Text style={styles.timer}>{content.estimatedMinutes}:00</Text>
        <Text style={styles.safe}>{content.safetyLevel}</Text>
      </View>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.notice}>통증이 있으면 즉시 중단하세요.</Text>
      <Text style={styles.notice}>
        의학적 진단이나 치료가 아니며 필요하면 전문가와 상담하세요.
      </Text>
      <ContentPolicyPills content={content} />
      <Pressable
        accessibilityLabel="기록하기"
        accessibilityRole="button"
        onPress={() => onRecord(content)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>운동 기록</Text>
      </Pressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
  },
  timer: {
    color: componentColors.primaryGreen,
    fontSize: typography.amountL.fontSize,
    fontWeight: typography.amountL.fontWeight,
  },
  safe: {
    color: componentColors.primaryGreen,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
  notice: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
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
