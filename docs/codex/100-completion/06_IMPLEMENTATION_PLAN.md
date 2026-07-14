# Implementation Plan

Generated: 2026-07-12T20:44:11

## Immediate Execution Order

1. Preserve baseline and secret-safe evidence. Status: PASS.
2. Restore dependencies with frozen lockfile. Status: PASS.
3. Run baseline gates. Status: PASS for format, package script check, mobile typecheck, mobile tests, mobile export, root build, root script tests.
4. Add launch-readiness regression tests for salary home, plan-home sync, and notification stack. Status: PASS.
5. Split release readiness into soft/default and strict exit semantics. Status: PASS; current strict gate intentionally fails on warnings/dirty tree.
6. Classify 132 merge conflict archive files. Status: PASS for category classification, file-by-file inventory, semantic port decisions, and final release-source cleanup; `85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv` records 92 `CURRENT_ACCEPTED`, 0 `REVIEW_REQUIRED`, 26 `EXCLUDE_RUNTIME`, and 14 `SUPERSEDED_BY_CURRENT_EVIDENCE` rows after repo-config, release-script, backend-source, admin-source, mobile uploads, mobile Android debug build, mobile app config, mobile Clean Fintech style, mobile shared layout, mobile Salary Home, mobile Profile/MY, mobile Plan, mobile Notifications, mobile Auth/Splash, mobile Router/Tabs/Capture, mobile LV UP, and mobile Community semantic review. Iteration 097 removed the ignored historical archive directory and retained the register/decision files as evidence.
7. Expand traceability matrix from all source documents. Status: PASS for automated document-row generation; `scripts/release/generate-requirements-traceability.mjs` now regenerates `02_REQUIREMENTS_TRACEABILITY_MATRIX.csv` and `03_REQUIREMENTS_TRACEABILITY_MATRIX.md` from source document paths without copying document bodies or secret-like raw artifacts. Current output indexes 284 source documents and retains 21 non-document launch requirements for 305 total rows.
8. Run Android local/preview APK build and physical device QA when toolchain/device is available. Status: PARTIAL/PASS for current-source ARM64 phone-target APK refresh; BLOCKED for physical phone install, cold-start, logcat, persistence, keyboard, and safe-area QA because no physical phone is attached.
9. Clean or intentionally commit/stage release source after user-approved completion batch. Status: PENDING.

## Current No-Approval Work Remaining

- No merge conflict archive rows remain in `REVIEW_REQUIRED`; the ignored `.merged-from-salary-hijacking-main` archive has been removed from the active source tree, and the classifier now reports cleanup-complete status from retained decision evidence.
- Keep the generated requirements matrix current after source document additions or removals.
- Add strict checks for current-HEAD artifact hashes and device evidence freshness.
- Add more UI visual contract tests for PDF pages 7-17.
- Run Cloudflare/API/Admin/DB dry-run checks that do not mutate production.
- Physical phone install/cold-start/logcat/persistence QA remains blocked until a device is attached.
- Current-source ARM64 phone APK evidence is refreshed in `release/mobile-preview-evidence.json` and `docs/codex/100-completion/104_ITERATION_094_LATEST_SOURCE_ARM64_APK_REFRESH.md`.
