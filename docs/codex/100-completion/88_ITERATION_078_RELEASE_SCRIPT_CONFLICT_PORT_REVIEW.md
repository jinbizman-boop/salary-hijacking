# Iteration 078 - Release Script Conflict Port Review

Date: 2026-07-14 KST

## Scope

- `scripts/release/capture-mobile-clean-fintech-screenshots.mjs`
- `scripts/release/check-release-readiness.mjs`
- `scripts/release/check-release-readiness.test.mjs`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISIONS.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`
- `docs/codex/100-completion/08_RELEASE_GATE_MATRIX.md`
- `docs/codex/100-completion/06_IMPLEMENTATION_PLAN.md`
- `docs/codex/08_FILE_COMPLETION_LOG.md`

## Decision

The current platform versions of the three release-script conflict files are accepted.
They supersede the archived conflict copies because the current files include the latest launch-readiness gates and tests:

- current-head mobile preview APK evidence checks
- physical Android phone proof checks
- phone-target APK metadata checks
- strict-mode blocker projection
- CleanFintech fallback screen dependency blockers
- mock-only production path blockers
- mobile runtime `TODO` / `FIXME` blockers
- deterministic 17-screen mobile UI evidence capture
- 320px through 430px responsive overflow checks

## Result

The merge conflict decision register was regenerated from `.merged-from-salary-hijacking-main/merge-manifest.json`.

- Total conflicts: 132
- Current path exists: 106
- Missing current path: 26
- Byte-identical: 0
- `CURRENT_ACCEPTED`: 8
- `REVIEW_REQUIRED`: 84
- `EXCLUDE_RUNTIME`: 26
- `SUPERSEDED_BY_CURRENT_EVIDENCE`: 14

## Verification

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/scripts/release/capture-mobile-clean-fintech-screenshots.mjs scripts/release/capture-mobile-clean-fintech-screenshots.mjs`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/scripts/release/check-release-readiness.mjs scripts/release/check-release-readiness.mjs`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/scripts/release/check-release-readiness.test.mjs scripts/release/check-release-readiness.test.mjs`
- `node --test scripts/release/capture-mobile-clean-fintech-screenshots.test.mjs scripts/release/check-release-readiness.test.mjs`: PASS, 88 tests
- `node scripts/release/classify-merge-conflict-archive.mjs`: PASS, regenerated CSV and Markdown registers

## Remaining

84 conflict rows still require semantic review before the historical merge archive can be safely removed.
This iteration does not complete physical Android phone QA, strict release readiness, production AAB approval, or Play submission approval.
