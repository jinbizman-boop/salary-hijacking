import { StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";

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
    <SurfaceCard accessibilityLabel="signup-agreement-card">
      <View style={styles.row}>
        <Text style={styles.label}>
          {termsAccepted ? "약관 동의 완료" : "약관 동의 필요"}
        </Text>
        <Text style={styles.label}>
          {privacyAccepted ? "개인정보 동의 완료" : "개인정보 동의 필요"}
        </Text>
        <Text style={styles.label}>
          {marketingAccepted ? "마케팅 동의" : "마케팅 동의 안 함"}
        </Text>
      </View>
      <Text style={styles.guard}>financialAdTargeting=false</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: componentSpacing.xs,
  },
  label: {
    color: componentColors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
