/* eslint-disable no-template-curly-in-string */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildGradleNodeExecutableSource,
  buildExpoLocalAndroidDebugInvocations,
  buildSameRootExpoCliGradleSource,
  buildWindowsSubstAliasPlan,
  checkExpoLocalAndroidDebugPrerequisites,
  cleanupStaleWindowsSubstAliases,
  ensureAndroidDebugNdkAbiFilters,
  expoModulesCoreCmakeDebugRoot,
  parseWindowsSubstMappings,
  patchAndroidRootJavaCompileSafeClasspath,
  patchExpoModulesCoreJavaCompileKotlinClasspath,
  repairGradleTransformTemporaryWorkspaces,
  regenerateMissingReanimatedWindowsCmakeRules,
  repairReanimatedWindowsCmakeDirectories,
  repairWindowsCmakeExistingInputPhonyEdges,
  runExpoLocalAndroidDebugBuild,
} from "./expo-local-android-debug-build.mjs";

const makeWorkspace = () => {
  const tmpRoot = path.join(process.cwd(), ".tmp", "native-build-tests");
  fs.mkdirSync(tmpRoot, { recursive: true });
  return fs.mkdtempSync(path.join(tmpRoot, "salary-expo-android-"));
};

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
  assert.equal(result.env.SALARY_HIJACKING_METRO_CANONICAL_ROOT, "1");
});

test("preflight discovers bundled monorepo .tools JDK and Android SDK", () => {
  const rootDir = makeWorkspace();
  const mobileRootDir = path.join(rootDir, "apps", "mobile");
  const javaHome = path.join(rootDir, ".tools", "jdk-17");
  const sdkRoot = path.join(rootDir, ".tools", "android-sdk");

  writeMobileFixture(mobileRootDir);
  touch(path.join(javaHome, "bin", "java.EXE"));
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));

  const result = checkExpoLocalAndroidDebugPrerequisites({
    env: {
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
    },
    existsSync: existsInside(rootDir),
    mobileRootDir,
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

test("preflight pins a workspace Node executable for Gradle subprocesses", () => {
  const rootDir = makeWorkspace();
  const nodeBinDir = path.join(rootDir, ".tmp", "native-build-bin");
  const localAppData = path.join(rootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");
  const javaHome = path.join(
    rootDir,
    "Program Files",
    "Android",
    "Android Studio",
    "jbr",
  );
  const nodePath = path.join(nodeBinDir, "node.EXE");

  writeMobileFixture(rootDir);
  touch(nodePath);
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
    pathValue: nodeBinDir,
    platform: "win32",
  });

  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.env.SALARY_HIJACKING_NODE_EXECUTABLE, nodePath);
  assert.equal(result.env.LOCALAPPDATA, path.join(rootDir, ".localappdata"));
  assert.equal(
    result.env.KOTLIN_USER_HOME,
    path.join(rootDir, ".gradle-local-debug", "kotlin"),
  );
  assert.equal(
    result.env.SALARY_HIJACKING_ANDROID_KOTLIN_CLASSPATH_DIR,
    path.join(
      rootDir,
      ".gradle-local-debug",
      "salary-hijacking-kotlin-classpath",
    ),
  );
  assert.equal(
    result.env.SALARY_HIJACKING_ANDROID_SAFE_CLASSPATH_DIR,
    path.join(
      rootDir,
      ".gradle-local-debug",
      "salary-hijacking-safe-classpath",
    ),
  );
});

test("preflight creates a Windows npm shim when Expo prebuild cannot find npm", () => {
  const rootDir = makeWorkspace();
  const binDir = path.join(rootDir, "bin");
  const localAppData = path.join(rootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");
  const javaHome = path.join(
    rootDir,
    "Program Files",
    "Android",
    "Android Studio",
    "jbr",
  );
  const pnpmExecPath = path.join(rootDir, ".tmp", "pnpm.cjs");

  writeMobileFixture(rootDir);
  touch(path.join(binDir, "node.EXE"));
  touch(pnpmExecPath);
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));
  touch(path.join(javaHome, "bin", "java.EXE"));

  const result = checkExpoLocalAndroidDebugPrerequisites({
    androidToolHomeDir: rootDir,
    env: {
      LOCALAPPDATA: localAppData,
      npm_execpath: pnpmExecPath,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
      PROGRAMFILES: path.join(rootDir, "Program Files"),
    },
    existsSync: existsInside(rootDir),
    mobileRootDir: rootDir,
    pathValue: binDir,
    platform: "win32",
  });

  assert.equal(result.ok, true, result.failures.join("\n"));
  const shimPath = path.join(rootDir, ".local-native-bin", "npm.cmd");
  const shimScriptPath = path.join(
    rootDir,
    ".local-native-bin",
    "npm-shim.cjs",
  );
  assert.equal(fs.existsSync(shimPath), true);
  assert.equal(fs.existsSync(shimScriptPath), true);
  assert.match(fs.readFileSync(shimPath, "utf8"), /npm-shim\.cjs/u);
  assert.match(fs.readFileSync(shimScriptPath, "utf8"), /npm view dist/u);
  assert.equal(
    (result.env.Path ?? result.env.PATH).split(path.delimiter)[0],
    path.dirname(shimPath),
  );
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

test("plans a short subst build root for long Windows workspace paths", () => {
  const mobileRootDir =
    "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform\\apps\\mobile";

  const plan = buildWindowsSubstAliasPlan({
    env: {},
    existsSync(candidate) {
      return candidate !== "Z:\\";
    },
    mobileRootDir,
    platform: "win32",
    preferredDriveLetters: ["Z"],
    rootLengthThreshold: 10,
  });

  assert.deepEqual(plan, {
    aliasMobileRootDir: "Z:\\apps\\mobile",
    aliasRootDir: "Z:\\",
    aliasScriptPath:
      "Z:\\apps\\mobile\\scripts\\expo-local-android-debug-build.mjs",
    drive: "Z",
    targetRootDir: "C:\\Users\\Telos_PC_17\\Desktop\\salary-hijacking-platform",
  });
});

test("cleans only stale subst aliases that point at the Salary Hijacking workspace", () => {
  const mobileRootDir =
    "C:\\Users\\PC\\Desktop\\salary-hijacking-platform\\apps\\mobile";
  const calls = [];

  const removed = cleanupStaleWindowsSubstAliases({
    mobileRootDir,
    platform: "win32",
    preferredDriveLetters: ["Z", "Y", "X"],
    spawn(command, args) {
      calls.push({ args, command });
      if (args.length === 0) {
        return {
          status: 0,
          stdout: [
            "Z:\\: => C:\\Users\\PC\\Desktop\\salary-hijacking-platform",
            "Y:\\: => D:\\unrelated-workspace",
            "X:\\: => C:\\Users\\PC\\Desktop\\salary-hijacking-platform\\",
          ].join("\r\n"),
        };
      }
      return { status: 0, stdout: "" };
    },
  });

  assert.deepEqual(removed, ["Z", "X"]);
  assert.deepEqual(
    calls.map((call) => call.args).filter((args) => args.length > 0),
    [
      ["Z:", "/D"],
      ["X:", "/D"],
    ],
  );
});

test("runner keeps repairing repeated Gradle temporary workspace failures on Windows", () => {
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
  const transformHashes = [
    "b3db7a06956f2bccac6b9f3f98ca8237",
    "12ac58ebd481dcbd7474580e70f1bb56",
  ];
  const staleExpoModulesCoreRJar = path.join(
    rootDir,
    "node_modules",
    ".pnpm",
    "expo-modules-core@2.5.0",
    "node_modules",
    "expo-modules-core",
    "android",
    "build",
    "intermediates",
    "compile_r_class_jar",
    "debug",
    "generateDebugRFile",
    "R.jar",
  );
  const expoModulesCoreKotlinClass = path.join(
    rootDir,
    "node_modules",
    ".pnpm",
    "expo-modules-core@2.5.0",
    "node_modules",
    "expo-modules-core",
    "android",
    "build",
    "tmp",
    "kotlin-classes",
    "debug",
    "expo",
    "modules",
    "kotlin",
    "AppContext.class",
  );
  let assembleDebugAttempts = 0;

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
        String(args[0]) === "assembleDebug"
      ) {
        assembleDebugAttempts += 1;
        if (
          assembleDebugAttempts > 1 &&
          fs.existsSync(staleExpoModulesCoreRJar)
        )
          return { status: 1 };
        if (assembleDebugAttempts <= transformHashes.length) {
          const hash = transformHashes[assembleDebugAttempts - 1];
          if (assembleDebugAttempts === 1) {
            touch(staleExpoModulesCoreRJar, "stale");
            touch(expoModulesCoreKotlinClass, "compiled");
          }
          touch(
            path.join(
              rootDir,
              ".gradle-local-debug",
              "caches",
              "8.13",
              "transforms",
              `${hash}-42178b6f-79f7-4264-b3f9-3df7f4c1a571`,
              "metadata.bin",
            ),
            "temp",
          );
          return { status: 1 };
        }
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
  assert.equal(assembleDebugAttempts, 3);
  assert.equal(fs.existsSync(staleExpoModulesCoreRJar), false);
  assert.equal(fs.existsSync(expoModulesCoreKotlinClass), true);
});

test("patches expo-modules-core JavaCompile to include Kotlin outputs", () => {
  const rootDir = makeWorkspace();
  const buildGradlePath = path.join(
    rootDir,
    "node_modules",
    ".pnpm",
    "expo-modules-core@2.5.0",
    "node_modules",
    "expo-modules-core",
    "android",
    "build.gradle",
  );
  touch(
    buildGradlePath,
    [
      "apply plugin: 'com.android.library'",
      "apply plugin: 'expo-module-gradle-plugin'",
    ].join("\n"),
  );

  assert.equal(
    patchExpoModulesCoreJavaCompileKotlinClasspath({ mobileRootDir: rootDir }),
    1,
  );
  assert.equal(
    patchExpoModulesCoreJavaCompileKotlinClasspath({ mobileRootDir: rootDir }),
    0,
  );

  const patched = fs.readFileSync(buildGradlePath, "utf8");
  assert.match(patched, /salaryHijackingJavaCompileKotlinClasspathPatch/u);
  assert.match(patched, /tasks\.withType\(JavaCompile\)/u);
  assert.match(patched, /kotlinTask\.destinationDirectory\.get\(\)\.asFile/u);
  assert.match(patched, /tmp\/kotlin-classes\/\$\{variantOutputName\}/u);
  assert.match(
    patched,
    /ant\.jar\(destfile: salaryHijackingKotlinClasspathJar\)/u,
  );
  assert.match(patched, /SALARY_HIJACKING_ANDROID_KOTLIN_CLASSPATH_DIR/u);
  assert.match(patched, /compile_r_class_jar/u);
  assert.match(patched, /'-classpath'/u);
  assert.match(patched, /javaTask\.doFirst/u);
  assert.match(patched, /javaTask\.dependsOn\(kotlinTask\)/u);
});

test("patches Android root JavaCompile to copy node_modules generated jars to a safe classpath cache", () => {
  const rootDir = makeWorkspace();
  const buildGradlePath = path.join(rootDir, "android", "build.gradle");
  touch(
    buildGradlePath,
    [
      "buildscript {",
      "  repositories { google() }",
      "}",
      "allprojects { repositories { google() } }",
    ].join("\n"),
  );

  assert.equal(
    patchAndroidRootJavaCompileSafeClasspath({ mobileRootDir: rootDir }),
    true,
  );
  assert.equal(
    patchAndroidRootJavaCompileSafeClasspath({ mobileRootDir: rootDir }),
    false,
  );

  const patched = fs.readFileSync(buildGradlePath, "utf8");
  assert.match(patched, /salaryHijackingJavaCompileSafeClasspathPatch/u);
  assert.match(patched, /tasks\.withType\(JavaCompile\)\.configureEach/u);
  assert.doesNotMatch(patched, /afterEvaluate/u);
  assert.match(patched, /SALARY_HIJACKING_ANDROID_SAFE_CLASSPATH_DIR/u);
  assert.match(patched, /compile_library_classes_jar/u);
  assert.match(patched, /StandardCopyOption\.REPLACE_EXISTING/u);
  assert.match(
    patched,
    /javaTask\.classpath = files\(salaryHijackingSafeClasspathFiles\)/u,
  );
  assert.match(patched, /'-classpath'/u);
});

test("parses Windows subst mappings without treating unrelated drives as project aliases", () => {
  const mappings = parseWindowsSubstMappings(
    [
      "Z:\\: => C:\\Users\\PC\\Desktop\\salary-hijacking-platform",
      "Y:\\: => D:\\unrelated-workspace",
      "",
    ].join("\r\n"),
  );

  assert.deepEqual(
    [...mappings.entries()],
    [
      ["Z", "C:\\Users\\PC\\Desktop\\salary-hijacking-platform"],
      ["Y", "D:\\unrelated-workspace"],
    ],
  );
});

test("repairs Gradle transform temporary workspaces before retrying Windows builds", () => {
  const rootDir = makeWorkspace();
  const transformsRoot = path.join(
    rootDir,
    ".gradle-local-debug",
    "caches",
    "8.13",
    "transforms",
  );
  const missingTargetHash = "12ac58ebd481dcbd7474580e70f1bb56";
  const existingTargetHash = "7ff2914485e9d0f88f0062d7e12ea5b5";
  const missingTargetTemp = `${missingTargetHash}-49def955-f0fa-4e7f-a3f0-70391d888fa6`;
  const existingTargetTemp = `${existingTargetHash}-abe2af0e-a1d6-489d-a3e2-39102e18510b`;

  touch(
    path.join(transformsRoot, missingTargetTemp, "transformed", "module.json"),
    "{}",
  );
  touch(
    path.join(transformsRoot, existingTargetHash, "transformed", "module.json"),
    "{}",
  );
  touch(
    path.join(transformsRoot, existingTargetTemp, "transformed", "module.json"),
    "{}",
  );

  const result = repairGradleTransformTemporaryWorkspaces({
    gradleUserHome: path.join(rootDir, ".gradle-local-debug"),
  });

  assert.equal(result.moved, 1);
  assert.equal(result.removed, 1);
  assert.equal(
    fs.existsSync(path.join(transformsRoot, missingTargetHash)),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(transformsRoot, missingTargetTemp)),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(transformsRoot, existingTargetHash)),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(transformsRoot, existingTargetTemp)),
    false,
  );
});

test("repairs Gradle Kotlin DSL accessor temporary workspaces before retrying Windows builds", () => {
  const rootDir = makeWorkspace();
  const accessorsRoot = path.join(
    rootDir,
    ".gradle-local-debug",
    "caches",
    "8.13",
    "kotlin-dsl",
    "accessors",
  );
  const missingTargetHash = "6c030dd5654f008ca14835947e0c9f35";
  const existingTargetHash = "9c030dd5654f008ca14835947e0c9f35";
  const missingTargetTemp = `${missingTargetHash}-8d0c34b6-df90-4fe3-8166-bb6fd8f0dcae`;
  const existingTargetTemp = `${existingTargetHash}-f40bbebd-763c-453e-84ab-c0f85fd8db8c`;

  touch(path.join(accessorsRoot, missingTargetTemp, "metadata.bin"), "temp");
  touch(path.join(accessorsRoot, existingTargetHash, "metadata.bin"), "ok");
  touch(path.join(accessorsRoot, existingTargetTemp, "metadata.bin"), "dupe");

  const result = repairGradleTransformTemporaryWorkspaces({
    gradleUserHome: path.join(rootDir, ".gradle-local-debug"),
  });

  assert.equal(result.moved, 1);
  assert.equal(result.removed, 1);
  assert.equal(
    fs.existsSync(path.join(accessorsRoot, missingTargetHash)),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(accessorsRoot, missingTargetTemp)),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(accessorsRoot, existingTargetHash)),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(accessorsRoot, existingTargetTemp)),
    false,
  );
});

test("repairs Windows CMake prefab paths when referenced inputs already exist", () => {
  const rootDir = makeWorkspace();
  const cmakeRootDir = path.join(rootDir, ".cxx", "Debug");
  const buildDir = path.join(cmakeRootDir, "hash", "arm64-v8a");
  const relativeInputs = [
    "../../../../CMakeLists.txt",
    "../prefab/arm64-v8a/prefab/lib/aarch64-linux-android/cmake/ReactAndroid/ReactAndroidConfig.cmake",
    "../prefab/arm64-v8a/prefab/lib/aarch64-linux-android/cmake/ReactAndroid/ReactAndroidConfigVersion.cmake",
  ];
  for (const relativeInput of relativeInputs) {
    touch(path.resolve(buildDir, relativeInput), "cmake input");
  }
  const buildNinjaPath = path.join(buildDir, "build.ninja");
  touch(
    buildNinjaPath,
    [
      "# Re-run CMake if any of its inputs changed.",
      `build build.ninja: RERUN_CMAKE | ${relativeInputs.join(" ")}`,
      "  pool = console",
      "",
      "# A missing CMake input file is not an error.",
      "",
      `build ${relativeInputs.join(" ")}: phony`,
      "",
      "build all: phony",
      "",
    ].join("\n"),
  );

  const repairedCount = repairWindowsCmakeExistingInputPhonyEdges({
    cmakeRootDir,
    platform: "win32",
  });

  assert.equal(repairedCount, 4);
  const source = fs.readFileSync(buildNinjaPath, "utf8");
  assert.match(source, /ReactAndroidConfigVersion\.cmake.*:\s+phony/u);
  assert.doesNotMatch(source, /\.\.\/prefab\/arm64-v8a/u);
  assert.match(source, /[A-Z]\$:.+ReactAndroidConfigVersion\.cmake/u);
  assert.match(source, /build all: phony/u);
});

test("repairs Reanimated Windows CMake directories for the configured ABI", () => {
  const rootDir = makeWorkspace();
  const mobileRootDir = path.join(rootDir, "apps", "mobile");
  const architectureRoot = path.join(
    mobileRootDir,
    "node_modules",
    "react-native-reanimated",
    "android",
    ".cxx",
    "Debug",
    "hash",
    "arm64-v8a",
  );
  touch(
    path.join(
      architectureRoot,
      "src",
      "main",
      "cpp",
      "reanimated",
      "CMakeFiles",
      "reanimated.dir",
      "placeholder",
    ),
  );

  repairReanimatedWindowsCmakeDirectories({
    mobileRootDir,
    platform: "win32",
  });

  const expectedSourceSegment = path.join(
    architectureRoot,
    "src",
    "main",
    "cpp",
    "reanimated",
    "CMakeFiles",
    "reanimated.dir",
    ...path
      .resolve(path.join(mobileRootDir, "node_modules"))
      .replace(/\\/gu, "/")
      .replace(/^([A-Za-z]):\//u, "$1_/")
      .split("/")
      .filter(Boolean),
  );

  assert.equal(fs.existsSync(expectedSourceSegment), true);
  assert.equal(
    fs.existsSync(path.join(path.dirname(architectureRoot), "x86_64")),
    false,
  );
});

test("regenerates missing Reanimated Windows CMake rules for ARM64", () => {
  const rootDir = makeWorkspace();
  const mobileRootDir = path.join(rootDir, "apps", "mobile");
  const cmakeBinDir = path.join(
    rootDir,
    "Android",
    "Sdk",
    "cmake",
    "3.22.1",
    "bin",
  );
  const cmakeExe = path.join(cmakeBinDir, "cmake.exe");
  const architectureRoot = path.join(
    mobileRootDir,
    "node_modules",
    "react-native-reanimated",
    "android",
    ".cxx",
    "Debug",
    "hash",
    "arm64-v8a",
  );
  touch(cmakeExe, "cmake");
  touch(
    path.join(architectureRoot, "build.ninja"),
    "include CMakeFiles/rules.ninja",
  );
  touch(
    path.join(architectureRoot, "CMakeCache.txt"),
    `CMAKE_MAKE_PROGRAM:UNINITIALIZED=${path.join(cmakeBinDir, "ninja.exe")}\n`,
  );

  const calls = [];
  const regeneratedCount = regenerateMissingReanimatedWindowsCmakeRules({
    env: {},
    mobileRootDir,
    platform: "win32",
    spawn(command, args) {
      calls.push({ args, command });
      touch(path.join(architectureRoot, "CMakeFiles", "rules.ninja"), "rules");
      return { status: 0 };
    },
  });

  assert.equal(regeneratedCount, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, cmakeExe);
  assert.deepEqual(calls[0].args, [
    "--regenerate-during-build",
    "-S",
    path.join(
      mobileRootDir,
      "node_modules",
      "react-native-reanimated",
      "android",
    ),
    "-B",
    architectureRoot,
  ]);
});

test("resolves expo-modules-core CMake repair root from the monorepo node_modules", () => {
  const rootDir = makeWorkspace();
  const mobileRootDir = path.join(rootDir, "apps", "mobile");

  assert.equal(
    expoModulesCoreCmakeDebugRoot(mobileRootDir),
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
    ),
  );
  assert.notEqual(
    expoModulesCoreCmakeDebugRoot(mobileRootDir),
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
  );
});

test("runner patches PackageList generated under the real root during subst alias builds", () => {
  const realRootDir = makeWorkspace();
  const aliasRootDir = path.join(realRootDir, "alias-root");
  const realMobileRootDir = path.join(realRootDir, "apps", "mobile");
  const aliasMobileRootDir = path.join(aliasRootDir, "apps", "mobile");
  const localAppData = path.join(realRootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");
  const javaHome = path.join(
    realRootDir,
    "Program Files",
    "Android",
    "Android Studio",
    "jbr",
  );

  writeMobileFixture(aliasMobileRootDir);
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));
  touch(path.join(javaHome, "bin", "java.EXE"));
  touch(path.join(aliasMobileRootDir, "android", "gradlew.bat"));
  touch(
    path.join(aliasMobileRootDir, "android", "app", "build.gradle"),
    [
      "react {",
      "}",
      "dependencies {",
      '    implementation("com.facebook.react:react-android")',
      "}",
      "",
    ].join("\n"),
  );
  touch(path.join(aliasMobileRootDir, "android", "settings.gradle"), "");
  touch(
    path.join(
      aliasMobileRootDir,
      "node_modules",
      "react-native-reanimated",
      "android",
      "build.gradle",
    ),
  );

  const realPackageListPath = path.join(
    realMobileRootDir,
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
  const debugApkPath = path.join(
    aliasMobileRootDir,
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    "debug",
    "app-debug.apk",
  );
  const testApkPath = path.join(
    aliasMobileRootDir,
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    "androidTest",
    "debug",
    "app-debug-androidTest.apk",
  );
  const staleDexPath = path.join(
    realMobileRootDir,
    "android",
    "app",
    "build",
    "intermediates",
    "project_dex_archive",
    "debug",
    "out",
    "stale.dex",
  );
  touch(
    realPackageListPath,
    [
      "package com.facebook.react;",
      "import com.facebook.react.shell.MainReactPackage;",
      "public class PackageList {",
      "  public Object[] getPackages() {",
      "    return new Object[] {",
      "      new MainReactPackage(null),",
      "    };",
      "  }",
      "}",
      "",
    ].join("\n"),
  );
  touch(staleDexPath, "stale compiled PackageList output");

  const spawn = (command, args) => {
    const commandName = String(command).toLowerCase();
    if (commandName.includes("expo")) return { status: 0 };
    if (
      commandName.includes("gradlew") &&
      String(args[0]) === ":app:generateAutolinkingPackageList"
    ) {
      return { status: 0 };
    }
    if (
      commandName.includes("gradlew") &&
      String(args[0]) === "assembleDebug"
    ) {
      fs.mkdirSync(path.dirname(debugApkPath), { recursive: true });
      fs.writeFileSync(debugApkPath, Buffer.from("504b03046465627567", "hex"));
      return { status: 0 };
    }
    if (
      commandName.includes("gradlew") &&
      String(args[0]) === ":app:assembleDebugAndroidTest"
    ) {
      fs.mkdirSync(path.dirname(testApkPath), { recursive: true });
      fs.writeFileSync(testApkPath, Buffer.from("504b030474657374", "hex"));
      return { status: 0 };
    }
    return { status: 0 };
  };

  const result = runExpoLocalAndroidDebugBuild({
    androidToolHomeDir: realRootDir,
    env: {
      LOCALAPPDATA: localAppData,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
      PROGRAMFILES: path.join(realRootDir, "Program Files"),
      SALARY_HIJACKING_ANDROID_BUILD_SUBST_ALIAS: aliasRootDir,
      SALARY_HIJACKING_ANDROID_BUILD_SUBST_TARGET: realRootDir,
    },
    existsSync(candidate) {
      return (
        (candidate.startsWith(realRootDir) ||
          candidate.startsWith(aliasRootDir)) &&
        fs.existsSync(candidate)
      );
    },
    mobileRootDir: aliasMobileRootDir,
    pathValue: "",
    platform: "win32",
    spawn,
  });

  assert.ok([0, 1].includes(result.status));
  const packageListSource = fs.readFileSync(realPackageListPath, "utf8");
  assert.match(packageListSource, /import expo\.modules\.ExpoModulesPackage;/);
  assert.match(packageListSource, /new ExpoModulesPackage\(\),/);
  assert.equal(fs.existsSync(staleDexPath), false);
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
    "--max-workers=1",
    "--no-parallel",
    "-PreactNativeArchitectures=x86_64",
    "-PnewArchEnabled=false",
    "-Pkotlin.incremental=false",
    "-Pksp.incremental=false",
    "-Pksp.incremental.intermodule=false",
    "-Dkotlin.compiler.execution.strategy=in-process",
    "-PhermesEnabled=false",
    "-x",
    ":app:generateAutolinkingPackageList",
    "-x",
    ":expo-modules-core:configureCMakeDebug[x86_64]",
  ]);
  assert.deepEqual(invocations.androidTestArgs, [
    ":app:assembleDebugAndroidTest",
    "--no-daemon",
    "--max-workers=1",
    "--no-parallel",
    "-PreactNativeArchitectures=x86_64",
    "-PnewArchEnabled=false",
    "-Pkotlin.incremental=false",
    "-Pksp.incremental=false",
    "-Pksp.incremental.intermodule=false",
    "-Dkotlin.compiler.execution.strategy=in-process",
    "-PhermesEnabled=false",
    "-x",
    ":app:generateAutolinkingPackageList",
    "-x",
    ":expo-modules-core:configureCMakeDebug[x86_64]",
  ]);
  assert.deepEqual(invocations.packageListArgs, [
    ":app:generateAutolinkingPackageList",
    "--no-daemon",
    "--max-workers=1",
    "--no-parallel",
    "-PreactNativeArchitectures=x86_64",
    "-PnewArchEnabled=false",
    "-Pkotlin.incremental=false",
    "-Pksp.incremental=false",
    "-Pksp.incremental.intermodule=false",
    "-Dkotlin.compiler.execution.strategy=in-process",
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

test("build invocations can target an ARM64 debug APK for physical phone install checks", () => {
  const rootDir = makeWorkspace();
  writeMobileFixture(rootDir);
  touch(path.join(rootDir, "android", "gradlew.bat"));

  const invocations = buildExpoLocalAndroidDebugInvocations({
    architecture: "arm64-v8a",
    mobileRootDir: rootDir,
    output: "build/e2e/android/salary-hijacking-arm64-debug.apk",
    platform: "win32",
  });

  assert.ok(
    invocations.gradleArgs.includes("-PreactNativeArchitectures=arm64-v8a"),
  );
  assert.ok(
    invocations.androidTestArgs.includes(
      "-PreactNativeArchitectures=arm64-v8a",
    ),
  );
  assert.deepEqual(invocations.reanimatedConfigureArgs, [
    ":react-native-reanimated:configureCMakeDebug[arm64-v8a]",
    "--no-daemon",
    "-PreactNativeArchitectures=arm64-v8a",
    "-PnewArchEnabled=false",
  ]);
  assert.deepEqual(invocations.expoModulesCoreConfigureArgs, [
    ":expo-modules-core:configureCMakeDebug[arm64-v8a]",
    "--no-daemon",
    "-PreactNativeArchitectures=arm64-v8a",
    "-PnewArchEnabled=false",
  ]);
  assert.match(
    invocations.outputPath,
    /build[\\/]e2e[\\/]android[\\/]salary-hijacking-arm64-debug\.apk$/,
  );
});

test("writes Android ndk abiFilters for the requested debug APK architecture", () => {
  const rootDir = makeWorkspace();
  const buildGradlePath = path.join(rootDir, "android", "app", "build.gradle");
  touch(
    buildGradlePath,
    [
      "android {",
      "    defaultConfig {",
      "        applicationId 'com.salaryhijacking.mobile'",
      "    }",
      "}",
      "",
    ].join("\n"),
  );

  ensureAndroidDebugNdkAbiFilters({
    architecture: "arm64-v8a",
    mobileRootDir: rootDir,
  });

  const source = fs.readFileSync(buildGradlePath, "utf8");

  assert.match(source, /ndk\s*\{/u);
  assert.match(source, /abiFilters\s+"arm64-v8a"/u);
  assert.doesNotMatch(source, /x86_64/u);
});

test("updates stale Android ndk abiFilters instead of leaving mixed ABI APKs", () => {
  const rootDir = makeWorkspace();
  const buildGradlePath = path.join(rootDir, "android", "app", "build.gradle");
  touch(
    buildGradlePath,
    [
      "android {",
      "    defaultConfig {",
      "        ndk {",
      '            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"',
      "        }",
      "    }",
      "}",
      "",
    ].join("\n"),
  );

  ensureAndroidDebugNdkAbiFilters({
    architecture: "x86_64",
    mobileRootDir: rootDir,
  });

  const source = fs.readFileSync(buildGradlePath, "utf8");

  assert.match(source, /abiFilters\s+"x86_64"/u);
  assert.doesNotMatch(source, /arm64-v8a/u);
  assert.doesNotMatch(source, /armeabi-v7a/u);
});

test("build invocations warm native CMake outputs for every requested APK ABI", () => {
  const rootDir = makeWorkspace();
  writeMobileFixture(rootDir);
  touch(path.join(rootDir, "android", "gradlew.bat"));

  const invocations = buildExpoLocalAndroidDebugInvocations({
    architecture: "arm64-v8a,x86_64",
    mobileRootDir: rootDir,
    platform: "win32",
  });

  assert.ok(
    invocations.gradleArgs.includes(
      "-PreactNativeArchitectures=arm64-v8a,x86_64",
    ),
  );
  assert.ok(
    invocations.gradleArgs.includes(
      ":expo-modules-core:configureCMakeDebug[arm64-v8a]",
    ),
  );
  assert.ok(
    invocations.gradleArgs.includes(
      ":expo-modules-core:configureCMakeDebug[x86_64]",
    ),
  );
  assert.deepEqual(invocations.expoModulesCoreConfigureArgSets, [
    [
      ":expo-modules-core:configureCMakeDebug[arm64-v8a]",
      "--no-daemon",
      "-PreactNativeArchitectures=arm64-v8a,x86_64",
      "-PnewArchEnabled=false",
    ],
    [
      ":expo-modules-core:configureCMakeDebug[x86_64]",
      "--no-daemon",
      "-PreactNativeArchitectures=arm64-v8a,x86_64",
      "-PnewArchEnabled=false",
    ],
  ]);
  assert.deepEqual(invocations.reanimatedConfigureArgSets, [
    [
      ":react-native-reanimated:configureCMakeDebug[arm64-v8a]",
      "--no-daemon",
      "-PreactNativeArchitectures=arm64-v8a,x86_64",
      "-PnewArchEnabled=false",
    ],
    [
      ":react-native-reanimated:configureCMakeDebug[x86_64]",
      "--no-daemon",
      "-PreactNativeArchitectures=arm64-v8a,x86_64",
      "-PnewArchEnabled=false",
    ],
  ]);
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

test("pins Expo CLI Gradle path to the canonical root when Metro uses canonical roots on Windows", () => {
  const source = [
    "react {",
    '    cliFile = new File(["node", "--print", "require.resolve(\'@expo/cli\', { paths: [require.resolve(\'expo/package.json\')] })"].execute(null, rootDir).text.trim())',
    "}",
    "",
  ].join("\n");

  const patched = buildSameRootExpoCliGradleSource({
    canonicalMetroRoot: true,
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
    /cliFile = new File\("C:\/Users\/Telos_PC_17\/Desktop\/salary-hijacking-platform\/node_modules\/\.pnpm\/@expo\+cli@0\.24\.24\/node_modules\/@expo\/cli\/build\/bin\/cli"\)/,
  );
  assert.doesNotMatch(patched, /S:\//);
});

test("pins Hermes compiler to the Windows executable path", () => {
  const source = [
    "react {",
    '    hermesCommand = new File(["node", "--print", "require.resolve(\'react-native/package.json\')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"',
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

  assert.match(patched, /\/sdks\/hermesc\/%OS-BIN%\/hermesc\.exe"/);
  assert.doesNotMatch(patched, /\/sdks\/hermesc\/%OS-BIN%\/hermesc"/);
});

test("pins Gradle node invocations to an explicit Windows executable", () => {
  const source = [
    "pluginManagement {",
    "  providers.exec {",
    '    commandLine("node", "--print", "require.resolve(\'react-native/package.json\')")',
    "  }",
    "}",
    "",
  ].join("\n");

  const patched = buildGradleNodeExecutableSource({
    platform: "win32",
    source,
  });

  assert.match(
    patched,
    /commandLine\(System\.getenv\('SALARY_HIJACKING_NODE_EXECUTABLE'\) \?: "node", "--print"/,
  );
  assert.doesNotMatch(patched, /commandLine\("node", "--print"/);
});

test("local Android debug builds disable Hermes when Windows cannot execute hermesc", () => {
  const rootDir = makeWorkspace();
  writeMobileFixture(rootDir);
  touch(path.join(rootDir, "android", "gradlew.bat"));

  const invocations = buildExpoLocalAndroidDebugInvocations({
    mobileRootDir: rootDir,
    output: "build/e2e/android/salary-hijacking-e2e.apk",
    platform: "win32",
  });

  assert.ok(invocations.gradleArgs.includes("-PhermesEnabled=false"));
  assert.ok(invocations.androidTestArgs.includes("-PhermesEnabled=false"));
  assert.ok(
    invocations.packageListArgs.includes("-PhermesEnabled=false") === false,
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
  let assembleDebugAttempts = 0;

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
          path.join(rootDir, "android", "settings.gradle"),
          [
            "pluginManagement {",
            "  def reactNativeGradlePlugin = new File(",
            "    providers.exec {",
            "      workingDir(rootDir)",
            '      commandLine("node", "--print", "require.resolve(\'@react-native/gradle-plugin/package.json\', { paths: [require.resolve(\'react-native/package.json\')] })")',
            "    }.standardOutput.asText.get().trim()",
            "  ).getParentFile().absolutePath",
            "  def expoPluginsPath = new File(",
            "    providers.exec {",
            "      workingDir(rootDir)",
            '      commandLine("node", "--print", "require.resolve(\'expo-modules-autolinking/package.json\', { paths: [require.resolve(\'expo/package.json\')] })")',
            "    }.standardOutput.asText.get().trim(),",
            '    "../android/expo-gradle-plugin"',
            "  ).absolutePath",
            "}",
            "includeBuild(expoAutolinking.reactNativeGradlePlugin)",
            "",
          ].join("\n"),
        );
        touch(
          path.join(rootDir, "android", "app", "build.gradle"),
          [
            'def projectRoot = "C:/stale/canonical/mobile-root"',
            "react {",
            '    root = file("../../")',
            "    root = file(projectRoot)",
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
        touch(
          path.join(
            rootDir,
            "android",
            "app",
            "src",
            "main",
            "res",
            "values",
            "styles.xml",
          ),
          [
            '<resources xmlns:tools="http://schemas.android.com/tools">',
            '  <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">',
            '    <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>',
            '    <item name="colorPrimary">@color/colorPrimary</item>',
            '    <item name="android:statusBarColor">#F7F8FA</item>',
            "  </style>",
            "</resources>",
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
        assembleDebugAttempts += 1;
        if (assembleDebugAttempts === 1) {
          return { status: 1 };
        }
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
  assert.equal(assembleDebugAttempts, 2);
  assert.equal(calls.length, 7);
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
  assert.equal(calls[4].options.env.SALARY_HIJACKING_METRO_CANONICAL_ROOT, "1");
  assert.equal(
    calls[4].options.env.GRADLE_USER_HOME,
    path.join(rootDir, ".gradle-local-debug"),
  );
  assert.match(String(calls[5].command).toLowerCase(), /gradlew/);
  assert.equal(calls[5].args[0], "assembleDebug");
  assert.match(String(calls[6].command).toLowerCase(), /gradlew/);
  assert.equal(calls[6].args[0], ":app:assembleDebugAndroidTest");
  assert.equal(calls[6].options.env.EXPO_PUBLIC_E2E_BUILD, "true");
  assert.equal(calls[6].options.env.SALARY_HIJACKING_METRO_CANONICAL_ROOT, "1");
  assert.equal(
    calls[6].options.env.GRADLE_USER_HOME,
    path.join(rootDir, ".gradle-local-debug"),
  );
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
    /root = file\(projectRoot\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /entryFile = file\("\$\{projectRoot\}\/index\.android\.js"\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /def projectRoot = ".+[\\/]salary-expo-android-.+"/,
  );
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /C:\/stale\/canonical\/mobile-root/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /canonicalReactBuildDir/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /jsBundleDir\.set\(new File\(canonicalReactBuildDir, "generated\/assets\/react\/debug"\)\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /resourcesDir\.set\(new File\(canonicalReactBuildDir, "generated\/res\/react\/debug"\)\)/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /createDebugUpdatesResources/,
  );
  assert.match(
    fs.readFileSync(
      path.join(rootDir, "android", "app", "build.gradle"),
      "utf8",
    ),
    /debuggableVariant\.set\(true\)/,
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
    fs.readFileSync(path.join(rootDir, "android", "settings.gradle"), "utf8"),
    /environment\("NODE_OPTIONS", ""\)/,
  );
  assert.match(
    fs.readFileSync(path.join(rootDir, "android", "settings.gradle"), "utf8"),
    /SALARY_HIJACKING_ANDROID_BUILD_SUBST_ALIAS/,
  );
  assert.match(
    fs.readFileSync(path.join(rootDir, "android", "settings.gradle"), "utf8"),
    /salaryHijackingSameRootPath/,
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
  assert.match(
    fs.readFileSync(
      path.join(
        rootDir,
        "android",
        "app",
        "src",
        "main",
        "res",
        "values",
        "styles.xml",
      ),
      "utf8",
    ),
    /<item name="android:windowBackground">@drawable\/ic_launcher_background<\/item>/,
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

test("runner reports Gradle timeout as a build timeout instead of a generic failure", () => {
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
  const timeoutError = new Error("spawnSync gradlew ETIMEDOUT");
  timeoutError.code = "ETIMEDOUT";

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
      SALARY_HIJACKING_ANDROID_BUILD_GRADLE_TIMEOUT_MS: "1000",
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
          path.join(rootDir, "android", "settings.gradle"),
          [
            "pluginManagement {",
            "  def reactNativeGradlePlugin = new File(",
            "    providers.exec {",
            "      workingDir(rootDir)",
            '      commandLine("node", "--print", "require.resolve(\'@react-native/gradle-plugin/package.json\', { paths: [require.resolve(\'react-native/package.json\')] })")',
            "    }.standardOutput.asText.get().trim()",
            "  ).getParentFile().absolutePath",
            "}",
            "includeBuild(expoAutolinking.reactNativeGradlePlugin)",
            "",
          ].join("\n"),
        );
        touch(
          path.join(rootDir, "android", "app", "build.gradle"),
          [
            'def projectRoot = "C:/stale/canonical/mobile-root"',
            "react {",
            '    root = file("../../")',
            "    root = file(projectRoot)",
            '    entryFile = file("${projectRoot}/apps/mobile/index.android.js")',
            "}",
            "",
            "android {",
            "    defaultConfig {",
            "    }",
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
        touch(
          path.join(
            rootDir,
            "android",
            "app",
            "src",
            "main",
            "res",
            "values",
            "styles.xml",
          ),
          [
            '<resources xmlns:tools="http://schemas.android.com/tools">',
            '  <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">',
            '    <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>',
            '    <item name="colorPrimary">@color/colorPrimary</item>',
            '    <item name="android:statusBarColor">#F7F8FA</item>',
            "  </style>",
            "</resources>",
            "",
          ].join("\n"),
        );
      }
      if (
        commandName.includes("gradlew") &&
        String(args[0]) === ":app:generateAutolinkingPackageList"
      ) {
        return { error: timeoutError, signal: "SIGTERM", status: null };
      }
      return { status: 0 };
    },
  });

  assert.equal(result.status, 124);
  assert.match(result.failures.join("\n"), /Gradle step timed out/);
  assert.match(
    result.failures.join("\n"),
    /:app:generateAutolinkingPackageList/,
  );
  assert.equal(calls[1].options.timeout, 1000);
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
