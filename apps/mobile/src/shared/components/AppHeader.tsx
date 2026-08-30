/* eslint-disable @typescript-eslint/no-require-imports */
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";

import { componentColors, salaryHijackingDesignSystem } from "./tokens";

const designSystem = salaryHijackingDesignSystem;
const headerBackIcon =
  require("../assets/icons/common/left.png") as ImageSourcePropType;
const headerBrandLogo =
  require("../assets/images/brand/salary-hijacking-platform-logo.png") as ImageSourcePropType;

export type AppHeaderProps = Readonly<{
  title: string;
  subtitle?: string;
  rightAccessory?: React.ReactNode;
  brandLabel?: string;
  actionLabel?: string;
  actionText?: string;
  onAction?: (() => void) | undefined;
  onBack?: (() => void) | undefined;
  onBrandPress?: (() => void) | undefined;
  variant?: (typeof designSystem.header.variants)[number];
}>;

export function AppHeader({
  title,
  subtitle,
  rightAccessory,
  brandLabel = "SALARY HIJACKING",
  actionLabel,
  actionText,
  onAction,
  onBack,
  onBrandPress,
}: AppHeaderProps): React.ReactElement {
  const accessory =
    rightAccessory ??
    (onAction && actionText ? (
      <Pressable
        accessibilityLabel={actionLabel ?? actionText}
        accessibilityRole="button"
        onPress={onAction}
        style={styles.actionButton}
      >
        <Text style={styles.actionText}>{actionText}</Text>
      </Pressable>
    ) : null);

  return (
    <View
      accessibilityLabel={subtitle ? `${title} ${subtitle}` : title}
      style={styles.header}
    >
      {onBack ? (
        <Pressable
          accessibilityLabel="이전 화면으로 돌아가기"
          accessibilityRole="button"
          hitSlop={designSystem.spacing[3]}
          onPress={onBack}
          style={styles.backButton}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={headerBackIcon}
            style={styles.backIcon}
          />
        </Pressable>
      ) : null}
      <View style={styles.left}>
        <Pressable
          accessibilityLabel="급여 홈"
          accessibilityRole={onBrandPress ? "button" : undefined}
          disabled={!onBrandPress}
          onPress={onBrandPress}
          style={styles.brandRow}
        >
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="급여납치 공식 BI"
            resizeMode="contain"
            source={headerBrandLogo}
            style={styles.logo}
          />
          <Text style={styles.brandText}>{brandLabel}</Text>
        </Pressable>
        <View style={styles.copy}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      {accessory}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: designSystem.header.height + designSystem.spacing[5],
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: designSystem.spacing[3],
  },
  actionButton: {
    minHeight: designSystem.header.actionSize,
    minWidth: designSystem.header.actionSize + designSystem.spacing[2],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: designSystem.radius.full,
    backgroundColor: componentColors.primaryGreenSoft,
  },
  actionText: {
    color: componentColors.primaryGreenDark,
    ...designSystem.typography.labelM,
  },
  backButton: {
    minHeight: designSystem.header.actionSize,
    minWidth: designSystem.header.actionSize,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: designSystem.radius.full,
    backgroundColor: componentColors.surface,
  },
  backIcon: {
    height: designSystem.spacing[6],
    width: designSystem.spacing[6],
    tintColor: componentColors.textPrimary,
  },
  left: {
    flex: 1,
    gap: designSystem.spacing[2],
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: designSystem.spacing[1],
  },
  logo: {
    width: designSystem.navigation.bottomTabs.iconSize + 2,
    height: designSystem.navigation.bottomTabs.iconSize + 2,
    borderRadius: designSystem.radius.md,
  },
  brandText: {
    color: componentColors.textPrimary,
    fontSize: designSystem.typography.bodyL.fontSize,
    fontWeight: designSystem.typography.titleM.fontWeight,
  },
  copy: {
    gap: designSystem.spacing[1],
  },
  subtitle: {
    color: componentColors.textSecondary,
    fontSize: designSystem.typography.labelS.fontSize,
    fontWeight: designSystem.typography.labelS.fontWeight,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: designSystem.typography.titleXL.fontSize,
    fontWeight: designSystem.typography.titleXL.fontWeight,
  },
});
