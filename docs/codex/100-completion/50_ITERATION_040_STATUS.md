# Iteration 040 Status - Plan Daily Living Delete Recalculation And Storage Check

Date: 2026-07-14 KST

## Scope

- Keep work scoped to `C:\Users\PC\Desktop\salary-hijacking-platform`.
- Verify the user's concern that Salary Hijacking appeared to consume five drives.
- Finish the in-progress daily living plan delete behavior so deleting a scheduled living row recalculates the server-authoritative daily budget before preview sync.
- Clean generated junk after verification.

## Storage Finding

Windows currently reports only `C:` and `D:` as mounted file-system drive letters.

- `Get-PSDrive -PSProvider FileSystem`: `C`, `D`
- `Get-CimInstance Win32_LogicalDisk`: `C:`, `D:`
- `subst`: no entries
- `net use`: no entries
- `mountvol` mounted letters: `C:\`, `D:\`

Measured directories:

- `C:\Users\PC\Desktop\salary-hijacking-platform`: about 1.416 GB
- `C:\Users\PC\Desktop\salary-hijacking-main`: about 0 GB
- `C:\Users\PC\Desktop\salary-hijacking-work`: about 0 GB
- `D:\salary-hijacking-toolchain-cache`: about 4.349 GB, retained as Android/JDK build toolchain cache

Conclusion: the current Windows runtime does not show five active Salary Hijacking drives. The Explorer screenshot is consistent with stale or previous drive-letter presentation, not five mounted project repositories.

## Code Change

- `apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx`
  - Daily living plan row delete now finds the matching daily item and calls `budgetApi.recalculate()` with the remaining scheduled daily living rows before applying preview deletion.
  - The request keeps the existing server-authoritative memo and computes the daily total from scheduled living rows times the configured living-day count.
  - It still avoids calling `deleteVariableExpense`, because scheduled living rows are plan data, not actual variable expenses.

- `apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`
  - Added regression coverage proving daily living delete recalculates through the budget API before preview sync.

## Verification

- RED: targeted delete recalculation test failed before implementation because `budgetApi.recalculate()` was called 0 times.
- GREEN targeted: `corepack pnpm --filter @salary-hijacking/mobile test -- apps/mobile/src/features/plan/__tests__/plan.components.test.tsx --runInBand --testNamePattern "recalculates the daily living budget before deleting"` PASS, 9 tests.
- Focused regression: `corepack pnpm --filter @salary-hijacking/mobile test -- apps/mobile/src/features/plan/__tests__/plan.components.test.tsx apps/mobile/src/features/salary/__tests__/salary.components.test.tsx apps/mobile/src/features/budget/__tests__/budget.api.test.ts --runInBand` PASS, 3 suites and 49 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck` PASS.
- `corepack pnpm run format:check` PASS.
- `git diff --check` PASS.
- `corepack pnpm run clean:junk:dry-run` PASS, would remove 0 generated paths.

## Remaining Blockers

- Physical Android phone install/cold-start/logcat QA is still blocked until a phone is connected to this Windows environment.
- Release source is still dirty because the platform is mid-implementation.
- Production AAB and Play submission remain blocked by explicit approval flags.
