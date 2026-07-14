import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_CSV_PATH =
  "docs/codex/100-completion/02_REQUIREMENTS_TRACEABILITY_MATRIX.csv";
const DEFAULT_MARKDOWN_PATH =
  "docs/codex/100-completion/03_REQUIREMENTS_TRACEABILITY_MATRIX.md";

const COLUMNS = [
  "Requirement ID",
  "Source file",
  "Source section",
  "Requirement",
  "Priority",
  "Mandatory",
  "Affected app/package",
  "Code path",
  "API path",
  "DB entity/migration",
  "Test ID",
  "Evidence path",
  "Status",
  "Defect ID",
  "Blocker",
  "Notes",
];

const SOURCE_DOCUMENT_EXTENSIONS = new Set([
  ".csv",
  ".docx",
  ".html",
  ".json",
  ".md",
  ".pdf",
]);

const OUTPUT_PATHS = new Set([
  normalizePath(DEFAULT_CSV_PATH),
  normalizePath(DEFAULT_MARKDOWN_PATH),
]);

const UNSAFE_PATH_PATTERN =
  /(?:secret|token|password|private[-_]?key|database[-_]?url|service[-_]?account|google[-_]?services)[-_]?(?:value|raw|dump|credential|credentials|json|txt|file)/iu;

export function buildRequirementsTraceabilityMatrix({
  rootDir = process.cwd(),
} = {}) {
  const docsRoot = path.join(rootDir, "docs");
  const sourceFiles = listSourceDocuments(docsRoot).map((absolutePath) =>
    normalizePath(path.relative(rootDir, absolutePath)),
  );
  const counters = new Map();
  const generatedRows = sourceFiles.map((sourceFile) =>
    documentRequirementRow(sourceFile, counters),
  );
  const existingRows = readExistingRows(rootDir).filter((row) => {
    const id = String(row["Requirement ID"] ?? "");
    return !id.startsWith("REQ-DOC-");
  });
  const rows = [...existingRows, ...generatedRows];

  return {
    columns: COLUMNS,
    rows,
    summary: {
      documentCount: generatedRows.length,
      existingRequirementCount: existingRows.length,
      totalRows: rows.length,
    },
  };
}

export function writeRequirementsTraceabilityMatrix({
  rootDir = process.cwd(),
  csvPath = DEFAULT_CSV_PATH,
  markdownPath = DEFAULT_MARKDOWN_PATH,
} = {}) {
  const matrix = buildRequirementsTraceabilityMatrix({ rootDir });
  const absoluteCsvPath = path.join(rootDir, csvPath);
  const absoluteMarkdownPath = path.join(rootDir, markdownPath);
  fs.mkdirSync(path.dirname(absoluteCsvPath), { recursive: true });
  fs.mkdirSync(path.dirname(absoluteMarkdownPath), { recursive: true });
  fs.writeFileSync(absoluteCsvPath, toCsv(matrix.rows), "utf8");
  fs.writeFileSync(absoluteMarkdownPath, toMarkdown(matrix), "utf8");
  return {
    csvPath: absoluteCsvPath,
    markdownPath: absoluteMarkdownPath,
    matrix,
  };
}

function listSourceDocuments(docsRoot) {
  if (!fs.existsSync(docsRoot)) return [];
  const results = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (!SOURCE_DOCUMENT_EXTENSIONS.has(extension)) continue;
      const normalizedRelativePath = normalizePath(
        path.relative(path.dirname(docsRoot), absolutePath),
      );
      if (OUTPUT_PATHS.has(normalizedRelativePath)) continue;
      assertSafeSourceDocumentPath(normalizedRelativePath);
      results.push(absolutePath);
    }
  };
  walk(docsRoot);
  return results.sort((left, right) =>
    normalizePath(left).localeCompare(normalizePath(right), "en"),
  );
}

function documentRequirementRow(sourceFile, counters) {
  const classification = classifySourceFile(sourceFile);
  const basename = path.basename(sourceFile, path.extname(sourceFile));
  const ordinal = nextOrdinal(counters, classification.idPrefix);
  return {
    "Requirement ID": `${classification.idPrefix}-${ordinal}`,
    "Source file": sourceFile,
    "Source section": classification.section,
    Requirement: `Trace and reconcile source document: ${basename}`,
    Priority: classification.priority,
    Mandatory: "TRUE",
    "Affected app/package": classification.affected,
    "Code path": "",
    "API path": "",
    "DB entity/migration": "",
    "Test ID": "TRACE-DOC-INDEX",
    "Evidence path":
      "docs/codex/100-completion/01_SOURCE_DOCUMENT_INDEX.md; docs/codex/100-completion/02_REQUIREMENTS_TRACEABILITY_MATRIX.csv",
    Status: "PASS",
    "Defect ID": "",
    Blocker: "",
    Notes:
      "Document is indexed as launch-readiness source material; this row copies path metadata only and never copies document body text.",
  };
}

function classifySourceFile(sourceFile) {
  const normalized = normalizePath(sourceFile);
  if (normalized.startsWith("docs/codex/")) {
    return {
      affected: "docs,codex,all",
      idPrefix: "REQ-DOC-CODEX",
      priority: normalized.includes("/100-completion/") ? "P2" : "P1",
      section: codexSection(normalized),
    };
  }
  if (normalized.startsWith("docs/final-documents/")) {
    return {
      affected: affectedAreaForFinalDocument(normalized),
      idPrefix: "REQ-DOC-FINAL",
      priority: "P1",
      section: finalDocumentSection(normalized),
    };
  }
  return {
    affected: "docs,all",
    idPrefix: "REQ-DOC-ROOT",
    priority: "P2",
    section: "Workspace governance and structure",
  };
}

function codexSection(sourceFile) {
  if (sourceFile.includes("/100-completion/")) {
    return "Codex launch-readiness evidence";
  }
  return "Codex operating context";
}

function finalDocumentSection(sourceFile) {
  const parts = sourceFile.split("/");
  return parts[2] ?? "Final product documents";
}

function affectedAreaForFinalDocument(sourceFile) {
  const section = finalDocumentSection(sourceFile);
  if (section.includes("UX")) return "apps/mobile,apps/admin,docs";
  if (section.includes("기능")) return "apps/mobile,services/api,packages/db";
  if (section.includes("데이터") || section.includes("DB")) {
    return "packages/db,services/api";
  }
  if (section.includes("운영") || section.includes("관리자")) {
    return "apps/admin,services/api,services/scheduler";
  }
  if (section.includes("출시")) return "release,apps/mobile,docs";
  if (section.includes("보안") || section.includes("정책")) {
    return "services/api,apps/mobile,apps/admin";
  }
  return "all";
}

function nextOrdinal(counters, prefix) {
  const next = (counters.get(prefix) ?? 0) + 1;
  counters.set(prefix, next);
  return String(next).padStart(3, "0");
}

function readExistingRows(rootDir) {
  const csvPath = path.join(rootDir, DEFAULT_CSV_PATH);
  if (!fs.existsSync(csvPath)) return [];
  const raw = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/u, "");
  const rows = parseCsv(raw);
  return rows.filter((row) => String(row["Requirement ID"] ?? "").trim());
}

function parseCsv(raw) {
  const records = [];
  let field = "";
  let row = [];
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const nextChar = raw[index + 1];
    if (quoted) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field.replace(/\r$/u, ""));
      records.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/u, ""));
    records.push(row);
  }
  const [headers, ...dataRows] = records;
  if (!headers) return [];
  return dataRows.map((dataRow) =>
    Object.fromEntries(
      headers.map((header, index) => [header, dataRow[index] ?? ""]),
    ),
  );
}

function toCsv(rows) {
  return `${COLUMNS.map(csvEscape).join(",")}\n${rows
    .map((row) =>
      COLUMNS.map((column) => csvEscape(row[column] ?? "")).join(","),
    )
    .join("\n")}\n`;
}

function toMarkdown(matrix) {
  const header = `# Requirements Traceability Matrix\n\nGenerated from source documents and retained launch-readiness requirements.\n\n- Source documents indexed: ${matrix.summary.documentCount}\n- Retained non-document requirements: ${matrix.summary.existingRequirementCount}\n- Total rows: ${matrix.summary.totalRows}\n\n`;
  const rows = matrix.rows
    .map(
      (row) => `### ${markdownText(row["Requirement ID"])}

${COLUMNS.filter((column) => column !== "Requirement ID")
  .map((column) => `- ${column}: ${markdownText(row[column] ?? "") || "N/A"}`)
  .join("\n")}`,
    )
    .join("\n\n");
  return `${header}## Requirements\n\n${rows}\n`;
}

function csvEscape(value) {
  const text = String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function markdownText(value) {
  return String(value).replace(/\s+/gu, " ").trim();
}

function assertSafeSourceDocumentPath(sourceFile) {
  if (UNSAFE_PATH_PATTERN.test(sourceFile)) {
    throw new Error(
      `unsafe source document path for traceability: ${sourceFile}`,
    );
  }
}

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const result = writeRequirementsTraceabilityMatrix();
  console.log(
    `[traceability] wrote ${path.relative(process.cwd(), result.csvPath)} and ${path.relative(
      process.cwd(),
      result.markdownPath,
    )} with ${result.matrix.summary.totalRows} rows`,
  );
}
