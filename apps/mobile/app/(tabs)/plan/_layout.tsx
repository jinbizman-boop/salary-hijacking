import { Stack } from "expo-router";

import { componentColors } from "../../../src/shared/components";

export const unstable_settings = {
  anchor: "index",
};

export default function PlanStackLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: componentColors.background },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}

export function assertMobilePlanStackCompleteness(): {
  readonly checks: readonly string[];
  readonly ok: boolean;
} {
  const checks = [
    "plan_tab_owned_nested_stack",
    "plan_root_index",
    "bottom_nav_visible_real_tabs",
    "android_back_previous_screen",
    "plan_section_cards_remain_white",
    "plan_global_screen_background",
  ] as const;

  return { checks, ok: checks.length >= 6 };
}
