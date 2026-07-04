import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runMobileE2eCi } from "./run-e2e-ci.mjs";

const makeWorkspace = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-e2e-ci-"));

const readObservation = (rootDir) =>
  JSON.parse(
    fs.readFileSync(
      path.join(rootDir, "release", "mobile-native-observation.local.json"),
      "utf8",
    ),
  );

test("skips CI E2E without an APK while writing no-secret blocked observation", () => {
  const rootDir = makeWorkspace();
  try {
    const mobileRootDir = path.join(rootDir, "apps", "mobile");
    fs.mkdirSync(mobileRootDir, { recursive: true });
    let called = false;

    const result = runMobileE2eCi({
      env: {},
      existsSync: () => false,
      mobileRootDir,
      repositoryRootDir: rootDir,
      runAndroid() {
        called = true;
        return { status: 0 };
      },
    });

    assert.equal(result.status, 0);
    assert.equal(result.skipped, true);
    assert.equal(called, false);
    const observation = readObservation(rootDir);
    assert.equal(observation.secretsRedacted, true);
    assert.equal(observation.containsSecretValues, false);
    assert.equal(observation.android.nativeE2eVerified, false);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("fails when native E2E is required and the APK is missing", () => {
  const rootDir = makeWorkspace();
  try {
    const mobileRootDir = path.join(rootDir, "apps", "mobile");
    fs.mkdirSync(mobileRootDir, { recursive: true });

    const result = runMobileE2eCi({
      env: { MOBILE_NATIVE_E2E_REQUIRED: "true" },
      existsSync: () => false,
      mobileRootDir,
      repositoryRootDir: rootDir,
    });

    assert.equal(result.status, 2);
    assert.equal(result.skipped, false);
    assert.equal(
      fs.existsSync(
        path.join(rootDir, "release", "mobile-native-observation.local.json"),
      ),
      false,
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test("runs Detox when an APK exists and records verified no-secret observation", () => {
  const rootDir = makeWorkspace();
  try {
    const mobileRootDir = path.join(rootDir, "apps", "mobile");
    const apkPath = path.join(
      mobileRootDir,
      "build",
      "e2e",
      "android",
      "salary-hijacking-e2e.apk",
    );
    fs.mkdirSync(path.dirname(apkPath), { recursive: true });
    fs.writeFileSync(apkPath, "PK\u0003\u0004", "utf8");
    const calls = [];

    const result = runMobileE2eCi({
      env: {},
      existsSync: fs.existsSync,
      mobileRootDir,
      repositoryRootDir: rootDir,
      runAndroid(options) {
        calls.push(options);
        return { status: 0 };
      },
    });

    assert.equal(result.status, 0);
    assert.equal(result.skipped, false);
    assert.equal(calls.length, 1);
    const observation = readObservation(rootDir);
    assert.equal(observation.android.nativeE2eVerified, true);
    assert.equal(observation.privacy.containsBinaryDownloadUrl, false);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
