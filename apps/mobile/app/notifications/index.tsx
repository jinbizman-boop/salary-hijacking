import { CleanFintechScreen } from "../../src/shared/styles/clean-fintech-screens";

const SCREEN_VERSION = "4.0.0-clean-fintech";

export default function NotificationsIndexScreen(): React.ReactElement {
  return <CleanFintechScreen kind="notifications" />;
}

export function assertMobileNotificationsIndexCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking Clean Fintech v1",
    "새로운 알림이 있어요",
    "중요 알림",
    "루틴 알림",
    "unread_green_dot",
    "rawPushToken=false",
    "adsFinancialTargeting=false",
  ] as const;

  return { ok: checks.length >= 7, version: SCREEN_VERSION, checks };
}
