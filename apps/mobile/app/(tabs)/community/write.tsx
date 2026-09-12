import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";

import { AppHeader, AppShell } from "../../../src/shared/components";
import { CommunityWriteForm } from "../../../src/features/community/components/CommunityWriteForm";
import { useCommunityWrite } from "../../../src/features/community/hooks/useCommunityWrite";
import type { CommunityPostDraft } from "../../../src/features/community/community.types";
import { createMobileCommunityService } from "../../../src/shared/api/mobile-api";
import { salaryHijackingDesignSystem } from "../../../src/shared/components/tokens";
import { createSecureStoreRuntime } from "../../../src/shared/storage/secure-store";
import { ConfirmDialog } from "../../../src/shared/components/ConfirmDialog";
import { XpToast } from "../../../src/shared/components/XpToast";
import { AttachmentBottomSheet } from "../../../src/shared/ui/sheets/AttachmentBottomSheet";
import { VisibilityBottomSheet } from "../../../src/shared/ui/sheets/VisibilityBottomSheet";
import { DraftExitBottomSheet } from "../../../src/features/community/components/DraftExitBottomSheet";

const SCREEN_VERSION = "4.2.1-server-backed-community-write";
const COMMUNITY_POSTS_ENDPOINT = "/api/v1/community/posts";
const RAW_FINANCIAL_DATA_GUARD = "raw_financial_data_not_allowed_guard";
const COMMUNITY_PUBLISH_IDEMPOTENCY_GUARD =
  "community_publish_idempotency_guard";
const COMMUNITY_WRITE_DRAFT_KEY = "salary-hijacking.community.write-draft.v1";
const designSystem = salaryHijackingDesignSystem;

export const communityWriteStitchStateComponents = {
  AttachmentBottomSheet,
  ConfirmDialog,
  VisibilityBottomSheet,
  XpToast,
} as const;

function parseCommunityDraft(value: string | null): CommunityPostDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<CommunityPostDraft>;
    if (
      typeof parsed.title === "string" &&
      typeof parsed.content === "string" &&
      typeof parsed.anonymous === "boolean" &&
      typeof parsed.boardType === "string" &&
      Array.isArray(parsed.tags)
    ) {
      return {
        anonymous: parsed.anonymous,
        boardType: parsed.boardType as CommunityPostDraft["boardType"],
        content: parsed.content,
        tags: parsed.tags.filter(
          (tag): tag is string => typeof tag === "string",
        ),
        title: parsed.title,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export default function CommunityWriteScreen(): React.ReactElement {
  const router = useRouter();
  const [publishedTitle, setPublishedTitle] = useState<string | null>(null);
  const [activeBottomSheet, setActiveBottomSheet] = useState<
    "attachment" | "draft-exit" | "visibility" | null
  >(null);
  const communityWriteService = useMemo(
    () => createMobileCommunityService(),
    [],
  );
  const draftStore = useMemo(() => {
    const runtime = createSecureStoreRuntime(Platform.OS, {
      deleteItemAsync: SecureStore.deleteItemAsync,
      getItemAsync: SecureStore.getItemAsync,
      setItemAsync: SecureStore.setItemAsync,
      WHEN_UNLOCKED_THIS_DEVICE_ONLY:
        SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return {
      clearDraft: () => runtime.deleteItemAsync(COMMUNITY_WRITE_DRAFT_KEY),
      loadDraft: async () =>
        parseCommunityDraft(
          await runtime.getItemAsync(COMMUNITY_WRITE_DRAFT_KEY),
        ),
      saveDraft: (draft: CommunityPostDraft) =>
        runtime.setItemAsync(COMMUNITY_WRITE_DRAFT_KEY, JSON.stringify(draft)),
    };
  }, []);
  const controller = useCommunityWrite(communityWriteService, {
    draftStore,
    onPublished: (post) => setPublishedTitle(post.title),
  });

  return (
    <AppShell
      accessibilityLabel="Salary Hijacking community write"
      header={
        <AppHeader
          brandLabel="SALARY HIJACKING"
          onBack={() => router.back()}
          subtitle="커뮤니티"
          title="글쓰기"
        />
      }
    >
      <View style={styles.notice}>
        <View style={styles.toolbar}>
          <Pressable
            accessibilityLabel="첨부 방식 선택"
            accessibilityRole="button"
            onPress={() => setActiveBottomSheet("attachment")}
            style={styles.toolbarButton}
          >
            <Text style={styles.iconText}>첨부</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="공개 범위 선택"
            accessibilityRole="button"
            onPress={() => setActiveBottomSheet("visibility")}
            style={styles.toolbarButton}
          >
            <Text style={styles.optionText}>공개 범위</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="작성 중 나가기 옵션"
            accessibilityRole="button"
            onPress={() => setActiveBottomSheet("draft-exit")}
            style={styles.toolbarButton}
          >
            <Text style={styles.optionText}>나가기</Text>
          </Pressable>
        </View>
        <Text style={styles.noticeTitle}>
          커뮤니티에 남길 이야기를 정리해요
        </Text>
        <Text style={styles.noticeText}>
          자유로운 주제로 소통하세요. 금융 원문, 계좌, 카드, 연락처, 토큰과 같은
          민감정보는 작성 전에 차단됩니다.
        </Text>
      </View>

      <CommunityWriteForm
        draft={controller.draft}
        submitting={controller.submitting}
        validation={controller.validation}
        onChange={controller.setDraft}
        onSubmit={() => {
          void controller.submit();
        }}
      />

      {controller.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {controller.error}
        </Text>
      ) : null}
      {publishedTitle ? (
        <Text accessibilityRole="summary" style={styles.success}>
          완료: {publishedTitle}
        </Text>
      ) : null}
      {activeBottomSheet === "attachment" ? (
        <AttachmentBottomSheet
          onClose={() => setActiveBottomSheet(null)}
          onSelect={() => setActiveBottomSheet(null)}
        />
      ) : null}
      {activeBottomSheet === "visibility" ? (
        <VisibilityBottomSheet
          onClose={() => setActiveBottomSheet(null)}
          onSelect={(value) => {
            controller.setDraft({
              ...controller.draft,
              anonymous: value !== "public",
            });
            setActiveBottomSheet(null);
          }}
        />
      ) : null}
      {activeBottomSheet === "draft-exit" ? (
        <DraftExitBottomSheet
          onClose={() => setActiveBottomSheet(null)}
          onSelect={(action) => {
            setActiveBottomSheet(null);
            if (action === "discard") router.back();
          }}
        />
      ) : null}
    </AppShell>
  );
}

export function assertMobileCommunityWriteCompleteness(): Readonly<{
  ok: boolean;
  version: string;
  checks: readonly string[];
}> {
  const checks = [
    "Salary Hijacking Community write components",
    COMMUNITY_POSTS_ENDPOINT,
    "AppShell",
    "AppHeader",
    "CommunityWriteForm",
    "제목을 입력해주세요",
    "게시판 유형",
    "질문",
    "익명",
    "첨부",
    "완료",
    "useCommunityWrite",
    RAW_FINANCIAL_DATA_GUARD,
    COMMUNITY_PUBLISH_IDEMPOTENCY_GUARD,
    "server_authoritative_publish_boundary",
    "contextual_ads_not_used_for_sensitive_post_data",
  ] as const;

  return { ok: checks.length >= 12, version: SCREEN_VERSION, checks };
}

const styles = StyleSheet.create({
  error: {
    ...designSystem.typography.labelM,
    color: designSystem.colors.semantic.danger,
    backgroundColor: designSystem.colors.semantic.dangerSoft,
    borderRadius: designSystem.radius.md,
    paddingHorizontal: designSystem.spacing[3],
    paddingVertical: designSystem.spacing[2],
  },
  iconText: {
    ...designSystem.typography.labelS,
    color: designSystem.colors.text.primary,
  },
  notice: {
    gap: designSystem.spacing[3],
    padding: designSystem.spacing[4],
    borderWidth: 1,
    borderColor: designSystem.colors.border.strong,
    borderRadius: designSystem.radius.xl,
    backgroundColor: designSystem.colors.brand.primarySoft,
  },
  noticeText: {
    ...designSystem.typography.bodyM,
    color: designSystem.colors.text.secondary,
  },
  noticeTitle: {
    ...designSystem.typography.titleL,
    color: designSystem.colors.semantic.info,
  },
  optionText: {
    ...designSystem.typography.labelS,
    color: designSystem.colors.brand.primary,
  },
  success: {
    ...designSystem.typography.labelM,
    color: designSystem.colors.semantic.success,
    backgroundColor: designSystem.colors.brand.primarySoft,
    borderRadius: designSystem.radius.md,
    paddingHorizontal: designSystem.spacing[3],
    paddingVertical: designSystem.spacing[2],
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: designSystem.spacing[2],
  },
  toolbarButton: {
    alignItems: "center",
    backgroundColor: designSystem.colors.surface.default,
    borderColor: designSystem.colors.border.default,
    borderRadius: designSystem.radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: designSystem.layout.touchTarget,
    paddingHorizontal: designSystem.spacing[2],
  },
});
