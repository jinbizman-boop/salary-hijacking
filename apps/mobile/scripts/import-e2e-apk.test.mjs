import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  getAndroidE2eApkPath,
  importAndroidE2eApk,
} from "./import-e2e-apk.mjs";

const makeWorkspace = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "salary-mobile-e2e-apk-"));

const writeApk = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.from("PK\u0003\u0004salary-hijacking-e2e"));
};

test("imports a local Android E2E APK into the Detox binary path", () => {
  const mobileRootDir = makeWorkspace();
  const sourcePath = path.join(mobileRootDir, "downloads", "e2e.apk");
  writeApk(sourcePath);

  const outputPath = importAndroidE2eApk({ mobileRootDir, sourcePath });

  assert.equal(outputPath, getAndroidE2eApkPath(mobileRootDir));
  assert.equal(fs.existsSync(outputPath), true);
  assert.equal(fs.readFileSync(outputPath).subarray(0, 2).toString(), "PK");
});

test("rejects URLs and non-APK files", () => {
  const mobileRootDir = makeWorkspace();
  assert.throws(
    () =>
      importAndroidE2eApk({
        mobileRootDir,
        sourcePath: "https://expo.dev/artifacts/example.apk",
      }),
    /local .+ APK path/i,
  );

  const sourcePath = path.join(mobileRootDir, "downloads", "e2e.txt");
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, "not an apk", "utf8");

  assert.throws(
    () => importAndroidE2eApk({ mobileRootDir, sourcePath }),
    /\.apk/i,
  );
});

test("rejects empty or non-ZIP APK placeholders", () => {
  const mobileRootDir = makeWorkspace();
  const sourcePath = path.join(mobileRootDir, "downloads", "e2e.apk");
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, "not a zip archive", "utf8");

  assert.throws(
    () => importAndroidE2eApk({ mobileRootDir, sourcePath }),
    /valid APK/i,
  );
});
