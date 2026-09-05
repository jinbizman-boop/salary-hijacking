import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { BudgetActionHint, BudgetViewModel } from "../types";
import { BudgetProgressBar } from "./BudgetProgressBar";
import { BudgetRiskBadge } from "./BudgetRiskBadge";
import { BudgetSkeleton } from "./BudgetSkeleton";
import { OverspendNotice } from "./OverspendNotice";
import { RemainingAmountCard } from "./RemainingAmountCard";

const typography = salaryHijackingDesignSystem.typography;
const elevation = salaryHijackingDesignSystem.elevation;

export type DailyBudgetCardProps = Readonly<{
  viewModel?: BudgetViewModel | null;
  hints?: readonly BudgetActionHint[];
  loading?: boolean;
  refreshing?: boolean;
  errorMessage?: string | null;
  staleMessage?: string | null;
  onRefresh?: () => void;
  onOpenPlan?: () => void;
  onOpenHint?: (hint: BudgetActionHint) => void;
}>;

export function DailyBudgetCard({
  viewModel = null,
  hints = [],
  loading = false,
  refreshing = false,
  errorMessage = null,
  staleMessage = null,
  onRefresh,
  onOpenPlan,
  onOpenHint,
}: DailyBudgetCardProps): React.ReactElement {
  if (loading && !viewModel) return <BudgetSkeleton />;

  if (!viewModel) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyTitle}>오늘 예산이 아직 없습니다</Text>
        <Text style={styles.emptyDescription}>
          급여 계획을 설정하면 서버가 오늘 사용할 예산을 계산합니다.
        </Text>
        {errorMessage ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {errorMessage}
          </Text>
        ) : null}
        {onRefresh ? (
          <Pressable
            accessibilityLabel="오늘 예산 다시 불러오기"
            accessibilityRole="button"
            accessibilityState={{ disabled: refreshing }}
            disabled={refreshing}
            onPress={onRefresh}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonLabel}>다시 불러오기</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <RemainingAmountCard
          lastSyncedLabel={viewModel.lastSyncedLabel}
          remainingLabel={viewModel.remainingLabel}
        />
        <BudgetRiskBadge riskLevel={viewModel.snapshot.riskLevel} />
      </View>

      <BudgetProgressBar
        riskLevel={viewModel.snapshot.riskLevel}
        usageRate={viewModel.snapshot.usageRate}
      />

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>오늘 예산</Text>
          <Text style={styles.metricValue}>{viewModel.dailyLimitLabel}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>사용 금액</Text>
          <Text style={styles.metricValue}>{viewModel.spentLabel}</Text>
        </View>
      </View>

      {staleMessage ? (
        <Text accessibilityRole="alert" style={styles.stale}>
          {staleMessage} 마지막 서버 값을 표시합니다.
        </Text>
      ) : null}

      {viewModel.overspentLabel ? (
        <OverspendNotice
          overspentLabel={viewModel.overspentLabel}
          {...(onOpenPlan ? { onOpenPlan } : {})}
        />
      ) : null}

      {hints.map((hint) => (
        <Pressable
          accessibilityLabel={hint.title}
          accessibilityRole={onOpenHint ? "button" : "text"}
          accessibilityState={{ disabled: !onOpenHint }}
          disabled={!onOpenHint}
          key={hint.id}
          onPress={() => onOpenHint?.(hint)}
          style={styles.hint}
        >
          <Text style={styles.hintTitle}>{hint.title}</Text>
          <Text style={styles.hintDescription}>{hint.description}</Text>
        </Pressable>
      ))}

      {onRefresh ? (
        <Pressable
          accessibilityLabel="오늘 예산 새로고침"
          accessibilityRole="button"
          accessibilityState={{ disabled: refreshing }}
          disabled={refreshing}
          onPress={onRefresh}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshButtonLabel}>
            {refreshing ? "동기화 중" : "새로고침"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: componentSpacing.md,
    padding: componentSpacing.lg,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surface,
    ...elevation.low,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
  },
  metrics: {
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
  metric: {
    flex: 1,
    gap: componentSpacing.xs,
    padding: componentSpacing.sm,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surfaceSoft,
  },
  metricLabel: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  metricValue: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
  stale: {
    color: componentColors.warningOrange,
    fontSize: typography.bodyS.fontSize,
    lineHeight: typography.bodyS.lineHeight,
  },
  error: {
    color: componentColors.dangerRed,
    fontSize: typography.bodyS.fontSize,
    lineHeight: typography.bodyS.lineHeight,
  },
  emptyTitle: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
  emptyDescription: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyS.fontSize,
    lineHeight: typography.bodyS.lineHeight,
  },
  hint: {
    gap: componentSpacing.xs,
    padding: componentSpacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: componentColors.primaryGreen,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  hintTitle: {
    color: componentColors.primaryGreenDark,
    fontSize: typography.labelM.fontSize,
    fontWeight: typography.labelM.fontWeight,
  },
  hintDescription: {
    color: componentColors.textSecondary,
    fontSize: typography.bodyS.fontSize,
    lineHeight: typography.bodyS.lineHeight,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: componentColors.primaryGreen,
    borderRadius: componentRadius.button,
  },
  secondaryButtonLabel: {
    color: componentColors.primaryGreen,
    fontSize: typography.labelM.fontSize,
    fontWeight: typography.labelM.fontWeight,
  },
  refreshButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.primaryGreen,
  },
  refreshButtonLabel: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
    fontSize: typography.labelM.fontSize,
    fontWeight: typography.labelM.fontWeight,
  },
});
