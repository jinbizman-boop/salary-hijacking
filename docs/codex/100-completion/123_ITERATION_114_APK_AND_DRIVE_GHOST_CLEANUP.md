# Iteration 114 - Current-Head APK And Drive Ghost Cleanup

Date: 2026-07-14 KST

## Scope

Refreshed the Android phone-target debug APK after current HEAD
`8aae41a9615793f77cb471b343d7cf6dea36b98e` added the duplicate variable-expense
save guard. Also investigated the Explorer-visible `X:`, `Y:`, and `Z:` drive
entries reported by the user.

## Drive Finding

- `Get-PSDrive`, `Win32_LogicalDisk`, `Get-Volume`, `Get-Partition`,
  `fsutil fsinfo drives`, `subst`, `net use`, and `mountvol` showed only active
  filesystem drives `C:` and `D:`.
- `X:`, `Y:`, and `Z:` were not active volumes, network mappings, or subst drives.
- Stale Explorer `MountPoints2` keys for `X`, `Y`, and `Z` were backed up and
  removed.
- Registry backup:
  `D:/salary-hijacking-artifacts/20260714/drive-cleanup/mountpoints2-before-x-y-z-cleanup.reg`
- Post-cleanup `fsutil fsinfo drives`: `C:\ D:\`.

## Storage Finding

- `salary-hijacking-platform`: about `1.29 GB`.
- `salary-hijacking-main`: `0 B` hidden legacy shell.
- `salary-hijacking-work`: `0 B` hidden legacy shell.
- `D:/salary-hijacking-artifacts`: about `0.13 GB`.
- `D:/salary-hijacking-local-tools`: about `8.87 GB`, preserved because it holds
  Android/APK build tooling.
- `corepack pnpm run clean:junk`: PASS, removed regenerated `v8-compile-cache`.

## APK

- Artifact:
  `D:/salary-hijacking-artifacts/20260714/iteration-114-current-head-after-dedupe-and-drive-cleanup/salary-hijacking-phone-arm64-iteration114-debug.apk`
- Downloads copy:
  `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration114-debug.apk`
- Raw GitHub download:
  `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260714-iteration114/salary-hijacking-phone-arm64-iteration114-debug.apk`
- SHA256:
  `1ECDFF0AE5E1ABCCA963AAB012C73BAC6D925BC0395AF570B7AAD6D35DF74E54`
- Size: `64,826,777` bytes.
- Package: `com.salaryhijacking.mobile`.
- Label: `급여납치`.
- ABI: `arm64-v8a`.

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile run build:phone:android:local-debug`:
  PASS.
- `apksigner verify --verbose --print-certs`: PASS with APK Signature Scheme v2.
- `aapt dump badging`: PASS for package, app label, min SDK 24, target SDK 35,
  and `arm64-v8a`.
- APK ZIP/native library inspection: PASS for `arm64-v8a`.
- Raw GitHub URL download verification: PASS; downloaded SHA256 matched.
- `release/mobile-preview-evidence.json`: updated for current HEAD and parsed as
  valid JSON.
- `node scripts/release/generate-device-test-matrix.mjs`: PASS.
- `node scripts/release/generate-physical-phone-qa-handoff.mjs`: PASS.

## Remaining

This refresh proves a latest-source phone-target debug APK artifact exists and is
downloadable. It does not replace physical Android phone QA. Full launch readiness
still requires a real phone run proving install, cold start, navigation,
persistence, keyboard/safe-area, and no-fatal logcat markers.
