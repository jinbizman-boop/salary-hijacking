/* eslint-disable @typescript-eslint/no-require-imports -- React Native icon assets must use static require() calls for Metro bundling. */
import type { ImageSourcePropType } from "react-native";

export const bottomTabIconAssets = {
  salary: require("./bottom-tabs/salary-tab.png") as ImageSourcePropType,
  plan: require("./bottom-tabs/plan-tab.png") as ImageSourcePropType,
  level: require("./bottom-tabs/level-tab.png") as ImageSourcePropType,
  community: require("./bottom-tabs/community-tab.png") as ImageSourcePropType,
  profile: require("./bottom-tabs/profile-tab.png") as ImageSourcePropType,
} as const;
