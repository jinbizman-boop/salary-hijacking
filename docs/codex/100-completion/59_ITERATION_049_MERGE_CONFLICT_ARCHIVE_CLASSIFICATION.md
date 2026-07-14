# Iteration 049 - Merge Conflict Archive Classification

Date: 2026-07-14 KST

## Scope

The consolidated platform workspace contains `.merged-from-salary-hijacking-main`, created during the 2026-07-12 merge from the previous `salary-hijacking-main` folder into `salary-hijacking-platform`.

This iteration classifies that archive so it is not mistaken for another active repository or a storage leak.

## Evidence

- `WORKSPACE_CONSOLIDATION_NOTE.txt` says the active workspace is `C:\Users\PC\Desktop\salary-hijacking-platform`.
- Previous folders `salary-hijacking-main` and `salary-hijacking-work` were emptied on 2026-07-12 and are hidden empty directory shells.
- `.merged-from-salary-hijacking-main/merge-manifest.json` reports:
  - copied main-only files: 33
  - conflicted different files: 132
  - identical files: 705
  - excluded directories: 20
- Size check:
  - `.merged-from-salary-hijacking-main`: 133 files, about 5.43 MB
  - `.merged-from-salary-hijacking-main/conflicts`: 132 files, about 5.42 MB

## Classification Summary

Hash comparison found all 132 conflict archive files have a current target path in `salary-hijacking-platform`, but none are byte-identical to the current platform file. This means the archive is a preserved previous-version comparison set, not a missing-file source folder.

| Category                     | Count | Current platform path exists | Byte-identical | Classification                 | Decision                                                                 |
| ---------------------------- | ----: | ---------------------------- | -------------- | ------------------------------ | ------------------------------------------------------------------------ |
| repo-config                  |     4 | yes                          | no             | partially integrated / changed | keep archived until final release source diff review                     |
| docs-evidence                |     7 | yes                          | no             | superseded evidence/docs       | current platform docs are authoritative; archive is historical reference |
| admin-source                 |     2 | yes                          | no             | source conflict                | needs focused Admin port review before deletion                          |
| mobile-source                |    81 | yes                          | no             | source conflict                | needs feature-by-feature port review; many have already evolved further  |
| backend-source               |     2 | yes                          | no             | source conflict                | needs API/growth repository port review                                  |
| release-script               |     3 | yes                          | no             | source conflict                | needs release tooling diff review                                        |
| generated-or-binary-evidence |    28 | yes                          | no             | generated / binary evidence    | safe to exclude from runtime; keep only until evidence migration is done |
| other release evidence       |     5 | yes                          | no             | evidence metadata              | current tracked release evidence remains authoritative                   |

## Current Decision

- Do not use `.merged-from-salary-hijacking-main/conflicts` as runtime source.
- Do not delete it yet, because source conflict categories still need focused port review:
  - mobile-source: 81 files
  - admin-source: 2 files
  - backend-source: 2 files
  - release-script: 3 files
  - repo-config: 4 files
- Treat generated/binary evidence entries as non-runtime and low storage priority.
- Continue implementation from `salary-hijacking-platform` only.

## Storage Finding

The conflict archive is not the cause of the 5-drive storage pressure reported by the user. It is only about 5.43 MB. The large storage pressure came from regenerated `D:\codex-temp` and `D:\codex-tmp` Android/Expo build temporary directories, which were cleaned and are now covered by Iteration 047 cleanup tests.

## Remaining Work

- Produce a file-by-file port decision register for the 92 source/config/script conflict entries.
- Delete or move the archive only after every source conflict is explicitly marked integrated, superseded, or intentionally excluded.
- Re-run `clean:junk` after each validation-heavy task.
