import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  CommunityPostDraft,
  CommunityValidationResult,
} from "../community.types";
import { CommunityWriteForm } from "./CommunityWriteForm";

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
    gap: 14,
    padding: 18,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "700",
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  closeText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  guard: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
  },
});
