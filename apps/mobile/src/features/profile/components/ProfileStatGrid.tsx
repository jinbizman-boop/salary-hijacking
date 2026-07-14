import { StyleSheet, Text, View } from "react-native";

import {
  MoneyText,
  ProgressBar,
  SurfaceCard,
  componentColors,
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
    <View style={styles.grid}>
      <SurfaceCard accessibilityLabel="누적 납치 금액">
        <Text style={styles.label}>누적 납치 금액</Text>
        <MoneyText
          accessibilityLabel="누적 납치 금액"
          amount={stats.totalHijackSaved}
        />
      </SurfaceCard>
      <SurfaceCard accessibilityLabel="레벨 업 현황">
        <Text style={styles.label}>레벨 업 현황</Text>
        <Text style={styles.level}>{stats.currentLevel}Lv</Text>
        <ProgressBar accessibilityLabel="레벨 업 진행률" value={progress} />
        <Text style={styles.meta}>
          {stats.levelXp.toLocaleString("ko-KR")} /{" "}
          {stats.nextLevelXp.toLocaleString("ko-KR")} XP
        </Text>
      </SurfaceCard>
      <SurfaceCard accessibilityLabel="자기 관리 성과">
        <Text style={styles.label}>자기 관리 성과</Text>
        <Text style={styles.level}>
          {(stats.selfCareScore / 20).toFixed(1)}점
        </Text>
        <Text style={styles.meta}>서버 기준 성과</Text>
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 8,
  },
  label: {
    color: componentColors.primaryGreenDark,
    fontSize: 13,
    fontWeight: "900",
  },
  level: {
    color: componentColors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
  },
  meta: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
});
