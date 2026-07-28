import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeEmbeddedExpoConfig,
  analyzeApkStaticContents,
  isMainModule,
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

test("fails when Android APK still embeds safe/direct entry or misses ARM64 Hermes", () => {
  const entries = [
    "assets/index.android.bundle",
    "lib/arm64-v8a/libreactnative.so",
    "lib/x86_64/libhermes.so",
    "lib/x86_64/libreactnative.so",
  ];
  const bundleText = "1.0.1-android-safe-entry\nandroid-safe-entry\nandroid-direct-entry";

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
