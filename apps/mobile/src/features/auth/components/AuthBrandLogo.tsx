/* eslint-disable @typescript-eslint/no-require-imports */
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  useWindowDimensions,
} from "react-native";

import {
  authVisualColors,
  clampValue,
} from "./AuthVisualFrame";
import { salaryHijackingDesignSystem } from "../../../shared/components/tokens";

const EUREKA_WORLD_LOGO_ASPECT_RATIO = 177 / 1280;
const designSystem = salaryHijackingDesignSystem;
const platformLogo =
  require("../../../shared/assets/images/brand/salary-hijacking-platform-logo.png") as ImageSourcePropType;
const eurekaWorldLogo =
  require("../../../shared/assets/images/brand/eureka-world-logo.jpg") as ImageSourcePropType;

export type AuthBrandLogoProps = Readonly<{
  compact?: boolean;
}>;

export function AuthBrandLogo({
  compact = false,
}: AuthBrandLogoProps): React.ReactElement {
  const { width } = useWindowDimensions();
  const iconSize = compact
    ? clampValue(width * 0.23, 78, 112)
    : clampValue(width * 0.25, 88, 124);
  const titleSize = compact
    ? clampValue(width * 0.132, 42, 58)
    : clampValue(width * 0.14, 46, 62);
  const subtitleSize = compact
    ? clampValue(width * 0.057, 18, 25)
    : clampValue(width * 0.061, 20, 27);

  return (
    <View accessibilityLabel="급여납치 브랜드 로고" style={styles.brandBlock}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={platformLogo}
        style={{ height: iconSize, width: iconSize }}
      />
      <Text
        allowFontScaling={false}
        selectable
        style={[styles.brandTitle, { fontSize: titleSize }]}
      >
        급여납치
      </Text>
      <Text
        allowFontScaling={false}
        selectable
        style={[styles.brandSubtitle, { fontSize: subtitleSize }]}
      >
        SALARY HIJACKING
      </Text>
    </View>
  );
}

export function EurekaWorldMark(): React.ReactElement {
  const { width } = useWindowDimensions();
  const logoWidth = clampValue(width * 0.52, 190, Math.min(300, width * 0.84));
  const logoHeight = logoWidth * EUREKA_WORLD_LOGO_ASPECT_RATIO;

  return (
    <View style={styles.eurekaRow}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="Eureka World 공식 로고"
        resizeMode="contain"
        source={eurekaWorldLogo}
        style={{ height: logoHeight, width: logoWidth }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    alignItems: "center",
    width: "100%",
  },
  brandSubtitle: {
    color: authVisualColors.ink,
    fontSize: designSystem.typography.titleL.fontSize,
    fontWeight: designSystem.typography.titleL.fontWeight,
    includeFontPadding: false,
    letterSpacing: designSystem.typography.titleL.letterSpacing,
    lineHeight: designSystem.typography.titleL.lineHeight,
    marginTop: designSystem.spacing[2],
    textAlign: "center",
  },
  brandTitle: {
    color: authVisualColors.brandGreen,
    fontSize: designSystem.typography.display.fontSize,
    fontWeight: designSystem.typography.display.fontWeight,
    includeFontPadding: false,
    letterSpacing: designSystem.typography.display.letterSpacing,
    lineHeight: designSystem.typography.display.lineHeight,
    marginTop: designSystem.spacing[5],
    textAlign: "center",
  },
  eurekaRow: {
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
  },
});
