import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runArtifactLineageCheck } from "./check-artifact-lineage.mjs";

async function writeCheckpoint(rootDir, rcSourceSha) {
  const filePath = path.join(rootDir, "docs/audit/EXECUTION_STATE.md");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `- RC_SOURCE_SHA: \`${rcSourceSha}\`\n`, "utf8");
}

async function writeBuildInfo(rootDir, buildInfo) {
  const filePath = path.join(rootDir, "release/evidence/build-artifacts.json");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(buildInfo, null, 2)}\n`, "utf8");
}

const apkPath = "artifacts/android/app.apk";

test("passes when build artifact metadata matches RC_SOURCE_SHA", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-lineage-"));
  const sha = "a".repeat(40);

  try {
    await writeCheckpoint(rootDir, sha);
    await mkdir(path.join(rootDir, "artifacts/android"), { recursive: true });
    await writeFile(path.join(rootDir, apkPath), "apk");
    await writeBuildInfo(rootDir, {
      gitCommit: sha,
      file: apkPath,
      bundleSha256: "b".repeat(64),
    });

    const result = runArtifactLineageCheck({ rootDir });

    assert.equal(result.ok, true);
    assert.deepEqual(result.gitCommits, [sha]);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when stale APK metadata points at a different source commit", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-lineage-"));

  try {
    await writeCheckpoint(rootDir, "a".repeat(40));
    await writeBuildInfo(rootDir, {
      gitCommit: "b".repeat(40),
      file: apkPath,
      bundleSha256: "c".repeat(64),
    });

    const result = runArtifactLineageCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /does not match RC_SOURCE_SHA/u);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("fails when APK file or bundle hash evidence is missing", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-lineage-"));
  const sha = "d".repeat(40);

  try {
    await writeCheckpoint(rootDir, sha);
    await writeBuildInfo(rootDir, {
      gitCommit: sha,
      file: apkPath,
    });

    const result = runArtifactLineageCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.failures.join("\n"), /artifact file missing/u);
    assert.match(result.failures.join("\n"), /missing bundleSha256/u);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
