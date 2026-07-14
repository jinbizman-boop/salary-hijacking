# Physical Android Phone QA Handoff

Updated: 2026-07-15 KST

## Current APK

- Downloads APK: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration117-debug.apk`
- Artifact APK: `D:/salary-hijacking-artifacts/20260714/iteration-117-current-head-apk/salary-hijacking-phone-arm64-iteration117-debug.apk`
- SHA256: `4661878AE771A39D13879AD2E95749F17735BE74AE8916049438D69368345C36`
- Android package: `com.salaryhijacking.mobile`
- ABI: `arm64-v8a`

## Why This Is Still Blocked

- Current status: BLOCKED
- Blocker: No physical Android phone is attached to this Codex Windows environment at observation time.
- This handoff does not replace physical phone QA. strict readiness remains BLOCKED until the local no-secret proof file is produced by an attached physical Android phone.

## Required Phone Setup

- Use a real ARM64 Android phone, not an emulator.
- Enable Developer options and USB debugging.
- Connect the phone to this Windows PC.
- Confirm Android shows the USB debugging authorization prompt and approve it.
- Keep the phone unlocked during the first run.

## Required Command

```powershell
Set-Location 'C:\Users\PC\Desktop\salary-hijacking-platform'
node scripts\release\collect-mobile-preview-phone-proof.mjs --apk "C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration117-debug.apk" --runs 20 --output release/mobile-preview-phone-proof.local.json --package com.salaryhijacking.mobile
```

## What The Collector Must Prove

- Install succeeds on the attached physical phone.
- 20 cold-start runs complete with zero fatal markers.
- 20 background/foreground runs complete with zero fatal markers.
- Navigation smoke reaches the package launcher without fatal markers.
- Process kill plus relaunch persistence probe completes.
- keyboard/safe-area probes complete.
- raw logcat is summarized only; raw logcat lines, device serials, tokens, signing keys, and credentials are not stored.

## Expected Proof File

- Local proof: `release/mobile-preview-phone-proof.local.json`
- This file is intentionally local/ignored because it may contain machine paths and hashed device identifiers.
- The proof is acceptable only when it reports:
  - `physicalPhoneVerified=true`
  - `installVerified=true`
  - `coldStartRuns>=20`
  - `backgroundForegroundRuns>=20`
  - `coldStartFatalCount=0`
  - `navigationSmokeVerified=true`
  - `backgroundForegroundVerified=true`
  - `persistenceVerified=true`
  - `keyboardSafeAreaVerified=true`
  - `logcatSummary.rawLogcatStored=false`

## Follow-Up Validation

```powershell
node scripts\release\check-release-readiness.mjs --strict
corepack pnpm run clean:junk
corepack pnpm run disk:report -- --top 20
```

## Notes

- Do not paste raw logcat, serial numbers, tokens, credentials, keystore data, or store credentials into tracked files.
- If the phone run fails, keep the generated local proof untracked and fix the reported fatal marker or install blocker before rerunning.
