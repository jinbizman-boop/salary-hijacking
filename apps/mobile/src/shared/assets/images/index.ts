/* eslint-disable @typescript-eslint/no-require-imports -- React Native image assets must use static require() calls for Metro bundling. */
import type { ImageSourcePropType } from "react-native";

export const appImageAssets = {
  brand: {
    platformLogo:
      require("../../../../assets/runtime-images/brand/salary-hijacking-platform-logo.png") as ImageSourcePropType,
    logotypeWhite:
      require("../../../../assets/runtime-images/brand/logotype-white.png") as ImageSourcePropType,
    eurekaWorldLogo:
      require("../../../../assets/runtime-images/brand/eureka-world-logo.jpg") as ImageSourcePropType,
  },
} as const;
