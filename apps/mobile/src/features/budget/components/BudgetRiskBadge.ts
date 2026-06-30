import { createElement } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { BUDGET_RISK_LABELS } from "../constants";
import type { BudgetRiskLevel } from "../types";

export type BudgetRiskBadgeProps = Readonly<{
  riskLevel: BudgetRiskLevel;
  style?: StyleProp<ViewStyle>;
}>;

const COLORS: Readonly<
  Record<BudgetRiskLevel, Readonly<{ background: string; foreground: string }>>
> = {
  SAFE: { background: "#E3F5EC", foreground: "#116149" },
  WATCH: { background: "#FFF4CE", foreground: "#7A4D00" },
  WARNING: { background: "#FDE8D7", foreground: "#9A3B00" },
  OVER: { background: "#FDE2E2", foreground: "#9B1C1C" },
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
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
});
