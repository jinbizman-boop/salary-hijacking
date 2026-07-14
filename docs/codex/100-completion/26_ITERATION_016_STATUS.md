# Iteration 016 Status - Plan Server-First Fixed Expense And APK Freshness Guard

Date: 2026-07-13 KST

## Scope

- Strengthened the Plan reference screen fixed-expense add flow so new fixed-expense rows call the server-authoritative plan commitments API before syncing the local preview row.
- Added a plan form day input so fixed-expense `paymentDay` is captured instead of silently defaulting.
- Strengthened release readiness so latest-source preview APK evidence fingerprints dirty mobile/package source by file contents, not only by path names.
- Rebuilt the latest-source ARM64 phone-target debug APK and refreshed no-secret mobile preview evidence.

## Code Changes

- `apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx`
  - Accepts an injectable `planCommitmentsApi` for tests and runtime API wiring.
  - Uses `createMobilePlanCommitmentsApi()` outside Jest.
  - Calls `createFixedExpense` for newly added fixed-expense rows before local preview persistence.
  - Builds `PlanFixedExpenseCreateRequest` with `title`, `amountMinor`, `category`, and `paymentDay`.
  - Falls back to local preview only when API/staging is unavailable, keeping the fallback non-authoritative.
- `apps/mobile/src/features/plan/__tests__/plan.components.test.tsx`
  - Covers server-first fixed-expense create behavior and server response row rendering.
- `scripts/release/check-release-readiness.mjs`
  - Replaced path-list-only latest-source fingerprinting with path + content SHA256 entries.
  - Recursively fingerprints dirty source directories so untracked mobile feature folders are represented by their file contents.
- `scripts/release/check-release-readiness.test.mjs`
  - Covers both matching dirty-source content evidence and blocking evidence after a dirty file changes post-APK.

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/features/plan/__tests__/plan.components.test.tsx src/features/salary/__tests__/salary.components.test.tsx src/features/plan/__tests__/plan.api.test.ts --runInBand`: PASS, 27 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `node --test scripts\release\check-release-readiness.test.mjs`: PASS, 73 tests.
- `corepack pnpm exec prettier --check "apps/mobile/src/features/plan/components/PlanReferenceScreen.tsx" "apps/mobile/src/features/plan/__tests__/plan.components.test.tsx" "scripts/release/check-release-readiness.mjs" "scripts/release/check-release-readiness.test.mjs"`: PASS.
- `git diff --check`: PASS.
- `node scripts\release\check-release-readiness.mjs --soft`: READY; `mobile:preview:apk`, `mobile:preview:latest-source-apk`, and `mobile:preview:phone-target-apk` PASS for iteration 016.

## APK Evidence

- APK: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration016-debug.apk`
- Archive: `D:/salary-hijacking-artifacts/20260713/iteration-016-plan-server-first-fixed-expense/salary-hijacking-phone-arm64-iteration016-debug.apk`
- Summary: `D:/salary-hijacking-artifacts/20260713/iteration-016-plan-server-first-fixed-expense/apk-summary.json`
- SHA256: `56EF9A03377839EFF9595AB5F7A65103D99CBF40F86DAB6E98E835AAE754F22A`
- Size: `65,072,581` bytes.
- `apksigner verify --verbose`: PASS, APK Signature Scheme v2 true, one signer.
- ABI inspection: PASS, `arm64-v8a` only; `lib/arm64-v8a/libexpo-modules-core.so` present.
- Current dirty mobile/package source content fingerprint recorded in evidence: `0A423A235F1D92EE4E0B4E23930218E4B4D27E711AB3BB8C2AE5418599B56D2E`.

## Remaining Blockers / Warnings

- Physical Android phone install, cold start, keyboard, safe-area, persistence, and logcat QA remain unverified because no physical phone is attached to this Windows Codex environment.
- This is a debug/pre-release APK, not a production AAB.
- No production AAB, EAS submit, Play submission, new EAS project, new keystore, Firebase reset, secret rotation, destructive DB migration, force push/rebase, or Cloudflare secret mutation was performed.
