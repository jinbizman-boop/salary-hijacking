import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import {
  AppHeader,
  AppShell,
  SurfaceCard,
  componentColors,
  salaryHijackingDesignSystem,
} from "../../../src/shared/components";
import { GrowthHistoryList } from "../../../src/features/level/components";
import { useLogicalBack } from "../../../src/shared/navigation/useLogicalBack";

const designSystem = salaryHijackingDesignSystem;

const historyRows = [
  {
    id: "history-reading",
    label: "오늘 · 독서",
    title: "8페이지 읽음",
    xp: "+12 XP",
  },
  {
    id: "history-news",
    label: "오늘 · 뉴스",
    title: "경제 기사 1개",
    xp: "+10 XP",
  },
  {
    id: "history-language",
    label: "어제 · 외국어",
    title: "5문장 학습",
    xp: "+10 XP",
  },
  {
    id: "history-health",
    label: "어제 · 운동",
    title: "홈트 15분",
    xp: "+15 XP",
  },
] as const;

export default function LevelHistoryScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/level", router });

  return (
    <AppShell
      accessibilityLabel="성장 기록"
      header={<AppHeader onBack={goBack} subtitle="LV UP" title="성장 기록" />}
    >
      <SurfaceCard accessibilityLabel="이번 달 성장 기록">
        <Text style={styles.title}>이번 달 성장 기록</Text>
        <Text style={styles.body}>
          독서, 뉴스, 외국어, 운동 기록을 서버 기준으로 모아 보여줘요.
        </Text>
      </SurfaceCard>
      <SurfaceCard accessibilityLabel="최근 기록 목록">
        <GrowthHistoryList rows={historyRows} />
      </SurfaceCard>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
  title: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
});
