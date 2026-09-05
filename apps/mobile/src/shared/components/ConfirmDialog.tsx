import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { componentColors, salaryHijackingDesignSystem } from "./tokens";

const designSystem = salaryHijackingDesignSystem;

export type ConfirmDialogProps = Readonly<{
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}>;

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={`${title} 확인 대화상자`}
      accessibilityRole="alert"
      style={styles.backdrop}
    >
      <View style={styles.dialog}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={cancelLabel}
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
          <PrimaryButton
            label={confirmLabel}
            onPress={onConfirm}
            variant={destructive ? "danger" : "primary"}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: designSystem.spacing[5],
    backgroundColor: designSystem.colors.overlay,
  },
  dialog: {
    gap: designSystem.spacing[5],
    padding: designSystem.spacing[5],
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: designSystem.radius.xl,
    backgroundColor: componentColors.surface,
    ...designSystem.elevation.high,
  },
  copy: {
    gap: designSystem.spacing[2],
  },
  title: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
  description: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyM,
  },
  actions: {
    flexDirection: "row",
    gap: designSystem.spacing[2],
  },
  cancelButton: {
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[2],
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: designSystem.radius.md,
    backgroundColor: componentColors.surfaceSoft,
  },
  cancelText: {
    color: componentColors.textSecondary,
    ...designSystem.typography.labelL,
  },
  pressed: {
    opacity: 0.82,
  },
});
