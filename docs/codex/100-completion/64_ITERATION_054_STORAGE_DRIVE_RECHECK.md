# Iteration 054 Storage Drive Recheck

Date: 2026-07-14 KST

## Scope

The user reported that Salary Hijacking appeared to occupy five storage locations in Windows Explorer. This recheck verifies the current visible drives, repository copies, preserved toolchain cache, and generated junk cleanup after the latest verification work.

## Evidence

| Check                                           | Result                                                    |
| ----------------------------------------------- | --------------------------------------------------------- |
| Active repository root                          | `C:/Users/PC/Desktop/salary-hijacking-platform`           |
| Current HEAD                                    | `cabb4e8c7fed64e3eae4d4bd6266c9002d4371fb`                |
| Current branch                                  | `codex/commercialization-100`                             |
| Physical disks visible                          | 111.8 GB SSD and 465.76 GB HDD                            |
| Logical filesystem drives visible               | `C:`, `D:`                                                |
| `C:` logical disk                               | 110.76 GB total, 30.2 GB free                             |
| `D:` logical disk                               | 465.13 GB total, 460.04 GB free                           |
| `X:`, `Y:`, `Z:` in current shell               | Not visible as filesystem drives                          |
| `subst` aliases                                 | none                                                      |
| Network mapped logical disks                    | none                                                      |
| Volume mount points                             | only `C:\` and `D:\` are mounted filesystem drive letters |
| `C:\Users\PC\Desktop\salary-hijacking-platform` | about 1.416 GB                                            |
| `C:\Users\PC\Desktop\salary-hijacking-main`     | hidden directory shell, about 0 GB                        |
| `C:\Users\PC\Desktop\salary-hijacking-work`     | hidden directory shell, about 0 GB                        |
| `D:\salary-hijacking-platform`                  | absent                                                    |
| `D:\salary-hijacking-main`                      | absent                                                    |
| `D:\salary-hijacking-work`                      | absent                                                    |
| `D:\salary-hijacking-artifacts`                 | about 0.307 GB, preserved artifact storage                |
| `D:\salary-hijacking-toolchain-cache`           | about 4.349 GB, preserved Android/toolchain cache         |

## Cleanup Performed

`corepack pnpm run clean:junk` removed the regenerated local temp cache:

- `C:\Users\PC\AppData\Local\Temp\v8-compile-cache`

Freed space: about 873.4 KB.

## Interpretation

The current Codex/PowerShell environment does not show five active Salary Hijacking repositories. The active code workspace is `C:\Users\PC\Desktop\salary-hijacking-platform`. The old `main` and `work` directories exist only as hidden empty shells and must not be used as work targets.

The Explorer screenshot showing `X:`, `Y:`, and `Z:` with the same capacity/free-space values as `C:` is not reproduced by WMI, PowerShell filesystem drives, `subst`, mapped drives, or mount point checks in this session. It is most likely a stale Explorer/remote-session view or drive-letter presentation issue rather than four real duplicate repositories.

The D-drive cache and artifact directories are intentional support storage for build artifacts and toolchains. They were measured but preserved because deleting them would likely slow or break later Android/APK verification and then re-download the same data.

## Release Impact

This resolves the immediate workspace-confusion risk for Codex operations, but it does not change launch readiness by itself. Remaining release blockers still include physical Android QA, strict release readiness blockers, production AAB approval, and Play submission approval.
