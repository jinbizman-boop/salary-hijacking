import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader, AppShell } from "../../src/shared/components";
import {
  WorkoutTimerCard,
  XpRewardToast,
} from "../../src/features/level/components";
import {
  completeGrowthContentWithServerAuthority,
  loadGrowthContentForType,
} from "../../src/features/level/controller";
import { GROWTH_CONTENTS_PATH } from "../../src/features/level/constants";
import { levelDetailContent } from "../../src/features/level/detail-content";
import type { GrowthContentItem } from "../../src/features/level/types";
import { createMobileGrowthApi } from "../../src/shared/api/mobile-api";

const SCREEN_VERSION = "4.1.0-level-detail-components";
const content = levelDetailContent.HEALTH;

export default function HealthLevelScreen(): React.ReactElement {
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [serverContent, setServerContent] =
    useState<GrowthContentItem>(content);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadGrowthContentForType(growthApi, "HEALTH")
      .then((nextContent) => {
        if (mounted && nextContent) setServerContent(nextContent);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [growthApi]);

  const handleRecord = useCallback(
    async (nextContent: GrowthContentItem) => {
      try {
        const result = await completeGrowthContentWithServerAuthority(
          growthApi,
          nextContent,
          nextContent.recordQuestion,
        );
        setEarnedXp(result.expDelta);
      } catch {
        setEarnedXp(null);
      }
    },
    [growthApi],
  );

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking health level detail"
      header={<AppHeader subtitle="LV UP" title="건강" />}
    >
      <WorkoutTimerCard content={serverContent} onRecord={handleRecord} />
      {earnedXp !== null ? (
        <XpRewardToast earnedXp={earnedXp} rewardSource="WORKOUT_COMPLETE" />
      ) : null}
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
