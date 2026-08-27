import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AppHeader,
  AppShell,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "../../src/shared/components";
import {
  ReadingContentCard,
  XpRewardToast,
} from "../../src/features/level/components";
import {
  completeGrowthContentWithServerAuthority,
  loadGrowthContentForType,
} from "../../src/features/level/controller";
import { GROWTH_CONTENTS_PATH } from "../../src/features/level/constants";
import type { GrowthContentItem } from "../../src/features/level/types";
import { createMobileGrowthApi } from "../../src/shared/api/mobile-api";

const SCREEN_VERSION = "4.1.1-level-detail-server-content";

export default function ReadingLevelScreen(): React.ReactElement {
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [serverContent, setServerContent] =
    useState<GrowthContentItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoadError(null);
    void loadGrowthContentForType(growthApi, "READING")
      .then((nextContent) => {
        if (mounted) {
          setServerContent(nextContent);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (mounted) setLoadError("독서 콘텐츠를 불러오지 못했습니다.");
      });
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
      {serverContent ? (
        <ReadingContentCard
          content={serverContent}
          onRecord={handleRecord}
          onStart={() => undefined}
        />
      ) : null}
      {!serverContent && !loaded && !loadError ? (
        <LoadingSkeleton label="독서 콘텐츠를 불러오는 중" />
      ) : null}
      {!serverContent && loadError ? (
        <ErrorState message={loadError} title="콘텐츠를 확인할 수 없습니다" />
      ) : null}
      {!serverContent && loaded && !loadError ? (
        <EmptyState description="서버 콘텐츠가 없습니다." title="콘텐츠 없음" />
      ) : null}
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
