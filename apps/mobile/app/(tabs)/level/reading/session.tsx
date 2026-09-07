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
} from "../../../../src/shared/components";
import { useLogicalBack } from "../../../../src/shared/navigation/useLogicalBack";

const designSystem = salaryHijackingDesignSystem;

export default function ReadingSessionScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/level/reading", router });

  return (
    <AppShell
      accessibilityLabel="독서 세션 screen"
      header={<AppHeader onBack={goBack} subtitle="독서" title="읽기 세션" />}
    >
      <SurfaceCard>
        <Text style={styles.kicker}>현재 읽는 책</Text>
        <Text style={styles.title}>퇴근 후 10분 경제 독서</Text>
        <Text style={styles.body}>
          시작 페이지와 끝 페이지를 기록하면 오늘 읽은 페이지 수가 자동으로 성장
          기록에 반영됩니다.
        </Text>
        <View style={styles.grid}>
          <Metric label="시작" value="42p" />
          <Metric label="끝" value="50p" />
          <Metric label="오늘" value="8p" />
        </View>
        <PrimaryButton label="독서 기록 완료" onPress={goBack} />
      </SurfaceCard>
    </AppShell>
  );
}

function Metric({
  label,
  value,
}: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
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
  grid: {
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
  metric: {
    flex: 1,
    gap: componentSpacing.xs,
    padding: componentSpacing.sm,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: 12,
    backgroundColor: componentColors.surfaceSoft,
  },
  metricLabel: {
    color: componentColors.textMuted,
    ...designSystem.typography.caption,
  },
  metricValue: {
    color: componentColors.textPrimary,
    ...designSystem.typography.amountM,
  },
});
