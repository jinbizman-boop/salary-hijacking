# Gap Register

| Gap ID  | Severity | Area              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                              | Required Evidence                                                                                               | Status  |
| ------- | -------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------- |
| GAP-001 | P0       | Release source    | Current implementation, evidence, and QA updates are consolidated into the canonical release branch workflow. No-secret dirty-tree backup, format/typecheck/privacy/security/readiness-regression checks, and generated-junk cleanup are recorded.                                                                                                                                                                                                       | git status clean or documented staged release branch                                                            | PASS    |
| GAP-002 | P1       | Dependencies      | Frozen install has been rerun after workspace consolidation and package-manager script checks are covered.                                                                                                                                                                                                                                                                                                                                               | `corepack pnpm install --frozen-lockfile`: PASS                                                                 | PASS    |
| GAP-003 | P0       | Mobile startup    | Safe-entry Android startup has original-package and QA APK evidence, static APK inspection PASS, emulator clean install/lifecycle/upgrade/launcher proof, and fatal marker count 0. Physical Samsung phone logcat remains a separate device QA gate.                                                                                                                                                                                                     | direct/original APK, emulator install/lifecycle/upgrade launch proof, aapt, apksigner                           | PASS    |
| GAP-004 | P1       | Salary home       | Salary Home server-backed save/update/delete/complete, daily budget KST rollover, date-gated planned reminder visibility, duplicate-submit blocking, failure alerts, and secure preview persistence fallback are covered by regression tests. Final stable QA APK clean-install, launcher, upgrade, and post-clean emulator runtime proof is PASS. Physical Samsung-phone proof is tracked under GAP-008 and is not a Salary Home source-level blocker.  | salary component tests, launch/wiring tests, API repository tests, stable APK emulator runtime proof            | PASS    |
| GAP-005 | P1       | Plan              | Plan payroll/fixed/savings/daily living CRUD, server-authoritative recalculation, rejection handling, duplicate-submit blocking, KST recurrence visibility, accessibility labels, and recurrence lifecycle contracts are covered by regression tests. Final stable QA APK clean-install, launcher, upgrade, and post-clean emulator runtime proof is PASS. Physical Samsung-phone proof is tracked under GAP-008 and is not a Plan source-level blocker. | plan component tests, launch/wiring tests, API repository tests, stable APK emulator runtime proof              | PASS    |
| GAP-006 | P1       | UI                | Classified Stitch/HTML UI tracking is synchronized across CSV, summary, visual evidence, and implementation checklist with 305 tracked rows PASS and no PARTIAL/FAIL/BLOCKED rows. Physical safe-area/keyboard proof on the user's Samsung device remains a separate device QA gate.                                                                                                                                                                     | shared component contract tests, salary/plan/auth/capture screen tests, screenshots, Stitch matrix summary sync | PASS    |
| GAP-007 | P1       | Notifications     | Notifications stack/deep link validation passed without bottom-tab labels.                                                                                                                                                                                                                                                                                                                                                                               | navigation tests and emulator XML                                                                               | PASS    |
| GAP-008 | P0       | External approval | Production AAB/Play submit are explicitly not approved, local HEAD is not yet pushed to origin/main, and physical Samsung-phone QA remains unavailable because no affected phone is attached.                                                                                                                                                                                                                                                            | approval/push/physical-phone logcat or BLOCKED record                                                           | BLOCKED |

## 2026-07-22 Interaction Audit Addendum

`scripts/qa/audit-mobile-interactions.mjs` now scans runtime mobile source files for literal dead `onPress` callbacks and literal Expo Router targets that do not resolve to an app route. The generated evidence is `docs/qa/INTERACTION_ROUTE_AUDIT.md` and `artifacts/qa/mobile-interaction-audit-20260722.log`; current result is zero violations. Capture-only visual evidence screens are intentionally excluded from the runtime dead-action gate.

## 2026-07-22 Safe-Entry Startup Addendum

GAP-003 has an additional safe-entry QA candidate:

- APK: `artifacts/android/salary-hijacking-qa-safe-universal.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-qa-safe-universal.apk`
- SHA-256: `A4AA35DAC76571662D691F9DAB8A7A379C6B94AE28308FDCB5E1CC8496A52064`
- applicationId: `com.salaryhijacking.mobile.qa.direct`
- Source mitigation: Android boot now uses `android-safe-entry`, and startup SecureStore hydration failures preserve seeded state instead of rejecting.
- Emulator evidence: clean install PASS, upgrade install PASS, cold start 10/10 PASS, background/resume 10/10 PASS, target package fatal markers 0.
- Evidence files: `artifacts/qa/safe-apk-startup-timings-10x-20260722.csv`, `artifacts/qa/safe-apk-background-resume-10x-20260722.csv`, `artifacts/qa/safe-apk-logcat-10x-target-fatal-filter-20260722.txt`.
- ARM64 phone-target APK: `artifacts/android/salary-hijacking-qa-safe-arm64.apk`, SHA-256 `444878A6A2CC7329F17117AEB32A07E94C50071EA4C4BC11C078FD2FABA67FF1`, ABI `arm64-v8a` only, `aapt`/`apksigner`/native-lib inspection PASS. This satisfies the static phone-target APK evidence gate but does not replace physical phone install/logcat QA.

## 2026-07-22 Original Package Final Rebuild Addendum

The latest recommended QA APK now uses the original Android package so the user can test the real `급여납치` app icon instead of a `.qa.direct` side package.

- Universal APK: `artifacts/android/salary-hijacking-original-direct-current-universal.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-original-direct-current-universal.apk`
- SHA-256: `915AE5680B21510F413F684E55FA4547007A815B4469A24FD10D3798080DB76F`
- applicationId: `com.salaryhijacking.mobile`
- versionCode: `202607223`
- ABI: `arm64-v8a`, `x86_64`
- Static verification: `apksigner` PASS, `aapt` PASS.
- Emulator verification: clean install PASS, cold start 10/10 PASS, background/resume 10/10 PASS, fatal markers 0, exit-info crash/ANR markers 0. Evidence: `artifacts/qa/original-direct-current-universal-emulator-20260722-rebuild/summary.json`.
- Latest-source readiness gates: `mobile:preview:apk`, `mobile:preview:latest-source-apk`, `mobile:preview:phone-target-apk`, and `mobile:preview:emulator-qa` PASS.
- Classified Stitch evidence recheck: `scripts/qa/sync-stitch-evidence-status.mjs` PASS with 305/305 tracked rows PASS and missing 0.
- Direct build side-effect guard: RED/GREEN evidence proves `--android-entry direct` phone builds restore `apps/mobile/index.android.js` to the safe startup entry after Gradle completes.
- Generated-junk cleanup: `corepack pnpm run clean:junk` removed generated native build/test caches after rebuild.

Residual GAP-004/GAP-005 status remains PARTIAL only because physical Samsung phone relaunch, persistence, keyboard/safe-area, and no-secret logcat proof still cannot be collected without an attached physical phone. The tracked no-secret phone QA summary and handoff now point to the latest original-package ARM64 APK, but `physicalPhoneVerified=false` is the correct result in this workspace.

This closes the known source-level startup rejection path for the QA candidate, but physical Samsung/ARM64 phone QA remains blocked until an affected phone is connected and logcat confirms zero target-package fatal exceptions.

## 2026-07-23 Physical Phone Evidence Refresh

The latest original-package safe-entry patched APK was rechecked against the currently attached Android target list.

- ADB target list: `release/evidence/physical-phone/adb-devices.txt`
- Attached targets: emulator only (`emulator-5554`, `sdk_gphone64_x86_64`)
- Recommended user-facing APK: `C:/Users/PC/Downloads/salary-hijacking-original-safe-patched-current-universal.apk`
- Recommended APK SHA-256: `FC220C4250A0A511F7DEFB7A8B6B7A42E1BAF3559DBBF42F2548839D3F6124D8`
- Emulator evidence: `artifacts/qa/original-safe-patched-lifecycle-20260723-full/summary.json`
- Emulator result: clean install PASS, cold start 10/10 PASS, background/resume 10/10 PASS, fatal markers 0.
- Paired physical crash triage: `artifacts/qa/physical-phone-crash-triage-20260723-ready/summary.json`
- Physical crash triage result: `PHYSICAL_PHONE_QA_BLOCKED` because no physical Android phone is attached.
- Static APK inspection: `artifacts/qa/apk-original-safe-patched-current-universal-static-inspection-20260723.json`
- Static APK inspection result: PASS. The APK contains `assets/index.android.bundle`, `arm64-v8a` and `x86_64` Hermes/ReactNative/Reanimated/Screens/Expo startup libraries, safe-entry bundle markers, and no `android-direct-entry`, `ExpoRoot`, RC, stable-home, mock-only, or route fallback startup markers.
- No-secret tracked summary: `release/evidence/physical-phone/physical-phone-qa-summary.json`

GAP-004 and GAP-005 therefore remain PARTIAL for the same external device-evidence reason only: the currently reported Samsung crash cannot be root-caused without a physical-phone logcat or an attached affected phone. The original package and isolated diagnostic APKs are both available in `C:/Users/PC/Downloads` and `D:/salary-hijacking-artifacts/apk` for paired crash triage as soon as a physical phone is connected.

## 2026-07-23 Static APK Inspection Readiness Gate

Release readiness now treats static APK inspection as a mandatory mobile preview gate instead of passive evidence.

- New gate: `mobile:preview:static-apk-inspection`
- Required proof: embedded `assets/index.android.bundle`, matching APK SHA-256, `arm64-v8a` and `x86_64` startup native libraries, safe-entry bundle markers, forbidden direct/router/RC/mock startup markers absent, and no raw logcat/device identifiers/secret values.
- RED/GREEN tests: `artifacts/qa/check-release-readiness-static-apk-inspection-red-20260723.log`, `artifacts/qa/check-release-readiness-static-apk-inspection-green-20260723.log`
- Full readiness regression: `artifacts/qa/check-release-readiness-full-20260723-static-apk-inspection-gate-post-format.log`
- Current evidence result: PASS for `FC220C4250A0A511F7DEFB7A8B6B7A42E1BAF3559DBBF42F2548839D3F6124D8`

This reduces the chance of shipping another APK whose JavaScript bundle or native startup libraries are incomplete. It still does not replace physical Samsung phone logcat QA for the user-reported crash.

## 2026-07-23 Physical Triage Default APK Alignment

The paired physical-phone crash triage script now defaults to the latest original-package safe-entry patched APK instead of the older direct APK.

- Default original package APK: `C:/Users/PC/Downloads/salary-hijacking-original-safe-patched-current-universal.apk`
- Default original package SHA-256: `FC220C4250A0A511F7DEFB7A8B6B7A42E1BAF3559DBBF42F2548839D3F6124D8`
- Default isolated diagnostic APK: `C:/Users/PC/Downloads/salary-hijacking-qa-direct-current-universal.apk`
- Default isolated diagnostic SHA-256: `47C4BA596453367A71565D1AA02544D19C39A0500BB2799CA36AA412F8F1C0B9`
- RED/GREEN default-path proof: `artifacts/qa/physical-phone-triage-default-apk-red-20260723.log`, `artifacts/qa/physical-phone-triage-default-apk-green-20260723.log`
- Blocked physical proof now records APK SHA-256 even when no physical phone is attached: `artifacts/qa/mobile-preview-phone-proof-blocked-apk-sha-red-20260723.log`, `artifacts/qa/mobile-preview-phone-proof-blocked-apk-sha-green-20260723.log`
- Latest paired triage result: `artifacts/qa/physical-phone-crash-triage-20260723-default-safe-apk-sha/summary.json`

Current result remains `PHYSICAL_PHONE_QA_BLOCKED` because only the emulator is attached. The blocker is now cleaner: it records the exact APKs and hashes that were prepared for the missing physical-phone run.

## 2026-07-23 Final QA APK Stable Path Sync

The stable user-facing QA APK name now points to the same safe-entry patched original-package APK as the latest recommended crash-triage artifact.

- Stable repo APK: `artifacts/android/salary-hijacking-qa-universal.apk`
- Stable Downloads APK: `C:/Users/PC/Downloads/salary-hijacking-qa-universal.apk`
- Stable mirror APK: `D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-universal.apk`
- SHA-256: `FC220C4250A0A511F7DEFB7A8B6B7A42E1BAF3559DBBF42F2548839D3F6124D8`
- Manifest: `artifacts/android/final-qa-apk-manifest.json`
- Static inspection: `artifacts/qa/apk-final-qa-universal-static-inspection-20260723.json`
- Signature verification: `artifacts/qa/apk-final-qa-universal-apksigner-verify-20260723.log`

This removes the older mismatch where `salary-hijacking-qa-universal.apk` still referenced a previous `.qa` APK while the recommended crashfix APK used the original package safe-entry patched artifact.

## 2026-07-23 Final Stable QA APK Emulator Runtime Recheck

The stable user-facing QA APK was reinstalled and launched on the currently attached Android emulator after the stable-path sync.

- APK: `artifacts/android/salary-hijacking-qa-universal.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-qa-universal.apk`
- Mirror copy: `D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-universal.apk`
- SHA-256: `FC220C4250A0A511F7DEFB7A8B6B7A42E1BAF3559DBBF42F2548839D3F6124D8`
- Lifecycle proof: `artifacts/qa/final-qa-universal-lifecycle-20260723/summary.json`
- Result: clean install PASS, cold start 10/10 PASS, background/resume 10/10 PASS, fatal markers 0.
- Launcher-equivalent proof: `artifacts/qa/final-qa-universal-launcher-monkey-20260723/summary.json`
- Launcher result: `monkey -p com.salaryhijacking.mobile -c android.intent.category.LAUNCHER 1` PASS, fatal markers 0.

This proves the current stable APK starts cleanly in the local Android runtime, including launcher-style startup. It still does not prove the user-reported Samsung crash is gone because no physical Samsung/ARM64 phone is attached to this Codex environment, so physical phone QA remains the remaining crash-verification gate.

## 2026-07-23 Final Stable QA APK Upgrade Runtime Recheck

The stable user-facing QA APK was also verified on an upgrade-install path to catch stale installed-data or same-package upgrade regressions that are not covered by a clean install.

- Previous same-package APK: `artifacts/android/salary-hijacking-original-direct-current-universal.apk`
- Previous APK SHA-256: `915AE5680B21510F413F684E55FA4547007A815B4469A24FD10D3798080DB76F`
- Upgrade APK: `artifacts/android/salary-hijacking-qa-universal.apk`
- Upgrade APK SHA-256: `FC220C4250A0A511F7DEFB7A8B6B7A42E1BAF3559DBBF42F2548839D3F6124D8`
- Upgrade command shape: `adb install -r artifacts/android/salary-hijacking-qa-universal.apk`
- Upgrade proof: `artifacts/qa/final-qa-universal-upgrade-from-direct-20260723/summary.json`
- Result after upgrade: install PASS, cold start 10/10 PASS, background/resume 10/10 PASS, fatal markers 0.

This closes the local emulator upgrade regression check for the current stable APK. If the user's phone still launches an older crashing binary, the remaining likely causes are a not-yet-updated APK file on the phone, a differently signed previously installed package requiring uninstall before install, or a Samsung/physical-device-only runtime path that still needs physical logcat.

## 2026-07-23 Final Stable Runtime Readiness Gate

Release readiness now treats the final stable QA APK runtime evidence as a mandatory mobile preview gate.

- New gate: `mobile:preview:final-stable-runtime`
- Required proof: stable file name `salary-hijacking-qa-universal.apk`, SHA-256 matching the inspected APK, non-empty APK size, clean-install lifecycle proof, launcher-style startup proof, upgrade-install proof, cold start 10/10, background/resume 10/10, and fatal markers 0.
- RED/GREEN tests: `artifacts/qa/check-release-readiness-final-stable-runtime-red-20260723.log`, `artifacts/qa/check-release-readiness-final-stable-runtime-green-20260723.log`
- Current readiness proof: `artifacts/qa/release-readiness-soft-20260723-final-stable-runtime-gate.log`
- Current result: PASS for `FC220C4250A0A511F7DEFB7A8B6B7A42E1BAF3559DBBF42F2548839D3F6124D8`

This prevents future evidence drift where the downloadable final APK exists but has not been proven by clean-install, launcher, and upgrade runtime checks.

## 2026-07-23 Final Stable QA APK Post-Cleanup Runtime Recheck

The final stable QA APK was reinstalled and relaunched after generated-junk cleanup and old APK pruning to verify the cleanup did not remove required runtime artifacts.

- APK: `artifacts/android/salary-hijacking-qa-universal.apk`
- Downloads copy: `C:/Users/PC/Downloads/salary-hijacking-qa-universal.apk`
- Mirror copy: `D:/salary-hijacking-artifacts/apk/salary-hijacking-qa-universal.apk`
- SHA-256: `FC220C4250A0A511F7DEFB7A8B6B7A42E1BAF3559DBBF42F2548839D3F6124D8`
- ADB target evidence: `release/evidence/physical-phone/adb-devices-final-stable-runtime-gate.txt`
- Attached target: emulator only (`emulator-5554`, `sdk_gphone64_x86_64`)
- Lifecycle proof: `artifacts/qa/final-qa-universal-lifecycle-20260723-post-clean/summary.json`
- Result: clean install PASS, cold start 10/10 PASS, background/resume 10/10 PASS, fatal markers 0.
- Release readiness recheck: `artifacts/qa/release-readiness-soft-20260723-after-final-runtime-checksum.log`
- Diff hygiene: `artifacts/qa/git-diff-check-20260723-after-final-runtime-checksum.log` PASS.

This confirms the current user-facing QA APK remains executable after cleanup. The physical Samsung phone crash cannot be closed as PASS until the affected phone is attached or a sanitized physical-phone logcat is provided.
