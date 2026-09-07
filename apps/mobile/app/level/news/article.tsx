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

export default function NewsArticleScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/level/news", router });

  return (
    <AppShell
      accessibilityLabel="뉴스 기사 screen"
      header={<AppHeader onBack={goBack} subtitle="뉴스" title="기사 읽기" />}
    >
      <SurfaceCard>
        <Text style={styles.kicker}>경제 · 12분 전</Text>
        <Text style={styles.title}>월급날 전 지출 흐름을 점검하는 방법</Text>
        <Text style={styles.body}>
          기사 요약과 출처를 확인한 뒤 원문으로 이동합니다. 급여납치는 기사
          전문을 복제하지 않고 읽음 기록과 한 줄 생각만 저장합니다.
        </Text>
        <View style={styles.thoughtBox}>
          <Text style={styles.thoughtLabel}>한 줄 생각</Text>
          <Text style={styles.thoughtText}>이번 주 고정지출을 먼저 확인해야겠다.</Text>
        </View>
        <PrimaryButton label="읽음 기록" onPress={goBack} />
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
  thoughtBox: {
    gap: componentSpacing.xs,
    padding: componentSpacing.md,
    borderRadius: 14,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  thoughtLabel: {
    color: componentColors.textMuted,
    ...designSystem.typography.caption,
  },
  thoughtText: {
    color: componentColors.textPrimary,
    ...designSystem.typography.bodyM,
  },
});
