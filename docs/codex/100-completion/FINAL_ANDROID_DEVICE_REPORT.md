# Final Android Device Report

Updated: 2026-07-15 KST

## Current Status

- Latest preserved phone QA APK: PASS, salary-hijacking-phone-arm64-iteration138-debug.apk.
- Local artifact: D:/salary-hijacking-artifacts/20260715/iteration-138-root-capture-web-guard-apk/salary-hijacking-phone-arm64-iteration138-debug.apk.
- Download copy: C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration138-debug.apk.
- Download URL: https://raw.githubusercontent.com/jinbizman-boop/salary-hijacking/codex-apk-artifacts-20260715-iteration138/salary-hijacking-phone-arm64-iteration138-debug.apk.
- SHA256: 79E68CC7B6C0532B9672CCE4F2654BB9ADEF2814AC3A68B4652160DE9E33E879.
- Package: com.salaryhijacking.mobile.
- ABI: arm64-v8a.
- Local Android SDK/ADB availability: previously verified in this workspace; latest attached-device observation returned no physical phone.
- Physical phone install/cold-start/logcat QA: BLOCKED until a real Android phone is attached or the user completes the handoff checklist.

## Evidence

- release/mobile-preview-evidence.json
- docs/codex/100-completion/147_ITERATION_138_ROOT_CAPTURE_WEB_GUARD.md
- docs/codex/100-completion/148_ITERATION_139_PHYSICAL_PHONE_QA_HANDOFF_REFRESH.md
- docs/qa/100-completion/physical-phone-qa-handoff.md

## Required Physical Phone Command

```powershell
adb devices
node scripts\release\collect-mobile-preview-phone-proof.mjs --apk "C:/Users/PC/Downloads/salary-hijacking-phone-arm64-iteration138-debug.apk" --runs 20 --output release/mobile-preview-phone-proof.local.json --package com.salaryhijacking.mobile
```

## Final Device Gate

The Android emulator and APK packaging evidence are useful but do not replace physical phone QA. The public-launch device gate remains BLOCKED until the latest APK is installed on a real Android device, cold-started repeatedly, navigated through core flows, and checked with masked logcat output.
