import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDetoxAndroidTestInvocation,
  runDetoxAndroidTest,
} from "./run-detox-android.mjs";

const makeWorkspace = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-detox-android-"));

const touch = (filePath, contents = "") => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
};

const existsInside = (rootDir) => (filePath) => {
  const relative = path.relative(rootDir, path.resolve(filePath));
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return fs.existsSync(filePath);
};

test("builds a Detox Android invocation with SDK env and tool paths", () => {
  const rootDir = makeWorkspace();
  const localAppData = path.join(rootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));
  touch(path.join(rootDir, "node_modules", ".bin", "detox.CMD"));

  const invocation = buildDetoxAndroidTestInvocation({
    androidToolHomeDir: rootDir,
    configuration: "android.emu.debug",
    env: {
      LOCALAPPDATA: localAppData,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
      Path: "C:\\Windows\\System32",
    },
    existsSync: existsInside(rootDir),
    mobileRootDir: rootDir,
    pathValue: "C:\\Windows\\System32",
    platform: "win32",
  });

  assert.equal(invocation.ok, true, invocation.failures.join("\n"));
  assert.equal(path.basename(invocation.command).toLowerCase(), "detox.cmd");
  assert.deepEqual(invocation.args, [
    "test",
    "--configuration",
    "android.emu.debug",
  ]);
  assert.equal(invocation.env.ANDROID_SDK_ROOT, sdkRoot);
  assert.equal(invocation.env.ANDROID_HOME, sdkRoot);
  assert.match(
    invocation.env.Path,
    new RegExp(
      `${path
        .join(sdkRoot, "platform-tools")
        .replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")}`,
    ),
  );
  assert.match(
    invocation.env.Path,
    new RegExp(
      `${path.join(sdkRoot, "emulator").replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")}`,
    ),
  );
});

test("runs Detox through the workspace-local CLI after preflight succeeds", () => {
  const rootDir = makeWorkspace();
  const localAppData = path.join(rootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");
  const calls = [];
  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));
  touch(path.join(rootDir, "node_modules", ".bin", "detox.CMD"));

  const result = runDetoxAndroidTest({
    androidToolHomeDir: rootDir,
    configuration: "android.emu.debug",
    env: {
      LOCALAPPDATA: localAppData,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
      Path: "",
    },
    existsSync: existsInside(rootDir),
    mobileRootDir: rootDir,
    pathValue: "",
    platform: "win32",
    spawn(command, args, options) {
      calls.push({ command, args, options });
      return { status: 0 };
    },
  });

  assert.equal(result.status, 0, result.failures.join("\n"));
  assert.equal(calls.length, 1);
  assert.equal(path.basename(calls[0].command).toLowerCase(), "detox.cmd");
  assert.equal(calls[0].options.cwd, rootDir);
  assert.equal(calls[0].options.env.ANDROID_SDK_ROOT, sdkRoot);
});

test("fails before running Detox when SDK tools are unavailable", () => {
  const rootDir = makeWorkspace();
  const calls = [];
  touch(path.join(rootDir, "node_modules", ".bin", "detox.CMD"));

  const result = runDetoxAndroidTest({
    androidToolHomeDir: rootDir,
    env: { LOCALAPPDATA: path.join(rootDir, "AppData", "Local") },
    existsSync: existsInside(rootDir),
    mobileRootDir: rootDir,
    pathValue: "",
    platform: "win32",
    spawn(command, args, options) {
      calls.push({ command, args, options });
      return { status: 0 };
    },
  });

  assert.equal(result.status, 2);
  assert.match(result.failures.join("\n"), /Android SDK root/);
  assert.equal(calls.length, 0);
});
