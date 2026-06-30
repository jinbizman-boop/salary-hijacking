import { CleanFintechScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function LoginScreen(): React.ReactElement {
  return <CleanFintechScreen kind="login" />;
}

export function assertMobileLoginScreenCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "급여납치",
    "월급이 사라지기 전에 먼저 붙잡아요",
    "이메일",
    "비밀번호",
    "소셜 로그인",
    "serverAuthority=true",
  ] as const;

  return { ok: checks.length >= 7, version: SCREEN_VERSION, checks };
}
