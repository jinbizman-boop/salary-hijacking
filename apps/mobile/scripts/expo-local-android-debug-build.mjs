import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  androidToolExists,
  resolveAndroidSdkRoot,
} from "../../../scripts/release/android-sdk-tools.mjs";
import { resolveJavaHome } from "./eas-local-android-build.mjs";

const defaultMobileRootDir = () =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const isWindows = (platform) => platform === "win32";

const executableNames = (command, platform) =>
  isWindows(platform)
    ? [`${command}.EXE`, `${command}.CMD`, `${command}.BAT`, command]
    : [command];

const pathKey = (env) => (env.Path !== undefined ? "Path" : "PATH");

const splitPath = (pathValue) =>
  typeof pathValue === "string" && pathValue.length > 0
    ? pathValue.split(path.delimiter).filter(Boolean)
    : [];

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

const ensureAndroidSplashScreenDependency = ({ mobileRootDir }) => {
  const appBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build.gradle",
  );
  if (!fs.existsSync(appBuildGradlePath)) return;
  const source = fs.readFileSync(appBuildGradlePath, "utf8");
  if (source.includes("androidx.core:core-splashscreen")) return;
  const dependencyLine =
    '    implementation("androidx.core:core-splashscreen:1.2.0-alpha02")';
  const nextSource = source.replace(
    /dependencies\s*\{/u,
    `dependencies {\n${dependencyLine}`,
  );
  fs.writeFileSync(appBuildGradlePath, nextSource, "utf8");
};

const ensureExpoProjectDependency = ({ mobileRootDir }) => {
  const appBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build.gradle",
  );
  if (!fs.existsSync(appBuildGradlePath)) return;
  const source = fs.readFileSync(appBuildGradlePath, "utf8");
  if (source.includes("implementation project(':expo')")) return;
  const dependencyLine = "    implementation project(':expo')";
  const nextSource = source.replace(
    /dependencies\s*\{/u,
    `dependencies {\n${dependencyLine}`,
  );
  fs.writeFileSync(appBuildGradlePath, nextSource, "utf8");
};

const ensureSecureStoreBackupXmlResources = ({ mobileRootDir }) => {
  const xmlDir = path.join(
    mobileRootDir,
    "android",
    "app",
    "src",
    "main",
    "res",
    "xml",
  );
  fs.mkdirSync(xmlDir, { recursive: true });
  const resources = [
    {
      fileName: "secure_store_backup_rules.xml",
      source: `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n  <exclude domain="sharedpref" path="SecureStore"/>\n</full-backup-content>\n`,
    },
    {
      fileName: "secure_store_data_extraction_rules.xml",
      source: `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n  <cloud-backup>\n    <exclude domain="sharedpref" path="SecureStore"/>\n  </cloud-backup>\n  <device-transfer>\n    <exclude domain="sharedpref" path="SecureStore"/>\n  </device-transfer>\n</data-extraction-rules>\n`,
    },
  ];
  for (const resource of resources) {
    const resourcePath = path.join(xmlDir, resource.fileName);
    if (!fs.existsSync(resourcePath)) {
      fs.writeFileSync(resourcePath, resource.source, "utf8");
    }
  }
};

const patchReactNativePackageList = ({ mobileRootDir }) => {
  const packageListPath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build",
    "generated",
    "autolinking",
    "src",
    "main",
    "java",
    "com",
    "facebook",
    "react",
    "PackageList.java",
  );
  if (!fs.existsSync(packageListPath)) return;
  const source = fs.readFileSync(packageListPath, "utf8");
  const nextSource = source
    .replace(/^\s*import\s+expo\.core\.ExpoModulesPackage;\r?\n/gmu, "")
    .replace(/^\s*new\s+ExpoModulesPackage\(\),\r?\n/gmu, "");
  if (nextSource !== source)
    fs.writeFileSync(packageListPath, nextSource, "utf8");
};

const patchAndroidExpoEntrypoints = ({ mobileRootDir }) => {
  const mainActivityPath = path.join(
    mobileRootDir,
    "android",
    "app",
    "src",
    "main",
    "java",
    "com",
    "salaryhijacking",
    "mobile",
    "MainActivity.kt",
  );
  if (fs.existsSync(mainActivityPath)) {
    const source = fs.readFileSync(mainActivityPath, "utf8");
    const nextSource = source
      .replace(
        /^\s*import\s+expo\.modules\.splashscreen\.SplashScreenManager\r?\n/gmu,
        "",
      )
      .replace(
        /^\s*SplashScreenManager\.registerOnActivity\(this\)\r?\n/gmu,
        "",
      );
    if (nextSource !== source)
      fs.writeFileSync(mainActivityPath, nextSource, "utf8");
  }
};

const mkdirSyncLongPath = (directory) => {
  fs.mkdirSync(path.toNamespacedPath(directory), { recursive: true });
};

const toWindowsCmakePathSegments = (sourcePath) =>
  path
    .resolve(sourcePath)
    .replace(/\\/gu, "/")
    .replace(/^([A-Za-z]):\//u, "$1_/")
    .split("/")
    .filter(Boolean);

const collectDirectories = (rootDir) => {
  if (!fs.existsSync(rootDir)) return [];
  const directories = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    directories.push(current);
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) stack.push(path.join(current, entry.name));
    }
  }
  return directories;
};

const repairReanimatedWindowsCmakeDirectories = ({
  mobileRootDir,
  platform,
}) => {
  if (!isWindows(platform)) return;
  const reanimatedCxxRoot = path.join(
    mobileRootDir,
    "node_modules",
    "react-native-reanimated",
    "android",
    ".cxx",
    "Debug",
  );
  const sourceSegments = toWindowsCmakePathSegments(
    path.join(mobileRootDir, "node_modules"),
  );
  const hashRoots = fs.existsSync(reanimatedCxxRoot)
    ? fs
        .readdirSync(reanimatedCxxRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(reanimatedCxxRoot, entry.name, "x86_64"))
    : [];
  for (const architectureRoot of hashRoots) {
    for (const targetName of ["reanimated", "worklets"]) {
      fs.mkdirSync(
        path.join(
          architectureRoot,
          "src",
          "main",
          "cpp",
          targetName,
          "CMakeFiles",
          `${targetName}.dir`,
          ...sourceSegments,
        ),
        { recursive: true },
      );
      mkdirSyncLongPath(
        path.join(
          architectureRoot,
          "src",
          "main",
          "cpp",
          targetName,
          "CMakeFiles",
          `${targetName}.dir`,
          ...sourceSegments,
        ),
      );
    }
  }
  const cmakeFileDirs = collectDirectories(reanimatedCxxRoot).filter(
    (directory) =>
      directory.endsWith(".dir") &&
      directory.includes(
        `${path.sep}src${path.sep}main${path.sep}cpp${path.sep}`,
      ),
  );
  for (const directory of cmakeFileDirs) {
    mkdirSyncLongPath(path.join(directory, ...sourceSegments));
  }
};

export const buildExpoLocalAndroidDebugInvocations = ({
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  output = "build/e2e/android/salary-hijacking-e2e.apk",
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
    debugApkPath: path.join(
      mobileRootDir,
      "android",
      "app",
      "build",
      "outputs",
      "apk",
      "debug",
      "app-debug.apk",
    ),
    expoCommand,
    gradleArgs: [
      "assembleDebug",
      "-PreactNativeArchitectures=x86_64",
      "-PnewArchEnabled=false",
      "-x",
      ":app:generateAutolinkingPackageList",
    ],
    gradleCommand,
    outputPath: path.resolve(mobileRootDir, output),
    packageListArgs: [
      ":app:generateAutolinkingPackageList",
      "-PreactNativeArchitectures=x86_64",
      "-PnewArchEnabled=false",
    ],
    prebuildArgs: ["prebuild", "--platform", "android", "--no-install"],
    reanimatedConfigureArgs: [
      ":react-native-reanimated:configureCMakeDebug[x86_64]",
      "-PreactNativeArchitectures=x86_64",
      "-PnewArchEnabled=false",
    ],
  };
};

const hasApkHeader = (filePath) => {
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

export const checkExpoLocalAndroidDebugPrerequisites = ({
  androidToolHomeDir,
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  pathValue = env.PATH ?? env.Path ?? "",
  platform = process.platform,
} = {}) => {
  const failures = [];
  const invocations = buildExpoLocalAndroidDebugInvocations({
    existsSync,
    mobileRootDir,
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
  if (!sdkRoot) failures.push("Android SDK root is unavailable.");

  const androidToolOptions = {
    env,
    existsSync,
    homeDir: androidToolHomeDir,
    pathValue,
    platform,
  };
  if (!androidToolExists("adb", androidToolOptions)) {
    failures.push("adb is unavailable.");
  }
  if (!androidToolExists("emulator", androidToolOptions)) {
    failures.push("emulator is unavailable.");
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
    output: "build/e2e/android/salary-hijacking-e2e.apk",
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

const copyVerifiedApk = ({ debugApkPath, outputPath }) => {
  if (!hasApkHeader(debugApkPath)) {
    throw new Error(
      `Debug APK was not produced or has an invalid APK header: ${debugApkPath}`,
    );
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.copyFileSync(debugApkPath, outputPath);
};

export const runExpoLocalAndroidDebugBuild = ({
  androidToolHomeDir,
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  output = "build/e2e/android/salary-hijacking-e2e.apk",
  pathValue = env.PATH ?? env.Path ?? "",
  platform = process.platform,
  skipPrebuild = false,
  spawn = spawnSync,
} = {}) => {
  const preflight = checkExpoLocalAndroidDebugPrerequisites({
    androidToolHomeDir,
    env,
    existsSync,
    mobileRootDir,
    pathValue,
    platform,
  });
  const invocations = buildExpoLocalAndroidDebugInvocations({
    existsSync,
    mobileRootDir,
    output,
    platform,
  });
  if (!preflight.ok) return { ...preflight, status: 2 };

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
      return { ...preflight, failures, status: prebuild.status ?? 1 };
    }
  }

  writeAndroidLocalProperties({
    mobileRootDir,
    sdkRoot: preflight.sdkRoot,
  });
  ensureAndroidSplashScreenDependency({ mobileRootDir });
  ensureExpoProjectDependency({ mobileRootDir });
  ensureSecureStoreBackupXmlResources({ mobileRootDir });
  patchAndroidExpoEntrypoints({ mobileRootDir });

  const packageList = spawn(
    invocations.gradleCommand,
    invocations.packageListArgs,
    {
      cwd: path.join(mobileRootDir, "android"),
      env: preflight.env,
      shell: isWindows(platform),
      stdio: "inherit",
      windowsHide: true,
    },
  );
  if ((packageList.status ?? 1) !== 0) {
    return { ...preflight, failures, status: packageList.status ?? 1 };
  }
  patchReactNativePackageList({ mobileRootDir });

  const reanimatedConfigure = spawn(
    invocations.gradleCommand,
    invocations.reanimatedConfigureArgs,
    {
      cwd: path.join(mobileRootDir, "android"),
      env: preflight.env,
      shell: isWindows(platform),
      stdio: "inherit",
      windowsHide: true,
    },
  );
  if ((reanimatedConfigure.status ?? 1) !== 0) {
    return { ...preflight, failures, status: reanimatedConfigure.status ?? 1 };
  }

  repairReanimatedWindowsCmakeDirectories({ mobileRootDir, platform });

  const gradle = spawn(invocations.gradleCommand, invocations.gradleArgs, {
    cwd: path.join(mobileRootDir, "android"),
    env: preflight.env,
    shell: isWindows(platform),
    stdio: "inherit",
    windowsHide: true,
  });
  if ((gradle.status ?? 1) !== 0) {
    return { ...preflight, failures, status: gradle.status ?? 1 };
  }

  try {
    copyVerifiedApk(invocations);
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
    process.stdout.write("[expo-local-android] preflight passed.\n");
    process.stdout.write(`[expo-local-android] JAVA_HOME=${result.javaHome}\n`);
    process.stdout.write(
      `[expo-local-android] ANDROID_SDK_ROOT=${result.sdkRoot}\n`,
    );
    return;
  }

  console.error("[expo-local-android] preflight failed:");
  for (const failure of result.failures) console.error(`- ${failure}`);
};

const isCliEntrypoint = () =>
  process.argv[1] &&
  fs.realpathSync.native(path.resolve(process.argv[1])) ===
    fs.realpathSync.native(fileURLToPath(import.meta.url));

if (isCliEntrypoint()) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const preflight = checkExpoLocalAndroidDebugPrerequisites(options);
    printPreflight(preflight);

    if (!preflight.ok) process.exit(2);
    if (options.checkOnly) process.exit(0);

    const result = runExpoLocalAndroidDebugBuild(options);
    process.exit(result.status);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
