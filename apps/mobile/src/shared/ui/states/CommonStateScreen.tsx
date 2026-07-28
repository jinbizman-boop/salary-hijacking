import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import {
  componentColors,
  componentRadius,
  componentSpacing,
  componentTypography,
} from "../../components/tokens";

export type CommonStateScreenKind =
  | "empty"
  | "error"
  | "loading"
  | "offline"
  | "permission";

export type CommonStateScreenProps = Readonly<{
  kind: CommonStateScreenKind;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}>;

const stateLabels: Record<CommonStateScreenKind, string> = {
  empty: "빈 상태",
  error: "오류",
  loading: "불러오는 중",
  offline: "오프라인",
  permission: "권한 필요",
};

export function CommonStateScreen({
  actionLabel,
  description,
  kind,
  onAction,
  title,
}: CommonStateScreenProps) {
  return (
    <View
      accessibilityLabel={`${stateLabels[kind]} ${title} ${description}`}
      style={styles.container}
    >
      <View style={[styles.badge, kind === "error" && styles.errorBadge]}>
        <Text style={styles.badgeText}>{stateLabels[kind]}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: componentSpacing.md,
    padding: componentSpacing.xl,
    backgroundColor: componentColors.background,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: componentSpacing.md,
    paddingVertical: componentSpacing.sm,
    borderRadius: componentRadius.pill,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  errorBadge: {
    backgroundColor: "#FDECEC",
  },
  badgeText: {
    color: componentColors.primaryGreenDark,
    fontSize: componentTypography.caption,
    fontWeight: "900",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: componentTypography.title,
    fontWeight: "900",
    lineHeight: 34,
  },
  description: {
    color: componentColors.textSecondary,
    fontSize: componentTypography.body,
    fontWeight: "700",
    lineHeight: 23,
  },
});
