import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { afterEach } from "node:test";

import { auditDatabaseRlsRollbackStatic } from "./audit-db-rls-rollback-static.mjs";

const fixtureWorkspaces = new Set();

function cleanupWorkspaces() {
  for (const rootDir of fixtureWorkspaces) {
    fs.rmSync(rootDir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
    fixtureWorkspaces.delete(rootDir);
  }
}

afterEach(() => {
  cleanupWorkspaces();
});

function tempRepo(files) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "salary-db-rls-audit-"),
  );
  fixtureWorkspaces.add(rootDir);
  for (const [filePath, content] of Object.entries(files)) {
    const absolutePath = path.join(rootDir, filePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, "utf8");
  }
  return rootDir;
}

test("passes when user-owned migration tables enable RLS and define policies", () => {
  const rootDir = tempRepo({
    "database/migrations/0001_sample.sql": `
      CREATE TABLE IF NOT EXISTS public.daily_budgets (
        id uuid primary key,
        user_id uuid not null
      );
      ALTER TABLE public.daily_budgets ENABLE ROW LEVEL SECURITY;
      CREATE POLICY daily_budgets_owner_all
      ON public.daily_budgets
      USING (user_id = public.current_app_user_id())
      WITH CHECK (user_id = public.current_app_user_id());
    `,
  });

  const result = auditDatabaseRlsRollbackStatic({ rootDir });

  assert.equal(result.ok, true);
  assert.equal(result.failedChecks, 0);
  assert.deepEqual(
    result.userOwnedTables.map((table) => table.name),
    ["daily_budgets"],
  );
});

test("fails when a user-owned table has no RLS policy", () => {
  const rootDir = tempRepo({
    "database/migrations/0001_sample.sql": `
      CREATE TABLE IF NOT EXISTS public.variable_expenses (
        id uuid primary key,
        user_id uuid not null
      );
      ALTER TABLE public.variable_expenses ENABLE ROW LEVEL SECURITY;
    `,
  });

  const result = auditDatabaseRlsRollbackStatic({ rootDir });

  assert.equal(result.ok, false);
  assert.equal(result.failedChecks, 1);
  assert.equal(result.failures[0].id, "rls-policy.variable_expenses");
});

test("fails when a user-owned table has no RLS enable statement", () => {
  const rootDir = tempRepo({
    "database/migrations/0001_sample.sql": `
      CREATE TABLE IF NOT EXISTS public.user_support_tickets (
        id uuid primary key,
        user_id uuid not null
      );
      CREATE POLICY user_support_tickets_owner_all
      ON public.user_support_tickets
      USING (user_id = public.current_app_user_id())
      WITH CHECK (user_id = public.current_app_user_id());
    `,
  });

  const result = auditDatabaseRlsRollbackStatic({ rootDir });

  assert.equal(result.ok, false);
  assert.equal(result.failedChecks, 1);
  assert.equal(result.failures[0].id, "rls-enabled.user_support_tickets");
});

test("ignores public lookup tables without user ownership columns", () => {
  const rootDir = tempRepo({
    "database/migrations/0001_sample.sql": `
      CREATE TABLE IF NOT EXISTS public.growth_content_items (
        id uuid primary key,
        status text not null
      );
    `,
  });

  const result = auditDatabaseRlsRollbackStatic({ rootDir });

  assert.equal(result.ok, true);
  assert.equal(result.userOwnedTables.length, 0);
});

test("fails on destructive migration statements that are not policy replacement", () => {
  const rootDir = tempRepo({
    "database/migrations/0001_sample.sql": `
      CREATE TABLE IF NOT EXISTS public.users (
        id uuid primary key
      );
      DROP TABLE public.users;
    `,
  });

  const result = auditDatabaseRlsRollbackStatic({ rootDir });

  assert.equal(result.ok, false);
  assert.equal(result.failures[0].id, "destructive-ddl.0001_sample.sql");
});
