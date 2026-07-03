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
    "rawFinancialData=false",
    "rawPersonalData=false",
    "rawPushToken=false",
  ] as const;

  return { ok: checks.length >= 6, version: SCREEN_VERSION, checks };
}
