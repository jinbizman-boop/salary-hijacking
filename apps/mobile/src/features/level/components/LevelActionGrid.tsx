import { Pressable, StyleSheet, Text, View } from "react-native";

import { componentColors, componentRadius } from "../../../shared/components";

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
    gap: 10,
  },
  card: {
    minHeight: 86,
    minWidth: "47%",
    flex: 1,
    justifyContent: "center",
    gap: 5,
    padding: 16,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.card,
    backgroundColor: componentColors.surface,
  },
  label: {
    color: componentColors.textPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  description: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
