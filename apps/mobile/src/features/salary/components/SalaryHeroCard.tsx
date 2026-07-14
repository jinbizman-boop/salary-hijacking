import { Image, StyleSheet, Text, View } from "react-native";

import { appIconAssets } from "../../../shared/assets/icons";
import { componentColors } from "../../../shared/components";

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
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
  },
  card: {
    minHeight: 188,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderRadius: 8,
    backgroundColor: componentColors.primaryGreen,
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  date: {
    color: "#DDF4E7",
    fontSize: 13,
    fontWeight: "800",
  },
  guard: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 11,
    fontWeight: "700",
  },
  icon: {
    width: 74,
    height: 74,
  },
  subtitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },
});
