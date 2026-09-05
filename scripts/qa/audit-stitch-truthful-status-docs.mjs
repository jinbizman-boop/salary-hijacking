#!/usr/bin/env node
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

const defaultRoots = ["docs/qa", "release/evidence/mobile-ui"];
const overclaimPatterns = [
  /\bPASS\s+305\s*\/\s*305\b/iu,
  /\b305\s*\/\s*305\s+PASS\b/iu,
  /\bPASS\s*:\s*305\b/iu,
  /\bPASS\s+305\s*\/\s*PARTIAL\s+0\s*\/\s*FAIL\s+0\b/iu,
  /Classified Stitch matrix evidence is synchronized at 305\/305 PASS/iu,
];
const allowedWithdrawalPatterns = [
  /withdrawn/iu,
  /철회/u,
  /old 305\/305 PASS wording has been withdrawn/iu,
  /prior wording .* PASS 305\/305 .* withdrawn/iu,
];

function walk(root, relativeDir, files) {
  const absoluteDir = resolve(root, relativeDir);
  if (!existsSync(absoluteDir)) return;
  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const absolutePath = join(absoluteDir, entry.name);
    const relativePath = join(relativeDir, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      walk(root, relativePath, files);
      continue;
    }
    if (entry.isFile() && /\.(md|csv|json)$/u.test(entry.name))
      files.push(relativePath);
  }
}

function lineHasOverclaim(line) {
  return overclaimPatterns.some((pattern) => pattern.test(line));
}

function lineWithdrawsOverclaim(line) {
  return allowedWithdrawalPatterns.some((pattern) => pattern.test(line));
}

export function auditStitchTruthfulStatusDocs({
  root = repoRoot,
  roots = defaultRoots,
} = {}) {
  const files = [];
  for (const relativeRoot of roots) walk(root, relativeRoot, files);

  const failures = [];
  for (const file of files) {
    const absolutePath = resolve(root, file);
    if (!statSync(absolutePath).isFile()) continue;
    const lines = readFileSync(absolutePath, "utf8").split(/\r?\n/u);
    lines.forEach((line, index) => {
      if (!lineHasOverclaim(line)) return;
      if (lineWithdrawsOverclaim(line)) return;
      failures.push({
        file,
        line: index + 1,
        text: line.trim(),
      });
    });
  }

  return {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    scannedFiles: files.length,
    failedChecks: failures.length,
    failures,
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = auditStitchTruthfulStatusDocs();
  const jsonPath = argValue("--json");
  if (jsonPath) {
    writeFileSync(
      resolve(repoRoot, jsonPath),
      `${JSON.stringify(result, null, 2)}\n`,
    );
  }
  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        scannedFiles: result.scannedFiles,
        failedChecks: result.failedChecks,
      },
      null,
      2,
    ),
  );
  process.exitCode = result.ok ? 0 : 1;
}
