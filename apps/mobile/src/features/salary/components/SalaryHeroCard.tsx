import { StyleSheet, Text } from "react-native";

import {
  MoneyText,
  SurfaceCard,
  componentColors,
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
    <SurfaceCard accessibilityLabel={`${title} ${subtitle}`}>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.title}>{title}</Text>
      <MoneyText accessibilityLabel={title} amount={savedAmount} />
      <Text style={styles.guard}>serverAuthority=true</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: componentColors.primaryGreenDark,
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
});
