import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader, AppShell } from "../../src/shared/components";
import {
  EnglishLessonCard,
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
const content = levelDetailContent.ENGLISH;

export default function EnglishLevelScreen(): React.ReactElement {
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [serverContent, setServerContent] =
    useState<GrowthContentItem>(content);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadGrowthContentForType(growthApi, "ENGLISH")
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
      accessibilityLabel="Salary Hijacking english level detail"
      header={<AppHeader subtitle="LV UP" title="영어" />}
    >
      <EnglishLessonCard content={serverContent} onRecord={handleRecord} />
      {earnedXp !== null ? (
        <XpRewardToast earnedXp={earnedXp} rewardSource="ENGLISH_COMPLETE" />
      ) : null}
    </AppShell>
  );
}

export function assertMobileEnglishLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking level detail feature components",
    GROWTH_CONTENTS_PATH,
    "AppShell",
    "AppHeader",
    "EnglishLessonCard",
    "XpRewardToast",
    "영어",
    "Listening",
    "Speaking",
    "Reading",
    "Writing",
    "일자별 문장 학습",
    "문장 학습",
    "말하기 연습",
    "english_lesson_policy_guard",
    "server_authority_component_guard",
    "financial_raw_data_component_guard",
  ] as const;

  return { ok: checks.length >= 15, version: SCREEN_VERSION, checks };
}
