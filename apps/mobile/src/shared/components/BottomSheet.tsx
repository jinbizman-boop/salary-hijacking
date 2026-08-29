import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "./tokens";

const designSystem = salaryHijackingDesignSystem;

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
    backgroundColor: designSystem.colors.overlay,
  },
  sheet: {
    gap: componentSpacing.md,
    padding: componentSpacing.lg,
    borderTopLeftRadius: componentRadius.modal,
    borderTopRightRadius: componentRadius.modal,
    backgroundColor: componentColors.surface,
    ...designSystem.elevation.high,
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
    ...designSystem.typography.titleM,
  },
  closeButton: {
    minWidth: designSystem.header.actionSize + designSystem.spacing[2],
    minHeight: designSystem.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.surfaceSoft,
  },
  closeText: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelL,
  },
  actions: {
    gap: componentSpacing.sm,
  },
  action: {
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[5],
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
    ...designSystem.typography.labelL,
  },
  actionDescription: {
    color: componentColors.textSecondary,
    ...designSystem.typography.caption,
  },
  disabled: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.82,
  },
});
