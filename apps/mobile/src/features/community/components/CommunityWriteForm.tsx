import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../../../shared/components/PrimaryButton";
import {
  componentColors,
  salaryHijackingDesignSystem,
} from "../../../shared/components/tokens";
import { COMMUNITY_BOARD_TYPES } from "../community.constants";
import type {
  CommunityBoardType,
  CommunityPostDraft,
  CommunityValidationResult,
} from "../community.types";
import { CommunityModerationBanner } from "./CommunityModerationBanner";

const designSystem = salaryHijackingDesignSystem;

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
        placeholderTextColor={componentColors.disabledGray}
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
        placeholderTextColor={componentColors.disabledGray}
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
        placeholderTextColor={componentColors.disabledGray}
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
        <PrimaryButton
          accessibilityLabel="게시글 발행"
          disabled={disabled}
          label={submitting ? "완료 중" : "완료"}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: designSystem.spacing[3],
  },
  label: {
    color: componentColors.textPrimary,
    ...designSystem.typography.labelM,
  },
  boardOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designSystem.spacing[2],
  },
  boardOption: {
    minHeight: designSystem.layout.touchTarget,
    justifyContent: "center",
    paddingHorizontal: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: designSystem.radius.sm,
    backgroundColor: componentColors.surface,
  },
  boardOptionSelected: {
    borderColor: componentColors.primaryGreen,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  boardLabel: {
    color: componentColors.textSecondary,
    ...designSystem.typography.labelS,
  },
  boardLabelSelected: {
    color: componentColors.primaryGreenDark,
  },
  input: {
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[1],
    paddingHorizontal: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: componentColors.line,
    borderRadius: designSystem.radius.sm,
    backgroundColor: componentColors.surface,
    color: componentColors.textPrimary,
    ...designSystem.typography.bodyS,
  },
  contentInput: {
    minHeight: 180,
    paddingTop: designSystem.spacing[3],
  },
  switchRow: {
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[1],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: designSystem.spacing[3],
  },
  switchLabel: {
    color: componentColors.textPrimary,
    ...designSystem.typography.labelL,
  },
  switchTrack: {
    width: 48,
    height: 28,
    justifyContent: "center",
    paddingHorizontal: designSystem.spacing[1],
    borderRadius: designSystem.radius.full,
    backgroundColor: componentColors.disabledGray,
  },
  switchTrackOn: {
    backgroundColor: componentColors.primaryGreen,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: designSystem.radius.full,
    backgroundColor: componentColors.surface,
  },
  switchThumbOn: {
    alignSelf: "flex-end",
  },
  actions: {
    flexDirection: "row",
    gap: designSystem.spacing[2],
  },
  previewButton: {
    minHeight: designSystem.layout.touchTarget + designSystem.spacing[1],
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: componentColors.primaryGreen,
    borderRadius: designSystem.radius.sm,
  },
  previewButtonLabel: {
    color: componentColors.primaryGreen,
    ...designSystem.typography.labelL,
  },
});
