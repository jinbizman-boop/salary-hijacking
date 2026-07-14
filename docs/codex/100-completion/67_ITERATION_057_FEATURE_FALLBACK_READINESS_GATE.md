# Iteration 057 - Feature Fallback Readiness Gate

Date: 2026-07-14 KST

## Scope

- `scripts/release/check-release-readiness.mjs`
- `scripts/release/check-release-readiness.test.mjs`

## Requirement

Mobile feature runtime code must not reintroduce fallback-only CleanFintech screens, fallback normalization helpers, local response helpers, or sample detail/comment data after app routes have been moved to feature/API boundaries.

This protects launch QA from a regression where a feature component can silently mask missing API or persistence data even when app route files are clean.

## Root Cause

The existing release readiness boundary checked `apps/mobile/app` route files only. It did not inspect `apps/mobile/src/features`, so a feature-level import or local sample fallback could bypass `mobile:route-fallback-boundaries`.

## TDD Evidence

RED:

```powershell
node --test --test-name-pattern "strict readiness blocks mobile feature dependencies on CleanFintech fallback screens" scripts/release/check-release-readiness.test.mjs
```

Result: failed as expected because `strict:mobile-feature-fallback-boundary` was missing.

GREEN:

```powershell
node --test --test-name-pattern "strict readiness blocks mobile feature dependencies on CleanFintech fallback screens" scripts/release/check-release-readiness.test.mjs
```

Result: PASS for the focused test.

Regression:

```powershell
node --test scripts/release/check-release-readiness.test.mjs
```

Result: PASS, 80 tests.

Current-source readiness projection:

```powershell
node scripts/release/check-release-readiness.mjs --soft | Select-String -Pattern 'Salary Hijacking release readiness|mobile:route-fallback-boundaries|mobile:feature-fallback-boundaries|strict:mobile-feature-fallback-boundary|strict:mobile-route-fallback-boundary'
```

Result: release readiness remains `BLOCKED` overall, while both fallback boundary checks PASS:

- `PASS mobile:route-fallback-boundaries`
- `PASS mobile:feature-fallback-boundaries`

Runtime source scan:

```powershell
rg -n "CleanFintech[A-Za-z0-9_]*Screen|clean-fintech-screens|normalizeGrowthDashboardForCleanFintech|sampleDetail|sampleComments|function\s+response\s*\(" apps/mobile/src/features apps/mobile/app -S --glob '!**/__tests__/**'
```

Result: no matches.

## Implementation

- Added `MOBILE_FEATURE_ROOTS` for `apps/mobile/src/features`.
- Reused fallback boundary pattern detection for both route files and feature runtime files.
- Added `mobile:feature-fallback-boundaries`.
- Added strict projection blocker `strict:mobile-feature-fallback-boundary`.

## Status

File-level verified completeness: PASS.

Project-wide launch readiness: still BLOCKED by remaining strict release gates, including physical Android phone QA and external tool/approval gates. No production AAB, Play submission, new EAS project, new keystore, secret rotation, destructive DB action, or force push was performed.
