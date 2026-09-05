import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { auditMobileSafeAreaKeyboard } from "./audit-mobile-safe-area-keyboard.mjs";

function tempRootWithFile(file, source) {
  const root = mkdtempSync(join(tmpdir(), "salary-mobile-safe-area-"));
  const fullPath = join(root, ...file.split("/"));
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, source);
  return root;
}

test("passes when a contract file includes all required safe-area and keyboard checks", () => {
  const file = "apps/mobile/src/shared/components/AppShell.tsx";
  const root = tempRootWithFile(
    file,
    `
      KeyboardAvoidingView
      useSafeAreaInsets
      keyboardVerticalOffset={insets.top}
      paddingTop: insets.top
      paddingBottom: 96 + insets.bottom
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      useOptionalSafeAreaInsets
    `,
  );

  const result = auditMobileSafeAreaKeyboard({
    root,
    contracts: [
      {
        file,
        checks: [
          "KeyboardAvoidingView",
          "useSafeAreaInsets",
          "keyboardVerticalOffset={insets.top}",
          "paddingTop: insets.top",
          "paddingBottom: 96 + insets.bottom",
          "automaticallyAdjustKeyboardInsets",
          'contentInsetAdjustmentBehavior="automatic"',
          'keyboardDismissMode="interactive"',
          'keyboardShouldPersistTaps="handled"',
          "useOptionalSafeAreaInsets",
        ],
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.failedFiles, 0);
  assert.deepEqual(
    result.targetViewportWidths,
    [320, 360, 375, 390, 393, 412, 430, 768],
  );
});

test("fails when keyboard inset handling is missing", () => {
  const file = "apps/mobile/src/features/plan/components/PlanScreen.tsx";
  const root = tempRootWithFile(file, "KeyboardAvoidingView useSafeAreaInsets");

  const result = auditMobileSafeAreaKeyboard({
    root,
    contracts: [
      {
        file,
        checks: [
          "KeyboardAvoidingView",
          "useSafeAreaInsets",
          "keyboardVerticalOffset={insets.top}",
          "automaticallyAdjustKeyboardInsets",
        ],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.failures[0].missing.includes("keyboardVerticalOffset={insets.top}"),
    true,
  );
  assert.equal(
    result.failures[0].missing.includes("automaticallyAdjustKeyboardInsets"),
    true,
  );
});

test("fails when the target production file is absent", () => {
  const root = mkdtempSync(join(tmpdir(), "salary-mobile-safe-area-"));

  const result = auditMobileSafeAreaKeyboard({
    root,
    contracts: [
      {
        file: "apps/mobile/app/(tabs)/_layout.tsx",
        checks: ["useSafeAreaInsets"],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.failures[0].missing, ["file_exists"]);
});
