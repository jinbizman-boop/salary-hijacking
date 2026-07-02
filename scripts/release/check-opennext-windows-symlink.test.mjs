import assert from "node:assert/strict";
import test from "node:test";

import { checkOpenNextWindowsSymlinkPrerequisite } from "./check-opennext-windows-symlink.mjs";

test("skips the OpenNext symlink prerequisite outside Windows", () => {
  const result = checkOpenNextWindowsSymlinkPrerequisite({
    platform: "linux",
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
});

test("returns a release-safe blocker message when Windows directory symlinks are not permitted", () => {
  const operations = [];
  const fakeFs = {
    mkdtempSync(prefix) {
      operations.push(["mkdtempSync", prefix]);
      return "C:\\temp\\salary-opennext-symlink-test";
    },
    mkdirSync(path) {
      operations.push(["mkdirSync", path]);
    },
    symlinkSync() {
      const error = new Error("operation not permitted, symlink");
      error.code = "EPERM";
      throw error;
    },
    rmSync(path, options) {
      operations.push(["rmSync", path, options?.recursive, options?.force]);
    },
  };

  const result = checkOpenNextWindowsSymlinkPrerequisite({
    fs: fakeFs,
    platform: "win32",
    tmpDir: () => "C:\\temp",
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "EPERM");
  assert.match(
    result.message,
    /OpenNext Cloudflare build requires Windows symlink permission/,
  );
  assert.match(
    result.message,
    /Developer Mode, administrator shell, WSL, or CI/,
  );
  assert.deepEqual(operations.at(-1), [
    "rmSync",
    "C:\\temp\\salary-opennext-symlink-test",
    true,
    true,
  ]);
});
