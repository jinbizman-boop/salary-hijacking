import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";

import {
  AppHeader,
  AppShell,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "../../../src/shared/components";
import { createMobileGrowthApi } from "../../../src/shared/api/mobile-api";
import {
  ProductDetail,
  XpRewardToast,
} from "../../../src/features/level/components";
import { levelDetailContent } from "../../../src/features/level/detail-content";
import {
  completeGrowthContentWithServerAuthority,
  loadGrowthContentForType,
} from "../../../src/features/level/controller";
import type { GrowthContentItem } from "../../../src/features/level/types";
import { useLogicalBack } from "../../../src/shared/navigation/useLogicalBack";

const workoutHistory = [
  {
    id: "health-1",
    label: "오늘 · 운동",
    title: "홈트 15분 완료",
    xp: "+15 XP",
  },
  {
    id: "health-2",
    label: "어제 · 간단 운동",
    title: "스트레칭 8분",
    xp: "+8 XP",
  },
  { id: "health-3", label: "이번 주", title: "총 85분", xp: "+70 XP" },
] as const;

export default function HealthScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/level", router });
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [content, setContent] = useState<GrowthContentItem | null>(
    levelDetailContent.HEALTH,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      try {
        const next = await loadGrowthContentForType(growthApi, "HEALTH");
        if (!mounted) return;
        setContent(next ?? levelDetailContent.HEALTH);
        setError(null);
      } catch {
        if (!mounted) return;
        setContent(levelDetailContent.HEALTH);
        setError("저장된 운동 루틴으로 먼저 보여드려요.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [growthApi]);

  async function record(): Promise<void> {
    if (!content) return;
    const result = await completeGrowthContentWithServerAuthority(
      growthApi,
      content,
      "오늘 운동 시간을 기록했어요.",
    );
    setEarnedXp(result.expDelta);
  }

  return (
    <AppShell
      accessibilityLabel="운동 product screen"
      header={<AppHeader onBack={goBack} subtitle="LV UP" title="운동" />}
    >
      {loading ? <LoadingSkeleton label="운동 루틴을 불러오는 중" /> : null}
      {error ? (
        <ErrorState message={error} title="운동 루틴을 확인 중입니다" />
      ) : null}
      {content ? (
        <ProductDetail
          actions={[
            "홈트, 헬스장, 간단 운동 중 오늘 루틴 선택",
            "운동 목록과 쉬는 시간을 확인하고 시작",
            "세트, 반복, 시간 진행을 체크하며 완료",
            "실제 운동 시간과 난이도 메모를 기록",
          ]}
          content={content}
          domain="HEALTH"
          history={workoutHistory}
          metaRows={[
            {
              detail: "목표 출처 · 맞춤 추천",
              label: "오늘 목표",
              value: "10분",
            },
            { detail: "기구 없음", label: "루틴", value: "홈트" },
            { detail: "무리하지 않기", label: "난이도", value: "초급" },
            { detail: "이번 주 누적", label: "기록", value: "85분" },
          ]}
          onPrimary={() => router.push("/level/health/routine" as never)}
          onRecord={() => {
            void record();
          }}
          primaryCta="운동 시작"
          recordCta="완료 기록"
          sections={[
            {
              title: "오늘 추천 루틴",
              body: "짧은 홈트, 헬스장 루틴, 간단 운동을 내부 운동 카탈로그에서 고르고 현재 컨디션에 맞게 시작해요.",
            },
            {
              title: "운동 진행",
              body: "현재 동작, 세트, 반복 또는 시간을 보고 진행하며 쉬는 시간과 다음 동작을 명확히 보여줘요.",
            },
            {
              title: "연동",
              body: "기본 운동 기록은 앱 자체로 동작하고, 기기 건강 데이터 연동은 사용자가 동의한 경우에만 선택적으로 사용해요.",
            },
          ]}
          subtitle="루틴 · 타이머 · 기록"
          title={content.title}
        />
      ) : (
        <EmptyState
          description="운동 루틴을 불러오면 짧은 세션부터 시작할 수 있어요."
          title="운동 루틴이 없습니다"
        />
      )}
      {earnedXp !== null ? (
        <XpRewardToast earnedXp={earnedXp} rewardSource="운동 기록 완료" />
      ) : null}
    </AppShell>
  );
}

export const healthScreenProductContract = [
  "홈트",
  "헬스장",
  "간단 운동",
  "WorkoutRoutine",
  "Health Connect",
  "Samsung Health Data SDK",
  "SAMSUNG_HEALTH_PRODUCTION_PARTNERSHIP_GATE=EXTERNAL_PARTNERSHIP_REQUIRED",
] as const;
