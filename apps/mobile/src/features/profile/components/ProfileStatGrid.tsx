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
      <SurfaceCard accessibilityLabel="profile total hijack saved">
        <Text style={styles.label}>total hijack saved</Text>
        <MoneyText
          accessibilityLabel="total hijack saved"
          amount={stats.totalHijackSaved}
        />
      </SurfaceCard>
      <SurfaceCard accessibilityLabel="profile current level">
        <Text style={styles.label}>current level</Text>
        <Text style={styles.level}>LV {stats.currentLevel}</Text>
        <ProgressBar
          accessibilityLabel="profile level progress"
          value={progress}
        />
        <Text style={styles.meta}>
          {stats.levelXp.toLocaleString("ko-KR")} /{" "}
          {stats.nextLevelXp.toLocaleString("ko-KR")} XP
        </Text>
      </SurfaceCard>
      <SurfaceCard accessibilityLabel="profile self care score">
        <Text style={styles.label}>self care</Text>
        <Text style={styles.level}>selfCareScore {stats.selfCareScore}</Text>
        <Text style={styles.meta}>serverAuthority=true</Text>
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  label: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
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
