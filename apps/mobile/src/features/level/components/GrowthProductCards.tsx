/* eslint-disable @typescript-eslint/no-require-imports */
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";

import {
  PrimaryButton,
  ProgressBar,
  SurfaceCard,
  componentColors,
  salaryHijackingDesignSystem,
} from "../../../shared/components";
import type { GrowthContentItem } from "../types";
import type {
  GrowthDomainKey,
  GrowthHistoryViewModel,
  GrowthMetricViewModel,
  GrowthMissionViewModel,
} from "../product-model";
import type { GrowthGoalIcon, GrowthSystemIconKey } from "../goal-architecture";

const designSystem = salaryHijackingDesignSystem;

const domainIcons = {
  HEALTH: require("../../../shared/assets/icons/common/heart.png") as ImageSourcePropType,
  LANGUAGE: require("../../../shared/assets/icons/level/ai.png") as ImageSourcePropType,
  NEWS: require("../../../shared/assets/icons/level/news.png") as ImageSourcePropType,
  READING: require("../../../shared/assets/icons/level/book.png") as ImageSourcePropType,
} as const satisfies Record<GrowthDomainKey, ImageSourcePropType>;

const systemIconImages = {
  activity: require("../../../shared/assets/icons/level/technology.png") as ImageSourcePropType,
  "book-open": require("../../../shared/assets/icons/level/book.png") as ImageSourcePropType,
  briefcase: require("../../../shared/assets/icons/community/application.png") as ImageSourcePropType,
  check: require("../../../shared/assets/icons/common/edit.png") as ImageSourcePropType,
  dumbbell: require("../../../shared/assets/icons/common/heart.png") as ImageSourcePropType,
  heart: require("../../../shared/assets/icons/common/heart.png") as ImageSourcePropType,
  languages: require("../../../shared/assets/icons/level/ai.png") as ImageSourcePropType,
  newspaper: require("../../../shared/assets/icons/level/news.png") as ImageSourcePropType,
  "piggy-bank": require("../../../shared/assets/icons/money/coins.png") as ImageSourcePropType,
  star: require("../../../shared/assets/icons/level/box.png") as ImageSourcePropType,
  target: require("../../../shared/assets/icons/level/folders.png") as ImageSourcePropType,
  writing: require("../../../shared/assets/icons/common/edit.png") as ImageSourcePropType,
} as const satisfies Record<GrowthSystemIconKey, ImageSourcePropType>;

const pickerCategories: ReadonlyArray<
  Readonly<{
    title: string;
    items: readonly GrowthGoalIcon[];
  }>
> = [
  {
    title: "성장",
    items: [
      { iconKey: "target", iconType: "SYSTEM_ICON" },
      { iconKey: "star", iconType: "SYSTEM_ICON" },
      { iconKey: "check", iconType: "SYSTEM_ICON" },
    ],
  },
  {
    title: "독서/공부",
    items: [
      { iconKey: "book-open", iconType: "SYSTEM_ICON" },
      { emoji: "📚", iconType: "EMOJI" },
      { emoji: "🧠", iconType: "EMOJI" },
    ],
  },
  {
    title: "뉴스/정보",
    items: [
      { iconKey: "newspaper", iconType: "SYSTEM_ICON" },
      { emoji: "📰", iconType: "EMOJI" },
      { emoji: "💻", iconType: "EMOJI" },
    ],
  },
  {
    title: "언어",
    items: [
      { iconKey: "languages", iconType: "SYSTEM_ICON" },
      { emoji: "🇺🇸", iconType: "EMOJI" },
      { emoji: "🇯🇵", iconType: "EMOJI" },
      { emoji: "🌎", iconType: "EMOJI" },
    ],
  },
  {
    title: "운동",
    items: [
      { iconKey: "dumbbell", iconType: "SYSTEM_ICON" },
      { emoji: "🏃", iconType: "EMOJI" },
      { emoji: "🏋️", iconType: "EMOJI" },
      { emoji: "🧘", iconType: "EMOJI" },
    ],
  },
  {
    title: "😀 표정/감정",
    items: [
      { emoji: "😀", iconType: "EMOJI" },
      { emoji: "🔥", iconType: "EMOJI" },
      { emoji: "⭐", iconType: "EMOJI" },
    ],
  },
  {
    title: "🌱 성장",
    items: [
      { emoji: "🌱", iconType: "EMOJI" },
      { emoji: "🏆", iconType: "EMOJI" },
      { emoji: "🎯", iconType: "EMOJI" },
    ],
  },
];

export type GrowthMissionRowProps = Readonly<{
  mission: GrowthMissionViewModel;
  onDetail: (mission: GrowthMissionViewModel) => void;
  onEdit: (mission: GrowthMissionViewModel) => void;
  onQuickComplete: (mission: GrowthMissionViewModel) => void;
}>;

export function GrowthMissionRow({
  mission,
  onDetail,
  onEdit,
  onQuickComplete,
}: GrowthMissionRowProps): React.ReactElement {
  return (
    <SurfaceCard
      accessibilityLabel={`${mission.title} ${mission.sourceLabel} ${mission.statusLabel}`}
      style={styles.missionCard}
    >
      <View style={styles.missionTop}>
        <UserGoalIcon
          accessibilityLabel={`${mission.title} 목표 아이콘`}
          fallbackDomain={mission.domain}
          icon={mission.userIcon}
        />
        <View style={styles.missionCopy}>
          <View style={styles.rowBetween}>
            <Text style={styles.missionTitle}>{mission.title}</Text>
            <Text style={styles.sourceBadge}>{mission.sourceLabel}</Text>
          </View>
          <Text style={styles.goalText}>{mission.goalText}</Text>
          <Text style={styles.progressText}>
            {mission.progressText} · {mission.streakText}
          </Text>
        </View>
      </View>
      <ProgressBar
        accessibilityLabel={`${mission.title} 오늘 목표`}
        value={mission.progressValue}
      />
      <View style={styles.missionActions}>
        <PrimaryButton
          accessibilityLabel={mission.primaryCta}
          label={mission.primaryCta}
          onPress={() => onDetail(mission)}
        />
        <Pressable
          accessibilityLabel={`${mission.title} ${mission.quickCompleteCta}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onQuickComplete(mission)}
          style={styles.inlineAction}
        >
          <Text style={styles.inlineActionText}>{mission.quickCompleteCta}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`${mission.title} ${mission.editCta}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onEdit(mission)}
          style={({ pressed }) => [
            styles.inlineAction,
            styles.inlineActionEmphasis,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.inlineActionText}>{mission.editCta}</Text>
        </Pressable>
      </View>
    </SurfaceCard>
  );
}

export type IconEmojiPickerProps = Readonly<{
  favorites: readonly GrowthSystemIconKey[];
  onSelect: (icon: GrowthGoalIcon) => void;
  recent: readonly GrowthSystemIconKey[];
  selected: GrowthGoalIcon;
}>;

export function IconEmojiPicker({
  favorites,
  onSelect,
  recent,
  selected,
}: IconEmojiPickerProps): React.ReactElement {
  const quickCategories = [
    {
      title: "최근 사용",
      items: recent.map(
        (iconKey): GrowthGoalIcon => ({ iconKey, iconType: "SYSTEM_ICON" }),
      ),
    },
    {
      title: "즐겨찾기",
      items: favorites.map(
        (iconKey): GrowthGoalIcon => ({ iconKey, iconType: "SYSTEM_ICON" }),
      ),
    },
    ...pickerCategories,
  ].filter((category) => category.items.length > 0);

  return (
    <SurfaceCard accessibilityLabel="아이콘 선택">
      <Text style={styles.sectionTitle}>아이콘 선택</Text>
      <TextInput
        accessibilityLabel="아이콘 검색"
        placeholder="책, 운동, 뉴스, 별처럼 검색"
        placeholderTextColor={componentColors.textMuted}
        style={styles.searchInput}
      />
      <View style={styles.pickerStack}>
        {quickCategories.map((category) => (
          <View key={category.title} style={styles.pickerCategory}>
            <Text style={styles.pickerTitle}>{category.title}</Text>
            <View style={styles.pickerItems}>
              {category.items.map((icon) => {
                const key = icon.iconType === "EMOJI" ? icon.emoji : icon.iconKey;
                const selectedIcon =
                  icon.iconType === selected.iconType &&
                  (icon.iconType === "EMOJI"
                    ? selected.iconType === "EMOJI" && selected.emoji === icon.emoji
                    : selected.iconType === "SYSTEM_ICON" &&
                      selected.iconKey === icon.iconKey);
                const label =
                  icon.iconType === "EMOJI"
                    ? `이모지 ${icon.emoji} 선택`
                    : `아이콘 ${icon.iconKey} 선택`;
                return (
                  <Pressable
                    accessibilityLabel={label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedIcon }}
                    hitSlop={8}
                    key={`${category.title}-${key}`}
                    onPress={() => onSelect(icon)}
                    style={({ pressed }) => [
                      styles.pickerButton,
                      selectedIcon && styles.pickerButtonSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <UserGoalIcon icon={icon} compact />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
}

export function UserGoalIcon({
  accessibilityLabel,
  compact = false,
  fallbackDomain = "READING",
  icon,
}: Readonly<{
  accessibilityLabel?: string;
  compact?: boolean;
  fallbackDomain?: GrowthDomainKey;
  icon: GrowthGoalIcon;
}>): React.ReactElement {
  if (icon.iconType === "EMOJI") {
    return (
      <View
        accessibilityLabel={accessibilityLabel ?? `사용자 이모지 ${icon.emoji}`}
        style={[styles.iconWrap, compact && styles.iconWrapCompact]}
      >
        <Text style={[styles.emojiIcon, compact && styles.emojiIconCompact]}>
          {icon.emoji}
        </Text>
      </View>
    );
  }
  return (
    <View
      accessibilityLabel={accessibilityLabel ?? `사용자 아이콘 ${icon.iconKey}`}
      style={[styles.iconWrap, compact && styles.iconWrapCompact]}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={systemIconImages[icon.iconKey] ?? domainIcons[fallbackDomain]}
        style={[styles.icon, compact && styles.iconCompact]}
      />
    </View>
  );
}

export type MetricGridProps = Readonly<{
  metrics: readonly GrowthMetricViewModel[];
}>;

export function MetricGrid({ metrics }: MetricGridProps): React.ReactElement {
  return (
    <View style={styles.metricGrid}>
      {metrics.map((metric) => (
        <View key={`${metric.label}-${metric.value}`} style={styles.metricItem}>
          {metric.domain ? <DomainIcon compact domain={metric.domain} /> : null}
          <Text style={styles.metricLabel}>{metric.label}</Text>
          <Text style={styles.metricValue}>{metric.value}</Text>
          <Text style={styles.metricDetail}>{metric.detail}</Text>
        </View>
      ))}
    </View>
  );
}

export type GrowthHistoryListProps = Readonly<{
  rows: readonly GrowthHistoryViewModel[];
}>;

export function GrowthHistoryList({
  rows,
}: GrowthHistoryListProps): React.ReactElement {
  return (
    <View style={styles.historyList}>
      {rows.map((row) => (
        <View key={row.id} style={styles.historyRow}>
          <View style={styles.historyCopy}>
            <Text style={styles.historyLabel}>{row.label}</Text>
            <Text style={styles.historyTitle}>{row.title}</Text>
          </View>
          <Text style={styles.historyXp}>{row.xp}</Text>
        </View>
      ))}
    </View>
  );
}

export type GrowthResultPanelProps = Readonly<{
  level: string;
  nextLevel: string;
  streak: string;
  totalXp: string;
}>;

export function GrowthResultPanel({
  level,
  nextLevel,
  streak,
  totalXp,
}: GrowthResultPanelProps): React.ReactElement {
  return (
    <SurfaceCard accessibilityLabel="성장 결과" style={styles.resultPanel}>
      <Text style={styles.sectionTitle}>성장 결과</Text>
      <View style={styles.resultRow}>
        <ResultMetric label="연속" value={streak} />
        <ResultMetric label="이번 달" value={totalXp} />
        <ResultMetric label="레벨" value={level} />
      </View>
      <Text style={styles.resultNext}>{nextLevel}</Text>
    </SurfaceCard>
  );
}

export type ProductDetailProps = Readonly<{
  actions: readonly string[];
  content: GrowthContentItem;
  domain: GrowthDomainKey;
  history: readonly GrowthHistoryViewModel[];
  metaRows: readonly GrowthMetricViewModel[];
  onPrimary: () => void;
  onRecord: () => void;
  primaryCta: string;
  recordCta: string;
  sections: ReadonlyArray<Readonly<{ title: string; body: string }>>;
  subtitle: string;
  title: string;
}>;

export function ProductDetail({
  actions,
  content,
  domain,
  history,
  metaRows,
  onPrimary,
  onRecord,
  primaryCta,
  recordCta,
  sections,
  subtitle,
  title,
}: ProductDetailProps): React.ReactElement {
  return (
    <>
      <SurfaceCard accessibilityLabel={`${title} 오늘 목표`} style={styles.detailHero}>
        <View style={styles.missionTop}>
          <DomainIcon domain={domain} />
          <View style={styles.missionCopy}>
            <Text style={styles.detailKicker}>{subtitle}</Text>
            <Text style={styles.detailTitle}>{title}</Text>
            <Text style={styles.detailSummary}>{content.summary}</Text>
          </View>
        </View>
        <MetricGrid metrics={metaRows} />
        <View style={styles.detailActions}>
          <PrimaryButton label={primaryCta} onPress={onPrimary} />
          <PrimaryButton
            label={recordCta}
            onPress={onRecord}
            variant="secondary"
          />
        </View>
      </SurfaceCard>

      {sections.map((section) => (
        <SurfaceCard key={section.title} accessibilityLabel={section.title}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </SurfaceCard>
      ))}

      <SurfaceCard accessibilityLabel="오늘 진행 순서">
        <Text style={styles.sectionTitle}>오늘 진행 순서</Text>
        <View style={styles.actionList}>
          {actions.map((action, index) => (
            <View key={action} style={styles.actionRow}>
              <Text style={styles.actionIndex}>{index + 1}</Text>
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard accessibilityLabel="최근 기록">
        <Text style={styles.sectionTitle}>최근 기록</Text>
        <GrowthHistoryList rows={history} />
      </SurfaceCard>
    </>
  );
}

function DomainIcon({
  compact = false,
  domain,
}: Readonly<{
  compact?: boolean;
  domain: GrowthDomainKey;
}>): React.ReactElement {
  return (
    <View style={[styles.iconWrap, compact && styles.iconWrapCompact]}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={domainIcons[domain]}
        style={[styles.icon, compact && styles.iconCompact]}
      />
    </View>
  );
}

function ResultMetric({
  label,
  value,
}: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <View style={styles.resultMetric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionIndex: {
    width: designSystem.spacing[6],
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
  actionList: {
    gap: designSystem.spacing[2],
  },
  actionRow: {
    minHeight: 38,
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[2],
  },
  actionText: {
    flex: 1,
    color: componentColors.textPrimary,
    ...designSystem.typography.bodyS,
  },
  body: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
  detailActions: {
    gap: designSystem.spacing[2],
  },
  detailHero: {
    gap: designSystem.spacing[4],
  },
  detailKicker: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelS,
  },
  detailSummary: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
  detailTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleL,
  },
  goalText: {
    color: componentColors.textPrimary,
    ...designSystem.typography.bodyS,
  },
  historyCopy: {
    flex: 1,
    gap: designSystem.spacing[1],
  },
  historyLabel: {
    color: componentColors.textMuted,
    ...designSystem.typography.caption,
  },
  historyList: {
    gap: designSystem.spacing[2],
  },
  historyRow: {
    minHeight: 46,
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[3],
    justifyContent: "space-between",
  },
  historyTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.bodyS,
  },
  historyXp: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
  icon: {
    height: 24,
    tintColor: componentColors.primaryGreenDark,
    width: 24,
  },
  iconCompact: {
    height: 16,
    width: 16,
  },
  iconWrap: {
    height: 42,
    width: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: designSystem.radius.lg,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  iconWrapCompact: {
    height: 26,
    width: 26,
    borderRadius: designSystem.radius.md,
  },
  emojiIcon: {
    fontSize: 24,
    lineHeight: 30,
  },
  emojiIconCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  inlineAction: {
    minHeight: designSystem.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: designSystem.spacing[2],
  },
  inlineActionEmphasis: {
    minWidth: 92,
    borderRadius: designSystem.radius.md,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  inlineActionText: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
  metricDetail: {
    color: componentColors.textMuted,
    ...designSystem.typography.caption,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designSystem.spacing[2],
  },
  metricItem: {
    minWidth: "47%",
    flex: 1,
    gap: designSystem.spacing[1],
    borderRadius: designSystem.radius.md,
    backgroundColor: componentColors.surfaceSoft,
    padding: designSystem.spacing[3],
  },
  metricLabel: {
    color: componentColors.textMuted,
    ...designSystem.typography.caption,
  },
  metricValue: {
    color: componentColors.textPrimary,
    ...designSystem.typography.labelL,
  },
  missionActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designSystem.spacing[1],
  },
  missionCard: {
    gap: designSystem.spacing[3],
  },
  missionCopy: {
    flex: 1,
    gap: designSystem.spacing[1],
  },
  missionTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
  },
  missionTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: designSystem.spacing[3],
  },
  progressText: {
    color: componentColors.textSecondary,
    ...designSystem.typography.caption,
  },
  pickerButton: {
    minHeight: designSystem.layout.touchTarget,
    minWidth: designSystem.layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: designSystem.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: componentColors.line,
    backgroundColor: componentColors.surface,
  },
  pickerButtonSelected: {
    borderColor: componentColors.primaryGreenDark,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  pickerCategory: {
    gap: designSystem.spacing[2],
  },
  pickerItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: designSystem.spacing[2],
  },
  pickerStack: {
    gap: designSystem.spacing[4],
  },
  pickerTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.labelM,
  },
  pressed: {
    opacity: 0.82,
  },
  resultMetric: {
    flex: 1,
    gap: designSystem.spacing[1],
  },
  searchInput: {
    minHeight: designSystem.layout.touchTarget,
    borderRadius: designSystem.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: componentColors.line,
    paddingHorizontal: designSystem.spacing[3],
    color: componentColors.textPrimary,
    backgroundColor: componentColors.surfaceSoft,
    ...designSystem.typography.bodyS,
  },
  resultNext: {
    color: componentColors.textSecondary,
    ...designSystem.typography.bodyS,
  },
  resultPanel: {
    backgroundColor: "#F8FBF6",
  },
  resultRow: {
    flexDirection: "row",
    gap: designSystem.spacing[2],
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: designSystem.spacing[2],
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: componentColors.textPrimary,
    ...designSystem.typography.titleM,
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
});
