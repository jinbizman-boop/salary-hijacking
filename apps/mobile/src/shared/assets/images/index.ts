import type { ImageSourcePropType } from "react-native";

export const appImageAssets = {
  brand: {
    platformLogo:
      require("./brand/salary-hijacking-platform-logo.png") as ImageSourcePropType,
    logotypeWhite: require("./brand/logotype-white.png") as ImageSourcePropType,
    eurekaWorldLogo:
      require("./brand/eureka-world-logo.jpg") as ImageSourcePropType,
  },
} as const;
