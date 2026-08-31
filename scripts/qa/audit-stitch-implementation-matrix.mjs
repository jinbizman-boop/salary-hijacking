#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultZipPath =
  "C:/Users/PC/Downloads/stitch_salary_hijacking_design_system_classified.zip";
const defaultRepoCatalogPath = resolve(
  repoRoot,
  "docs/design/stitch/2026-07-16/stitch-screen-inventory.csv",
);
const defaultMatrixPath = resolve(
  repoRoot,
  "docs/audit/IMPLEMENTATION_MATRIX.csv",
);
const defaultJsonPath = resolve(
  repoRoot,
  "artifacts/qa/stitch-matrix-audit-current.json",
);
const defaultMarkdownPath = resolve(
  repoRoot,
  "artifacts/qa/stitch-matrix-audit-current.md",
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

const truthMatrixRequiredColumns = [
  "requirement_id",
  "source_document",
  "source_location",
  "priority",
  "domain",
  "screen_code",
  "stitch_instance_code",
  "route_or_overlay",
  "state",
  "acceptance_criteria",
  "implementation_file",
  "visual_reference",
  "status",
  "evidence_path",
  "commit_sha",
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
    rawRows: rows.slice(1),
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

const hasColumns = (header, columns) =>
  columns.every((column) => header.includes(column));

const valueOf = (row, ...columns) => {
  for (const column of columns) {
    const value = row[column];
    if (value !== undefined && String(value).trim()) return String(value);
  }
  return "";
};

const artifactTypeFromAcceptance = (acceptanceCriteria) => {
  const firstToken = String(acceptanceCriteria ?? "")
    .trim()
    .match(/^(screen|modal|bottom_sheet|multi_state_board|flow_board)\b/u)?.[1];
  return firstToken ?? "";
};

const hasHtmlPrimaryReferenceNote = (row) => {
  const haystack = [
    row.notes,
    row.acceptance_criteria,
    row.visual_reference,
    row.evidence_path,
  ]
    .filter(Boolean)
    .join(";");
  return haystack.includes("HTML_PRIMARY_REFERENCE_REQUIRED");
};

const implementationPathAliases = [
  [
    "app-entry/screens/SplashScreen.tsx",
    "apps/mobile/src/features/auth/components/SplashLaunchScreen.tsx",
  ],
  ["auth/screens/LoginScreen.tsx", "apps/mobile/app/(auth)/login.tsx"],
  ["auth/screens/SignupScreen.tsx", "apps/mobile/app/(auth)/signup.tsx"],
  [
    "onboarding/screens/InitialPayrollSetupScreen.tsx",
    "apps/mobile/app/onboarding.tsx",
  ],
  [
    "payroll-onboarding/screens/PayrollOnboardingScreen.tsx",
    "apps/mobile/app/onboarding.tsx",
  ],
  [
    "salary/screens/SalaryHomeScreen.tsx",
    "apps/mobile/src/features/salary/components/SalaryHomeScreen.tsx",
  ],
  [
    "expenses/screens/ExpenseFormScreen.tsx",
    "apps/mobile/src/features/salary/components/VariableExpenseQuickAdd.tsx",
  ],
  [
    "notifications/screens/NotificationsScreen.tsx",
    "apps/mobile/src/features/notifications/components/NotificationScreen.tsx",
  ],
  [
    "notifications/screens/NotificationSettingsScreen.tsx",
    "apps/mobile/src/features/notifications/components/NotificationSettingsScreen.tsx",
  ],
  [
    "plan/screens/PlanScreen.tsx",
    "apps/mobile/src/features/plan/components/PlanScreen.tsx",
  ],
  [
    "plan/screens/PlanSettingsScreen.tsx",
    "apps/mobile/src/features/plan/components/PlanScreen.tsx",
  ],
  [
    "plan/screens/FixedExpenseFormScreen.tsx",
    "apps/mobile/src/features/plan/components/FixedExpenseFormScreen.tsx",
  ],
  [
    "plan/screens/FixedSavingsFormScreen.tsx",
    "apps/mobile/src/features/plan/components/FixedSavingsFormScreen.tsx",
  ],
  [
    "plan/screens/DailyBudgetFormScreen.tsx",
    "apps/mobile/src/features/plan/components/DailyBudgetFormScreen.tsx",
  ],
  [
    "lv-up/screens/LvUpHomeScreen.tsx",
    "apps/mobile/app/(tabs)/level/index.tsx",
  ],
  ["lv-up/screens/ReadingLvUpScreen.tsx", "apps/mobile/app/level/reading.tsx"],
  ["lv-up/screens/ReadingLevelScreen.tsx", "apps/mobile/app/level/reading.tsx"],
  ["lv-up/screens/NewsLvUpScreen.tsx", "apps/mobile/app/level/news.tsx"],
  ["lv-up/screens/NewsLevelScreen.tsx", "apps/mobile/app/level/news.tsx"],
  ["lv-up/screens/EnglishLvUpScreen.tsx", "apps/mobile/app/level/english.tsx"],
  ["lv-up/screens/EnglishLevelScreen.tsx", "apps/mobile/app/level/english.tsx"],
  ["lv-up/screens/HealthLvUpScreen.tsx", "apps/mobile/app/level/health.tsx"],
  ["lv-up/screens/HealthLevelScreen.tsx", "apps/mobile/app/level/health.tsx"],
  [
    "community/screens/CommunityScreen.tsx",
    "apps/mobile/app/(tabs)/community/index.tsx",
  ],
  [
    "community/screens/CommentThreadScreen.tsx",
    "apps/mobile/app/community/[postId].tsx",
  ],
  [
    "community/screens/PostDetailScreen.tsx",
    "apps/mobile/app/community/[postId].tsx",
  ],
  [
    "community/screens/PostComposeScreen.tsx",
    "apps/mobile/app/community/write.tsx",
  ],
  [
    "my/screens/MyPageScreen.tsx",
    "apps/mobile/src/features/profile/components/ProfileScreen.tsx",
  ],
  [
    "my/screens/ProfileSettingsScreen.tsx",
    "apps/mobile/src/features/profile/components/ProfileDetailScreen.tsx",
  ],
  [
    "my/screens/AccountSettingsScreen.tsx",
    "apps/mobile/app/profile/account.tsx",
  ],
  ["my/screens/MyPostsScreen.tsx", "apps/mobile/app/profile/community.tsx"],
  ["my/screens/MyLvUpScreen.tsx", "apps/mobile/app/profile/level.tsx"],
  ["support/screens/InquiryScreen.tsx", "apps/mobile/app/profile/support.tsx"],
  ["support/screens/NoticeScreen.tsx", "apps/mobile/app/profile/notices.tsx"],
  ["policy/screens/TermsConsentScreen.tsx", "apps/mobile/app/onboarding.tsx"],
  [
    "common/screens/CommonStateScreen.tsx",
    "apps/mobile/src/shared/ui/states/CommonStateScreen.tsx",
  ],
  ["community/components/", "apps/mobile/src/features/community/components/"],
  ["lv-up/components/", "apps/mobile/src/features/level/components/"],
  ["plan/components/", "apps/mobile/src/features/plan/components/"],
  ["expenses/components/", "apps/mobile/src/features/expenses/components/"],
  ["auth/components/", "apps/mobile/src/features/auth/components/"],
  ["my/components/", "apps/mobile/src/features/profile/components/"],
  ["shared/ui/", "apps/mobile/src/shared/ui/"],
  ["features/", "apps/mobile/src/features/"],
  ["shared/", "apps/mobile/src/shared/"],
];

const toSlash = (value) => String(value ?? "").replaceAll("\\", "/");
const isFortyHex = (value) =>
  /^[0-9a-f]{40}$/iu.test(String(value ?? "").trim());
const isEvidencePathToken = (value) => {
  const token = String(value ?? "").trim();
  if (!token) return true;
  if (/^https?:\/\//iu.test(token)) return true;
  if (/^[A-Za-z]:[\\/]/u.test(token)) return true;
  return /[\\/]/u.test(token) && /\.[A-Za-z0-9]{1,12}$/u.test(token);
};
const hasOnlyEvidencePathTokens = (value) =>
  String(value ?? "")
    .split(";")
    .every(isEvidencePathToken);

const resolveImplementationFile = (implementationFile, rootDir) => {
  const normalized = toSlash(implementationFile).trim();
  if (!normalized) return "";
  const candidates = [];
  const pushCandidate = (candidate) => {
    if (!candidate) return;
    if (!candidates.includes(candidate)) candidates.push(candidate);
  };

  if (isAbsolute(normalized) || /^[A-Za-z]:\//u.test(normalized)) {
    pushCandidate(normalized);
  } else {
    const aliasInputs = normalized.startsWith("features/")
      ? [normalized, normalized.slice("features/".length)]
      : [normalized];
    for (const aliasInput of aliasInputs) {
      for (const [from, to] of implementationPathAliases) {
        if (aliasInput === from || aliasInput.startsWith(from)) {
          pushCandidate(resolve(rootDir, to, aliasInput.slice(from.length)));
        }
      }
    }
    pushCandidate(resolve(rootDir, normalized));
    pushCandidate(resolve(rootDir, "apps/mobile/src", normalized));
  }

  return (
    candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? ""
  );
};

export function auditStitchImplementationMatrix({
  catalog,
  matrixCsv,
  rootDir = repoRoot,
  checkImplementationFiles = false,
}) {
  const parsed = parseCsv(matrixCsv);
  const matrixRows = parsed.rows;
  const usingTruthMatrix = hasColumns(
    parsed.header,
    truthMatrixRequiredColumns,
  );
  const usingScreenMatrix = hasColumns(parsed.header, requiredColumns);
  const catalogScreens = catalog.screens ?? [];
  const malformedCsvRows = parsed.rawRows
    .map((values, index) => ({
      line: index + 2,
      expectedColumns: parsed.header.length,
      actualColumns: values.length,
    }))
    .filter((row) => row.actualColumns !== row.expectedColumns);
  const malformedTruthRows = usingTruthMatrix
    ? matrixRows
        .map((row, index) => ({
          line: index + 2,
          requirement_id: String(row.requirement_id ?? "").trim(),
          evidence_path: String(row.evidence_path ?? "").trim(),
          commit_sha: String(row.commit_sha ?? "").trim(),
        }))
        .filter(
          (row) =>
            (row.evidence_path &&
              !hasOnlyEvidencePathTokens(row.evidence_path)) ||
            (row.commit_sha && !isFortyHex(row.commit_sha)),
        )
    : [];
  const catalogInstanceCodes = new Set(
    catalogScreens.map((screen) => screen.instance_code),
  );
  const matrixInstanceCodes = new Set(
    matrixRows
      .map((row) => valueOf(row, "instance_code", "stitch_instance_code"))
      .filter(Boolean),
  );
  const missingColumns =
    usingScreenMatrix || usingTruthMatrix
      ? []
      : requiredColumns.filter((column) => !parsed.header.includes(column));
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
    valueOf(row, "instance_code", "stitch_instance_code").startsWith("SCR-029"),
  ).length;
  const mojibakeRows = matrixRows
    .filter((row) => mojibakePattern.test(row.screen_name_ko))
    .map((row) => valueOf(row, "instance_code", "stitch_instance_code"));
  const catalogByInstanceCode = new Map(
    catalogScreens.map((screen) => [screen.instance_code, screen]),
  );
  const corruptPngRowsMissingHtmlPrimaryReference = matrixRows
    .filter((row) => {
      const instanceCode = valueOf(
        row,
        "instance_code",
        "stitch_instance_code",
      );
      const catalogScreen = catalogByInstanceCode.get(instanceCode);
      return (
        catalogScreen?.png_status === "CORRUPT" &&
        !hasHtmlPrimaryReferenceNote(row)
      );
    })
    .map((row) => valueOf(row, "instance_code", "stitch_instance_code"));
  const missingImplementationFiles = checkImplementationFiles
    ? matrixRows
        .filter((row) => {
          const instanceCode = valueOf(
            row,
            "instance_code",
            "stitch_instance_code",
          );
          return instanceCode && catalogInstanceCodes.has(instanceCode);
        })
        .map((row) => {
          const implementationFile = valueOf(row, "implementation_file");
          const resolvedPath = resolveImplementationFile(
            implementationFile,
            rootDir,
          );
          return {
            instance_code: valueOf(
              row,
              "instance_code",
              "stitch_instance_code",
            ),
            implementation_file: implementationFile,
            resolved_path: resolvedPath,
            exists: Boolean(resolvedPath && existsSync(resolvedPath)),
          };
        })
        .filter((row) => !row.exists)
        .map(({ exists: _exists, ...row }) => row)
    : [];
  const overclaimedPassRows = usingScreenMatrix
    ? matrixRows
        .filter((row) => {
          const status = String(row.status ?? "")
            .trim()
            .toUpperCase();
          if (status !== "PASS") return false;
          return !String(row.notes ?? "").includes(
            "FINAL_ANDROID_PRODUCTION_VISUAL_A11Y_VERIFIED",
          );
        })
        .map((row) => valueOf(row, "instance_code", "stitch_instance_code"))
    : [];
  const statusCounts = countBy(
    matrixRows.map((row) => row.status || "UNKNOWN"),
  );
  const artifactTypeCounts = countBy(
    matrixRows
      .filter((row) =>
        catalogInstanceCodes.has(
          valueOf(row, "instance_code", "stitch_instance_code"),
        ),
      )
      .map(
        (row) =>
          valueOf(row, "artifact_type") ||
          artifactTypeFromAcceptance(row.acceptance_criteria) ||
          "UNKNOWN",
      ),
  );
  const catalogArtifactTypeCounts = countBy(
    catalogScreens.map((screen) => screen.artifact_type || "UNKNOWN"),
  );
  const ok =
    missingColumns.length === 0 &&
    malformedCsvRows.length === 0 &&
    malformedTruthRows.length === 0 &&
    missingCatalogInstanceCodes.length === 0 &&
    extraInstanceCodes.length === 0 &&
    mojibakeRows.length === 0 &&
    corruptPngRowsMissingHtmlPrimaryReference.length === 0 &&
    missingImplementationFiles.length === 0 &&
    overclaimedPassRows.length === 0;

  return {
    ok,
    totalRows: matrixRows.length,
    sourceCatalogItems: catalogScreens.length,
    syntheticRows,
    statusCounts,
    artifactTypeCounts,
    catalogArtifactTypeCounts,
    missingColumns,
    malformedCsvRows,
    malformedTruthRows,
    missingCatalogInstanceCodes,
    extraInstanceCodes,
    mojibakeRows,
    corruptPngRowsMissingHtmlPrimaryReference,
    implementationFilesChecked: checkImplementationFiles,
    missingImplementationFiles,
    overclaimedPassRows,
  };
}

export function readRepoClassifiedCatalog(catalogPath = defaultRepoCatalogPath) {
  const parsed = parseCsv(readFileSync(catalogPath, "utf8"));
  return {
    source: "repo-canonical-csv",
    screens: parsed.rows.map((row) => ({
      instance_code: row.instance_code,
      primary_code: row.primary_code,
      artifact_type: row.artifact_type,
      png_status: "OK",
    })),
  };
}

function readClassifiedCatalog(zipPath) {
  if (!existsSync(zipPath)) return readRepoClassifiedCatalog();
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
    `- Malformed CSV rows: ${audit.malformedCsvRows.length}`,
    `- Malformed truth rows: ${audit.malformedTruthRows.length}`,
    `- Missing catalog rows: ${audit.missingCatalogInstanceCodes.length}`,
    `- Extra non-catalog rows: ${audit.extraInstanceCodes.length}`,
    `- Mojibake rows: ${audit.mojibakeRows.length}`,
    `- Corrupt PNG rows missing HTML primary note: ${audit.corruptPngRowsMissingHtmlPrimaryReference.length}`,
    `- Missing implementation files: ${audit.missingImplementationFiles.length}`,
    `- Overclaimed PASS rows without final Android production visual/a11y proof: ${audit.overclaimedPassRows.length}`,
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
    audit.missingImplementationFiles.length > 0
      ? "## Missing Implementation Files"
      : "",
    audit.missingImplementationFiles.length > 0 ? "" : "",
    ...audit.missingImplementationFiles
      .slice(0, 100)
      .map(
        (row) =>
          `- ${row.instance_code}: ${row.implementation_file} -> ${row.resolved_path}`,
      ),
    audit.missingImplementationFiles.length > 100
      ? `- ...and ${audit.missingImplementationFiles.length - 100} more`
      : "",
    audit.malformedCsvRows.length > 0 ? "## Malformed CSV Rows" : "",
    audit.malformedCsvRows.length > 0 ? "" : "",
    ...audit.malformedCsvRows
      .slice(0, 100)
      .map(
        (row) =>
          `- line ${row.line}: expected ${row.expectedColumns}, got ${row.actualColumns}`,
      ),
    audit.malformedCsvRows.length > 100
      ? `- ...and ${audit.malformedCsvRows.length - 100} more`
      : "",
    audit.malformedTruthRows.length > 0 ? "## Malformed Truth Rows" : "",
    audit.malformedTruthRows.length > 0 ? "" : "",
    ...audit.malformedTruthRows
      .slice(0, 100)
      .map(
        (row) =>
          `- line ${row.line} ${row.requirement_id}: evidence_path="${row.evidence_path}" commit_sha="${row.commit_sha}"`,
      ),
    audit.malformedTruthRows.length > 100
      ? `- ...and ${audit.malformedTruthRows.length - 100} more`
      : "",
    audit.overclaimedPassRows.length > 0 ? "## Overclaimed PASS Rows" : "",
    audit.overclaimedPassRows.length > 0 ? "" : "",
    ...audit.overclaimedPassRows
      .slice(0, 100)
      .map((instanceCode) => `- ${instanceCode}`),
    audit.overclaimedPassRows.length > 100
      ? `- ...and ${audit.overclaimedPassRows.length - 100} more`
      : "",
  ].join("\n");
}

export function parseArgs(argv) {
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
    checkImplementationFiles: true,
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
