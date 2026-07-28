import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { componentColors, componentRadius } from "./tokens";

export type BottomTabItem = Readonly<{
  key: string;
  label: string;
  accessibilityLabel?: string;
}>;

export type BottomTabBarProps = Readonly<{
  activeKey: string;
  items: readonly BottomTabItem[];
  onTabPress: (key: string) => void;
}>;

export function BottomTabBar({
  activeKey,
  items,
  onTabPress,
}: BottomTabBarProps): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          minHeight: 76 + insets.bottom,
          paddingBottom: 12 + insets.bottom,
        },
      ]}
    >
      {items.map((item) => {
        const selected = item.key === activeKey;
        return (
          <Pressable
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={item.key}
            onPress={() => onTabPress(item.key)}
            style={[styles.item, selected && styles.selectedItem]}
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

function useOptionalSafeAreaInsets(): ReturnType<typeof useSafeAreaInsets> {
  try {
    return useSafeAreaInsets();
  } catch {
    return { bottom: 0, left: 0, right: 0, top: 0 };
  }
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 76,
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: componentColors.line,
    backgroundColor: componentColors.surface,
  },
  item: {
    minHeight: 44,
    minWidth: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: componentRadius.pill,
  },
  selectedItem: {
    backgroundColor: componentColors.primaryGreenSoft,
  },
  label: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  selectedLabel: {
    color: componentColors.primaryGreen,
  },
});
