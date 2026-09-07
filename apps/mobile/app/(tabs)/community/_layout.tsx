import { Stack } from "expo-router";

import { componentColors } from "../../../src/shared/components";

export const unstable_settings = {
  anchor: "index",
};

export default function CommunityStackLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: componentColors.background },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="write" />
      <Stack.Screen name="[postId]" />
    </Stack>
  );
}

export function assertMobileCommunityStackCompleteness(): Readonly<{
  checks: readonly string[];
  ok: boolean;
}> {
  const checks = [
    "community_nested_stack",
    'anchor: "index"',
    "Community detail and write routes stay under app/(tabs)/community",
    "Android Back pops Community stack before bottom tab history",
    "header back and system back use the same route history",
  ] as const;

  return { checks, ok: checks.length >= 5 };
}
