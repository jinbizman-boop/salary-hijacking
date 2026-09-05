import { StyleSheet, Text, View } from "react-native";

import {
  ProgressBar,
  SurfaceCard,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { GrowthDashboard } from "../types";

const designSystem = salaryHijackingDesignSystem;

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
    <SurfaceCard accessibilityLabel="LV UP 성장 요약">
      <View style={styles.row}>
        <View>
          <Text style={styles.kicker}>성장 XP</Text>
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
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[3],
    justifyContent: "space-between",
  },
  kicker: {
    ...designSystem.typography.labelS,
    color: designSystem.colors.brand.primary,
    fontFamily: designSystem.font.native.extraBold,
  },
  level: {
    ...designSystem.typography.display,
    color: designSystem.colors.text.primary,
    fontFamily: designSystem.font.native.black,
  },
  exp: {
    ...designSystem.typography.bodyS,
    color: designSystem.colors.text.secondary,
    fontFamily: designSystem.font.native.extraBold,
  },
  suggestion: {
    ...designSystem.typography.bodyS,
    color: designSystem.colors.text.primary,
  },
  guard: {
    ...designSystem.typography.caption,
    color: designSystem.colors.text.muted,
    fontFamily: designSystem.font.native.bold,
  },
});
