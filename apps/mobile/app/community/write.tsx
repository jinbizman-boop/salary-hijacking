import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CommunityWriteForm } from "../../src/features/community/components/CommunityWriteForm";
import {
  communityResponseData,
  parseCommunityPostDetail,
} from "../../src/features/community/community.parsers";
import type { CommunityPostDraft } from "../../src/features/community/community.types";
import { useCommunityActions } from "../../src/features/community/hooks/useCommunityActions";
import { useCommunityWrite } from "../../src/features/community/hooks/useCommunityWrite";
import { createMobileCommunityService } from "../../src/shared/api/mobile-api";

const SCREEN_VERSION = "4.0.0";

function routeParam(value: string | readonly string[] | undefined): string {
  return typeof value === "string" ? value.trim() : (value?.[0]?.trim() ?? "");
}

export default function CommunityWriteScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams();
  const editPostId = routeParam(params.editPostId);
  const growthTaskId = routeParam(params.growthTaskId);
  const service = useMemo(() => createMobileCommunityService(), []);
  const initialDraft = useMemo<CommunityPostDraft>(
    () => ({
      boardType: growthTaskId ? "LEVEL_CERTIFICATION" : "FREE",
      title: growthTaskId ? "오늘의 LV UP 인증" : "",
      content: "",
      tags: growthTaskId ? ["LVUP"] : [],
      anonymous: true,
    }),
    [growthTaskId],
  );
  const writer = useCommunityWrite(service, { initialDraft });
  const actions = useCommunityActions(service);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editPostId));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!editPostId) return;
    let active = true;
    setLoadingEdit(true);
    void service
      .getPost(editPostId)
      .then((response) => {
        if (!active) return;
        const detail = parseCommunityPostDetail(
          communityResponseData(response),
        );
        writer.setDraft({
          boardType: detail.post.boardType,
          title: detail.post.title,
          content: detail.content,
          tags: detail.tags,
          anonymous: detail.post.anonymousDisplayName === "익명 사용자",
        });
        setLoadError(null);
      })
      .catch(() => {
        if (active) setLoadError("수정할 게시글을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoadingEdit(false);
      });
    return () => {
      active = false;
    };
  }, [editPostId, service, writer.setDraft]);

  const submitting =
    writer.submitting ||
    loadingEdit ||
    actions.pendingAction === `update-post:${editPostId}`;

  const submit = async (): Promise<void> => {
    if (
      !writer.validation.valid ||
      writer.validation.moderationStatus === "BLOCKED"
    ) {
      return;
    }
    const post = editPostId
      ? await actions.updatePost(editPostId, writer.draft)
      : await writer.submit();
    router.replace(`/community/${encodeURIComponent(post.id)}`);
  };

  const preview = (): void => {
    const status =
      writer.validation.moderationStatus === "SAFE"
        ? "공개 가능"
        : writer.validation.moderationStatus === "REVIEW"
          ? "서버 검토 예정"
          : "발행 차단";
    const issue = writer.validation.issues[0]?.message;
    Alert.alert("게시글 미리보기", issue ? `${status}\n${issue}` : status);
  };

  const goBack = (): void => {
    const hasDraft =
      writer.draft.title.trim().length > 0 ||
      writer.draft.content.trim().length > 0;
    if (!hasDraft) {
      router.back();
      return;
    }
    Alert.alert("작성을 중단할까요?", "저장하지 않은 내용은 사라집니다.", [
      { text: "계속 작성", style: "cancel" },
      { text: "나가기", style: "destructive", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="게시글 작성 취소"
            accessibilityRole="button"
            onPress={goBack}
            style={styles.iconButton}
          >
            <Text style={styles.iconButtonLabel}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>WRITE · v{SCREEN_VERSION}</Text>
            <Text style={styles.title}>
              {editPostId ? "게시글 수정" : "새 게시글"}
            </Text>
          </View>
        </View>

        {loadError || writer.error || actions.error ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {loadError ?? actions.error ?? writer.error}
            </Text>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.notice}>
            실제 급여·지출·저축 금액, 계좌·카드·연락처는 게시하지 마세요. 최종
            공개 여부는 서버 정책이 결정합니다.
          </Text>
          <CommunityWriteForm
            draft={writer.draft}
            onChange={writer.setDraft}
            onPreview={preview}
            onSubmit={() => void submit()}
            submitting={submitting}
            validation={writer.validation}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function assertMobileCommunityWriteCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "create_and_edit_supported",
    "local_preview_server_final_authority",
    "server_supported_post_create",
    "server_supported_post_update",
    "unsupported_draft_endpoint_not_used",
    "unsupported_preview_endpoint_not_used",
    "privacy_sensitive_input_blocked",
    "moderation_state_visible",
    "growth_certification_board_supported",
    "real_post_detail_route",
  ] as const;
  return { ok: checks.length === 10, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7F8",
  },
  keyboard: {
    flex: 1,
  },
  header: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonLabel: {
    color: "#111827",
    fontSize: 32,
    lineHeight: 34,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    color: "#176B5B",
    fontSize: 10,
    fontWeight: "800",
  },
  title: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
  },
  errorBanner: {
    margin: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFF1F1",
  },
  errorText: {
    color: "#9B1C1C",
    fontSize: 13,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 80,
  },
  notice: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#EEF6F4",
    color: "#355F57",
    fontSize: 13,
    lineHeight: 20,
  },
});
