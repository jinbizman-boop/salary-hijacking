import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  androidToolExists,
  resolveAndroidSdkRoot,
} from "../../../scripts/release/android-sdk-tools.mjs";

const defaultMobileRootDir = () =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const isWindows = (platform) => platform === "win32";

const executableNames = (command, platform) =>
  isWindows(platform)
    ? [`${command}.EXE`, `${command}.CMD`, command]
    : [command];

const pathKey = (env) => (env.Path !== undefined ? "Path" : "PATH");

const splitPath = (pathValue) =>
  typeof pathValue === "string" && pathValue.length > 0
    ? pathValue.split(path.delimiter).filter(Boolean)
    : [];

const executableExists = ({ command, directories, existsSync, platform }) => {
  for (const directory of directories) {
    for (const executableName of executableNames(command, platform)) {
      if (existsSync(path.join(directory, executableName))) return true;
    }
  }
  return false;
};

const javaHomeFromBin = (javaBin) => path.dirname(path.dirname(javaBin));

const candidateJavaHomes = ({ env, mobileRootDir, platform }) => {
  const homes = [];
  if (typeof env.JAVA_HOME === "string" && env.JAVA_HOME.trim()) {
    homes.push(env.JAVA_HOME.trim());
  }

  if (isWindows(platform)) {
    const programFiles = env.PROGRAMFILES || "C:\\Program Files";
    homes.push(
      path.join(programFiles, "Android", "Android Studio", "jbr"),
      path.join(programFiles, "Android", "Android Studio", "jre"),
    );
  }

  homes.push(path.join(mobileRootDir, ".jdk"));
  return [...new Set(homes.map((home) => path.normalize(home)))];
};

export const resolveJavaHome = ({
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  pathValue = env.PATH ?? env.Path ?? "",
  platform = process.platform,
} = {}) => {
  for (const javaHome of candidateJavaHomes({ env, mobileRootDir, platform })) {
    if (
      executableExists({
        command: "java",
        directories: [path.join(javaHome, "bin")],
        existsSync,
        platform,
      })
    ) {
      return javaHome;
    }
  }

  for (const directory of splitPath(pathValue)) {
    if (
      executableExists({
        command: "java",
        directories: [directory],
        existsSync,
        platform,
      })
    ) {
      return javaHomeFromBin(path.join(directory, "java"));
    }
  }

  return "";
};

const EAS_CLI_PACKAGE = "eas-cli@20.4.0";

const buildEasCliArgs = (args) => ["dlx", EAS_CLI_PACKAGE, ...args];

const findPnpmCli = ({
  existsSync = fs.existsSync,
  pathValue = process.env.PATH ?? process.env.Path ?? "",
  platform = process.platform,
} = {}) => {
  for (const directory of splitPath(pathValue)) {
    for (const executableName of executableNames("pnpm", platform)) {
      const candidate = path.join(directory, executableName);
      if (existsSync(candidate)) return candidate;
    }
  }
  return platform === "win32" ? "pnpm.CMD" : "pnpm";
};

const readJson = (filePath) =>
  JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));

const validateEasProfile = ({ mobileRootDir, profile }) => {
  const easJsonPath = path.join(mobileRootDir, "eas.json");
  if (!fs.existsSync(easJsonPath)) {
    return [`Missing EAS config: ${easJsonPath}`];
  }

  const easJson = readJson(easJsonPath);
  const buildProfile = easJson?.build?.[profile];
  if (!buildProfile) return [`Missing EAS build profile: ${profile}`];
  if (buildProfile?.android?.buildType !== "apk") {
    return [
      `EAS build profile ${profile} must produce an Android APK for Detox.`,
    ];
  }
  return [];
};

const hasExpoToken = (env) =>
  typeof env.EXPO_TOKEN === "string" && env.EXPO_TOKEN.trim().length > 0;

const checkEasAuthentication = ({
  command,
  env,
  mobileRootDir,
  platform,
  spawn,
}) => {
  if (hasExpoToken(env)) return { ok: true, source: "EXPO_TOKEN" };
  if (!command) return { ok: false, source: "" };

  const result = spawn(command, buildEasCliArgs(["whoami"]), {
    cwd: mobileRootDir,
    encoding: "utf8",
    env,
    shell: isWindows(platform),
    stdio: "pipe",
    windowsHide: true,
  });

  if (result.status === 0) return { ok: true, source: "eas whoami" };
  return { ok: false, source: "" };
};

export const buildEasLocalAndroidBuildInvocation = ({
  mobileRootDir = defaultMobileRootDir(),
  output = "build/e2e/android/salary-hijacking-e2e.apk",
  pathValue = process.env.PATH ?? process.env.Path ?? "",
  platform = process.platform,
  profile = "e2e",
} = {}) => {
  void mobileRootDir;
  const command = findPnpmCli({ pathValue, platform });
  return {
    args: buildEasCliArgs([
      "build",
      "--platform",
      "android",
      "--profile",
      profile,
      "--local",
      "--output",
      output,
      "--non-interactive",
    ]),
    command,
  };
};

export const checkEasLocalAndroidBuildPrerequisites = ({
  androidToolHomeDir,
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  output = "build/e2e/android/salary-hijacking-e2e.apk",
  pathValue = env.PATH ?? env.Path ?? "",
  platform = process.platform,
  profile = "e2e",
  spawn = spawnSync,
} = {}) => {
  const failures = [];
  failures.push(...validateEasProfile({ mobileRootDir, profile }));

  const invocation = buildEasLocalAndroidBuildInvocation({
    mobileRootDir,
    output,
    pathValue,
    platform,
    profile,
  });
  if (!invocation.command) {
    failures.push(
      "pnpm is unavailable for pnpm dlx eas-cli local Android builds.",
    );
  }

  const auth = checkEasAuthentication({
    command: invocation.command,
    env,
    mobileRootDir,
    platform,
    spawn,
  });
  if (!auth.ok) {
    failures.push(
      "Expo account authentication is unavailable. Run `eas login` or provide `EXPO_TOKEN` through a trusted secret store before running the local Android E2E build.",
    );
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
      "Java is unavailable. Install a JDK, set JAVA_HOME, or install Android Studio with bundled JBR before running EAS local Android build.",
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
  }

  const androidToolOptions = {
    env,
    existsSync,
    homeDir: androidToolHomeDir,
    pathValue,
    platform,
  };
  if (!androidToolExists("adb", androidToolOptions))
    failures.push("adb is unavailable.");
  if (!androidToolExists("emulator", androidToolOptions)) {
    failures.push("emulator is unavailable.");
  }

  const envPathKey = pathKey(env);
  const javaBin = javaHome ? path.join(javaHome, "bin") : "";
  const nextPath = [javaBin, pathValue].filter(Boolean).join(path.delimiter);

  return {
    command: invocation.command,
    env: javaHome
      ? {
          ...env,
          JAVA_HOME: javaHome,
          [envPathKey]: nextPath,
        }
      : { ...env },
    failures,
    expoAuthSource: auth.source,
    javaHome,
    ok: failures.length === 0,
    sdkRoot,
  };
};

const parseArgs = (argv) => {
  const options = {
    checkOnly: false,
    output: "build/e2e/android/salary-hijacking-e2e.apk",
    profile: "e2e",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      options.checkOnly = true;
    } else if (arg === "--profile") {
      options.profile = argv[index + 1] ?? options.profile;
      index += 1;
    } else if (arg === "--output") {
      options.output = argv[index + 1] ?? options.output;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
};

const printPreflight = (result) => {
  if (result.ok) {
    process.stdout.write("[eas-local-android] preflight passed.\n");
    process.stdout.write(`[eas-local-android] JAVA_HOME=${result.javaHome}\n`);
    process.stdout.write(
      `[eas-local-android] ANDROID_SDK_ROOT=${result.sdkRoot}\n`,
    );
    return;
  }

  console.error("[eas-local-android] preflight failed:");
  for (const failure of result.failures) console.error(`- ${failure}`);
};

export const runEasLocalAndroidBuild = ({
  androidToolHomeDir,
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  output = "build/e2e/android/salary-hijacking-e2e.apk",
  pathValue = env.PATH ?? env.Path ?? "",
  platform = process.platform,
  profile = "e2e",
  spawn = spawnSync,
} = {}) => {
  const preflight = checkEasLocalAndroidBuildPrerequisites({
    androidToolHomeDir,
    env,
    existsSync,
    mobileRootDir,
    output,
    pathValue,
    platform,
    profile,
  });
  if (!preflight.ok) return { ...preflight, status: 2 };

  const invocation = buildEasLocalAndroidBuildInvocation({
    mobileRootDir,
    output,
    pathValue,
    platform,
    profile,
  });
  const result = spawn(invocation.command, invocation.args, {
    cwd: mobileRootDir,
    env: preflight.env,
    shell: isWindows(platform),
    stdio: "inherit",
    windowsHide: true,
  });
  return {
    ...preflight,
    failures: result.error
      ? [...preflight.failures, result.error.message]
      : preflight.failures,
    status: result.status ?? 1,
  };
};

const isCliEntrypoint = () =>
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntrypoint()) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const preflight = checkEasLocalAndroidBuildPrerequisites(options);
    printPreflight(preflight);

    if (!preflight.ok) process.exit(2);
    if (options.checkOnly) process.exit(0);

    const result = runEasLocalAndroidBuild(options);
    process.exit(result.status);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
