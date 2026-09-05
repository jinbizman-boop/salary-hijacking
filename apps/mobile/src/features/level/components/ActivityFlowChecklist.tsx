import { StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

const typography = salaryHijackingDesignSystem.typography;

export type ActivityFlowStep = Readonly<{
  label: string;
  value: string;
}>;

export type ActivityFlowChecklistProps = Readonly<{
  steps: readonly ActivityFlowStep[];
}>;

export function ActivityFlowChecklist({
  steps,
}: ActivityFlowChecklistProps): React.ReactElement {
  return (
    <View accessibilityLabel="LV UP 활동 기록 성장 흐름" style={styles.wrap}>
      {steps.map((step) => (
        <View key={`${step.label}:${step.value}`} style={styles.step}>
          <Text style={styles.label}>{step.label}</Text>
          <Text style={styles.value}>{step.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: componentColors.primaryGreenDark,
    flexShrink: 0,
    ...typography.labelS,
  },
  step: {
    alignItems: "center",
    flexDirection: "row",
    gap: componentSpacing.sm,
    minHeight: salaryHijackingDesignSystem.layout.touchTarget,
  },
  value: {
    color: componentColors.textSecondary,
    flex: 1,
    ...typography.bodyS,
  },
  wrap: {
    backgroundColor: componentColors.surfaceSoft,
    borderColor: salaryHijackingDesignSystem.colors.border.soft,
    borderRadius: componentRadius.card,
    borderWidth: 1,
    gap: componentSpacing.xs,
    paddingHorizontal: componentSpacing.md,
    paddingVertical: componentSpacing.sm,
  },
});
