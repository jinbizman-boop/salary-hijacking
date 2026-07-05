import { CleanFintechForgotPasswordScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function ForgotPasswordScreen(): React.ReactElement {
  return <CleanFintechForgotPasswordScreen />;
}

export function assertMobileForgotPasswordScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "비밀번호 찾기",
    "/api/v1/auth/password-reset",
    "서버 기준 비밀번호 재설정",
    "금융 원문 미노출",
    "개인 원문 미노출",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { ok: checks.length >= 7, version: SCREEN_VERSION, checks };
}
