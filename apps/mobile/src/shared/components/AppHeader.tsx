import { Image, StyleSheet, Text, View } from "react-native";

import { appImageAssets } from "../assets/images";
import { componentColors, salaryHijackingDesignSystem } from "./tokens";

const designSystem = salaryHijackingDesignSystem;

export type AppHeaderProps = Readonly<{
  title: string;
  subtitle?: string;
  rightAccessory?: React.ReactNode;
  brandLabel?: string;
}>;

export function AppHeader({
  title,
  subtitle,
  rightAccessory,
  brandLabel = "SALARY HIJACKING",
}: AppHeaderProps): React.ReactElement {
  return (
    <View
      accessibilityLabel={subtitle ? `${title} ${subtitle}` : title}
      style={styles.header}
    >
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="급여납치 공식 BI"
            resizeMode="contain"
            source={appImageAssets.brand.platformLogo}
            style={styles.logo}
          />
          <Text style={styles.brandText}>{brandLabel}</Text>
        </View>
        <View style={styles.copy}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      {rightAccessory}
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
