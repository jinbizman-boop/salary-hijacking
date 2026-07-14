# Iteration 037 Status - API Worker Admin DB Wiring

Date: 2026-07-14 KST

## Scope

- `services/api/src/index.ts`
- `services/api/tests/worker-entrypoint.test.ts`
- `docs/codex/100-completion/08_RELEASE_GATE_MATRIX.md`
- `docs/codex/08_FILE_COMPLETION_LOG.md`

## Change

The Cloudflare API Worker entrypoint now explicitly wires Admin routes to the Neon-backed Admin repository when a runtime database URL is present. This makes the deployed Worker boundary match the Admin operational persistence contract instead of relying only on the app-level default repository selection.

## TDD Evidence

- RED: `corepack pnpm --filter @salary-hijacking/api exec vitest run tests/worker-entrypoint.test.ts`
  - Failed because `services/api/src/index.ts` did not contain `createNeonAdminRepository`.
- GREEN: `corepack pnpm --filter @salary-hijacking/api exec vitest run tests/worker-entrypoint.test.ts`
  - PASS, 1 file and 3 tests.

## Verification

- `corepack pnpm --filter @salary-hijacking/api run typecheck`: PASS.
- `corepack pnpm --filter @salary-hijacking/api test`: PASS, 30 files and 117 tests.
- `corepack pnpm --filter @salary-hijacking/api run format:check`: PASS.

## Remaining Launch Blockers

- Physical Android phone install/cold-start/logcat QA remains BLOCKED until a real phone is attached or an approved device-farm proof is supplied.
- Clean release source remains FAIL while the current working tree has uncommitted local changes.
- Staging/production DB smoke and external runtime evidence remain incomplete.
- Production AAB, EAS submit, and Google Play submission remain BLOCKED by explicit approval flags.
