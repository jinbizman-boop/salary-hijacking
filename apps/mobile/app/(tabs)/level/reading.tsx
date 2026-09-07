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

const readingHistory = [
  {
    id: "reading-1",
    label: "오늘 · 독서",
    title: "8페이지 읽음",
    xp: "+12 XP",
  },
  {
    id: "reading-2",
    label: "어제 · 독서",
    title: "경제·경영 14페이지",
    xp: "+18 XP",
  },
  { id: "reading-3", label: "이번 주", title: "총 42페이지", xp: "+56 XP" },
] as const;

export default function ReadingScreen(): React.ReactElement {
  const router = useRouter();
  const goBack = useLogicalBack({ fallbackHref: "/level", router });
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [content, setContent] = useState<GrowthContentItem | null>(
    levelDetailContent.READING,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earnedXp, setEarnedXp] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load(): Promise<void> {
      try {
        const next = await loadGrowthContentForType(growthApi, "READING");
        if (!mounted) return;
        setContent(next ?? levelDetailContent.READING);
        setError(null);
      } catch {
        if (!mounted) return;
        setContent(levelDetailContent.READING);
        setError("저장된 독서 콘텐츠로 먼저 보여드려요.");
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
      "오늘 읽은 페이지를 기록했어요.",
    );
    setEarnedXp(result.expDelta);
  }

  return (
    <AppShell
      accessibilityLabel="독서 product screen"
      header={<AppHeader onBack={goBack} subtitle="LV UP" title="독서" />}
    >
      {loading ? <LoadingSkeleton label="독서 데이터를 불러오는 중" /> : null}
      {error ? (
        <ErrorState message={error} title="독서 데이터를 확인 중입니다" />
      ) : null}
      {content ? (
        <ProductDetail
          actions={[
            "현재 읽는 책을 확인하고 이어 읽기",
            "시작 페이지와 끝 페이지 또는 오늘 읽은 페이지 수 기록",
            "한 줄 감상과 공개 여부 선택",
            "완료 후 독서 streak와 XP 반영",
          ]}
          content={content}
          domain="READING"
          history={readingHistory}
          metaRows={[
            {
              detail: "목표 출처 · 맞춤 추천",
              label: "오늘 목표",
              value: "5페이지",
            },
            {
              detail: "읽던 지점 저장",
              label: "현재 책",
              value: content.title,
            },
            { detail: "이번 주 누적", label: "진행", value: "42페이지" },
            { detail: "최근 3일", label: "Streak", value: "3일" },
          ]}
          onPrimary={() => router.push("/level/reading/session" as never)}
          onRecord={() => {
            void record();
          }}
          primaryCta="읽기 시작"
          recordCta="빠른 완료"
          sections={[
            {
              title: "도서 탐색",
              body: "추천, 소설, 경제·경영, 인문·철학, 기타 카테고리에서 책을 찾고 내부 도서 카탈로그 캐시를 우선 사용해요.",
            },
            {
              title: "도서 정보",
              body: "제목, 저자, 출판사, 설명, 카테고리, ISBN 같은 메타데이터 중심으로 보여주며 책 본문은 저장하지 않아요.",
            },
            {
              title: "독서 기록",
              body: "오늘, 이번 주, 이번 달 읽은 페이지와 세션이 서버 기준으로 쌓이고 최근 책 기록으로 이어져요.",
            },
          ]}
          subtitle="오늘 목표 · 맞춤 추천"
          title="현재 읽는 책"
        />
      ) : (
        <EmptyState
          description="읽을 책을 고르면 오늘 목표가 바로 만들어져요."
          title="독서 콘텐츠가 없습니다"
        />
      )}
      {earnedXp !== null ? (
        <XpRewardToast earnedXp={earnedXp} rewardSource="독서 기록 완료" />
      ) : null}
    </AppShell>
  );
}

export const readingScreenProductContract = [
  "오늘 목표",
  "목표 출처",
  "현재 책",
  "읽기 시작",
  "빠른 완료",
  "도서 탐색",
  "도서 정보",
  "독서 기록",
  "최근 기록",
  "BookCatalogProvider",
  "Google Books",
  "NAVER_BOOK_API_USAGE_COUNT=0",
] as const;
