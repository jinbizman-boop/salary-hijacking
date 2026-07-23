import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import {
  buildPhysicalPhoneCrashTriagePlan,
  classifyPhysicalPhoneCrashTriage,
  parsePhysicalPhoneCrashTriageArgs,
  runPhysicalPhoneCrashTriage,
} from "./run-physical-phone-crash-triage.mjs";

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
    path.join(os.tmpdir(), "salary-phone-crash-triage-"),
  );
  fixtureWorkspaces.add(rootDir);
  return rootDir;
};

const writeFile = (rootDir, relativePath, contents = "APK") => {
  const targetPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents);
  return targetPath;
};

test("builds a paired original-package and isolated-QA phone crash triage plan", () => {
  const rootDir = makeWorkspace();
  const originalApkPath = writeFile(rootDir, "apk/original.apk");
  const diagnosticApkPath = writeFile(rootDir, "apk/diagnostic.apk");

  const plan = buildPhysicalPhoneCrashTriagePlan({
    rootDir,
    adbPath: "adb",
    originalApkPath,
    diagnosticApkPath,
    runs: 3,
  });

  assert.equal(plan.outputPath, "artifacts/qa/physical-phone-crash-triage");
  assert.deepEqual(
    plan.cases.map((entry) => entry.id),
    ["original-package", "isolated-diagnostic"],
  );
  assert.deepEqual(
    plan.cases.map((entry) => entry.packageName),
    ["com.salaryhijacking.mobile", "com.salaryhijacking.mobile.qa.direct"],
  );
  assert.deepEqual(
    plan.cases.map((entry) => entry.apkPath),
    [originalApkPath, diagnosticApkPath],
  );
  assert.ok(
    plan.cases.every(
      (entry) =>
        entry.proofOutputPath.startsWith(
          "artifacts/qa/physical-phone-crash-triage/",
        ) && entry.proofOutputPath.endsWith("-proof.json"),
    ),
  );
  assert.doesNotMatch(JSON.stringify(plan), /token|secret|keystore/i);
});

test("defaults physical-phone triage to the latest safe-entry patched original APK", () => {
  const rootDir = makeWorkspace();

  const plan = buildPhysicalPhoneCrashTriagePlan({
    rootDir,
    adbPath: "adb",
  });

  assert.equal(
    plan.cases.find((entry) => entry.id === "original-package")?.apkPath,
    "C:/Users/PC/Downloads/salary-hijacking-original-safe-patched-current-universal.apk",
  );
  assert.equal(
    plan.cases.find((entry) => entry.id === "isolated-diagnostic")?.apkPath,
    "C:/Users/PC/Downloads/salary-hijacking-qa-direct-current-universal.apk",
  );
});

test("classifies original-only crashes as package data or signature specific", () => {
  assert.equal(
    classifyPhysicalPhoneCrashTriage([
      {
        id: "original-package",
        proof: {
          android: {
            physicalPhoneVerified: false,
            physicalPhoneBlocker:
              "Physical phone startup logcat contained fatal markers.",
          },
        },
      },
      {
        id: "isolated-diagnostic",
        proof: {
          android: {
            physicalPhoneVerified: true,
            physicalPhoneBlocker: null,
          },
        },
      },
    ]),
    "ORIGINAL_PACKAGE_ONLY_CRASH",
  );
});

test("writes combined triage summary without raw logcat or device serials", () => {
  const rootDir = makeWorkspace();
  const originalApkPath = writeFile(rootDir, "apk/original.apk");
  const diagnosticApkPath = writeFile(rootDir, "apk/diagnostic.apk");
  const calls = [];

  const result = runPhysicalPhoneCrashTriage({
    rootDir,
    adbPath: "adb",
    originalApkPath,
    diagnosticApkPath,
    runs: 2,
    writeProof: ({ packageName, outputPath }) => {
      calls.push([packageName, outputPath]);
      return {
        targetPath: path.join(rootDir, outputPath),
        proof: {
          secretsRedacted: true,
          containsSecretValues: false,
          android: {
            packageName: "com.salaryhijacking.mobile",
            physicalPhoneVerified:
              packageName === "com.salaryhijacking.mobile.qa.direct",
            physicalPhoneBlocker:
              packageName === "com.salaryhijacking.mobile"
                ? "Physical phone startup logcat contained fatal markers."
                : null,
            logcatSummary: {
              fatalExceptionCount:
                packageName === "com.salaryhijacking.mobile" ? 1 : 0,
              rawLogcatStored: false,
            },
          },
          privacy: {
            containsRawLogcat: false,
            containsRawDeviceIdentifier: false,
          },
        },
      };
    },
    now: () => new Date("2026-07-22T10:00:00.000Z"),
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.summary.classification, "ORIGINAL_PACKAGE_ONLY_CRASH");
  assert.equal(result.summary.cases.length, 2);
  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map(([packageName]) => packageName),
    ["com.salaryhijacking.mobile", "com.salaryhijacking.mobile.qa.direct"],
  );
  assert.deepEqual(
    result.summary.cases.map((entry) => entry.packageName),
    ["com.salaryhijacking.mobile", "com.salaryhijacking.mobile.qa.direct"],
  );

  const summaryPath = path.join(
    rootDir,
    "artifacts/qa/physical-phone-crash-triage/summary.json",
  );
  assert.equal(fs.existsSync(summaryPath), true);
  const summary = fs.readFileSync(summaryPath, "utf8");
  assert.match(summary, /ORIGINAL_PACKAGE_ONLY_CRASH/);
  assert.doesNotMatch(summary, /R5CT|FATAL EXCEPTION: main|abc123/i);
});

test("parses pnpm separator and paired APK options", () => {
  assert.deepEqual(
    parsePhysicalPhoneCrashTriageArgs([
      "--",
      "--original-apk",
      "original.apk",
      "--diagnostic-apk",
      "diagnostic.apk",
      "--adb",
      "adb",
      "--runs",
      "5",
      "--output",
      "out",
    ]),
    {
      adbPath: "adb",
      diagnosticApkPath: "diagnostic.apk",
      originalApkPath: "original.apk",
      outputPath: "out",
      runs: 5,
    },
  );
});
