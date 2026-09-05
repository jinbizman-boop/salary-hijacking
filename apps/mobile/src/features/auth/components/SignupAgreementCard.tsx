import { StyleSheet, Text, View } from "react-native";

import {
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import { authVisualColors } from "./AuthVisualFrame";

const typography = salaryHijackingDesignSystem.typography;

export type SignupAgreementCardProps = Readonly<{
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
}>;

export function SignupAgreementCard({
  termsAccepted,
  privacyAccepted,
  marketingAccepted,
}: SignupAgreementCardProps): React.ReactElement {
  return (
    <View accessibilityLabel="회원가입 동의 상태" style={styles.wrap}>
      <Text allowFontScaling={false} style={styles.text}>
        {termsAccepted ? "약관 동의 완료" : "약관 동의 필요"}
      </Text>
      <Text allowFontScaling={false} style={styles.divider}>
        |
      </Text>
      <Text allowFontScaling={false} style={styles.text}>
        {privacyAccepted ? "개인정보 동의 완료" : "개인정보 동의 필요"}
      </Text>
      <Text allowFontScaling={false} style={styles.optional}>
        {marketingAccepted ? "마케팅 동의" : "마케팅 선택"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    color: authVisualColors.ink,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    includeFontPadding: false,
  },
  optional: {
    color: authVisualColors.muted,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    includeFontPadding: false,
    marginLeft: componentSpacing.xs / 2,
  },
  text: {
    color: authVisualColors.ink,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    includeFontPadding: false,
  },
  wrap: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: componentSpacing.xs,
    justifyContent: "center",
    maxWidth: 365,
  },
});
