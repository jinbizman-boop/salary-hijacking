import { StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "./PrimaryButton";
import { componentColors, componentRadius, componentSpacing } from "./tokens";

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
        placeholderTextColor="#9AA3AA"
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
    shadowColor: componentColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
  },
  label: {
    color: componentColors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  input: {
    minHeight: 112,
    padding: 14,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.surfaceSoft,
    color: componentColors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: "top",
  },
});
