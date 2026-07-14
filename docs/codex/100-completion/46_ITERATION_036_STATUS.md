# Iteration 036 Status - API Worker Uploads DB Wiring

Date: 2026-07-14 KST

## Scope

Iteration 036 closed a persistence wiring gap in the Cloudflare API Worker entrypoint.

`services/api/src/app.ts` already had a default Neon-backed uploads repository path, but `services/api/src/index.ts` did not explicitly wire `uploadsRoutesOptions` alongside payroll, daily budgets, fixed expenses, variable expenses, savings, growth, notifications, users, and community. This left the Worker entrypoint contract weaker than the app gateway contract for receipt, attachment, and community upload flows.

## Changes

- Added RED regression coverage in `services/api/tests/worker-entrypoint.test.ts`.
- Added `createNeonUploadsRepository` and `shouldUseNeonUploadsRepository` imports to `services/api/src/index.ts`.
- Added `uploadsRoutesOptions` to the Worker `createApp<WorkerEnv>(...)` configuration so runtime database URL presence selects the Neon uploads repository explicitly.

## Verification

- RED: `corepack pnpm --filter @salary-hijacking/api exec vitest run tests/worker-entrypoint.test.ts` failed because `createNeonUploadsRepository` was missing from `services/api/src/index.ts`.
- GREEN targeted: `corepack pnpm --filter @salary-hijacking/api exec vitest run tests/worker-entrypoint.test.ts` PASS, 2 tests.
- API typecheck: `corepack pnpm --filter @salary-hijacking/api run typecheck` PASS.
- API full test: `corepack pnpm --filter @salary-hijacking/api test` PASS, 30 files and 116 tests.
- API format: `corepack pnpm --filter @salary-hijacking/api run format:check` PASS.

## Impact

- Improves API/DB launch readiness for upload persistence and idempotent attachment flows.
- Supports mobile receipt upload, community attachment, profile upload, and related privacy-safe file operations.
- Does not prove deployed staging/production DB persistence because no external DB smoke or migration run was executed in this iteration.

## Not Completed By This Iteration

- Physical Android phone install/cold start/logcat QA.
- Staging DB migration/seed/API smoke against live Neon.
- Production AAB build.
- EAS submit.
- Google Play submission.
- Clean release source.

No production AAB, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, or Cloudflare secret mutation was performed.
