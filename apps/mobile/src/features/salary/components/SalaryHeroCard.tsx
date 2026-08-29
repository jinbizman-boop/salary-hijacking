import { Image, StyleSheet, Text, View } from "react-native";

import { appIconAssets } from "../../../shared/assets/icons";
import {
  componentColors,
  componentRadius,
  componentSpacing,
  componentTypography,
  salaryHijackingDesignSystem,
} from "../../../shared/components";

const typography = salaryHijackingDesignSystem.typography;
const elevation = salaryHijackingDesignSystem.elevation;

export type SalaryHeroCardProps = Readonly<{
  title: string;
  subtitle: string;
  savedAmount: number;
}>;

export function SalaryHeroCard({
  title,
  subtitle,
  savedAmount,
}: SalaryHeroCardProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={`${title} ${subtitle} 서버 기준 계산`}
      style={styles.card}
    >
      <View style={styles.copy}>
        <Text style={styles.date}>전체 누적 납치 금액</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.amount}>
          {savedAmount.toLocaleString("ko-KR")}원
        </Text>
        <Text style={styles.guard}>서버 기준 계산</Text>
      </View>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="납치 금액 코인 아이콘"
        resizeMode="contain"
        source={appIconAssets.money.coins}
        style={styles.icon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: salaryHijackingDesignSystem.colors.semantic.warning,
    fontSize: componentTypography.heroAmount,
    fontWeight: typography.amountXL.fontWeight,
    lineHeight: typography.amountXL.lineHeight,
  },
  card: {
    minHeight: 226,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: componentSpacing.md,
    padding: componentSpacing.lg,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.primaryGreen,
    ...elevation.medium,
  },
  copy: {
    flex: 1,
    gap: componentSpacing.xs,
  },
  date: {
    color: componentColors.primaryGreenSoft,
    fontSize: typography.bodyS.fontSize,
    fontWeight: typography.bodyS.fontWeight,
  },
  guard: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    opacity: 0.72,
  },
  icon: {
    width: 82,
    height: 82,
  },
  subtitle: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
    fontSize: typography.labelL.fontSize,
    fontWeight: typography.labelL.fontWeight,
  },
  title: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
    fontSize: typography.titleXL.fontSize,
    fontWeight: typography.titleXL.fontWeight,
  },
});
