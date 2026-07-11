import { StyleSheet, Text, View } from "react-native";

import { componentColors } from "./tokens";

export type EmptyStateProps = Readonly<{
  title: string;
  description: string;
}>;

export function EmptyState({
  title,
  description,
}: EmptyStateProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={`${title} ${description}`}
      style={styles.container}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    padding: 18,
    alignItems: "center",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  description: {
    color: componentColors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
});
