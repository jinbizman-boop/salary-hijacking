# Iteration 082 Mobile Android Debug Build Conflict Port Review

Date: 2026-07-14 KST

## Scope

- `apps/mobile/scripts/expo-local-android-debug-build.mjs`
- `apps/mobile/scripts/expo-local-android-debug-build.test.mjs`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/scripts/expo-local-android-debug-build.mjs`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/scripts/expo-local-android-debug-build.test.mjs`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISIONS.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`

## Decision

Both mobile Android debug build conflict rows are `CURRENT_ACCEPTED`.

The current platform implementation supersedes the archived copies. It keeps the local preview APK workflow aligned with the latest Windows/Expo build requirements by covering bundled `.tools` JDK and Android SDK discovery, stale Windows `subst` alias cleanup for `X/Y/Z`, ABI normalization, Expo PackageList patch hardening, Windows CMake prefab repair, Reanimated CMake regeneration, and no-secret local APK evidence behavior.

## Evidence

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/scripts/expo-local-android-debug-build.mjs apps/mobile/scripts/expo-local-android-debug-build.mjs`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/scripts/expo-local-android-debug-build.test.mjs apps/mobile/scripts/expo-local-android-debug-build.test.mjs`
- `node scripts/release/classify-merge-conflict-archive.mjs`
- `node --test apps/mobile/scripts/expo-local-android-debug-build.test.mjs`: PASS, 21 tests
- `node --test scripts/release/classify-merge-conflict-archive.test.mjs scripts/release/check-release-readiness.test.mjs`: PASS, 89 tests

## Register Result

- Total conflict files: 132
- Current path exists: 106
- Missing current path: 26
- Byte-identical: 0
- `CURRENT_ACCEPTED`: 16
- `REVIEW_REQUIRED`: 76
- `EXCLUDE_RUNTIME`: 26
- `SUPERSEDED_BY_CURRENT_EVIDENCE`: 14

## Remaining Work

The merge archive is still not safe to delete. Seventy-six `REVIEW_REQUIRED` rows remain and must receive file-level semantic port decisions or verified supersession evidence first.
