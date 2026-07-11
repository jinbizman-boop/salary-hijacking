import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import {
  PrimaryButton,
  SurfaceCard,
  componentColors,
} from "../../../shared/components";

export type VariableExpenseDraft = Readonly<{
  title: string;
  amount: number;
}>;

export type VariableExpenseQuickAddProps = Readonly<{
  onSubmit: (draft: VariableExpenseDraft) => void;
}>;

export function VariableExpenseQuickAdd({
  onSubmit,
}: VariableExpenseQuickAddProps): React.ReactElement {
  const [title, setTitle] = useState("");
  const [amountText, setAmountText] = useState("");
  const amount = Number.parseInt(amountText.replace(/[^\d]/gu, ""), 10);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const disabled = title.trim().length === 0 || safeAmount <= 0;
  return (
    <SurfaceCard accessibilityLabel="변동지출 빠른 추가">
      <Text style={styles.title}>지출 추가</Text>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel="지출 제목"
          onChangeText={setTitle}
          placeholder="예: 점심"
          placeholderTextColor="#9AA3AA"
          style={styles.input}
          value={title}
        />
        <TextInput
          accessibilityLabel="지출 금액"
          keyboardType="number-pad"
          onChangeText={setAmountText}
          placeholder="예: 6500"
          placeholderTextColor="#9AA3AA"
          style={styles.input}
          value={amountText}
        />
      </View>
      <Text style={styles.caption}>계산은 서버 응답 기준으로 갱신됩니다.</Text>
      <PrimaryButton
        accessibilityLabel="지출 추가하기"
        disabled={disabled}
        label="지출 추가하기"
        onPress={() => onSubmit({ title: title.trim(), amount: safeAmount })}
      />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: componentColors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    minHeight: 48,
    flex: 1,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: 14,
    color: componentColors.textPrimary,
  },
  caption: {
    color: componentColors.textSecondary,
    fontSize: 12,
  },
});
