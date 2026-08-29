import { Pressable, StyleSheet, Text, View } from "react-native";

import { salaryHijackingDesignSystem } from "../../../shared/components";

const designSystem = salaryHijackingDesignSystem;

export type LevelActionItem = Readonly<{
  key: string;
  label: string;
  description: string;
}>;

export type LevelActionGridProps = Readonly<{
  actions: readonly LevelActionItem[];
  onSelect: (key: string) => void;
}>;

export function LevelActionGrid({
  actions,
  onSelect,
}: LevelActionGridProps): React.ReactElement {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable
          accessibilityLabel={`${action.label} ${action.description}`}
          accessibilityRole="button"
          key={action.key}
          onPress={() => onSelect(action.key)}
          style={styles.card}
        >
          <Text style={styles.label}>{action.label}</Text>
          <Text style={styles.description}>{action.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designSystem.spacing[3],
  },
  card: {
    backgroundColor: designSystem.colors.surface.default,
    borderColor: designSystem.colors.border.default,
    borderRadius: designSystem.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: designSystem.spacing[1],
    justifyContent: "center",
    minHeight: 86,
    minWidth: "47%",
    padding: designSystem.spacing[4],
  },
  label: {
    ...designSystem.typography.titleM,
    color: designSystem.colors.text.primary,
    fontFamily: designSystem.font.native.black,
  },
  description: {
    ...designSystem.typography.labelS,
    color: designSystem.colors.text.secondary,
  },
});
