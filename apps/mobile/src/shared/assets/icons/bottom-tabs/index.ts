/* eslint-disable @typescript-eslint/no-require-imports -- React Native icon assets must use static require() calls for Metro bundling. */
import type { ImageSourcePropType } from "react-native";

export const bottomTabIconAssets = {
  salary: require("./salary-tab.png") as ImageSourcePropType,
  plan: require("./plan-tab.png") as ImageSourcePropType,
  level: require("./level-tab.png") as ImageSourcePropType,
  community: require("./community-tab.png") as ImageSourcePropType,
  profile: require("./profile-tab.png") as ImageSourcePropType,
} as const;
