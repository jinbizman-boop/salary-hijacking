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

const newsHistory = [
  {
    id: "news-1",
    label: "오늘 · 뉴스",
    title: "경제 기사 1개 읽음",
    xp: "+10 XP",
  },
  {
    id: "news-2",
    label: "어제 · 뉴스",
    title: "한 줄 생각 기록",
    xp: "+12 XP",
  },
  { id: "news-3", label: "이번 주", title: "총 6개 기사", xp: "+48 XP" },
] as const;

export default function NewsScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/level", router });
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [content, setContent] = useState<GrowthContentItem | null>(
    levelDetailContent.NEWS,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      try {
        const next = await loadGrowthContentForType(growthApi, "NEWS");
        if (!mounted) return;
        setContent(next ?? levelDetailContent.NEWS);
        setError(null);
      } catch {
        if (!mounted) return;
        setContent(levelDetailContent.NEWS);
        setError("캐시된 뉴스 피드로 먼저 보여드려요.");
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
      "오늘 읽은 뉴스와 생각을 기록했어요.",
    );
    setEarnedXp(result.expDelta);
  }

  return (
    <AppShell
      accessibilityLabel="뉴스 product screen"
      header={<AppHeader onBack={goBack} subtitle="LV UP" title="뉴스" />}
    >
      {loading ? <LoadingSkeleton label="뉴스 피드를 불러오는 중" /> : null}
      {error ? (
        <ErrorState message={error} title="뉴스 피드를 확인 중입니다" />
      ) : null}
      {content ? (
        <ProductDetail
          actions={[
            "경제, 산업, 사회, 기술, 전체 중 관심 카테고리 선택",
            "헤드라인, 출처, 발행 시간을 확인하고 기사 열기",
            "요약과 원문 링크를 확인한 뒤 읽음 처리",
            "한 줄 생각을 남기면 오늘 뉴스 목표 완료",
          ]}
          content={content}
          domain="NEWS"
          history={newsHistory}
          metaRows={[
            {
              detail: "목표 출처 · 기본 목표",
              label: "오늘 목표",
              value: "기사 1개",
            },
            {
              detail: "경제 · 산업 · 사회 · 기술",
              label: "카테고리",
              value: "경제",
            },
            { detail: "출처와 시간 표시", label: "피드", value: "최신순" },
            { detail: "이번 주 누적", label: "기록", value: "6개" },
          ]}
          onPrimary={() => router.push("/level/news/article" as never)}
          onRecord={() => {
            void record();
          }}
          primaryCta="기사 읽기"
          recordCta="한 줄 생각"
          sections={[
            {
              title: "뉴스 피드",
              body: "헤드라인을 먼저 읽고 필요한 기사만 자세히 보는 compact list 구조입니다.",
            },
            {
              title: "기사 상세",
              body: "제목, 출처, 발행 시간, 요약, 원문 보기로 구성하고 전문 무단 저장은 하지 않아요.",
            },
            {
              title: "읽음 기록",
              body: "읽음 처리와 한 줄 생각이 오늘 기사 수, 주간 누적, XP에 서버 기준으로 반영돼요.",
            },
          ]}
          subtitle="오늘 목표 · 카테고리"
          title={content.title}
        />
      ) : (
        <EmptyState
          description="캐시된 피드가 없으면 잠시 후 다시 시도해 주세요."
          title="뉴스 피드가 없습니다"
        />
      )}
      {earnedXp !== null ? (
        <XpRewardToast earnedXp={earnedXp} rewardSource="뉴스 기록 완료" />
      ) : null}
    </AppShell>
  );
}

export const newsScreenProductContract = [
  "경제",
  "산업",
  "사회",
  "기술",
  "전체",
  "NewsFeedProvider",
  "MK_RSS_GATE",
  "FULL_ARTICLE_CONTENT_GATE=EXTERNAL_LICENSE_REQUIRED",
] as const;
