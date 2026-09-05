#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const DEFAULT_MIGRATIONS_DIR = "database/migrations";

const OWNERSHIP_COLUMNS = [
  "user_id",
  "author_id",
  "reporter_id",
  "created_by",
  "owner_user_id",
];

const DESTRUCTIVE_DDL_PATTERN =
  /\b(drop\s+table|truncate\s+table|delete\s+from|alter\s+table\s+[^;]+drop\s+column)\b/i;

const normalize = (value) => value.replace(/\s+/g, " ").trim();

function readSqlFiles(rootDir, migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const absoluteDir = path.join(rootDir, migrationsDir);
  if (!fs.existsSync(absoluteDir)) return [];
  return fs
    .readdirSync(absoluteDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => {
      const absolutePath = path.join(absoluteDir, fileName);
      return {
        fileName,
        filePath: path.join(migrationsDir, fileName).replaceAll("\\", "/"),
        text: fs.readFileSync(absolutePath, "utf8"),
      };
    });
}

function extractCreateTableBlocks(sqlFile) {
  const blocks = [];
  const createTablePattern =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)\s*\(([\s\S]*?)\)\s*;/gi;
  let match;
  while ((match = createTablePattern.exec(sqlFile.text)) !== null) {
    blocks.push({
      name: match[1],
      fileName: sqlFile.fileName,
      filePath: sqlFile.filePath,
      definition: match[2],
    });
  }
  return blocks;
}

function isUserOwnedTable(table) {
  const compactDefinition = table.definition.toLowerCase();
  return OWNERSHIP_COLUMNS.some((column) =>
    new RegExp(`\\b${column}\\b`, "i").test(compactDefinition),
  );
}

function hasRlsEnabled(allSql, tableName) {
  const pattern = new RegExp(
    `alter\\s+table\\s+public\\.${tableName}\\s+enable\\s+row\\s+level\\s+security\\s*;`,
    "i",
  );
  return pattern.test(allSql);
}

function hasPolicy(allSql, tableName) {
  const pattern = new RegExp(
    `create\\s+policy\\s+[a-z0-9_]+\\s+on\\s+public\\.${tableName}\\b`,
    "i",
  );
  return pattern.test(allSql);
}

function findDestructiveStatements(sqlFiles) {
  return sqlFiles
    .filter((sqlFile) => DESTRUCTIVE_DDL_PATTERN.test(sqlFile.text))
    .map((sqlFile) => ({
      id: `destructive-ddl.${sqlFile.fileName}`,
      file: sqlFile.filePath,
      reason: "destructive-ddl-without-explicit-approval",
    }));
}

export function auditDatabaseRlsRollbackStatic({
  rootDir = repoRoot,
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  now = () => new Date(),
} = {}) {
  const sqlFiles = readSqlFiles(rootDir, migrationsDir);
  const allSql = normalize(sqlFiles.map((sqlFile) => sqlFile.text).join("\n"));
  const tables = sqlFiles.flatMap(extractCreateTableBlocks);
  const userOwnedTables = tables.filter(isUserOwnedTable);
  const failures = [];

  for (const table of userOwnedTables) {
    if (!hasRlsEnabled(allSql, table.name)) {
      failures.push({
        id: `rls-enabled.${table.name}`,
        file: table.filePath,
        table: table.name,
        reason: "missing-row-level-security-enable",
      });
    }
    if (!hasPolicy(allSql, table.name)) {
      failures.push({
        id: `rls-policy.${table.name}`,
        file: table.filePath,
        table: table.name,
        reason: "missing-row-level-security-policy",
      });
    }
  }

  failures.push(...findDestructiveStatements(sqlFiles));

  return {
    ok: failures.length === 0,
    checkedAt: now().toISOString(),
    migrationFileCount: sqlFiles.length,
    createTableCount: tables.length,
    userOwnedTableCount: userOwnedTables.length,
    destructiveStatementCount: failures.filter((failure) =>
      failure.id.startsWith("destructive-ddl."),
    ).length,
    passedChecks: userOwnedTables.length * 2 + 1 - failures.length,
    failedChecks: failures.length,
    userOwnedTables: userOwnedTables.map((table) => ({
      name: table.name,
      file: table.filePath,
    })),
    failures,
    note: "Static-only audit for RLS policy coverage and destructive DDL guardrails. This does not prove staging migration execution, live RLS isolation, rollback rehearsal, or authenticated persistence E2E.",
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = auditDatabaseRlsRollbackStatic();
  const jsonPath = argValue("--json");
  if (jsonPath) {
    const absolutePath = path.isAbsolute(jsonPath)
      ? jsonPath
      : path.join(repoRoot, jsonPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(
      absolutePath,
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        migrationFileCount: result.migrationFileCount,
        createTableCount: result.createTableCount,
        userOwnedTableCount: result.userOwnedTableCount,
        failedChecks: result.failedChecks,
        failures: result.failures.map((failure) => failure.id),
      },
      null,
      2,
    ),
  );
  process.exitCode = result.ok ? 0 : 1;
}
