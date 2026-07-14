import { Pressable, StyleSheet, Text, View } from "react-native";

import { SurfaceCard, componentColors } from "../../../shared/components";
import type { GrowthContentItem } from "../types";
import { ContentPolicyPills } from "./ContentPolicyPills";

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
    gap: 12,
  },
  timer: {
    color: componentColors.primaryGreenDark,
    fontSize: 26,
    fontWeight: "900",
  },
  safe: {
    color: componentColors.primaryGreenDark,
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  notice: {
    color: componentColors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
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
