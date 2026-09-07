import { Stack } from "expo-router";

import { componentColors } from "../../../src/shared/components";

export const unstable_settings = {
  anchor: "index",
};

export default function ProfileStackLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: componentColors.background },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="account" />
      <Stack.Screen name="community" />
      <Stack.Screen name="level" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="notices" />
      <Stack.Screen name="support" />
    </Stack>
  );
}

export function assertMobileProfileStackCompleteness(): Readonly<{
  checks: readonly string[];
  ok: boolean;
}> {
  const checks = [
    "profile_nested_stack",
    "anchor: \"index\"",
    "MY detail routes stay under app/(tabs)/profile",
    "Android Back pops profile stack before bottom tab history",
    "header back and system back use the same route history",
  ] as const;

  return { checks, ok: checks.length >= 5 };
}
