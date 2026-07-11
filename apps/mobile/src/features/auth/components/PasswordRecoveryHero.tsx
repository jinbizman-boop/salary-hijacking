import { StyleSheet, Text } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentSpacing,
} from "../../../shared/components";

export type PasswordRecoveryHeroProps = Readonly<{
  mode: "forgot" | "reset";
}>;

export function PasswordRecoveryHero({
  mode,
}: PasswordRecoveryHeroProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="password-recovery-hero">
      <Text style={styles.eyebrow}>Account recovery</Text>
      <Text style={styles.title}>
        {mode === "forgot" ? "비밀번호 찾기" : "비밀번호 재설정"}
      </Text>
      <Text style={styles.description}>
        {mode === "forgot"
          ? "가입한 이메일로 재설정 링크를 받을 수 있어요"
          : "새 비밀번호를 입력하면 서버에서 재설정해요"}
      </Text>
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
    fontSize: 26,
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
