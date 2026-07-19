# Iteration 125 - Current HEAD Phone APK Refresh

Date: 2026-07-15 KST

## Scope

- `release/mobile-preview-evidence.json`
- `docs/codex/100-completion/133_ITERATION_125_CURRENT_HEAD_PHONE_APK_REFRESH.md`
- `docs/codex/08_FILE_COMPLETION_LOG.md`

## Source Packaged

- HEAD: `d8b2381635e39502520a3fd9a903010f38c916ff`
- Branch: `codex/payroll-reminder-launch-ready-100-20260714`
- APK type: Android debug APK for phone QA, `arm64-v8a`
- This is not a production AAB and not a Google Play submission.

## APK

- Local artifact: `D:/salary-hijacking-artifacts/20260715/iteration-125-current-head-apk/salary-hijacking-phone-arm64-iteration125-debug.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration125-debug.apk`
- Download URL: `https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration125/salary-hijacking-phone-arm64-iteration125-debug.apk`
- SHA256: `DB1003E7E602F5073B866C8D1786F5041F3E898965163E9295BF30DF02F77CE2`
- Size: `64,827,637` bytes

## Verification

- `corepack pnpm --filter @salary-hijacking/mobile run build:e2e:android:local-debug:preflight`: PASS.
- `corepack pnpm --filter @salary-hijacking/mobile run build:phone:android:local-debug`: PASS, exit code 0.
- APK header: PASS, ZIP/APK header `50 4B 03 04`.
- ABI inspection: PASS, only `arm64-v8a`.
- `aapt dump badging`: PASS, package `com.salaryhijacking.mobile`, app label `급여납치`, min SDK 24, target SDK 35, native code `arm64-v8a`.
- `apksigner verify --verbose --print-certs`: PASS, APK Signature Scheme v2 debug certificate.
- GitHub raw URL: PASS, HTTP 200.
- Download verification: PASS, downloaded size and SHA256 matched local APK.

## Remaining

- Physical Android phone install, cold start, route navigation, persistence, keyboard, safe-area, and logcat QA are still pending because no physical phone is attached to this Codex Windows environment.
- Strict release readiness remains blocked by unresolved launch gaps and external approval gates.
