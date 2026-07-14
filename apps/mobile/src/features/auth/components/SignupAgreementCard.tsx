import { StyleSheet, Text, View } from "react-native";

import { authVisualColors } from "./AuthVisualFrame";

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
    fontSize: 12,
    fontWeight: "800",
    includeFontPadding: false,
  },
  optional: {
    color: authVisualColors.muted,
    fontSize: 12,
    fontWeight: "700",
    includeFontPadding: false,
    marginLeft: 2,
  },
  text: {
    color: authVisualColors.ink,
    fontSize: 12,
    fontWeight: "800",
    includeFontPadding: false,
  },
  wrap: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    maxWidth: 365,
  },
});
