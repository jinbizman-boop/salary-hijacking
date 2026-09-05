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

## APK Evidence

- Source HEAD packaged: `4b7f8dcd1ec2902aa71c13ca33ce1dcaa6bb0c8c`.
- APK: `D:/salary-hijacking-artifacts/20260715/iteration-138-root-capture-web-guard-apk/salary-hijacking-phone-arm64-iteration138-debug.apk`.
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration138-debug.apk`.
- APK URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration138/salary-hijacking-phone-arm64-iteration138-debug.apk`.
- SHA256: `79E68CC7B6C0532B9672CCE4F2654BB9ADEF2814AC3A68B4652160DE9E33E879`.
- APK header: PASS, `50 4B 03 04`.
- `aapt dump badging`: PASS for package `com.salaryhijacking.mobile`, label `급여납치`, version `1.0.0`, versionCode `1`, minSdk `24`, targetSdk `35`, and native code `arm64-v8a`.
- `apksigner verify --verbose --print-certs`: PASS with v2 debug signature.
- Raw GitHub download SHA matched the local APK.

## Remaining Blockers

- Physical phone startup/logcat, keyboard/safe-area matrix, and app relaunch persistence remain unverified without an attached phone or approved device-farm evidence.
- Production AAB and Play submission remain blocked by explicit approval policy.
