import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertInsideRoot,
  cleanGeneratedJunk,
  collectStaleSubstTargets,
  defaultTempRoots,
  parseSubstMappings,
} from "./clean-generated-junk.mjs";

async function touch(filePath, contents = "generated") {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

test("removes repository generated junk while preserving dependencies, local secrets, and tracked evidence", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-root-"));

  try {
    await touch(path.join(rootDir, ".turbo", "cache.bin"));
    await touch(
      path.join(rootDir, ".tmp", "chrome-clean-fintech-home-1", "cache.bin"),
    );
    await touch(path.join(rootDir, "apps", "mobile", ".expo", "web", "cache"));
    await touch(
      path.join(rootDir, "apps", "mobile", ".local-native-bin", "npm.cmd"),
    );
    await touch(
      path.join(
        rootDir,
        "apps",
        "mobile",
        ".localappdata",
        "npm-cache",
        "_cacache",
        "index-v5",
        "cache.bin",
      ),
    );
    await touch(
      path.join(
        rootDir,
        "apps",
        "mobile",
        "apps",
        "mobile",
        "index.android.js",
      ),
      'import "../../index.android.js";\n',
    );
    await touch(path.join(rootDir, "services", "api", ".wrangler", "state"));
    await touch(
      path.join(rootDir, "security-reports", "secret-like-findings.json"),
    );
    await touch(path.join(rootDir, "release", "cloudflare-proof.local.json"));
    await touch(
      path.join(rootDir, "release", "public-url-observation.local.json"),
    );
    await touch(path.join(rootDir, "apps", "mobile", ".eas", "build", "log"));
    await touch(path.join(rootDir, "apps", "mobile", ".eas", "cache", "blob"));
    await touch(
      path.join(rootDir, "apps", "mobile", "android", ".gradle", "cache.bin"),
    );
    await touch(
      path.join(rootDir, "apps", "mobile", "android", ".cxx", "cache.bin"),
    );
    await touch(
      path.join(rootDir, "apps", "mobile", "android", "build", "out.bin"),
    );
    await touch(
      path.join(
        rootDir,
        "apps",
        "mobile",
        "android",
        "app",
        "build",
        "out.bin",
      ),
    );
    await touch(
      path.join(
        rootDir,
        "node_modules",
        ".pnpm",
        "expo-modules-core@2.5.0",
        "node_modules",
        "expo-modules-core",
        "android",
        ".cxx",
        "cache.bin",
      ),
    );
    await touch(
      path.join(
        rootDir,
        "node_modules",
        ".pnpm",
        "expo@53.0.27",
        "node_modules",
        "expo",
        "android",
        "build",
        "generated.bin",
      ),
    );
    await touch(
      path.join(
        rootDir,
        "node_modules",
        ".pnpm",
        "react-native-reanimated@3.17.0",
        "node_modules",
        "react-native-reanimated",
        "android",
        ".gradle",
        "cache.bin",
      ),
    );
    await touch(
      path.join(rootDir, "apps", "mobile", "ios", "build", "out.bin"),
    );
    await touch(
      path.join(rootDir, "apps", "mobile", "ios", "Pods", "Manifest.lock"),
    );
    await touch(
      path.join(rootDir, "packages", "utils", "tsconfig.tsbuildinfo"),
    );
    await touch(path.join(rootDir, "node_modules", "package", "index.js"));
    await touch(path.join(rootDir, "services", "api", ".dev.vars"), "secret");
    await touch(
      path.join(rootDir, "release", "cloudflare-runtime-evidence.json"),
    );
    await touch(
      path.join(
        rootDir,
        "apps",
        "mobile",
        "build",
        "phone",
        "android",
        "salary-hijacking-phone-arm64-iteration029-debug.apk",
      ),
      "PK\u0003\u0004",
    );
    await touch(
      path.join(
        rootDir,
        "apps",
        "mobile",
        "build",
        "phone",
        "android",
        "salary-hijacking-phone-arm64-debug.apk",
      ),
      "PK\u0003\u0004",
    );
    await touch(
      path.join(
        rootDir,
        "apps",
        "mobile",
        "build",
        "e2e",
        "android",
        "salary-hijacking-e2e.apk",
      ),
      "PK\u0003\u0004",
    );
    await touch(path.join(rootDir, "docs", "source.md"));

    const result = await cleanGeneratedJunk({ rootDir, tempRoots: [] });

    assert.equal(result.errors.length, 0);
    assert.equal(existsSync(path.join(rootDir, ".turbo")), false);
    assert.equal(existsSync(path.join(rootDir, ".tmp")), false);
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", ".expo")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", ".local-native-bin")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", ".localappdata")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "apps")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "services", "api", ".wrangler")),
      false,
    );
    assert.equal(existsSync(path.join(rootDir, "security-reports")), false);
    assert.equal(
      existsSync(path.join(rootDir, "release", "cloudflare-proof.local.json")),
      false,
    );
    assert.equal(
      existsSync(
        path.join(rootDir, "release", "public-url-observation.local.json"),
      ),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", ".eas", "build")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", ".eas", "cache")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "android", ".gradle")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "android", ".cxx")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "android", "build")),
      false,
    );
    assert.equal(
      existsSync(
        path.join(rootDir, "apps", "mobile", "android", "app", "build"),
      ),
      false,
    );
    assert.equal(
      existsSync(
        path.join(
          rootDir,
          "node_modules",
          ".pnpm",
          "expo-modules-core@2.5.0",
          "node_modules",
          "expo-modules-core",
          "android",
          ".cxx",
        ),
      ),
      false,
    );
    assert.equal(
      existsSync(
        path.join(
          rootDir,
          "node_modules",
          ".pnpm",
          "expo@53.0.27",
          "node_modules",
          "expo",
          "android",
          "build",
        ),
      ),
      false,
    );
    assert.equal(
      existsSync(
        path.join(
          rootDir,
          "node_modules",
          ".pnpm",
          "react-native-reanimated@3.17.0",
          "node_modules",
          "react-native-reanimated",
          "android",
          ".gradle",
        ),
      ),
      false,
    );
    assert.equal(
      existsSync(
        path.join(
          rootDir,
          "node_modules",
          ".pnpm",
          "expo@53.0.27",
          "node_modules",
          "expo",
        ),
      ),
      true,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "ios", "build")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "ios", "Pods")),
      false,
    );
    assert.equal(
      existsSync(
        path.join(rootDir, "packages", "utils", "tsconfig.tsbuildinfo"),
      ),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "node_modules", "package", "index.js")),
      true,
    );
    assert.equal(
      existsSync(path.join(rootDir, "services", "api", ".dev.vars")),
      true,
    );
    assert.equal(
      existsSync(
        path.join(rootDir, "release", "cloudflare-runtime-evidence.json"),
      ),
      true,
    );
    assert.equal(
      existsSync(
        path.join(
          rootDir,
          "apps",
          "mobile",
          "build",
          "phone",
          "android",
          "salary-hijacking-phone-arm64-iteration029-debug.apk",
        ),
      ),
      false,
    );
    assert.equal(
      existsSync(
        path.join(
          rootDir,
          "apps",
          "mobile",
          "build",
          "phone",
          "android",
          "salary-hijacking-phone-arm64-debug.apk",
        ),
      ),
      false,
    );
    assert.equal(
      existsSync(
        path.join(
          rootDir,
          "apps",
          "mobile",
          "build",
          "e2e",
          "android",
          "salary-hijacking-e2e.apk",
        ),
      ),
      false,
    );
    assert.equal(existsSync(path.join(rootDir, "docs", "source.md")), true);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("dry run reports generated junk without deleting it", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-dry-run-"));

  try {
    const target = path.join(rootDir, ".turbo", "cache.bin");
    await touch(target);

    const result = await cleanGeneratedJunk({
      dryRun: true,
      rootDir,
      tempRoots: [],
    });

    assert.equal(result.errors.length, 0);
    assert.equal(result.removed.length, 0);
    assert.equal(result.planned.length, 1);
    assert.equal(existsSync(target), true);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("removes high-volume repository build outputs and temporary APK patch artifacts", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-builds-"));

  try {
    await touch(
      path.join(
        rootDir,
        "apps",
        "mobile",
        "build",
        "phone",
        "android",
        "salary-hijacking-qa-direct-universal.apk",
      ),
      "PK\u0003\u0004",
    );
    await touch(
      path.join(
        rootDir,
        "artifacts",
        "tmp",
        "apk-bundle-patch",
        "patched-aligned.apk",
      ),
      "PK\u0003\u0004",
    );
    await touch(
      path.join(
        rootDir,
        "build",
        "android-subproject-build",
        "expo-modules-core",
        "intermediates",
        "generated.bin",
      ),
    );
    await touch(path.join(rootDir, "docs", "source.md"));

    const result = await cleanGeneratedJunk({ rootDir, tempRoots: [] });

    assert.equal(result.errors.length, 0);
    assert.equal(
      existsSync(path.join(rootDir, "apps", "mobile", "build")),
      false,
    );
    assert.equal(existsSync(path.join(rootDir, "artifacts", "tmp")), false);
    assert.equal(existsSync(path.join(rootDir, "build")), false);
    assert.equal(existsSync(path.join(rootDir, "docs", "source.md")), true);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("removes stale Android APK artifacts while preserving final QA and triage APKs", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-apks-"));
  const mirrorRoot = await mkdtemp(
    path.join(tmpdir(), "salary-junk-apk-mirror-"),
  );
  const downloadsRoot = await mkdtemp(
    path.join(tmpdir(), "salary-junk-apk-downloads-"),
  );

  try {
    const repoApkRoot = path.join(rootDir, "artifacts", "android");
    const keepFinal = path.join(
      repoApkRoot,
      "salary-hijacking-qa-universal.apk",
    );
    const keepFinalSha = path.join(
      repoApkRoot,
      "salary-hijacking-qa-universal.apk.sha256",
    );
    const staleFinalSignature = path.join(
      repoApkRoot,
      "salary-hijacking-qa-universal.apk.idsig",
    );
    const staleFinalVerifyLog = path.join(
      repoApkRoot,
      "salary-hijacking-qa-universal.apk.verify.txt",
    );
    const staleOriginal = path.join(
      repoApkRoot,
      "salary-hijacking-original-safe-patched-current-universal.apk",
    );
    const staleDiagnostic = path.join(
      mirrorRoot,
      "salary-hijacking-qa-direct-current-universal.apk",
    );
    const staleUpgradeBase = path.join(
      downloadsRoot,
      "salary-hijacking-original-direct-current-universal.apk",
    );
    const staleReleaseLikeArm64 = path.join(
      downloadsRoot,
      "salary-hijacking-qa-release-like-arm64-eureka-fit-20260729.apk",
    );
    const staleReleaseLikeArm64Sha = path.join(
      downloadsRoot,
      "salary-hijacking-qa-release-like-arm64-eureka-fit-20260729.apk.sha256",
    );
    const staleBuildInfo = path.join(
      repoApkRoot,
      "build-info-safe-current-splash-hide-universal.json",
    );
    const staleChecksum = path.join(
      repoApkRoot,
      "checksums-direct-current.txt",
    );
    const staleManifest = path.join(repoApkRoot, "final-qa-apk-manifest.json");
    const oldProbe = path.join(repoApkRoot, "probe-copy.apk");
    const oldArm64 = path.join(
      downloadsRoot,
      "salary-hijacking-original-direct-current-arm64.apk",
    );
    const oldCrashfix = path.join(
      mirrorRoot,
      "salary-hijacking-qa-universal-crashfix.apk",
    );
    const unrelatedText = path.join(downloadsRoot, "salary-hijacking-note.txt");

    await touch(keepFinal, "PK\u0003\u0004");
    await touch(keepFinalSha, "sha256");
    await touch(staleFinalSignature, "signature");
    await touch(staleFinalVerifyLog, "verified");
    await touch(staleOriginal, "PK\u0003\u0004");
    await touch(staleDiagnostic, "PK\u0003\u0004");
    await touch(staleUpgradeBase, "PK\u0003\u0004");
    await touch(staleReleaseLikeArm64, "PK\u0003\u0004");
    await touch(staleReleaseLikeArm64Sha, "sha256");
    await touch(staleBuildInfo, "{}");
    await touch(staleChecksum, "sha256");
    await touch(staleManifest, "{}");
    await touch(oldProbe, "PK\u0003\u0004");
    await touch(oldArm64, "PK\u0003\u0004");
    await touch(oldCrashfix, "PK\u0003\u0004");
    await touch(unrelatedText, "keep");

    const result = await cleanGeneratedJunk({
      androidArtifactRoots: [repoApkRoot, mirrorRoot, downloadsRoot],
      rootDir,
      tempRoots: [],
    });

    assert.equal(result.errors.length, 0);
    assert.equal(existsSync(keepFinal), true);
    assert.equal(existsSync(keepFinalSha), true);
    assert.equal(existsSync(staleFinalSignature), false);
    assert.equal(existsSync(staleFinalVerifyLog), false);
    assert.equal(existsSync(staleOriginal), false);
    assert.equal(existsSync(staleDiagnostic), false);
    assert.equal(existsSync(staleUpgradeBase), false);
    assert.equal(existsSync(staleReleaseLikeArm64), false);
    assert.equal(existsSync(staleReleaseLikeArm64Sha), false);
    assert.equal(existsSync(staleBuildInfo), false);
    assert.equal(existsSync(staleChecksum), false);
    assert.equal(existsSync(staleManifest), false);
    assert.equal(existsSync(unrelatedText), true);
    assert.equal(existsSync(oldProbe), false);
    assert.equal(existsSync(oldArm64), false);
    assert.equal(existsSync(oldCrashfix), false);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
    await rm(mirrorRoot, { recursive: true, force: true });
    await rm(downloadsRoot, { recursive: true, force: true });
  }
});

test("preserves QA evidence logs while cleaning generated junk", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-evidence-"));

  try {
    const qaLog = path.join(
      rootDir,
      "artifacts",
      "qa",
      "release-preflight.log",
    );
    const finalQaLog = path.join(
      rootDir,
      "release",
      "evidence",
      "final-qa-command-logs",
      "apk-arm64-apksigner-verify.log",
    );
    const tempLog = path.join(rootDir, "tmp", "transient.log");

    await touch(qaLog, "qa evidence");
    await touch(finalQaLog, "final evidence");
    await touch(tempLog, "temporary log");

    const result = await cleanGeneratedJunk({ rootDir, tempRoots: [] });

    assert.equal(result.errors.length, 0);
    assert.equal(existsSync(qaLog), true);
    assert.equal(existsSync(finalQaLog), true);
    assert.equal(existsSync(tempLog), false);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("removes stale Gradle caches under artifacts while preserving QA runtime evidence", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-gradle-"));

  try {
    const qaRuntimeEvidence = path.join(
      rootDir,
      "artifacts",
      "qa",
      "android-qa-universal-route-fixed-runtime-20260729",
      "logcat.txt",
    );
    await touch(
      path.join(
        rootDir,
        "artifacts",
        "qa",
        "gradle-home-20260720",
        "cache.bin",
      ),
    );
    await touch(
      path.join(rootDir, "artifacts", "qa", "gradle-user-home", "cache.bin"),
    );
    await touch(
      path.join(rootDir, "artifacts", "tmp", "gradle-temp", "cache.bin"),
    );
    await touch(
      path.join(rootDir, "artifacts", "tmp", "gradle-home", "cache.bin"),
    );
    await touch(qaRuntimeEvidence, "runtime evidence");

    const result = await cleanGeneratedJunk({ rootDir, tempRoots: [] });

    assert.equal(result.errors.length, 0);
    assert.equal(
      existsSync(path.join(rootDir, "artifacts", "qa", "gradle-home-20260720")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "artifacts", "qa", "gradle-user-home")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "artifacts", "tmp", "gradle-temp")),
      false,
    );
    assert.equal(
      existsSync(path.join(rootDir, "artifacts", "tmp", "gradle-home")),
      false,
    );
    assert.equal(existsSync(qaRuntimeEvidence), true);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("removes generated junk from configured external artifact roots", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-root-"));
  const externalRoot = await mkdtemp(path.join(tmpdir(), "salary-artifacts-"));

  try {
    await touch(path.join(externalRoot, "gradle-home-20260729", "cache.bin"));
    await touch(path.join(externalRoot, "gradle-user-home-x86", "cache.bin"));
    await touch(path.join(externalRoot, "android-subprojects", "build.bin"));
    await touch(path.join(externalRoot, "qa-release-build-20260726.log"));
    await touch(path.join(externalRoot, "qa", "runtime", "summary.json"));
    await touch(path.join(externalRoot, "keystores", "qa-keystore.jks"));

    const result = await cleanGeneratedJunk({
      rootDir,
      tempRoots: [externalRoot],
    });

    assert.equal(result.errors.length, 0);
    assert.equal(
      existsSync(path.join(externalRoot, "gradle-home-20260729")),
      false,
    );
    assert.equal(
      existsSync(path.join(externalRoot, "gradle-user-home-x86")),
      false,
    );
    assert.equal(
      existsSync(path.join(externalRoot, "android-subprojects")),
      false,
    );
    assert.equal(
      existsSync(path.join(externalRoot, "qa-release-build-20260726.log")),
      false,
    );
    assert.equal(
      existsSync(path.join(externalRoot, "qa", "runtime", "summary.json")),
      true,
    );
    assert.equal(
      existsSync(path.join(externalRoot, "keystores", "qa-keystore.jks")),
      true,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
    await rm(externalRoot, { recursive: true, force: true });
  }
});

test("parses Windows subst mappings", () => {
  assert.deepEqual(
    parseSubstMappings(
      [
        "Z:\\: => C:\\Users\\PC\\Desktop\\salary-hijacking-platform",
        "Y:\\: => C:\\Users\\PC\\Desktop\\salary-hijacking-work",
      ].join("\r\n"),
    ),
    [
      {
        aliasRoot: "Z:\\",
        drive: "Z",
        targetRootDir: "C:\\Users\\PC\\Desktop\\salary-hijacking-platform",
      },
      {
        aliasRoot: "Y:\\",
        drive: "Y",
        targetRootDir: "C:\\Users\\PC\\Desktop\\salary-hijacking-work",
      },
    ],
  );
});

test("collects only subst mappings that point at the current repository root", () => {
  const calls = [];
  const rootDir = "C:\\Users\\PC\\Desktop\\salary-hijacking-platform";
  const spawnSubst = (command, args) => {
    calls.push([command, args]);
    return {
      status: 0,
      stdout: [
        "Z:\\: => C:\\Users\\PC\\Desktop\\salary-hijacking-platform",
        "Y:\\: => C:\\Users\\PC\\Desktop\\salary-hijacking-work",
      ].join("\n"),
    };
  };

  assert.deepEqual(
    collectStaleSubstTargets({
      platform: "win32",
      rootDir,
      spawn: spawnSubst,
    }),
    [
      {
        aliasRoot: "Z:\\",
        drive: "Z",
        kind: "subst",
        path: "Z:\\",
        targetRootDir: "C:\\Users\\PC\\Desktop\\salary-hijacking-platform",
      },
    ],
  );
  assert.deepEqual(calls, [["subst", []]]);
});

test("cleanGeneratedJunk removes stale subst mappings for the current repository root", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-subst-"));
  const calls = [];
  const spawnSubst = (command, args) => {
    calls.push([command, args]);
    if (args.length === 0) {
      return {
        status: 0,
        stdout: `Z:\\: => ${rootDir}\nY:\\: => C:\\Users\\PC\\Desktop\\salary-hijacking-work\n`,
      };
    }
    return { status: 0, stdout: "" };
  };

  try {
    const result = await cleanGeneratedJunk({
      rootDir,
      spawnSubst,
      platform: "win32",
      tempRoots: [],
    });

    assert.equal(result.errors.length, 0);
    assert.deepEqual(
      result.removed.filter((target) => target.kind === "subst"),
      [
        {
          aliasRoot: "Z:\\",
          bytes: 0,
          drive: "Z",
          kind: "subst",
          path: "Z:\\",
          targetRootDir: rootDir,
        },
      ],
    );
    assert.deepEqual(calls, [
      ["subst", []],
      ["subst", ["Z:", "/D"]],
    ]);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("removes only Salary Hijacking temp fixtures from configured temp roots", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-repo-"));
  const tempRoot = await mkdtemp(path.join(tmpdir(), "salary-junk-temp-"));

  try {
    await touch(path.join(tempRoot, "salary-hijacking-proof-1", "proof.tmp"));
    await touch(
      path.join(tempRoot, "salary-release-ready-abc123", "proof.tmp"),
    );
    await touch(path.join(tempRoot, "salary-db-evidence-abc123", "proof.tmp"));
    await touch(
      path.join(tempRoot, "chrome-clean-fintech-home-123", "screenshot.tmp"),
    );
    await touch(path.join(tempRoot, "metro-cache", "bundle-cache.bin"));
    await touch(path.join(tempRoot, "metro-file-map-abc123", "map.bin"));
    await touch(path.join(tempRoot, "haste-map-abc123", "map.bin"));
    await touch(path.join(tempRoot, "jest_worker_abc123", "cache.bin"));
    await touch(path.join(tempRoot, "unrelated-tool-cache", "keep.tmp"));

    const result = await cleanGeneratedJunk({ rootDir, tempRoots: [tempRoot] });

    assert.equal(result.errors.length, 0);
    assert.equal(
      existsSync(path.join(tempRoot, "salary-hijacking-proof-1")),
      false,
    );
    assert.equal(
      existsSync(path.join(tempRoot, "salary-release-ready-abc123")),
      false,
    );
    assert.equal(
      existsSync(path.join(tempRoot, "salary-db-evidence-abc123")),
      false,
    );
    assert.equal(
      existsSync(path.join(tempRoot, "chrome-clean-fintech-home-123")),
      false,
    );
    assert.equal(existsSync(path.join(tempRoot, "metro-cache")), false);
    assert.equal(
      existsSync(path.join(tempRoot, "metro-file-map-abc123")),
      false,
    );
    assert.equal(existsSync(path.join(tempRoot, "haste-map-abc123")), false);
    assert.equal(existsSync(path.join(tempRoot, "jest_worker_abc123")), false);
    assert.equal(existsSync(path.join(tempRoot, "unrelated-tool-cache")), true);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("removes matching Metro temp files as generated junk", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-repo-"));
  const tempRoot = await mkdtemp(
    path.join(tmpdir(), "salary-junk-temp-files-"),
  );

  try {
    await touch(path.join(tempRoot, "metro-file-map-abc123"), "cache");
    await touch(path.join(tempRoot, "haste-map-abc123"), "cache");
    await touch(path.join(tempRoot, "unrelated-cache-file"), "keep");

    const result = await cleanGeneratedJunk({ rootDir, tempRoots: [tempRoot] });

    assert.equal(result.errors.length, 0);
    assert.equal(
      existsSync(path.join(tempRoot, "metro-file-map-abc123")),
      false,
    );
    assert.equal(existsSync(path.join(tempRoot, "haste-map-abc123")), false);
    assert.equal(existsSync(path.join(tempRoot, "unrelated-cache-file")), true);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("removes large Codex Android build temp directories from configured temp roots", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "salary-junk-repo-"));
  const tempRoot = await mkdtemp(path.join(tmpdir(), "salary-junk-codex-tmp-"));

  try {
    await touch(path.join(tempRoot, "salary-expo-android-abc123", "apk.bin"));
    await touch(path.join(tempRoot, "native-platform123456dir", "cmake.bin"));
    await touch(path.join(tempRoot, "node-compile-cache", "cache.bin"));
    await touch(path.join(tempRoot, "v8-compile-cache", "cache.bin"));
    await touch(path.join(tempRoot, "hsperfdata_PC", "perf.bin"));
    await touch(path.join(tempRoot, "unrelated-android-cache", "keep.tmp"));

    const result = await cleanGeneratedJunk({ rootDir, tempRoots: [tempRoot] });

    assert.equal(result.errors.length, 0);
    assert.equal(
      existsSync(path.join(tempRoot, "salary-expo-android-abc123")),
      false,
    );
    assert.equal(
      existsSync(path.join(tempRoot, "native-platform123456dir")),
      false,
    );
    assert.equal(existsSync(path.join(tempRoot, "node-compile-cache")), false);
    assert.equal(existsSync(path.join(tempRoot, "v8-compile-cache")), false);
    assert.equal(existsSync(path.join(tempRoot, "hsperfdata_PC")), false);
    assert.equal(
      existsSync(path.join(tempRoot, "unrelated-android-cache")),
      true,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("includes external Codex temp roots in the default cleanup scan", () => {
  assert(defaultTempRoots().includes(path.resolve("D:\\codex-temp")));
  assert(defaultTempRoots().includes(path.resolve("D:\\codex-tmp")));
});

test("rejects cleanup paths outside the repository root", () => {
  const rootDir = path.join(tmpdir(), "salary-junk-safe-root");
  const outsidePath = path.dirname(rootDir);

  assert.throws(
    () => assertInsideRoot(rootDir, outsidePath),
    /outside the repository root/,
  );
});
