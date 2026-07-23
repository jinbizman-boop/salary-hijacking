#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultZipPath =
  "C:/Users/PC/Downloads/stitch_salary_hijacking_design_system_classified.zip";
const defaultMatrixPath = resolve(
  repoRoot,
  "docs/qa/SCREEN_IMPLEMENTATION_MATRIX.csv",
);
const defaultJsonPath = resolve(
  repoRoot,
  "docs/qa/STITCH_IMPLEMENTATION_MATRIX_AUDIT.json",
);
const defaultMarkdownPath = resolve(
  repoRoot,
  "docs/qa/STITCH_IMPLEMENTATION_MATRIX_AUDIT.md",
);

const requiredColumns = [
  "source_folder",
  "instance_code",
  "primary_code",
  "screen_name_ko",
  "variant_slug",
  "state_code",
  "artifact_type",
  "route_or_overlay",
  "target_component",
  "recommended_component_path",
  "implementation_action",
  "code_html",
  "reference_png",
  "implementation_file",
  "unit_test",
  "e2e_test",
  "visual_test",
  "status",
  "notes",
];

const mojibakePattern = /[�]|(?:而|ㅻ|怨|湲|遺|鍌|쒒)/u;

export function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.length > 0 || field.length > 0) {
      pushField();
      rows.push(row);
      row = [];
    }
  };

  const input = String(text).replace(/^\uFEFF/u, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
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
      pushField();
      continue;
    }
    if (char === "\n") {
      pushRow();
      continue;
    }
    if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  const header = rows[0] ?? [];
  return {
    header,
    rows: rows
      .slice(1)
      .map((values) =>
        Object.fromEntries(
          header.map((name, index) => [name, values[index] ?? ""]),
        ),
      ),
  };
}

const countBy = (values) => {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
};

export function auditStitchImplementationMatrix({ catalog, matrixCsv }) {
  const parsed = parseCsv(matrixCsv);
  const matrixRows = parsed.rows;
  const catalogScreens = catalog.screens ?? [];
  const catalogInstanceCodes = new Set(
    catalogScreens.map((screen) => screen.instance_code),
  );
  const matrixInstanceCodes = new Set(
    matrixRows.map((row) => row.instance_code).filter(Boolean),
  );
  const missingColumns = requiredColumns.filter(
    (column) => !parsed.header.includes(column),
  );
  const missingCatalogInstanceCodes = [...catalogInstanceCodes]
    .filter((instanceCode) => !matrixInstanceCodes.has(instanceCode))
    .sort();
  const extraInstanceCodes = [...matrixInstanceCodes]
    .filter(
      (instanceCode) =>
        !catalogInstanceCodes.has(instanceCode) &&
        !String(instanceCode).startsWith("SCR-029"),
    )
    .sort();
  const syntheticRows = matrixRows.filter((row) =>
    String(row.instance_code).startsWith("SCR-029"),
  ).length;
  const mojibakeRows = matrixRows
    .filter((row) => mojibakePattern.test(row.screen_name_ko))
    .map((row) => row.instance_code);
  const catalogByInstanceCode = new Map(
    catalogScreens.map((screen) => [screen.instance_code, screen]),
  );
  const corruptPngRowsMissingHtmlPrimaryReference = matrixRows
    .filter((row) => {
      const catalogScreen = catalogByInstanceCode.get(row.instance_code);
      return (
        catalogScreen?.png_status === "CORRUPT" &&
        !String(row.notes).includes("HTML_PRIMARY_REFERENCE_REQUIRED")
      );
    })
    .map((row) => row.instance_code);
  const statusCounts = countBy(
    matrixRows.map((row) => row.status || "UNKNOWN"),
  );
  const artifactTypeCounts = countBy(
    matrixRows
      .filter((row) => catalogInstanceCodes.has(row.instance_code))
      .map((row) => row.artifact_type || "UNKNOWN"),
  );
  const catalogArtifactTypeCounts = countBy(
    catalogScreens.map((screen) => screen.artifact_type || "UNKNOWN"),
  );
  const ok =
    missingColumns.length === 0 &&
    missingCatalogInstanceCodes.length === 0 &&
    extraInstanceCodes.length === 0 &&
    mojibakeRows.length === 0 &&
    corruptPngRowsMissingHtmlPrimaryReference.length === 0;

  return {
    ok,
    totalRows: matrixRows.length,
    sourceCatalogItems: catalogScreens.length,
    syntheticRows,
    statusCounts,
    artifactTypeCounts,
    catalogArtifactTypeCounts,
    missingColumns,
    missingCatalogInstanceCodes,
    extraInstanceCodes,
    mojibakeRows,
    corruptPngRowsMissingHtmlPrimaryReference,
  };
}

function readClassifiedCatalog(zipPath) {
  const text = execFileSync(
    "tar",
    [
      "-xOf",
      zipPath,
      "stitch_salary_hijacking_design_system_classified/screen_catalog.json",
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(text);
}

function renderMarkdown(audit) {
  const statusRows = Object.entries(audit.statusCounts)
    .map(([status, count]) => `| ${status} | ${count} |`)
    .join("\n");
  const artifactRows = Object.entries(audit.catalogArtifactTypeCounts)
    .map(
      ([type, count]) =>
        `| ${type} | ${count} | ${audit.artifactTypeCounts[type] ?? 0} |`,
    )
    .join("\n");
  return [
    "# Stitch Implementation Matrix Audit",
    "",
    `Status: ${audit.ok ? "PASS" : "FAIL"}`,
    "",
    `- Classified catalog items: ${audit.sourceCatalogItems}`,
    `- Matrix rows: ${audit.totalRows}`,
    `- Synthetic rows: ${audit.syntheticRows}`,
    `- Missing catalog rows: ${audit.missingCatalogInstanceCodes.length}`,
    `- Extra non-catalog rows: ${audit.extraInstanceCodes.length}`,
    `- Mojibake rows: ${audit.mojibakeRows.length}`,
    `- Corrupt PNG rows missing HTML primary note: ${audit.corruptPngRowsMissingHtmlPrimaryReference.length}`,
    "",
    "## Status Counts",
    "",
    "| Status | Count |",
    "|---|---:|",
    statusRows,
    "",
    "## Artifact Type Coverage",
    "",
    "| Artifact type | Catalog | Matrix |",
    "|---|---:|---:|",
    artifactRows,
    "",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    zipPath: defaultZipPath,
    matrixPath: defaultMatrixPath,
    jsonPath: defaultJsonPath,
    markdownPath: defaultMarkdownPath,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--zip") {
      options.zipPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--matrix") {
      options.matrixPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--json") {
      options.jsonPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--markdown") {
      options.markdownPath = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  const options = parseArgs(process.argv.slice(2));
  const audit = auditStitchImplementationMatrix({
    catalog: readClassifiedCatalog(options.zipPath),
    matrixCsv: readFileSync(options.matrixPath, "utf8"),
  });
  mkdirSync(dirname(options.jsonPath), { recursive: true });
  mkdirSync(dirname(options.markdownPath), { recursive: true });
  writeFileSync(
    options.jsonPath,
    `${JSON.stringify(audit, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(options.markdownPath, `${renderMarkdown(audit)}\n`, "utf8");
  console.log(JSON.stringify(audit, null, 2));
  process.exitCode = audit.ok ? 0 : 1;
}
