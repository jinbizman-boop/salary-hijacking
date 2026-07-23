import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import {
  componentColors,
  componentRadius,
  componentSpacing,
  componentTypography,
} from "./tokens";

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
    padding: componentSpacing.lg,
    backgroundColor: "rgba(11, 29, 20, 0.42)",
  },
  dialog: {
    gap: componentSpacing.lg,
    padding: componentSpacing.lg,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.modal,
    backgroundColor: componentColors.surface,
    shadowColor: componentColors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  copy: {
    gap: componentSpacing.sm,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: componentTypography.sectionTitle,
    fontWeight: "900",
    lineHeight: 26,
  },
  description: {
    color: componentColors.textSecondary,
    fontSize: componentTypography.body,
    fontWeight: "600",
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
  cancelButton: {
    minHeight: 52,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.surfaceSoft,
  },
  cancelText: {
    color: componentColors.textSecondary,
    fontSize: componentTypography.button,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.82,
  },
});
