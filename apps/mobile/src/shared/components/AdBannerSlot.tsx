/* eslint-disable @typescript-eslint/no-require-imports */
import * as React from "react";
import type { ComponentType } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import {
  componentColors,
  componentRadius,
  componentSpacing,
  salaryHijackingDesignSystem,
} from "./tokens";

const typography = salaryHijackingDesignSystem.typography;

export type AdBannerPlacement =
  | "AD-APP-SALARY-01"
  | "AD-APP-LVUP-01"
  | "AD-APP-LVUP-02"
  | "AD-APP-MY-01";

export type AdBannerSlotProps = Readonly<{
  label: "광고" | "제휴" | "제휴/광고";
  placement?: AdBannerPlacement;
  title: string;
  description: string;
}>;

type AdLoadState = "RESERVED" | "LOADING" | "FILLED" | "NO_FILL" | "ERROR";

type BannerAdFailure = Readonly<{
  code?: string;
  message?: string;
}>;

type BannerAdComponent = ComponentType<{
  readonly unitId: string;
  readonly size: string;
  readonly requestOptions?: Readonly<{
    readonly requestNonPersonalizedAdsOnly?: boolean;
  }>;
  readonly onAdLoaded?: () => void;
  readonly onAdFailedToLoad?: (error: BannerAdFailure) => void;
}>;

type GoogleMobileAdsSdk = Readonly<{
  BannerAd: BannerAdComponent;
  BannerAdSize: Readonly<{
    ANCHORED_ADAPTIVE_BANNER: string;
    BANNER: string;
  }>;
  TestIds: Readonly<{
    BANNER: string;
  }>;
}>;

export const ADMOB_BANNER_PLACEMENTS: Readonly<
  Record<
    AdBannerPlacement,
    Readonly<{
      productionEnvKey: string;
      screen: "LV_UP" | "MY" | "SALARY";
    }>
  >
> = {
  "AD-APP-SALARY-01": {
    productionEnvKey: "EXPO_PUBLIC_ADMOB_SALARY_BANNER_UNIT_ID",
    screen: "SALARY",
  },
  "AD-APP-LVUP-01": {
    productionEnvKey: "EXPO_PUBLIC_ADMOB_LVUP_HEADER_BANNER_UNIT_ID",
    screen: "LV_UP",
  },
  "AD-APP-LVUP-02": {
    productionEnvKey: "EXPO_PUBLIC_ADMOB_LVUP_SUMMARY_BANNER_UNIT_ID",
    screen: "LV_UP",
  },
  "AD-APP-MY-01": {
    productionEnvKey: "EXPO_PUBLIC_ADMOB_MY_BANNER_UNIT_ID",
    screen: "MY",
  },
} as const;

export const ADMOB_PRIVACY_CONTRACT = {
  financialTargetingAllowed: false,
  rawFinancialContextShared: false,
  requestNonPersonalizedAdsOnly: true,
} as const;

let cachedGoogleMobileAdsSdk: GoogleMobileAdsSdk | null | undefined;

function loadGoogleMobileAdsSdk(): GoogleMobileAdsSdk | null {
  if (cachedGoogleMobileAdsSdk !== undefined) return cachedGoogleMobileAdsSdk;
  try {
    const sdk = require("react-native-google-mobile-ads") as Partial<GoogleMobileAdsSdk>;
    if (!sdk.BannerAd || !sdk.BannerAdSize || !sdk.TestIds) {
      cachedGoogleMobileAdsSdk = null;
      return cachedGoogleMobileAdsSdk;
    }
    cachedGoogleMobileAdsSdk = sdk as GoogleMobileAdsSdk;
    return cachedGoogleMobileAdsSdk;
  } catch {
    cachedGoogleMobileAdsSdk = null;
    return cachedGoogleMobileAdsSdk;
  }
}

function placementFromTitle(title: string): AdBannerPlacement | null {
  return Object.hasOwn(ADMOB_BANNER_PLACEMENTS, title)
    ? (title as AdBannerPlacement)
    : null;
}

function adEnvironment(): string {
  return (process.env.APP_ENV ?? process.env.NODE_ENV ?? "staging")
    .trim()
    .toLowerCase();
}

function resolveAdMobUnitId(
  placement: AdBannerPlacement,
  sdk: GoogleMobileAdsSdk,
): string {
  if (adEnvironment() !== "production") return sdk.TestIds.BANNER;
  const unitId =
    process.env[ADMOB_BANNER_PLACEMENTS[placement].productionEnvKey]?.trim() ??
    "";
  return /^ca-app-pub-\d{16}\/\d{10}$/u.test(unitId) ? unitId : "";
}

function isNoFill(error: BannerAdFailure): boolean {
  const code = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return code.includes("no_fill") || code.includes("no fill");
}

export function AdBannerSlot({
  label,
  placement,
  title,
  description,
}: AdBannerSlotProps): React.ReactElement {
  const [adLoadState, setAdLoadState] = React.useState<AdLoadState>("RESERVED");
  const adPlacement = placement ?? placementFromTitle(title);
  const sdk = Platform.OS === "web" ? null : loadGoogleMobileAdsSdk();
  const unitId = adPlacement && sdk ? resolveAdMobUnitId(adPlacement, sdk) : "";
  const BannerAd = sdk?.BannerAd;
  const bannerSize = sdk?.BannerAdSize.ANCHORED_ADAPTIVE_BANNER;
  const adBanner =
    BannerAd && bannerSize && unitId
      ? React.createElement(BannerAd, {
          onAdFailedToLoad: (error: BannerAdFailure) => {
            setAdLoadState(isNoFill(error) ? "NO_FILL" : "ERROR");
          },
          onAdLoaded: () => {
            setAdLoadState("FILLED");
          },
          requestOptions: {
            requestNonPersonalizedAdsOnly:
              ADMOB_PRIVACY_CONTRACT.requestNonPersonalizedAdsOnly,
          },
          size: bannerSize,
          unitId,
        })
      : null;

  if (adLoadState === "NO_FILL" || adLoadState === "ERROR") {
    return <View accessibilityLabel={`${title} ${adLoadState}`} />;
  }

  return (
    <View accessibilityLabel={`${label} ${title}`} style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {adBanner ? (
        <View accessibilityLabel={`${title} AdMob banner`} style={styles.banner}>
          {adBanner}
        </View>
      ) : null}
      <Text style={styles.guard}>
        민감 금융 데이터로 맞춤 타겟팅하지 않아요.
      </Text>
      <Text style={styles.state}>{adLoadState}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  container: {
    gap: componentSpacing.xs,
    padding: componentSpacing.md,
    borderWidth: 1,
    borderColor: salaryHijackingDesignSystem.colors.semantic.warning,
    borderRadius: componentRadius.card,
    backgroundColor: salaryHijackingDesignSystem.colors.semantic.warningSoft,
  },
  label: {
    color: componentColors.warningOrange,
    fontSize: typography.labelS.fontSize,
    fontWeight: typography.labelS.fontWeight,
  },
  title: {
    color: componentColors.textPrimary,
    fontSize: typography.labelL.fontSize,
    fontWeight: typography.labelL.fontWeight,
  },
  description: {
    color: componentColors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  guard: {
    color: componentColors.textPrimary,
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
  },
  state: {
    color: componentColors.textMuted,
    fontSize: 1,
    height: 1,
    opacity: 0,
  },
});
