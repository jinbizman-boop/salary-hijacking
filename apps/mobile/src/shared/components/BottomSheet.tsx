import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  componentTypography,
} from "./tokens";

export type BottomSheetAction = Readonly<{
  key: string;
  label: string;
  description?: string;
  disabled?: boolean;
}>;

export type BottomSheetProps = Readonly<{
  title: string;
  actions: readonly BottomSheetAction[];
  onSelect: (key: string) => void;
  onClose: () => void;
}>;

export function BottomSheet({
  title,
  actions,
  onSelect,
  onClose,
}: BottomSheetProps): React.ReactElement {
  const insets = useOptionalSafeAreaInsets();

  return (
    <View
      accessibilityLabel={`${title} 바텀시트`}
      style={[
        styles.backdrop,
        { paddingBottom: componentSpacing.lg + insets.bottom },
      ]}
    >
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            accessibilityLabel="닫기"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>
        <View style={styles.actions}>
          {actions.map((action) => {
            const label = action.description
              ? `${action.label} ${action.description}`
              : action.label;

            return (
              <Pressable
                accessibilityLabel={label}
                accessibilityRole="button"
                accessibilityState={{ disabled: action.disabled }}
                disabled={action.disabled}
                key={action.key}
                onPress={() => onSelect(action.key)}
                style={({ pressed }) => [
                  styles.action,
                  action.disabled && styles.disabled,
                  pressed && !action.disabled && styles.pressed,
                ]}
              >
                <View style={styles.actionIcon} />
                <View style={styles.actionCopy}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  {action.description ? (
                    <Text style={styles.actionDescription}>
                      {action.description}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
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
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: componentSpacing.lg,
    backgroundColor: "rgba(11, 29, 20, 0.32)",
  },
  sheet: {
    gap: componentSpacing.md,
    padding: componentSpacing.lg,
    borderTopLeftRadius: componentRadius.modal,
    borderTopRightRadius: componentRadius.modal,
    backgroundColor: componentColors.surface,
    shadowColor: componentColors.shadow,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  handle: {
    width: 48,
    height: 5,
    alignSelf: "center",
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.line,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.md,
  },
  title: {
    flex: 1,
    color: componentColors.textPrimary,
    fontSize: componentTypography.sectionTitle,
    fontWeight: "900",
    lineHeight: 26,
  },
  closeButton: {
    minWidth: 52,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.surfaceSoft,
  },
  closeText: {
    color: componentColors.primaryGreenDark,
    fontSize: componentTypography.button,
    fontWeight: "900",
  },
  actions: {
    gap: componentSpacing.sm,
  },
  action: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: componentSpacing.md,
    padding: componentSpacing.md,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.surface,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  actionCopy: {
    flex: 1,
    gap: componentSpacing.xs,
  },
  actionLabel: {
    color: componentColors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  actionDescription: {
    color: componentColors.textSecondary,
    fontSize: componentTypography.caption,
    fontWeight: "700",
    lineHeight: 17,
  },
  disabled: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.82,
  },
});
