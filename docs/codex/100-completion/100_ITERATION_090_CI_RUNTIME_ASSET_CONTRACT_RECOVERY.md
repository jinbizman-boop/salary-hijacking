# Iteration 090 - CI Runtime Asset Contract Recovery

Updated: 2026-07-16 KST

## Scope

- Restore the GitHub Actions launch-readiness signal after mobile runtime asset contract failures.
- Keep generated Android output ignored except for the exact native files required by the mobile E2E contract.
- Remove non-image `.gitkeep` markers from runtime image folders and replace them with image-named placeholder assets for CI folder tracking.

## Remote Head

- Branch: `codex/payroll-reminder-launch-ready-100-20260714`
- Latest remote HEAD: `f71bb6d4e82f223c05b71a19fe9c6b00dadd656d`

## Actions

- Added `.gitignore` exceptions for:
  - `apps/mobile/android/app/src/main/res/values/styles.xml`
  - `apps/mobile/android/app/src/main/res/drawable/ic_launcher_background.xml`
  - `apps/mobile/android/app/src/main/java/com/salaryhijacking/mobile/MainActivity.kt`
- Added required mobile native contract files.
- Removed runtime image folder `.gitkeep` markers.
- Added placeholder image-named files to required runtime image folders:
  - `ad-banners/placeholder.png`
  - `book-covers/placeholder.png`
  - `community-thumbnails/placeholder.png`
  - `news-thumbnails/placeholder.png`
  - `placeholders/placeholder.png`
  - `workout/placeholder.png`

## Verification

- GitHub Actions for `f71bb6d4e82f223c05b71a19fe9c6b00dadd656d`:
  - `deploy-api`: PASS
  - `deploy-admin`: PASS
  - `mobile-build`: PASS
  - `ci`: PASS
  - `release`: PASS
  - `security-scan`: PASS
- Mobile verification artifacts:
  - `mobile-verification-reports-1`
  - `mobile-native-proof-1`

## APK Evidence

- Preserved phone-target APK: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration138-debug.apk`
- Artifact copy: `D:/salary-hijacking-artifacts/20260715/iteration-138-root-capture-web-guard-apk/salary-hijacking-phone-arm64-iteration138-debug.apk`
- SHA256: `79E68CC7B6C0532B9672CCE4F2654BB9ADEF2814AC3A68B4652160DE9E33E879`

## Remaining Blocker

- Physical phone QA remains BLOCKED in this environment because `adb` is not installed or discoverable and no Android SDK root is present.
- Latest CI does not create a fresh APK on pull-request runs; it verifies source, tests, release dry-run gates, security scan, and no-secret native proof.

## Notes

- No production AAB, Play submission, new EAS project, new keystore, secret rotation, destructive DB migration, force push, rebase, or PR merge was performed.
