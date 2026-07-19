# Iteration 137 - Native Capture Route Guard

## Scope

- Prevented native Android/iOS app runtime from rendering screenshot capture preview screens through `/capture/*`.
- Kept web export capture routes available for store screenshot generation.
- This narrows the production Preview/Reference surface without changing the screenshot capture pipeline.

## Changed Files

- `apps/mobile/app/capture/[screen].tsx`
- `apps/mobile/src/shared/api/__tests__/app-screen-contract.test.ts`

## TDD Evidence

- RED: `corepack pnpm --filter @salary-hijacking/mobile test -- src/shared/api/__tests__/app-screen-contract.test.ts --runInBand --testNamePattern "web-only"` failed because the capture route did not import `Platform`, did not check `Platform.OS !== "web"`, and returned `CapturePreviewScreen` directly.
- GREEN: the same focused test passed after the native guard was added.

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile test -- src/shared/api/__tests__/app-screen-contract.test.ts --runInBand`: PASS, 30 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile run export:web`: PASS.
- Android arm64-v8a preview/debug APK was rebuilt for source HEAD `782d01f72ea168869aa408de680034a3c87e7cc3`.
- APK SHA256: `AE3B112859887FDD3C060D26926626B0B53FA7A173FF54164050AF90E7EB6EB9`.
- APK URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration137/salary-hijacking-phone-arm64-iteration137-debug.apk`.
- APK header, `aapt` package metadata, `apksigner`, and raw download SHA match: PASS.

## Remaining Blockers

- This does not complete physical Android phone install/cold-start/logcat/persistence QA.
- This does not approve or run production AAB or Play submission.
- Strict launch readiness still depends on unresolved gap-register rows and external approval gates.
