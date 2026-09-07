import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  AppHeader,
  AppShell,
  ErrorState,
  PrimaryButton,
  SurfaceCard,
  componentColors,
  salaryHijackingDesignSystem,
} from "../../../src/shared/components";
import { createMobileGrowthApi } from "../../../src/shared/api/mobile-api";
import { IconEmojiPicker } from "../../../src/features/level/components";
import {
  GROWTH_GOAL_SOURCE_LABELS,
  LVUP_DEFAULT_GOALS,
  buildGrowthGoalEditDraft,
  buildGrowthGoalSaveRequest,
  type GrowthGoalDefinition,
  type GrowthGoalDomain,
  type GrowthGoalEditDraft,
  type GrowthGoalEffectiveDateMode,
  type GrowthGoalFrequency,
  type GrowthGoalIcon,
} from "../../../src/features/level/goal-architecture";
import { updateGrowthGoalWithServerAuthority } from "../../../src/features/level/controller";
import { useLogicalBack } from "../../../src/shared/navigation/useLogicalBack";

const designSystem = salaryHijackingDesignSystem;
const domains = ["READING", "NEWS", "LANGUAGE", "HEALTH"] as const;
const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const dayLabels = {
  FRI: "금",
  MON: "월",
  SAT: "토",
  SUN: "일",
  THU: "목",
  TUE: "화",
  WED: "수",
} as const;

export default function LevelGoalsScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ domain?: string }>();
  const goBack = useLogicalBack({ fallbackHref: "/level", router });
  const growthApi = useMemo(() => createMobileGrowthApi(), []);
  const [goals, setGoals] =
    useState<readonly GrowthGoalDefinition[]>(LVUP_DEFAULT_GOALS);
  const initialDomain = normalizeDomain(params.domain) ?? "READING";
  const [selectedDomain, setSelectedDomain] =
    useState<GrowthGoalDomain>(initialDomain);
  const activeGoal =
    goals.find((goal) => goal.domain === selectedDomain) ??
    defaultGoalForDomain(selectedDomain);
  const [drafts, setDrafts] = useState<
    Partial<Record<GrowthGoalDomain, GrowthGoalEditDraft>>
  >({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const draft =
    drafts[selectedDomain] ?? buildGrowthGoalEditDraft(activeGoal, {});

  function patchDraft(patch: Partial<GrowthGoalEditDraft>): void {
    setDrafts((current) => ({
      ...current,
      [selectedDomain]: buildGrowthGoalEditDraft(activeGoal, {
        ...draft,
        ...patch,
      }),
    }));
  }

  async function save(): Promise<void> {
    setSaving(true);
    setMessage(null);
    try {
      const request = buildGrowthGoalSaveRequest(draft, todayIsoDate());
      const result = await updateGrowthGoalWithServerAuthority(
        growthApi,
        selectedDomain,
        request,
      );
      setGoals((current) =>
        current.map((goal) =>
          goal.domain === selectedDomain ? result.activeGoal : goal,
        ),
      );
      setDrafts((current) => ({
        ...current,
        [selectedDomain]: buildGrowthGoalEditDraft(result.activeGoal, {}),
      }));
      setMessage("목표가 저장됐어요.");
    } catch {
      setMessage(
        "목표를 저장하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      accessibilityLabel="LV UP 목표 관리"
      header={<AppHeader onBack={goBack} subtitle="LV UP" title="목표 관리" />}
    >
      <SurfaceCard accessibilityLabel="목표 수정">
        <Text style={styles.title}>목표 수정</Text>
        <Text style={styles.body}>
          기본 목표, 맞춤 추천, 내가 설정 중 하나를 고르고 오늘부터 또는
          내일부터 적용해요.
        </Text>
        <View style={styles.chipRow}>
          {domains.map((domain) => (
            <ChoiceChip
              active={selectedDomain === domain}
              key={domain}
              label={domainTitle(domain)}
              onPress={() => setSelectedDomain(domain)}
            />
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard
        accessibilityLabel={`${domainTitle(selectedDomain)} 목표 편집`}
      >
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.kicker}>{domainTitle(selectedDomain)}</Text>
            <Text style={styles.title}>{draft.title}</Text>
          </View>
          <Text style={styles.sourceBadge}>
            {GROWTH_GOAL_SOURCE_LABELS[draft.source]}
          </Text>
        </View>

        <FieldLabel label="목표 이름" />
        <TextInput
          accessibilityLabel="목표 이름"
          onChangeText={(title) => patchDraft({ title })}
          placeholder="목표 이름"
          placeholderTextColor={componentColors.textMuted}
          style={styles.input}
          value={draft.title}
        />

        <FieldLabel label="목표 출처" />
        <View style={styles.chipRow}>
          {(["DEFAULT", "RECOMMENDED", "CUSTOM"] as const).map((source) => (
            <ChoiceChip
              active={draft.source === source}
              key={source}
              label={GROWTH_GOAL_SOURCE_LABELS[source]}
              onPress={() => patchDraft({ source })}
            />
          ))}
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <FieldLabel label="목표량" />
            <TextInput
              accessibilityLabel="목표량"
              keyboardType="number-pad"
              onChangeText={(value) =>
                patchDraft({ targetValue: Math.max(1, Number(value) || 1) })
              }
              style={styles.input}
              value={String(draft.targetValue)}
            />
          </View>
          <View style={styles.column}>
            <FieldLabel label="단위" />
            <Text style={styles.readonlyInput}>
              {unitLabel(draft.targetUnit)}
            </Text>
          </View>
        </View>

        <FieldLabel label="빈도" />
        <View style={styles.chipRow}>
          {(["DAILY", "WEEKDAYS", "WEEKLY"] as const).map((frequency) => (
            <ChoiceChip
              active={draft.frequency === frequency}
              key={frequency}
              label={frequencyLabel(frequency)}
              onPress={() => patchDraft({ frequency })}
            />
          ))}
        </View>

        <FieldLabel label="활성 요일" />
        <View style={styles.chipRow}>
          {weekdays.map((day) => (
            <ChoiceChip
              active={draft.activeDays.includes(day)}
              key={day}
              label={dayLabels[day]}
              onPress={() =>
                patchDraft({
                  activeDays: draft.activeDays.includes(day)
                    ? draft.activeDays.filter((item) => item !== day)
                    : [...draft.activeDays, day],
                })
              }
            />
          ))}
        </View>

        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <FieldLabel label="선호 시간" />
            <TextInput
              accessibilityLabel="선호 시간"
              onChangeText={(preferredTime) => patchDraft({ preferredTime })}
              placeholder="08:00"
              placeholderTextColor={componentColors.textMuted}
              style={styles.input}
              value={draft.preferredTime}
            />
          </View>
          <View style={styles.column}>
            <FieldLabel label="영역 옵션" />
            <TextInput
              accessibilityLabel="영역 옵션"
              onChangeText={(domainOption) => patchDraft({ domainOption })}
              style={styles.input}
              value={draft.domainOption}
            />
          </View>
        </View>

        <FieldLabel label="적용일" />
        <View style={styles.chipRow}>
          {(["TODAY", "TOMORROW"] as const).map((mode) => (
            <ChoiceChip
              active={draft.effectiveDateMode === mode}
              key={mode}
              label={effectiveDateLabel(mode)}
              onPress={() => patchDraft({ effectiveDateMode: mode })}
            />
          ))}
        </View>
      </SurfaceCard>

      <IconEmojiPicker
        favorites={["star", "target", "book-open"]}
        onSelect={(icon: GrowthGoalIcon) => patchDraft({ icon })}
        recent={["book-open", "newspaper", "dumbbell"]}
        selected={draft.icon}
      />

      <PrimaryButton
        accessibilityLabel={`${domainTitle(selectedDomain)} 목표 저장`}
        disabled={saving}
        label={saving ? "저장 중" : "저장"}
        onPress={() => {
          void save();
        }}
      />

      <PrimaryButton
        accessibilityLabel="목표 수정 취소"
        label="취소"
        onPress={goBack}
        variant="secondary"
      />

      {message ? <ErrorState message={message} title="목표 관리" /> : null}
    </AppShell>
  );
}

function FieldLabel({
  label,
}: Readonly<{ label: string }>): React.ReactElement {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function ChoiceChip({
  active,
  label,
  onPress,
}: Readonly<{
  active: boolean;
  label: string;
  onPress: () => void;
}>): React.ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function normalizeDomain(
  value: string | string[] | undefined,
): GrowthGoalDomain | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return domains.includes(raw as GrowthGoalDomain)
    ? (raw as GrowthGoalDomain)
    : null;
}

function domainTitle(domain: GrowthGoalDomain): string {
  if (domain === "READING") return "독서";
  if (domain === "NEWS") return "뉴스";
  if (domain === "LANGUAGE") return "외국어";
  return "운동";
}

function defaultGoalForDomain(domain: GrowthGoalDomain): GrowthGoalDefinition {
  const goal = LVUP_DEFAULT_GOALS.find((item) => item.domain === domain);
  if (!goal) throw new Error("UNKNOWN_GROWTH_GOAL_DOMAIN");
  return goal;
}

function unitLabel(unit: string): string {
  if (unit === "page") return "페이지";
  if (unit === "article") return "개";
  if (unit === "sentence") return "문장";
  return "분";
}

function frequencyLabel(frequency: GrowthGoalFrequency): string {
  if (frequency === "WEEKDAYS") return "평일";
  if (frequency === "WEEKLY") return "주간";
  return "매일";
}

function effectiveDateLabel(mode: GrowthGoalEffectiveDateMode): string {
  return mode === "TOMORROW" ? "내일부터" : "오늘부터";
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const levelGoalManagementContract = [
  "목표 수정",
  "아이콘 선택",
  "기본 목표",
  "맞춤 추천",
  "내가 설정",
  "updateGrowthGoalWithServerAuthority",
  "IconEmojiPicker",
  "USER_ICON_PICKER_GATE",
  "USER_EMOJI_PICKER_GATE",
  "CUSTOM_REMOTE_ICON_SUPPORTED=false",
] as const;

const styles = StyleSheet.create({
  body: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
  chip: {
    minHeight: designSystem.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: designSystem.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: componentColors.line,
    paddingHorizontal: designSystem.spacing[3],
    backgroundColor: componentColors.surface,
  },
  chipActive: {
    borderColor: componentColors.primaryGreenDark,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designSystem.spacing[2],
  },
  chipText: {
    color: componentColors.textSecondary,
    ...designSystem.typography.labelM,
  },
  chipTextActive: {
    color: componentColors.primaryGreenDark,
  },
  column: {
    flex: 1,
    gap: designSystem.spacing[2],
  },
  copy: {
    flex: 1,
    gap: designSystem.spacing[1],
  },
  fieldLabel: {
    color: componentColors.textPrimary,
    ...designSystem.typography.labelM,
  },
  input: {
    minHeight: designSystem.layout.touchTarget,
    borderRadius: designSystem.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: componentColors.line,
    paddingHorizontal: designSystem.spacing[3],
    color: componentColors.textPrimary,
    backgroundColor: componentColors.surfaceSoft,
    ...designSystem.typography.bodyS,
  },
  kicker: {
    color: componentColors.textMuted,
    ...designSystem.typography.caption,
  },
  pressed: {
    opacity: 0.82,
  },
  readonlyInput: {
    minHeight: designSystem.layout.touchTarget,
    borderRadius: designSystem.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: componentColors.line,
    paddingHorizontal: designSystem.spacing[3],
    paddingVertical: designSystem.spacing[3],
    color: componentColors.textSecondary,
    backgroundColor: componentColors.surfaceSoft,
    ...designSystem.typography.bodyS,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[3],
  },
  sourceBadge: {
    overflow: "hidden",
    borderRadius: designSystem.radius.full,
    backgroundColor: componentColors.primaryGreenSoft,
    color: componentColors.primaryGreenDark,
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: designSystem.spacing[1],
    ...designSystem.typography.labelS,
  },
  title: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
  twoColumn: {
    flexDirection: "row",
    gap: designSystem.spacing[3],
  },
});
