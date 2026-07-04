import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BudgetActionHint, BudgetViewModel } from "../types";
import { BudgetProgressBar } from "./BudgetProgressBar";
import { BudgetRiskBadge } from "./BudgetRiskBadge";
import { BudgetSkeleton } from "./BudgetSkeleton";
import { OverspendNotice } from "./OverspendNotice";
import { RemainingAmountCard } from "./RemainingAmountCard";

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
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  metrics: {
    flexDirection: "row",
    gap: 12,
  },
  metric: {
    flex: 1,
    gap: 3,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F5F7F8",
  },
  metricLabel: {
    color: "#6B7280",
    fontSize: 12,
  },
  metricValue: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  stale: {
    color: "#7A4D00",
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: "#9B1C1C",
    fontSize: 13,
    lineHeight: 19,
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  emptyDescription: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 21,
  },
  hint: {
    gap: 3,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#176B5B",
    backgroundColor: "#F0F7F5",
  },
  hintTitle: {
    color: "#154D42",
    fontSize: 14,
    fontWeight: "700",
  },
  hintDescription: {
    color: "#355F57",
    fontSize: 13,
    lineHeight: 19,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#176B5B",
    borderRadius: 8,
  },
  secondaryButtonLabel: {
    color: "#176B5B",
    fontSize: 14,
    fontWeight: "700",
  },
  refreshButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#176B5B",
  },
  refreshButtonLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
