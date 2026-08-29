import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type {
  CommunityPostDraft,
  CommunityValidationResult,
} from "../community.types";
import { CommunityWriteForm } from "./CommunityWriteForm";

const typography = salaryHijackingDesignSystem.typography;

export type ComposeBottomSheetProps = Readonly<{
  open: boolean;
  draft: CommunityPostDraft;
  validation: CommunityValidationResult;
  submitting: boolean;
  onChange: (draft: CommunityPostDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  onPreview?: () => void;
}>;

export function ComposeBottomSheet({
  open,
  draft,
  validation,
  submitting,
  onChange,
  onClose,
  onSubmit,
  onPreview,
}: ComposeBottomSheetProps): React.ReactElement | null {
  if (!open) return null;

  return (
    <View
      accessibilityLabel="커뮤니티 글쓰기 바텀시트"
      accessibilityViewIsModal
      style={styles.sheet}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>커뮤니티 글쓰기</Text>
          <Text style={styles.subtitle}>기본은 익명으로 안전하게</Text>
        </View>
        <Pressable
          accessibilityLabel="글쓰기 닫기"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>X</Text>
        </Pressable>
      </View>
      <CommunityWriteForm
        draft={draft}
        submitting={submitting}
        validation={validation}
        onChange={onChange}
        onSubmit={onSubmit}
        {...(onPreview ? { onPreview } : {})}
      />
      <Text style={styles.guard}>문맥형 커뮤니티 경계를 유지해요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: componentSpacing.md,
    padding: componentSpacing.lg,
    borderTopLeftRadius: componentRadius.card,
    borderTopRightRadius: componentRadius.card,
    borderWidth: 1,
    borderColor: componentColors.line,
    backgroundColor: componentColors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: componentSpacing.sm,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
  subtitle: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: componentRadius.button,
    backgroundColor: componentColors.surfaceSoft,
  },
  closeText: {
    color: componentColors.textPrimary,
    fontSize: typography.titleM.fontSize,
    fontWeight: typography.titleM.fontWeight,
  },
  guard: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
});
