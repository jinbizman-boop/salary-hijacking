# Iteration 110 - Storage Cache Cleanup

Date: 2026-07-14 KST

## Scope

Responded to the storage pressure report where File Explorer showed duplicate-looking
`X:`, `Y:`, and `Z:` drives and the Salary Hijacking workspace appeared to occupy
multiple stores.

## Findings

- The active repository remains `C:\Users\PC\Desktop\salary-hijacking-platform`.
- Windows APIs available to Codex expose only `C:` and `D:`:
  - `Win32_LogicalDisk`: `C:`, `D:`.
  - `Get-PSDrive`: `C:`, `D:`.
  - `subst`: empty.
  - `net use`: no mapped drives.
  - `Test-Path X:\`, `Y:\`, `Z:\`: false.
- Workspace sizes after cleanup:
  - `salary-hijacking-platform`: about 1.29 GB.
  - `salary-hijacking-main`: 0 MB legacy shell.
  - `salary-hijacking-work`: 0 MB legacy shell.
  - `D:\salary-hijacking-artifacts`: about 71 MB.
- The largest active payload is protected build state:
  - `node_modules`: about 1.13 GB.
  - `C:\Users\PC\Desktop\salary-hijacking-platform\.tools` is a junction to
    `D:\salary-hijacking-local-tools\.tools`.
  - `C:\Users\PC\.gradle` is a junction to
    `D:\salary-hijacking-local-tools\user-dot-gradle`.

## Cleanup

Removed stale duplicate toolchain/cache payloads that are not active junction targets:

- `D:\salary-hijacking-toolchain-cache\user-dot-gradle`
- `D:\salary-hijacking-toolchain-cache\salary-hijacking-platform-dottools`
- `D:\salary-hijacking-toolchain-cache\android-commandlinetools-win-latest.zip`
- `D:\salary-hijacking-toolchain-cache\temurin17-jdk-windows-x64.zip`

Preserved:

- `D:\salary-hijacking-local-tools\.tools` because local Android APK builds use it.
- `D:\salary-hijacking-local-tools\user-dot-gradle` because `C:\Users\PC\.gradle`
  points to it.
- `D:\salary-hijacking-toolchain-cache\user-dot-android` because `C:\Users\PC\.android`
  points to it.
- `node_modules`, tracked source, tracked evidence, and explicit APK artifacts.

## Result

- `corepack pnpm run clean:junk`: PASS, removed regenerated temp cache.
- Estimated reclaimed duplicate toolchain/cache space: about 1.56 GB.
- `D:` free space increased from about 454.18 GB to about 455.71 GB during this pass.
- No production AAB, Play submission, new EAS project, new keystore, secret rotation,
  destructive DB change, force push, or rebase was performed.

## Remaining

- `D:\salary-hijacking-local-tools` is about 9.08 GB and is currently treated as
  protected active local build tooling for APK generation.
- `X:`, `Y:`, and `Z:` are not visible to the current Codex Windows process. If they
  remain visible in Explorer, they are outside the currently exposed filesystem API
  state and should be refreshed/unmapped from the Windows session rather than treated
  as active Salary Hijacking repositories.
