# UI Finalization Plan

Generated: 2026-07-19 KST

This plan continues the active goal without waiting for further approval. It is scoped to completing the UI/UX finalization gates from the goal objective while preserving server authority, privacy, ads separation, existing architecture, and user changes.

## Phase 1: Intake And Traceability

Status: IN_PROGRESS

1. Keep all work in `C:/Users/PC/Desktop/salary-hijacking-platform`.
2. Maintain `docs/ui/SOURCE_MANIFEST.md` with all discovered sources and missing source blockers.
3. Maintain `docs/ui/SCREEN_CATALOG.csv` for SCR-001 through SCR-030.
4. Maintain `docs/ui/REQUIREMENTS_TRACEABILITY.md` with PASS/PARTIAL/BLOCKED evidence.
5. Maintain `docs/ui/UI_DECISION_LOG.md` for visual and policy conflicts.

Gate: G01 and G02 cannot become PASS until all named source files are found, confirmed absent, or explicitly replaced by repository evidence.

## Phase 2: Design Tokens And Shared Components

Status: PARTIAL

1. Audit `apps/mobile/src/shared/components/tokens.ts`.
2. Add a design-token lint script only if it can detect real violations without noisy false positives.
3. Expand shared component contract tests for token usage, touch size, accessibility labels, and common state rendering.
4. Remove screen-local arbitrary HEX/radius/shadow values where they duplicate tokens.

Gate: G10 and G14 require token lint or equivalent tests plus accessibility evidence.

## Phase 3: Official Screen Coverage

Status: PARTIAL

1. Keep the 17 Stitch-mapped screens visually stable.
2. Add visual capture routes for the remaining SCR-018, SCR-022 through SCR-030 detail/state screens.
3. Add explicit modal/state model coverage for fixed expense, fixed saving, living cost, delete confirmation, withdrawal confirmation, offline, empty, loading, and server error states.
4. Ensure every button in captured states has a route, mutation, or disabled reason.

Gate: G03 through G08 require 30 official screens, modal inventory, state inventory, and dead-link checks.

## Phase 4: Interaction And Persistence

Status: PARTIAL

1. Expand E2E or integration coverage for salary plan creation, fixed expense/saving CRUD, daily budget CRUD, variable expense persistence, notifications deep links, LV UP completion, community post/comment/reaction/report, profile updates, support inquiry, logout, and withdrawal-cancel flow.
2. Keep API failure states from claiming success.
3. Verify keyboard avoidance for all form screens.

Gate: G17, G18, and G20 require broader automated and device-backed evidence.

## Phase 5: Visual, Responsive, Accessibility

Status: PARTIAL

1. Continue using `node scripts/release/capture-mobile-clean-fintech-screenshots.mjs`.
2. Extend responsive matrix to include 768px where the objective requires it.
3. Add or wire an accessibility check for Expo Web routes if feasible.
4. Record visual differences in `docs/ui/VISUAL_DIFF_REPORT.md`.

Gate: G11 through G14 require visual, responsive, safe-area, keyboard, and accessibility proof.

## Phase 6: Build, APK, Review, Report

Status: PARTIAL

1. Run mobile lint/typecheck/test/export/capture after each meaningful UI slice.
2. Rebuild preview APK after runtime UI changes.
3. Verify APK package metadata and signature.
4. Run `corepack pnpm run check:release-readiness`.
5. Run three independent reviews or equivalent scoped audits.
6. Write `docs/ui/FINAL_UI_IMPLEMENTATION_REPORT.md`.

Gate: G23 through G30 require review evidence, clean generated junk, final diff review, and final report.

## Rollback

- Code changes must be narrow and committed by slice.
- Generated references under `docs/design/stitch/2026-07-16` may be regenerated using `scripts/release/prepare-stitch-design-system.mjs`.
- Visual captures may be regenerated using `scripts/release/capture-mobile-clean-fintech-screenshots.mjs`.
- Do not reset or clean unrelated user changes.
