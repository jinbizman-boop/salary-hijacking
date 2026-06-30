import { Pressable, StyleSheet, Text, View } from "react-native";

export type OverspendNoticeProps = Readonly<{
  overspentLabel: string;
  onOpenPlan?: () => void;
}>;

export function OverspendNotice({
  overspentLabel,
  onOpenPlan,
}: OverspendNoticeProps): React.ReactElement {
  return (
    <View accessibilityRole="alert" style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>예산 초과</Text>
        <Text style={styles.description}>
          오늘 예산을 {overspentLabel} 초과했습니다. 다음 계획을 확인해 주세요.
        </Text>
      </View>
      {onOpenPlan ? (
        <Pressable
          accessibilityLabel="예산 계획 열기"
          accessibilityRole="button"
          onPress={onOpenPlan}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonLabel}>계획 보기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F2B8B5",
    borderRadius: 8,
    backgroundColor: "#FFF1F1",
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: "#9B1C1C",
    fontSize: 14,
    fontWeight: "800",
  },
  description: {
    color: "#6F1D1B",
    fontSize: 13,
    lineHeight: 19,
  },
  button: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#9B1C1C",
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
