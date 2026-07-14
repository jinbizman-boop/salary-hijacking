# Iteration 060 Raw QA Dump Cleanup

Date: 2026-07-14 KST

## Scope

This pass reduced generated-artifact pressure in the canonical workspace:

`C:\Users\PC\Desktop\salary-hijacking-platform`

The cleanup targeted stale, untracked, or raw generated QA dumps only. Tracked
release evidence files such as `release/mobile-preview-evidence.json`,
`release/mobile-native-evidence.json`, `release/database-evidence.json`,
`release/cloudflare-runtime-evidence.json`, and store screenshots were not
removed.

## Removed Local-Only Artifacts

| Path                               | Classification                                                                            |                              Size | Hash / note                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------: | ------------------------------------------------------------------ |
| `100_PERCENT_READINESS.md`         | stale untracked report for older APK/link/workspace                                       |                          0.002 MB | `855530D74B88EE14B99117B9D98A59FB026014829C48379FDF540DAB6D5C3174` |
| `COMPLETION_REPORT.md`             | stale untracked report for older `salary-hijacking-work` scope                            |                          0.003 MB | `D604D43930949A724B90BF31D6BEF2F057B07415157F910A51D1575C43E8402E` |
| `WORKSPACE_CONSOLIDATION_NOTE.txt` | untracked root note duplicated by tracked Codex consolidation docs                        |                          0.001 MB | `7B0639B0457CBDBF1077422C8A53113ED7CD5DB7BADD16C37698658C9A6FAF9B` |
| `docs/qa`                          | raw local QA dump containing screenshots, XML, logcat, and repacked bundles               |                          42.03 MB | generated directory                                                |
| `release/evidence`                 | raw local evidence dump containing screenshots, XML, logcat, and repacked bundles         |                          27.69 MB | generated directory                                                |
| `.tools`                           | ignored Android SDK/JDK toolchain entry under the workspace; active target exists on `D:` | 3.89 GB counted in workspace scan | generated toolchain entry removed from platform namespace          |

## Ignore Policy Update

`.gitignore` now treats the following generated folders as local-only:

- `.codex-remote-attachments/`
- `.merged-from-salary-hijacking-main/`
- `apps/mobile/docs/qa/`
- `docs/qa/`
- `release/evidence/`

The exception `release/evidence/final-100/**` remains trackable so final
redacted summaries can be committed without allowing raw logcat or extracted
runtime bundles to accumulate.

## Verification

- `corepack pnpm run disk:report -- --top 20`: PASS
- `git diff --check`: PASS
- `node scripts\release\check-release-readiness.mjs --strict`: BLOCKED only on
  unresolved gap-register rows, physical phone QA, and dirty working tree;
  `mobile:preview:evidence` and `mobile:preview:latest-source-apk` PASS
- `release/mobile-preview-evidence.json` was rewritten as UTF-8 without BOM
  after a PowerShell JSON rewrite introduced a parser-incompatible BOM
- Workspace top-level size after cleanup: 1.31 GB
- Largest protected path: `node_modules` at 1.13 GB
- `release` directory after cleanup: 865.1 KB
- Removable generated paths after cleanup: none
- Removed ignored `.tools` from the platform workspace namespace after
  confirming the active Android/JDK toolchain is available under
  `D:\salary-hijacking-toolchain-cache`; the current `C:` free-space reading did
  not materially change, so this is recorded as workspace de-duplication rather
  than a proven 3.89 GB C-drive free-space gain
- Current Windows filesystem view exposes only real drives `C:` and `D:` through
  `Get-PSDrive`, `Win32_LogicalDisk`, `subst`, `net use`, and `mountvol`; the
  Explorer-visible `X:`, `Y:`, and `Z:` duplicate-drive symptom is not present
  in this shell state
- Working tree patch backup written outside the repo at
  `D:\salary-hijacking-artifacts\20260714\iteration-060-source-hygiene\working-tree.patch`
- Secret-like scan over changed text files produced only expected false
  positives: secure token key constants, redaction guard names, placeholder
  examples in release-readiness tests, and sanitizer keyword lists. No raw
  secret value was identified in the reviewed matches.
- Strict readiness now passes `mobile:preview:latest-source-apk` after
  refreshing `release/mobile-preview-evidence.json` to the current source
  status hash produced after raw QA dump cleanup.

## Remaining Release Blockers

This cleanup reduces storage pressure and removes misleading stale reports. It
does not complete the remaining launch blockers:

- clean release source / canonical commit
- latest-source APK after source stabilization
- physical Android phone QA
- deployed persistence proof for unresolved Salary/Plan gaps
- production AAB / Play submission external approval
