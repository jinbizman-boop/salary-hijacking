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

export default function LanguageSessionScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/level/english", router });

  return (
    <AppShell
      accessibilityLabel="외국어 세션 screen"
      header={<AppHeader onBack={goBack} subtitle="외국어" title="영어 세션" />}
    >
      <SurfaceCard>
        <Text style={styles.kicker}>오늘 3문장</Text>
        <Text style={styles.title}>출근길에 쓰는 짧은 영어</Text>
        <View style={styles.row}>
          <Chip label="Listening" />
          <Chip label="Speaking" />
          <Chip label="Reading" />
          <Chip label="Writing" />
        </View>
        <Text style={styles.body}>
          듣고, 따라 말하고, 의미를 확인한 뒤 한 문장을 직접 써 보면 오늘
          외국어 목표가 완료됩니다.
        </Text>
        <PrimaryButton label="문장 기록 완료" onPress={goBack} />
      </SurfaceCard>
    </AppShell>
  );
}

function Chip({ label }: Readonly<{ label: string }>): React.ReactElement {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
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
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: componentSpacing.sm,
  },
  chip: {
    paddingHorizontal: componentSpacing.sm,
    paddingVertical: componentSpacing.xs,
    borderRadius: 999,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  chipText: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelS,
  },
  body: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyM,
  },
});
