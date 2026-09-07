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

const languageHistory = [
  {
    id: "language-1",
    label: "오늘 · 외국어",
    title: "영어 5문장 학습",
    xp: "+10 XP",
  },
  {
    id: "language-2",
    label: "어제 · Speaking",
    title: "따라 말하기 3회",
    xp: "+8 XP",
  },
  { id: "language-3", label: "이번 주", title: "총 28문장", xp: "+42 XP" },
] as const;

export default function LanguageScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/level", router });
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [content, setContent] = useState<GrowthContentItem | null>(
    levelDetailContent.ENGLISH,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      try {
        const next = await loadGrowthContentForType(growthApi, "ENGLISH");
        if (!mounted) return;
        setContent(next ?? levelDetailContent.ENGLISH);
        setError(null);
      } catch {
        if (!mounted) return;
        setContent(levelDetailContent.ENGLISH);
        setError("저장된 학습 세션으로 먼저 보여드려요.");
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
      "오늘 학습한 문장을 기록했어요.",
    );
    setEarnedXp(result.expDelta);
  }

  return (
    <AppShell
      accessibilityLabel="외국어 product screen"
      header={<AppHeader onBack={goBack} subtitle="LV UP" title="외국어" />}
    >
      {loading ? <LoadingSkeleton label="외국어 학습을 불러오는 중" /> : null}
      {error ? (
        <ErrorState message={error} title="학습 콘텐츠를 확인 중입니다" />
      ) : null}
      {content ? (
        <ProductDetail
          actions={[
            "Listening으로 오늘 문장을 먼저 듣기",
            "Speaking으로 소리 내어 따라 말하기",
            "Reading으로 의미와 표현 확인",
            "Writing으로 한 문장 직접 써 보고 완료",
          ]}
          content={content}
          domain="LANGUAGE"
          history={languageHistory}
          metaRows={[
            { detail: "기본 목표", label: "오늘 목표", value: "영어 3문장" },
            { detail: "Listening · Speaking", label: "세션", value: "출근길" },
            { detail: "Reading · Writing", label: "Skill", value: "4개" },
            { detail: "이번 주 누적", label: "기록", value: "28문장" },
          ]}
          onPrimary={() => router.push("/level/english/session" as never)}
          onRecord={() => {
            void record();
          }}
          primaryCta="학습 시작"
          recordCta="문장 기록"
          sections={[
            {
              title: "학습 언어",
              body: "기본은 영어이며 이후 일본어, 중국어, 기타 언어를 확장할 수 있는 구조입니다.",
            },
            {
              title: "4개 Skill",
              body: "Listening, Speaking, Reading, Writing을 한 세션 안에서 짧게 끝낼 수 있게 묶었어요.",
            },
            {
              title: "학습 기록",
              body: "완료 문장 수, 세션 횟수, streak가 서버 기준 성장 기록으로 누적돼요.",
            },
          ]}
          subtitle="영어 · 4개 Skill"
          title={content.title}
        />
      ) : (
        <EmptyState
          description="학습 콘텐츠가 준비되면 오늘 문장부터 시작할 수 있어요."
          title="학습 콘텐츠가 없습니다"
        />
      )}
      {earnedXp !== null ? (
        <XpRewardToast earnedXp={earnedXp} rewardSource="외국어 기록 완료" />
      ) : null}
    </AppShell>
  );
}

export const languageScreenProductContract = [
  "외국어",
  "영어",
  "Listening",
  "Speaking",
  "Reading",
  "Writing",
  "LanguageContentProvider",
] as const;
