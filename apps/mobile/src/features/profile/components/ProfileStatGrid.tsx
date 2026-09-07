import { StyleSheet, Text, View } from "react-native";

import {
  MoneyText,
  ProgressBar,
  SurfaceCard,
  componentColors,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

export type ProfileStats = Readonly<{
  totalHijackSaved: number;
  currentLevel: number;
  levelXp: number;
  nextLevelXp: number;
  selfCareScore: number;
}>;

export type ProfileStatGridProps = Readonly<{
  stats: ProfileStats;
}>;

export function ProfileStatGrid({
  stats,
}: ProfileStatGridProps): React.ReactElement {
  const progress =
    stats.nextLevelXp > 0
      ? Math.round((Math.max(0, stats.levelXp) / stats.nextLevelXp) * 100)
      : 0;

  return (
    <SurfaceCard accessibilityLabel="MY 요약">
      <View style={styles.metricGrid}>
        <View style={styles.metric}>
          <Text style={styles.label}>지켜낸 돈</Text>
          <MoneyText
            accessibilityLabel="누적 납치 금액"
            amount={stats.totalHijackSaved}
          />
        </View>
        <View style={styles.metric}>
          <Text style={styles.label}>LV</Text>
          <Text style={styles.level}>{stats.currentLevel}Lv</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.label}>성장</Text>
          <Text style={styles.level}>
            {(stats.selfCareScore / 20).toFixed(1)}점
          </Text>
        </View>
      </View>
      <View style={styles.progressBlock}>
        <ProgressBar accessibilityLabel="레벨 업 진행률" value={progress} />
        <Text style={styles.meta}>
          {stats.levelXp.toLocaleString("ko-KR")} /{" "}
          {stats.nextLevelXp.toLocaleString("ko-KR")} XP
        </Text>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  metric: {
    flex: 1,
    gap: componentSpacing.xs,
    minWidth: 0,
  },
  metricGrid: {
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
  label: {
    color: componentColors.primaryGreenDark,
    ...salaryHijackingDesignSystem.typography.labelS,
  },
  level: {
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.titleL,
  },
  meta: {
    color: componentColors.textSecondary,
    ...salaryHijackingDesignSystem.typography.labelS,
  },
  progressBlock: {
    gap: componentSpacing.xs,
  },
});
