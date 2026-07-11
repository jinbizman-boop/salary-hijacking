import { StyleSheet, Text, View } from "react-native";

import { componentColors } from "./tokens";

export type AppHeaderProps = Readonly<{
  title: string;
  subtitle?: string;
  rightAccessory?: React.ReactNode;
}>;

export function AppHeader({
  title,
  subtitle,
  rightAccessory,
}: AppHeaderProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={subtitle ? `${title} ${subtitle}` : title}
      style={styles.header}
    >
      <View style={styles.copy}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {rightAccessory}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copy: {
    gap: 4,
  },
  subtitle: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
  },
});
