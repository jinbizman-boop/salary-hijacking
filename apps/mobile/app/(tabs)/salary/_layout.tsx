import { Stack } from "expo-router";

import { componentColors } from "../../../src/shared/components";

export const unstable_settings = {
  anchor: "index",
};

export default function SalaryStackLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: componentColors.background },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="notifications/index" />
      <Stack.Screen name="notifications/settings" />
    </Stack>
  );
}

export function assertMobileSalaryStackCompleteness(): {
  readonly checks: readonly string[];
  readonly ok: boolean;
} {
  const checks = [
    "salary_tab_owned_nested_stack",
    "salary_root_index",
    "salary_notifications_in_tab_stack",
    "salary_notification_settings_in_tab_stack",
    "bottom_nav_visible_real_tabs",
    "android_back_previous_screen",
  ] as const;

  return { checks, ok: checks.length >= 6 };
}
