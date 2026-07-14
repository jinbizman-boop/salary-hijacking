import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { COMMUNITY_BOARD_TYPES } from "../community.constants";
import type {
  CommunityBoardType,
  CommunityPostDraft,
  CommunityValidationResult,
} from "../community.types";
import { CommunityModerationBanner } from "./CommunityModerationBanner";

export type CommunityWriteFormProps = Readonly<{
  draft: CommunityPostDraft;
  validation: CommunityValidationResult;
  submitting: boolean;
  onChange: (draft: CommunityPostDraft) => void;
  onPreview?: () => void;
  onSubmit: () => void;
}>;

const boardLabels: Readonly<Record<CommunityBoardType, string>> = {
  BUDGET_TIP: "예산 팁",
  EXPENSE_CUT: "지출 줄이기",
  FREE: "자유 게시판",
  HEALTH_ROUTINE: "취미 게시판",
  LEVEL_CERTIFICATION: "레벨업 인증",
  SALARY_TALK: "급여 이야기",
  SAVINGS_GOAL: "저축 목표",
  SIDE_HUSTLE: "부업",
};

export function CommunityWriteForm({
  draft,
  validation,
  submitting,
  onChange,
  onPreview,
  onSubmit,
}: CommunityWriteFormProps): React.ReactElement {
  const disabled =
    submitting ||
    !validation.valid ||
    validation.moderationStatus === "BLOCKED";

  return (
    <View style={styles.form}>
      <Text style={styles.label}>게시판 유형</Text>
      <View accessibilityRole="radiogroup" style={styles.boardOptions}>
        {COMMUNITY_BOARD_TYPES.map((boardType) => {
          const selected = draft.boardType === boardType;
          return (
            <Pressable
              accessibilityLabel={`${boardLabels[boardType]} 게시판`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={boardType}
              onPress={() => onChange({ ...draft, boardType })}
              style={[
                styles.boardOption,
                selected && styles.boardOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.boardLabel,
                  selected && styles.boardLabelSelected,
                ]}
              >
                {boardLabels[boardType]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>제목</Text>
      <TextInput
        accessibilityLabel="게시글 제목"
        maxLength={120}
        onChangeText={(title) => onChange({ ...draft, title })}
        placeholder="제목을 입력하세요"
        style={styles.input}
        value={draft.title}
      />

      <Text style={styles.label}>본문</Text>
      <TextInput
        accessibilityLabel="게시글 본문"
        maxLength={10_000}
        multiline
        onChangeText={(content) => onChange({ ...draft, content })}
        placeholder="개인정보와 실제 금융 금액은 입력하지 마세요"
        style={[styles.input, styles.contentInput]}
        textAlignVertical="top"
        value={draft.content}
      />

      <Text style={styles.label}>태그</Text>
      <TextInput
        accessibilityLabel="게시글 태그"
        onChangeText={(value) =>
          onChange({
            ...draft,
            tags: value
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
              .slice(0, 10),
          })
        }
        placeholder="쉼표로 구분"
        style={styles.input}
        value={draft.tags.join(", ")}
      />

      <Pressable
        accessibilityLabel="익명으로 게시"
        accessibilityRole="switch"
        accessibilityState={{ checked: draft.anonymous }}
        onPress={() => onChange({ ...draft, anonymous: !draft.anonymous })}
        style={styles.switchRow}
      >
        <Text style={styles.switchLabel}>익명으로 게시</Text>
        <View
          style={[styles.switchTrack, draft.anonymous && styles.switchTrackOn]}
        >
          <View
            style={[
              styles.switchThumb,
              draft.anonymous && styles.switchThumbOn,
            ]}
          />
        </View>
      </Pressable>

      <CommunityModerationBanner
        issues={validation.issues}
        status={validation.moderationStatus}
      />

      <View style={styles.actions}>
        {onPreview ? (
          <Pressable
            accessibilityLabel="게시글 미리보기"
            accessibilityRole="button"
            onPress={onPreview}
            style={styles.previewButton}
          >
            <Text style={styles.previewButtonLabel}>미리보기</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="게시글 발행"
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onSubmit}
          style={[styles.submitButton, disabled && styles.submitButtonDisabled]}
        >
          <Text style={styles.submitButtonLabel}>
            {submitting ? "완료 중" : "완료"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 10,
  },
  label: {
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "700",
  },
  boardOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  boardOption: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  boardOptionSelected: {
    borderColor: "#176B5B",
    backgroundColor: "#E8F4F1",
  },
  boardLabel: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
  },
  boardLabelSelected: {
    color: "#155E52",
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 14,
  },
  contentInput: {
    minHeight: 180,
    paddingTop: 12,
  },
  switchRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "600",
  },
  switchTrack: {
    width: 48,
    height: 28,
    justifyContent: "center",
    paddingHorizontal: 3,
    borderRadius: 14,
    backgroundColor: "#D1D5DB",
  },
  switchTrackOn: {
    backgroundColor: "#176B5B",
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  switchThumbOn: {
    alignSelf: "flex-end",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  previewButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#176B5B",
    borderRadius: 8,
  },
  previewButtonLabel: {
    color: "#176B5B",
    fontSize: 14,
    fontWeight: "700",
  },
  submitButton: {
    minHeight: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#176B5B",
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
