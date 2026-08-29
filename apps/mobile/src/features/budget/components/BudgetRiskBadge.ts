import { createElement } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import { BUDGET_RISK_LABELS } from "../constants";
import type { BudgetRiskLevel } from "../types";

const typography = salaryHijackingDesignSystem.typography;

export type BudgetRiskBadgeProps = Readonly<{
  riskLevel: BudgetRiskLevel;
  style?: StyleProp<ViewStyle>;
}>;

const COLORS: Readonly<
  Record<BudgetRiskLevel, Readonly<{ background: string; foreground: string }>>
> = {
  SAFE: {
    background: componentColors.primaryGreenSoft,
    foreground: componentColors.primaryGreenDark,
  },
  WATCH: {
    background: salaryHijackingDesignSystem.colors.semantic.warningSoft,
    foreground: componentColors.warningOrange,
  },
  WARNING: {
    background: salaryHijackingDesignSystem.colors.semantic.warningSoft,
    foreground: componentColors.warningOrange,
  },
  OVER: {
    background: salaryHijackingDesignSystem.colors.semantic.dangerSoft,
    foreground: componentColors.dangerRed,
  },
};

export function BudgetRiskBadge({
  riskLevel,
  style,
}: BudgetRiskBadgeProps): React.ReactElement {
  const colors = COLORS[riskLevel];
  return createElement(
    View,
    {
      accessibilityLabel: `예산 상태 ${BUDGET_RISK_LABELS[riskLevel]}`,
      accessibilityRole: "text",
      style: [styles.badge, { backgroundColor: colors.background }, style],
    },
    createElement(
      Text,
      { style: [styles.label, { color: colors.foreground }] },
      BUDGET_RISK_LABELS[riskLevel],
    ),
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: componentSpacing.sm,
    borderRadius: componentRadius.button,
  },
  label: {
    fontSize: typography.labelM.fontSize,
    fontWeight: typography.labelM.fontWeight,
  },
});
