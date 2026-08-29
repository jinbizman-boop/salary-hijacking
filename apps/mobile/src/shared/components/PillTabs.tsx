import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "./tokens";

export type PillTabItem = Readonly<{
  key: string;
  label: string;
}>;

export type PillTabsProps = Readonly<{
  activeKey: string;
  items: readonly PillTabItem[];
  onChange: (key: string) => void;
}>;

export function PillTabs({
  activeKey,
  items,
  onChange,
}: PillTabsProps): React.ReactElement {
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const selected = item.key === activeKey;
        return (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.pill, selected && styles.selectedPill]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: componentSpacing.sm,
  },
  pill: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: componentSpacing.md,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.surface,
  },
  selectedPill: {
    borderColor: componentColors.primaryGreen,
    backgroundColor: componentColors.primaryGreen,
  },
  label: {
    color: componentColors.textSecondary,
    ...salaryHijackingDesignSystem.typography.labelM,
  },
  selectedLabel: {
    color: salaryHijackingDesignSystem.colors.text.inverse,
  },
});
