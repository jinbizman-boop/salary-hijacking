import { StyleSheet, Text, View } from "react-native";

import { componentColors, componentRadius } from "./tokens";

export type AdBannerSlotProps = Readonly<{
  label: "광고" | "제휴" | "제휴/광고";
  title: string;
  description: string;
}>;

export function AdBannerSlot({
  label,
  title,
  description,
}: AdBannerSlotProps): React.ReactElement {
  return (
    <View accessibilityLabel={`${label} ${title}`} style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.guard}>
        민감 금융 데이터로 맞춤 타겟팅하지 않아요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 5,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0D263",
    borderRadius: componentRadius.card,
    backgroundColor: "#FFF7D6",
  },
  label: {
    color: "#795A00",
    fontSize: 11,
    fontWeight: "900",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  description: {
    color: componentColors.textSecondary,
    fontSize: 12,
  },
  guard: {
    color: componentColors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
});
