# Physical Android Phone QA Handoff

Updated: 2026-07-19 KST

## Current APK

- Downloads APK: `C:/Users/PC/Downloads/salary-hijacking-phone-arm64-debug.apk`
- Artifact APK: `D:/salary-hijacking-artifacts/apk/salary-hijacking-phone-arm64-debug.apk`
- Repo APK: `apps/mobile/build/phone/android/salary-hijacking-phone-arm64-debug.apk`
- Remote APK: not republished for this rebuild; use the Downloads APK on this Windows machine.
- SHA256: `235B109A78C623B90DCA0A763F155517DE3FAC17C2077AC1BB892ED6FE1C3D3A`
- Packaged source HEAD: `ee5df3101f53b596a9b818e731a82b41f953ea02`
- Latest pushed evidence HEAD at phone-observation time: `60f021cdb2658576327ffb24afd10bdc39684921`
- Android package: `com.salaryhijacking.mobile`
- ABI: `arm64-v8a`

## Why This Is Still Blocked

- Current status: BLOCKED
- Blocker: No physical Android phone is attached to this Codex Windows environment at observation time; bundled adb at `C:/Users/PC/Desktop/salary-hijacking-platform/.tools/android-sdk/platform-tools/adb.exe` returned no attached device on 2026-07-19 KST.
- This handoff does not replace physical phone QA. strict readiness remains BLOCKED until the local no-secret proof file is produced by an attached physical Android phone.

## Required Phone Setup

- Use a real ARM64 Android phone, not an emulator.
- Enable Developer options and USB debugging.
- Connect the phone to this Windows PC.
- Confirm Android shows the USB debugging authorization prompt and approve it.
- Keep the phone unlocked during the first run.

## Required Command

Preferred one-command runner:

```powershell
Set-Location 'C:\Users\PC\Desktop\salary-hijacking-platform'
node scripts\release\run-physical-phone-qa.mjs --runs 20
```

Direct collector command:

```powershell
Set-Location 'C:\Users\PC\Desktop\salary-hijacking-platform'
node scripts\release\collect-mobile-preview-phone-proof.mjs --apk "C:/Users/PC/Downloads/salary-hijacking-phone-arm64-debug.apk" --runs 20 --output release/mobile-preview-phone-proof.local.json --package com.salaryhijacking.mobile
```

## What The Collector Must Prove

- Install succeeds on the attached physical phone.
- Installed package is verified with `adb shell pm path com.salaryhijacking.mobile`.
- 20 cold-start runs complete with zero fatal markers.
- 20 background/foreground runs complete with zero fatal markers.
- Navigation smoke reaches the package launcher without fatal markers.
- Process kill plus relaunch persistence probe completes.
- keyboard/safe-area probes complete.
- raw logcat and raw package paths are summarized only; raw logcat lines, `/data/app/...` package paths, device serials, tokens, signing keys, and credentials are not stored.

## Expected Proof File

- Local proof: `release/mobile-preview-phone-proof.local.json`
- This file is intentionally local/ignored because it may contain machine paths and hashed device identifiers.
- The proof is acceptable only when it reports:
  - `physicalPhoneVerified=true`
  - `installVerified=true`
  - `installedPackageVerified=true`
  - `installedPackagePathHash` is present
  - `packageInfoProbe.rawPackageInfoStored=false`
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
