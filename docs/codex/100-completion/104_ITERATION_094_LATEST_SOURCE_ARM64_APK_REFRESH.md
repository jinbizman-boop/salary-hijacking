# Iteration 094 - Latest Source ARM64 APK Refresh

Date: 2026-07-14 KST

## Scope

- `release/mobile-preview-evidence.json`
- `D:/salary-hijacking-artifacts/20260714/iteration-094-latest-source-arm64/apk-summary.json`
- `D:/salary-hijacking-artifacts/20260714/iteration-094-latest-source-arm64/salary-hijacking-phone-arm64-iteration094-debug.apk`
- `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration094-debug.apk`

## Result

- Rebuilt the current dirty mobile source snapshot as an ARM64 Android debug APK for physical phone QA.
- Verified APK package metadata with Android build tools:
  - package: `com.salaryhijacking.mobile`
  - label: `급여납치`
  - versionName: `1.0.0`
  - versionCode: `1`
  - minSdk: `24`
  - targetSdk: `35`
  - native ABI: `arm64-v8a`
- Verified APK signing with `apksigner verify --verbose --print-certs`.
- Verified the APK contains required ARM64 native Expo/React Native runtime libraries:
  - `lib/arm64-v8a/libexpo-modules-core.so`
  - `lib/arm64-v8a/libhermes.so`
  - `lib/arm64-v8a/libreactnative.so`
  - `lib/arm64-v8a/libreanimated.so`
- Copied the APK to `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration094-debug.apk` for easier device transfer.
- Refreshed `release/mobile-preview-evidence.json` so strict readiness can verify that the current mobile source snapshot is represented by the preview APK evidence.

## APK

- SHA256: `073A807EADB4F8CD0EB1571F396DEF6CC7B486876B564CBFEA4901267E70BA91`
- Current source status digest: `440942CF973FEA903CD77493A2AE0E9DC30B773B606D1690BFD85B6CC8F9148F`
- Dirty mobile source path count at packaging time: `119`

## Validation

- `corepack pnpm --filter @salary-hijacking/mobile exec node scripts/expo-local-android-debug-build.mjs --check --architecture arm64-v8a --output build/phone/android/salary-hijacking-phone-arm64-debug.apk`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile exec node scripts/expo-local-android-debug-build.mjs --architecture arm64-v8a --output build/phone/android/salary-hijacking-phone-arm64-debug.apk`: generated the APK after a long-running Gradle build.
- Android `aapt dump badging`: PASS for package, launch activity, SDK versions, label, and ABI.
- Android `apksigner verify --verbose --print-certs`: PASS.
- `node scripts/release/check-release-readiness.mjs --strict`: `mobile:preview:latest-source-apk` PASS and `mobile:preview:phone-target-apk` PASS.
- `corepack pnpm run clean:junk`: PASS, removed 28 generated paths and freed 1.62 GB.
- `corepack pnpm run disk:report -- --top 12`: PASS, `removable generated paths: none`; platform folder total is 1.25 GB after cleanup.

## Remaining Blockers

- Physical Android phone QA remains BLOCKED because no physical phone is attached to this Codex Windows environment.
- Strict release readiness remains BLOCKED by unresolved launch gaps and physical phone QA.
- Production AAB and Play submission remain BLOCKED by explicit approval values set to NO.

## Post-Consolidation Note

- Iteration 095 later consolidated the dirty release-source snapshot into the canonical branch at `e0fa3bba99ac8d84e238071d77cf4e0d92c837ab` and pushed it to `origin/main`.
- The current strict readiness gate now reports git status and `origin/main` alignment as PASS.
- Remaining strict blockers are unresolved launch gaps `GAP-003`, `GAP-004`, `GAP-005`, `GAP-006`, `GAP-008`, plus physical Android phone QA.
