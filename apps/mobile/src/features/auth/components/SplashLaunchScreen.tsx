import { View, useWindowDimensions } from "react-native";

import {
  AuthBrandLogo,
  AuthVisualFrame,
  EurekaWorldMark,
  clampValue,
} from "./AuthVisualFrame";

export type SplashLaunchScreenProps = Readonly<{
  routeDelayMs: number;
}>;

export function SplashLaunchScreen({
  routeDelayMs: _routeDelayMs,
}: SplashLaunchScreenProps): React.ReactElement {
  const { height } = useWindowDimensions();

  return (
    <AuthVisualFrame accessibilityLabel="급여납치 시작 화면">
      <View style={{ height: clampValue(height * 0.36, 218, 384) }} />
      <AuthBrandLogo />
      <View
        style={{ flex: 1, minHeight: clampValue(height * 0.17, 88, 184) }}
      />
      <EurekaWorldMark />
      <View style={{ height: clampValue(height * 0.1, 56, 110) }} />
    </AuthVisualFrame>
  );
}
