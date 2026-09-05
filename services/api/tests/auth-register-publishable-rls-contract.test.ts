import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..", "..", "..");
const migrationDir = path.join(root, "database", "migrations");

function allMigrationSql(): string {
  return readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(migrationDir, file), "utf8"))
    .join("\n\n");
}

describe("auth register pre-auth RLS contract", () => {
  it("allows the API-controlled pre-auth bootstrap context to insert the root users row", () => {
    const sql = allMigrationSql();

    expect(sql).toMatch(/CREATE POLICY users_service_all\s+ON public\.users\s+FOR ALL/is);
    expect(sql).toMatch(/WITH CHECK\s*\(\s*public\.current_app_is_admin\(\)/is);
  });
});
