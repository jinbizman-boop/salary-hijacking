import fs from "node:fs";
import path from "node:path";
import process from "node:process";
/* eslint-disable no-template-curly-in-string */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  androidToolExists,
  resolveAndroidSdkRoot,
} from "../../../scripts/release/android-sdk-tools.mjs";
import { resolveJavaHome } from "./eas-local-android-build.mjs";

const defaultMobileRootDir = () =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const defaultMonorepoRootDir = (mobileRootDir) =>
  path.resolve(mobileRootDir, "..", "..");

export const expoModulesCoreCmakeDebugRoot = (mobileRootDir) =>
  path.join(
    defaultMonorepoRootDir(mobileRootDir),
    "node_modules",
    ".pnpm",
    "expo-modules-core@2.5.0",
    "node_modules",
    "expo-modules-core",
    "android",
    ".cxx",
    "Debug",
  );

const isWindows = (platform) => platform === "win32";

const substAliasEnvKey = "SALARY_HIJACKING_ANDROID_BUILD_SUBST_ALIAS";
const substAliasDisableEnvKey = "SALARY_HIJACKING_ANDROID_BUILD_SUBST_DISABLE";
const substTargetEnvKey = "SALARY_HIJACKING_ANDROID_BUILD_SUBST_TARGET";
const gradleTimeoutEnvKey = "SALARY_HIJACKING_ANDROID_BUILD_GRADLE_TIMEOUT_MS";
const gradleTimeoutExitStatus = 124;
const substRootLengthThreshold = 40;
const substPreferredDriveLetters = ["Z", "Y", "X", "W", "V", "U", "T", "S"];

const parsePositiveIntegerEnv = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
};

const isSpawnTimeout = (result) =>
  result?.error?.code === "ETIMEDOUT" ||
  String(result?.error?.message ?? "").includes("ETIMEDOUT");

const executableNames = (command, platform) =>
  isWindows(platform)
    ? [`${command}.EXE`, `${command}.CMD`, `${command}.BAT`, command]
    : [command];

const pathKey = (env) => (env.Path !== undefined ? "Path" : "PATH");

const splitPath = (pathValue) =>
  typeof pathValue === "string" && pathValue.length > 0
    ? pathValue.split(path.delimiter).filter(Boolean)
    : [];

const withBundledAndroidToolEnv = ({
  env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  platform = process.platform,
}) => {
  const monorepoToolsDir = path.join(
    defaultMonorepoRootDir(mobileRootDir),
    ".tools",
  );
  const javaHome = path.join(monorepoToolsDir, "jdk-17");
  const sdkRoot = path.join(monorepoToolsDir, "android-sdk");
  const nextEnv = { ...env };

  if (
    !nextEnv.JAVA_HOME &&
    findExecutable({
      command: "java",
      directories: [path.join(javaHome, "bin")],
      existsSync,
      platform,
    })
  ) {
    nextEnv.JAVA_HOME = javaHome;
  }

  if (!nextEnv.ANDROID_SDK_ROOT && existsSync(sdkRoot)) {
    nextEnv.ANDROID_SDK_ROOT = sdkRoot;
  }
  if (!nextEnv.ANDROID_HOME && existsSync(sdkRoot)) {
    nextEnv.ANDROID_HOME = sdkRoot;
  }

  return nextEnv;
};

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

export const buildWindowsSubstAliasPlan = ({
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  platform = process.platform,
  preferredDriveLetters = substPreferredDriveLetters,
  rootLengthThreshold = substRootLengthThreshold,
} = {}) => {
  if (!isWindows(platform)) return null;
  if (env[substAliasDisableEnvKey] === "1") return null;
  if (env[substAliasEnvKey]) return null;

  const targetRootDir = path.resolve(defaultMonorepoRootDir(mobileRootDir));
  if (targetRootDir.length < rootLengthThreshold) return null;

  for (const drive of preferredDriveLetters) {
    const normalizedDrive = drive.replace(/:.*$/u, "").toUpperCase();
    const aliasRootDir = `${normalizedDrive}:\\`;
    if (existsSync(aliasRootDir)) continue;

    const aliasMobileRootDir = path.join(aliasRootDir, "apps", "mobile");
    return {
      aliasMobileRootDir,
      aliasRootDir,
      aliasScriptPath: path.join(
        aliasMobileRootDir,
        "scripts",
        "expo-local-android-debug-build.mjs",
      ),
      drive: normalizedDrive,
      targetRootDir,
    };
  }

  return null;
};

const runSubst = ({ args, spawn = spawnSync }) =>
  spawn("subst", args, {
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
    windowsHide: true,
  });

export const parseWindowsSubstMappings = (stdout) => {
  const mappings = new Map();
  for (const line of String(stdout ?? "").split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z]):\\?:\s*=>\s*(.+?)\s*$/iu);
    if (!match) continue;
    mappings.set(match[1].toUpperCase(), path.resolve(match[2]));
  }
  return mappings;
};

const normalizeSubstTarget = (value) =>
  path
    .resolve(String(value ?? ""))
    .replace(/[\\/]+$/u, "")
    .toLowerCase();

export const cleanupStaleWindowsSubstAliases = ({
  mobileRootDir = defaultMobileRootDir(),
  platform = process.platform,
  preferredDriveLetters = substPreferredDriveLetters,
  spawn = spawnSync,
} = {}) => {
  if (!isWindows(platform)) return [];

  const targetRootDir = defaultMonorepoRootDir(mobileRootDir);
  const normalizedTarget = normalizeSubstTarget(targetRootDir);
  const list = runSubst({ args: [], spawn });
  if ((list.status ?? 1) !== 0) return [];

  const mappings = parseWindowsSubstMappings(list.stdout);
  const removed = [];
  for (const drive of preferredDriveLetters) {
    const normalizedDrive = drive.replace(/:.*$/u, "").toUpperCase();
    const mappedTarget = mappings.get(normalizedDrive);
    if (!mappedTarget) continue;
    if (normalizeSubstTarget(mappedTarget) !== normalizedTarget) continue;
    const remove = runSubst({
      args: [`${normalizedDrive}:`, "/D"],
      spawn,
    });
    if ((remove.status ?? 1) === 0) removed.push(normalizedDrive);
  }
  return removed;
};

const runWithWindowsSubstAliasIfNeeded = ({
  argv,
  env = process.env,
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  platform = process.platform,
  spawn = spawnSync,
} = {}) => {
  cleanupStaleWindowsSubstAliases({ mobileRootDir, platform, spawn });
  const plan = buildWindowsSubstAliasPlan({
    env,
    existsSync,
    mobileRootDir,
    platform,
  });
  if (!plan) return null;

  const create = runSubst({
    args: [`${plan.drive}:`, plan.targetRootDir],
    spawn,
  });
  if ((create.status ?? 1) !== 0) {
    console.warn(
      `[expo-local-android] could not create ${plan.drive}: subst alias; continuing from the current workspace path.`,
    );
    return null;
  }

  try {
    console.warn(
      `[expo-local-android] using ${plan.aliasRootDir} as a short Windows build root for native CMake stability.`,
    );
    const result = spawn(process.execPath, [plan.aliasScriptPath, ...argv], {
      cwd: plan.aliasMobileRootDir,
      env: {
        ...env,
        [substAliasEnvKey]: plan.aliasRootDir,
        [substTargetEnvKey]: plan.targetRootDir,
      },
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    });
    return { status: result.status ?? 1 };
  } finally {
    runSubst({ args: [`${plan.drive}:`, "/D"], spawn });
    cleanupStaleWindowsSubstAliases({ mobileRootDir, platform, spawn });
  }
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

const normalizeAndroidArchitectures = (architecture) => {
  const architectures = String(architecture)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return architectures.length > 0 ? [...new Set(architectures)] : ["x86_64"];
};

export const repairGradleTransformTemporaryWorkspaces = ({
  gradleUserHome,
}) => {
  const cachesRoot = path.join(gradleUserHome, "caches");
  if (!fs.existsSync(cachesRoot)) return { moved: 0, removed: 0 };

  let moved = 0;
  let removed = 0;
  const tempTransformPattern =
    /^([0-9a-f]{32})-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

  for (const cacheVersion of fs.readdirSync(cachesRoot, {
    withFileTypes: true,
  })) {
    if (!cacheVersion.isDirectory()) continue;
    const transformsRoot = path.join(
      cachesRoot,
      cacheVersion.name,
      "transforms",
    );
    if (!fs.existsSync(transformsRoot)) continue;

    for (const entry of fs.readdirSync(transformsRoot, {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue;
      const match = tempTransformPattern.exec(entry.name);
      if (!match) continue;

      const temporaryPath = path.join(transformsRoot, entry.name);
      const immutablePath = path.join(transformsRoot, match[1]);
      if (fs.existsSync(immutablePath)) {
        try {
          fs.rmSync(temporaryPath, { force: true, recursive: true });
          removed += 1;
        } catch {
          // Windows may still hold nested transform files briefly; retrying
          // Gradle is safe even if this duplicate temporary folder remains.
        }
        continue;
      }

      try {
        fs.renameSync(temporaryPath, immutablePath);
        moved += 1;
      } catch {
        // If Gradle or Windows Defender races this repair, leave the folder
        // untouched and let the next Gradle invocation decide.
      }
    }
  }

  return { moved, removed };
};

const buildEnv = ({
  env,
  javaHome,
  mobileRootDir,
  pathValue,
  platform = process.platform,
  sdkRoot,
}) => {
  const envPathKey = pathKey(env);
  const gradleUserHome =
    env.GRADLE_USER_HOME ??
    (isWindows(platform)
      ? path.join(mobileRootDir, ".gradle-local-debug")
      : undefined);
  return {
    ...env,
    ANDROID_HOME: sdkRoot,
    ANDROID_SDK_ROOT: sdkRoot,
    EXPO_PUBLIC_E2E_BUILD: "true",
    ...(gradleUserHome ? { GRADLE_USER_HOME: gradleUserHome } : {}),
    JAVA_HOME: javaHome,
    SALARY_HIJACKING_METRO_CANONICAL_ROOT:
      env.SALARY_HIJACKING_METRO_CANONICAL_ROOT ?? "1",
    NODE_ENV: env.NODE_ENV || "production",
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

const ensureLocalMetroEntryFile = ({ mobileRootDir }) => {
  const entryFilePath = path.join(mobileRootDir, "index.android.js");
  const source = 'import "expo-router/entry";\n';
  if (!fs.existsSync(entryFilePath)) {
    fs.writeFileSync(entryFilePath, source, "utf8");
    return;
  }

  const current = fs.readFileSync(entryFilePath, "utf8");
  if (!current.includes("expo-router/entry")) {
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

const cleanReactNativeAutolinkingCache = ({ mobileRootDir }) => {
  const autolinkingCacheDir = path.join(
    mobileRootDir,
    "android",
    "build",
    "generated",
    "autolinking",
  );
  fs.rmSync(autolinkingCacheDir, { force: true, recursive: true });
};

const cleanKspCompilerCaches = ({ mobileRootDir }) => {
  const cacheDirs = [
    path.join(
      mobileRootDir,
      "node_modules",
      "expo-updates",
      "android",
      "build",
      "generated",
      "ksp",
    ),
    path.join(
      mobileRootDir,
      "node_modules",
      "expo-updates",
      "android",
      "build",
      "kspCaches",
    ),
    path.join(
      mobileRootDir,
      "node_modules",
      "expo-updates",
      "android",
      "build",
      "kotlin",
    ),
  ];
  for (const cacheDir of cacheDirs) {
    fs.rmSync(cacheDir, { force: true, recursive: true });
  }
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

const ensureReactNativeDebugBundle = ({ mobileRootDir }) => {
  const appBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build.gradle",
  );
  if (!fs.existsSync(appBuildGradlePath)) return;
  const source = fs.readFileSync(appBuildGradlePath, "utf8");
  if (source.includes("debuggableVariants = []")) return;
  const bundleLine = "    debuggableVariants = []";
  const nextSource = /react\s*\{/u.test(source)
    ? source.replace(/react\s*\{/u, `react {\n${bundleLine}`)
    : `${source.trimEnd()}\n\nreact {\n${bundleLine}\n}\n`;
  fs.writeFileSync(appBuildGradlePath, nextSource, "utf8");
};

const buildSubstAwareNodeResolveExpression = (resolveExpression) =>
  `(() => { const path = require('node:path'); const fs = require('node:fs'); const resolved = ${resolveExpression}; const alias = process.env['${substAliasEnvKey}']; if (!alias) return resolved; const realRoot = process.env['${substTargetEnvKey}'] || fs.realpathSync.native(alias); const normalizedResolved = path.resolve(resolved).toLowerCase(); const normalizedRealRoot = path.resolve(realRoot).toLowerCase(); return normalizedResolved === normalizedRealRoot || normalizedResolved.startsWith(normalizedRealRoot + path.sep) ? path.join(alias, path.relative(realRoot, resolved)) : resolved; })()`;

const buildCanonicalNodeResolveExpression = (resolveExpression) =>
  `(() => { const fs = require('node:fs'); return fs.realpathSync.native(${resolveExpression}); })()`;

const escapeGradleString = (value) => value.replaceAll('"', '\\"');

const patchAndroidSettingsSameRootNodeResolution = ({ mobileRootDir }) => {
  const settingsGradlePath = path.join(
    mobileRootDir,
    "android",
    "settings.gradle",
  );
  if (!fs.existsSync(settingsGradlePath)) return;

  const source = fs.readFileSync(settingsGradlePath, "utf8");
  let nextSource = source.replace(
    /workingDir\(rootDir\)\r?\n\s*commandLine\("node", "--print", "require\.resolve\('@react-native\/gradle-plugin\/package\.json', \{ paths: \[require\.resolve\('react-native\/package\.json'\)\] \}\)"\)/u,
    [
      "workingDir(rootDir)",
      '      environment("NODE_OPTIONS", "")',
      `      commandLine("node", "--print", "${escapeGradleString(buildSubstAwareNodeResolveExpression("require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })"))}")`,
    ].join("\n"),
  );
  nextSource = nextSource.replace(
    /workingDir\(rootDir\)\r?\n\s*commandLine\("node", "--print", "require\.resolve\('expo-modules-autolinking\/package\.json', \{ paths: \[require\.resolve\('expo\/package\.json'\)\] \}\)"\)/u,
    [
      "workingDir(rootDir)",
      '      environment("NODE_OPTIONS", "")',
      `      commandLine("node", "--print", "${escapeGradleString(buildCanonicalNodeResolveExpression("require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })"))}")`,
    ].join("\n"),
  );
  nextSource = nextSource.replace(
    /commandLine\("node", "--print", "\(\(\) => \{ const path = require\('node:path'\); const fs = require\('node:fs'\); const resolved = require\.resolve\('expo-modules-autolinking\/package\.json', \{ paths: \[require\.resolve\('expo\/package\.json'\)\] \}\);.*?\}\)\(\)"\)/u,
    `commandLine("node", "--print", "${escapeGradleString(buildCanonicalNodeResolveExpression("require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })"))}")`,
  );
  nextSource = nextSource.replaceAll(
    "const realRoot = fs.realpathSync.native(alias);",
    `const realRoot = process.env['${substTargetEnvKey}'] || fs.realpathSync.native(alias);`,
  );
  nextSource = nextSource.replace(
    "def realRoot = new File(alias).canonicalPath",
    `def realRoot = System.getenv('${substTargetEnvKey}') ?: new File(alias).canonicalPath`,
  );
  nextSource = nextSource.replaceAll(
    "def normalizedRealRoot = realRoot.toLowerCase()",
    "def normalizedRealRoot = realRoot.replace('/', File.separator).replace('\\\\', File.separator).toLowerCase()",
  );
  nextSource = nextSource.replaceAll(
    "def normalizedValue = absoluteValue.toLowerCase()",
    "def normalizedValue = absoluteValue.replace('/', File.separator).replace('\\\\', File.separator).toLowerCase()",
  );
  nextSource = nextSource.replace(/^\s*'expo-updates',\r?\n/gmu, "");
  if (!nextSource.includes("salaryHijackingPluginManagementSameRootPath")) {
    nextSource = nextSource.replace(
      /(\s+includeBuild\(reactNativeGradlePlugin\))/u,
      [
        "",
        "  def salaryHijackingPluginManagementSameRootPath = { value ->",
        `    def alias = System.getenv('${substAliasEnvKey}')`,
        "    if (!alias) return value",
        `    def realRoot = System.getenv('${substTargetEnvKey}') ?: new File(alias).canonicalPath`,
        "    def absoluteValue = new File(value.toString()).absolutePath",
        "    def normalizedRealRoot = realRoot.replace('/', File.separator).replace('\\\\', File.separator).toLowerCase()",
        "    def normalizedValue = absoluteValue.replace('/', File.separator).replace('\\\\', File.separator).toLowerCase()",
        "    if (normalizedValue == normalizedRealRoot || normalizedValue.startsWith(normalizedRealRoot + File.separator)) {",
        "      return new File(alias, absoluteValue.substring(realRoot.length()).replaceFirst('^[\\\\\\\\/]+', '')).path",
        "    }",
        "    return value",
        "  }",
        "  includeBuild(salaryHijackingPluginManagementSameRootPath(reactNativeGradlePlugin))",
      ].join("\n"),
    );
  }
  nextSource = nextSource.replace(
    /includeBuild\(reactNativeGradlePlugin\)/gu,
    "includeBuild(salaryHijackingPluginManagementSameRootPath(reactNativeGradlePlugin))",
  );
  nextSource = nextSource.replace(
    /includeBuild\(salaryHijackingPluginManagementSameRootPath\(expoPluginsPath\)\)/gu,
    "includeBuild(expoPluginsPath)",
  );
  nextSource = nextSource.replace(
    /includeBuild\(salaryHijackingSameRootPath\(expoAutolinking\.reactNativeGradlePlugin\)\)/gu,
    [
      "def salaryHijackingExpoAutolinkingGradlePlugin = salaryHijackingSameRootPath(expoAutolinking.reactNativeGradlePlugin)",
      "def salaryHijackingExpoAutolinkingGradlePluginKey = salaryHijackingExpoAutolinkingGradlePlugin.toString().replace('/', File.separator).toLowerCase()",
      "if (!salaryHijackingExpoAutolinkingGradlePluginKey.contains(['expo-modules-autolinking', 'android', 'expo-gradle-plugin'].join(File.separator))) {",
      "  includeBuild(salaryHijackingExpoAutolinkingGradlePlugin)",
      "}",
    ].join("\n"),
  );
  if (!nextSource.includes("salaryHijackingExpoModuleNames")) {
    nextSource = nextSource.replace(
      "expoAutolinking.useExpoModules()",
      [
        "expoAutolinking.useExpoModules()",
        "def salaryHijackingExpoModuleNames = [",
        "  'expo',",
        "  'expo-application',",
        "  'expo-asset',",
        "  'expo-constants',",
        "  'expo-crypto',",
        "  'expo-device',",
        "  'expo-document-picker',",
        "  'expo-eas-client',",
        "  'expo-file-system',",
        "  'expo-font',",
        "  'expo-haptics',",
        "  'expo-json-utils',",
        "  'expo-keep-awake',",
        "  'expo-linking',",
        "  'expo-localization',",
        "  'expo-manifests',",
        "  'expo-modules-core',",
        "  'expo-notifications',",
        "  'expo-secure-store',",
        "  'expo-splash-screen',",
        "  'expo-structured-headers',",
        "  'expo-system-ui',",
        "  'expo-updates-interface',",
        "  'expo-web-browser',",
        "]",
        "def salaryHijackingExpoModuleAlias = System.getenv('SALARY_HIJACKING_ANDROID_BUILD_SUBST_ALIAS')",
        "if (salaryHijackingExpoModuleAlias) {",
        "  salaryHijackingExpoModuleNames.each { moduleName ->",
        '    def moduleProject = findProject(":${moduleName}")',
        '    def moduleDir = new File(salaryHijackingExpoModuleAlias, "apps/mobile/node_modules/${moduleName}/android")',
        "    if (moduleProject != null && moduleDir.exists()) {",
        "      moduleProject.projectDir = moduleDir",
        "    }",
        "  }",
        "}",
      ].join("\n"),
    );
  }
  if (!nextSource.includes("salaryHijackingSameRootPath")) {
    nextSource = nextSource.replace(
      /includeBuild\(expoAutolinking\.reactNativeGradlePlugin\)/u,
      [
        "def salaryHijackingSameRootPath = { value ->",
        `  def alias = System.getenv('${substAliasEnvKey}')`,
        "  if (!alias) return value",
        `  def realRoot = System.getenv('${substTargetEnvKey}') ?: new File(alias).canonicalPath`,
        "  def absoluteValue = new File(value.toString()).absolutePath",
        "  def normalizedRealRoot = realRoot.replace('/', File.separator).replace('\\\\', File.separator).toLowerCase()",
        "  def normalizedValue = absoluteValue.replace('/', File.separator).replace('\\\\', File.separator).toLowerCase()",
        "  if (normalizedValue == normalizedRealRoot || normalizedValue.startsWith(normalizedRealRoot + File.separator)) {",
        "    return new File(alias, absoluteValue.substring(realRoot.length()).replaceFirst('^[\\\\\\\\/]+', '')).path",
        "  }",
        "  return value",
        "}",
        "def salaryHijackingExpoAutolinkingGradlePlugin = salaryHijackingSameRootPath(expoAutolinking.reactNativeGradlePlugin)",
        "def salaryHijackingExpoAutolinkingGradlePluginKey = salaryHijackingExpoAutolinkingGradlePlugin.toString().replace('/', File.separator).toLowerCase()",
        "if (!salaryHijackingExpoAutolinkingGradlePluginKey.contains(['expo-modules-autolinking', 'android', 'expo-gradle-plugin'].join(File.separator))) {",
        "  includeBuild(salaryHijackingExpoAutolinkingGradlePlugin)",
        "}",
      ].join("\n"),
    );
  }

  if (nextSource !== source) {
    fs.writeFileSync(settingsGradlePath, nextSource, "utf8");
  }
};

const patchAndroidDebugEntryFile = ({
  canonicalMetroRoot = false,
  mobileRootDir,
}) => {
  const appBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build.gradle",
  );
  if (!fs.existsSync(appBuildGradlePath)) return;

  const source = fs.readFileSync(appBuildGradlePath, "utf8");
  const canonicalProjectRoot = fs.realpathSync.native(mobileRootDir);
  const gradleProjectRoot = canonicalProjectRoot
    .replace(/\\/gu, "/")
    .replace(/"/gu, '\\"');
  let nextSource = source.replace(
    /^\s*entryFile\s*=\s*(?:file\((?:"\$\{projectRoot\}\/apps\/mobile\/index\.android\.js"|"\$\{projectRoot\}\/index\.android\.js"|"\$\{projectRoot\}\/\.\.\/\.\.\/index\.android\.js"|"\.\.\/\.\.\/index\.android\.js"|\["node",\s*"-e",\s*"require\('expo\/scripts\/resolveAppEntry'\)",\s*projectRoot,\s*"android",\s*"absolute"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\))\)|new File\(projectRoot,\s*"index\.android\.js"\))\s*$/mu,
    canonicalMetroRoot
      ? '    entryFile = file("${projectRoot}/index.android.js")'
      : '    entryFile = new File(projectRoot, "index.android.js")',
  );
  nextSource = nextSource.replace(
    /^\s*root\s*=\s*file\((?:"\.\.\/\.\.\/"|"\.\.\/")\)\s*$/mu,
    "    root = file(projectRoot)",
  );
  if (canonicalMetroRoot) {
    nextSource = nextSource.replace(
      /^def\s+projectRoot\s*=.*$/mu,
      `def projectRoot = "${gradleProjectRoot}"`,
    );
    if (!/^def\s+projectRoot\s*=/mu.test(nextSource)) {
      nextSource = `def projectRoot = "${gradleProjectRoot}"\n${nextSource}`;
    }
  } else {
    nextSource = nextSource.replace(
      /^def\s+projectRoot\s*=.*$/mu,
      'def projectRoot = file("../../").getAbsolutePath()',
    );
    if (!/^def\s+projectRoot\s*=/mu.test(nextSource)) {
      nextSource = `def projectRoot = file("../../").getAbsolutePath()\n${nextSource}`;
    }
  }
  if (
    !canonicalMetroRoot &&
    !/^\s*root\s*=\s*file\(projectRoot\)\s*$/mu.test(nextSource)
  ) {
    nextSource = nextSource.replace(
      /react\s*\{\s*\r?\n/u,
      "react {\n    root = file(projectRoot)\n",
    );
  } else if (
    canonicalMetroRoot &&
    !/^\s*root\s*=\s*file\(projectRoot\)\s*$/mu.test(nextSource)
  ) {
    nextSource = nextSource.replace(
      /react\s*\{\s*\r?\n/u,
      "react {\n    root = file(projectRoot)\n",
    );
  }
  if (nextSource !== source) {
    fs.writeFileSync(appBuildGradlePath, nextSource, "utf8");
  }
};

const patchAndroidCanonicalBundleTaskOutputs = ({
  canonicalMetroRoot = false,
  mobileRootDir,
}) => {
  if (!canonicalMetroRoot) return;
  const appBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build.gradle",
  );
  if (!fs.existsSync(appBuildGradlePath)) return;

  const source = fs.readFileSync(appBuildGradlePath, "utf8");
  let nextSource = source.trimEnd();

  if (!nextSource.includes("canonicalReactBuildDir")) {
    nextSource = [
      nextSource,
      "",
      "afterEvaluate {",
      '    def canonicalReactBuildDir = new File(projectRoot, "android/app/build")',
      '    tasks.matching { it.name == "createBundleDebugJsAndAssets" }.configureEach { task ->',
      '        task.jsBundleDir.set(new File(canonicalReactBuildDir, "generated/assets/react/debug"))',
      '        task.resourcesDir.set(new File(canonicalReactBuildDir, "generated/res/react/debug"))',
      '        task.jsSourceMapsDir.set(new File(canonicalReactBuildDir, "generated/sourcemaps/react/debug"))',
      '        task.jsIntermediateSourceMapsDir.set(new File(canonicalReactBuildDir, "intermediates/sourcemaps/react/debug"))',
      "    }",
      "}",
    ].join("\n");
  }

  if (!nextSource.includes("createDebugUpdatesResources")) {
    nextSource = [
      nextSource,
      "",
      "afterEvaluate {",
      '    tasks.matching { it.name == "createDebugUpdatesResources" }.configureEach { task ->',
      "        task.debuggableVariant.set(true)",
      "    }",
      "}",
    ].join("\n");
  }

  if (nextSource !== source.trimEnd()) {
    fs.writeFileSync(appBuildGradlePath, `${nextSource}\n`, "utf8");
  }
};

const resolveDetoxAndroidVersion = ({ mobileRootDir }) => {
  const detoxPackagePath = path.join(
    mobileRootDir,
    "node_modules",
    "detox",
    "package.json",
  );
  if (!fs.existsSync(detoxPackagePath)) return "20.51.4";
  const packageJson = JSON.parse(fs.readFileSync(detoxPackagePath, "utf8"));
  return typeof packageJson.version === "string" && packageJson.version
    ? packageJson.version
    : "20.51.4";
};

const ensureDetoxAndroidMavenRepository = ({ mobileRootDir }) => {
  const rootBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "build.gradle",
  );
  if (!fs.existsSync(rootBuildGradlePath)) return;
  const source = fs.readFileSync(rootBuildGradlePath, "utf8");
  const detoxRepositoryLine =
    '    maven { url "$rootDir/../node_modules/detox/Detox-android" }';
  if (source.includes("node_modules/detox/Detox-android")) return;
  const lastMavenCentralIndex = source.lastIndexOf("    mavenCentral()");
  const insertIndex =
    lastMavenCentralIndex >= 0
      ? source.indexOf("\n", lastMavenCentralIndex) + 1
      : -1;
  const nextSource =
    insertIndex > 0
      ? `${source.slice(0, insertIndex)}${detoxRepositoryLine}\n${source.slice(
          insertIndex,
        )}`
      : source.replace(
          /repositories\s*\{/u,
          `repositories {\n${detoxRepositoryLine}`,
        );
  fs.writeFileSync(rootBuildGradlePath, nextSource, "utf8");
};

const ensureDetoxAndroidTestConfig = ({ mobileRootDir }) => {
  const appBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build.gradle",
  );
  if (!fs.existsSync(appBuildGradlePath)) return;

  let source = fs.readFileSync(appBuildGradlePath, "utf8");
  const detoxAndroidVersion = resolveDetoxAndroidVersion({ mobileRootDir });
  source = source.replace(
    /^\s*androidTestImplementation\("com\.wix:detox:\+"\)\r?\n/gmu,
    "",
  );
  const androidTestDependencies = [
    `androidTestImplementation("com.wix:detox:${detoxAndroidVersion}")`,
    'androidTestImplementation("androidx.test:core:1.6.1")',
    'androidTestImplementation("androidx.test.ext:junit:1.2.1")',
    'androidTestImplementation("androidx.test:runner:1.6.2")',
    'androidTestImplementation("androidx.test:rules:1.6.1")',
  ];
  const missingAndroidTestDependencies = androidTestDependencies.filter(
    (dependency) => !source.includes(dependency),
  );
  if (missingAndroidTestDependencies.length > 0) {
    source = source.replace(
      /dependencies\s*\{/u,
      `dependencies {\n    ${missingAndroidTestDependencies.join("\n    ")}`,
    );
  }

  if (!source.includes("testInstrumentationRunner")) {
    source = source.replace(
      /(defaultConfig\s*\{\s*)/u,
      '$1\n        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"\n',
    );
  }

  fs.writeFileSync(appBuildGradlePath, source, "utf8");
};

const findMainActivityPackage = ({ mobileRootDir }) => {
  const javaRoot = path.join(
    mobileRootDir,
    "android",
    "app",
    "src",
    "main",
    "java",
  );
  const stack = [javaRoot];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir || !fs.existsSync(currentDir)) continue;
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (!/^MainActivity\.(?:kt|java)$/u.test(entry.name)) continue;
      const source = fs.readFileSync(entryPath, "utf8");
      const packageMatch = source.match(/^\s*package\s+([\w.]+)\s*;?/mu);
      if (packageMatch?.[1]) return packageMatch[1];
    }
  }

  return "com.salaryhijacking.mobile";
};

const ensureDetoxAndroidTestSource = ({ mobileRootDir }) => {
  const activityPackage = findMainActivityPackage({ mobileRootDir });
  const androidTestJavaRoot = path.join(
    mobileRootDir,
    "android",
    "app",
    "src",
    "androidTest",
    "java",
  );
  const testSourceDir = path.join(
    androidTestJavaRoot,
    ...activityPackage.split("."),
  );
  fs.mkdirSync(testSourceDir, { recursive: true });

  const testSourcePath = path.join(testSourceDir, "DetoxTest.java");
  if (fs.existsSync(androidTestJavaRoot)) {
    const stack = [androidTestJavaRoot];
    while (stack.length > 0) {
      const currentDir = stack.pop();
      if (!currentDir) continue;
      for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
        const entryPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
          continue;
        }
        if (entry.name === "DetoxTest.java" && entryPath !== testSourcePath) {
          fs.rmSync(entryPath, { force: true });
        }
      }
    }
  }
  const source = [
    `package ${activityPackage};`,
    "",
    "import androidx.test.ext.junit.runners.AndroidJUnit4;",
    "import androidx.test.rule.ActivityTestRule;",
    "import com.wix.detox.Detox;",
    "import org.junit.Rule;",
    "import org.junit.Test;",
    "import org.junit.runner.RunWith;",
    "",
    "@RunWith(AndroidJUnit4.class)",
    "public class DetoxTest {",
    "  @Rule",
    "  public ActivityTestRule<MainActivity> mActivityRule =",
    "      new ActivityTestRule<>(MainActivity.class, false, false);",
    "",
    "  @Test",
    "  public void runDetoxTests() {",
    "    Detox.runTests(mActivityRule);",
    "  }",
    "}",
    "",
  ].join("\n");
  fs.writeFileSync(testSourcePath, source, "utf8");
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

const buildReactNativePackageListPath = (mobileRootDir) =>
  path.join(
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

const buildPackageListPatchRoots = ({ env = process.env, mobileRootDir }) => {
  const roots = [mobileRootDir];
  const aliasRootDir = env[substAliasEnvKey];
  const targetRootDir = env[substTargetEnvKey];
  if (aliasRootDir && targetRootDir) {
    const relativeMobileRoot = path.relative(aliasRootDir, mobileRootDir);
    if (
      !relativeMobileRoot.startsWith("..") &&
      !path.isAbsolute(relativeMobileRoot)
    ) {
      roots.push(path.join(targetRootDir, relativeMobileRoot));
    }
  }
  return [...new Set(roots.map((root) => path.resolve(root)))];
};

const patchReactNativePackageListSource = (source) => {
  let nextSource = source.replace(
    /^\s*import\s+expo\.core\.ExpoModulesPackage;\r?\n/gmu,
    "import expo.modules.ExpoModulesPackage;\n",
  );
  if (!/import\s+expo\.modules\.ExpoModulesPackage;/u.test(nextSource)) {
    const withExpoComment = nextSource.replace(
      /(\/\/ expo\r?\n)/u,
      "$1import expo.modules.ExpoModulesPackage;\n",
    );
    nextSource =
      withExpoComment === nextSource
        ? nextSource.replace(
            /(package\s+com\.facebook\.react;\r?\n)/u,
            "$1import expo.modules.ExpoModulesPackage;\n",
          )
        : withExpoComment;
  }
  if (!/new\s+ExpoModulesPackage\(\)/u.test(nextSource)) {
    const withMainPackage = nextSource.replace(
      /(new\s+MainReactPackage\([^)]*\),\r?\n)/u,
      "$1      new ExpoModulesPackage(),\n",
    );
    if (withMainPackage !== nextSource) {
      nextSource = withMainPackage;
    } else {
      nextSource = nextSource.replace(
        /(return\s+new\s+Object\[\]\s*\{\r?\n|Arrays\.<ReactPackage>asList\(\r?\n)/u,
        "$1      new ExpoModulesPackage(),\n",
      );
    }
  }
  return nextSource;
};

const patchReactNativePackageList = ({ env = process.env, mobileRootDir }) => {
  const packageListPaths = buildPackageListPatchRoots({
    env,
    mobileRootDir,
  }).map(buildReactNativePackageListPath);
  for (const packageListPath of packageListPaths) {
    if (!fs.existsSync(packageListPath)) continue;
    const source = fs.readFileSync(packageListPath, "utf8");
    const nextSource = patchReactNativePackageListSource(source);
    if (nextSource !== source)
      fs.writeFileSync(packageListPath, nextSource, "utf8");
  }
};

const cleanAndroidAppCompileCaches = ({ env = process.env, mobileRootDir }) => {
  for (const rootDir of buildPackageListPatchRoots({ env, mobileRootDir })) {
    const appBuildDir = path.join(rootDir, "android", "app", "build");
    for (const relativePath of [
      path.join("generated", "assets"),
      path.join("generated", "res"),
      path.join("generated", "sourcemaps"),
      "intermediates",
      "tmp",
      path.join("outputs", "apk", "debug"),
      path.join("outputs", "apk", "androidTest", "debug"),
    ]) {
      fs.rmSync(path.join(appBuildDir, relativePath), {
        force: true,
        recursive: true,
      });
    }
  }
};

const buildNdkAbiFiltersBlock = (architectures) =>
  [
    "        ndk {",
    `            abiFilters ${architectures.map((entry) => `"${entry}"`).join(", ")}`,
    "        }",
  ].join("\n");

export const ensureAndroidDebugNdkAbiFilters = ({
  architecture = "x86_64",
  mobileRootDir,
}) => {
  const appBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build.gradle",
  );
  if (!fs.existsSync(appBuildGradlePath)) return;

  const architectures = normalizeAndroidArchitectures(architecture);
  const source = fs.readFileSync(appBuildGradlePath, "utf8");
  const nextBlock = buildNdkAbiFiltersBlock(architectures);
  let nextSource = source;

  if (
    /defaultConfig\s*\{[\s\S]*?ndk\s*\{[\s\S]*?abiFilters[\s\S]*?\}/u.test(
      source,
    )
  ) {
    nextSource = source.replace(
      /(defaultConfig\s*\{[\s\S]*?ndk\s*\{[\s\S]*?abiFilters\s+)([^\r\n]+)([\s\S]*?\})/u,
      `$1${architectures.map((entry) => `"${entry}"`).join(", ")}$3`,
    );
  } else {
    nextSource = source.replace(
      /(defaultConfig\s*\{\s*)/u,
      `$1\n${nextBlock}\n`,
    );
  }

  if (nextSource !== source) {
    fs.writeFileSync(appBuildGradlePath, nextSource, "utf8");
  }
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
      )
      .replace(
        /^(\s*)\/\/\s*setTheme\(R\.style\.AppTheme\);\r?$/gmu,
        "$1setTheme(R.style.AppTheme);",
      );
    if (nextSource !== source)
      fs.writeFileSync(mainActivityPath, nextSource, "utf8");
  }
};

const patchAndroidPostSplashWindowBackground = ({ mobileRootDir }) => {
  const stylesPath = path.join(
    mobileRootDir,
    "android",
    "app",
    "src",
    "main",
    "res",
    "values",
    "styles.xml",
  );
  if (!fs.existsSync(stylesPath)) return;

  const source = fs.readFileSync(stylesPath, "utf8");
  if (
    /<item\s+name="android:windowBackground">@drawable\/ic_launcher_background<\/item>/u.test(
      source,
    )
  ) {
    return;
  }

  const nextSource = source.replace(
    /(<item\s+name="colorPrimary">[^<]+<\/item>\r?\n)/u,
    '$1    <item name="android:windowBackground">@drawable/ic_launcher_background</item>\n',
  );
  if (nextSource !== source) {
    fs.writeFileSync(stylesPath, nextSource, "utf8");
  }
};

const patchAndroidDebugDeveloperSupport = ({ mobileRootDir }) => {
  const mainApplicationPath = path.join(
    mobileRootDir,
    "android",
    "app",
    "src",
    "main",
    "java",
    "com",
    "salaryhijacking",
    "mobile",
    "MainApplication.kt",
  );
  if (!fs.existsSync(mainApplicationPath)) return;

  const source = fs.readFileSync(mainApplicationPath, "utf8");
  const nextSource = source.replace(
    /override fun getUseDeveloperSupport\(\): Boolean = BuildConfig\.DEBUG/u,
    "override fun getUseDeveloperSupport(): Boolean = false",
  );
  if (nextSource !== source) {
    fs.writeFileSync(mainApplicationPath, nextSource, "utf8");
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

const collectCmakeObjectOutputParentDirectories = (buildNinjaPath) => {
  if (!fs.existsSync(buildNinjaPath)) return [];
  const buildDir = path.dirname(buildNinjaPath);
  const source = fs.readFileSync(buildNinjaPath, "utf8");
  const parentDirectories = [];
  for (const line of source.split(/\r?\n/u)) {
    const match = line.match(/^build\s+(.+?\.o):\s/u);
    if (!match?.[1]) continue;
    for (const output of match[1].split(/\s+/u).filter(Boolean)) {
      parentDirectories.push(
        path.dirname(path.join(buildDir, output.replace(/\//gu, path.sep))),
      );
    }
  }
  return parentDirectories;
};

export const repairReanimatedWindowsCmakeDirectories = ({
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
        .flatMap((entry) => {
          const hashRoot = path.join(reanimatedCxxRoot, entry.name);
          const architectureRoots = fs
            .readdirSync(hashRoot, { withFileTypes: true })
            .filter((candidate) => candidate.isDirectory())
            .map((candidate) => path.join(hashRoot, candidate.name));
          return architectureRoots.length > 0
            ? architectureRoots
            : [path.join(hashRoot, "x86_64")];
        })
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

const cmakeExecutableFromCache = ({ buildDir, env = process.env } = {}) => {
  const cachePath = path.join(buildDir, "CMakeCache.txt");
  if (fs.existsSync(cachePath)) {
    const cacheSource = fs.readFileSync(cachePath, "utf8");
    const makeProgram = cacheSource.match(/^CMAKE_MAKE_PROGRAM:[^=]*=(.+)$/mu);
    if (makeProgram?.[1]) {
      return path.join(path.dirname(makeProgram[1].trim()), "cmake.exe");
    }
  }
  const androidHome = env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT;
  return androidHome
    ? path.join(androidHome, "cmake", "3.22.1", "bin", "cmake.exe")
    : "";
};

export const regenerateMissingReanimatedWindowsCmakeRules = ({
  env = process.env,
  mobileRootDir,
  platform,
  spawn = spawnSync,
} = {}) => {
  if (!isWindows(platform)) return 0;
  const reanimatedAndroidRoot = path.join(
    mobileRootDir,
    "node_modules",
    "react-native-reanimated",
    "android",
  );
  const reanimatedCxxRoot = path.join(reanimatedAndroidRoot, ".cxx", "Debug");
  if (!fs.existsSync(reanimatedCxxRoot)) return 0;

  let regeneratedCount = 0;
  const buildNinjaPaths = collectDirectories(reanimatedCxxRoot)
    .map((directory) => path.join(directory, "build.ninja"))
    .filter((candidate) => fs.existsSync(candidate));

  for (const buildNinjaPath of buildNinjaPaths) {
    const buildDir = path.dirname(buildNinjaPath);
    if (fs.existsSync(path.join(buildDir, "CMakeFiles", "rules.ninja"))) {
      continue;
    }
    const cmakeExecutable = cmakeExecutableFromCache({ buildDir, env });
    if (!cmakeExecutable || !fs.existsSync(cmakeExecutable)) continue;
    const regenerate = spawn(
      cmakeExecutable,
      [
        "--regenerate-during-build",
        "-S",
        reanimatedAndroidRoot,
        "-B",
        buildDir,
      ],
      {
        cwd: reanimatedAndroidRoot,
        env,
        shell: true,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    if (
      (regenerate.status ?? 1) === 0 &&
      fs.existsSync(path.join(buildDir, "CMakeFiles", "rules.ninja"))
    ) {
      regeneratedCount += 1;
    }
  }

  return regeneratedCount;
};

const repairExpoModulesCoreWindowsCmakeDirectories = ({
  mobileRootDir,
  platform,
}) => {
  if (!isWindows(platform)) return;
  const monorepoRootDir = defaultMonorepoRootDir(mobileRootDir);
  const nodeModulesRoot = path.join(monorepoRootDir, "node_modules");
  const expoModulesRoots = [
    path.join(
      mobileRootDir,
      "node_modules",
      ".pnpm",
      "expo-modules-core@2.5.0",
      "node_modules",
      "expo-modules-core",
      "android",
      ".cxx",
      "Debug",
    ),
    path.join(
      mobileRootDir,
      "node_modules",
      "expo-modules-core",
      "android",
      ".cxx",
      "Debug",
    ),
    path.join(
      nodeModulesRoot,
      ".pnpm",
      "expo-modules-core@2.5.0",
      "node_modules",
      "expo-modules-core",
      "android",
      ".cxx",
      "Debug",
    ),
  ];
  const sourceSegments = toWindowsCmakePathSegments(nodeModulesRoot);

  for (const debugRoot of expoModulesRoots) {
    const cmakeFileDirs = collectDirectories(debugRoot).filter(
      (directory) =>
        directory.endsWith(".dir") &&
        directory.includes(`${path.sep}CMakeFiles${path.sep}`),
    );
    for (const directory of cmakeFileDirs) {
      mkdirSyncLongPath(path.join(directory, ...sourceSegments));
    }
    const buildNinjaPaths = collectDirectories(debugRoot)
      .map((directory) => path.join(directory, "build.ninja"))
      .filter((candidate) => fs.existsSync(candidate));
    for (const buildNinjaPath of buildNinjaPaths) {
      for (const directory of collectCmakeObjectOutputParentDirectories(
        buildNinjaPath,
      )) {
        mkdirSyncLongPath(directory);
      }
    }
  }
};

const normalizeNinjaPath = ({ buildDir, output }) => {
  const normalizedOutput = output
    .replace(/^([A-Za-z])\$:\//u, "$1:/")
    .replace(/\//gu, path.sep);
  return path.isAbsolute(normalizedOutput)
    ? normalizedOutput
    : path.resolve(buildDir, normalizedOutput);
};

const toWindowsNinjaAbsolutePath = (value) =>
  value.replace(/\\/gu, "/").replace(/^([A-Za-z]):\//u, "$1$:/");

export const repairWindowsCmakeExistingInputPhonyEdges = ({
  cmakeRootDir,
  platform = process.platform,
} = {}) => {
  if (!isWindows(platform) || !cmakeRootDir || !fs.existsSync(cmakeRootDir)) {
    return 0;
  }

  let repairedCount = 0;
  const buildNinjaPaths = collectDirectories(cmakeRootDir)
    .map((directory) => path.join(directory, "build.ninja"))
    .filter((candidate) => fs.existsSync(candidate));

  for (const buildNinjaPath of buildNinjaPaths) {
    const buildDir = path.dirname(buildNinjaPath);
    const source = fs.readFileSync(buildNinjaPath, "utf8");
    const nextSource = source.replace(
      /\.\.\/prefab\/[^\s:]+\.cmake/gu,
      (relativeInput) => {
        const absoluteInput = normalizeNinjaPath({
          buildDir,
          output: relativeInput,
        });
        if (!fs.existsSync(absoluteInput)) return relativeInput;
        repairedCount += 1;
        return toWindowsNinjaAbsolutePath(absoluteInput);
      },
    );

    if (nextSource !== source) {
      fs.writeFileSync(buildNinjaPath, nextSource, "utf8");
    }
  }

  return repairedCount;
};

const normalizeForPrefix = (value) =>
  path
    .resolve(value)
    .replace(/[\\/]+$/u, "")
    .toLowerCase();

const toGradlePath = (value) => value.replace(/\\/gu, "/");

const sameRootPathForWindowsAlias = ({
  aliasMonorepoRootDir,
  platform,
  realMonorepoRootDir,
  resolvedPath,
}) => {
  if (!isWindows(platform)) return resolvedPath;
  const normalizedResolved = normalizeForPrefix(resolvedPath);
  const normalizedRealRoot = normalizeForPrefix(realMonorepoRootDir);
  const normalizedAliasRoot = normalizeForPrefix(aliasMonorepoRootDir);
  if (normalizedRealRoot === normalizedAliasRoot) return resolvedPath;
  if (
    normalizedResolved !== normalizedRealRoot &&
    !normalizedResolved.startsWith(`${normalizedRealRoot}${path.sep}`)
  ) {
    return resolvedPath;
  }
  return path.join(
    aliasMonorepoRootDir,
    path.relative(realMonorepoRootDir, resolvedPath),
  );
};

export const buildSameRootExpoCliGradleSource = ({
  canonicalMetroRoot = false,
  mobileRootDir,
  platform = process.platform,
  realMonorepoRootDir,
  resolvedExpoCliPath,
  source,
}) => {
  if (!isWindows(platform)) return source;
  const aliasMonorepoRootDir = defaultMonorepoRootDir(mobileRootDir);
  const sameRootCliPath = canonicalMetroRoot
    ? resolvedExpoCliPath
    : sameRootPathForWindowsAlias({
        aliasMonorepoRootDir,
        platform,
        realMonorepoRootDir,
        resolvedPath: resolvedExpoCliPath,
      });
  if (!canonicalMetroRoot && sameRootCliPath === resolvedExpoCliPath) {
    return source;
  }
  const gradleCliPath = toGradlePath(sameRootCliPath).replace(/"/gu, '\\"');
  return source.replace(
    /^\s*cliFile\s*=\s*new File\(\["node",\s*"--print",\s*"require\.resolve\('@expo\/cli',\s*\{\s*paths:\s*\[require\.resolve\('expo\/package\.json'\)\]\s*\}\)"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\)\)\s*$/mu,
    `    cliFile = new File("${gradleCliPath}")`,
  );
};

const resolveExpoCliPath = ({ mobileRootDir }) => {
  const requireFromMobile = createRequire(
    path.join(mobileRootDir, "package.json"),
  );
  const expoPackagePath = requireFromMobile.resolve("expo/package.json");
  return requireFromMobile.resolve("@expo/cli", {
    paths: [path.dirname(expoPackagePath)],
  });
};

const patchAndroidExpoCliSameRoot = ({
  canonicalMetroRoot = false,
  mobileRootDir,
  platform,
}) => {
  const appBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build.gradle",
  );
  if (!isWindows(platform) || !fs.existsSync(appBuildGradlePath)) {
    return () => undefined;
  }

  const originalSource = fs.readFileSync(appBuildGradlePath, "utf8");
  let resolvedExpoCliPath = "";
  try {
    resolvedExpoCliPath = resolveExpoCliPath({ mobileRootDir });
  } catch {
    return () => undefined;
  }
  const nextSource = buildSameRootExpoCliGradleSource({
    canonicalMetroRoot,
    mobileRootDir,
    platform,
    realMonorepoRootDir: fs.realpathSync.native(
      defaultMonorepoRootDir(mobileRootDir),
    ),
    resolvedExpoCliPath,
    source: originalSource,
  });

  if (nextSource === originalSource) return () => undefined;
  fs.writeFileSync(appBuildGradlePath, nextSource, "utf8");
  return () => {
    fs.writeFileSync(appBuildGradlePath, originalSource, "utf8");
  };
};

export const buildExpoLocalAndroidDebugInvocations = ({
  architecture = "x86_64",
  existsSync = fs.existsSync,
  mobileRootDir = defaultMobileRootDir(),
  output = "build/e2e/android/salary-hijacking-e2e.apk",
  platform = process.platform,
} = {}) => {
  const architectures = normalizeAndroidArchitectures(architecture);
  const architectureList = architectures.join(",");
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
  const stableLocalDebugGradleArgs = [
    "--max-workers=1",
    "--no-parallel",
    `-PreactNativeArchitectures=${architectureList}`,
    "-PnewArchEnabled=false",
    "-Pkotlin.incremental=false",
    "-Pksp.incremental=false",
    "-Pksp.incremental.intermodule=false",
    "-Dkotlin.compiler.execution.strategy=in-process",
  ];
  const expoModulesCoreConfigureExcludes = architectures.flatMap(
    (nextArchitecture) => [
      "-x",
      `:expo-modules-core:configureCMakeDebug[${nextArchitecture}]`,
    ],
  );
  return {
    androidTestArgs: [
      ":app:assembleDebugAndroidTest",
      "--no-daemon",
      ...stableLocalDebugGradleArgs,
      "-x",
      ":app:generateAutolinkingPackageList",
      ...expoModulesCoreConfigureExcludes,
    ],
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
      "--no-daemon",
      ...stableLocalDebugGradleArgs,
      "-x",
      ":app:generateAutolinkingPackageList",
      ...expoModulesCoreConfigureExcludes,
    ],
    gradleCommand,
    outputPath: path.resolve(mobileRootDir, output),
    packageListArgs: [
      ":app:generateAutolinkingPackageList",
      "--no-daemon",
      ...stableLocalDebugGradleArgs,
    ],
    reanimatedConfigureArgSets: architectures.map((nextArchitecture) => [
      `:react-native-reanimated:configureCMakeDebug[${nextArchitecture}]`,
      "--no-daemon",
      `-PreactNativeArchitectures=${architectureList}`,
      "-PnewArchEnabled=false",
    ]),
    prebuildArgs: ["prebuild", "--platform", "android", "--no-install"],
    reanimatedConfigureArgs: [
      `:react-native-reanimated:configureCMakeDebug[${architectures[0]}]`,
      "--no-daemon",
      `-PreactNativeArchitectures=${architectureList}`,
      "-PnewArchEnabled=false",
    ],
    expoModulesCoreConfigureArgSets: architectures.map((nextArchitecture) => [
      `:expo-modules-core:configureCMakeDebug[${nextArchitecture}]`,
      "--no-daemon",
      `-PreactNativeArchitectures=${architectureList}`,
      "-PnewArchEnabled=false",
    ]),
    expoModulesCoreConfigureArgs: [
      `:expo-modules-core:configureCMakeDebug[${architectures[0]}]`,
      "--no-daemon",
      `-PreactNativeArchitectures=${architectureList}`,
      "-PnewArchEnabled=false",
    ],
    testApkPath: path.join(
      mobileRootDir,
      "android",
      "app",
      "build",
      "outputs",
      "apk",
      "androidTest",
      "debug",
      "app-debug-androidTest.apk",
    ),
    testOutputPath: path.resolve(
      mobileRootDir,
      "build/e2e/android/salary-hijacking-e2e-androidTest.apk",
    ),
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
  const toolEnv = withBundledAndroidToolEnv({
    env,
    existsSync,
    mobileRootDir,
    platform,
  });
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
    env: toolEnv,
    existsSync,
    mobileRootDir,
    pathValue: toolEnv.PATH ?? toolEnv.Path ?? pathValue,
    platform,
  });
  if (!javaHome) {
    failures.push(
      "Java is unavailable. Install a JDK, set JAVA_HOME, or install Android Studio with bundled JBR.",
    );
  }

  const sdkRoot = resolveAndroidSdkRoot({
    env: toolEnv,
    existsSync,
    homeDir: androidToolHomeDir,
    platform,
  });
  if (!sdkRoot) failures.push("Android SDK root is unavailable.");

  const androidToolOptions = {
    env: toolEnv,
    existsSync,
    homeDir: androidToolHomeDir,
    pathValue: toolEnv.PATH ?? toolEnv.Path ?? pathValue,
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
        ? buildEnv({
            env: toolEnv,
            javaHome,
            mobileRootDir,
            pathValue,
            platform,
            sdkRoot,
          })
        : { ...toolEnv },
    failures,
    javaHome,
    ok: failures.length === 0,
    sdkRoot,
  };
};

const parseArgs = (argv) => {
  const options = {
    architecture:
      process.env.SALARY_HIJACKING_ANDROID_ARCHITECTURES || "x86_64",
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
    } else if (arg === "--architecture") {
      options.architecture = argv[index + 1] ?? options.architecture;
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

const copyVerifiedAndroidTestApk = ({ testApkPath, testOutputPath }) => {
  if (!hasApkHeader(testApkPath)) {
    throw new Error(
      `Debug Android test APK was not produced or has an invalid APK header: ${testApkPath}`,
    );
  }
  fs.mkdirSync(path.dirname(testOutputPath), { recursive: true });
  fs.copyFileSync(testApkPath, testOutputPath);
};

export const runExpoLocalAndroidDebugBuild = ({
  androidToolHomeDir,
  architecture = "x86_64",
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
    architecture,
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
  ensureLocalMetroEntryFile({ mobileRootDir });
  ensureGradleInputMetroEntryShim({ mobileRootDir });
  ensureAndroidSplashScreenDependency({ mobileRootDir });
  ensureExpoProjectDependency({ mobileRootDir });
  ensureReactNativeDebugBundle({ mobileRootDir });
  cleanReactNativeAutolinkingCache({ mobileRootDir });
  cleanKspCompilerCaches({ mobileRootDir });
  patchAndroidSettingsSameRootNodeResolution({ mobileRootDir });
  patchAndroidDebugEntryFile({
    canonicalMetroRoot:
      preflight.env.SALARY_HIJACKING_METRO_CANONICAL_ROOT === "1",
    mobileRootDir,
  });
  patchAndroidCanonicalBundleTaskOutputs({
    canonicalMetroRoot:
      preflight.env.SALARY_HIJACKING_METRO_CANONICAL_ROOT === "1",
    mobileRootDir,
  });
  ensureDetoxAndroidMavenRepository({ mobileRootDir });
  ensureDetoxAndroidTestConfig({ mobileRootDir });
  ensureDetoxAndroidTestSource({ mobileRootDir });
  ensureSecureStoreBackupXmlResources({ mobileRootDir });
  patchAndroidExpoEntrypoints({ mobileRootDir });
  patchAndroidPostSplashWindowBackground({ mobileRootDir });
  patchAndroidDebugDeveloperSupport({ mobileRootDir });
  ensureAndroidDebugNdkAbiFilters({ architecture, mobileRootDir });
  const canonicalMetroRoot =
    preflight.env.SALARY_HIJACKING_METRO_CANONICAL_ROOT === "1";
  const restoreExpoCliGradlePath = patchAndroidExpoCliSameRoot({
    canonicalMetroRoot,
    mobileRootDir,
    platform,
  });
  const gradleTimeoutMs = parsePositiveIntegerEnv(
    preflight.env[gradleTimeoutEnvKey],
  );
  const buildGradleSpawnOptions = () => {
    const options = {
      cwd: path.join(mobileRootDir, "android"),
      env: preflight.env,
      shell: isWindows(platform),
      stdio: "inherit",
      windowsHide: true,
    };
    if (gradleTimeoutMs > 0) {
      options.timeout = gradleTimeoutMs;
      options.killSignal = "SIGTERM";
    }
    return options;
  };
  const normalizeGradleResult = (args, result) => {
    if (!isSpawnTimeout(result)) return result;
    failures.push(
      `Gradle step timed out after ${gradleTimeoutMs}ms: ${args.join(" ")}`,
    );
    return { ...result, status: gradleTimeoutExitStatus };
  };
  const runGradleInvocation = (args) => {
    const options = buildGradleSpawnOptions();
    let result = normalizeGradleResult(
      args,
      spawn(invocations.gradleCommand, args, options),
    );
    if (result.status === gradleTimeoutExitStatus) return result;
    if ((result.status ?? 1) !== 0 && isWindows(platform)) {
      repairGradleTransformTemporaryWorkspaces({
        gradleUserHome: preflight.env.GRADLE_USER_HOME,
      });
      result = normalizeGradleResult(
        args,
        spawn(invocations.gradleCommand, args, options),
      );
    }
    return result;
  };

  try {
    const packageList = runGradleInvocation(invocations.packageListArgs);
    if ((packageList.status ?? 1) !== 0) {
      return { ...preflight, failures, status: packageList.status ?? 1 };
    }
    patchReactNativePackageList({ env: preflight.env, mobileRootDir });
    cleanAndroidAppCompileCaches({ env: preflight.env, mobileRootDir });

    const shouldRunWindowsCmakeWarmup =
      isWindows(platform) && preflight.env[substAliasDisableEnvKey] !== "1";

    if (shouldRunWindowsCmakeWarmup) {
      for (const reanimatedConfigureArgs of invocations.reanimatedConfigureArgSets) {
        const reanimatedConfigure = runGradleInvocation(
          reanimatedConfigureArgs,
        );
        if ((reanimatedConfigure.status ?? 1) !== 0) {
          return {
            ...preflight,
            failures,
            status: reanimatedConfigure.status ?? 1,
          };
        }
      }

      repairReanimatedWindowsCmakeDirectories({ mobileRootDir, platform });
      regenerateMissingReanimatedWindowsCmakeRules({
        env: preflight.env,
        mobileRootDir,
        platform,
        spawn,
      });

      for (const expoModulesCoreConfigureArgs of invocations.expoModulesCoreConfigureArgSets) {
        let expoModulesCoreConfigure = spawn(
          invocations.gradleCommand,
          expoModulesCoreConfigureArgs,
          buildGradleSpawnOptions(),
        );
        expoModulesCoreConfigure = normalizeGradleResult(
          expoModulesCoreConfigureArgs,
          expoModulesCoreConfigure,
        );
        if (
          expoModulesCoreConfigure.status !== gradleTimeoutExitStatus &&
          (expoModulesCoreConfigure.status ?? 1) !== 0 &&
          isWindows(platform)
        ) {
          repairExpoModulesCoreWindowsCmakeDirectories({
            mobileRootDir,
            platform,
          });
          expoModulesCoreConfigure = spawn(
            invocations.gradleCommand,
            expoModulesCoreConfigureArgs,
            { ...buildGradleSpawnOptions(), shell: true },
          );
          expoModulesCoreConfigure = normalizeGradleResult(
            expoModulesCoreConfigureArgs,
            expoModulesCoreConfigure,
          );
        }
        if ((expoModulesCoreConfigure.status ?? 1) !== 0) {
          return {
            ...preflight,
            failures,
            status: expoModulesCoreConfigure.status ?? 1,
          };
        }
      }

      repairExpoModulesCoreWindowsCmakeDirectories({ mobileRootDir, platform });
      repairWindowsCmakeExistingInputPhonyEdges({
        cmakeRootDir: expoModulesCoreCmakeDebugRoot(mobileRootDir),
        platform,
      });
    }

    const gradle = runGradleInvocation(invocations.gradleArgs);
    if ((gradle.status ?? 1) !== 0) {
      return { ...preflight, failures, status: gradle.status ?? 1 };
    }

    const androidTest = runGradleInvocation(invocations.androidTestArgs);
    if ((androidTest.status ?? 1) !== 0) {
      return { ...preflight, failures, status: androidTest.status ?? 1 };
    }

    try {
      copyVerifiedApk(invocations);
      copyVerifiedAndroidTestApk(invocations);
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
  } finally {
    restoreExpoCliGradlePath();
  }
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

const isCliEntrypoint = () => {
  if (!process.argv[1] || process.argv[1] === "-") return false;
  try {
    return (
      fs.realpathSync.native(path.resolve(process.argv[1])) ===
      fs.realpathSync.native(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
};

if (isCliEntrypoint()) {
  try {
    const aliasResult = runWithWindowsSubstAliasIfNeeded({
      argv: process.argv.slice(2),
    });
    if (aliasResult) process.exit(aliasResult.status);

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
