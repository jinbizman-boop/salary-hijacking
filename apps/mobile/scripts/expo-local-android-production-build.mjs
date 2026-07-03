import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { resolveAndroidSdkRoot } from "../../../scripts/release/android-sdk-tools.mjs";
import { resolveJavaHome } from "./eas-local-android-build.mjs";

const defaultMobileRootDir = () =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const isWindows = (platform) => platform === "win32";

const executableNames = (command, platform) =>
  isWindows(platform)
    ? [`${command}.EXE`, `${command}.CMD`, `${command}.BAT`, command]
    : [command];

const pathKey = (env) => (env.Path !== undefined ? "Path" : "PATH");

const findExecutable = ({
  command,
  directories,
  existsSync = fs.existsSync,
  platform = process.platform,
}) => {
  for (const directory of directories) {
    for (const executableName of executableNames(command, platform)) {
      const candidate = path.join(directory, executableName);
      if (existsSync(candidate)) return candidate;
    }
  }
  return "";
};

const findLocalCli = ({
  command,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  platform = process.platform,
}) =>
  findExecutable({
    command,
    directories: [path.join(mobileRootDir, "node_modules", ".bin")],
    existsSync,
    platform,
  });

const gradleWrapperName = (platform) =>
  isWindows(platform) ? "gradlew.bat" : "gradlew";

const buildEnv = ({ env, javaHome, pathValue, sdkRoot }) => {
  const envPathKey = pathKey(env);
  return {
    ...env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
    JAVA_HOME: javaHome,
    [envPathKey]: [path.join(javaHome, "bin"), pathValue]
      .filter(Boolean)
      .join(path.delimiter),
  };
};

const escapeAndroidPropertiesPath = (value) =>
  value.replace(/\\/gu, "\\\\").replace(/:/gu, "\\:");

const writeAndroidLocalProperties = ({ mobileRootDir, sdkRoot }) => {
  const androidDir = path.join(mobileRootDir, "android");
  fs.mkdirSync(androidDir, { recursive: true });
  fs.writeFileSync(
    path.join(androidDir, "local.properties"),
    `sdk.dir=${escapeAndroidPropertiesPath(sdkRoot)}\n`,
    "utf8",
  );
};

export const buildExpoLocalAndroidProductionInvocations = ({
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  output = "build/release/android/salary-hijacking-production.aab",
  platform = process.platform,
} = {}) => {
  const expoCommand = findLocalCli({
    command: "expo",
    existsSync,
    mobileRootDir,
    platform,
  });
  const gradleCommand = path.join(
    mobileRootDir,
    "android",
    gradleWrapperName(platform),
  );

  return {
    expoCommand,
    gradleArgs: [
      "bundleRelease",
      "-PreactNativeArchitectures=arm64-v8a",
      "-PnewArchEnabled=false",
    ],
    gradleCommand,
    outputPath: path.resolve(mobileRootDir, output),
    prebuildArgs: ["prebuild", "--platform", "android", "--no-install"],
    releaseAabPath: path.join(
      mobileRootDir,
      "android",
      "app",
      "build",
      "outputs",
      "bundle",
      "release",
      "app-release.aab",
    ),
  };
};

const hasAabHeader = (filePath) => {
  if (!fs.existsSync(filePath)) return false;
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(4);
    const bytesRead = fs.readSync(fd, buffer, 0, 4, 0);
    return bytesRead === 4 && buffer.equals(Buffer.from("PK\u0003\u0004"));
  } finally {
    fs.closeSync(fd);
  }
};

const hasAndroid35Platform = ({ existsSync, sdkRoot }) =>
  Boolean(
    sdkRoot &&
    existsSync(path.join(sdkRoot, "platforms", "android-35", "android.jar")),
  );

export const checkExpoLocalAndroidProductionPrerequisites = ({
  androidToolHomeDir,
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  output = "build/release/android/salary-hijacking-production.aab",
  pathValue = env.PATH ?? env.Path ?? "",
  platform = process.platform,
} = {}) => {
  const failures = [];
  const invocations = buildExpoLocalAndroidProductionInvocations({
    existsSync,
    mobileRootDir,
    output,
    platform,
  });

  if (!invocations.expoCommand) {
    failures.push(
      "Workspace-local Expo CLI is missing under apps/mobile/node_modules/.bin.",
    );
  }
  if (!existsSync(path.join(mobileRootDir, "app.config.ts"))) {
    failures.push("Expo app.config.ts is missing.");
  }

  const javaHome = resolveJavaHome({
    env,
    existsSync,
    mobileRootDir,
    pathValue,
    platform,
  });
  if (!javaHome) {
    failures.push(
      "Java is unavailable. Install a JDK, set JAVA_HOME, or install Android Studio with bundled JBR.",
    );
  }

  const sdkRoot = resolveAndroidSdkRoot({
    env,
    existsSync,
    homeDir: androidToolHomeDir,
    platform,
  });
  if (!sdkRoot) {
    failures.push("Android SDK root is unavailable.");
  } else if (!hasAndroid35Platform({ existsSync, sdkRoot })) {
    failures.push(
      "Android SDK platform android-35 is unavailable. Install Android API 35 before building the production AAB.",
    );
  }

  return {
    ...invocations,
    env:
      javaHome && sdkRoot
        ? buildEnv({ env, javaHome, pathValue, sdkRoot })
        : { ...env },
    failures,
    javaHome,
    ok: failures.length === 0,
    sdkRoot,
  };
};

const parseArgs = (argv) => {
  const options = {
    checkOnly: false,
    output: "build/release/android/salary-hijacking-production.aab",
    skipPrebuild: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      options.checkOnly = true;
    } else if (arg === "--skip-prebuild") {
      options.skipPrebuild = true;
    } else if (arg === "--output") {
      options.output = argv[index + 1] ?? options.output;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
};

const copyVerifiedAab = ({ outputPath, releaseAabPath }) => {
  if (!hasAabHeader(releaseAabPath)) {
    throw new Error(
      `Release AAB was not produced or has an invalid AAB header: ${releaseAabPath}`,
    );
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.copyFileSync(releaseAabPath, outputPath);
};

export const runExpoLocalAndroidProductionBuild = ({
  androidToolHomeDir,
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  output = "build/release/android/salary-hijacking-production.aab",
  pathValue = env.PATH ?? env.Path ?? "",
  platform = process.platform,
  skipPrebuild = false,
  spawn = spawnSync,
} = {}) => {
  const preflight = checkExpoLocalAndroidProductionPrerequisites({
    androidToolHomeDir,
    env,
    existsSync,
    mobileRootDir,
    output,
    pathValue,
    platform,
  });
  if (!preflight.ok) return { ...preflight, status: 2 };

  const invocations = buildExpoLocalAndroidProductionInvocations({
    existsSync,
    mobileRootDir,
    output,
    platform,
  });
  const failures = [...preflight.failures];

  if (!skipPrebuild) {
    const prebuild = spawn(invocations.expoCommand, invocations.prebuildArgs, {
      cwd: mobileRootDir,
      env: preflight.env,
      shell: isWindows(platform),
      stdio: "inherit",
      windowsHide: true,
    });
    if ((prebuild.status ?? 1) !== 0) {
      return {
        ...preflight,
        failures: prebuild.error
          ? [...failures, prebuild.error.message]
          : failures,
        status: prebuild.status ?? 1,
      };
    }
  }

  writeAndroidLocalProperties({
    mobileRootDir,
    sdkRoot: preflight.sdkRoot,
  });

  const gradle = spawn(invocations.gradleCommand, invocations.gradleArgs, {
    cwd: path.join(mobileRootDir, "android"),
    env: preflight.env,
    shell: isWindows(platform),
    stdio: "inherit",
    windowsHide: true,
  });
  if ((gradle.status ?? 1) !== 0) {
    return {
      ...preflight,
      failures: gradle.error ? [...failures, gradle.error.message] : failures,
      status: gradle.status ?? 1,
    };
  }

  try {
    copyVerifiedAab(invocations);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    return { ...preflight, failures, status: 1 };
  }

  return {
    ...preflight,
    failures,
    outputPath: invocations.outputPath,
    status: 0,
  };
};

const printPreflight = (result) => {
  if (result.ok) {
    process.stdout.write("[expo-local-android-production] preflight passed.\n");
    process.stdout.write(
      `[expo-local-android-production] JAVA_HOME=${result.javaHome}\n`,
    );
    process.stdout.write(
      `[expo-local-android-production] ANDROID_SDK_ROOT=${result.sdkRoot}\n`,
    );
    return;
  }

  console.error("[expo-local-android-production] preflight failed:");
  for (const failure of result.failures) console.error(`- ${failure}`);
};

const isCliEntrypoint = () =>
  process.argv[1] &&
  fs.realpathSync.native(path.resolve(process.argv[1])) ===
    fs.realpathSync.native(fileURLToPath(import.meta.url));

if (isCliEntrypoint()) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const preflight = checkExpoLocalAndroidProductionPrerequisites(options);
    printPreflight(preflight);

    if (!preflight.ok) process.exit(2);
    if (options.checkOnly) process.exit(0);

    const result = runExpoLocalAndroidProductionBuild(options);
    process.exit(result.status);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
