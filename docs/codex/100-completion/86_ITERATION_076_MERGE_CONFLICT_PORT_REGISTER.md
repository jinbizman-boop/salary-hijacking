# Iteration 076 - Merge Conflict Port Decision Register

Date: 2026-07-14 KST

## Scope

- `scripts/release/classify-merge-conflict-archive.mjs`
- `scripts/release/classify-merge-conflict-archive.test.mjs`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`
- `docs/codex/100-completion/08_RELEASE_GATE_MATRIX.md`
- `docs/codex/08_FILE_COMPLETION_LOG.md`

## Completed

- Added a no-secret merge-conflict archive classifier that reads `.merged-from-salary-hijacking-main/merge-manifest.json` and emits file-by-file port decisions.
- Added tests for:
  - path category classification,
  - one output row per manifest conflict,
  - UTF-8 BOM manifest support,
  - CSV/Markdown output without copied raw file contents.
- Generated the current platform conflict decision register.

## Current Register Summary

- Total conflict files: 132
- Current platform path exists: 106
- Current platform path missing: 26
- Byte-identical files: 0
- Decisions:
  - `REVIEW_REQUIRED`: 92
  - `EXCLUDE_RUNTIME`: 26
  - `SUPERSEDED_BY_CURRENT_EVIDENCE`: 14

## Meaning

This closes the missing file-by-file inventory gap. It does not pretend the 92 source/config/script conflicts have been semantically reviewed or ported. Those rows remain explicitly marked `REVIEW_REQUIRED`, so archive deletion is still unsafe until the semantic review is complete.

## Verification

- RED before implementation:
  - `node --test scripts\release\classify-merge-conflict-archive.test.mjs`
  - Failed because `classify-merge-conflict-archive.mjs` did not exist.
- GREEN after implementation:
  - `node --test scripts\release\classify-merge-conflict-archive.test.mjs`
  - PASS, 3 tests.
- RED on real Windows manifest condition:
  - `node scripts\release\classify-merge-conflict-archive.mjs`
  - Failed because the real merge manifest contains a UTF-8 BOM.
- GREEN after BOM guard:
  - `node --test scripts\release\classify-merge-conflict-archive.test.mjs`
  - PASS, 4 tests.
  - `node scripts\release\classify-merge-conflict-archive.mjs`
  - PASS and generated CSV/Markdown registers.

## Remaining

- Review the 92 `REVIEW_REQUIRED` rows file by file.
- Keep `.merged-from-salary-hijacking-main` until those semantic port decisions are complete.
- This does not resolve clean release source, physical Android phone QA, production AAB approval, Play submission approval, or market-publication gates.
