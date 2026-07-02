import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildEasLocalAndroidBuildInvocation,
  checkEasLocalAndroidBuildPrerequisites,
  runEasLocalAndroidBuild,
} from "./eas-local-android-build.mjs";

const makeWorkspace = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-eas-android-"));

const touch = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "", "utf8");
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const writeMobileBuildFixture = (rootDir) => {
  writeJson(path.join(rootDir, "eas.json"), {
    build: {
      e2e: {
        android: {
          buildType: "apk",
        },
      },
    },
  });
  touch(path.join(rootDir, "node_modules", ".bin", "eas.CMD"));
};

const existsInside = (rootDir) => (filePath) => {
  const relative = path.relative(rootDir, path.resolve(filePath));
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return fs.existsSync(filePath);
};

test("preflight passes with local EAS CLI, Android SDK tools, and Android Studio Java", () => {
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

  writeMobileBuildFixture(rootDir);
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));
  touch(path.join(javaHome, "bin", "java.EXE"));

  const result = checkEasLocalAndroidBuildPrerequisites({
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
  assert.match(result.env.PATH, /Android Studio/);
});

test("preflight fails before an expensive local build when Java is unavailable", () => {
  const rootDir = makeWorkspace();
  const localAppData = path.join(rootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");

  writeMobileBuildFixture(rootDir);
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));

  const result = checkEasLocalAndroidBuildPrerequisites({
    androidToolHomeDir: rootDir,
    env: {
      LOCALAPPDATA: localAppData,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
    },
    existsSync: existsInside(rootDir),
    mobileRootDir: rootDir,
    pathValue: "",
    platform: "win32",
  });

  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /Java/i);
});

test("build invocation keeps the E2E APK output path and non-interactive local EAS flags", () => {
  const rootDir = makeWorkspace();
  writeMobileBuildFixture(rootDir);

  const invocation = buildEasLocalAndroidBuildInvocation({
    mobileRootDir: rootDir,
    output: "build/e2e/android/salary-hijacking-e2e.apk",
    platform: "win32",
    profile: "e2e",
  });

  assert.equal(path.basename(invocation.command).toLowerCase(), "eas.cmd");
  assert.deepEqual(invocation.args, [
    "build",
    "--platform",
    "android",
    "--profile",
    "e2e",
    "--local",
    "--output",
    "build/e2e/android/salary-hijacking-e2e.apk",
    "--non-interactive",
  ]);
});

test("local build runner executes the Windows EAS command through the shell", () => {
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
  const spawnCalls = [];

  writeMobileBuildFixture(rootDir);
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));
  touch(path.join(javaHome, "bin", "java.EXE"));

  const result = runEasLocalAndroidBuild({
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
      spawnCalls.push({ command, args, options });
      return { status: 0 };
    },
  });

  assert.equal(result.status, 0);
  assert.equal(spawnCalls.length, 1);
  assert.equal(spawnCalls[0].options.shell, true);
});
