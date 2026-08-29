#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const mobileRoot = join(scriptDir, "..");
const scanRoots = ["app", "src"].map((entry) => join(mobileRoot, entry));

const excludedPathFragments = [
  "__tests__",
  ".test.",
  "tokens.ts",
  "clean-fintech-theme.ts",
  "assets",
  "stitch-state-registry.ts",
  "stitch-production-route-registry.ts",
];

const referencePathFragments = ["app/capture/", "src/features/capture/"];

const rawHexPattern = /#[0-9A-Fa-f]{6,8}\b/gu;
const rawFontSizePattern = /\bfontSize\s*:\s*(?:Math\.)?\d+(?:\.\d+)?\b/gu;
const rawSpacingPattern =
  /\b(?:padding|paddingHorizontal|paddingVertical|paddingTop|paddingRight|paddingBottom|paddingLeft|margin|marginHorizontal|marginVertical|marginTop|marginRight|marginBottom|marginLeft|gap|rowGap|columnGap)\s*:\s*(?:Math\.)?\d+(?:\.\d+)?\b/gu;
const captureTermPattern = /\bcapture\b/giu;

function listSourceFiles(root) {
  const files = [];
  for (const name of readdirSync(root)) {
    const fullPath = join(root, name);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (/\.(?:ts|tsx)$/u.test(name)) files.push(fullPath);
  }
  return files;
}

function shouldScan(filePath) {
  const normalized = relative(mobileRoot, filePath).replace(/\\/gu, "/");
  return !excludedPathFragments.some((fragment) =>
    normalized.includes(fragment),
  );
}

function isReferenceFile(filePath) {
  const normalized = relative(mobileRoot, filePath).replace(/\\/gu, "/");
  return referencePathFragments.some((fragment) =>
    normalized.includes(fragment),
  );
}

function countMatches(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

const files = scanRoots.flatMap(listSourceFiles).filter(shouldScan);
const fileResults = files
  .map((filePath) => {
    const source = readFileSync(filePath, "utf8");
    const referenceFile = isReferenceFile(filePath);
    return {
      category: referenceFile ? "REFERENCE" : "PRODUCTION_UI",
      file: relative(mobileRoot, filePath).replace(/\\/gu, "/"),
      rawColorViolations: countMatches(source, rawHexPattern),
      rawTypographyViolations: countMatches(source, rawFontSizePattern),
      rawSpacingViolations: countMatches(source, rawSpacingPattern),
      captureOnlyReferences: referenceFile
        ? countMatches(source, captureTermPattern)
        : 0,
    };
  })
  .filter(
    (result) =>
      result.rawColorViolations > 0 ||
      result.rawTypographyViolations > 0 ||
      result.rawSpacingViolations > 0 ||
      result.captureOnlyReferences > 0,
  )
  .sort((left, right) => {
    const leftTotal =
      left.rawColorViolations +
      left.rawTypographyViolations +
      left.rawSpacingViolations +
      left.captureOnlyReferences;
    const rightTotal =
      right.rawColorViolations +
      right.rawTypographyViolations +
      right.rawSpacingViolations +
      right.captureOnlyReferences;
    return rightTotal - leftTotal || left.file.localeCompare(right.file);
  });

function reduceStyleTotals(results) {
  return results.reduce(
    (accumulator, result) => ({
      rawColorViolations:
        accumulator.rawColorViolations + result.rawColorViolations,
      rawTypographyViolations:
        accumulator.rawTypographyViolations + result.rawTypographyViolations,
      rawSpacingViolations:
        accumulator.rawSpacingViolations + result.rawSpacingViolations,
    }),
    {
      rawColorViolations: 0,
      rawTypographyViolations: 0,
      rawSpacingViolations: 0,
    },
  );
}

const productionResults = fileResults.filter(
  (result) => result.category === "PRODUCTION_UI",
);
const referenceResults = fileResults.filter(
  (result) => result.category === "REFERENCE",
);
const totals = reduceStyleTotals(fileResults);
const productionStyleViolations = reduceStyleTotals(productionResults);
const referenceStyleViolations = reduceStyleTotals(referenceResults);
const productionCaptureOnlyCount = productionResults.reduce(
  (count, result) => count + result.captureOnlyReferences,
  0,
);
const referenceCaptureOnlyCount = referenceResults.reduce(
  (count, result) => count + result.captureOnlyReferences,
  0,
);

const report = {
  status:
    productionStyleViolations.rawColorViolations === 0 &&
    productionStyleViolations.rawTypographyViolations === 0 &&
    productionStyleViolations.rawSpacingViolations === 0
      ? "PASS"
      : "BASELINE_VIOLATIONS_PRESENT",
  scannedFiles: files.length,
  ...totals,
  productionStyleViolations,
  referenceStyleViolations,
  captureOnly: {
    totalCount: productionCaptureOnlyCount + referenceCaptureOnlyCount,
    productionCount: productionCaptureOnlyCount,
    referenceCount: referenceCaptureOnlyCount,
  },
  topFiles: fileResults.slice(0, 20),
  topProductionFiles: productionResults.slice(0, 20),
  topReferenceFiles: referenceResults.slice(0, 20),
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
