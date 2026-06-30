import fs from "node:fs";
import path from "node:path";

const configuration = process.argv[2] ?? "android.emu.debug";
const failures = [];

if (configuration.startsWith("android")) {
  const sdkRoot =
    process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || "";
  if (!sdkRoot) {
    failures.push(
      "ANDROID_SDK_ROOT or ANDROID_HOME must point to Android SDK.",
    );
  } else if (!fs.existsSync(sdkRoot)) {
    failures.push(`Android SDK path does not exist: ${sdkRoot}`);
  }

  const apkPath = path.resolve("build/e2e/android/salary-hijacking-e2e.apk");
  if (!fs.existsSync(apkPath)) {
    failures.push(`Missing Detox APK: ${apkPath}`);
  }

  if (!hasCommand("adb")) {
    failures.push("adb is not available in PATH.");
  }
  if (!hasCommand("emulator")) {
    failures.push("emulator is not available in PATH.");
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

function hasCommand(name) {
  const pathValue = process.env.PATH ?? "";
  const extensions =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
      : [""];

  for (const directory of pathValue.split(path.delimiter)) {
    if (!directory) continue;
    for (const extension of extensions) {
      if (fs.existsSync(path.join(directory, `${name}${extension}`))) {
        return true;
      }
    }
  }

  return false;
}
