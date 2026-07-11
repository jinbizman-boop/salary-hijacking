import { StyleSheet, Text, View } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";

export function LoginHero(): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="login-hero">
      <View style={styles.stack}>
        <Text style={styles.eyebrow}>Salary Hijacking</Text>
        <Text style={styles.title}>급여 하이재킹</Text>
        <Text style={styles.description}>
          월급이 사라지기 전에 먼저 붙잡아요
        </Text>
        <Text style={styles.guard}>rawCredentialData=false</Text>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: componentSpacing.sm,
  },
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
    color: componentColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
});
