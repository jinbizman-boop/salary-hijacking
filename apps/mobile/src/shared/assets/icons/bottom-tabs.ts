/* eslint-disable @typescript-eslint/no-require-imports -- React Native icon assets must use static require() calls for Metro bundling. */
import type { ImageSourcePropType } from "react-native";

export const bottomTabIconAssets = {
  salary: require("../../../../assets/runtime/icons/bottom-tabs/salary-tab.png") as ImageSourcePropType,
  plan: require("../../../../assets/runtime/icons/bottom-tabs/plan-tab.png") as ImageSourcePropType,
  level: require("../../../../assets/runtime/icons/bottom-tabs/level-tab.png") as ImageSourcePropType,
  community: require("../../../../assets/runtime/icons/bottom-tabs/community-tab.png") as ImageSourcePropType,
  profile: require("../../../../assets/runtime/icons/bottom-tabs/profile-tab.png") as ImageSourcePropType,
} as const;
