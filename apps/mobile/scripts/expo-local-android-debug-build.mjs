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
    EXPO_PUBLIC_E2E_BUILD: "true",
    JAVA_HOME: javaHome,
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

const patchAndroidDebugEntryFile = ({ mobileRootDir }) => {
  const appBuildGradlePath = path.join(
    mobileRootDir,
    "android",
    "app",
    "build.gradle",
  );
  if (!fs.existsSync(appBuildGradlePath)) return;

  const source = fs.readFileSync(appBuildGradlePath, "utf8");
  let nextSource = source.replace(
    /^\s*entryFile\s*=\s*file\((?:"\$\{projectRoot\}\/apps\/mobile\/index\.android\.js"|"\$\{projectRoot\}\/index\.android\.js"|"\$\{projectRoot\}\/\.\.\/\.\.\/index\.android\.js"|"\.\.\/\.\.\/index\.android\.js"|\["node",\s*"-e",\s*"require\('expo\/scripts\/resolveAppEntry'\)",\s*projectRoot,\s*"android",\s*"absolute"\]\.execute\(null,\s*rootDir\)\.text\.trim\(\))\)\s*$/mu,
    '    entryFile = file("${projectRoot}/apps/mobile/index.android.js")',
  );
  nextSource = nextSource.replace(
    /^\s*root\s*=\s*file\((?:"\.\.\/\.\.\/"|"\.\.\/")\)\s*$/mu,
    '    root = file("../../")',
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
  const testSourceDir = path.join(
    mobileRootDir,
    "android",
    "app",
    "src",
    "androidTest",
    "java",
    ...activityPackage.split("."),
  );
  fs.mkdirSync(testSourceDir, { recursive: true });

  const testSourcePath = path.join(testSourceDir, "DetoxTest.java");
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
      )
      .replace(
        /^(\s*)\/\/\s*setTheme\(R\.style\.AppTheme\);\r?$/gmu,
        "$1setTheme(R.style.AppTheme);",
      );
    if (nextSource !== source)
      fs.writeFileSync(mainActivityPath, nextSource, "utf8");
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
  mobileRootDir,
  platform = process.platform,
  realMonorepoRootDir,
  resolvedExpoCliPath,
  source,
}) => {
  if (!isWindows(platform)) return source;
  const aliasMonorepoRootDir = defaultMonorepoRootDir(mobileRootDir);
  const sameRootCliPath = sameRootPathForWindowsAlias({
    aliasMonorepoRootDir,
    platform,
    realMonorepoRootDir,
    resolvedPath: resolvedExpoCliPath,
  });
  if (sameRootCliPath === resolvedExpoCliPath) return source;
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

const patchAndroidExpoCliSameRoot = ({ mobileRootDir, platform }) => {
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
    androidTestArgs: [
      ":app:assembleDebugAndroidTest",
      "--no-daemon",
      "-PreactNativeArchitectures=x86_64",
      "-PnewArchEnabled=false",
      "-x",
      ":app:generateAutolinkingPackageList",
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
      "-PreactNativeArchitectures=x86_64",
      "-PnewArchEnabled=false",
      "-x",
      ":app:generateAutolinkingPackageList",
    ],
    gradleCommand,
    outputPath: path.resolve(mobileRootDir, output),
    packageListArgs: [
      ":app:generateAutolinkingPackageList",
      "--no-daemon",
      "-PreactNativeArchitectures=x86_64",
      "-PnewArchEnabled=false",
    ],
    prebuildArgs: ["prebuild", "--platform", "android", "--no-install"],
    reanimatedConfigureArgs: [
      ":react-native-reanimated:configureCMakeDebug[x86_64]",
      "--no-daemon",
      "-PreactNativeArchitectures=x86_64",
      "-PnewArchEnabled=false",
    ],
    expoModulesCoreConfigureArgs: [
      ":expo-modules-core:configureCMakeDebug[x86_64]",
      "--no-daemon",
      "-PreactNativeArchitectures=x86_64",
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
  ensureLocalMetroEntryFile({ mobileRootDir });
  ensureGradleInputMetroEntryShim({ mobileRootDir });
  ensureAndroidSplashScreenDependency({ mobileRootDir });
  ensureExpoProjectDependency({ mobileRootDir });
  ensureReactNativeDebugBundle({ mobileRootDir });
  patchAndroidDebugEntryFile({ mobileRootDir });
  ensureDetoxAndroidMavenRepository({ mobileRootDir });
  ensureDetoxAndroidTestConfig({ mobileRootDir });
  ensureDetoxAndroidTestSource({ mobileRootDir });
  ensureSecureStoreBackupXmlResources({ mobileRootDir });
  patchAndroidExpoEntrypoints({ mobileRootDir });
  patchAndroidDebugDeveloperSupport({ mobileRootDir });
  const restoreExpoCliGradlePath = patchAndroidExpoCliSameRoot({
    mobileRootDir,
    platform,
  });

  try {
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
      return {
        ...preflight,
        failures,
        status: reanimatedConfigure.status ?? 1,
      };
    }

    repairReanimatedWindowsCmakeDirectories({ mobileRootDir, platform });

    let expoModulesCoreConfigure = spawn(
      invocations.gradleCommand,
      invocations.expoModulesCoreConfigureArgs,
      {
        cwd: path.join(mobileRootDir, "android"),
        env: preflight.env,
        shell: isWindows(platform),
        stdio: "inherit",
        windowsHide: true,
      },
    );
    if ((expoModulesCoreConfigure.status ?? 1) !== 0 && isWindows(platform)) {
      repairExpoModulesCoreWindowsCmakeDirectories({ mobileRootDir, platform });
      expoModulesCoreConfigure = spawn(
        invocations.gradleCommand,
        invocations.expoModulesCoreConfigureArgs,
        {
          cwd: path.join(mobileRootDir, "android"),
          env: preflight.env,
          shell: true,
          stdio: "inherit",
          windowsHide: true,
        },
      );
    }
    if ((expoModulesCoreConfigure.status ?? 1) !== 0) {
      return {
        ...preflight,
        failures,
        status: expoModulesCoreConfigure.status ?? 1,
      };
    }

    repairExpoModulesCoreWindowsCmakeDirectories({ mobileRootDir, platform });

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

    const androidTest = spawn(
      invocations.gradleCommand,
      invocations.androidTestArgs,
      {
        cwd: path.join(mobileRootDir, "android"),
        env: preflight.env,
        shell: isWindows(platform),
        stdio: "inherit",
        windowsHide: true,
      },
    );
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
