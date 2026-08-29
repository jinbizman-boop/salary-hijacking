import { StyleSheet, Text } from "react-native";

import {
  SurfaceCard,
  componentColors,
  componentSpacing,
  salaryHijackingDesignSystem,
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
      <Text style={styles.guard}>계정 정보는 복구 요청에만 사용돼요</Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: componentColors.primaryGreenDark,
    ...salaryHijackingDesignSystem.typography.labelS,
    textTransform: "uppercase",
  },
  title: {
    color: componentColors.textPrimary,
    ...salaryHijackingDesignSystem.typography.titleXL,
  },
  description: {
    marginTop: componentSpacing.xs,
    color: componentColors.textSecondary,
    ...salaryHijackingDesignSystem.typography.bodyM,
  },
  guard: {
    marginTop: componentSpacing.sm,
    color: componentColors.textSecondary,
    ...salaryHijackingDesignSystem.typography.labelS,
  },
});
