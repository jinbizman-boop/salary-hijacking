# Iteration 112 - Storage Drive Audit

Date: 2026-07-14 KST

## Purpose

Rechecked the user-reported Windows Explorer view that appeared to show Salary Hijacking consuming five 110 GB drives. The goal was to distinguish real duplicated project data from drive-letter or Explorer display confusion, and to clean only generated junk that is safe to regenerate.

## Current Repository

- Canonical repository: `C:\Users\PC\Desktop\salary-hijacking-platform`
- HEAD: `ed0793e9b537e667f717187e421d53a7da1d5fe1`
- Branch: `codex/commercialization-100`
- Working tree before cleanup: clean
- Working tree after cleanup: clean

## Drive Findings

The Codex Windows process currently sees only these filesystem drives:

| Drive |      Size |      Free | Notes                                                                   |
| ----- | --------: | --------: | ----------------------------------------------------------------------- |
| `C:`  | 110.76 GB |  29.53 GB | Main Windows disk and canonical platform checkout location.             |
| `D:`  | 465.13 GB | 455.65 GB | Large data/tooling volume used for offloaded artifacts and build tools. |

`fsutil fsinfo drives`, `Get-PSDrive`, and `Win32_LogicalDisk` show no accessible `X:`, `Y:`, or `Z:` drives in this process. `Test-Path X:\`, `Y:\`, and `Z:\` all returned false.

## Project Footprint

| Path                                            |           Size | Decision                                                   |
| ----------------------------------------------- | -------------: | ---------------------------------------------------------- |
| `C:\Users\PC\Desktop\salary-hijacking-platform` | about 1.288 GB | Active canonical checkout. Preserve.                       |
| `C:\Users\PC\Desktop\salary-hijacking-main`     |     about 0 GB | Empty legacy path. Ignore per current objective.           |
| `C:\Users\PC\Desktop\salary-hijacking-work`     |     about 0 GB | Empty legacy path. Ignore per current objective.           |
| `D:\salary-hijacking-artifacts`                 | about 0.130 GB | Current APK/evidence artifacts. Preserve.                  |
| `D:\salary-hijacking-local-tools`               | about 8.871 GB | Active local Android/JDK/Gradle build toolchain. Preserve. |
| `D:\salary-hijacking-toolchain-cache`           |     about 0 GB | Stale duplicate cache already removed in Iteration 110.    |

## Active Junctions

- `C:\Users\PC\Desktop\salary-hijacking-platform\.tools` is a junction to `D:\salary-hijacking-local-tools\.tools`.
- `C:\Users\PC\.gradle` is a junction to `D:\salary-hijacking-local-tools\user-dot-gradle`.
- `C:\Users\PC\.android` is a junction to `D:\salary-hijacking-toolchain-cache\user-dot-android`.

The apparent `.tools` size inside the repository is therefore not an extra duplicate copy on `C:`; it is the active offloaded toolchain target on `D:`.

## Cleanup Performed

- Ran `corepack pnpm run clean:junk`.
- Removed regenerated `C:\Users\PC\AppData\Local\Temp\v8-compile-cache`.
- Freed 873.3 KB in this pass.

## Conclusion

The platform is not currently occupying five full repository copies from the Codex-visible filesystem view. The real active storage consumers are:

1. Canonical platform checkout plus dependencies: about 1.3 GB.
2. Active local Android build toolchain on `D:`: about 8.9 GB.
3. APK artifacts: about 133 MB.

The `X:`, `Y:`, and `Z:` drives shown in Explorer are not visible to this Codex process as mounted filesystem drives, and no Salary Hijacking data could be audited or removed from them here.

## Remaining

- If Explorer still shows `X:`, `Y:`, and `Z:` after refresh/reboot, inspect them from the same Windows user session outside Codex using Disk Management or `mountvol`.
- Do not delete `D:\salary-hijacking-local-tools` unless another Android build toolchain is configured, because it is required for local APK generation.
