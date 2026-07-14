import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ARCHIVE_DIR = ".merged-from-salary-hijacking-main";
const MANIFEST_PATH = path.join(ARCHIVE_DIR, "merge-manifest.json");
const CONFLICTS_DIR = path.join(ARCHIVE_DIR, "conflicts");
const DEFAULT_OUTPUT_DIR = path.join("docs", "codex", "100-completion");
const DEFAULT_CSV_NAME = "85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv";
const DEFAULT_MD_NAME = "85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md";
const DEFAULT_DECISION_OVERRIDE_PATH = path.join(
  DEFAULT_OUTPUT_DIR,
  "85_MERGE_CONFLICT_PORT_DECISIONS.json",
);
const CLEANUP_COMPLETE_MESSAGE =
  "Merge conflict archive has already been removed; retained registers are the cleanup evidence.";

const SOURCE_OR_CONFIG_CATEGORIES = new Set([
  "admin-source",
  "backend-source",
  "mobile-source",
  "release-script",
  "repo-config",
]);

const GENERATED_OR_EVIDENCE_CATEGORIES = new Set([
  "docs-evidence",
  "generated-or-binary-evidence",
  "other release evidence",
]);

export function classifyMergeConflictPath(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const extension = path.posix.extname(normalized).toLowerCase();

  if (normalized === ".gitignore" || normalized === ".prettierignore") {
    return "repo-config";
  }
  if (normalized === "package.json" || normalized.endsWith("/package.json")) {
    return "repo-config";
  }
  if (normalized === "pnpm-lock.yaml") return "repo-config";
  if (normalized.startsWith("apps/admin/")) return "admin-source";
  if (
    normalized.startsWith("services/") ||
    normalized.startsWith("packages/")
  ) {
    return "backend-source";
  }
  if (normalized.startsWith("apps/mobile/")) {
    if (
      normalized.startsWith("apps/mobile/assets/") ||
      normalized.includes("/assets/")
    ) {
      return "generated-or-binary-evidence";
    }
    return "mobile-source";
  }
  if (normalized.startsWith("scripts/")) return "release-script";
  if (normalized.startsWith("docs/")) return "docs-evidence";
  if (normalized.startsWith("release/evidence/")) {
    return "other release evidence";
  }
  if (normalized.startsWith("release/screenshots/")) {
    return "generated-or-binary-evidence";
  }
  if (
    [".png", ".jpg", ".jpeg", ".webp", ".gif", ".apk", ".aab", ".zip"].includes(
      extension,
    )
  ) {
    return "generated-or-binary-evidence";
  }
  if (normalized.startsWith("release/")) return "other release evidence";
  if (extension === ".md" || extension === ".json") return "docs-evidence";
  return "other release evidence";
}

export function buildMergeConflictArchiveRegister(
  rootDir = process.cwd(),
  {
    decisionOverridePath = path.join(rootDir, DEFAULT_DECISION_OVERRIDE_PATH),
  } = {},
) {
  const manifest = readManifest(rootDir);
  const decisionOverrides = readDecisionOverrides(decisionOverridePath);
  const conflictPaths = Array.isArray(manifest.conflictedDifferentFiles)
    ? manifest.conflictedDifferentFiles
    : [];

  const rows = conflictPaths.map((rawPath) => {
    const relativePath = normalizeRelativePath(rawPath);
    const archivePath = path.join(
      rootDir,
      CONFLICTS_DIR,
      ...relativePath.split("/"),
    );
    const currentPath = path.join(rootDir, ...relativePath.split("/"));
    const archiveExists = fs.existsSync(archivePath);
    const currentExists = fs.existsSync(currentPath);
    const archiveSha256 = archiveExists ? sha256File(archivePath) : "";
    const currentSha256 = currentExists ? sha256File(currentPath) : "";
    const byteIdentical =
      archiveSha256.length > 0 &&
      currentSha256.length > 0 &&
      archiveSha256 === currentSha256;
    const category = classifyMergeConflictPath(relativePath);
    const defaultDecision = decidePortAction({
      byteIdentical,
      category,
      currentExists,
    });
    const override = decisionOverrides.get(relativePath);
    const decision = override?.decision ?? defaultDecision;

    return {
      relativePath,
      category,
      archiveExists,
      currentExists,
      byteIdentical,
      archiveSha256,
      currentSha256,
      decision,
      action: override?.action ?? actionForDecision(decision),
      evidence: override?.evidence ?? [],
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    manifestPath: MANIFEST_PATH,
    archiveDir: ARCHIVE_DIR,
    summary: summarizeRows(rows),
    rows,
  };
}

export function writeMergeConflictArchiveRegister(
  rootDir = process.cwd(),
  { outputDir = path.join(rootDir, DEFAULT_OUTPUT_DIR) } = {},
) {
  const register = buildMergeConflictArchiveRegister(rootDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const csvPath = path.join(outputDir, DEFAULT_CSV_NAME);
  const markdownPath = path.join(outputDir, DEFAULT_MD_NAME);
  fs.writeFileSync(csvPath, formatCsv(register), "utf8");
  fs.writeFileSync(markdownPath, formatMarkdown(register), "utf8");
  return { csvPath, markdownPath, register };
}

export function getMergeConflictArchiveCleanupStatus(
  rootDir = process.cwd(),
  { outputDir = path.join(rootDir, DEFAULT_OUTPUT_DIR) } = {},
) {
  const archiveDir = path.join(rootDir, ARCHIVE_DIR);
  const manifestPath = path.join(rootDir, MANIFEST_PATH);
  const csvPath = path.join(outputDir, DEFAULT_CSV_NAME);
  const markdownPath = path.join(outputDir, DEFAULT_MD_NAME);
  const decisionOverridePath = path.join(
    outputDir,
    "85_MERGE_CONFLICT_PORT_DECISIONS.json",
  );
  const archivePresent = fs.existsSync(archiveDir);
  const manifestPresent = fs.existsSync(manifestPath);
  const registerExists = fs.existsSync(csvPath) && fs.existsSync(markdownPath);
  const decisionOverridesExist = fs.existsSync(decisionOverridePath);

  return {
    archiveDir: ARCHIVE_DIR,
    archivePresent,
    manifestPresent,
    registerExists,
    decisionOverridesExist,
    cleanupComplete:
      !archivePresent &&
      !manifestPresent &&
      registerExists &&
      decisionOverridesExist,
    csvPath,
    markdownPath,
    decisionOverridePath,
    message: CLEANUP_COMPLETE_MESSAGE,
  };
}

function readManifest(rootDir) {
  const manifestPath = path.join(rootDir, MANIFEST_PATH);
  return JSON.parse(stripBom(fs.readFileSync(manifestPath, "utf8")));
}

function readDecisionOverrides(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  const parsed = JSON.parse(stripBom(fs.readFileSync(filePath, "utf8")));
  const rows = Array.isArray(parsed.decisions) ? parsed.decisions : [];
  return new Map(
    rows
      .filter(
        (row) =>
          typeof row?.relativePath === "string" &&
          typeof row?.decision === "string" &&
          typeof row?.action === "string",
      )
      .map((row) => [
        normalizeRelativePath(row.relativePath),
        {
          decision: row.decision,
          action: row.action,
          evidence: Array.isArray(row.evidence)
            ? row.evidence.filter((item) => typeof item === "string")
            : [],
        },
      ]),
  );
}

function decidePortAction({ byteIdentical, category, currentExists }) {
  if (byteIdentical) return "INTEGRATED_IDENTICAL";
  if (!currentExists && SOURCE_OR_CONFIG_CATEGORIES.has(category)) {
    return "PORT_REQUIRED";
  }
  if (SOURCE_OR_CONFIG_CATEGORIES.has(category)) return "REVIEW_REQUIRED";
  if (GENERATED_OR_EVIDENCE_CATEGORIES.has(category)) {
    return currentExists ? "SUPERSEDED_BY_CURRENT_EVIDENCE" : "EXCLUDE_RUNTIME";
  }
  return "REVIEW_REQUIRED";
}

function actionForDecision(decision) {
  switch (decision) {
    case "INTEGRATED_IDENTICAL":
      return "No port needed; archive matches current file.";
    case "PORT_REQUIRED":
      return "Current file is missing; inspect and port if still required.";
    case "REVIEW_REQUIRED":
      return "Current file differs; semantic port review is required before archive deletion.";
    case "SUPERSEDED_BY_CURRENT_EVIDENCE":
      return "Do not port runtime code; keep current tracked evidence as authoritative.";
    case "EXCLUDE_RUNTIME":
      return "Exclude from runtime porting; archive is historical evidence or binary output.";
    default:
      return "Review required.";
  }
}

function summarizeRows(rows) {
  const countsByCategory = {};
  const countsByDecision = {};
  for (const row of rows) {
    countsByCategory[row.category] = (countsByCategory[row.category] ?? 0) + 1;
    countsByDecision[row.decision] = (countsByDecision[row.decision] ?? 0) + 1;
  }
  return {
    totalConflicts: rows.length,
    currentPathExists: rows.filter((row) => row.currentExists).length,
    missingCurrentPath: rows.filter((row) => !row.currentExists).length,
    byteIdentical: rows.filter((row) => row.byteIdentical).length,
    countsByCategory,
    countsByDecision,
  };
}

function formatCsv(register) {
  const headers = [
    "relativePath",
    "category",
    "archiveExists",
    "currentExists",
    "byteIdentical",
    "archiveSha256",
    "currentSha256",
    "decision",
    "action",
    "evidence",
  ];
  const rows = register.rows.map((row) =>
    headers.map((header) => csvCell(row[header])).join(","),
  );
  return `${headers.join(",")}\n${rows.join("\n")}\n`;
}

function formatMarkdown(register) {
  const lines = [
    "# Merge Conflict Port Decision Register",
    "",
    `Generated: ${register.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Total conflict files: ${register.summary.totalConflicts}`,
    `- Current path exists: ${register.summary.currentPathExists}`,
    `- Current path missing: ${register.summary.missingCurrentPath}`,
    `- Byte-identical: ${register.summary.byteIdentical}`,
    "",
    "## Decisions",
    "",
    "| Path | Category | Current Exists | Byte Identical | Decision | Action | Evidence |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of register.rows) {
    lines.push(
      `| ${markdownCell(row.relativePath)} | ${row.category} | ${row.currentExists ? "yes" : "no"} | ${row.byteIdentical ? "yes" : "no"} | ${row.decision} | ${markdownCell(row.action)} | ${markdownCell(row.evidence.join("; "))} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|");
}

function normalizeRelativePath(relativePath) {
  return String(relativePath ?? "")
    .replaceAll("\\", "/")
    .replace(/^\/+/u, "");
}

function stripBom(value) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const isMain = () => {
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return invoked === fileURLToPath(import.meta.url);
};

if (isMain()) {
  const cleanupStatus = getMergeConflictArchiveCleanupStatus(process.cwd());
  if (!cleanupStatus.manifestPresent) {
    console.log(JSON.stringify(cleanupStatus, null, 2));
    if (!cleanupStatus.cleanupComplete) {
      process.exitCode = 1;
    }
  } else {
    const { csvPath, markdownPath, register } =
      writeMergeConflictArchiveRegister(process.cwd());

    console.log(
      JSON.stringify(
        {
          csvPath,
          markdownPath,
          summary: register.summary,
        },
        null,
        2,
      ),
    );
  }
}
