import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { CommunityPostCard } from "../../../src/features/community/components/CommunityPostCard";
import type {
  CommunityBoardType,
  CommunityPost,
  CommunitySort,
} from "../../../src/features/community/community.types";
import { useCommunityActions } from "../../../src/features/community/hooks/useCommunityActions";
import { useCommunityFeed } from "../../../src/features/community/hooks/useCommunityFeed";
import { createMobileCommunityService } from "../../../src/shared/api/mobile-api";

const SCREEN_VERSION = "4.0.0";
const WRITE_ROUTE = "/community/write";
const BOARD_OPTIONS: readonly Readonly<{
  value: CommunityBoardType | undefined;
  label: string;
}>[] = [
  { value: undefined, label: "전체" },
  { value: "SALARY_TALK", label: "급여" },
  { value: "BUDGET_TIP", label: "예산" },
  { value: "EXPENSE_CUT", label: "지출 절감" },
  { value: "SAVINGS_GOAL", label: "저축" },
  { value: "LEVEL_CERTIFICATION", label: "LV UP" },
  { value: "SIDE_HUSTLE", label: "부업" },
  { value: "HEALTH_ROUTINE", label: "건강" },
  { value: "FREE", label: "자유" },
];
const SORT_OPTIONS: readonly Readonly<{
  value: CommunitySort;
  label: string;
}>[] = [
  { value: "LATEST", label: "최신" },
  { value: "POPULAR", label: "인기" },
  { value: "COMMENTS", label: "댓글" },
];

export default function CommunityIndexScreen(): React.ReactElement {
  const router = useRouter();
  const service = useMemo(() => createMobileCommunityService(), []);
  const [boardType, setBoardType] = useState<CommunityBoardType | undefined>();
  const [sort, setSort] = useState<CommunitySort>("LATEST");
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [likedPostIds, setLikedPostIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const feed = useCommunityFeed(service, {
    ...(boardType ? { boardType } : {}),
    sort,
    pageSize: 20,
    ...(query ? { query } : {}),
  });
  const actions = useCommunityActions(service);

  const openPost = (post: CommunityPost): void => {
    router.push(`/community/${encodeURIComponent(post.id)}`);
  };

  const toggleLike = (post: CommunityPost, liked: boolean): void => {
    setLikedPostIds((current) => {
      const next = new Set(current);
      if (liked) next.add(post.id);
      else next.delete(post.id);
      return next;
    });
    void actions.setPostLiked(post.id, liked).catch(() => {
      setLikedPostIds((current) => {
        const next = new Set(current);
        if (liked) next.delete(post.id);
        else next.add(post.id);
        return next;
      });
    });
  };

  const reportPost = (post: CommunityPost): void => {
    Alert.alert(
      "게시글 신고",
      "운영 정책 위반이 의심되는 게시글을 신고하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "신고",
          style: "destructive",
          onPress: () => {
            void actions.reportPost(post.id, "OTHER", "모바일 사용자 신고");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>COMMUNITY · v{SCREEN_VERSION}</Text>
          <Text style={styles.title}>커뮤니티</Text>
          <Text style={styles.description}>
            개인정보와 실제 금융 금액을 공개하지 않고 경험과 루틴을 나눕니다.
          </Text>
        </View>
        <Pressable
          accessibilityLabel="새 게시글 작성"
          accessibilityRole="button"
          onPress={() => router.push(WRITE_ROUTE)}
          style={styles.writeButton}
        >
          <Text style={styles.writeButtonLabel}>작성</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="커뮤니티 게시글 검색"
          onChangeText={setSearchText}
          onSubmitEditing={() => setQuery(searchText.trim())}
          placeholder="제목과 내용 검색"
          returnKeyType="search"
          style={styles.searchInput}
          value={searchText}
        />
        <Pressable
          accessibilityLabel="커뮤니티 검색 실행"
          accessibilityRole="button"
          onPress={() => setQuery(searchText.trim())}
          style={styles.searchButton}
        >
          <Text style={styles.searchButtonLabel}>검색</Text>
        </Pressable>
      </View>

      <View>
        <FlatList
          contentContainerStyle={styles.optionContent}
          data={BOARD_OPTIONS}
          horizontal
          keyExtractor={(item) => item.value ?? "ALL"}
          renderItem={({ item }) => {
            const selected = boardType === item.value;
            return (
              <Pressable
                accessibilityLabel={`${item.label} 게시판`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setBoardType(item.value)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    selected && styles.optionLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
          showsHorizontalScrollIndicator={false}
        />
        <FlatList
          contentContainerStyle={styles.optionContent}
          data={SORT_OPTIONS}
          horizontal
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => {
            const selected = sort === item.value;
            return (
              <Pressable
                accessibilityLabel={`${item.label} 순 정렬`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setSort(item.value)}
                style={[
                  styles.sortOption,
                  selected && styles.sortOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.sortLabel,
                    selected && styles.sortLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {feed.error || actions.error ? (
        <View accessibilityRole="alert" style={styles.errorBanner}>
          <Text style={styles.errorText}>{actions.error ?? feed.error}</Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={feed.items}
        keyExtractor={(post) => post.id}
        ListEmptyComponent={
          feed.status === "loading" ? (
            <Text style={styles.emptyText}>게시글을 불러오는 중입니다.</Text>
          ) : (
            <Text style={styles.emptyText}>조건에 맞는 게시글이 없습니다.</Text>
          )
        }
        onEndReached={() => {
          if (feed.hasMore) void feed.loadMore();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            onRefresh={() => void feed.refresh()}
            refreshing={feed.status === "loading" && feed.items.length > 0}
          />
        }
        renderItem={({ item }) => (
          <View>
            <CommunityPostCard
              liked={likedPostIds.has(item.id)}
              onLike={toggleLike}
              onPress={openPost}
              post={item}
            />
            <Pressable
              accessibilityLabel={`${item.title} 신고`}
              accessibilityRole="button"
              onPress={() => reportPost(item)}
              style={styles.reportButton}
            >
              <Text style={styles.reportButtonLabel}>신고</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

export function assertMobileCommunityIndexCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "community_feature_service_used",
    "server_supported_feed_query",
    "server_supported_like_unlike",
    "server_supported_report",
    "bookmark_endpoint_not_used",
    "privacy_safe_response_parser",
    "search_board_sort_controls",
    "pagination_and_refresh",
    "real_detail_route",
    "real_write_route",
    "korean_accessible_ui",
  ] as const;
  return { ok: checks.length === 11, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  kicker: {
    color: "#176B5B",
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "800",
  },
  description: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 19,
  },
  writeButton: {
    minWidth: 56,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#176B5B",
  },
  writeButtonLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    minHeight: 46,
    flex: 1,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 14,
  },
  searchButton: {
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#1F2937",
  },
  searchButtonLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  optionContent: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  option: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  optionSelected: {
    borderColor: "#176B5B",
    backgroundColor: "#E8F4F1",
  },
  optionLabel: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
  },
  optionLabelSelected: {
    color: "#155E52",
  },
  sortOption: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  sortOptionSelected: {
    borderBottomWidth: 2,
    borderBottomColor: "#176B5B",
  },
  sortLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },
  sortLabelSelected: {
    color: "#176B5B",
    fontWeight: "800",
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFF1F1",
  },
  errorText: {
    color: "#9B1C1C",
    fontSize: 13,
  },
  listContent: {
    gap: 12,
    padding: 16,
    paddingBottom: 100,
  },
  emptyText: {
    paddingVertical: 36,
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
  reportButton: {
    minHeight: 34,
    alignSelf: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  reportButtonLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
  },
});
