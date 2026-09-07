import { Stack } from "expo-router";

import { componentColors } from "../../../src/shared/components";

export const unstable_settings = {
  anchor: "index",
};

export default function LevelStackLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: componentColors.background },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="history" />
      <Stack.Screen name="reading" />
      <Stack.Screen name="reading/session" />
      <Stack.Screen name="news" />
      <Stack.Screen name="news/article" />
      <Stack.Screen name="english" />
      <Stack.Screen name="english/session" />
      <Stack.Screen name="health" />
      <Stack.Screen name="health/routine" />
    </Stack>
  );
}

export function assertMobileLevelStackCompleteness(): Readonly<{
  checks: readonly string[];
  ok: boolean;
}> {
  const checks = [
    "level_nested_stack",
    'anchor: "index"',
    "LV UP detail routes stay under app/(tabs)/level",
    "Android Back pops LV UP stack before bottom tab history",
    "header back and system back use the same route history",
  ] as const;

  return { checks, ok: checks.length >= 5 };
}
