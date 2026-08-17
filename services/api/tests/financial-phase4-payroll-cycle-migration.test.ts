import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 4 payroll-cycle DB recalculation migration", () => {
  it("replaces calendar-month payroll recalculation with payday-cycle bounds", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "../../database/migrations/0017_payroll_cycle_recalculation.sql",
      ),
      "utf8",
    );

    expect(migration).toContain("v_cycle_start");
    expect(migration).toContain("v_cycle_end_exclusive");
    expect(migration).toContain("make_payday_date");
    expect(migration).toContain("(ve.spent_at at time zone 'Asia/Seoul')::date");
    expect(migration).toContain("formula_version");
    expect(migration).toContain("payroll-v2-cycle-kst");
  });

  it("restores the refund column required by payroll recalculation", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "../../database/migrations/0018_variable_expense_refund_column_repair.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS refund_amount bigint NOT NULL DEFAULT 0",
    );
    expect(migration).toContain(
      "ADD COLUMN IF NOT EXISTS last_refund_idempotency_key text",
    );
    expect(migration).toContain("chk_variable_expenses_refund_amount");
    expect(migration).toContain("refund_amount >= 0 AND refund_amount <= amount");
  });
});
