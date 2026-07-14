# Iteration 044 - Plan Server Failure Guard

Date: 2026-07-14 KST

## Scope

- `apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx`
- `apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`

## Requirement

Plan edits must not look saved when the server-authoritative API rejects the mutation. This protects the launch-critical rule that payroll, fixed expense, fixed savings, and daily living plan state cannot be permanently accepted by the mobile client before server authority succeeds.

## RED

Added a failing test:

- `keeps fixed expense drafts unsaved when the server-authoritative plan API rejects`

The test injected a rejecting `createFixedExpense` API and attempted to add `Rejected ChatGPT`. RED failed because the UI still rendered `Rejected ChatGPT`, proving the previous catch path fell back to local preview persistence even though a server API client existed and rejected.

## GREEN

- Added a plan-level alert message for server save failures.
- Changed server-backed Plan mutations to stop after API rejection instead of falling through to local preview persistence.
- Kept local preview persistence only for no-client QA preview cases.
- Cleared prior errors when the user opens an editor or retries a save/delete/update flow.

Covered mutation families:

- payroll plan save
- fixed expense create/update/delete
- fixed savings create/update/delete
- daily living item recalculate save/delete
- daily living limit/day-count server update

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/plan/__tests__/plan.components.test.tsx -t "keeps fixed expense drafts unsaved" --runInBand`: PASS, 176 tests in invoked Jest scope
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/features/plan/__tests__/plan.components.test.tsx --runInBand`: PASS, 10 Plan tests

## Remaining Limits

- Deployed DB persistence is not proven in this iteration.
- Physical Android phone relaunch persistence is still blocked by no attached physical phone.
- Full recurrence lifecycle across salary cycles remains PARTIAL.
- Production AAB and Play submission remain blocked by explicit approval gates.
