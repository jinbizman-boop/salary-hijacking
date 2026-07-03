import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { collectMobileNativeProof } from "./collect-mobile-native-proof.mjs";

const writeJson = (rootDir, filePath, value) => {
  const target = path.join(rootDir, filePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
};

const makeRoot = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-mobile-native-proof-"));

const completeObservation = {
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
    storeSubmitEvidenceType: "google-play-submit-dry-run",
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
};

test("normalizes no-secret mobile native observations into release proof booleans", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/mobile-native-observation.local.json",
    completeObservation,
  );
  const outputPath = path.join(
    rootDir,
    "release",
    "mobile-native-proof.local.json",
  );

  const proof = collectMobileNativeProof({
    inputPath,
    outputPath,
    now: () => new Date("2026-07-01T18:30:00.000Z"),
  });

  assert.equal(proof.schemaVersion, 1);
  assert.equal(proof.observedAt, "2026-07-01T18:30:00.000Z");
  assert.equal(proof.secretsRedacted, true);
  assert.equal(proof.containsSecretValues, false);
  assert.deepEqual(proof.appIdentity, {
    appSlug: "salary-hijacking",
    androidPackage: "com.salaryhijacking.mobile",
    iosBundleIdentifier: "com.salaryhijacking.mobile",
  });
  assert.equal(proof.android.productionBuildVerified, true);
  assert.equal(proof.android.productionBuildProfile, "production");
  assert.equal(proof.android.productionArtifactType, "aab");
  assert.equal(proof.android.storeSubmitDryRunVerified, true);
  assert.equal(proof.android.nativeE2eVerified, true);
  assert.equal(proof.android.nativeE2eConfiguration, "android.emu.debug");
  assert.equal(proof.ios.productionBuildVerified, true);
  assert.equal(proof.ios.productionBuildProfile, "production");
  assert.equal(proof.ios.storeSubmitDryRunVerified, true);

  const written = fs.readFileSync(outputPath, "utf8");
  assert.doesNotMatch(
    written,
    /eas_[a-z0-9_-]+|expo\.dev\/artifacts|\.aab(?:\?|$)|-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  );
});

test("keeps release proof false for incomplete observations", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/mobile-native-observation.local.json",
    {
      schemaVersion: 1,
      secretsRedacted: true,
      containsSecretValues: false,
      android: {
        productionBuildVerified: true,
        productionBuildProfile: "preview",
        productionArtifactType: "aab",
        nativeE2eConfiguration: "device-farm.android.release",
      },
      ios: {},
      privacy: {
        containsEasToken: false,
        containsStoreCredential: false,
        containsBinaryDownloadUrl: false,
        containsReviewerPassword: false,
      },
    },
  );

  const proof = collectMobileNativeProof({ inputPath, writeFile: false });

  assert.equal(proof.android.productionBuildVerified, false);
  assert.equal(proof.android.productionBuildProfile, "production");
  assert.equal(proof.android.productionArtifactType, "aab");
  assert.equal(proof.android.storeSubmitDryRunVerified, false);
  assert.equal(proof.android.nativeE2eVerified, false);
  assert.equal(
    proof.android.nativeE2eConfiguration,
    "device-farm.android.release",
  );
  assert.equal(proof.ios.productionBuildVerified, false);
  assert.equal(proof.ios.storeSubmitDryRunVerified, false);
});

test("rejects Android console-ready store proof when required release files are missing", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/mobile-native-observation.local.json",
    {
      ...completeObservation,
      android: {
        ...completeObservation.android,
        storeSubmitEvidenceType: "google-play-console-ready",
      },
      ios: {
        productionBuildVerified: false,
        productionBuildProfile: "production",
        storeSubmitDryRunVerified: false,
      },
    },
  );

  assert.throws(
    () => collectMobileNativeProof({ inputPath, rootDir, writeFile: false }),
    /Google Play console-ready proof is missing/i,
  );
});

test("accepts Android console-ready store proof when required release files are present", () => {
  const rootDir = makeRoot();
  for (const filePath of [
    "release/store/google-play-metadata.md",
    "release/store/data-safety.md",
    "release/store/review-notes.md",
    "release/store/content-rating.md",
    "release/screenshots/01_home_salary.png",
    "release/screenshots/02_daily_budget.png",
    "release/screenshots/03_plan_setting.png",
    "release/screenshots/04_notifications.png",
    "release/screenshots/05_level_up.png",
    "release/screenshots/feature_graphic_google_play.png",
  ]) {
    const absolutePath = path.join(rootDir, filePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, "verified\n", "utf8");
  }
  const aabPath = path.join(
    rootDir,
    "apps/mobile/build/release/android/salary-hijacking-production.aab",
  );
  fs.mkdirSync(path.dirname(aabPath), { recursive: true });
  fs.writeFileSync(aabPath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const inputPath = writeJson(
    rootDir,
    "release/mobile-native-observation.local.json",
    {
      ...completeObservation,
      android: {
        ...completeObservation.android,
        storeSubmitEvidenceType: "google-play-console-ready",
      },
      ios: {
        productionBuildVerified: false,
        productionBuildProfile: "production",
        storeSubmitDryRunVerified: false,
      },
    },
  );

  const proof = collectMobileNativeProof({
    inputPath,
    rootDir,
    writeFile: false,
  });

  assert.equal(proof.android.storeSubmitDryRunVerified, true);
  assert.equal(
    proof.android.storeSubmitEvidenceType,
    "google-play-console-ready",
  );
});

test("accepts UTF-8 BOM in local mobile native observation files", () => {
  const rootDir = makeRoot();
  const inputPath = path.join(
    rootDir,
    "release",
    "mobile-native-observation.local.json",
  );
  fs.mkdirSync(path.dirname(inputPath), { recursive: true });
  fs.writeFileSync(
    inputPath,
    `\uFEFF${JSON.stringify(completeObservation, null, 2)}\n`,
    "utf8",
  );

  const proof = collectMobileNativeProof({ inputPath, writeFile: false });

  assert.equal(proof.android.productionBuildVerified, true);
  assert.equal(proof.android.nativeE2eVerified, true);
  assert.equal(proof.ios.productionBuildVerified, true);
});

test("rejects verified observations for an unrelated mobile app identity", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/mobile-native-observation.local.json",
    {
      ...completeObservation,
      appIdentity: {
        appSlug: "retro-games",
        androidPackage: "com.retrogames.mobile",
        iosBundleIdentifier: "com.retrogames.mobile",
      },
    },
  );

  assert.throws(
    () => collectMobileNativeProof({ inputPath, writeFile: false }),
    /mobile app identity/i,
  );
});

test("rejects observations containing native build secrets or artifact URLs and paths", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/mobile-native-observation.local.json",
    {
      ...completeObservation,
      android: {
        ...completeObservation.android,
        easTokenValue: "eas_live_token_value_that_must_not_be_stored",
        artifactUrl: "https://expo.dev/artifacts/eas/example.aab",
      },
    },
  );

  assert.throws(
    () => collectMobileNativeProof({ inputPath, writeFile: false }),
    /secret values, artifact URLs, or artifact paths/i,
  );
});

test("rejects local native artifact paths even when trailing text is present", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/mobile-native-observation.local.json",
    {
      ...completeObservation,
      android: {
        ...completeObservation.android,
        artifactLocalPath:
          "C:\\builds\\salary-hijacking-production.aab verified manually",
      },
    },
  );

  assert.throws(
    () => collectMobileNativeProof({ inputPath, writeFile: false }),
    /secret values, artifact URLs, or artifact paths/i,
  );
});

test("rejects copied store-console payloads and logs", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/mobile-native-observation.local.json",
    {
      ...completeObservation,
      googlePlayConsolePayload: {
        releaseTrack: "production",
        status: "draft",
      },
    },
  );

  assert.throws(
    () => collectMobileNativeProof({ inputPath, writeFile: false }),
    /copied provider payloads or logs/i,
  );
});

test("rejects Android production proof that is not an AAB", () => {
  const rootDir = makeRoot();
  const inputPath = writeJson(
    rootDir,
    "release/mobile-native-observation.local.json",
    {
      ...completeObservation,
      android: {
        ...completeObservation.android,
        productionArtifactType: "apk",
      },
    },
  );

  assert.throws(
    () => collectMobileNativeProof({ inputPath, writeFile: false }),
    /Android production builds as AAB/i,
  );
});
