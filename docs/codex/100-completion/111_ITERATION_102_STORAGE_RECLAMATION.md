# Iteration 102 Storage Reclamation

Date: 2026-07-14 KST

## Summary

The user reported that Salary Hijacking appeared to occupy multiple drives in Windows Explorer. The current Codex shell and Windows APIs still expose only `C:` and `D:` as active filesystem drives. No active `X:`, `Y:`, or `Z:` filesystem, mapped, or `subst` drive was reproduced.

## Evidence

Commands checked:

- `Get-PSDrive -PSProvider FileSystem`
- `Get-CimInstance Win32_LogicalDisk`
- `Get-Volume`
- `Get-Partition`
- `mountvol`
- `cmd /c subst`
- `net use`
- `git worktree list --porcelain`

Observed active git worktree:

- `C:\Users\PC\Desktop\salary-hijacking-platform`

Observed legacy folders:

- `C:\Users\PC\Desktop\salary-hijacking-main`: 0 GB, no `.git`, hidden, locked by another process
- `C:\Users\PC\Desktop\salary-hijacking-work`: 0 GB, no `.git`, hidden, locked by another process

Both legacy folders were empty but could not be removed because Windows reported that another process was using them.

## Storage Changes

Moved generated local toolchain/cache payloads off `C:` while preserving expected paths through junctions:

- `C:\Users\PC\Desktop\salary-hijacking-platform\.tools`
  -> `D:\salary-hijacking-local-tools\.tools`
- `C:\Users\PC\.gradle`
  -> `D:\salary-hijacking-local-tools\user-dot-gradle`

The project path still works because the original paths remain as junctions.

Cleaned generated junk:

- `corepack pnpm run clean:junk`: PASS, removed regenerated `v8-compile-cache`
- Removed stale download copy `C:\Users\PC\Downloads\salary-hijacking-phone-arm64-iteration094-debug.apk`
- Preserved latest user APK `C:\Users\PC\Downloads\salary-hijacking-phone-arm64-iteration100-debug.apk`

## Final Measurements

- `C:` free space: about 29.65 GB
- `D:` free space: about 454.92 GB
- `salary-hijacking-platform`: about 1.284 GB excluding junction targets
- `D:\salary-hijacking-local-tools`: about 8.078 GB
- `D:\salary-hijacking-toolchain-cache`: about 1.527 GB retained for old `.android`/adb/toolchain compatibility
- `D:\salary-hijacking-artifacts`: about 0.13 GB

## Notes

This was storage hygiene only. No source code, tracked release evidence, `node_modules`, current APK artifact, production AAB, Play submission, EAS project, keystore, secret, database, Cloudflare secret, force push, or rebase was changed.
