import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  androidToolExists,
  candidateAndroidSdkRoots,
} from "./android-sdk-tools.mjs";

const makeWorkspace = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-android-sdk-tools-"));

const touch = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "", "utf8");
};

test("finds adb and emulator in a Windows Android SDK even when PATH is empty", () => {
  const rootDir = makeWorkspace();
  const localAppData = path.join(rootDir, "AppData", "Local");
  const sdkRoot = path.join(localAppData, "Android", "Sdk");

  touch(path.join(sdkRoot, "platform-tools", "adb.EXE"));
  touch(path.join(sdkRoot, "emulator", "emulator.EXE"));

  const options = {
    env: {
      LOCALAPPDATA: localAppData,
      PATHEXT: ".EXE;.CMD;.BAT;.COM",
    },
    existsSync: fs.existsSync,
    pathValue: "",
    platform: "win32",
  };

  assert.equal(androidToolExists("adb", options), true);
  assert.equal(androidToolExists("emulator", options), true);
});

test("keeps Android SDK root candidates stable and deduplicated", () => {
  const rootDir = makeWorkspace();
  const sdkRoot = path.join(rootDir, "Android", "Sdk");

  const candidates = candidateAndroidSdkRoots({
    env: {
      ANDROID_HOME: sdkRoot,
      ANDROID_SDK_ROOT: sdkRoot,
      LOCALAPPDATA: path.dirname(path.dirname(sdkRoot)),
    },
    homeDir: rootDir,
    platform: "win32",
  });

  assert.equal(candidates[0], sdkRoot);
  assert.equal(new Set(candidates).size, candidates.length);
});
