import { StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentRadius,
  componentSpacing,
  formatKrwAmount,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { PlanCommitmentsSnapshot } from "../types";

const typography = salaryHijackingDesignSystem.typography;

export type PlanBreakdownSectionProps = Readonly<{
  snapshot: PlanCommitmentsSnapshot;
}>;

export function PlanBreakdownSection({
  snapshot,
}: PlanBreakdownSectionProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="plan-breakdown-section">
      <View style={styles.header}>
        <Text style={styles.title}>급여 계획</Text>
        <Text style={styles.guard}>개인 원문 없이 계획만 보여줘요</Text>
      </View>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>고정지출</Text>
          <Text style={styles.summaryValue}>
            {formatKrwAmount(snapshot.fixedExpenseTotalMinor)}
          </Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>고정저축</Text>
          <Text style={styles.summaryValue}>
            {formatKrwAmount(snapshot.fixedSavingsTotalMinor)}
          </Text>
        </View>
      </View>
      <View style={styles.list}>
        {snapshot.fixedExpenses.map((expense) => (
          <View
            accessibilityLabel={`${expense.title} ${formatKrwAmount(
              expense.amountMinor,
            )}`}
            key={expense.id}
            style={styles.row}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{expense.title}</Text>
              <Text style={styles.rowMeta}>{expense.dueLabel}</Text>
            </View>
            <Text style={styles.rowAmount}>
              {formatKrwAmount(expense.amountMinor)}
            </Text>
          </View>
        ))}
        {snapshot.savingsGoals.map((goal) => (
          <View
            accessibilityLabel={`${goal.title} ${formatKrwAmount(
              goal.fixedSaveAmountMinor,
            )}`}
            key={goal.id}
            style={styles.row}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{goal.title}</Text>
              <Text style={styles.rowMeta}>
                목표 {formatKrwAmount(goal.targetAmountMinor)}
              </Text>
            </View>
            <Text style={styles.rowAmount}>
              {formatKrwAmount(goal.fixedSaveAmountMinor)}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.guard}>금융 금액은 광고 타겟팅에 쓰지 않아요</Text>
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
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
  summaryBox: {
    flex: 1,
    gap: componentSpacing.xs,
    padding: componentSpacing.md,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  summaryLabel: {
    color: componentColors.primaryGreenDark,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  summaryValue: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
  list: {
    gap: componentSpacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.md,
    minHeight: 58,
    paddingVertical: componentSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: componentColors.line,
  },
  rowText: {
    flex: 1,
    gap: componentSpacing.xs,
  },
  rowTitle: {
    color: componentColors.textPrimary,
    fontSize: typography.labelL.fontSize,
    fontWeight: typography.labelL.fontWeight,
  },
  rowMeta: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  rowAmount: {
    color: componentColors.textPrimary,
    fontSize: typography.labelL.fontSize,
    fontWeight: typography.labelL.fontWeight,
  },
  guard: {
    color: componentColors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
});
