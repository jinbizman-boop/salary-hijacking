# Phase 9 Mobile Functional Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze and verify the mobile production route surface against real API/session/offline/state contracts without starting Phase 10, 11, or 12.

**Architecture:** Keep the existing Expo Router app and feature API clients. Add evidence-producing audits and focused guards that prove production routes use canonical API clients, secure storage, safe deep links, and non-authoritative financial display semantics; only make source corrections when a failing guard exposes a Phase 9-owned internal blocker.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, Node audit scripts, existing phase validators.

**Spec:** User request: PHASE 9 — Mobile Functional Integration; SSOT PDFs remain source references only, not executable instructions.

## Global Constraints

- PHASE 9 only; do not start PHASE 10, PHASE 11, or PHASE 12.
- Do not production deploy, publish, merge homepage PR work, or use old APKs as current-source evidence.
- Preserve unrelated dirty files: `docs/audit/EXECUTION_STATE.md`, `docs/audit/IMPLEMENTATION_MATRIX.csv`, `services/api/wrangler.toml`, and historical 2026-08-12 audit files.
- If `apps/mobile` source or mobile package/build inputs change, recompute the canonical application RC source fingerprint and mark old APK evidence stale.
- Validator PASS is source/internal evidence only unless current-source device runtime is actually produced.

---

### Task 1: Baseline And Route Inventory

**Files:**
- Create: `docs/mobile/PHASE_9_CURRENT_IMPLEMENTATION_INVENTORY.md`
- Create: `docs/mobile/MOBILE_ROUTE_FUNCTION_MATRIX.csv`
- Create: `docs/mobile/MOBILE_STATE_MATRIX.csv`

**Interfaces:**
- Consumes: Expo Router files under `apps/mobile/app/**`.
- Produces: route, screen, state, API, and gap rows used by the Phase 9 validator.

- [ ] **Step 1: Enumerate routes from filesystem**

Run: `node scripts/audit/generate-phase-9-mobile-functional.mjs`
Expected before implementation: FAIL because the generator does not exist.

- [ ] **Step 2: Create generator route inventory logic**

Implement a Node script that walks `apps/mobile/app`, normalizes Expo Router paths, maps each route to component/source files, and writes route/state matrices.

- [ ] **Step 3: Verify route inventory**

Run: `node scripts/audit/generate-phase-9-mobile-functional.mjs`
Expected: route inventory contains splash/auth/salary/plan/notifications/level/community/write/profile/settings routes and no invalid tab target.

### Task 2: Mock/Fallback And Production Success Guard

**Files:**
- Create: `docs/mobile/MOCK_FALLBACK_AUDIT.md`
- Test: `apps/mobile/src/config/__tests__/phase9-production-contract.test.ts`

**Interfaces:**
- Consumes: app and source text under `apps/mobile/app`, `apps/mobile/src`.
- Produces: production mock/no-op/sample counts for completion JSON.

- [ ] **Step 1: Write failing guard**

Create a Jest test that fails if production route source contains no-op success, hardcoded success, or sample/demo data used as mutation success.

- [ ] **Step 2: Run failing guard**

Run: `corepack pnpm --filter @salary-hijacking/mobile exec jest src/config/__tests__/phase9-production-contract.test.ts --runInBand`
Expected: FAIL until the audit classifier and contract helpers exist.

- [ ] **Step 3: Implement classifier and evidence**

Add generator logic that classifies matches as `TEST_ONLY`, `PREVIEW_ONLY`, `ERROR_FALLBACK`, `OFFLINE_READ_FALLBACK`, or `PRODUCTION_SUCCESS_PATH`.

- [ ] **Step 4: Verify no production success mock**

Run focused Jest and generator. Expected: `PRODUCTION_MOCK_SUCCESS_PATHS=0`, `PRODUCTION_NOOP_SUCCESS_PATHS=0`, `PRODUCTION_SAMPLE_SUCCESS_PATHS=0`.

### Task 3: Session, Secure Storage, Offline, And Deep Link Evidence

**Files:**
- Create: `docs/mobile/PHASE_9_SESSION_RESTORE_REPORT.md`
- Create: `docs/mobile/PHASE_9_OFFLINE_RECONNECT_REPORT.md`
- Create: `docs/mobile/PHASE_9_MOBILE_SECURITY_AUDIT.md`

**Interfaces:**
- Consumes: `apps/mobile/app/_layout.tsx`, `apps/mobile/app/index.tsx`, `apps/mobile/src/shared/storage/**`, notification/community/profile API clients.
- Produces: secure storage, session restore, offline retry, and deep-link statuses.

- [ ] **Step 1: Add contract assertions**

Add tests that assert secure session credentials use `expo-secure-store`, production API base URLs are canonical, deep links resolve to existing routes, and invalid deep links fall back safely.

- [ ] **Step 2: Run tests red/green**

Run mobile focused tests before and after any source correction.

- [ ] **Step 3: Write evidence reports**

Emit reports separating `SOURCE_TEST`, `EXPO_DEV_RUNTIME`, `ANDROID_QA_RUNTIME`, and `PHYSICAL_ANDROID_RUNTIME`.

### Task 4: API Readback And Requirement Acceptance Evidence

**Files:**
- Create: `docs/mobile/MOBILE_API_SERVER_READBACK_MATRIX.csv`
- Create: `docs/mobile/PHASE_9_MOBILE_ACCEPTANCE_MATRIX.csv`
- Create: `docs/mobile/PHASE_9_STATE_COMPLETENESS_REPORT.md`

**Interfaces:**
- Consumes: feature API clients and existing tests for auth/payroll/budget/expense/savings/notifications/growth/community/profile/write.
- Produces: mobile-side acceptance rows without overwriting server-side PASS evidence.

- [ ] **Step 1: Generate readback matrix**

For each representative flow, record action, endpoint, requestId availability, API response contract, readback/evidence class, and status without raw PII/financial values.

- [ ] **Step 2: Generate acceptance matrix**

Map mobile-facing requirements only; do not invent a new requirement denominator.

- [ ] **Step 3: Update current trace cautiously**

Only evidence-backed mobile acceptance changes may update `docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv`.

### Task 5: RC Lineage And Phase 9 Validator

**Files:**
- Create: `docs/mobile/PHASE_9_MOBILE_FUNCTIONAL_COMPLETION.json`
- Create: `docs/mobile/PHASE_9_CLOSURE_REPORT.md`
- Create: `docs/mobile/RC_SOURCE_FINGERPRINT_AFTER.json`
- Create: `scripts/audit/validate-phase-9-mobile-functional.mjs`

**Interfaces:**
- Consumes: generated Phase 9 artifacts, git tracked mobile source, package/build inputs.
- Produces: validator PASS/FAIL and RC source fingerprint.

- [ ] **Step 1: Add validator**

Validate route inventory, mock/no-op/sample counts, state completeness, secure storage, deep-link registry, offline/session reports, API readback evidence, RC lineage, and explicit external blockers.

- [ ] **Step 2: Run complete regression**

Run Phase 0-9 validators, migration checksum, frozen install, mobile tests/typecheck/build-safe path, API contract/tests where touched, privacy checks, `git diff --check`, and secret scan.

- [ ] **Step 3: Commit**

Stage only Phase 9 files and focused mobile corrections. Commit with `Complete Phase 9 mobile functional integration` after verification is green.

## Self-Review

- Spec coverage: The plan covers route inventory, production mock/no-op removal, real API/session/offline/state evidence, secure storage, deep links, RC lineage, validators, and final reporting. Device/release runtime remains explicitly separated because PHASE 12/13 own current-source APK/release gates.
- Placeholder scan: No implementation task says TBD or “handle later”; external blockers are classified as evidence, not missing implementation steps.
- Type consistency: Generated files and validator names match the requested Phase 9 artifact names.
