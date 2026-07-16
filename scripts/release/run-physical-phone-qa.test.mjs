import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import {
  buildPhysicalPhoneQaPlan,
  parsePhysicalPhoneQaArgs,
  runPhysicalPhoneQa,
} from "./run-physical-phone-qa.mjs";

const fixtureWorkspaces = new Set();

const cleanupWorkspaces = () => {
  for (const rootDir of fixtureWorkspaces) {
    fs.rmSync(rootDir, {
      force: true,
      maxRetries: 3,
      recursive: true,
      retryDelay: 50,
    });
    fixtureWorkspaces.delete(rootDir);
  }
};

afterEach(() => {
  cleanupWorkspaces();
});

const makeWorkspace = () => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-physical-phone-qa-"),
  );
  fixtureWorkspaces.add(rootDir);
  return rootDir;
};

const writeJson = (rootDir, relativePath, value) => {
  const targetPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return targetPath;
};

const makePreviewEvidence = () => ({
  appIdentity: {
    androidPackage: "com.salaryhijacking.mobile",
  },
  android: {
    phoneTargetDebugApkDownloadsPath:
      "C:/Users/PC/Downloads/salary-hijacking-phone-arm64-debug.apk",
    phoneTargetDebugApkSha256:
      "854A17683326408384ED9E95EF45FCFD217891C361E51AFBA1C00BE96447BE22",
  },
});

test("builds a one-command physical phone QA plan from current APK evidence", () => {
  const rootDir = makeWorkspace();
  writeJson(
    rootDir,
    "release/mobile-preview-evidence.json",
    makePreviewEvidence(),
  );

  const plan = buildPhysicalPhoneQaPlan({
    rootDir,
    adbPath: "D:/salary-hijacking-artifacts/android-sdk/platform-tools/adb.exe",
  });

  assert.equal(
    plan.apkPath,
    "C:/Users/PC/Downloads/salary-hijacking-phone-arm64-debug.apk",
  );
  assert.equal(plan.packageName, "com.salaryhijacking.mobile");
  assert.equal(plan.runs, 20);
  assert.equal(
    plan.outputPath,
    "release/mobile-preview-phone-proof.local.json",
  );
  assert.match(
    plan.collectorCommand,
    /collect-mobile-preview-phone-proof\.mjs/,
  );
  assert.match(plan.collectorCommand, /--runs 20/);
  assert.match(plan.collectorCommand, /--package com\.salaryhijacking\.mobile/);
  assert.match(plan.collectorCommand, /--adb "D:\/salary-hijacking-artifacts/);
  assert.doesNotMatch(JSON.stringify(plan), /token|secret|keystore/i);
});

test("uses known artifact adb path when caller does not pass adb", () => {
  const rootDir = makeWorkspace();
  writeJson(
    rootDir,
    "release/mobile-preview-evidence.json",
    makePreviewEvidence(),
  );
  const adbPath = path.join(
    rootDir,
    "artifacts",
    "android-sdk",
    "platform-tools",
    "adb.exe",
  );
  fs.mkdirSync(path.dirname(adbPath), { recursive: true });
  fs.writeFileSync(adbPath, "adb");

  const plan = buildPhysicalPhoneQaPlan({
    rootDir,
    knownAdbPaths: [adbPath],
  });

  assert.equal(plan.adbPath, adbPath);
  assert.match(plan.collectorCommand, /--adb/);
});

test("runs readiness follow-up only after physical phone proof passes", () => {
  const rootDir = makeWorkspace();
  writeJson(
    rootDir,
    "release/mobile-preview-evidence.json",
    makePreviewEvidence(),
  );
  const calls = [];

  const passed = runPhysicalPhoneQa({
    rootDir,
    adbPath: "adb",
    writeProof: () => ({
      proof: {
        android: {
          physicalPhoneVerified: true,
        },
      },
      targetPath: path.join(
        rootDir,
        "release/mobile-preview-phone-proof.local.json",
      ),
    }),
    commandRunner: (command, args) => {
      calls.push([command, args]);
      return { status: 0, stdout: "ready", stderr: "" };
    },
  });

  assert.equal(passed.exitCode, 0);
  assert.equal(passed.physicalPhoneVerified, true);
  assert.ok(
    calls.some(
      ([command, args]) =>
        command === "node" &&
        args.includes("scripts/release/check-release-readiness.mjs"),
    ),
  );

  calls.length = 0;
  const blocked = runPhysicalPhoneQa({
    rootDir,
    adbPath: "adb",
    writeProof: () => ({
      proof: {
        android: {
          physicalPhoneVerified: false,
          physicalPhoneBlocker: "No physical Android phone is attached.",
        },
      },
      targetPath: path.join(
        rootDir,
        "release/mobile-preview-phone-proof.local.json",
      ),
    }),
    commandRunner: (command, args) => {
      calls.push([command, args]);
      return { status: 0, stdout: "ready", stderr: "" };
    },
  });

  assert.equal(blocked.exitCode, 1);
  assert.equal(blocked.physicalPhoneVerified, false);
  assert.match(blocked.blocker, /No physical Android phone/);
  assert.equal(calls.length, 0);
});

test("parses pnpm separator before physical phone QA options", () => {
  assert.deepEqual(parsePhysicalPhoneQaArgs(["--", "--runs", "3"]), {
    runs: 3,
  });
});
