# Iteration 047 - D Drive Temp Cleanup Guard

Date: 2026-07-14 KST

## Scope

User reported that Salary Hijacking work was consuming multiple storage locations. The current Windows/Codex state showed only real filesystem drives `C:` and `D:`; `X:`, `Y:`, and `Z:` were not mounted by `Get-PSDrive`, `Win32_LogicalDisk`, `Get-Volume`, `subst`, `net use`, or `mountvol`.

The real storage pressure came from regenerated Codex/Expo/Android temporary directories:

- `D:\codex-temp`
- `D:\codex-tmp`
- repeated `salary-expo-android-*`, `salary-release-ready-*`, `native-platform*dir`, `node-compile-cache`, `v8-compile-cache`, and `hsperfdata_*` entries

Manual cleanup freed more than 16 GB on `D:` before this guard was added. This iteration prevents the same class of generated junk from accumulating again.

## Changes

- Extended `scripts/dev/clean-generated-junk.mjs` temp junk patterns to include large Expo/Android/CMake/Node runtime temp directories.
- Added default Windows Codex temp roots:
  - `D:\codex-temp`
  - `D:\codex-tmp`
- Kept source, tracked release evidence, APK evidence folders, `node_modules`, toolchain cache, and user assets protected.
- Added tests proving:
  - large Codex Android temp directories are deleted from configured temp roots,
  - unrelated temp directories are preserved,
  - default cleanup scans include the external Codex temp roots,
  - stale subst mappings still remain covered.

## RED Evidence

`node --test scripts/dev/clean-generated-junk.test.mjs`

- First RED failed because `salary-expo-android-abc123` remained after cleanup.
- Second RED failed because `defaultTempRoots` was not exported and the default scan did not yet expose the external `D:` temp roots.

## GREEN Evidence

`node --test scripts/dev/clean-generated-junk.test.mjs`

- PASS, 9 tests.

`corepack pnpm run test:root-scripts`

- PASS, 300 tests.

`git diff --check`

- PASS.

`corepack pnpm run clean:junk`

- PASS.
- First run after the code change removed 48 generated paths and freed 5.4 MB from local Temp.
- Follow-up run removed `D:\codex-temp\salary-hijacking` and `v8-compile-cache`, freeing 873.5 KB.
- Final check removed empty `D:\codex-temp`; `D:\codex-tmp` was absent.

## Current Storage State

- `D:` used: about 5.47 GB.
- `D:` free: about 493.96 GB.
- Preserved:
  - `D:\salary-hijacking-toolchain-cache`
  - `D:\salary-hijacking-artifacts`
  - `C:\Users\PC\Desktop\salary-hijacking-platform`

## Remaining Limits

This closes a generated-junk recurrence gap. It does not complete physical Android phone QA, deployed DB persistence, clean release source, production AAB, EAS submit, Play submission, or market publication.
