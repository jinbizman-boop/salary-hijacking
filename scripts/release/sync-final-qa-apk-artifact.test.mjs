import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import {
  buildFinalQaApkSyncPlan,
  syncFinalQaApkArtifact,
} from "./sync-final-qa-apk-artifact.mjs";

const fixtureWorkspaces = new Set();

afterEach(() => {
  for (const rootDir of fixtureWorkspaces) {
    fs.rmSync(rootDir, {
      force: true,
      maxRetries: 3,
      recursive: true,
      retryDelay: 50,
    });
    fixtureWorkspaces.delete(rootDir);
  }
});

const makeWorkspace = () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "salary-final-apk-"));
  fixtureWorkspaces.add(rootDir);
  return rootDir;
};

const write = (rootDir, relativePath, contents = "") => {
  const targetPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents);
  return targetPath;
};

const sha256 = (contents) =>
  createHash("sha256").update(contents).digest("hex").toUpperCase();

test("plans stable final QA APK paths from the latest safe-entry source APK", () => {
  const rootDir = makeWorkspace();
  const sourceApk = write(rootDir, "artifacts/android/latest.apk", "APK");

  const plan = buildFinalQaApkSyncPlan({ rootDir, sourceApk });

  assert.equal(plan.sourceApk, sourceApk);
  assert.deepEqual(plan.targets, [
    path.join(rootDir, "artifacts/android/salary-hijacking-qa-universal.apk"),
    "C:/Users/PC/Downloads/salary-hijacking-qa-universal.apk",
    "D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-universal.apk",
  ]);
  assert.deepEqual(plan.sha256Targets, [
    path.join(
      rootDir,
      "artifacts/android/salary-hijacking-qa-universal.apk.sha256",
    ),
    "C:/Users/PC/Downloads/salary-hijacking-qa-universal.apk.sha256",
    "D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-universal.apk.sha256",
  ]);
  assert.equal(plan.sha256, sha256("APK"));
});

test("copies final QA APK, writes checksum files, and records no-secret manifest", () => {
  const rootDir = makeWorkspace();
  const sourceApk = write(rootDir, "artifacts/android/latest.apk", "APK");
  const target = path.join(rootDir, "artifacts/android/final.apk");
  const checksum = `${target}.sha256`;
  const manifest = path.join(rootDir, "artifacts/android/final-manifest.json");

  const result = syncFinalQaApkArtifact({
    rootDir,
    sourceApk,
    targets: [target],
    sha256Targets: [checksum],
    manifestPath: manifest,
    now: () => new Date("2026-07-23T11:00:00.000Z"),
  });

  assert.equal(fs.readFileSync(target, "utf8"), "APK");
  assert.equal(
    fs.readFileSync(checksum, "utf8"),
    `${sha256("APK")}  final.apk\n`,
  );
  assert.equal(result.sha256, sha256("APK"));

  const manifestJson = JSON.parse(fs.readFileSync(manifest, "utf8"));
  assert.equal(manifestJson.sha256, sha256("APK"));
  assert.equal(manifestJson.generatedAt, "2026-07-23T11:00:00.000Z");
  assert.equal(manifestJson.secretsRedacted, true);
  assert.equal(manifestJson.containsSecretValues, false);
  assert.doesNotMatch(
    JSON.stringify(manifestJson),
    /sk-[A-Za-z0-9]|EAS_[A-Z_]+|DATABASE_URL|\.keystore|BEGIN PRIVATE KEY/i,
  );
});
