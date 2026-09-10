import fs from "node:fs";
import path from "node:path";
import process from "node:process";
/* eslint-disable no-template-curly-in-string */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { resolveAndroidSdkRoot } from "../../../scripts/release/android-sdk-tools.mjs";
import { resolveJavaHome } from "./eas-local-android-build.mjs";

const placeholderEasProjectId = "00000000-0000-4000-8000-000000000000";
const easProjectIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const defaultMobileRootDir = () =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const defaultMonorepoRootDir = (mobileRootDir) =>
  path.resolve(mobileRootDir, "..", "..");

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

const releasePerfAndroidEntrySource = `/* global require */
require("react-native-gesture-handler");

const timestampMs = Math.round(Date.now());
console.info(
  \`[SH_RELEASE_PERF] marker=startup.p3.js_bundle_start t=\${timestampMs} route=bootstrap\`,
);

require("expo-router/entry");
`;

const ensureLocalMetroEntryFile = ({ mobileRootDir }) => {
  const entryFilePath = path.join(mobileRootDir, "index.android.js");
  const source = releasePerfAndroidEntrySource;
  if (!fs.existsSync(entryFilePath)) {
    fs.writeFileSync(entryFilePath, source, "utf8");
    return;
  }

  const current = fs.readFileSync(entryFilePath, "utf8");
  if (
    current !== source ||
    current.includes("./src/android-safe-entry") ||
    current.includes("./src/android-direct-entry")
  ) {
    fs.writeFileSync(entryFilePath, source, "utf8");
  }
};

const ensureMonorepoMetroEntryFile = ({ mobileRootDir, monorepoRootDir }) => {
  if (path.resolve(mobileRootDir) === path.resolve(monorepoRootDir)) return;

  const entryFilePath = path.join(monorepoRootDir, "index.android.js");
  const importPath = path
    .relative(monorepoRootDir, path.join(mobileRootDir, "index.android.js"))
    .replace(/\\/gu, "/");
  const source = `import "./${importPath}";\n`;
  if (!fs.existsSync(entryFilePath)) {
    fs.writeFileSync(entryFilePath, source, "utf8");
    return;
  }

  const current = fs.readFileSync(entryFilePath, "utf8");
  if (!current.includes(importPath)) {
    fs.writeFileSync(entryFilePath, source, "utf8");
  }
};

const ensureGradleInputMetroEntryShim = ({ mobileRootDir }) => {
  const shimPath = path.join(
    mobileRootDir,
    "apps",
    "mobile",
    "index.android.js",
  );
  const source = 'import "../../index.android.js";\n';
  fs.mkdirSync(path.dirname(shimPath), { recursive: true });
  if (!fs.existsSync(shimPath)) {
    fs.writeFileSync(shimPath, source, "utf8");
    return;
  }

  const current = fs.readFileSync(shimPath, "utf8");
  if (!current.includes("../../index.android.js")) {
    fs.writeFileSync(shimPath, source, "utf8");
  }
};

const patchAndroidReleaseEntryFile = ({ mobileRootDir }) => {
  const appBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build.gradle",
  );
  if (!fs.existsSync(appBuildGradlePath)) return;

  const source = fs.readFileSync(appBuildGradlePath, "utf8");
  const patchedEntry =
    'entryFile = file("${projectRoot}/apps/mobile/index.android.js")';
  let nextSource = source.replace(
    /^\s*entryFile\s*=\s*file\((?:"\$\{projectRoot\}\/apps\/mobile\/index\.android\.js"|"\$\{projectRoot\}\/index\.android\.js"|"\$\{projectRoot\}\/\.\.\/\.\.\/index\.android\.js"|"\.\.\/\.\.\/index\.android\.js"|\["node",\s*"-e",\s*"require\('expo\/scripts\/resolveAppEntry'\)",\s*projectRoot,\s*"android",\s*"absolute"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\))\)\s*$/mu,
    `    ${patchedEntry}`,
  );
  if (!/^\s*root\s*=\s*file\("\.\.\/\.\.\/"\)\s*$/mu.test(nextSource)) {
    nextSource = nextSource.replace(
      /react\s*\{\s*\r?\n/u,
      'react {\n    root = file("../../")\n',
    );
  }
  if (nextSource !== source) {
    fs.writeFileSync(appBuildGradlePath, nextSource, "utf8");
  }
};

const ensureKotlinImport = (source, importLine) => {
  if (source.includes(importLine)) return source;
  if (/^import\s+/mu.test(source)) {
    return source.replace(/(^import\s+[^\r\n]+\r?\n)/mu, `$1${importLine}\n`);
  }
  return source.replace(/^package\s+[^\r\n]+\r?\n/mu, `$&\n${importLine}\n`);
};

const ensureMainActivityReleasePerfMarkers = ({ mobileRootDir }) => {
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
  if (!fs.existsSync(mainActivityPath)) return;

  const source = fs.readFileSync(mainActivityPath, "utf8");
  let nextSource = source;
  nextSource = ensureKotlinImport(nextSource, "import android.os.SystemClock");
  nextSource = ensureKotlinImport(nextSource, "import android.util.Log");
  nextSource = ensureKotlinImport(
    nextSource,
    "import com.facebook.react.ReactRootView",
  );

  if (!nextSource.includes("startup.n1.application_on_create_entry")) {
    nextSource = nextSource.replace(
      /(override\s+fun\s+onCreate\s*\([^)]*\)\s*\{\s*\r?\n)/u,
      '$1    markStartupPerf("startup.n1.application_on_create_entry")\n',
    );
  }
  if (!nextSource.includes("startup.n2.activity_on_create_entry")) {
    nextSource = nextSource.replace(
      /(override\s+fun\s+onCreate\s*\([^)]*\)\s*\{\s*\r?\n)/u,
      '$1    markStartupPerf("startup.n2.activity_on_create_entry")\n',
    );
  }
  if (!nextSource.includes("startup.n3.activity_super_on_create_complete")) {
    nextSource = nextSource.replace(
      /^(\s*super\.onCreate\([^)]*\)\s*)$/mu,
      '$1\n    markStartupPerf("startup.n3.activity_super_on_create_complete")',
    );
  }
  if (!nextSource.includes("override fun createRootView()")) {
    nextSource = nextSource.replace(
      /(\s*object\s*:\s*DefaultReactActivityDelegate\([\s\S]*?\)\s*)\{\s*\}/u,
      `$1{
            override fun createRootView(): ReactRootView {
              markStartupPerf("startup.n4.react_root_view_create_start")
              return ReactRootView(this@MainActivity).apply {
                setBackgroundResource(R.drawable.ic_launcher_background)
                markStartupPerf("startup.n5.native_first_frame_ready")
              }
            }
          }`,
    );
  }
  if (
    nextSource.includes("override fun createRootView()") &&
    !nextSource.includes("startup.n4.react_root_view_create_start")
  ) {
    nextSource = nextSource.replace(
      /(override\s+fun\s+createRootView\(\):\s*ReactRootView\s*\{\s*\r?\n)/u,
      '$1              markStartupPerf("startup.n4.react_root_view_create_start")\n',
    );
  }
  if (
    nextSource.includes("override fun createRootView()") &&
    !nextSource.includes("startup.n5.native_first_frame_ready")
  ) {
    nextSource = nextSource.replace(
      /(setBackgroundResource\(R\.drawable\.ic_launcher_background\)\s*)/u,
      '$1\n                markStartupPerf("startup.n5.native_first_frame_ready")',
    );
  }
  if (!nextSource.includes("private fun markStartupPerf(marker: String)")) {
    nextSource = nextSource.replace(
      /\n\}\s*$/u,
      `

  private fun markStartupPerf(marker: String) {
    Log.i(
      "SH_RELEASE_PERF",
      "[SH_RELEASE_PERF] marker=$marker t=\${System.currentTimeMillis()} elapsed_ms=\${SystemClock.elapsedRealtime()} route=bootstrap",
    )
  }
}
`,
    );
  }

  if (nextSource !== source) {
    fs.writeFileSync(mainActivityPath, nextSource, "utf8");
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
  let nextSource = source.replace(
    /^\s*import\s+expo\.core\.ExpoModulesPackage;\r?\n/gmu,
    "import expo.modules.ExpoModulesPackage;\n",
  );
  if (!/import\s+expo\.modules\.ExpoModulesPackage;/u.test(nextSource)) {
    nextSource = nextSource.replace(
      /(\/\/ expo\r?\n)/u,
      "$1import expo.modules.ExpoModulesPackage;\n",
    );
  }
  if (!/new\s+ExpoModulesPackage\(\)/u.test(nextSource)) {
    nextSource = nextSource.replace(
      /(new\s+MainReactPackage\(mConfig\),\r?\n)/u,
      "$1      new ExpoModulesPackage(),\n",
    );
  }
  if (nextSource !== source) {
    fs.writeFileSync(packageListPath, nextSource, "utf8");
  }
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
      "-x",
      ":app:generateAutolinkingPackageList",
    ],
    gradleCommand,
    outputPath: path.resolve(mobileRootDir, output),
    packageListArgs: [
      ":app:generateAutolinkingPackageList",
      "-PreactNativeArchitectures=arm64-v8a",
      "-PnewArchEnabled=false",
    ],
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

const hasProductionEasProjectId = (env) => {
  const value = env.EAS_PROJECT_ID?.trim() ?? "";
  return value !== placeholderEasProjectId && easProjectIdPattern.test(value);
};

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
  if (!hasProductionEasProjectId(env)) {
    failures.push(
      "EAS_PROJECT_ID must be a real Expo project UUID before building the production Android AAB.",
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
  monorepoRootDir = defaultMonorepoRootDir(mobileRootDir),
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
  ensureLocalMetroEntryFile({ mobileRootDir });
  ensureMonorepoMetroEntryFile({ mobileRootDir, monorepoRootDir });
  ensureGradleInputMetroEntryShim({ mobileRootDir });
  patchAndroidReleaseEntryFile({ mobileRootDir });
  ensureMainActivityReleasePerfMarkers({ mobileRootDir });

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
    return {
      ...preflight,
      failures: packageList.error
        ? [...failures, packageList.error.message]
        : failures,
      status: packageList.status ?? 1,
    };
  }
  patchReactNativePackageList({ mobileRootDir });

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
