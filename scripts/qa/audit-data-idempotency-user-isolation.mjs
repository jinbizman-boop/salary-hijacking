#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

const defaultChecks = [
  {
    id: "schema.expenses.fixed-rules-user-idempotency",
    file: "packages/db/src/schema/expenses.schema.ts",
    mustContain: [
      "constraint fixed_expense_rules_user_idempotency_unique unique (user_id, idempotency_key)",
    ],
  },
  {
    id: "schema.expenses.daily-budget-user-idempotency",
    file: "packages/db/src/schema/expenses.schema.ts",
    mustContain: [
      "constraint daily_budget_periods_user_idempotency_unique unique (user_id, idempotency_key)",
    ],
  },
  {
    id: "schema.expenses.variable-event-user-idempotency",
    file: "packages/db/src/schema/expenses.schema.ts",
    mustContain: [
      "constraint expense_events_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint expense_refunds_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint expense_idempotency_records_user_key_unique unique (user_id, idempotency_key)",
    ],
  },
  {
    id: "schema.payroll-user-idempotency",
    file: "packages/db/src/schema/payroll.schema.ts",
    mustContain: [
      "constraint payroll_cycles_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint payroll_income_events_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint payroll_idempotency_user_key_unique unique (user_id, idempotency_key)",
    ],
  },
  {
    id: "schema.growth-user-idempotency",
    file: "packages/db/src/schema/growth.schema.ts",
    mustContain: [
      "constraint growth_completion_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint growth_exp_events_user_idempotency_unique unique (user_id, idempotency_key)",
      "constraint growth_idempotency_records_user_key_unique unique (user_id, idempotency_key)",
    ],
  },
  {
    id: "schema.community-author-reporter-idempotency",
    file: "packages/db/src/schema/community.schema.ts",
    mustContain: [
      "constraint community_posts_user_idempotency_unique unique (author_id, idempotency_key)",
      "constraint community_comments_user_idempotency_unique unique (author_id, idempotency_key)",
      "constraint community_reports_reporter_idempotency_unique unique (reporter_id, idempotency_key)",
      "constraint community_idempotency_records_user_key_unique unique (user_id, idempotency_key)",
    ],
  },
  {
    id: "repository.variable-expenses-idempotency-is-user-scoped",
    file: "services/api/src/repositories/variable-expenses.repository.ts",
    mustContain: [
      "where user_id = $1::uuid",
      "and idempotency_key = $2",
      "insert into public.variable_expenses",
      "idempotency_key",
    ],
  },
  {
    id: "repository.daily-budgets-spend-idempotency-is-user-scoped",
    file: "services/api/src/repositories/daily-budgets.repository.ts",
    mustContain: [
      "function findSpendByIdempotency",
      "where user_id = $1::uuid",
      "and idempotency_key = $2",
      "on conflict (user_id, idempotency_key)",
    ],
  },
  {
    id: "repository.uploads-idempotency-is-creator-scoped",
    file: "services/api/src/repositories/uploads.repository.ts",
    mustContain: [
      "where created_by = $1",
      "and idempotency_key = $2",
      "insert into public.attachments",
      "idempotency_key",
      "created_by",
    ],
  },
  {
    id: "repository.growth-completion-concurrency-is-user-content-date-scoped",
    file: "services/api/src/repositories/growth.repository.ts",
    mustContain: [
      "insert into public.user_level_content_progress",
      "idempotency_key",
      "on conflict (user_id, content_id, completion_date)",
      "on conflict (user_id)",
    ],
  },
  {
    id: "repository.community-writes-are-author-or-reporter-scoped",
    file: "services/api/src/repositories/community.repository.ts",
    mustContain: [
      "on conflict (author_id, idempotency_key)",
      "on conflict (target_type, target_id, reporter_id)",
      "on conflict (target_type, target_id, user_id, reaction_type) do nothing",
      "and ($3::boolean or author_id = $2::uuid)",
    ],
  },
  {
    id: "tests.repository-contracts-cover-idempotency-and-isolation",
    file: "services/api/tests/variable-expenses-db-repository.test.ts",
    mustContain: [
      "creates a DB-backed variable expense through daily budget upsert",
      "variableExpenses.findByIdempotency",
      "JSON.stringify(created)).not.toContain(userId)",
    ],
  },
  {
    id: "tests.community-contracts-cover-owner-redaction",
    file: "services/api/tests/community-db-repository.test.ts",
    mustContain: [
      "without returning owner identifiers",
      "community.createPost",
      "JSON.stringify(created)).not.toContain(userId)",
    ],
  },
  {
    id: "tests.growth-contracts-cover-server-xp-idempotency",
    file: "services/api/tests/growth-db-repository.test.ts",
    mustContain: [
      "server XP and idempotency",
      'idempotencyKey: "content-reading-1"',
      "on conflict",
    ],
  },
];

const normalize = (value) => value.replace(/\s+/g, " ").trim();

function readRepoFile(root, file) {
  const absolutePath = resolve(root, file);
  if (!existsSync(absolutePath)) {
    return { absolutePath, text: null };
  }
  return {
    absolutePath,
    text: readFileSync(absolutePath, "utf8"),
  };
}

export function auditDataIdempotencyUserIsolation({
  root = repoRoot,
  checks = defaultChecks,
} = {}) {
  const failures = [];
  const passed = [];

  for (const check of checks) {
    const { absolutePath, text } = readRepoFile(root, check.file);
    if (text === null) {
      failures.push({
        id: check.id,
        file: check.file,
        reason: "missing-file",
        missing: [check.file],
      });
      continue;
    }

    const compact = normalize(text);
    const missing = check.mustContain.filter(
      (snippet) => !compact.includes(normalize(snippet)),
    );
    if (missing.length > 0) {
      failures.push({
        id: check.id,
        file: check.file,
        reason: "missing-required-pattern",
        missing,
      });
      continue;
    }

    passed.push({ id: check.id, file: check.file, absolutePath });
  }

  return {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    totalChecks: checks.length,
    passedChecks: passed.length,
    failedChecks: failures.length,
    passed,
    failures,
  };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = auditDataIdempotencyUserIsolation();
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
        totalChecks: result.totalChecks,
        passedChecks: result.passedChecks,
        failedChecks: result.failedChecks,
        failures: result.failures.map((failure) => failure.id),
      },
      null,
      2,
    ),
  );
  process.exitCode = result.ok ? 0 : 1;
}
