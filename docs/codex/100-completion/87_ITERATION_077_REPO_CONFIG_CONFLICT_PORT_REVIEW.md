# Iteration 077 - Repo Config Conflict Port Review

Date: 2026-07-14 KST

## Scope

- `.gitignore`
- `.prettierignore`
- `package.json`
- `pnpm-lock.yaml`
- `apps/mobile/package.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISIONS.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`
- `scripts/release/classify-merge-conflict-archive.mjs`
- `scripts/release/classify-merge-conflict-archive.test.mjs`

## Completed

- Added semantic decision override support to the merge conflict archive classifier.
- Recorded reviewed repo-config decisions for the 5 repo-config conflict rows.
- Regenerated the conflict decision register.

## Decision Summary

- `CURRENT_ACCEPTED`: 5
- `REVIEW_REQUIRED`: 87
- `EXCLUDE_RUNTIME`: 26
- `SUPERSEDED_BY_CURRENT_EVIDENCE`: 14

## Reviewed Repo Config Rows

| Path                       | Decision           | Reason                                                                                                                               |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `.gitignore`               | `CURRENT_ACCEPTED` | Current platform ignore rules preserve local-only generated attachments/archive/evidence dumps while keeping source tracking intact. |
| `.prettierignore`          | `CURRENT_ACCEPTED` | Current formatting ignore rules keep historical merge archive out of formatting while targeted source/docs remain formatted.         |
| `package.json`             | `CURRENT_ACCEPTED` | Current root manifest includes the mobile preview phone proof workflow needed by the physical-device QA gate.                        |
| `pnpm-lock.yaml`           | `CURRENT_ACCEPTED` | Current lockfile matches the active platform manifests and prior frozen-install/security-audit evidence.                             |
| `apps/mobile/package.json` | `CURRENT_ACCEPTED` | Current mobile manifest preserves phone debug build and mobile QA scripts required by preview APK and phone proof work.              |

## Verification

- RED before override support:
  - `node --test --test-name-pattern "applies reviewed semantic" scripts\release\classify-merge-conflict-archive.test.mjs`
  - Failed because repo-config decisions stayed `REVIEW_REQUIRED`.
- GREEN after override support:
  - `node --test scripts\release\classify-merge-conflict-archive.test.mjs`
  - PASS, 5 tests.
- Register regeneration:
  - `node scripts\release\classify-merge-conflict-archive.mjs`
  - PASS, summary reports `CURRENT_ACCEPTED: 5` and `REVIEW_REQUIRED: 87`.

## Remaining

- 87 source/config/script conflict rows still need semantic review.
- The archive must remain until those rows are reviewed and either ported, superseded, or explicitly excluded.
- This does not resolve clean release source, physical Android phone QA, production AAB approval, or Play submission approval.
