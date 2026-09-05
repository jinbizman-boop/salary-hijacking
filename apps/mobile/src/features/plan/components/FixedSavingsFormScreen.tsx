import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../shared/components/PrimaryButton";
import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components/tokens";

export type FixedSavingsFormValue = Readonly<{
  day: string;
  category: string;
  content: string;
  amount: string;
}>;

export type FixedSavingsFormScreenProps = Readonly<{
  initialValue?: Partial<FixedSavingsFormValue>;
  onCancel: () => void;
  onSave: (value: FixedSavingsFormValue) => void;
}>;

export function FixedSavingsFormScreen({
  initialValue,
  onCancel,
  onSave,
}: FixedSavingsFormScreenProps) {
  const insets = useOptionalSafeAreaInsets();
  const [value, setValue] = useState<FixedSavingsFormValue>({
    amount: initialValue?.amount ?? "",
    category: initialValue?.category ?? "고정 저축",
    content: initialValue?.content ?? "",
    day: initialValue?.day ?? "25",
  });

  const update = (key: keyof FixedSavingsFormValue, next: string) =>
    setValue((current) => ({ ...current, [key]: next }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top}
      style={styles.root}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          { paddingBottom: componentSpacing.lg + insets.bottom },
        ]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>월별 고정 적금 계획/설정</Text>
        <Text style={styles.description}>
          반복 저축일, 금융사 또는 목적, 내용, 금액을 설정합니다.
        </Text>
        <TextInput
          accessibilityLabel="저축일"
          keyboardType="number-pad"
          onChangeText={(text) => update("day", text)}
          placeholder="저축일"
          style={styles.input}
          value={value.day}
        />
        <TextInput
          accessibilityLabel="구분명"
          onChangeText={(text) => update("category", text)}
          placeholder="구분명"
          style={styles.input}
          value={value.category}
        />
        <TextInput
          accessibilityLabel="소비명"
          onChangeText={(text) => update("content", text)}
          placeholder="소비명"
          style={styles.input}
          value={value.content}
        />
        <TextInput
          accessibilityLabel="금액"
          keyboardType="number-pad"
          onChangeText={(text) => update("amount", text)}
          placeholder="금액"
          style={styles.input}
          value={value.amount}
        />
        <View style={styles.actions}>
          <PrimaryButton label="취소" onPress={onCancel} variant="secondary" />
          <PrimaryButton label="저장" onPress={() => onSave(value)} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  root: {
    flex: 1,
    backgroundColor: componentColors.background,
  },
  content: {
    gap: componentSpacing.md,
    padding: componentSpacing.lg,
  },
  title: {
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.titleXL,
  },
  description: {
    color: componentColors.textSecondary,
    ...salaryHijackingDesignSystem.typography.bodyL,
  },
  input: {
    minHeight: 56,
    paddingHorizontal: componentSpacing.md,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.surface,
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.bodyL,
  },
  actions: {
    flexDirection: "row",
    gap: componentSpacing.sm,
  },
});
