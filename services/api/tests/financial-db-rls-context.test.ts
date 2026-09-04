import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repositoryFiles = [
  "payroll.repository.ts",
  "daily-budgets.repository.ts",
  "variable-expenses.repository.ts",
  "savings.repository.ts",
  "fixed-expenses.repository.ts",
] as const;

describe("financial DB repositories RLS context", () => {
  it.each(repositoryFiles)(
    "%s sets the authenticated principal before DB-backed queries",
    (fileName) => {
      const source = readFileSync(
        new URL(`../src/repositories/${fileName}`, import.meta.url),
        "utf8",
      );

      expect(source).toContain("runtime.principal.userId");
      expect(source).toContain("set_config('app.current_user_id'");
      expect(source).toContain("set_config('app.is_admin'");
      expect(source).toContain("withUserContext");
      expect(source).toContain("with _app_context");
      expect(source).toContain("_app_query as");
      expect(source).toContain("from _app_context, _app_query");
    },
  );
});
