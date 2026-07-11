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
      accessibilityLabel="community compose bottom sheet"
      accessibilityViewIsModal
      style={styles.sheet}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Write community post</Text>
          <Text style={styles.subtitle}>Private by default</Text>
        </View>
        <Pressable
          accessibilityLabel="close compose"
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
      <Text style={styles.guard}>contextualOnlyAdBoundary=true</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: 14,
    padding: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
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
    borderRadius: 22,
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
