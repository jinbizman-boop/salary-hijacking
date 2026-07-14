import { StyleSheet, Text, View } from "react-native";

import { AuthBrandLogo, authVisualColors } from "./AuthVisualFrame";

export function SignupHero(): React.ReactElement {
  return (
    <View style={styles.wrap}>
      <AuthBrandLogo compact />
      <Text allowFontScaling={false} selectable style={styles.title}>
        회원가입
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: authVisualColors.ink,
    fontSize: 18,
    fontWeight: "900",
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 25,
    marginTop: 18,
    textAlign: "center",
  },
  wrap: {
    alignItems: "center",
  },
});
