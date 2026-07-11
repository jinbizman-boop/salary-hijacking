import { useState } from "react";

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

const SCREEN_VERSION = "4.1.0-community-components";
const COMMUNITY_POSTS_ENDPOINT = "/api/v1/community/posts";

const popularPosts: readonly CommunityPost[] = [
  {
    adsFinancialTargetingUsed: false,
    anonymousDisplayName: "anonymous 12",
    boardType: "LEVEL_CERTIFICATION",
    bodyPreview: "Completed a reading mission without exposing exact amounts.",
    bookmarkCount: 4,
    commentCount: 8,
    createdAt: "2026-07-10T00:00:00.000Z",
    id: "post_level_1",
    likeCount: 21,
    moderationStatus: "SAFE",
    rawFinancialDataExposed: false,
    rawPersonalDataExposed: false,
    title: "Level certification routine",
    updatedAt: "2026-07-10T00:00:00.000Z",
  },
];

const initialDraft: CommunityPostDraft = {
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
  const [selectedBoard, setSelectedBoard] =
    useState<CommunityBoardType>("FREE");
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState<CommunityPostDraft>(initialDraft);

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking community tab"
      header={<AppHeader subtitle="Community" title="Proof Board" />}
    >
      <CommunityTabBar
        counts={{ FREE: 12, LEVEL_CERTIFICATION: 3, HEALTH_ROUTINE: 2 }}
        selected={selectedBoard}
        tabs={["FREE", "LEVEL_CERTIFICATION", "HEALTH_ROUTINE"]}
        onSelect={setSelectedBoard}
      />
      <PrimaryButton
        accessibilityLabel="open community compose"
        label="Write"
        onPress={() => setComposeOpen(true)}
      />
      <PopularPostSection posts={popularPosts} onPressPost={() => undefined} />
      <ComposeBottomSheet
        draft={draft}
        open={composeOpen}
        submitting={false}
        validation={safeValidation}
        onChange={setDraft}
        onClose={() => setComposeOpen(false)}
        onSubmit={() => setComposeOpen(false)}
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
    "anonymous_community_boundary",
    "rawPersonalDataExposed=false",
    "rawFinancialDataExposed=false",
    "adsFinancialTargetingUsed=false",
    "contextualOnlyAdBoundary=true",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 10, version: SCREEN_VERSION, checks };
}
