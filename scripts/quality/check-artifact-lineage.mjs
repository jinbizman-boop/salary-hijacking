#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const FORTY_HEX = /^[0-9a-f]{40}$/iu;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findValuesByKey(value, key, out = []) {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    value.forEach((item) => findValuesByKey(item, key, out));
    return out;
  }
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (entryKey === key) out.push(String(entryValue ?? ""));
    findValuesByKey(entryValue, key, out);
  }
  return out;
}

function readRcSourceSha(rootDir) {
  const executionStatePath = path.join(
    rootDir,
    "docs/audit/EXECUTION_STATE.md",
  );
  if (!fs.existsSync(executionStatePath)) return null;
  const text = fs.readFileSync(executionStatePath, "utf8");
  return text.match(/RC_SOURCE_SHA:\s*`([0-9a-f]{40})`/iu)?.[1] ?? null;
}

function normalizeArtifactPath(rootDir, value) {
  const text = String(value ?? "").trim();
  if (!text || /^https?:\/\//iu.test(text)) return null;
  return path.isAbsolute(text) ? text : path.resolve(rootDir, text);
}

function collectArtifactFiles(buildInfo) {
  return [
    buildInfo.file,
    buildInfo.primaryPhoneApk?.file,
    buildInfo.emulatorApk?.file,
  ].filter(Boolean);
}

export function runArtifactLineageCheck(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const buildInfoPath =
    options.buildInfoPath ??
    path.join(rootDir, "release/evidence/build-artifacts.json");
  const failures = [];

  if (!fs.existsSync(buildInfoPath)) {
    return {
      ok: false,
      failures: [
        `${path.relative(rootDir, buildInfoPath)}: missing build artifact metadata`,
      ],
      rcSourceSha: readRcSourceSha(rootDir),
      buildInfoPath,
    };
  }

  const buildInfo = readJson(buildInfoPath);
  const rcSourceSha = options.rcSourceSha ?? readRcSourceSha(rootDir);
  if (!rcSourceSha || !FORTY_HEX.test(rcSourceSha)) {
    failures.push(
      "docs/audit/EXECUTION_STATE.md: missing valid RC_SOURCE_SHA for artifact lineage",
    );
  }

  const gitCommits = [...new Set(findValuesByKey(buildInfo, "gitCommit"))];
  if (!gitCommits.length) {
    failures.push("release/evidence/build-artifacts.json: missing gitCommit");
  }
  for (const gitCommit of gitCommits) {
    if (!FORTY_HEX.test(gitCommit)) {
      failures.push(
        `release/evidence/build-artifacts.json: invalid gitCommit ${gitCommit || "<empty>"}`,
      );
    } else if (rcSourceSha && gitCommit !== rcSourceSha) {
      failures.push(
        `artifact gitCommit ${gitCommit} does not match RC_SOURCE_SHA ${rcSourceSha}`,
      );
    }
  }

  const artifactFiles = collectArtifactFiles(buildInfo);
  if (!artifactFiles.length) {
    failures.push(
      "release/evidence/build-artifacts.json: missing APK file path",
    );
  }
  for (const artifactFile of artifactFiles) {
    const resolved = normalizeArtifactPath(rootDir, artifactFile);
    if (resolved && !fs.existsSync(resolved)) {
      failures.push(`artifact file missing: ${artifactFile}`);
    }
  }

  const bundleShaValues = findValuesByKey(buildInfo, "bundleSha256").filter(
    Boolean,
  );
  if (!bundleShaValues.length) {
    failures.push(
      "release/evidence/build-artifacts.json: missing bundleSha256",
    );
  }

  return {
    ok: failures.length === 0,
    failures,
    rcSourceSha,
    buildInfoPath,
    gitCommits,
    artifactFiles,
    bundleShaValues,
  };
}

function main() {
  const result = runArtifactLineageCheck();
  if (result.ok) {
    console.log(
      `[artifact-lineage] PASS rcSourceSha=${result.rcSourceSha} gitCommits=${result.gitCommits.join(",")}`,
    );
    return;
  }
  console.error("[artifact-lineage] validation failed:");
  result.failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
