import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { runDetoxAndroidTest } from "./run-detox-android.mjs";

const defaultMobileRootDir = () =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const defaultRepositoryRootDir = (mobileRootDir) =>
  path.resolve(mobileRootDir, "..", "..");

const DEFAULT_ANDROID_APK_PATH = "build/e2e/android/salary-hijacking-e2e.apk";
const OBSERVATION_PATH = "release/mobile-native-observation.local.json";

const boolEnv = (value) => /^(1|true|yes)$/i.test(String(value ?? "").trim());

export const nativeE2eRequired = (env = process.env) =>
  boolEnv(env.MOBILE_NATIVE_E2E_REQUIRED) || boolEnv(env.NATIVE_E2E_REQUIRED);

const buildObservation = ({ configuration, note, verified }) => ({
  schemaVersion: 1,
  secretsRedacted: true,
  containsSecretValues: false,
  appIdentity: {
    appSlug: "salary-hijacking",
    androidPackage: "com.salaryhijacking.mobile",
    iosBundleIdentifier: "com.salaryhijacking.mobile",
  },
  android: {
    nativeE2eVerified: verified,
    nativeE2eConfiguration: configuration,
    note,
  },
  ios: {
    productionBuildVerified: false,
    storeSubmitDryRunVerified: false,
  },
  privacy: {
    containsEasToken: false,
    containsStoreCredential: false,
    containsBinaryDownloadUrl: false,
    containsReviewerPassword: false,
  },
});

export const writeMobileNativeObservation = ({
  configuration = "android.emu.debug",
  note,
  repositoryRootDir,
  verified = false,
}) => {
  const outputPath = path.join(repositoryRootDir, OBSERVATION_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(buildObservation({ configuration, note, verified }), null, 2)}\n`,
    "utf8",
  );
  return outputPath;
};

export const runMobileE2eCi = ({
  apkRelativePath = DEFAULT_ANDROID_APK_PATH,
  configuration = "android.emu.debug",
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  repositoryRootDir = defaultRepositoryRootDir(mobileRootDir),
  runAndroid = runDetoxAndroidTest,
} = {}) => {
  const apkPath = path.join(mobileRootDir, apkRelativePath);
  const required = nativeE2eRequired(env);

  if (!configuration.startsWith("android")) {
    const note = `Native E2E configuration ${configuration} is not supported by the CI wrapper.`;
    if (!required) {
      writeMobileNativeObservation({
        configuration,
        note,
        repositoryRootDir,
        verified: false,
      });
      return { skipped: true, status: 0, reason: note };
    }
    return { skipped: false, status: 2, reason: note };
  }

  if (!existsSync(apkPath)) {
    const note =
      "Android Detox APK is missing; CI recorded no-secret native E2E observation and release readiness remains blocked until an APK or device-farm proof is provided.";
    if (!required) {
      const outputPath = writeMobileNativeObservation({
        configuration,
        note,
        repositoryRootDir,
        verified: false,
      });
      return { outputPath, skipped: true, status: 0, reason: note };
    }
    return { skipped: false, status: 2, reason: note };
  }

  const result = runAndroid({ configuration, mobileRootDir });
  if (result.status === 0) {
    writeMobileNativeObservation({
      configuration,
      note: "Android Detox native E2E passed locally without storing logs, artifact URLs, tokens, or credentials.",
      repositoryRootDir,
      verified: true,
    });
  }

  return { skipped: false, status: result.status ?? 1, reason: "" };
};

const isCliEntrypoint = () =>
  process.argv[1] &&
  fs.realpathSync.native(path.resolve(process.argv[1])) ===
    fs.realpathSync.native(fileURLToPath(import.meta.url));

if (isCliEntrypoint()) {
  const configuration = process.argv[2] ?? "android.emu.debug";
  const result = runMobileE2eCi({ configuration });
  if (result.skipped) {
    console.warn(`[mobile-e2e-ci] skipped: ${result.reason}`);
  }
  process.exit(result.status);
}
