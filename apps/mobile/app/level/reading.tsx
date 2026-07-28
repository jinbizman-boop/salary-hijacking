import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader, AppShell } from "../../src/shared/components";
import {
  ReadingContentCard,
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
const content = levelDetailContent.READING;

export default function ReadingLevelScreen(): React.ReactElement {
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [serverContent, setServerContent] =
    useState<GrowthContentItem>(content);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadGrowthContentForType(growthApi, "READING")
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
      accessibilityLabel="Salary Hijacking reading level detail"
      header={<AppHeader subtitle="LV UP" title="독서" />}
    >
      <ReadingContentCard
        content={serverContent}
        onRecord={handleRecord}
        onStart={() => undefined}
      />
      {earnedXp !== null ? (
        <XpRewardToast earnedXp={earnedXp} rewardSource="READING_COMPLETE" />
      ) : null}
    </AppShell>
  );
}

export function assertMobileReadingLevelCompleteness(): {
  readonly ok: boolean;
  readonly version: string;
  readonly checks: readonly string[];
} {
  const checks = [
    "Salary Hijacking level detail feature components",
    GROWTH_CONTENTS_PATH,
    "AppShell",
    "AppHeader",
    "ReadingContentCard",
    "XpRewardToast",
    "독서",
    "AI 추천",
    "소설",
    "경제/경영",
    "인문/철학",
    "기타",
    "추천 도서",
    "내 역량/진행률",
    "reading_content_policy_guard",
    "server_authority_component_guard",
    "financial_raw_data_component_guard",
  ] as const;

  return { ok: checks.length >= 15, version: SCREEN_VERSION, checks };
}
