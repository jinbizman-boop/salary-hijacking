import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  PrimaryButton,
  ProgressBar,
  SurfaceCard,
  componentColors,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type {
  GrowthGoalCardViewModel,
  GrowthGoalDomain,
} from "../goal-architecture";

const designSystem = salaryHijackingDesignSystem;

export type LevelGoalCardProps = Readonly<{
  goal: GrowthGoalCardViewModel;
  onDetail: (domain: GrowthGoalDomain) => void;
  onEdit: (domain: GrowthGoalDomain) => void;
  onQuickComplete: (domain: GrowthGoalDomain) => void;
}>;

export function LevelGoalCard({
  goal,
  onDetail,
  onEdit,
  onQuickComplete,
}: LevelGoalCardProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel={`${goal.title} ${goal.sourceLabel}`}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text allowFontScaling={false} style={styles.source}>
            {goal.sourceLabel}
          </Text>
          <Text style={styles.title}>{goal.title}</Text>
        </View>
        <Text style={styles.streak}>{goal.streakLabel}</Text>
      </View>
      <Text style={styles.subtitle}>{goal.subtitle}</Text>
      <ProgressBar accessibilityLabel={`${goal.title} 목표 진행률`} value={0} />
      <Text style={styles.progress}>{goal.progressLabel}</Text>
      <View style={styles.actions}>
        <PrimaryButton
          accessibilityLabel={goal.detailCta}
          label={goal.detailCta}
          onPress={() => onDetail(goal.domain)}
        />
        <PrimaryButton
          accessibilityLabel={goal.quickCompleteCta}
          label={goal.quickCompleteCta}
          onPress={() => onQuickComplete(goal.domain)}
          variant="secondary"
        />
        <Pressable
          accessibilityLabel={goal.editCta}
          accessibilityRole="button"
          onPress={() => onEdit(goal.domain)}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.editText}>{goal.editCta}</Text>
        </Pressable>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: designSystem.spacing[2],
    paddingTop: designSystem.spacing[2],
  },
  editButton: {
    alignItems: "center",
    minHeight: designSystem.layout.touchTarget,
    justifyContent: "center",
  },
  editText: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: designSystem.spacing[3],
    justifyContent: "space-between",
  },
  pressed: {
    opacity: 0.82,
  },
  progress: {
    color: componentColors.textSecondary,
    ...designSystem.typography.caption,
  },
  source: {
    alignSelf: "flex-start",
    backgroundColor: componentColors.primaryGreenSoft,
    borderRadius: designSystem.radius.full,
    color: componentColors.primaryGreenDark,
    overflow: "hidden",
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: designSystem.spacing[1],
    ...designSystem.typography.labelS,
  },
  streak: {
    color: componentColors.textSecondary,
    ...designSystem.typography.labelS,
  },
  subtitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.bodyS,
  },
  title: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
  titleGroup: {
    flex: 1,
    gap: designSystem.spacing[1],
  },
});
