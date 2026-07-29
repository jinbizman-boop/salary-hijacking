import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEmbeddedExpoConfig,
  analyzeManifestSecurity,
  analyzeApkStaticContents,
  isMainModule,
  parseInspectAndroidApkStaticArgs,
  REQUIRED_ROUTER_BUNDLE_MARKERS,
  REQUIRED_STARTUP_NATIVE_LIBS,
} from "./inspect-android-apk-static.mjs";

test("passes when universal APK contents include Expo Router bundle markers and startup native libs", () => {
  const entries = [
    "assets/index.android.bundle",
    ...REQUIRED_STARTUP_NATIVE_LIBS.flatMap((lib) => [
      `lib/arm64-v8a/${lib}`,
      `lib/x86_64/${lib}`,
    ]),
  ];
  const bundleText = [
    ...REQUIRED_ROUTER_BUNDLE_MARKERS,
    "expo-router/build",
  ].join("\n");

  const result = analyzeApkStaticContents({ bundleText, entries });

  assert.equal(result.pass, true);
  assert.equal(result.hasBundle, true);
  assert.deepEqual(
    result.requiredArm64Libs.map((entry) => entry.present),
    REQUIRED_STARTUP_NATIVE_LIBS.map(() => true),
  );
  assert.deepEqual(
    result.forbiddenBundleMarkers.map((entry) => entry.present),
    result.forbiddenBundleMarkers.map(() => false),
  );
});

test("passes when an arm64 device QA APK contains required arm64 startup libs", () => {
  const entries = [
    "assets/index.android.bundle",
    ...REQUIRED_STARTUP_NATIVE_LIBS.map((lib) => `lib/arm64-v8a/${lib}`),
  ];
  const bundleText = [
    ...REQUIRED_ROUTER_BUNDLE_MARKERS,
    "expo-router/build",
  ].join("\n");

  const result = analyzeApkStaticContents({
    bundleText,
    entries,
    expectedAbis: ["arm64-v8a"],
  });

  assert.equal(result.pass, true);
  assert.deepEqual(result.expectedAbis, ["arm64-v8a"]);
  assert.deepEqual(result.nativeAbis, ["arm64-v8a"]);
  assert.deepEqual(
    result.requiredLibsByAbi["arm64-v8a"].map((entry) => entry.present),
    REQUIRED_STARTUP_NATIVE_LIBS.map(() => true),
  );
});

test("fails when Android APK still embeds safe/direct entry or misses ARM64 Hermes", () => {
  const entries = [
    "assets/index.android.bundle",
    "lib/arm64-v8a/libreactnative.so",
    "lib/x86_64/libhermes.so",
    "lib/x86_64/libreactnative.so",
  ];
  const bundleText =
    "1.0.1-android-safe-entry\nandroid-safe-entry\nandroid-direct-entry";

  const result = analyzeApkStaticContents({ bundleText, entries });

  assert.equal(result.pass, false);
  assert.equal(
    result.requiredArm64Libs.find(
      (entry) => entry.name === "lib/arm64-v8a/libhermes.so",
    )?.present,
    false,
  );
  assert.equal(
    result.forbiddenBundleMarkers.find(
      (entry) => entry.marker === "android-direct-entry",
    )?.present,
    true,
  );
  assert.equal(
    result.forbiddenBundleMarkers.find(
      (entry) => entry.marker === "android-safe-entry",
    )?.present,
    true,
  );
});

test("fails when Android APK embeds production sample finance or fallback dataset markers", () => {
  const entries = [
    "assets/index.android.bundle",
    ...REQUIRED_STARTUP_NATIVE_LIBS.flatMap((lib) => [
      `lib/arm64-v8a/${lib}`,
      `lib/x86_64/${lib}`,
    ]),
  ];
  const bundleText = [
    ...REQUIRED_ROUTER_BUNDLE_MARKERS,
    "fallbackNotifications",
    "5,780,000",
    "2700000",
  ].join("\n");

  const result = analyzeApkStaticContents({ bundleText, entries });

  assert.equal(result.pass, false);
  assert.equal(
    result.forbiddenBundleMarkers.find(
      (entry) => entry.marker === "fallbackNotifications",
    )?.present,
    true,
  );
  assert.equal(
    result.forbiddenBundleMarkers.find((entry) => entry.marker === "5,780,000")
      ?.present,
    true,
  );
});

test("detects Windows CLI entry paths", () => {
  assert.equal(
    isMainModule(
      "file:///C:/repo/scripts/release/inspect-android-apk-static.mjs",
      "C:\\repo\\scripts\\release\\inspect-android-apk-static.mjs",
    ),
    true,
  );
  assert.equal(
    isMainModule(
      "file:///C:/repo/scripts/release/inspect-android-apk-static.mjs",
      "C:\\repo\\scripts\\release\\other.mjs",
    ),
    false,
  );
});

test("parses a comma-delimited expected ABI CLI option", () => {
  const result = parseInspectAndroidApkStaticArgs([
    "--apk",
    "app.apk",
    "--expected-abis",
    "arm64-v8a,x86_64",
  ]);

  assert.deepEqual(result.expectedAbis, ["arm64-v8a", "x86_64"]);
});

test("accepts only staging HTTPS embedded Expo config for release-like QA APKs", () => {
  const result = analyzeEmbeddedExpoConfig({
    extra: {
      app: { environment: "staging" },
      api: { baseUrl: "https://api-staging.salaryhijacking.com" },
      operations: {
        environment: "staging",
        releaseChannel: "staging",
        e2eBuild: false,
        crashReportingEnabled: true,
      },
    },
  });

  assert.equal(result.pass, true);
  assert.equal(
    result.checks.find((check) => check.name === "apiBaseUrlIsStagingHttps")
      ?.pass,
    true,
  );
});

test("rejects development, localhost, e2e, or disabled crash reporting embedded config", () => {
  const result = analyzeEmbeddedExpoConfig({
    extra: {
      app: { environment: "development" },
      api: { baseUrl: "http://localhost:8787" },
      operations: {
        environment: "development",
        releaseChannel: "development",
        e2eBuild: true,
        crashReportingEnabled: false,
      },
    },
  });

  assert.equal(result.pass, false);
  assert.deepEqual(
    Object.fromEntries(result.checks.map((check) => [check.name, check.pass])),
    {
      apiBaseUrlIsStagingHttps: false,
      appEnvironmentIsStaging: false,
      operationsEnvironmentIsStaging: false,
      releaseChannelIsStaging: false,
      e2eBuildDisabled: false,
      crashReportingEnabled: false,
    },
  );
});

test("accepts release-like Android manifest security settings", () => {
  const result = analyzeManifestSecurity(`
N: android=http://schemas.android.com/apk/res/android
  E: manifest (line=2)
    E: application (line=33)
      A: android:allowBackup(0x01010280)=(type 0x12)0x0
  `);

  assert.equal(result.pass, true);
  assert.deepEqual(
    Object.fromEntries(result.checks.map((check) => [check.name, check.pass])),
    {
      manifestPresent: true,
      allowBackupDisabled: true,
      debuggableDisabled: true,
      cleartextTrafficDisabled: true,
      systemAlertWindowAbsent: true,
    },
  );
});

test("rejects debug, cleartext, backup, or overlay Android manifest settings", () => {
  const result = analyzeManifestSecurity(`
N: android=http://schemas.android.com/apk/res/android
  E: manifest (line=2)
    E: uses-permission (line=8)
      A: android:name(0x01010003)="android.permission.SYSTEM_ALERT_WINDOW" (Raw: "android.permission.SYSTEM_ALERT_WINDOW")
    E: application (line=33)
      A: android:allowBackup(0x01010280)=(type 0x12)0xffffffff
      A: android:debuggable(0x0101000f)=(type 0x12)0xffffffff
      A: android:usesCleartextTraffic(0x010104ec)=(type 0x12)0xffffffff
  `);

  assert.equal(result.pass, false);
  assert.deepEqual(
    Object.fromEntries(result.checks.map((check) => [check.name, check.pass])),
    {
      manifestPresent: true,
      allowBackupDisabled: false,
      debuggableDisabled: false,
      cleartextTrafficDisabled: false,
      systemAlertWindowAbsent: false,
    },
  );
});
