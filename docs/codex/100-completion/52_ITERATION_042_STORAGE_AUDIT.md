# Iteration 042 Storage And Duplicate Drive Audit

Date: 2026-07-14 KST

## Scope

Investigated the user-reported concern that Salary Hijacking appeared to occupy five Windows drives or repositories.

## Findings

- Active repository: `C:\Users\PC\Desktop\salary-hijacking-platform`
- Active repository HEAD: `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`
- Active branch: `codex/commercialization-100`
- Windows filesystem APIs currently expose only `C:` and `D:` as real file-system drives.
- Explorer COM also exposes only `C:` and `D:`.
- `subst` is empty.
- `net use` has no mapped drives.
- `mountvol` has mount points only for `C:\` and `D:\` among user-visible drives.
- The screenshot-like `X:`, `Y:`, and `Z:` duplicate-drive concern is not present in the current Windows state.

## Repository And Cache Sizes

Measured file sizes:

| Path                                            |           Size | Notes                                                    |
| ----------------------------------------------- | -------------: | -------------------------------------------------------- |
| `C:\Users\PC\Desktop\salary-hijacking-platform` | about 1.416 GB | Active source repository, excluding junction targets.    |
| `D:\salary-hijacking-toolchain-cache`           | about 4.349 GB | Android/JDK toolchain cache kept on `D:`.                |
| `D:\salary-hijacking-artifacts`                 | about 0.307 GB | Preserved APK/build evidence artifacts.                  |
| `C:\Users\PC\Desktop\salary-hijacking-main`     |        0 files | Empty hidden legacy folder, locked by a running process. |
| `C:\Users\PC\Desktop\salary-hijacking-work`     |        0 files | Empty hidden legacy folder, locked by a running process. |

The active repository contains `.tools` as a junction:

`C:\Users\PC\Desktop\salary-hijacking-platform\.tools`
-> `D:\salary-hijacking-toolchain-cache\salary-hijacking-platform-dottools`

Therefore the Android SDK/JDK toolchain is not duplicated inside the active source repository on `C:`.

## Cleanup

- Ran `corepack pnpm run clean:junk`.
- Result: removed 0 generated paths; freed 0 B.
- Attempted to remove the empty hidden legacy folders `salary-hijacking-main` and `salary-hijacking-work`.
- Windows blocked removal because the folders are currently held by a running process.
- Both legacy folders are empty and are not active work targets.

## Current Storage Interpretation

The current storage issue is not five active Salary Hijacking repositories. It is:

1. One active source repository: `salary-hijacking-platform`.
2. One `D:` toolchain cache used through a `.tools` junction.
3. One small `D:` APK/evidence artifact directory.
4. Two empty hidden legacy folders that cannot be deleted until the process holding them releases its handle.

## Remaining Action

When Codex/VS Code/Explorer releases the old folder handles, remove the two empty hidden folders:

```powershell
Remove-Item -LiteralPath 'C:\Users\PC\Desktop\salary-hijacking-main' -Force
Remove-Item -LiteralPath 'C:\Users\PC\Desktop\salary-hijacking-work' -Force
```

Do not remove `salary-hijacking-platform`, `node_modules`, tracked source/docs, tracked release evidence, or the `D:` toolchain cache unless a replacement build toolchain is prepared.
