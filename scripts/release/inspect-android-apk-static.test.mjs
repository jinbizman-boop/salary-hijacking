import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeApkStaticContents,
  isMainModule,
  REQUIRED_SAFE_ENTRY_BUNDLE_MARKERS,
  REQUIRED_STARTUP_NATIVE_LIBS,
} from "./inspect-android-apk-static.mjs";

test("passes when universal APK contents include safe-entry bundle and startup native libs", () => {
  const entries = [
    "assets/index.android.bundle",
    ...REQUIRED_STARTUP_NATIVE_LIBS.flatMap((lib) => [
      `lib/arm64-v8a/${lib}`,
      `lib/x86_64/${lib}`,
    ]),
  ];
  const bundleText = [
    ...REQUIRED_SAFE_ENTRY_BUNDLE_MARKERS,
    "AppRegistry.registerComponent",
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

test("fails when Android APK still embeds direct-entry or misses ARM64 Hermes", () => {
  const entries = [
    "assets/index.android.bundle",
    "lib/arm64-v8a/libreactnative.so",
    "lib/x86_64/libhermes.so",
    "lib/x86_64/libreactnative.so",
  ];
  const bundleText = "1.0.1-android-safe-entry\nandroid-direct-entry";

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
