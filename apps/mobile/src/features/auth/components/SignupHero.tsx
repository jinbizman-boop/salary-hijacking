import { StyleSheet, Text, View } from "react-native";

import {
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import { AuthBrandLogo } from "./AuthBrandLogo";
import { authVisualColors } from "./AuthVisualFrame";

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
    includeFontPadding: false,
    ...salaryHijackingDesignSystem.typography.titleM,
    marginTop: componentSpacing.lg,
    textAlign: "center",
  },
  wrap: {
    alignItems: "center",
  },
});
