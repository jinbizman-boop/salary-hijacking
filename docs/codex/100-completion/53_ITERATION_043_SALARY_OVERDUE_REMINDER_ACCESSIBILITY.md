# Iteration 043 Salary Overdue Reminder Accessibility

Date: 2026-07-14 KST

## Scope

Closed one Salary Home gap around overdue planned reminders. The product requirement says planned fixed expense/savings items that are past their scheduled day and not completed must be visibly distinguished in orange and not remain indistinguishable from ordinary "사용 예정" rows.

## Root Cause

`SalaryHomeReferenceScreen` already rendered overdue planned reminders with:

- orange button styling
- visible `지남` copy

However, the interactive button accessibility label still read only:

`{item.content} 사용 완료 처리`

That meant screen readers and role/name based QA could not distinguish an overdue planned item from an ordinary scheduled item.

## TDD Evidence

Added a failing regression test first:

`apps/mobile/src/features/salary/__tests__/salary.components.test.tsx`

Test:

`announces overdue planned reminders when their scheduled day has passed in KST`

RED result:

- Failed to find button named `기한 지남: ChatGPT 사용 완료 처리`.
- Rendered UI showed the visual `지남` state but the accessibility label was still `ChatGPT 사용 완료 처리`.

GREEN implementation:

- `PlanReminderRow` now prefixes overdue reminder action labels with `기한 지남: `.
- Existing orange visual state remains unchanged.
- Existing completion actions still work for both overdue and non-overdue rows.

## Verification

Commands run:

```powershell
corepack pnpm --filter @salary-hijacking/mobile exec jest src/features/salary/__tests__/salary.components.test.tsx -t "announces overdue planned reminders" --runInBand
corepack pnpm --filter @salary-hijacking/mobile exec jest src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.components.test.tsx src/features/budget/__tests__/budget.utils.test.ts --runInBand
corepack pnpm --filter @salary-hijacking/mobile run typecheck
corepack pnpm run format:check
git diff --check -- apps/mobile/src/features/salary/components/SalaryHomeReferenceScreen.tsx apps/mobile/src/features/salary/__tests__/salary.components.test.tsx
```

Results:

- Targeted overdue reminder test: PASS, 1 passed.
- Focused Salary/Plan/Budget regression: PASS, 3 suites / 34 tests.
- Mobile typecheck: PASS.
- Format check: PASS.
- Diff whitespace check: PASS.

## Remaining Limits

This improves the Salary Home planned-reminder UX/accessibility contract, but does not prove:

- deployed DB persistence
- full recurrence lifecycle in staging or production
- physical Android phone QA
- production AAB
- Play submission
- market publication

Those remain governed by the existing release gates.
