import { StyleSheet, View } from "react-native";

import { componentColors, componentRadius, componentSpacing } from "./tokens";

export type SurfaceCardProps = Readonly<{
  children: React.ReactNode;
  accessibilityLabel?: string;
}>;

export function SurfaceCard({
  children,
  accessibilityLabel,
}: SurfaceCardProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={styles.card}
      testID={accessibilityLabel}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: componentSpacing.md,
    padding: componentSpacing.lg,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surface,
    shadowColor: componentColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 4,
  },
});
