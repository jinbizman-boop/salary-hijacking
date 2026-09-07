import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  AppShell,
  PrimaryButton,
  SurfaceCard,
  componentColors,
  salaryHijackingDesignSystem,
} from "../../src/shared/components";
import {
  GROWTH_GOAL_SOURCE_LABELS,
  LVUP_DEFAULT_GOALS,
} from "../../src/features/level/goal-architecture";
import { useLogicalBack } from "../../src/shared/navigation/useLogicalBack";

const designSystem = salaryHijackingDesignSystem;

export default function LevelGoalsScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/level", router });

  return (
    <AppShell
      accessibilityLabel="LV UP 목표 관리"
      header={<AppHeader onBack={goBack} subtitle="LV UP" title="목표 관리" />}
    >
      <SurfaceCard accessibilityLabel="목표 방식">
        <Text style={styles.title}>목표 방식</Text>
        <Text style={styles.body}>
          기본 목표, 맞춤 추천, 내가 설정한 목표를 영역별로 선택합니다.
        </Text>
      </SurfaceCard>

      {LVUP_DEFAULT_GOALS.map((goal) => (
        <SurfaceCard key={goal.domain} accessibilityLabel={`${goal.title} 목표`}>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.title}>{goal.title}</Text>
              <Text style={styles.body}>
                {GROWTH_GOAL_SOURCE_LABELS[goal.source]} · 하루{" "}
                {goal.targetValue}
                {unitLabel(goal.targetUnit)}
              </Text>
            </View>
            <PrimaryButton label="수정" onPress={() => undefined} variant="secondary" />
          </View>
        </SurfaceCard>
      ))}
    </AppShell>
  );
}

function unitLabel(unit: string): string {
  if (unit === "page") return "페이지";
  if (unit === "article") return "개";
  if (unit === "sentence") return "문장";
  return "분";
}

const styles = StyleSheet.create({
  body: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
  copy: {
    flex: 1,
    gap: designSystem.spacing[1],
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[3],
  },
  title: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
});
