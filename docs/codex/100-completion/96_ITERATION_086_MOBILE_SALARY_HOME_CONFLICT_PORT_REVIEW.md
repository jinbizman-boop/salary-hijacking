# Iteration 086 Mobile Salary Home Conflict Port Review

Date: 2026-07-14 KST

## Scope

- `apps/mobile/src/features/salary/__tests__/salary.components.test.tsx`
- `apps/mobile/src/features/salary/__tests__/salary.screen-wiring.test.ts`
- `apps/mobile/src/features/salary/components/DailyBudgetSection.tsx`
- `apps/mobile/src/features/salary/components/FixedExpenseSection.tsx`
- `apps/mobile/src/features/salary/components/index.ts`
- `apps/mobile/src/features/salary/components/SalaryHeroCard.tsx`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/salary/**`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISIONS.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`

## Decision

All six mobile Salary Home conflict rows are `CURRENT_ACCEPTED`.

The current platform files supersede the archive copies. The archive Salary Home component test covered smaller isolated component rendering, while the current test suite exercises the full `SalaryHomeReferenceScreen` interaction surface: KST date and salary-cycle copy, requested `사용 예정` and `사용 완료` reminder semantics, overdue warning color, daily budget settings CRUD, variable expense save/edit/delete persistence behavior, server-authoritative variable expense mutations, fixed-plan completion hiding, and fixed-savings recording.

The current `DailyBudgetSection` also preserves the PDF-derived daily-budget title, side-by-side configured and remaining amounts, and explicit overspend danger state. The current `SalaryHeroCard` keeps the green design-reference hero treatment, cumulative protected amount, money icon asset, and accessible server-calculation label. The current `FixedExpenseSection` keeps the privacy guard that shows payment status without raw account data.

## Evidence

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/salary/__tests__/salary.components.test.tsx apps/mobile/src/features/salary/__tests__/salary.components.test.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/salary/__tests__/salary.screen-wiring.test.ts apps/mobile/src/features/salary/__tests__/salary.screen-wiring.test.ts`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/salary/components/DailyBudgetSection.tsx apps/mobile/src/features/salary/components/DailyBudgetSection.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/salary/components/FixedExpenseSection.tsx apps/mobile/src/features/salary/components/FixedExpenseSection.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/salary/components/index.ts apps/mobile/src/features/salary/components/index.ts`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/features/salary/components/SalaryHeroCard.tsx apps/mobile/src/features/salary/components/SalaryHeroCard.tsx`
- `node scripts/release/classify-merge-conflict-archive.mjs`
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.components.test.tsx --runInBand`
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/salary/__tests__/salary.screen-wiring.test.ts --runInBand`
- `node --test scripts/release/classify-merge-conflict-archive.test.mjs scripts/release/check-release-readiness.test.mjs`

## Register Result

- Total conflict files: 132
- Current path exists: 106
- Missing current path: 26
- Byte-identical: 0
- `CURRENT_ACCEPTED`: 28
- `REVIEW_REQUIRED`: 64
- `EXCLUDE_RUNTIME`: 26
- `SUPERSEDED_BY_CURRENT_EVIDENCE`: 14

## Remaining Work

The merge archive is still not safe to delete. Sixty-four `REVIEW_REQUIRED` mobile-source rows remain and must receive file-level semantic port decisions or verified supersession evidence first.
