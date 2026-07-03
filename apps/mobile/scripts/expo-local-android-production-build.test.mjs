import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildExpoLocalAndroidProductionInvocations,
  checkExpoLocalAndroidProductionPrerequisites,
  runExpoLocalAndroidProductionBuild,
} from "./expo-local-android-production-build.mjs";

const makeWorkspace = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-expo-android-aab-"));

const touch = (filePath, contents = "") => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
};

const writeMobileFixture = (rootDir) => {
  touch(path.join(rootDir, "app.config.ts"), "export default {};\n");
  touch(path.join(rootDir, "node_modules", ".bin", "expo.CMD"));
};

const existsInside = (rootDir) => (filePath) => {
  const relative = path.relative(rootDir, path.resolve(filePath));
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return fs.existsSync(filePath);
};

test("production AAB preflight passes without Expo account auth when local build tools exist", () => {
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
  touch(path.join(sdkRoot, "platforms", "android-35", "android.jar"));
  touch(path.join(javaHome, "bin", "java.EXE"));

  const result = checkExpoLocalAndroidProductionPrerequisites({
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
  assert.equal(result.sdkRoot, sdkRoot);
  assert.equal(result.env.JAVA_HOME, javaHome);
  assert.equal(result.env.ANDROID_HOME, sdkRoot);
  assert.equal(result.env.ANDROID_SDK_ROOT, sdkRoot);
});

test("production AAB invocations use Expo prebuild and Gradle bundleRelease", () => {
  const rootDir = makeWorkspace();
  writeMobileFixture(rootDir);
  touch(path.join(rootDir, "android", "gradlew.bat"));

  const invocations = buildExpoLocalAndroidProductionInvocations({
    mobileRootDir: rootDir,
    output: "build/release/android/salary-hijacking-production.aab",
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
    "bundleRelease",
    "-PreactNativeArchitectures=arm64-v8a",
    "-PnewArchEnabled=false",
    "-x",
    ":app:generateAutolinkingPackageList",
  ]);
  assert.deepEqual(invocations.packageListArgs, [
    ":app:generateAutolinkingPackageList",
    "-PreactNativeArchitectures=arm64-v8a",
    "-PnewArchEnabled=false",
  ]);
  assert.match(
    invocations.releaseAabPath,
    /android[\\/]app[\\/]build[\\/]outputs[\\/]bundle[\\/]release[\\/]app-release\.aab$/,
  );
  assert.match(
    invocations.outputPath,
    /build[\\/]release[\\/]android[\\/]salary-hijacking-production\.aab$/,
  );
});

test("production AAB runner copies only a verified AAB archive to the release path", () => {
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
  touch(path.join(sdkRoot, "platforms", "android-35", "android.jar"));
  touch(path.join(javaHome, "bin", "java.EXE"));

  const result = runExpoLocalAndroidProductionBuild({
    androidToolHomeDir: rootDir,
    env: {
      LOCALAPPDATA: localAppData,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
      PROGRAMFILES: path.join(rootDir, "Program Files"),
    },
    existsSync: existsInside(rootDir),
    mobileRootDir: rootDir,
    monorepoRootDir: rootDir,
    pathValue: "",
    platform: "win32",
    spawn(command, args, options) {
      calls.push({ command, args, options });
      const commandName = path.basename(String(command)).toLowerCase();
      if (commandName.includes("expo")) {
        touch(path.join(rootDir, "android", "gradlew.bat"));
        touch(
          path.join(rootDir, "android", "app", "build.gradle"),
          `react {\n    entryFile = file(["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"].execute(null, rootDir).text.trim())\n}\n`,
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
        String(args[0]) === "bundleRelease"
      ) {
        touch(
          path.join(
            rootDir,
            "android",
            "app",
            "build",
            "outputs",
            "bundle",
            "release",
            "app-release.aab",
          ),
          "PK\u0003\u0004",
        );
      }
      return { status: 0 };
    },
  });

  assert.equal(result.status, 0, result.failures.join("\n"));
  assert.equal(calls.length, 3);
  assert.match(String(calls[0].command).toLowerCase(), /expo/);
  assert.match(String(calls[1].command).toLowerCase(), /gradlew/);
  assert.equal(calls[1].args[0], ":app:generateAutolinkingPackageList");
  assert.match(String(calls[2].command).toLowerCase(), /gradlew/);
  assert.equal(calls[2].args[0], "bundleRelease");
  assert.equal(calls[2].options.env.ANDROID_HOME, sdkRoot);
  assert.equal(calls[2].options.env.ANDROID_SDK_ROOT, sdkRoot);
  assert.match(
    fs.readFileSync(path.join(rootDir, "index.android.js"), "utf8"),
    /expo-router\/entry/u,
  );
  assert.match(
    fs.readFileSync(path.join(rootDir, "index.android.js"), "utf8"),
    /expo-router\/entry/u,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /entryFile = file\("\$\{projectRoot\}\/apps\/mobile\/index\.android\.js"\)/u,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /root = file\("\.\.\/\.\.\/"\)/u,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "apps", "mobile", "index.android.js"),
      "utf8",
    ),
    /\.\.\/\.\.\/index\.android\.js/u,
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
  assert.doesNotMatch(packageListSource, /expo\.core/u);
  assert.match(packageListSource, /import expo\.modules\.ExpoModulesPackage;/u);
  assert.match(packageListSource, /new ExpoModulesPackage\(\),/u);
  assert.equal(
    fs.readFileSync(
      path.join(
        rootDir,
        "build",
        "release",
        "android",
        "salary-hijacking-production.aab",
      ),
      "utf8",
    ),
    "PK\u0003\u0004",
  );
});
