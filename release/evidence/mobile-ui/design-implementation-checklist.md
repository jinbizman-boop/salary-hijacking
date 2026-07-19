# Mobile UI Design Implementation Checklist

Generated: 2026-07-19 KST

## Stitch Reference

- [x] 10 Stitch zip files inventoried.
- [x] 17 canonical screen references copied to `docs/design/stitch/2026-07-16/screens`.
- [x] Canonical HTML references copied to `docs/design/stitch/2026-07-16/html`.
- [x] `STITCH_SCREEN_INVENTORY.md` generated.
- [x] HTML was not copied into RN implementation.

## RN Visual System

- [x] Shared design tokens updated from Stitch visual direction.
- [x] Raised white card style applied through `SurfaceCard`.
- [x] Primary/secondary button hierarchy updated.
- [x] Filled selected pill/tab style applied.
- [x] Bottom tab spacing and selected state adjusted.
- [x] Record input card enlarged for keyboard-safe entry.

## Feature Components

- [x] Salary hero and metric card hierarchy updated.
- [x] Fixed expense card row style updated.
- [x] Daily budget amount cells updated.
- [x] Variable expense quick-add changed to vertical input structure.
- [x] Plan progress and breakdown card style updated.
- [x] Level main, reading, news, English, and health cards updated.
- [x] Community tab and post cards updated.
- [x] Profile header updated.

## Function and Policy Preservation

- [x] Server-authority API handlers were not removed.
- [x] Financial values remain state/API-driven, not Stitch demo hardcoded.
- [x] Ad data remains separated from raw financial data.
- [x] LV UP record-required and XP server-authority contracts retained.
- [x] Community privacy/moderation contracts retained.
- [x] Profile raw personal data masking retained.
- [x] Android post-splash root view background contract restored.

## Evidence

- [x] Web export regenerated.
- [x] 33 mobile UI screenshots regenerated.
- [x] Store screenshots regenerated.
- [x] Responsive checks across 320, 360, 375, 390, 393, 412, 430, 768 passed.
- [x] `capture-summary.json` regenerated.
- [x] `stitch-comparison.md` generated.
- [x] Profile detail, community detail, notification settings, common state, consent, input form, and plan-setting form evidence added.

## Required Before 100% Claim

- [x] Latest APK build regenerated from current HEAD.
- [x] APK SHA256 recorded: `CBF6353546E00E1CCB32ACAC7D333B421EEAB172366666966FEFB422356ECE5B`.
- [ ] APK install/cold-start tested on Android physical device.
- [ ] No AndroidRuntime fatal exception in logcat.
