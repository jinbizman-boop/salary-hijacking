import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repositoryFiles = [
  "payroll.repository.ts",
  "daily-budgets.repository.ts",
  "variable-expenses.repository.ts",
  "savings.repository.ts",
] as const;

describe("financial DB repositories RLS context", () => {
  it.each(repositoryFiles)(
    "%s sets the authenticated principal before DB-backed queries",
    (fileName) => {
      const source = readFileSync(
        new URL(`../src/repositories/${fileName}`, import.meta.url),
        "utf8",
      );

      expect(source).toContain("principalUserId");
      expect(source).toContain("set_config('app.current_user_id'");
      expect(source).toContain("set_config('app.is_admin'");
      expect(source).toContain("begin");
      expect(source).toContain("commit");
      expect(source).toContain("rollback");
    },
  );
});
