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
