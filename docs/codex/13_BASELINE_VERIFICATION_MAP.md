---
codex_context: true
priority: P0
scope: repository-baseline
last_verified: 2026-07-01
---

# Baseline Verification Map

This file records the executable baseline history for the Salary Hijacking repository.
It is a working map for follow-up implementation, not a production readiness certificate.

## Current Update

The original 2026-06-25 blockers listed below have largely been resolved by later work. Current verified state on 2026-07-02:

- root format check: PASS
- workspace typecheck: PASS
- workspace lint: PASS
- workspace test: PASS
- workspace quality: PASS, `corepack pnpm run quality` completed 82 Turbo tasks
- workspace build: PASS, `corepack pnpm run build` completed 12 Turbo tasks
- local Git baseline: PASS, local Git metadata is initialized, `origin` points to `https://github.com/jinbizman-boop/salary-hijacking.git`, authenticated push to `origin/main` is proven, and release readiness rechecks local HEAD against `origin/main` when authenticated push proof is claimed, with a warning fallback to local `refs/remotes/origin/main` when live remote reads are unavailable in the local Node sandbox
- root script tests: PASS, 177 tests after adding Android SDK tool detection
  coverage and preserving no-secret release proof coverage
  collectors for database, runtime secrets, Cloudflare observations, mobile
  native build/store observations, public URLs, public URL proof workflow
  artifact guarding, dev-inclusive release dependency audit guarding,
  dependency security audit proof artifact guarding, release readiness workflow
  gate guarding, tracked proof example templates, missing/BOM Cloudflare
  observation handling, and UTF-8 BOM local proof handling for database and
  mobile native collectors
- database local-safe validation: PASS, `corepack pnpm run db:validate`
  validated the checked-in DB package/schema/DDL bundle and is recorded as the
  migration validation release gate without storing runtime DB URLs, SQL output,
  secrets, or smoke payloads
- release readiness preflight: reporting command PASS, release status BLOCKED
- mobile typecheck/lint/format/Jest tests: PASS
- mobile Clean Fintech UI contract: PASS, 9 focused tests for official BI,
  Freesentation fonts, five-tab IA, screenshot anchor, and Korean launch copy
- mobile Detox config and smoke contract: present and covered by tests
- mobile native E2E: FAIL because the local Detox Android E2E APK is missing;
  `adb` and `emulator` are now detected through Android SDK tool lookup, but
  tool availability is not native E2E proof
- mobile/API bootstrap, payroll current/recalculate, and profile/privacy-export contracts: aligned in current code; profile alias is covered by `services/api/tests/mobile-profile-contract.test.ts`, and manifest alignment is covered by `services/api/tests/mobile-route-manifest-contract.test.ts`
- `apps/mobile/src/features/budget` and `apps/mobile/src/features/community`: no zero-byte files found in the latest scan
- scripts placeholder risk: resolved with conservative helper scripts and `pnpm run check:scripts`
- infrastructure/mobile release metadata placeholder risk, source automation `.gitignore` trackability risk, local generated hosting/build metadata tracking risk, release target mismatch risk, and local release proof leakage risk: resolved for Cloudflare, GitHub, mobile release metadata, `scripts/build/*`, `.vercel`, `.open-next`, ignored `release/*-proof.local.json`, ignored `release/*-observation.local.json`, tracked unverified no-secret example templates under `release/examples`, explicit `RETRO-DB` protection, `release/release-targets.json`, GitHub write/push proof, `GITHUB_REPOSITORY`, `CF_ADMIN_WORKER_NAME`, `git remote origin`, and runtime local HEAD to `origin/main` sync when push proof is claimed through `pnpm run check:external-integrations` plus `pnpm run check:release-readiness -- --soft`
- public release remains blocked by missing runtime secret presence evidence,
  missing Salary Hijacking Cloudflare Worker/R2/Queue/DNS/certificate runtime
  evidence, missing mobile native EAS build/E2E/store-submit evidence, missing
  DB staging migration/staging seed/production dry-run/API smoke/rollback
  evidence in `release/database-evidence.json`, staging/production deploy,
  certificates, and operating QA. Local GitHub/Neon CLI absence is a warning
  when connector evidence proves account access; the Neon project itself is now
  observed.

The historical tables below are retained to explain why the hardening work was prioritized.

## Target Role

The baseline map is the first work item before feature hardening. It fixes the current truth of the repository so later file-level completion claims can be compared against real command output.

## Work Items Covered

1. Read `AGENTS.md`.
2. Read `docs/codex/00_INDEX.md`.
3. Read `docs/codex/01_PROJECT_BRIEF.md`.
4. Read `docs/codex/02_MASTER_REQUIREMENTS.md`.
5. Read `docs/codex/09_VALIDATION_PROTOCOL.md`.
6. Read mobile, API, server-authority, privacy/security, and completion-log context.
7. Confirm root config file presence.
8. Parse selected JSON files with BOM handling.
9. Check Git repository visibility.
10. Run API typecheck.
11. Run Admin typecheck.
12. Run Mobile typecheck.
13. Run Notifications typecheck.
14. Run Scheduler typecheck.
15. Scan zero-byte mobile feature files.
16. Scan `documentTheoreticalCompleteness` claims.
17. Confirm package-level `pnpm` warning sources.
18. Scan known endpoint alignment risks.
19. Update Codex completion tracking.

## Command Results

| Check                       | Command                                                                                                                          | Result                | Notes                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| Root config presence        | `node -e "... ['package.json','turbo.json','pnpm-workspace.yaml'] ..."`                                                          | PASS                  | All three files found.                                                                                                                                                                                                                                                                                                                                  |
| Selected JSON parse         | `node -e "... JSON.parse(...replace(/^\\uFEFF/,'')) ..."`                                                                        | PASS                  | Root, mobile, API, admin, notifications, scheduler, and Turbo JSON parsed.                                                                                                                                                                                                                                                                              |
| Git visibility              | `git status --short`; `git log -1 --oneline`; `git remote -v`; `git push -u origin main`; `git ls-remote origin refs/heads/main` | LOCAL/REMOTE PASS     | Local Git repository is initialized; `origin` points to the new Salary Hijacking repository `https://github.com/jinbizman-boop/salary-hijacking.git`; authenticated push succeeds; remote branch read access is proven; unrelated repositories must not be targeted or modified from this workspace.                                                    |
| API typecheck               | `pnpm.cmd --filter @salary-hijacking/api typecheck`                                                                              | PASS                  | TypeScript compiled; package-level pnpm warning removed.                                                                                                                                                                                                                                                                                                |
| Admin typecheck             | `pnpm.cmd --filter @salary-hijacking/admin typecheck`                                                                            | PASS                  | TypeScript compiled; package-level pnpm warning removed.                                                                                                                                                                                                                                                                                                |
| Mobile typecheck            | `pnpm.cmd --filter @salary-hijacking/mobile typecheck`                                                                           | FAIL                  | Missing `expo/tsconfig.base` and type definitions for `jest`, `react`, `react-native`; package-local `node_modules` missing.                                                                                                                                                                                                                            |
| Notifications typecheck     | `pnpm.cmd --filter @salary-hijacking/notifications typecheck`                                                                    | PASS                  | `services/notifications/tsconfig.json` was added and the package now typechecks.                                                                                                                                                                                                                                                                        |
| Scheduler typecheck         | `pnpm.cmd --filter @salary-hijacking/scheduler typecheck`                                                                        | PASS                  | `services/scheduler/tsconfig.json` was added and the package now typechecks.                                                                                                                                                                                                                                                                            |
| Project typecheck           | `pnpm.cmd typecheck`                                                                                                             | FAIL                  | First sandbox run was blocked by pnpm home-cache writes; re-run outside sandbox executed. Package-level pnpm warnings are resolved, but the run still fails at `@salary-hijacking/mobile` missing `expo/tsconfig.base`, `jest`, `react`, and `react-native` type resolution. Output also exposes unresolved package-local build tooling such as `tsup`. |
| Zero-byte mobile features   | `Get-ChildItem ... apps/mobile/src/features/budget,community ... Length -eq 0`                                                   | FAIL                  | 39 empty source/test/component files found.                                                                                                                                                                                                                                                                                                             |
| Document-theoretical claims | `rg -n 'documentTheoreticalCompleteness' apps services packages`                                                                 | FOUND                 | Five metadata claims found; they do not prove operational readiness.                                                                                                                                                                                                                                                                                    |
| Endpoint alignment scan     | `rg -n 'mobile/bootstrap                                                                                                         | payroll/plans/current | ...' apps services packages`                                                                                                                                                                                                                                                                                                                            | FOUND | Mobile/admin references still need reconciliation with API route support. |

## Package-Level pnpm Warning Sources

The original baseline found package-level `pnpm` settings in these packages:

- `apps/admin/package.json`: `overrides`, `onlyBuiltDependencies`, `peerDependencyRules`
- `services/api/package.json`: `overrides`, `onlyBuiltDependencies`, `peerDependencyRules`
- `services/notifications/package.json`: `overrides`, `onlyBuiltDependencies`, `peerDependencyRules`
- `services/scheduler/package.json`: `overrides`, `onlyBuiltDependencies`, `peerDependencyRules`

These were reconciled by moving shared `pnpm.onlyBuiltDependencies`, `pnpm.overrides`, and `pnpm.peerDependencyRules` to the root `package.json` and removing ignored package-level `pnpm` blocks from those package manifests.

## Zero-Byte Mobile Feature Files

Total: 39.

Budget feature placeholders:

- `apps/mobile/src/features/budget/api.ts`
- `apps/mobile/src/features/budget/constants.ts`
- `apps/mobile/src/features/budget/hooks.ts`
- `apps/mobile/src/features/budget/selectors.ts`
- `apps/mobile/src/features/budget/types.ts`
- `apps/mobile/src/features/budget/utils.ts`
- `apps/mobile/src/features/budget/validation.ts`
- `apps/mobile/src/features/budget/components/BudgetProgressBar.tsx`
- `apps/mobile/src/features/budget/components/BudgetRiskBadge.ts`
- `apps/mobile/src/features/budget/components/BudgetSkeleton.tsx`
- `apps/mobile/src/features/budget/components/DailyBudgetCard.tsx`
- `apps/mobile/src/features/budget/components/OverspendNotice.tsx`
- `apps/mobile/src/features/budget/components/RemainingAmountCard.tsx`
- `apps/mobile/src/features/budget/__tests__/budget.selectors.test.ts`
- `apps/mobile/src/features/budget/__tests__/budget.utils.test.ts`
- `apps/mobile/src/features/budget/__tests__/budget.validation.test.ts`

Community feature placeholders:

- `apps/mobile/src/features/community/api.ts`
- `apps/mobile/src/features/community/community.analytics.ts`
- `apps/mobile/src/features/community/community.constants.ts`
- `apps/mobile/src/features/community/community.moderation.ts`
- `apps/mobile/src/features/community/community.redaction.ts`
- `apps/mobile/src/features/community/community.service.ts`
- `apps/mobile/src/features/community/community.store.ts`
- `apps/mobile/src/features/community/community.types.ts`
- `apps/mobile/src/features/community/community.validators.ts`
- `apps/mobile/src/features/community/components/CommunityAdDisclosure.tsx`
- `apps/mobile/src/features/community/components/CommunityAttachmentList.tsx`
- `apps/mobile/src/features/community/components/CommunityCommentItem.tsx`
- `apps/mobile/src/features/community/components/CommunityModerationBanner.tsx`
- `apps/mobile/src/features/community/components/CommunityPostCard.tsx`
- `apps/mobile/src/features/community/components/CommunityWriteForm.tsx`
- `apps/mobile/src/features/community/hooks/useCommunityActions.ts`
- `apps/mobile/src/features/community/hooks/useCommunityFeed.ts`
- `apps/mobile/src/features/community/hooks/useCommunityPost.ts`
- `apps/mobile/src/features/community/hooks/useCommunityWrite.ts`
- `apps/mobile/src/features/community/__tests__/community.integration.test.ts`
- `apps/mobile/src/features/community/__tests__/community.redaction.test.ts`
- `apps/mobile/src/features/community/__tests__/community.service.test.ts`
- `apps/mobile/src/features/community/__tests__/community.validators.test.ts`

## Document-Theoretical Completion Claims

These files contain `documentTheoreticalCompleteness` metadata and must not be used as proof of operational readiness:

- `apps/admin/tsconfig.json`
- `apps/admin/package.json`
- `services/api/package.json`
- `services/notifications/package.json`
- `services/scheduler/package.json`

## Endpoint Alignment Risks

Known references that need reconciliation:

- Mobile uses `GET /api/v1/mobile/bootstrap`; current API context does not list a matching route module.
- Mobile uses `GET /api/v1/payroll/plans/current`; API context lists payroll under `/api/v1/payroll`, and existing docs identify `/api/v1/payroll/current`.
- Mobile uses `POST /api/v1/payroll/plans/:id/recalculate`; API context identifies `POST /api/v1/payroll/recalculate` as the current route risk, while API contract files also contain a payroll-plan recalculate descriptor. This requires route-manifest reconciliation before changing clients.
- Mobile community screens include bookmark actions; API contract and DB schema contain bookmark concepts, but current API route context must be checked before declaring route support.
- Admin uses `/admin/api/v1/dashboard/readiness`, `/admin/api/v1/banners`, `/admin/api/v1/metrics`, and `/admin/api/v1/events`; current API context centers on dashboard, users, community posts, reports, notices, ads, growth tasks, audit logs, and role members.

## Immediate Next Work

The Worker service typecheck blocker, package-level pnpm warning blocker, mobile type resolution blocker, zero-byte feature placeholders, and fragile local build tooling blockers have been resolved. The next highest-value work is release evidence and environment completion:

1. Provide or configure runtime secrets in the correct local/CI secret stores without committing values, then update `release/secrets-evidence.json` with verified names and stores only.
2. Keep Git repository metadata connected to the expected remote repository `jinbizman-boop/salary-hijacking`.
3. Verify Cloudflare Worker resources, Cloudflare runtime resources in `release/cloudflare-runtime-evidence.json`, EAS project, and mobile native release evidence. Local Android SDK/`adb`/`emulator` can satisfy native E2E prerequisites, but `nativeE2eVerified` must remain false until Detox or equivalent EAS/native device-farm proof is recorded without secrets. Do not modify or reuse existing unrelated repositories such as `Retro Games` or `jinbizman-boop/RETRO-DB`; do not reuse unrelated Cloudflare Pages projects such as `retro-db`.
4. Run real staging DB migration/seed, production migration dry-run, API/Admin/server-authority/privacy smoke checks, and rollback rehearsal against Neon and Cloudflare, then update `release/database-evidence.json` with booleans and non-secret proof notes only.
5. Run native mobile E2E and store build/submission dry runs.
6. Execute staging/production deploy, rollback rehearsal, observability checks, and operating QA.

This keeps broad project verification moving before deeper feature implementation.

## Completion Statement

This baseline map is file-level documentation work. It is complete for the current observed baseline, because it records the commands run, PASS/FAIL states, blockers, and next work target.

It does not mean the project is production-ready or project-wide operationally complete.
