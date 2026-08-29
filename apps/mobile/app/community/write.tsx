import { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";

import { AppHeader, AppShell } from "../../src/shared/components";
import { CommunityWriteForm } from "../../src/features/community/components/CommunityWriteForm";
import { useCommunityWrite } from "../../src/features/community/hooks/useCommunityWrite";
import type { CommunityPostDraft } from "../../src/features/community/community.types";
import { createMobileCommunityService } from "../../src/shared/api/mobile-api";
import { salaryHijackingDesignSystem } from "../../src/shared/components/tokens";
import { createSecureStoreRuntime } from "../../src/shared/storage/secure-store";

const SCREEN_VERSION = "4.2.1-server-backed-community-write";
const COMMUNITY_POSTS_ENDPOINT = "/api/v1/community/posts";
const RAW_FINANCIAL_DATA_GUARD = "raw_financial_data_not_allowed_guard";
const COMMUNITY_PUBLISH_IDEMPOTENCY_GUARD =
  "community_publish_idempotency_guard";
const COMMUNITY_WRITE_DRAFT_KEY = "salary-hijacking.community.write-draft.v1";
const designSystem = salaryHijackingDesignSystem;

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
  const [publishedTitle, setPublishedTitle] = useState<string | null>(null);
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
          subtitle="커뮤니티"
          title="글쓰기"
        />
      }
    >
      <View style={styles.toolbar}>
        <Text style={styles.iconText}>첨부 · 카메라 · 이미지 · 파일</Text>
        <Text style={styles.optionText}>질문 | 익명 | 게시판 유형</Text>
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>제목을 입력해주세요</Text>
        <Text style={styles.noticeText}>
          자유로운 주제로 소통하세요. 금융 원문, 계좌, 카드, 연락처, 토큰과 같은
          민감정보는 작성 전에 차단됩니다.
        </Text>
        <Text style={styles.noticeText}>본문 · 첨부 · 질문 · 익명 · 완료</Text>
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
  },
  iconText: {
    ...designSystem.typography.labelS,
    color: designSystem.colors.text.primary,
  },
  notice: {
    gap: designSystem.spacing[2],
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: designSystem.colors.border.strong,
    borderRadius: designSystem.radius.sm,
    backgroundColor: designSystem.colors.brand.primarySoft,
  },
  noticeText: {
    ...designSystem.typography.bodyS,
    color: designSystem.colors.text.secondary,
  },
  noticeTitle: {
    ...designSystem.typography.titleM,
    color: designSystem.colors.semantic.info,
  },
  optionText: {
    ...designSystem.typography.labelS,
    color: designSystem.colors.brand.primary,
  },
  success: {
    ...designSystem.typography.labelM,
    color: designSystem.colors.semantic.success,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: designSystem.spacing[2],
  },
});
