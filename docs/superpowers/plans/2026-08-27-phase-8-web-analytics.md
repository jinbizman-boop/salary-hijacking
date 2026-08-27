# Phase 8 Web Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close PHASE 8 Web / Landing / Analytics internal requirements without starting PHASE 9 or changing production traffic.

**Architecture:** Integrate the already-approved static homepage source from PR #3 into `apps/web`, then add only metadata, routing, security-header, validation, and evidence layers. Keep analytics as a shared privacy-safe contract in `packages/api-contract` so future Web/Mobile/Admin clients consume one taxonomy and one prohibited-parameter guard.

**Tech Stack:** Static HTML/CSS/JS, Node.js audit scripts, Vitest, TypeScript, `@salary-hijacking/api-contract`.

**Spec:** `C:\Users\PC\.codex\attachments\870c1c12-2f14-4628-9a78-d64dbb439313\pasted-text.txt`

## Global Constraints

- Perform PHASE 8 only.
- Do not start PHASE 9.
- Do not merge PR #3.
- Do not deploy production Web.
- Do not switch `salaryhijacking.com` traffic.
- Do not install Google Analytics, Meta Pixel, or arbitrary tracking SDKs.
- Do not emit raw financial values, PII, tokens, or free text in analytics.
- Keep `PROJECT_COMPLETION_100=false` and `COMMERCIAL_LAUNCH_READY=false`.
- Preserve unrelated dirty files.

---

### Task 1: Web Source Integration

**Files:**
- Create: `apps/web/**`
- Create: `apps/web/_headers`
- Create: `apps/web/_redirects`

**Interfaces:**
- Consumes: PR #3 commit `03190a699940934d2451a861690f74d7d926675b`.
- Produces: local static Web source with pretty route rewrites and static hosting security headers.

- [x] Fetch the remote PR branch.
- [x] Copy `apps/web` from PR #3 without merging PR #3.
- [x] Add pretty route rewrites for `/privacy`, `/terms`, `/support`, and `/partners`.
- [x] Add static hosting security headers for CSP, content sniffing, referrer policy, and permissions policy.
- [x] Preserve the approved visual design.

### Task 2: Analytics Privacy Contract

**Files:**
- Create: `packages/api-contract/src/analytics/analytics.schema.test.ts`
- Create: `packages/api-contract/src/analytics/analytics.schema.ts`
- Modify: `packages/api-contract/src/index.ts`
- Modify: `packages/api-contract/package.json`

**Interfaces:**
- Consumes: Zod and existing api-contract package exports.
- Produces: `@salary-hijacking/api-contract/analytics`.

- [x] Write failing tests for valid event parsing, prohibited financial/PII/token/free-text rejection, privacy audit parameter validation, and duplicate event detection.
- [x] Run the focused test and verify it fails because `analytics.schema` is missing.
- [x] Implement the minimal analytics event schema and batch duplicate guard.
- [x] Export analytics through the root contract registry and package export map.
- [x] Run focused analytics tests and verify green.

### Task 3: Phase 8 Evidence Generation

**Files:**
- Create: `scripts/audit/generate-phase-8-web-analytics.mjs`
- Create/update: `docs/web-analytics/**`
- Update: `docs/audit/CURRENT_REQUIREMENT_TRACE_MATRIX.csv`

**Interfaces:**
- Consumes: `apps/web`, api-contract analytics source, current trace matrix.
- Produces: Web runtime evidence, analytics schema docs, privacy event audit, requirement matrices, completion JSON, and trace updates.

- [x] Serve `apps/web` through a local no-secret HTTP server.
- [x] Verify Web pages, assets, local references, SEO, company/contact SSOT, a11y source checks, responsive breakpoints, phone aspect ratio, and no third-party tracking.
- [x] Generate WEB-001~008 matrix.
- [x] Generate ANL-001~010 matrix.
- [x] Generate combined 18-row primary matrix.
- [x] Update only WEB/ANL rows in `CURRENT_REQUIREMENT_TRACE_MATRIX.csv`.

### Task 4: Phase 8 Validator

**Files:**
- Create: `scripts/audit/validate-phase-8-web-analytics.mjs`

**Interfaces:**
- Consumes: PHASE 8 generated artifacts and trace matrix.
- Produces: hard gate for Phase 8 evidence consistency.

- [x] Validate required artifacts.
- [x] Validate exact 8 WEB rows, 10 ANL rows, 18 primary rows, and duplicate-free IDs.
- [x] Validate runtime evidence booleans and HTTP 200 page/asset checks.
- [x] Validate privacy audit denies raw financial, PII, token, and free-text fields.
- [x] Validate status flags, D gates, no production deploy, and trace updates.

### Task 5: Final Verification

**Files:**
- Verify-only unless failures require a focused fix.

**Interfaces:**
- Consumes: all Phase 0~8 validators and repository build/test commands.
- Produces: focused PHASE 8 commit when green.

- [ ] Run Phase 0~8 validators.
- [ ] Run migration checksum validator.
- [ ] Run api-contract focused tests.
- [ ] Run typecheck/build/API contract as scoped by the changed packages.
- [ ] Run `git diff --check`.
- [ ] Run no-secret scan.
- [ ] Commit and push focused PHASE 8 changes if all required checks are green.
