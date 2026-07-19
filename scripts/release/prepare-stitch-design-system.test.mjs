import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "prepare-stitch-design-system.mjs",
);
const downloadsDir = "C:/Users/PC/Downloads";

test("Stitch preparation inventories every supplied zip and resolves 17 canonical screens", () => {
  assert.equal(
    existsSync(scriptPath),
    true,
    "prepare-stitch-design-system.mjs must exist",
  );

  const output = execFileSync(
    process.execPath,
    [scriptPath, "--dry-run", "--downloads", downloadsDir],
    { encoding: "utf8" },
  );
  const summary = JSON.parse(output);

  assert.equal(summary.zipCount, 10);
  assert.equal(summary.canonicalScreens.length, 17);
  assert.deepEqual(
    summary.canonicalScreens.map((screen) => screen.name),
    [
      "splash",
      "login",
      "signup",
      "salary-home",
      "notifications",
      "plan-settings",
      "level-main",
      "reading",
      "news",
      "english",
      "health",
      "community-all",
      "community-free",
      "community-level-certification",
      "community-hobby",
      "community-write",
      "profile",
    ],
  );
  assert.equal(summary.repoStoresSourceZipCopies, false);
  assert.equal(summary.missingCanonicalScreens.length, 0);
  assert.equal(summary.missingCanonicalHtml.length, 0);
});
