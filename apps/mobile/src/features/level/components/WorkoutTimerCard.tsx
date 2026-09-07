import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { GrowthContentItem } from "../types";
import { ActivityFlowChecklist } from "./ActivityFlowChecklist";
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
    <SurfaceCard
      accessibilityLabel={`${content.title} 건강 루틴`}
      style={styles.card}
    >
      <View style={styles.row}>
        <Text style={styles.timer}>{content.estimatedMinutes}:00</Text>
        <Text style={styles.safe}>{safetyLabel(content.safetyLevel)}</Text>
      </View>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.notice}>통증이 있으면 즉시 중단하세요.</Text>
      <Text style={styles.notice}>
        의학적 진단이나 치료가 아니며 필요하면 전문가와 상담하세요.
      </Text>
      <ActivityFlowChecklist
        steps={[
          { label: "10분 루틴", value: content.missionPrompt },
          { label: "안전", value: safetyLabel(content.safetyLevel) },
          { label: "시작", value: "준비 후 시작" },
          {
            label: "진행",
            value: `${content.estimatedMinutes}:00`,
          },
          { label: "완료", value: "운동 완료 기록" },
          { label: "실제 시간", value: "수행 시간 저장" },
          { label: "메모", value: content.recordQuestion },
        ]}
      />
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
  card: {
    borderRadius: salaryHijackingDesignSystem.radius.xl,
    padding: componentSpacing.lg,
  },
  row: {
    alignItems: "center",
    backgroundColor: componentColors.primaryGreenSoft,
    borderRadius: componentRadius.card,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
    paddingHorizontal: componentSpacing.md,
    paddingVertical: componentSpacing.sm,
  },
  timer: {
    color: componentColors.primaryGreen,
    fontSize: typography.amountL.fontSize,
    fontWeight: typography.amountL.fontWeight,
  },
  safe: {
    backgroundColor: salaryHijackingDesignSystem.colors.surface.default,
    borderRadius: componentRadius.pill,
    color: componentColors.primaryGreen,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
    overflow: "hidden",
    paddingHorizontal: componentSpacing.sm,
    paddingVertical: componentSpacing.xs,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleL.fontSize,
    fontWeight: typography.titleL.fontWeight,
    lineHeight: typography.titleL.lineHeight,
  },
  notice: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  button: {
    minHeight: 52,
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

function safetyLabel(value: string): string {
  if (value === "BEGINNER_SAFE") return "초급";
  if (value === "GENERAL") return "일반";
  return value.replace(/_/gu, " ").toLowerCase();
}
