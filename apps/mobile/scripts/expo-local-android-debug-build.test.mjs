/* eslint-disable no-template-curly-in-string */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildExpoLocalAndroidDebugInvocations,
  buildSameRootExpoCliGradleSource,
  checkExpoLocalAndroidDebugPrerequisites,
  runExpoLocalAndroidDebugBuild,
} from "./expo-local-android-debug-build.mjs";

const makeWorkspace = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-expo-android-"));

const touch = (filePath, contents = "") => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const existsInside = (rootDir) => (filePath) => {
  const relative = path.relative(rootDir, path.resolve(filePath));
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return fs.existsSync(filePath);
};

const writeMobileFixture = (rootDir) => {
  writeJson(path.join(rootDir, "app.config.ts"), {
    expo: { android: { package: "com.salaryhijacking.mobile" } },
  });
  touch(path.join(rootDir, "node_modules", ".bin", "expo.CMD"));
  writeJson(path.join(rootDir, "node_modules", "detox", "package.json"), {
    version: "20.51.4",
  });
};

test("preflight passes without Expo account auth when Expo CLI, Java, and Android SDK are present", () => {
  const rootDir = makeWorkspace();
  const localAppData = path.join(rootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");
  const javaHome = path.join(
    rootDir,
    "Program Files",
    "Android",
    "Android Studio",
    "jbr",
  );

  writeMobileFixture(rootDir);
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));
  touch(path.join(javaHome, "bin", "java.EXE"));

  const result = checkExpoLocalAndroidDebugPrerequisites({
    androidToolHomeDir: rootDir,
    env: {
      LOCALAPPDATA: localAppData,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
      PROGRAMFILES: path.join(rootDir, "Program Files"),
    },
    existsSync: existsInside(rootDir),
    mobileRootDir: rootDir,
    pathValue: "",
    platform: "win32",
  });

  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.javaHome, javaHome);
  assert.equal(result.env.JAVA_HOME, javaHome);
  assert.equal(result.env.ANDROID_HOME, sdkRoot);
  assert.equal(result.env.ANDROID_SDK_ROOT, sdkRoot);
});

test("preflight fails when the Expo app config is missing", () => {
  const rootDir = makeWorkspace();
  const localAppData = path.join(rootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");
  const javaHome = path.join(
    rootDir,
    "Program Files",
    "Android",
    "Android Studio",
    "jbr",
  );

  touch(path.join(rootDir, "node_modules", ".bin", "expo.CMD"));
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));
  touch(path.join(javaHome, "bin", "java.EXE"));

  const result = checkExpoLocalAndroidDebugPrerequisites({
    androidToolHomeDir: rootDir,
    env: {
      LOCALAPPDATA: localAppData,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
      PROGRAMFILES: path.join(rootDir, "Program Files"),
    },
    existsSync: existsInside(rootDir),
    mobileRootDir: rootDir,
    pathValue: "",
    platform: "win32",
  });

  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /app\.config\.ts/);
});

test("build invocations keep prebuild, Gradle assembleDebug, and Detox APK copy paths", () => {
  const rootDir = makeWorkspace();
  writeMobileFixture(rootDir);
  touch(path.join(rootDir, "android", "gradlew.bat"));

  const invocations = buildExpoLocalAndroidDebugInvocations({
    mobileRootDir: rootDir,
    output: "build/e2e/android/salary-hijacking-e2e.apk",
    platform: "win32",
  });

  assert.equal(
    path.basename(invocations.expoCommand).toLowerCase(),
    "expo.cmd",
  );
  assert.deepEqual(invocations.prebuildArgs, [
    "prebuild",
    "--platform",
    "android",
    "--no-install",
  ]);
  assert.equal(
    path.basename(invocations.gradleCommand).toLowerCase(),
    "gradlew.bat",
  );
  assert.deepEqual(invocations.gradleArgs, [
    "assembleDebug",
    "--no-daemon",
    "-PreactNativeArchitectures=x86_64",
    "-PnewArchEnabled=false",
    "-x",
    ":app:generateAutolinkingPackageList",
  ]);
  assert.deepEqual(invocations.androidTestArgs, [
    ":app:assembleDebugAndroidTest",
    "--no-daemon",
    "-PreactNativeArchitectures=x86_64",
    "-PnewArchEnabled=false",
    "-x",
    ":app:generateAutolinkingPackageList",
  ]);
  assert.deepEqual(invocations.packageListArgs, [
    ":app:generateAutolinkingPackageList",
    "--no-daemon",
    "-PreactNativeArchitectures=x86_64",
    "-PnewArchEnabled=false",
  ]);
  assert.deepEqual(invocations.reanimatedConfigureArgs, [
    ":react-native-reanimated:configureCMakeDebug[x86_64]",
    "--no-daemon",
    "-PreactNativeArchitectures=x86_64",
    "-PnewArchEnabled=false",
  ]);
  assert.deepEqual(invocations.expoModulesCoreConfigureArgs, [
    ":expo-modules-core:configureCMakeDebug[x86_64]",
    "--no-daemon",
    "-PreactNativeArchitectures=x86_64",
    "-PnewArchEnabled=false",
  ]);
  assert.match(
    invocations.debugApkPath,
    /android[\\/]app[\\/]build[\\/]outputs[\\/]apk[\\/]debug[\\/]app-debug\.apk$/,
  );
  assert.match(
    invocations.outputPath,
    /build[\\/]e2e[\\/]android[\\/]salary-hijacking-e2e\.apk$/,
  );
  assert.match(
    invocations.testOutputPath,
    /build[\\/]e2e[\\/]android[\\/]salary-hijacking-e2e-androidTest\.apk$/,
  );
});

test("rewrites Expo CLI Gradle path to the subst drive root on Windows", () => {
  const source = [
    "react {",
    '    cliFile = new File(["node", "--print", "require.resolve(\'@expo/cli\', { paths: [require.resolve(\'expo/package.json\')] })"].execute(null, rootDir).text.trim())',
    "}",
    "",
  ].join("\n");

  const patched = buildSameRootExpoCliGradleSource({
    mobileRootDir: "S:\\apps\\mobile",
    platform: "win32",
    realMonorepoRootDir:
      "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
    resolvedExpoCliPath:
      "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\node_modules\\.pnpm\\@expo+cli@0.24.24\\node_modules\\@expo\\cli\\build\\bin\\cli",
    source,
  });

  assert.match(
    patched,
    /cliFile = new File\("S:\/node_modules\/\.pnpm\/@expo\+cli@0\.24\.24\/node_modules\/@expo\/cli\/build\/bin\/cli"\)/,
  );
  assert.doesNotMatch(patched, /C:\\Users\\Telos_PC_17/);
});

test("keeps Expo CLI Gradle path dynamic when roots already match", () => {
  const source = [
    "react {",
    '    cliFile = new File(["node", "--print", "require.resolve(\'@expo/cli\', { paths: [require.resolve(\'expo/package.json\')] })"].execute(null, rootDir).text.trim())',
    "}",
    "",
  ].join("\n");

  const patched = buildSameRootExpoCliGradleSource({
    mobileRootDir:
      "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\apps\\mobile",
    platform: "win32",
    realMonorepoRootDir:
      "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
    resolvedExpoCliPath:
      "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\node_modules\\.pnpm\\@expo+cli@0.24.24\\node_modules\\@expo\\cli\\build\\bin\\cli",
    source,
  });

  assert.equal(patched, source);
});

test("runner executes prebuild before Gradle and copies a verified APK to the Detox path", () => {
  const rootDir = makeWorkspace();
  const localAppData = path.join(rootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");
  const javaHome = path.join(
    rootDir,
    "Program Files",
    "Android",
    "Android Studio",
    "jbr",
  );
  const calls = [];

  writeMobileFixture(rootDir);
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));
  touch(path.join(javaHome, "bin", "java.EXE"));

  const result = runExpoLocalAndroidDebugBuild({
    androidToolHomeDir: rootDir,
    env: {
      LOCALAPPDATA: localAppData,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
      PROGRAMFILES: path.join(rootDir, "Program Files"),
    },
    existsSync: existsInside(rootDir),
    mobileRootDir: rootDir,
    pathValue: "",
    platform: "win32",
    spawn(command, args, options) {
      calls.push({ command, args, options });
      const commandName = path.basename(String(command)).toLowerCase();
      if (commandName.includes("expo")) {
        touch(path.join(rootDir, "android", "gradlew.bat"));
        touch(
          path.join(rootDir, "android", "build.gradle"),
          [
            "allprojects {",
            "  repositories {",
            "    google()",
            "    mavenCentral()",
            "  }",
            "}",
            "",
          ].join("\n"),
        );
        touch(
          path.join(rootDir, "android", "app", "build.gradle"),
          [
            "react {",
            '    root = file("../../")',
            '    entryFile = file("${projectRoot}/apps/mobile/index.android.js")',
            "}",
            "",
            "android {",
            "    defaultConfig {",
            "    }",
            "}",
            "",
            "dependencies {",
            '    implementation("com.facebook.react:react-android")',
            "}",
            "",
          ].join("\n"),
        );
        touch(
          path.join(
            rootDir,
            "android",
            "app",
            "src",
            "main",
            "java",
            "com",
            "salaryhijacking",
            "mobile",
            "MainActivity.kt",
          ),
          [
            "package com.salaryhijacking.mobile",
            "import expo.modules.splashscreen.SplashScreenManager",
            "class MainActivity {",
            "  fun onCreate() {",
            "    // setTheme(R.style.AppTheme);",
            "    SplashScreenManager.registerOnActivity(this)",
            "  }",
            "}",
            "",
          ].join("\n"),
        );
        touch(
          path.join(
            rootDir,
            "android",
            "app",
            "src",
            "main",
            "java",
            "com",
            "salaryhijacking",
            "mobile",
            "MainApplication.kt",
          ),
          [
            "package com.salaryhijacking.mobile",
            "class MainApplication {",
            '  override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"',
            "  override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG",
            "}",
            "",
          ].join("\n"),
        );
      }
      if (
        commandName.includes("gradlew") &&
        String(args[0]) === ":app:generateAutolinkingPackageList"
      ) {
        touch(
          path.join(
            rootDir,
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
          ),
          [
            "package com.facebook.react;",
            "import expo.core.ExpoModulesPackage;",
            "public class PackageList {",
            "  Object[] packages = new Object[] {",
            "    new ExpoModulesPackage(),",
            "  };",
            "}",
            "",
          ].join("\n"),
        );
      }
      if (
        commandName.includes("gradlew") &&
        String(args[0]).includes("configureCMakeDebug")
      ) {
        touch(
          path.join(
            rootDir,
            "node_modules",
            "react-native-reanimated",
            "android",
            ".cxx",
            "Debug",
            "hash",
            "x86_64",
            "src",
            "main",
            "cpp",
            "worklets",
            "CMakeFiles",
            "worklets.dir",
            "placeholder.txt",
          ),
        );
        touch(
          path.join(
            rootDir,
            "node_modules",
            ".pnpm",
            "expo-modules-core@2.5.0",
            "node_modules",
            "expo-modules-core",
            "android",
            ".cxx",
            "Debug",
            "hash",
            "x86_64",
            "CMakeFiles",
            "expo-modules-core.dir",
            "placeholder.txt",
          ),
        );
        const expoModulesCoreObjectOutput = [
          "CMakeFiles/expo-modules-core.dir",
          ...path
            .resolve(
              rootDir,
              "..",
              "..",
              "node_modules",
              ".pnpm",
              "expo-modules-core@2.5.0",
              "node_modules",
              "expo-modules-core",
              "common",
              "cpp",
              "ObjectDeallocator.cpp.o",
            )
            .replace(/\\/gu, "/")
            .replace(/^([A-Za-z]):\//u, "$1_/")
            .split("/")
            .filter(Boolean),
        ].join("/");
        touch(
          path.join(
            rootDir,
            "node_modules",
            ".pnpm",
            "expo-modules-core@2.5.0",
            "node_modules",
            "expo-modules-core",
            "android",
            ".cxx",
            "Debug",
            "hash",
            "x86_64",
            "build.ninja",
          ),
          [
            `build ${expoModulesCoreObjectOutput}: CXX_COMPILER source.cpp`,
            "",
          ].join("\n"),
        );
      }
      if (
        commandName.includes("gradlew") &&
        String(args[0]) === "assembleDebug"
      ) {
        touch(
          path.join(
            rootDir,
            "android",
            "app",
            "build",
            "outputs",
            "apk",
            "debug",
            "app-debug.apk",
          ),
          "PK\u0003\u0004",
        );
      }
      if (
        commandName.includes("gradlew") &&
        String(args[0]) === ":app:assembleDebugAndroidTest"
      ) {
        touch(
          path.join(
            rootDir,
            "android",
            "app",
            "build",
            "outputs",
            "apk",
            "androidTest",
            "debug",
            "app-debug-androidTest.apk",
          ),
          "PK\u0003\u0004",
        );
      }
      return { status: 0 };
    },
  });

  assert.equal(result.status, 0, result.failures.join("\n"));
  assert.equal(calls.length, 6);
  assert.match(String(calls[0].command).toLowerCase(), /expo/);
  assert.match(String(calls[1].command).toLowerCase(), /gradlew/);
  assert.equal(calls[1].args[0], ":app:generateAutolinkingPackageList");
  assert.match(String(calls[2].command).toLowerCase(), /gradlew/);
  assert.equal(
    calls[2].args[0],
    ":react-native-reanimated:configureCMakeDebug[x86_64]",
  );
  assert.match(String(calls[3].command).toLowerCase(), /gradlew/);
  assert.equal(
    calls[3].args[0],
    ":expo-modules-core:configureCMakeDebug[x86_64]",
  );
  assert.match(String(calls[4].command).toLowerCase(), /gradlew/);
  assert.equal(calls[4].args[0], "assembleDebug");
  assert.equal(calls[4].options.env.ANDROID_HOME, sdkRoot);
  assert.equal(calls[4].options.env.ANDROID_SDK_ROOT, sdkRoot);
  assert.equal(calls[4].options.env.EXPO_PUBLIC_E2E_BUILD, "true");
  assert.match(String(calls[5].command).toLowerCase(), /gradlew/);
  assert.equal(calls[5].args[0], ":app:assembleDebugAndroidTest");
  assert.equal(calls[5].options.env.EXPO_PUBLIC_E2E_BUILD, "true");
  assert.match(
    fs.readFileSync(path.join(rootDir, "android", "local.properties"), "utf8"),
    /sdk\.dir=/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /androidx\.core:core-splashscreen/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /implementation project\(':expo'\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /debuggableVariants = \[\]/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /root = file\("\.\.\/\.\.\/"\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /entryFile = file\("\$\{projectRoot\}\/apps\/mobile\/index\.android\.js"\)/,
  );
  assert.equal(
    fs.readFileSync(path.join(rootDir, "index.android.js"), "utf8"),
    'import "expo-router/entry";\n',
  );
  assert.equal(
    fs.readFileSync(
      path.join(rootDir, "apps", "mobile", "index.android.js"),
      "utf8",
    ),
    'import "../../index.android.js";\n',
  );
  assert.match(
    fs.readFileSync(path.join(rootDir, "android", "build.gradle"), "utf8"),
    /maven \{ url "\$rootDir\/\.\.\/node_modules\/detox\/Detox-android" \}/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /androidTestImplementation\("com\.wix:detox:20\.51\.4"\)/,
  );
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /androidTestImplementation\("com\.wix:detox:\+"\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /androidTestImplementation\("androidx\.test:core:1\.6\.1"\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /androidTestImplementation\("androidx\.test\.ext:junit:1\.2\.1"\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /androidTestImplementation\("androidx\.test:runner:1\.6\.2"\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /androidTestImplementation\("androidx\.test:rules:1\.6\.1"\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /testInstrumentationRunner "androidx\.test\.runner\.AndroidJUnitRunner"/,
  );
  const detoxTestSource = fs.readFileSync(
    path.join(
      rootDir,
      "android",
      "app",
      "src",
      "androidTest",
      "java",
      "com",
      "salaryhijacking",
      "mobile",
      "DetoxTest.java",
    ),
    "utf8",
  );
  assert.match(detoxTestSource, /package com\.salaryhijacking\.mobile;/);
  assert.match(detoxTestSource, /Detox\.runTests\(mActivityRule\);/);
  assert.match(detoxTestSource, /ActivityTestRule<MainActivity>/);
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(
        rootDir,
        "android",
        "app",
        "src",
        "main",
        "java",
        "com",
        "salaryhijacking",
        "mobile",
        "MainActivity.kt",
      ),
      "utf8",
    ),
    /SplashScreenManager/,
  );
  assert.match(
    fs.readFileSync(
      path.join(
        rootDir,
        "android",
        "app",
        "src",
        "main",
        "java",
        "com",
        "salaryhijacking",
        "mobile",
        "MainApplication.kt",
      ),
      "utf8",
    ),
    /override fun getUseDeveloperSupport\(\): Boolean = false/,
  );
  assert.match(
    fs.readFileSync(
      path.join(
        rootDir,
        "android",
        "app",
        "src",
        "main",
        "java",
        "com",
        "salaryhijacking",
        "mobile",
        "MainActivity.kt",
      ),
      "utf8",
    ),
    /setTheme\(R\.style\.AppTheme\);/,
  );
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(
        rootDir,
        "android",
        "app",
        "src",
        "main",
        "java",
        "com",
        "salaryhijacking",
        "mobile",
        "MainActivity.kt",
      ),
      "utf8",
    ),
    /\/\/\s*setTheme\(R\.style\.AppTheme\);/,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        rootDir,
        "android",
        "app",
        "src",
        "main",
        "res",
        "xml",
        "secure_store_backup_rules.xml",
      ),
    ),
    true,
  );
  const packageListSource = fs.readFileSync(
    path.join(
      rootDir,
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
    ),
    "utf8",
  );
  assert.doesNotMatch(packageListSource, /expo\.core/);
  assert.match(packageListSource, /import expo\.modules\.ExpoModulesPackage;/);
  assert.match(packageListSource, /new ExpoModulesPackage\(\),/);
  assert.equal(
    fs.existsSync(
      path.join(
        rootDir,
        "node_modules",
        "react-native-reanimated",
        "android",
        ".cxx",
        "Debug",
        "hash",
        "x86_64",
        "src",
        "main",
        "cpp",
        "worklets",
        "CMakeFiles",
        "worklets.dir",
        ...path
          .resolve(rootDir, "node_modules")
          .replace(/\\/gu, "/")
          .replace(/^([A-Za-z]):\//u, "$1_/")
          .split("/")
          .filter(Boolean),
      ),
    ),
    true,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        rootDir,
        "node_modules",
        ".pnpm",
        "expo-modules-core@2.5.0",
        "node_modules",
        "expo-modules-core",
        "android",
        ".cxx",
        "Debug",
        "hash",
        "x86_64",
        "CMakeFiles",
        "expo-modules-core.dir",
        ...path
          .resolve(
            rootDir,
            "..",
            "..",
            "node_modules",
            ".pnpm",
            "expo-modules-core@2.5.0",
            "node_modules",
            "expo-modules-core",
            "common",
            "cpp",
          )
          .replace(/\\/gu, "/")
          .replace(/^([A-Za-z]):\//u, "$1_/")
          .split("/")
          .filter(Boolean),
      ),
    ),
    true,
  );
  assert.equal(
    fs.readFileSync(
      path.join(rootDir, "build", "e2e", "android", "salary-hijacking-e2e.apk"),
      "utf8",
    ),
    "PK\u0003\u0004",
  );
  assert.equal(
    fs.readFileSync(
      path.join(
        rootDir,
        "build",
        "e2e",
        "android",
        "salary-hijacking-e2e-androidTest.apk",
      ),
      "utf8",
    ),
    "PK\u0003\u0004",
  );
});

test("runner repairs and retries Expo modules core CMake configure once on Windows", () => {
  const rootDir = makeWorkspace();
  const localAppData = path.join(rootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");
  const javaHome = path.join(
    rootDir,
    "Program Files",
    "Android",
    "Android Studio",
    "jbr",
  );
  const calls = [];
  let expoModulesCoreConfigureAttempts = 0;

  writeMobileFixture(rootDir);
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));
  touch(path.join(javaHome, "bin", "java.EXE"));

  const result = runExpoLocalAndroidDebugBuild({
    androidToolHomeDir: rootDir,
    env: {
      LOCALAPPDATA: localAppData,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
      PROGRAMFILES: path.join(rootDir, "Program Files"),
    },
    existsSync: existsInside(rootDir),
    mobileRootDir: rootDir,
    pathValue: "",
    platform: "win32",
    spawn(command, args) {
      calls.push({ command, args });
      const commandName = path.basename(String(command)).toLowerCase();
      if (commandName.includes("expo")) {
        touch(path.join(rootDir, "android", "gradlew.bat"));
        touch(
          path.join(rootDir, "android", "build.gradle"),
          "allprojects {}\n",
        );
        touch(
          path.join(rootDir, "android", "app", "build.gradle"),
          "android { defaultConfig {} }\ndependencies {}\n",
        );
        touch(
          path.join(
            rootDir,
            "android",
            "app",
            "src",
            "main",
            "java",
            "com",
            "salaryhijacking",
            "mobile",
            "MainActivity.kt",
          ),
          "package com.salaryhijacking.mobile\nclass MainActivity {}\n",
        );
        return { status: 0 };
      }

      if (
        commandName.includes("gradlew") &&
        String(args[0]) === ":app:generateAutolinkingPackageList"
      ) {
        touch(
          path.join(
            rootDir,
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
          ),
          "package com.facebook.react;\n",
        );
        return { status: 0 };
      }

      if (
        commandName.includes("gradlew") &&
        String(args[0]) ===
          ":react-native-reanimated:configureCMakeDebug[x86_64]"
      ) {
        touch(
          path.join(
            rootDir,
            "node_modules",
            "react-native-reanimated",
            "android",
            ".cxx",
            "Debug",
            "hash",
            "x86_64",
            "src",
            "main",
            "cpp",
            "worklets",
            "CMakeFiles",
            "worklets.dir",
            "placeholder.txt",
          ),
        );
        return { status: 0 };
      }

      if (
        commandName.includes("gradlew") &&
        String(args[0]) === ":expo-modules-core:configureCMakeDebug[x86_64]"
      ) {
        expoModulesCoreConfigureAttempts += 1;
        const expoModulesCoreObjectOutput = [
          "CMakeFiles/expo-modules-core.dir",
          ...path
            .resolve(
              rootDir,
              "..",
              "..",
              "node_modules",
              ".pnpm",
              "expo-modules-core@2.5.0",
              "node_modules",
              "expo-modules-core",
              "common",
              "cpp",
              "ObjectDeallocator.cpp.o",
            )
            .replace(/\\/gu, "/")
            .replace(/^([A-Za-z]):\//u, "$1_/")
            .split("/")
            .filter(Boolean),
        ].join("/");
        touch(
          path.join(
            rootDir,
            "..",
            "..",
            "node_modules",
            ".pnpm",
            "expo-modules-core@2.5.0",
            "node_modules",
            "expo-modules-core",
            "android",
            ".cxx",
            "Debug",
            "hash",
            "x86_64",
            "CMakeFiles",
            "expo-modules-core.dir",
            "placeholder.txt",
          ),
        );
        touch(
          path.join(
            rootDir,
            "..",
            "..",
            "node_modules",
            ".pnpm",
            "expo-modules-core@2.5.0",
            "node_modules",
            "expo-modules-core",
            "android",
            ".cxx",
            "Debug",
            "hash",
            "x86_64",
            "build.ninja",
          ),
          [
            `build ${expoModulesCoreObjectOutput}: CXX_COMPILER source.cpp`,
            "",
          ].join("\n"),
        );
        return { status: expoModulesCoreConfigureAttempts === 1 ? 1 : 0 };
      }

      if (
        commandName.includes("gradlew") &&
        String(args[0]) === "assembleDebug"
      ) {
        touch(
          path.join(
            rootDir,
            "android",
            "app",
            "build",
            "outputs",
            "apk",
            "debug",
            "app-debug.apk",
          ),
          "PK\u0003\u0004",
        );
        return { status: 0 };
      }

      if (
        commandName.includes("gradlew") &&
        String(args[0]) === ":app:assembleDebugAndroidTest"
      ) {
        touch(
          path.join(
            rootDir,
            "android",
            "app",
            "build",
            "outputs",
            "apk",
            "androidTest",
            "debug",
            "app-debug-androidTest.apk",
          ),
          "PK\u0003\u0004",
        );
        return { status: 0 };
      }

      return { status: 0 };
    },
  });

  assert.equal(result.status, 0, result.failures.join("\n"));
  assert.equal(expoModulesCoreConfigureAttempts, 2);
  assert.equal(
    calls.filter(
      (call) =>
        String(call.args[0]) ===
        ":expo-modules-core:configureCMakeDebug[x86_64]",
    ).length,
    2,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        rootDir,
        "..",
        "..",
        "node_modules",
        ".pnpm",
        "expo-modules-core@2.5.0",
        "node_modules",
        "expo-modules-core",
        "android",
        ".cxx",
        "Debug",
        "hash",
        "x86_64",
        "CMakeFiles",
        "expo-modules-core.dir",
        ...path
          .resolve(rootDir, "..", "..", "node_modules")
          .replace(/\\/gu, "/")
          .replace(/^([A-Za-z]):\//u, "$1_/")
          .split("/")
          .filter(Boolean),
      ),
    ),
    true,
  );
});
