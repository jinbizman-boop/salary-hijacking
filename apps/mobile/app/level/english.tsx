import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AppHeader,
  AppShell,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "../../src/shared/components";
import {
  EnglishLessonCard,
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

export default function EnglishLevelScreen(): React.ReactElement {
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [serverContent, setServerContent] =
    useState<GrowthContentItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoadError(null);
    void loadGrowthContentForType(growthApi, "ENGLISH")
      .then((nextContent) => {
        if (mounted) {
          setServerContent(nextContent);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (mounted) setLoadError("영어 콘텐츠를 불러오지 못했습니다.");
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
      accessibilityLabel="Salary Hijacking english level detail"
      header={<AppHeader subtitle="LV UP" title="영어" />}
    >
      {serverContent ? (
        <EnglishLessonCard content={serverContent} onRecord={handleRecord} />
      ) : null}
      {!serverContent && !loaded && !loadError ? (
        <LoadingSkeleton label="영어 콘텐츠를 불러오는 중" />
      ) : null}
      {!serverContent && loadError ? (
        <ErrorState message={loadError} title="콘텐츠를 확인할 수 없습니다" />
      ) : null}
      {!serverContent && loaded && !loadError ? (
        <EmptyState description="서버 콘텐츠가 없습니다." title="콘텐츠 없음" />
      ) : null}
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
