import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import {
  buildPhysicalPhoneQaHandoff,
  writePhysicalPhoneQaHandoff,
} from "./generate-physical-phone-qa-handoff.mjs";

const fixtureWorkspaces = new Set();

const cleanupWorkspaces = () => {
  for (const rootDir of fixtureWorkspaces) {
    fs.rmSync(rootDir, {
      force: true,
      maxRetries: 3,
      recursive: true,
      retryDelay: 50,
    });
    fixtureWorkspaces.delete(rootDir);
  }
};

afterEach(() => {
  cleanupWorkspaces();
});

const makeWorkspace = () => {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-phone-qa-handoff-"),
  );
  fixtureWorkspaces.add(rootDir);
  return rootDir;
};

const writeJson = (rootDir, relativePath, value) => {
  const targetPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return targetPath;
};

const makePreviewEvidence = () => ({
  schemaVersion: 1,
  secretsRedacted: true,
  containsSecretValues: false,
  appIdentity: {
    appSlug: "salary-hijacking",
    androidPackage: "com.salaryhijacking.mobile",
    iosBundleIdentifier: "com.salaryhijacking.mobile",
  },
  android: {
    debugApkLocalPath:
      "apps/mobile/build/phone/android/salary-hijacking-phone-arm64-debug.apk",
    phoneTargetDebugApkDownloadsPath:
      "C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration104-debug.apk",
    phoneTargetDebugApkLocalPath:
      "D:/salary-hijacking-artifacts/20260714/iteration-104-daily-budget-date-key/salary-hijacking-phone-arm64-iteration104-debug.apk",
    phoneTargetDebugApkTemporaryUrl:
      "https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260714-iteration104/salary.apk",
    phoneTargetDebugApkSha256:
      "5E9CC86ECA43F41327FF3C8B4392F5F8F08479C58EC1EB7ED204CF7356ADCDB0",
    phoneTargetDebugApkAbis: ["arm64-v8a"],
    latestSourcePackagedHead: "9e65d4df9a49e44816cde883239354249ebd2a4c",
    physicalPhoneVerified: false,
    physicalPhoneBlocker:
      "No physical Android phone is attached to this Codex Windows environment at observation time.",
  },
});

test("builds a no-secret physical phone QA handoff from current preview APK evidence", () => {
  const rootDir = makeWorkspace();
  writeJson(
    rootDir,
    "release/mobile-preview-evidence.json",
    makePreviewEvidence(),
  );

  const markdown = buildPhysicalPhoneQaHandoff({
    rootDir,
    now: () => new Date("2026-07-14T12:00:00.000Z"),
  });

  assert.match(markdown, /^# Physical Android Phone QA Handoff/m);
  assert.match(markdown, /Updated: 2026-07-14 KST/);
  assert.match(
    markdown,
    /C:\/Users\/PC\/Downloads\/salary-hijacking-phone-arm64-iteration104-debug\.apk/,
  );
  assert.match(
    markdown,
    /apps\/mobile\/build\/phone\/android\/salary-hijacking-phone-arm64-debug\.apk/,
  );
  assert.match(
    markdown,
    /^- Remote APK: `https:\/\/raw\.githubusercontent\.com\/jinbizman-boop\/salary-hijacking\/codex-apk-artifacts-20260714-iteration104\/salary\.apk`$/m,
  );
  assert.match(markdown, /9e65d4df9a49e44816cde883239354249ebd2a4c/);
  assert.match(
    markdown,
    /5E9CC86ECA43F41327FF3C8B4392F5F8F08479C58EC1EB7ED204CF7356ADCDB0/,
  );
  assert.match(markdown, /com\.salaryhijacking\.mobile/);
  assert.match(markdown, /arm64-v8a/);
  assert.match(markdown, /collect-mobile-preview-phone-proof\.mjs/);
  assert.match(markdown, /run-physical-phone-qa\.mjs/);
  assert.match(markdown, /--runs 20/);
  assert.match(markdown, /20 cold-start/);
  assert.match(markdown, /20 background\/foreground/);
  assert.match(markdown, /persistence/);
  assert.match(markdown, /keyboard\/safe-area/);
  assert.match(markdown, /raw logcat/);
  assert.match(markdown, /adb shell pm path com\.salaryhijacking\.mobile/);
  assert.match(markdown, /installedPackageVerified=true/);
  assert.match(markdown, /installedPackagePathHash/);
  assert.match(markdown, /packageInfoProbe\.rawPackageInfoStored=false/);
  assert.match(markdown, /\/data\/app\/\.\.\./);
  assert.match(markdown, /release\/mobile-preview-phone-proof\.local\.json/);
  assert.doesNotMatch(markdown, /sk-[A-Za-z0-9_-]+|DATABASE_URL=|-----BEGIN/i);
});

test("writes the handoff document to the docs QA completion directory", () => {
  const rootDir = makeWorkspace();
  writeJson(
    rootDir,
    "release/mobile-preview-evidence.json",
    makePreviewEvidence(),
  );

  const { markdown, targetPath } = writePhysicalPhoneQaHandoff({
    rootDir,
    now: () => new Date("2026-07-14T12:00:00.000Z"),
  });

  assert.equal(
    targetPath,
    path.join(
      rootDir,
      "docs",
      "qa",
      "100-completion",
      "physical-phone-qa-handoff.md",
    ),
  );
  assert.equal(fs.readFileSync(targetPath, "utf8"), markdown);
  assert.match(markdown, /strict readiness remains BLOCKED until/);
});
