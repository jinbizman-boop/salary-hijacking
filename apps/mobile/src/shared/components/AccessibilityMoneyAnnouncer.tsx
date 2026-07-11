import { Text } from "react-native";

import { formatKrwAmount } from "./MoneyText";

export type AccessibilityMoneyAnnouncerProps = Readonly<{
  label: string;
  amount: number;
}>;

export function AccessibilityMoneyAnnouncer({
  label,
  amount,
}: AccessibilityMoneyAnnouncerProps): React.ReactElement {
  const amountLabel = formatKrwAmount(amount);
  return (
    <Text
      accessibilityLabel={`${label} ${amountLabel}`}
      accessibilityLiveRegion="polite"
      style={{ height: 0, opacity: 0 }}
    >
      {`${label} ${amountLabel}`}
    </Text>
  );
}
