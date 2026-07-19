import { Image, StyleSheet, Text, View } from "react-native";

import { appIconAssets } from "../../../shared/assets/icons";
import {
  componentColors,
  componentRadius,
  componentSpacing,
  componentTypography,
} from "../../../shared/components";

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
    color: "#FFF65A",
    fontSize: componentTypography.heroAmount,
    fontWeight: "900",
    lineHeight: 42,
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
    shadowColor: componentColors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  date: {
    color: "#DDFBE5",
    fontSize: 14,
    fontWeight: "800",
  },
  guard: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 11,
    fontWeight: "700",
  },
  icon: {
    width: 82,
    height: 82,
  },
  subtitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
});
