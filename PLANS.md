# PLANS.md - Salary Hijacking Work Plan

## Current Goal

Turn the repository from a document-heavy/generated scaffold into a verifiable, runnable product workspace without losing the existing architecture, DB, privacy, and server-authority intent.

## Current State Summary

- Baseline verification map exists at `docs/codex/13_BASELINE_VERIFICATION_MAP.md`.
- API and Admin typecheck currently pass.
- Mobile package/config exists, but mobile typecheck currently fails because app-local dependencies/types are not installed or resolved.
- Notifications and Scheduler Worker code exists, and both package typechecks now pass after adding service-local `tsconfig.json` files.
- Package-level `pnpm` warnings for Admin/API/Notifications/Scheduler have been removed by moving shared pnpm settings to the root.
- Project-wide `pnpm.cmd typecheck` still fails at `@salary-hijacking/mobile` and also exposes unresolved package-local build tooling such as `tsup`.
- Many mobile feature module files under `apps/mobile/src/features/budget` and `apps/mobile/src/features/community` are empty.
- Several mobile/admin client routes do not fully align with current API route manifests.
- DB migrations and seed files are substantial and should be treated as a core design asset.
- Git is not detected from the current folder, so change tracking must be handled carefully until repository metadata is restored.

## Priority Plan

1. Stabilize project instructions and Codex context documents.
   - keep `AGENTS.md` and `docs/codex/11_PROMPT_POLICY.md` as the common prompt contract,
   - keep `docs/codex/08_FILE_COMPLETION_LOG.md` aligned with real verification results.
2. Establish the baseline verification map:
   - parse root/package JSON files,
   - confirm current typecheck results,
   - list empty or placeholder implementation files,
   - list endpoint mismatches between mobile/admin and API.
3. Fix workspace/package hygiene:
   - package-level pnpm warnings are resolved,
   - resolve remaining package-local tool/dependency resolution,
   - confirm package JSON parse with BOM handling,
   - restore Git metadata or initialize tracking if the user asks.
4. Make Mobile verifiable:
   - install/restore mobile dependencies,
   - resolve Expo tsconfig/type packages,
   - implement or remove empty feature modules,
   - align mobile endpoint paths with API.
5. Make Notifications and Scheduler verifiable:
   - add service `tsconfig.json` files,
   - run typecheck/build,
   - verify Worker entrypoints.
6. Reconcile API, Admin, and Mobile contracts:
   - align `/api/v1` and `/admin/api/v1` paths,
   - confirm request/response shapes in shared contracts,
   - keep financial calculations server-authoritative.
7. Connect API repositories to DB-backed implementations where required.
8. Replace placeholder local scripts with real migration, seed, lint, test, and release commands.
9. Add focused tests for changed behavior.
10. Run broader gates:

- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd test`
- `pnpm.cmd build`
- DB validation/migration checks with safe local credentials.

11. Prepare operational readiness:

- environment variable checklist,
- secrets handling,
- deployment smoke checks,
- privacy/security/ad policy verification,
- release and rollback notes.

## Reporting Rule

Each completed work slice should report:

- changed files,
- commands run,
- PASS/FAIL result,
- remaining blockers,
- whether `docs/codex/08_FILE_COMPLETION_LOG.md` was updated.
