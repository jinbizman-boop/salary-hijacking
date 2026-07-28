import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditMobileAccessibilityCritical } from "./audit-mobile-accessibility-critical.mjs";

function tempMobileSource(source) {
  const root = mkdtempSync(join(tmpdir(), "salary-mobile-a11y-"));
  const dir = join(root, "apps", "mobile", "src", "features", "salary");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SalaryScreen.tsx"), source);
  return root;
}

test("passes touchable controls with role and label", () => {
  const root = tempMobileSource(`
    export function Screen() {
      return <Pressable accessibilityLabel="저장" accessibilityRole="button" />;
    }
  `);

  const result = auditMobileAccessibilityCritical({ root });

  assert.equal(result.ok, true);
  assert.equal(result.failedChecks, 0);
});

test("fails touchable controls missing an accessibility label", () => {
  const root = tempMobileSource(`
    export function Screen() {
      return <Pressable accessibilityRole="button" />;
    }
  `);

  const result = auditMobileAccessibilityCritical({ root });

  assert.equal(result.ok, false);
  assert.equal(result.failures[0].missing.includes("accessibilityLabel"), true);
});

test("fails touchable controls missing an accessibility role", () => {
  const root = tempMobileSource(`
    export function Screen() {
      return <TouchableOpacity accessibilityLabel="글쓰기" />;
    }
  `);

  const result = auditMobileAccessibilityCritical({ root });

  assert.equal(result.ok, false);
  assert.equal(result.failures[0].missing.includes("accessibilityRole"), true);
});
