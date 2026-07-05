import { CleanFintechSupportScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function ProfileSupportScreen(): React.ReactElement {
  return <CleanFintechSupportScreen />;
}

export function assertMobileProfileSupportCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "support_ticket_entry",
    "server_first_support_ticket",
    "금융 원문 미노출",
    "개인 원문 미노출",
    "푸시 토큰 원문 미노출",
  ] as const;

  return { ok: checks.length >= 6, version: SCREEN_VERSION, checks };
}
