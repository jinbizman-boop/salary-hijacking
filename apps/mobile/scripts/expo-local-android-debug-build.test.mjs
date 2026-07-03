import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildExpoLocalAndroidDebugInvocations,
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
    "-PreactNativeArchitectures=x86_64",
    "-PnewArchEnabled=false",
    "-x",
    ":app:generateAutolinkingPackageList",
  ]);
  assert.deepEqual(invocations.packageListArgs, [
    ":app:generateAutolinkingPackageList",
    "-PreactNativeArchitectures=x86_64",
    "-PnewArchEnabled=false",
  ]);
  assert.deepEqual(invocations.reanimatedConfigureArgs, [
    ":react-native-reanimated:configureCMakeDebug[x86_64]",
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
          path.join(rootDir, "android", "app", "build.gradle"),
          'dependencies {\n    implementation("com.facebook.react:react-android")\n}\n',
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
            "    SplashScreenManager.registerOnActivity(this)",
            "  }",
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
      return { status: 0 };
    },
  });

  assert.equal(result.status, 0, result.failures.join("\n"));
  assert.equal(calls.length, 4);
  assert.match(String(calls[0].command).toLowerCase(), /expo/);
  assert.match(String(calls[1].command).toLowerCase(), /gradlew/);
  assert.equal(calls[1].args[0], ":app:generateAutolinkingPackageList");
  assert.match(String(calls[2].command).toLowerCase(), /gradlew/);
  assert.match(String(calls[2].args[0]), /configureCMakeDebug/);
  assert.match(String(calls[3].command).toLowerCase(), /gradlew/);
  assert.equal(calls[3].options.env.ANDROID_HOME, sdkRoot);
  assert.equal(calls[3].options.env.ANDROID_SDK_ROOT, sdkRoot);
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
  assert.doesNotMatch(packageListSource, /ExpoModulesPackage/);
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
    fs.readFileSync(
      path.join(rootDir, "build", "e2e", "android", "salary-hijacking-e2e.apk"),
      "utf8",
    ),
    "PK\u0003\u0004",
  );
});
