import fs from "node:fs";
import path from "node:path";

import {
  androidToolExists,
  resolveAndroidSdkRoot,
} from "../../../scripts/release/android-sdk-tools.mjs";

const configuration = process.argv[2] ?? "android.emu.debug";
const failures = [];

if (configuration.startsWith("android")) {
  const configuredSdkRoot =
    process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || "";
  const sdkRoot = resolveAndroidSdkRoot();
  if (!sdkRoot) {
    failures.push(
      configuredSdkRoot
        ? `Android SDK path does not exist: ${configuredSdkRoot}`
        : "ANDROID_SDK_ROOT, ANDROID_HOME, or the default Android Studio SDK path must point to Android SDK.",
    );
  }

  const apkPath = path.resolve("build/e2e/android/salary-hijacking-e2e.apk");
  if (!fs.existsSync(apkPath)) {
    failures.push(`Missing Detox APK: ${apkPath}`);
  }

  if (!androidToolExists("adb")) {
    failures.push(
      "adb is not available in PATH or Android SDK platform-tools.",
    );
  }
  if (!androidToolExists("emulator")) {
    failures.push(
      "emulator is not available in PATH or Android SDK emulator directory.",
    );
  }
}

if (configuration.startsWith("ios")) {
  const appPath = path.resolve("build/e2e/ios/salaryhijacking.app");
  if (!fs.existsSync(appPath)) {
    failures.push(`Missing Detox iOS app: ${appPath}`);
  }
}

if (failures.length > 0) {
  console.error(`[detox-preflight] ${configuration} is not ready:`);
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "[detox-preflight] Build with the e2e EAS profile or provide a local native binary before running Detox.",
  );
  process.exit(2);
}

console.warn(`[detox-preflight] ${configuration} is ready.`);
