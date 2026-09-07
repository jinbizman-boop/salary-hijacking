import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  AppShell,
  PrimaryButton,
  SurfaceCard,
  componentColors,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../src/shared/components";
import { useLogicalBack } from "../../../src/shared/navigation/useLogicalBack";

const designSystem = salaryHijackingDesignSystem;

const exercises = ["스쿼트 12회", "푸시업 8회", "플랭크 30초"];

export default function WorkoutRoutineScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/level/health", router });

  return (
    <AppShell
      accessibilityLabel="운동 루틴 screen"
      header={<AppHeader onBack={goBack} subtitle="운동" title="홈트 루틴" />}
    >
      <SurfaceCard>
        <Text style={styles.kicker}>10분 · 초급 · 기구 없음</Text>
        <Text style={styles.title}>오늘 추천 루틴</Text>
        <Text style={styles.body}>
          짧게 시작하고 무리가 느껴지면 멈춥니다. 급여납치는 운동 기록을
          성장량으로만 다루며 의료적 판단을 제공하지 않습니다.
        </Text>
        <View style={styles.list}>
          {exercises.map((exercise, index) => (
            <View key={exercise} style={styles.exerciseRow}>
              <Text style={styles.step}>{index + 1}</Text>
              <Text style={styles.exercise}>{exercise}</Text>
            </View>
          ))}
        </View>
        <PrimaryButton label="운동 완료 기록" onPress={goBack} />
      </SurfaceCard>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
  title: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
  body: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyM,
  },
  list: {
    gap: componentSpacing.sm,
  },
  exerciseRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: componentSpacing.sm,
    padding: componentSpacing.sm,
    borderRadius: 12,
    backgroundColor: componentColors.surfaceSoft,
  },
  step: {
    width: 28,
    textAlign: "center",
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
  exercise: {
    flex: 1,
    color: componentColors.textPrimary,
    ...designSystem.typography.bodyM,
  },
});
