import { StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "./tokens";

const designSystem = salaryHijackingDesignSystem;

export type RecordInputCardProps = Readonly<{
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}>;

export function RecordInputCard({
  label,
  value,
  placeholder,
  onChangeText,
  onSubmit,
}: RecordInputCardProps): React.ReactElement {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        multiline
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={componentColors.disabledGray}
        style={styles.input}
        value={value}
      />
      <PrimaryButton label="기록 완료" onPress={onSubmit} />
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
    ...designSystem.elevation.low,
  },
  label: {
    color: componentColors.textPrimary,
    ...designSystem.typography.labelM,
  },
  input: {
    minHeight: 112,
    padding: componentSpacing.md,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.surfaceSoft,
    color: componentColors.textPrimary,
    ...designSystem.typography.bodyL,
    textAlignVertical: "top",
  },
});
