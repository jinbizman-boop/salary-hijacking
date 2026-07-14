import { Text } from "react-native";

import { componentColors } from "./tokens";

export type MoneyTextProps = Readonly<{
  amount: number;
  accessibilityLabel?: string;
  muted?: boolean;
}>;

export function formatKrwAmount(amount: number): string {
  const safeAmount = Number.isFinite(amount)
    ? Math.trunc(Math.max(0, amount))
    : 0;
  return `${new Intl.NumberFormat("ko-KR").format(safeAmount)}원`;
}

export function MoneyText({
  amount,
  accessibilityLabel,
  muted = false,
}: MoneyTextProps): React.ReactElement {
  const label = formatKrwAmount(amount);
  return (
    <Text
      accessibilityLabel={
        accessibilityLabel ? `${accessibilityLabel} ${label}` : label
      }
      style={{
        color: muted
          ? componentColors.textSecondary
          : componentColors.textPrimary,
        fontSize: 26,
        fontWeight: "900",
      }}
    >
      {label}
    </Text>
  );
}
