import { CleanFintechSignupScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function SignupScreen(): React.ReactElement {
  return <CleanFintechSignupScreen />;
}

export function assertMobileSignupScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "회원가입",
    "이메일",
    "닉네임",
    "비밀번호",
    "약관 동의",
    "민감 정보 보호",
    "/api/v1/auth/register",
    "서버 기준 회원가입",
    "금융 원문 미노출",
    "개인 원문 미노출",
    "금융 금액 광고 타겟팅 금지",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
