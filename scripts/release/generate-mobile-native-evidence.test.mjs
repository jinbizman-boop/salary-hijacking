import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildMobileNativeEvidence,
  writeMobileNativeEvidenceFile,
} from "./generate-mobile-native-evidence.mjs";

const write = (rootDir, filePath, content = "") => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
};

const makeWorkspace = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-mobile-native-evidence-"));

test("builds blocked no-secret mobile native evidence by default", () => {
  const rootDir = makeWorkspace();

  const evidence = buildMobileNativeEvidence({
    rootDir,
    commandExists: () => false,
    now: () => new Date("2026-07-01T11:00:00.000Z"),
  });

  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.observedAt, "2026-07-01T11:00:00.000Z");
  assert.equal(evidence.secretsRedacted, true);
  assert.equal(evidence.containsSecretValues, false);
  assert.equal(evidence.android.localAdbAvailable, false);
  assert.equal(evidence.android.localEmulatorAvailable, false);
  assert.equal(evidence.android.productionBuildVerified, false);
  assert.equal(evidence.android.productionBuildProfile, "production");
  assert.equal(evidence.android.productionArtifactType, "aab");
  assert.equal(evidence.android.nativeE2eConfiguration, "android.emu.debug");
  assert.equal(evidence.ios.productionBuildVerified, false);
  assert.deepEqual(evidence.privacy, {
    containsEasToken: false,
    containsStoreCredential: false,
    containsBinaryDownloadUrl: false,
    containsReviewerPassword: false,
  });
  assert.ok(evidence.nextEvidenceRequired.length > 0);
  assert.doesNotMatch(JSON.stringify(evidence), /eas_[a-z0-9_-]+/i);
});

test("detects local Android SDK tools outside PATH for native E2E readiness", () => {
  const rootDir = makeWorkspace();
  const sdkRoot = path.join(rootDir, "Android", "Sdk");
  write(sdkRoot, "platform-tools/adb.EXE");
  write(sdkRoot, "emulator/emulator.EXE");

  const evidence = buildMobileNativeEvidence({
    rootDir,
    androidToolEnv: {
      ANDROID_SDK_ROOT: sdkRoot,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
    },
    androidToolPath: "",
    androidToolPlatform: "win32",
    androidToolExistsSync: fs.existsSync,
    now: () => new Date("2026-07-01T11:15:00.000Z"),
  });

  assert.equal(evidence.android.localAdbAvailable, true);
  assert.equal(evidence.android.localEmulatorAvailable, true);
  assert.match(
    evidence.nextEvidenceRequired.join("\n"),
    /Android native E2E result/i,
  );
});

test("uses a local proof file to mark mobile native gates verified", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "mobile-native-proof.local.json",
  );
  write(
    rootDir,
    "release/mobile-native-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        appIdentity: {
          appSlug: "salary-hijacking",
          androidPackage: "com.salaryhijacking.mobile",
          iosBundleIdentifier: "com.salaryhijacking.mobile",
        },
        android: {
          productionBuildVerified: true,
          productionBuildProfile: "production",
          productionArtifactType: "aab",
          storeSubmitDryRunVerified: true,
          storeSubmitEvidenceType: "google-play-console-ready",
          nativeE2eVerified: true,
          nativeE2eConfiguration: "android.emu.debug",
        },
        ios: {
          productionBuildVerified: true,
          productionBuildProfile: "production",
          storeSubmitDryRunVerified: true,
        },
        privacy: {
          containsEasToken: false,
          containsStoreCredential: false,
          containsBinaryDownloadUrl: false,
          containsReviewerPassword: false,
        },
      },
      null,
      2,
    ),
  );

  const evidence = buildMobileNativeEvidence({
    rootDir,
    proofPath,
    commandExists: () => false,
    now: () => new Date("2026-07-01T11:30:00.000Z"),
  });

  assert.equal(evidence.android.productionBuildVerified, true);
  assert.equal(evidence.android.storeSubmitDryRunVerified, true);
  assert.equal(
    evidence.android.storeSubmitEvidenceType,
    "google-play-console-ready",
  );
  assert.equal(evidence.android.nativeE2eVerified, true);
  assert.equal(evidence.ios.productionBuildVerified, true);
  assert.equal(evidence.ios.storeSubmitDryRunVerified, true);
  assert.deepEqual(evidence.appIdentity, {
    appSlug: "salary-hijacking",
    androidPackage: "com.salaryhijacking.mobile",
    iosBundleIdentifier: "com.salaryhijacking.mobile",
  });
  assert.deepEqual(evidence.nextEvidenceRequired, []);
});

test("rejects local proof whose mobile app identity does not match release targets", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "mobile-native-proof.local.json",
  );
  write(
    rootDir,
    "release/release-targets.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        mobile: {
          expectedAppSlug: "salary-hijacking",
          expectedAndroidPackage: "com.salaryhijacking.mobile",
          expectedIosBundleIdentifier: "com.salaryhijacking.mobile",
        },
      },
      null,
      2,
    ),
  );
  write(
    rootDir,
    "release/mobile-native-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        appIdentity: {
          appSlug: "retro-games",
          androidPackage: "com.retrogames.mobile",
          iosBundleIdentifier: "com.retrogames.mobile",
        },
        android: {
          productionBuildVerified: true,
          productionBuildProfile: "production",
          productionArtifactType: "aab",
        },
        privacy: {
          containsEasToken: false,
          containsStoreCredential: false,
          containsBinaryDownloadUrl: false,
          containsReviewerPassword: false,
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildMobileNativeEvidence({ rootDir, proofPath }),
    /mobile proof target does not match release target/i,
  );
});

test("preserves existing no-secret mobile native evidence when local proof is absent", () => {
  const rootDir = makeWorkspace();
  write(
    rootDir,
    "release/mobile-native-evidence.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        appIdentity: {
          appSlug: "salary-hijacking",
          androidPackage: "com.salaryhijacking.mobile",
          iosBundleIdentifier: "com.salaryhijacking.mobile",
        },
        android: {
          productionBuildVerified: true,
          productionBuildProfile: "production",
          productionArtifactType: "aab",
          nativeE2eVerified: false,
          nativeE2eConfiguration: "android.emu.debug",
          note: "Tracked Android release evidence note is preserved without local proof.",
        },
        ios: {
          productionBuildVerified: false,
          productionBuildProfile: "production",
        },
        privacy: {
          containsEasToken: false,
          containsStoreCredential: false,
          containsBinaryDownloadUrl: false,
          containsReviewerPassword: false,
        },
      },
      null,
      2,
    ),
  );

  const evidence = buildMobileNativeEvidence({
    rootDir,
    commandExists: () => false,
  });

  assert.equal(evidence.android.productionBuildVerified, true);
  assert.equal(evidence.android.nativeE2eVerified, false);
  assert.equal(
    evidence.android.note,
    "Tracked Android release evidence note is preserved without local proof.",
  );
  assert.equal(evidence.ios.productionBuildVerified, false);
});

test("rejects proof files that contain native build secrets or artifact URLs and paths", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "mobile-native-proof.local.json",
  );
  write(
    rootDir,
    "release/mobile-native-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: false,
        android: {
          productionBuildVerified: true,
          easTokenValue: "eas_live_token_value_that_must_not_be_stored",
          artifactUrl: "https://expo.dev/artifacts/eas/example.aab",
        },
        privacy: {
          containsEasToken: false,
          containsStoreCredential: false,
          containsBinaryDownloadUrl: true,
          containsReviewerPassword: false,
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildMobileNativeEvidence({ rootDir, proofPath }),
    /secret values, artifact URLs, or artifact paths/i,
  );
});

test("rejects proof files marked as containing secret values", () => {
  const rootDir = makeWorkspace();
  const proofPath = path.join(
    rootDir,
    "release",
    "mobile-native-proof.local.json",
  );
  write(
    rootDir,
    "release/mobile-native-proof.local.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        secretsRedacted: true,
        containsSecretValues: true,
        android: {
          productionBuildVerified: true,
          productionBuildProfile: "production",
          productionArtifactType: "aab",
        },
        privacy: {
          containsEasToken: false,
          containsStoreCredential: false,
          containsBinaryDownloadUrl: false,
          containsReviewerPassword: false,
        },
      },
      null,
      2,
    ),
  );

  assert.throws(
    () => buildMobileNativeEvidence({ rootDir, proofPath }),
    /containsSecretValues=false/i,
  );
});

test("writes release/mobile-native-evidence.json with generated evidence", () => {
  const rootDir = makeWorkspace();

  const outputPath = writeMobileNativeEvidenceFile({
    rootDir,
    commandExists: () => false,
    now: () => new Date("2026-07-01T12:00:00.000Z"),
  });

  assert.equal(
    outputPath,
    path.join(rootDir, "release", "mobile-native-evidence.json"),
  );
  const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(written.observedAt, "2026-07-01T12:00:00.000Z");
  assert.equal(written.containsSecretValues, false);
  assert.equal(written.android.productionArtifactType, "aab");
  assert.doesNotMatch(JSON.stringify(written), /expo\.dev\/artifacts/i);
});
