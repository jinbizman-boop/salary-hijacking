import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { collectWorkspaceDiskUsage } from "./report-workspace-disk-usage.mjs";

async function touch(filePath, size) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, "x".repeat(size), "utf8");
}

test("reports top-level storage and known generated cache paths without deleting files", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-disk-root-"));

  try {
    await touch(path.join(rootDir, "node_modules", "pkg", "index.js"), 30);
    await touch(path.join(rootDir, ".turbo", "cache.bin"), 20);
    await touch(
      path.join(rootDir, "apps", "mobile", ".eas", "build", "log"),
      10,
    );
    await touch(
      path.join(rootDir, "apps", "mobile", "android", ".gradle", "cache.bin"),
      8,
    );
    await touch(path.join(rootDir, "docs", "brief.md"), 5);

    const report = await collectWorkspaceDiskUsage({
      rootDir,
      tempRoots: [],
      topLevelLimit: 5,
    });

    assert.equal(report.rootDir, path.resolve(rootDir));
    assert.equal(report.totalBytes, 73);
    assert.deepEqual(
      report.topLevel.map((entry) => entry.path),
      ["node_modules", ".turbo", "apps", "docs"],
    );
    assert.deepEqual(
      report.generatedPaths
        .filter((entry) => entry.exists)
        .map((entry) => entry.path)
        .sort(),
      [".turbo", "apps/mobile/.eas/build", "apps/mobile/android/.gradle"],
    );
    assert.equal(report.protectedPaths[0]?.path, "node_modules");
    assert.equal(report.protectedPaths[0]?.bytes, 30);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("accepts pnpm run argument separator before CLI options", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-disk-cli-"));

  try {
    await touch(path.join(rootDir, ".turbo", "cache.bin"), 2);
    const scriptPath = path.resolve(
      "scripts",
      "dev",
      "report-workspace-disk-usage.mjs",
    );

    const result = spawnSync(
      process.execPath,
      [scriptPath, "--", "--json", "--root", rootDir, "--top", "1"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.rootDir, path.resolve(rootDir));
    assert.equal(report.topLevel.length, 1);
    assert.equal(
      report.generatedPaths.find((entry) => entry.path === ".turbo")?.exists,
      true,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
