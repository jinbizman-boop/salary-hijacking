#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

const defaultContracts = [
  {
    file: "apps/mobile/app/(tabs)/_layout.tsx",
    checks: [
      "useSafeAreaInsets",
      "tabBarHideOnKeyboard: true",
      "salaryHijackingTheme.layout.bottomTabHeight",
      "Math.max(insets.bottom",
      "paddingBottom: Math.max(insets.bottom",
      "salaryHijackingTheme.layout.touchTarget",
      "useOptionalSafeAreaInsets",
    ],
  },
  {
    file: "apps/mobile/src/shared/components/AppShell.tsx",
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
  {
    file: "apps/mobile/src/shared/components/BottomTabBar.tsx",
    checks: [
      "useSafeAreaInsets",
      "minHeight: 76 + insets.bottom",
      "paddingBottom: 12 + insets.bottom",
      "minHeight: 44",
      "minWidth: 64",
      "useOptionalSafeAreaInsets",
    ],
  },
  {
    file: "apps/mobile/src/features/auth/components/AuthVisualFrame.tsx",
    checks: [
      "KeyboardAvoidingView",
      "useSafeAreaInsets",
      "useWindowDimensions",
      "keyboardVerticalOffset={insets.top}",
      "automaticallyAdjustKeyboardInsets",
      "paddingBottom: Math.max(insets.bottom",
      "paddingTop: Math.max(insets.top",
      'keyboardDismissMode="interactive"',
      'keyboardShouldPersistTaps="handled"',
      "clampValue(width",
      "useOptionalSafeAreaInsets",
    ],
  },
  {
    file: "apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx",
    checks: [
      "KeyboardAvoidingView",
      "useSafeAreaInsets",
      "keyboardVerticalOffset",
      "automaticallyAdjustKeyboardInsets",
      "paddingBottom: insets.bottom + 340",
      'keyboardDismissMode="interactive"',
      'keyboardShouldPersistTaps="handled"',
      "useOptionalSafeAreaInsets",
    ],
  },
  {
    file: "apps/mobile/src/features/plan/components/PlanScreen.tsx",
    checks: [
      "KeyboardAvoidingView",
      "useSafeAreaInsets",
      "keyboardVerticalOffset={insets.top}",
      "automaticallyAdjustKeyboardInsets",
      "paddingBottom: insets.bottom + 96",
      'keyboardDismissMode="interactive"',
      'keyboardShouldPersistTaps="handled"',
      "useOptionalSafeAreaInsets",
    ],
  },
  {
    file: "apps/mobile/src/features/plan/components/FixedExpenseFormScreen.tsx",
    checks: [
      "KeyboardAvoidingView",
      "useSafeAreaInsets",
      "keyboardVerticalOffset={insets.top}",
      "automaticallyAdjustKeyboardInsets",
      "componentSpacing.lg + insets.bottom",
      'keyboardDismissMode="interactive"',
      'keyboardShouldPersistTaps="handled"',
      "useOptionalSafeAreaInsets",
    ],
  },
  {
    file: "apps/mobile/src/features/plan/components/FixedSavingsFormScreen.tsx",
    checks: [
      "KeyboardAvoidingView",
      "useSafeAreaInsets",
      "keyboardVerticalOffset={insets.top}",
      "automaticallyAdjustKeyboardInsets",
      "componentSpacing.lg + insets.bottom",
      'keyboardDismissMode="interactive"',
      'keyboardShouldPersistTaps="handled"',
      "useOptionalSafeAreaInsets",
    ],
  },
  {
    file: "apps/mobile/src/features/plan/components/DailyBudgetFormScreen.tsx",
    checks: [
      "KeyboardAvoidingView",
      "useSafeAreaInsets",
      "keyboardVerticalOffset={insets.top}",
      "automaticallyAdjustKeyboardInsets",
      "componentSpacing.lg + insets.bottom",
      'keyboardDismissMode="interactive"',
      'keyboardShouldPersistTaps="handled"',
      "useOptionalSafeAreaInsets",
    ],
  },
  {
    file: "apps/mobile/src/features/notifications/components/NotificationScreen.tsx",
    checks: [
      "useSafeAreaInsets",
      "useWindowDimensions",
      "paddingTop: insets.top",
      "paddingBottom: insets.bottom + 18",
      'contentInsetAdjustmentBehavior="automatic"',
      "useOptionalSafeAreaInsets",
    ],
  },
  {
    file: "apps/mobile/src/features/notifications/components/NotificationSettingsScreen.tsx",
    checks: [
      "useSafeAreaInsets",
      "useWindowDimensions",
      "paddingTop: insets.top",
      "paddingBottom: insets.bottom + 28",
      'contentInsetAdjustmentBehavior="automatic"',
      'keyboardShouldPersistTaps="handled"',
      "useOptionalSafeAreaInsets",
    ],
  },
];

const targetViewportWidths = [320, 360, 375, 390, 393, 412, 430, 768];

function readSource(root, file) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    return { exists: false, path, source: "" };
  }
  return { exists: true, path, source: readFileSync(path, "utf8") };
}

export function auditMobileSafeAreaKeyboard({
  contracts = defaultContracts,
  root = repoRoot,
} = {}) {
  const failures = [];
  const results = [];

  for (const contract of contracts) {
    const fileResult = readSource(root, contract.file);
    const missing = [];
    if (!fileResult.exists) {
      missing.push("file_exists");
    } else {
      for (const check of contract.checks) {
        if (!fileResult.source.includes(check)) missing.push(check);
      }
    }

    const result = {
      file: contract.file,
      ok: missing.length === 0,
      requiredChecks: contract.checks.length,
      missing,
    };
    results.push(result);
    if (!result.ok) failures.push(result);
  }

  return {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    targetViewportWidths,
    contractFiles: contracts.length,
    failedFiles: failures.length,
    results,
    failures,
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = auditMobileSafeAreaKeyboard();
  const jsonPath = argValue("--json");
  if (jsonPath) {
    writeFileSync(resolve(repoRoot, jsonPath), `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        contractFiles: result.contractFiles,
        failedFiles: result.failedFiles,
        targetViewportWidths: result.targetViewportWidths,
      },
      null,
      2,
    ),
  );
  process.exitCode = result.ok ? 0 : 1;
}
