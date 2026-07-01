---
codex_context: true
priority: P0
scope: apps/mobile
applies_to:
  - apps/mobile/**
last_verified: 2026-06-29
---

# Mobile App Context

## Package

Path: `apps/mobile`

Package name: `@salary-hijacking/mobile`

Current package/config files:

- `package.json`
- `tsconfig.json`
- `eas.json`
- `app.config.ts`
- `.detoxrc.json`
- `e2e/jest.config.cjs`
- `e2e/smoke.e2e.js`

`package.json`, `tsconfig.json`, `eas.json`, and `.detoxrc.json` parse as JSON when read with BOM handling where needed.

## Screens

Main route files:

- `app/_layout.tsx`
- `app/index.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- `app/(tabs)/salary/index.tsx`
- `app/(tabs)/plan/index.tsx`
- `app/(tabs)/level/index.tsx`
- `app/(tabs)/community/index.tsx`
- `app/(tabs)/profile/index.tsx`
- `app/notifications/index.tsx`
- `app/community/[postId].tsx`
- `app/community/write.tsx`
- `app/level/reading.tsx`
- `app/level/news.tsx`
- `app/level/english.tsx`
- `app/level/health.tsx`

## Implementation Pattern

Many screens use:

- runtime module loading,
- `React.createElement`-style helpers,
- local fallback seed data,
- explicit privacy flags,
- no raw financial data exposure claims.

Do not convert large screen files to a new architecture without a scoped plan.

## Current Verification

Commands run on 2026-06-29:

- `pnpm.cmd --filter @salary-hijacking/mobile run typecheck`: PASS
- `pnpm.cmd --filter @salary-hijacking/mobile run test`: PASS, 24 suites and 77 tests
- `pnpm.cmd --filter @salary-hijacking/mobile run lint`: PASS
- `pnpm.cmd --filter @salary-hijacking/mobile run format:check`: PASS
- `pnpm.cmd --filter @salary-hijacking/mobile run test:e2e`: FAIL at Android environment setup

Detox now has a repository-level execution contract:

- `.detoxrc.json` defines `android.emu.debug` and `ios.sim.debug`.
- `e2e/jest.config.cjs` uses Detox's Jest setup, teardown, reporter, test environment, and `jest-circus/runner`.
- `e2e/smoke.e2e.js` launches the app and checks `salary-hijacking-mobile-root`.
- `app/_layout.tsx` exposes `testID: "salary-hijacking-mobile-root"` on the root shell.
- `scripts/check-detox-env.mjs` runs before Detox and fails fast with actionable Android/iOS native E2E prerequisites.
- `scripts/import-e2e-apk.mjs` imports a locally downloaded EAS/local Android
  E2E APK into `build/e2e/android/salary-hijacking-e2e.apk` without storing
  artifact URLs or release proof artifact paths in the repository. Run it through
  `corepack pnpm --filter @salary-hijacking/mobile run e2e:android:import-apk -- <local-apk-path>`.

The current E2E blocker is local native binary/proof, not missing Detox config:

- `apps/mobile/scripts/check-detox-env.mjs` now checks `ANDROID_SDK_ROOT`,
  `ANDROID_HOME`, and common Android Studio SDK locations such as the Windows
  default SDK directory.
- On 2026-07-01, `release/mobile-native-evidence.json` detected local `adb`
  and `emulator` through Android SDK tool lookup.
- On 2026-07-01, `node scripts\check-detox-env.mjs android.emu.debug` failed
  only because the local E2E APK was missing:
  `apps/mobile/build/e2e/android/salary-hijacking-e2e.apk`.
- No local Android E2E APK at `apps/mobile/build/e2e/android/salary-hijacking-e2e.apk` has been verified.
- The expected APK path is ignored by Git through root `.gitignore` build and
  APK protections.
- Tool availability alone is not native E2E proof; `nativeE2eVerified` must
  remain false until Detox or equivalent device-farm evidence is recorded
  without secrets.

Mobile native release evidence is tracked in `release/mobile-native-evidence.json`.
When EAS build, native E2E, or store-submit dry-run proof changes, record only
no-secret observations in `release/mobile-native-observation.local.json`, run
`corepack pnpm run release:mobile-native-proof` to normalize
`release/mobile-native-proof.local.json`, then run
`corepack pnpm run release:mobile-native-evidence`. Do not store EAS tokens,
Apple/Google credentials, binary download URLs, local artifact paths, signing
keys, service accounts, reviewer passwords, or copied store-console payloads in
repository files.

Official mobile UI assets are already bundled:

- Official BI logo:
  `apps/mobile/assets/brand/salary-hijacking-platform-logo.png`
- User-provided BI source hash on 2026-07-01:
  `EA89CE50080526157F9C5BC086C7CACC0D98CAD40EA0258514150D7F16520466`
- Bundled BI hash:
  `EA89CE50080526157F9C5BC086C7CACC0D98CAD40EA0258514150D7F16520466`
- Freesentation font files:
  `apps/mobile/assets/fonts/Freesentation-4Regular.ttf` through
  `Freesentation-9Black.ttf`

`apps/mobile/src/shared/styles/__tests__/clean-fintech-theme.test.ts` guards the
official BI asset SHA256, Freesentation font loading, Clean Fintech v1 token
values, bottom tab IA, screenshot anchor, and Korean mojibake absence for the
launch screen set.
`scripts/release/check-release-readiness.mjs` also blocks release readiness when
the bundled official BI logo is missing, invalid PNG, or SHA256-mismatched, or
when any required Freesentation font asset is missing, not TTF/OTF-shaped, or
too small to be the bundled launch font.
It also validates launch PNG dimensions and byte sizes for `icon.png`,
`splash.png`, `adaptive-icon.png`, `notification-icon.png`, and `favicon.png`,
so placeholder-sized assets cannot pass the mobile release gate.

On 2026-07-01, `corepack pnpm --filter @salary-hijacking/mobile run export:web`
passed and exported the official BI plus Freesentation assets. `node
scripts\release\capture-mobile-clean-fintech-screenshots.mjs` then regenerated
five 430x932 store screenshot candidates and one 1024x500 Google Play feature
graphic from the local app export and mock API. Visual inspection confirmed the
home, daily budget, and feature graphic surfaces render the official BI and
Clean Fintech value-first layout.
Release readiness blocks placeholder-sized screenshot PNGs by requiring phone
screenshots to be at least 360x640 and 20,000 bytes, and the Google Play
feature graphic to be exactly 1024x500 and at least 40,000 bytes.

## Feature File Status

As of 2026-06-29, `apps/mobile/src/features/budget` and `apps/mobile/src/features/community` contain 51 non-empty files and no zero-byte source/test/component files were found in those two feature trees.

## Endpoint Alignment Notes

Previously observed high-priority mobile/API alignment gaps have been reduced:

- `/api/v1/mobile/bootstrap` is implemented in the API worker app.
- mobile auth stores bearer tokens and shared mobile API helpers attach them.
- public Expo Router paths such as `/salary`, `/plan`, and `/level` are used for local smoke navigation.
- local API plus Expo web smoke verified signup/login and `/salary`, `/level`, `/plan` navigation.

Remaining endpoint work should still compare touched mobile calls against `services/api/src/routes` before claiming API/mobile coverage complete. Community bookmark-like actions and deeper write flows require route-level verification when those screens are next touched.

## Mobile Work Checklist

Before reporting mobile work complete:

1. Confirm package dependencies are installed/resolved.
2. Run mobile JSON checks.
3. Run mobile typecheck.
4. Run relevant tests or explain why tests are unavailable.
5. Compare touched API calls against `services/api/src/routes`.
6. Update `08_FILE_COMPLETION_LOG.md`.
