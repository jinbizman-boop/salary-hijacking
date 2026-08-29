import { StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "./tokens";

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
    gap: componentSpacing.sm,
    padding: componentSpacing.lg,
    alignItems: "center",
  },
  title: {
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.titleM,
  },
  description: {
    color: componentColors.textSecondary,
    ...salaryHijackingDesignSystem.typography.bodyS,
    textAlign: "center",
  },
});
