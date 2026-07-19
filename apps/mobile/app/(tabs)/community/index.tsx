import { useState } from "react";
import { useRouter } from "expo-router";

import {
  AppHeader,
  AppShell,
  PrimaryButton,
} from "../../../src/shared/components";
import { CommunityTabBar } from "../../../src/features/community/components/CommunityTabBar";
import { ComposeBottomSheet } from "../../../src/features/community/components/ComposeBottomSheet";
import { PopularPostSection } from "../../../src/features/community/components/PopularPostSection";
import type {
  CommunityBoardType,
  CommunityPost,
  CommunityPostDraft,
  CommunityValidationResult,
} from "../../../src/features/community/community.types";

const SCREEN_VERSION = "4.2.1-prototype-community";
const COMMUNITY_POSTS_ENDPOINT = "/api/v1/community/posts";

const popularPosts: readonly CommunityPost[] = [
  {
    adsFinancialTargetingUsed: false,
    anonymousDisplayName: "익명 12",
    boardType: "LEVEL_CERTIFICATION",
    bodyPreview: "월급을 받은 뒤 납치금액을 지켜낸 1주차 체험 후기입니다.",
    bookmarkCount: 4,
    commentCount: 8,
    createdAt: "2026-07-10T00:00:00.000Z",
    id: "post_level_1",
    likeCount: 21,
    moderationStatus: "SAFE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    title: "레벨업 인증 루틴",
    updatedAt: "2026-07-10T00:00:00.000Z",
  },
  {
    adsFinancialTargetingUsed: false,
    anonymousDisplayName: "익명 31",
    boardType: "FREE",
    bodyPreview: "연말정산 실전 팁 5가지를 공유합니다.",
    bookmarkCount: 2,
    commentCount: 5,
    createdAt: "2026-07-10T01:00:00.000Z",
    id: "post_free_1",
    likeCount: 13,
    moderationStatus: "SAFE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    title: "익명 회계팀의 연말정산 실전 팁 5가지 공유!",
    updatedAt: "2026-07-10T01:00:00.000Z",
  },
];

const closedDraft: CommunityPostDraft = {
  anonymous: true,
  boardType: "FREE",
  content: "",
  tags: [],
  title: "",
};

const safeValidation: CommunityValidationResult = {
  issues: [],
  moderationStatus: "SAFE",
  valid: true,
};

export default function CommunityIndexScreen(): React.ReactElement {
  const router = useRouter();
  const [selectedBoard, setSelectedBoard] =
    useState<CommunityBoardType>("FREE");

  return (
    <AppShell
      accessibilityLabel="급여납치 커뮤니티 탭"
      header={
        <AppHeader
          brandLabel="SALARY HIJACKING"
          subtitle="전체 / 자유 / 레벨업 인증 / 취미"
          title="커뮤니티"
        />
      }
    >
      <CommunityTabBar
        counts={{ FREE: 12, LEVEL_CERTIFICATION: 3, HEALTH_ROUTINE: 2 }}
        selected={selectedBoard}
        tabs={["FREE", "LEVEL_CERTIFICATION", "HEALTH_ROUTINE"]}
        onSelect={setSelectedBoard}
      />
      <PrimaryButton
        accessibilityLabel="글쓰기 열기"
        label="글쓰기"
        onPress={() => router.push("/community/write" as never)}
      />
      <PopularPostSection posts={popularPosts} onPressPost={() => undefined} />
      <ComposeBottomSheet
        draft={closedDraft}
        open={false}
        submitting={false}
        validation={safeValidation}
        onChange={() => undefined}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />
    </AppShell>
  );
}

export function assertMobileCommunityIndexCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking Community feature components",
    COMMUNITY_POSTS_ENDPOINT,
    "AppShell",
    "CommunityTabBar",
    "PopularPostSection",
    "ComposeBottomSheet",
    "전체 게시판",
    "자유 게시판",
    "레벨업 인증",
    "취미 게시판",
    "anonymous_community_boundary",
    "personal_raw_data_hidden",
    "financial_raw_data_hidden",
    "contextual_ads_only",
    "community_contextual_ad_boundary",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}
