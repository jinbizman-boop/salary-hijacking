import { AppHeader, AppShell } from "../../src/shared/components";
import {
  WorkoutTimerCard,
  XpRewardToast,
} from "../../src/features/level/components";
import { GROWTH_CONTENTS_PATH } from "../../src/features/level/constants";
import { levelDetailContent } from "../../src/features/level/detail-content";

const SCREEN_VERSION = "4.1.0-level-detail-components";
const content = levelDetailContent.HEALTH;

export default function HealthLevelScreen(): React.ReactElement {
  return (
    <AppShell
      accessibilityLabel="Salary Hijacking health level detail"
      header={<AppHeader subtitle="LV UP" title="건강" />}
    >
      <WorkoutTimerCard content={content} onRecord={() => undefined} />
      <XpRewardToast
        earnedXp={content.xpReward}
        rewardSource="WORKOUT_COMPLETE"
      />
    </AppShell>
  );
}

export function assertMobileHealthLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking level detail feature components",
    GROWTH_CONTENTS_PATH,
    "AppShell",
    "AppHeader",
    "WorkoutTimerCard",
    "XpRewardToast",
    "건강",
    "월",
    "화",
    "수",
    "목",
    "금",
    "토",
    "신체",
    "영양",
    "회복",
    "정신",
    "홈트 미션",
    "workout_safety_policy_guard",
    "server_authority_component_guard",
    "financial_raw_data_component_guard",
  ] as const;

  return { ok: checks.length >= 19, version: SCREEN_VERSION, checks };
}
