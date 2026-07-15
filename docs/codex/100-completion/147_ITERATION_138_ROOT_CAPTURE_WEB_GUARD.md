# Iteration 138 - Root Capture Web Guard

## Scope

- Prevented screenshot capture preview rendering from being reachable through the native root layout or launch index path.
- Kept web screenshot capture support available for release screenshot automation.

## Root Cause

- `/capture/[screen]` was already guarded for native runtime, but root layout and launch index still depended only on browser location availability before resolving `CapturePreviewScreen`.
- React Native environments can expose browser-like globals in some runtimes, so native runtime should explicitly require `Platform.OS === "web"` before reading capture browser URLs.

## Code Changes

- `apps/mobile/app/_layout.tsx`
  - `readBrowserLocation()` now returns `null` unless `NativeRuntimeRef.Platform.OS === "web"`.
- `apps/mobile/app/index.tsx`
  - imports `Platform` from `react-native`.
  - `readBrowserLocation()` now returns `null` unless `Platform.OS === "web"`.
- `apps/mobile/src/shared/api/__tests__/app-screen-contract.test.ts`
  - added contract coverage for the root layout and launch index web-only capture guard.

## Verification

- RED: `corepack pnpm --filter @salary-hijacking/mobile test -- src/shared/api/__tests__/app-screen-contract.test.ts --runInBand --testNamePattern "root and launch capture"` failed before implementation because no root/index web platform guard existed.
- GREEN: same focused test passed after the guard.
- `corepack pnpm --filter @salary-hijacking/mobile test -- src/shared/api/__tests__/app-screen-contract.test.ts --runInBand`: PASS, 31 tests.
- `corepack pnpm --filter @salary-hijacking/mobile run typecheck`: PASS.

## Remaining Blockers

- Physical phone startup/logcat, keyboard/safe-area matrix, and app relaunch persistence remain unverified without an attached phone or approved device-farm evidence.
- Production AAB and Play submission remain blocked by explicit approval policy.
