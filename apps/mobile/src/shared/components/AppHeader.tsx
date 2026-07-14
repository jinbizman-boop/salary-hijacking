import { Image, StyleSheet, Text, View } from "react-native";

import { appImageAssets } from "../assets/images";
import { componentColors } from "./tokens";

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
    minHeight: 76,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  left: {
    flex: 1,
    gap: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  brandText: {
    color: componentColors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  copy: {
    gap: 4,
  },
  subtitle: {
    color: componentColors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
  },
});
