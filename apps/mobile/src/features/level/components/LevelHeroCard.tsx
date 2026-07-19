import { StyleSheet, Text, View } from "react-native";

import {
  ProgressBar,
  SurfaceCard,
  componentColors,
} from "../../../shared/components";
import type { GrowthDashboard } from "../types";

export type LevelHeroCardProps = Readonly<{
  dashboard: GrowthDashboard;
}>;

export function LevelHeroCard({
  dashboard,
}: LevelHeroCardProps): React.ReactElement {
  const progress = Math.min(
    100,
    Math.round((dashboard.profile.totalExp % 1000) / 10),
  );
  return (
    <SurfaceCard accessibilityLabel="LV UP 서버 기준 요약">
      <View style={styles.row}>
        <View>
          <Text style={styles.kicker}>서버 기준 XP</Text>
          <Text style={styles.level}>LV {dashboard.profile.level}</Text>
        </View>
        <Text style={styles.exp}>
          {dashboard.profile.totalExp.toLocaleString("ko-KR")} XP
        </Text>
      </View>
      <ProgressBar accessibilityLabel="LV UP 진행률" value={progress} />
      <Text style={styles.suggestion}>{dashboard.todaySuggestion}</Text>
      <Text style={styles.guard}>금융 원문 없이 성장만 기록해요</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  kicker: {
    color: componentColors.primaryGreen,
    fontSize: 12,
    fontWeight: "900",
  },
  level: {
    color: componentColors.textPrimary,
    fontSize: 34,
    fontWeight: "900",
  },
  exp: {
    color: componentColors.textSecondary,
    fontSize: 14,
    fontWeight: "800",
  },
  suggestion: {
    color: componentColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  guard: {
    color: componentColors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
});
