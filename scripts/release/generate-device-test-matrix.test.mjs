import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDeviceTestMatrix,
  writeDeviceTestMatrix,
} from "./generate-device-test-matrix.mjs";

const writeJson = (rootDir, filePath, value) => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

test("builds the device matrix from current mobile preview and native evidence", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "salary-device-"));
  try {
    writeJson(rootDir, "release/mobile-preview-evidence.json", {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      android: {
        phoneTargetDebugApkBuilt: true,
        phoneTargetDebugApkSigned: true,
        phoneTargetDebugApkSha256:
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        phoneTargetDebugApkLocalPath:
          "D:/salary-hijacking-artifacts/current/phone.apk",
        phoneTargetDebugApkDownloadsPath:
          "C:/Users/PC/Downloads/salary-hijacking-phone.apk",
        phoneTargetDebugApkTemporaryUrl:
          "https://example.invalid/temporary-phone.apk",
        phoneTargetDebugApkDownloadVerified: true,
        phoneTargetDebugApkAbis: ["arm64-v8a"],
        emulatorInstallVerified: true,
        coldStartRuns: 5,
        coldStartFatalCount: 0,
        navigationSmokeVerified: true,
        backgroundForegroundVerified: true,
        keyboardAvoidanceDeviceStatus: "PASS on emulator; phone pending.",
        physicalPhoneVerified: false,
        physicalPhoneBlocker:
          "No physical Android phone is attached to this Codex Windows environment.",
      },
    });
    writeJson(rootDir, "release/mobile-native-evidence.json", {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      android: {
        localAdbAvailable: true,
        localEmulatorAvailable: true,
        nativeE2eVerified: true,
      },
    });

    const matrix = buildDeviceTestMatrix({
      rootDir,
      rootScriptTestCount: 318,
      updated: "2026-07-14 KST",
    });

    assert.match(matrix, /Updated: 2026-07-14 KST/u);
    assert.match(matrix, /PASS, 318 tests/u);
    assert.match(
      matrix,
      /D:\/salary-hijacking-artifacts\/current\/phone\.apk/u,
    );
    assert.match(
      matrix,
      /AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/u,
    );
    assert.match(matrix, /## Android physical device cold start \/ logcat/u);
    assert.match(matrix, /- Status: BLOCKED/u);
    assert.match(
      matrix,
      /docs\/qa\/100-completion\/physical-phone-qa-handoff\.md/u,
    );
    assert.doesNotMatch(matrix, /\| Device\/Environment \|/u);
    assert.match(matrix, /No physical Android phone is attached/u);
    assert.doesNotMatch(matrix, /example\.invalid/u);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});

test("writes the device matrix without copying raw temporary artifact URLs", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "salary-device-"));
  try {
    writeJson(rootDir, "release/mobile-preview-evidence.json", {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      android: {
        phoneTargetDebugApkSha256:
          "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
        phoneTargetDebugApkLocalPath: "D:/artifact/phone.apk",
        phoneTargetDebugApkTemporaryUrl:
          "https://example.invalid/temporary-phone.apk",
        physicalPhoneVerified: false,
      },
    });

    const target = writeDeviceTestMatrix({
      rootDir,
      rootScriptTestCount: 318,
      updated: "2026-07-14 KST",
    });
    const written = fs.readFileSync(target, "utf8");

    assert.match(written, /BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB/u);
    assert.doesNotMatch(written, /temporary-phone\.apk/u);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
});
