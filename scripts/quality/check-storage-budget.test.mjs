import assert from "node:assert/strict";
import test from "node:test";

import { evaluateStorageBudget } from "./check-storage-budget.mjs";

test("passes hard gates and build gate when free space is above fixed and percentage thresholds", () => {
  const result = evaluateStorageBudget({
    artifactBytes: 2 * 1024 ** 3,
    env: {
      SH_ANDROID_BUILD_START_MIN_FREE_GB: "35",
      SH_ARTIFACT_ROOT: "D:/salary-hijacking-artifacts",
      SH_HARD_MIN_FREE_PERCENT: "10",
      SH_MAX_ARTIFACT_STORAGE_GB: "12",
      SH_SYSTEM_DRIVE_HARD_MIN_FREE_GB: "15",
      SH_WARN_FREE_PERCENT: "15",
      SH_WORK_DRIVE_HARD_MIN_FREE_GB: "25",
    },
    requireAndroidBuildStart: true,
    systemDrive: {
      freeBytes: 40 * 1024 ** 3,
      name: "C",
      totalBytes: 100 * 1024 ** 3,
    },
    workDrive: {
      freeBytes: 50 * 1024 ** 3,
      name: "C",
      totalBytes: 100 * 1024 ** 3,
    },
  });

  assert.equal(result.ok, true, result.failures.join("\n"));
  assert.equal(result.gates.systemHard.ok, true);
  assert.equal(result.gates.workBuildStart.ok, true);
  assert.equal(result.gates.artifactBudget.ok, true);
});

test("fails Android build-start gate without failing the lower hard work-drive gate", () => {
  const result = evaluateStorageBudget({
    artifactBytes: 1 * 1024 ** 3,
    env: {
      SH_ANDROID_BUILD_START_MIN_FREE_GB: "35",
      SH_HARD_MIN_FREE_PERCENT: "10",
      SH_SYSTEM_DRIVE_HARD_MIN_FREE_GB: "15",
      SH_WARN_FREE_PERCENT: "15",
      SH_WORK_DRIVE_HARD_MIN_FREE_GB: "25",
    },
    requireAndroidBuildStart: true,
    systemDrive: {
      freeBytes: 30 * 1024 ** 3,
      name: "C",
      totalBytes: 110 * 1024 ** 3,
    },
    workDrive: {
      freeBytes: 30 * 1024 ** 3,
      name: "C",
      totalBytes: 110 * 1024 ** 3,
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.gates.workHard.ok, true);
  assert.equal(result.gates.workBuildStart.ok, false);
  assert.match(result.failures.join("\n"), /Android build-start/);
});
