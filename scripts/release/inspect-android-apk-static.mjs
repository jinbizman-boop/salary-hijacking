#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const REQUIRED_STARTUP_NATIVE_LIBS = [
  "libexpo-modules-core.so",
  "libhermes.so",
  "libreactnative.so",
  "libreanimated.so",
  "librnscreens.so",
  "libworklets.so",
];

export const REQUIRED_ROUTER_BUNDLE_MARKERS = [
  "salary-hijacking-mobile-root",
  "SALARY HIJACKING",
];

export const FORBIDDEN_STARTUP_BUNDLE_MARKERS = [
  "1.0.1-android-safe-entry",
  "android-safe-entry",
  "android-direct-entry",
  "salary-hijacking-android-rc-root",
  "CleanFintechScreen",
  "stable-home",
  "mock-only",
];

const uniqueSorted = (values) => [...new Set(values)].sort();

const markerResults = (markers, bundleText) =>
  markers.map((marker) => ({ marker, present: bundleText.includes(marker) }));

const libResults = (abi, entries) =>
  REQUIRED_STARTUP_NATIVE_LIBS.map((lib) => ({
    name: `lib/${abi}/${lib}`,
    present: entries.includes(`lib/${abi}/${lib}`),
  }));

const decodeExpoConfig = (buffer) => {
  if (!buffer) return null;
  const utf16 = buffer.toString("utf16le").replace(/^\uFEFF/u, "");
  const text = utf16.trim().startsWith("{")
    ? utf16
    : buffer.toString("utf8").replace(/^\uFEFF/u, "");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export function analyzeEmbeddedExpoConfig(expoConfig) {
  const extra = expoConfig?.extra ?? {};
  const apiBaseUrl = String(extra.api?.baseUrl ?? "");
  const appEnvironment = String(extra.app?.environment ?? "");
  const operationsEnvironment = String(extra.operations?.environment ?? "");
  const releaseChannel = String(extra.operations?.releaseChannel ?? "");
  const e2eBuild = extra.operations?.e2eBuild;
  const crashReportingEnabled = extra.operations?.crashReportingEnabled;
  const checks = [
    {
      name: "apiBaseUrlIsStagingHttps",
      pass:
        apiBaseUrl === "https://api-staging.salaryhijacking.com" &&
        !apiBaseUrl.includes("localhost") &&
        !apiBaseUrl.startsWith("http://"),
      value: apiBaseUrl,
    },
    {
      name: "appEnvironmentIsStaging",
      pass: appEnvironment === "staging",
      value: appEnvironment,
    },
    {
      name: "operationsEnvironmentIsStaging",
      pass: operationsEnvironment === "staging",
      value: operationsEnvironment,
    },
    {
      name: "releaseChannelIsStaging",
      pass: releaseChannel === "staging",
      value: releaseChannel,
    },
    {
      name: "e2eBuildDisabled",
      pass: e2eBuild === false,
      value: e2eBuild,
    },
    {
      name: "crashReportingEnabled",
      pass: crashReportingEnabled === true,
      value: crashReportingEnabled,
    },
  ];

  return {
    present: Boolean(expoConfig),
    checks,
    pass: Boolean(expoConfig) && checks.every((check) => check.pass),
  };
}

export function analyzeApkStaticContents({ bundleText, entries }) {
  const nativeLibs = entries.filter((entry) => entry.startsWith("lib/"));
  const requiredArm64Libs = libResults("arm64-v8a", entries);
  const requiredX86_64Libs = libResults("x86_64", entries);
  const requiredBundleMarkers = markerResults(
    REQUIRED_ROUTER_BUNDLE_MARKERS,
    bundleText,
  );
  const forbiddenBundleMarkers = markerResults(
    FORBIDDEN_STARTUP_BUNDLE_MARKERS,
    bundleText,
  );
  const hasBundle = entries.includes("assets/index.android.bundle");
  const pass =
    hasBundle &&
    requiredArm64Libs.every((entry) => entry.present) &&
    requiredX86_64Libs.every((entry) => entry.present) &&
    requiredBundleMarkers.every((entry) => entry.present) &&
    forbiddenBundleMarkers.every((entry) => !entry.present);

  return {
    hasBundle,
    nativeAbis: uniqueSorted(nativeLibs.map((entry) => entry.split("/")[1])),
    arm64LibCount: nativeLibs.filter((entry) =>
      entry.startsWith("lib/arm64-v8a/"),
    ).length,
    x86_64LibCount: nativeLibs.filter((entry) =>
      entry.startsWith("lib/x86_64/"),
    ).length,
    requiredArm64Libs,
    requiredX86_64Libs,
    requiredBundleMarkers,
    forbiddenBundleMarkers,
    pass,
  };
}

const listApkEntries = (apkPath) =>
  execFileSync("tar", ["-tf", apkPath], { encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);

const readApkBundle = (apkPath) =>
  execFileSync("tar", ["-xOf", apkPath, "assets/index.android.bundle"], {
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  });

const readOptionalApkEntry = (apkPath, entry) => {
  try {
    return execFileSync("tar", ["-xOf", apkPath, entry], {
      encoding: "buffer",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    return null;
  }
};

export function inspectAndroidApkStatic({ apkPath, outputPath }) {
  if (!apkPath || !existsSync(apkPath)) {
    throw new Error(`APK not found: ${apkPath}`);
  }
  const entries = listApkEntries(apkPath);
  const bundle = readApkBundle(apkPath);
  const embeddedExpoConfig = analyzeEmbeddedExpoConfig(
    decodeExpoConfig(readOptionalApkEntry(apkPath, "assets/app.config")),
  );
  const analysis = analyzeApkStaticContents({
    bundleText: bundle.toString("utf8"),
    entries,
  });
  analysis.pass = analysis.pass && embeddedExpoConfig.pass;
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    purpose:
      "Static inspection for release-like Expo Router startup proof when no physical phone is attached. This does not replace physical logcat QA.",
    apkPath,
    apkSha256: createHash("sha256")
      .update(readFileSync(apkPath))
      .digest("hex")
      .toUpperCase(),
    bundleSha256: createHash("sha256")
      .update(bundle)
      .digest("hex")
      .toUpperCase(),
    bundleBytes: bundle.length,
    ...analysis,
    embeddedExpoConfig,
    rawDeviceIdentifiersStored: false,
    rawLogcatStored: false,
    secretValuesStored: false,
  };
  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  return result;
}

export function parseInspectAndroidApkStaticArgs(argv = []) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apk") {
      options.apkPath = argv[++index];
    } else if (arg === "--output") {
      options.outputPath = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

export function isMainModule(importMetaUrl, argvPath) {
  if (!argvPath) return false;
  return importMetaUrl === pathToFileURL(resolve(argvPath)).href;
}

if (isMainModule(import.meta.url, process.argv[1])) {
  const options = parseInspectAndroidApkStaticArgs(process.argv.slice(2));
  const result = inspectAndroidApkStatic({
    apkPath: resolve(repoRoot, options.apkPath ?? ""),
    outputPath: options.outputPath
      ? resolve(repoRoot, options.outputPath)
      : undefined,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.pass ? 0 : 1;
}
