import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import {
  buildMobilePreviewPhoneProof,
  parseMobilePreviewPhoneProofArgs,
  parseAdbDevices,
  resolveAdbPath,
  sanitizeLogcatSummary,
} from "./collect-mobile-preview-phone-proof.mjs";

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
    path.join(os.tmpdir(), "salary-mobile-phone-proof-"),
  );
  fixtureWorkspaces.add(rootDir);
  return rootDir;
};

test("cleans generated physical phone proof fixture workspaces", () => {
  const rootDir = makeWorkspace();

  assert.equal(fs.existsSync(rootDir), true);
  cleanupWorkspaces();
  assert.equal(fs.existsSync(rootDir), false);
});

const write = (rootDir, relativePath, content = "") => {
  const target = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
};

test("resolves adb from the default Windows LOCALAPPDATA Android SDK path", () => {
  const rootDir = makeWorkspace();
  const localAppData = path.join(rootDir, "LocalAppData");
  const adbPath = write(
    localAppData,
    path.join("Android", "Sdk", "platform-tools", "adb.exe"),
    "adb",
  );

  assert.equal(
    resolveAdbPath({
      rootDir,
      env: {
        LOCALAPPDATA: localAppData,
        Path: "",
      },
    }),
    adbPath,
  );
});

test("parses physical phone proof CLI options for manual QA runs", () => {
  assert.deepEqual(
    parseMobilePreviewPhoneProofArgs([
      "--apk",
      "C:/Users/PC/Downloads/salary.apk",
      "--adb",
      "C:/Android/platform-tools/adb.exe",
      "--runs",
      "7",
      "--output",
      "release/phone.local.json",
      "--package",
      "com.salaryhijacking.mobile",
    ]),
    {
      adbPath: "C:/Android/platform-tools/adb.exe",
      apkPath: "C:/Users/PC/Downloads/salary.apk",
      coldStartRuns: 7,
      outputPath: "release/phone.local.json",
      packageName: "com.salaryhijacking.mobile",
    },
  );
  assert.throws(
    () => parseMobilePreviewPhoneProofArgs(["--runs", "0"]),
    /--runs must be a positive integer/,
  );
  assert.throws(
    () => parseMobilePreviewPhoneProofArgs(["--wat"]),
    /Unknown argument/,
  );
});

test("parses physical devices without preserving raw serials", () => {
  const devices = parseAdbDevices(`List of devices attached
R5CT123456X device product:r8q model:SM_G780N device:r8q transport_id:7
emulator-5554 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:1
offline123 offline product:test model:test device:test
`);

  assert.equal(devices.physicalCount, 1);
  assert.equal(devices.emulatorCount, 1);
  assert.equal(devices.attachedCount, 2);
  assert.deepEqual(devices.physicalSerialHashes.length, 1);
  assert.doesNotMatch(JSON.stringify(devices), /R5CT123456X/);
});

test("summarizes logcat fatal markers without storing raw logcat lines", () => {
  const summary =
    sanitizeLogcatSummary(`07-13 12:00:00 AndroidRuntime: FATAL EXCEPTION: main
07-13 12:00:01 ReactNativeJS: user token abc123 should not be copied
07-13 12:00:02 Expo: normal startup
`);

  assert.equal(summary.fatalExceptionCount, 1);
  assert.equal(summary.reactNativeFatalCount, 0);
  assert.equal(summary.expoErrorCount, 0);
  assert.equal(summary.rawLogcatStored, false);
  assert.doesNotMatch(JSON.stringify(summary), /abc123/);
  assert.doesNotMatch(JSON.stringify(summary), /FATAL EXCEPTION: main/);
});

test("builds blocked no-secret proof when adb is unavailable", () => {
  const rootDir = makeWorkspace();
  const proof = buildMobilePreviewPhoneProof({
    rootDir,
    adbPath: null,
    now: () => new Date("2026-07-13T03:00:00.000Z"),
  });

  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.secretsRedacted, true);
  assert.equal(proof.containsSecretValues, false);
  assert.equal(proof.android.physicalPhoneVerified, false);
  assert.match(proof.android.physicalPhoneBlocker, /adb is unavailable/i);
  assert.equal(proof.android.requiredColdStartRuns, 20);
  assert.equal(proof.android.requiredBackgroundForegroundRuns, 20);
  assert.match(proof.nextEvidenceRequired.join("\n"), /20 cold-start/i);
  assert.equal(proof.privacy.containsRawLogcat, false);
});

test("builds verified no-secret proof when physical phone startup has zero fatal markers", () => {
  const rootDir = makeWorkspace();
  const apkPath = write(rootDir, "build/salary.apk", "APK");
  const calls = [];
  const commandRunner = (command, args) => {
    calls.push([command, args]);
    const joined = [command, ...args].join(" ");
    if (joined.includes("devices -l")) {
      return {
        status: 0,
        stdout:
          "List of devices attached\nR5CT123456X device product:r8q model:SM_G780N device:r8q transport_id:7\n",
        stderr: "",
      };
    }
    if (joined.includes("logcat -d")) {
      return {
        status: 0,
        stdout:
          "07-13 12:00:01 Expo: startup\n07-13 12:00:02 ReactNative: app ready\n",
        stderr: "",
      };
    }
    return { status: 0, stdout: "", stderr: "" };
  };

  const proof = buildMobilePreviewPhoneProof({
    rootDir,
    apkPath,
    adbPath: "adb",
    commandRunner,
    packageName: "com.salaryhijacking.mobile",
    coldStartRuns: 2,
    now: () => new Date("2026-07-13T03:15:00.000Z"),
  });

  assert.equal(proof.android.physicalPhoneVerified, true);
  assert.equal(proof.android.installVerified, true);
  assert.equal(
    proof.android.apkSha256,
    createHash("sha256").update("APK").digest("hex").toUpperCase(),
  );
  assert.equal(proof.android.coldStartRuns, 2);
  assert.equal(proof.android.coldStartFatalCount, 0);
  assert.equal(proof.android.navigationSmokeVerified, true);
  assert.equal(proof.android.backgroundForegroundVerified, true);
  assert.equal(proof.android.persistenceVerified, true);
  assert.equal(proof.android.keyboardSafeAreaVerified, true);
  assert.equal(proof.android.logcatSummary.rawLogcatStored, false);
  assert.doesNotMatch(JSON.stringify(proof), /R5CT123456X/);
  assert.ok(calls.some(([, args]) => args.includes("install")));
  assert.ok(calls.some(([, args]) => args.includes("monkey")));
});

test("defaults physical phone QA to 20 cold-start and background runs", () => {
  const rootDir = makeWorkspace();
  const apkPath = write(rootDir, "build/salary.apk", "APK");
  const commandRunner = (command, args) => {
    const joined = [command, ...args].join(" ");
    if (joined.includes("devices -l")) {
      return {
        status: 0,
        stdout:
          "List of devices attached\nR5CT123456X device product:r8q model:SM_G780N device:r8q transport_id:7\n",
        stderr: "",
      };
    }
    if (joined.includes("logcat -d")) {
      return {
        status: 0,
        stdout: "07-13 12:00:01 Expo: startup\n",
        stderr: "",
      };
    }
    return { status: 0, stdout: "", stderr: "" };
  };

  const proof = buildMobilePreviewPhoneProof({
    rootDir,
    apkPath,
    adbPath: "adb",
    commandRunner,
    packageName: "com.salaryhijacking.mobile",
    now: () => new Date("2026-07-13T03:20:00.000Z"),
  });

  assert.equal(proof.android.physicalPhoneVerified, true);
  assert.equal(proof.android.coldStartRuns, 20);
  assert.equal(proof.android.backgroundForegroundRuns, 20);
});
