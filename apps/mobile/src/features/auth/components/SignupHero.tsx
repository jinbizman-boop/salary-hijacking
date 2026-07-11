import { StyleSheet, Text } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";

export function SignupHero(): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="signup-hero">
      <Text style={styles.eyebrow}>Start</Text>
      <Text style={styles.title}>회원가입</Text>
      <Text style={styles.description}>급여를 지키는 첫 설정을 시작해요</Text>
      <Text style={styles.guard}>rawCredentialData=false</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: componentColors.primaryGreenDark,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
  },
  description: {
    marginTop: componentSpacing.xs,
    color: componentColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  guard: {
    marginTop: componentSpacing.sm,
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
