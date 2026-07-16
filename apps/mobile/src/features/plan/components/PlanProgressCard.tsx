import { StyleSheet, Text, View } from "react-native";

import {
  MoneyText,
  ProgressBar,
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";

export type PlanProgressCardProps = Readonly<{
  title: string;
  currentAmountMinor: number;
  goalAmountMinor: number;
  completionPercent: number;
}>;

export function PlanProgressCard({
  title,
  currentAmountMinor,
  goalAmountMinor,
  completionPercent,
}: PlanProgressCardProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="plan-progress-card">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Plan</Text>
        <Text style={styles.guard}>서버 기준 저장</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <MoneyText amount={currentAmountMinor} />
      <ProgressBar accessibilityLabel="목표 달성률" value={completionPercent} />
      <View style={styles.footer}>
        <Text style={styles.caption}>목표금액</Text>
        <MoneyText amount={goalAmountMinor} muted />
      </View>
      <Text style={styles.guard}>민감 금액은 광고에 쓰지 않아요</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
  },
  eyebrow: {
    color: componentColors.primaryGreen,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 26,
    fontWeight: "900",
  },
  footer: {
    gap: componentSpacing.xs,
  },
  caption: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  guard: {
    color: componentColors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
});
