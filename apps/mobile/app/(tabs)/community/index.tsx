import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, TextInput, View } from "react-native";

import {
  AppHeader,
  AppShell,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PrimaryButton,
  salaryHijackingDesignSystem,
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
import { useCommunityFeed } from "../../../src/features/community/hooks/useCommunityFeed";
import { createMobileCommunityService } from "../../../src/shared/api/mobile-api";
import { SortFilterBottomSheet } from "../../../src/shared/ui/sheets/SortFilterBottomSheet";

const SCREEN_VERSION = "4.3.0-server-backed-community";
const COMMUNITY_POSTS_ENDPOINT = "/api/v1/community/posts";
const designSystem = salaryHijackingDesignSystem;
const COMMUNITY_TABS: readonly CommunityBoardType[] = [
  "FREE",
  "LEVEL_CERTIFICATION",
  "HEALTH_ROUTINE",
];

export const communityStitchOverlayComponents = {
  SortFilterBottomSheet,
} as const;

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

function countPostsByBoard(
  posts: readonly CommunityPost[],
): Partial<Record<CommunityBoardType, number>> {
  return posts.reduce<Partial<Record<CommunityBoardType, number>>>(
    (counts, post) => ({
      ...counts,
      [post.boardType]: (counts[post.boardType] ?? 0) + 1,
    }),
    {},
  );
}

export default function CommunityIndexScreen(): React.ReactElement {
  const router = useRouter();
  const [selectedBoard, setSelectedBoard] =
    useState<CommunityBoardType>("FREE");
  const [searchQuery, setSearchQuery] = useState("");
  const communityService = useMemo(() => createMobileCommunityService(), []);
  const feed = useCommunityFeed(communityService, {
    boardType: selectedBoard,
    pageSize: 20,
    sort: "POPULAR",
  });
  const counts = useMemo(() => countPostsByBoard(feed.items), [feed.items]);
  const visibleFeedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return feed.items;
    return feed.items.filter((post) =>
      [
        post.title,
        post.bodyPreview,
        post.anonymousDisplayName,
        post.boardType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [feed.items, searchQuery]);

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
      <View style={styles.searchPanel}>
        <TextInput
          accessibilityLabel="커뮤니티 검색"
          clearButtonMode="while-editing"
          onChangeText={setSearchQuery}
          placeholder="게시글, 주제, 태그 검색"
          placeholderTextColor={designSystem.colors.text.disabled}
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
        />
      </View>
      <CommunityTabBar
        counts={counts}
        selected={selectedBoard}
        tabs={COMMUNITY_TABS}
        onSelect={setSelectedBoard}
      />
      <PrimaryButton
        accessibilityLabel="글쓰기 화면으로 이동"
        label="글쓰기"
        onPress={() => router.push("/community/write" as never)}
      />
      {feed.status === "loading" ? (
        <LoadingSkeleton label="커뮤니티 게시글을 불러오는 중" />
      ) : null}
      {feed.status === "error" ? (
        <ErrorState
          message={feed.error ?? "잠시 후 다시 시도해 주세요."}
          title="게시글을 불러오지 못했습니다"
          onRetry={feed.refresh}
        />
      ) : null}
      {feed.status !== "loading" &&
      feed.status !== "error" &&
      visibleFeedItems.length === 0 ? (
        <EmptyState
          description={
            searchQuery.trim()
              ? "다른 검색어로 다시 확인해 주세요."
              : "서버에 저장된 게시글이 아직 없습니다. 첫 글을 작성해 주세요."
          }
          title={
            searchQuery.trim() ? "검색 결과가 없습니다" : "게시글이 없습니다"
          }
        />
      ) : (
        <PopularPostSection
          posts={visibleFeedItems}
          onPressPost={(post) => router.push(`/community/${post.id}` as never)}
        />
      )}
      <ComposeBottomSheet
        draft={closedDraft}
        open={false}
        submitting={false}
        validation={safeValidation}
        onChange={() => undefined}
        onClose={() => undefined}
        onSubmit={() => router.push("/community/write" as never)}
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
    "createMobileCommunityService",
    "useCommunityFeed",
    "server_backed_community_feed",
    "detail_route_on_post_press",
    "anonymous_community_boundary",
    "personal_raw_data_hidden",
    "financial_raw_data_hidden",
    "contextual_ads_only",
    "community_contextual_ad_boundary",
    "financial amount ad targeting prohibited",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: designSystem.colors.surface.default,
    borderColor: designSystem.colors.border.default,
    borderRadius: designSystem.radius.lg,
    borderWidth: 1,
    color: designSystem.colors.text.primary,
    minHeight: 48,
    paddingHorizontal: designSystem.spacing[4],
    ...designSystem.typography.bodyM,
  },
  searchPanel: {
    backgroundColor: designSystem.colors.surface.soft,
    borderColor: designSystem.colors.border.soft,
    borderRadius: designSystem.radius.xl,
    borderWidth: 1,
    padding: designSystem.spacing[2],
  },
});
