# Iteration 085 Mobile Shared Layout Conflict Port Review

Date: 2026-07-14 KST

## Scope

- `apps/mobile/src/shared/components/AppHeader.tsx`
- `apps/mobile/src/shared/components/AppShell.tsx`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/src/shared/components/AppHeader.tsx`
- `.merged-from-salary-hijacking-main/conflicts/apps/mobile/src/shared/components/AppShell.tsx`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISIONS.json`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.csv`
- `docs/codex/100-completion/85_MERGE_CONFLICT_PORT_DECISION_REGISTER.md`

## Decision

Both mobile shared layout conflict rows are `CURRENT_ACCEPTED`.

The current platform files supersede the archive copies. `AppHeader.tsx` renders the official Salary Hijacking BI through the shared static image asset registry, keeps the `SALARY HIJACKING` brand label, and preserves the compact accessible header structure required by the PDF-derived mobile screens. `AppShell.tsx` keeps the shared screen wrapper keyboard-aware and safe-area-aware through `KeyboardAvoidingView`, top inset padding, bottom inset padding, automatic content inset adjustment, and handled keyboard taps so shared input screens and bottom tab layouts do not collide with system UI.

## Evidence

- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/shared/components/AppHeader.tsx apps/mobile/src/shared/components/AppHeader.tsx`
- `git diff --no-index --stat .merged-from-salary-hijacking-main/conflicts/apps/mobile/src/shared/components/AppShell.tsx apps/mobile/src/shared/components/AppShell.tsx`
- `node scripts/release/classify-merge-conflict-archive.mjs`
- `corepack pnpm --filter @salary-hijacking/mobile run test -- src/shared/components/__tests__/shared-components.contract.test.tsx --runInBand`
- `node --test scripts/release/classify-merge-conflict-archive.test.mjs scripts/release/check-release-readiness.test.mjs`

## Register Result

- Total conflict files: 132
- Current path exists: 106
- Missing current path: 26
- Byte-identical: 0
- `CURRENT_ACCEPTED`: 22
- `REVIEW_REQUIRED`: 70
- `EXCLUDE_RUNTIME`: 26
- `SUPERSEDED_BY_CURRENT_EVIDENCE`: 14

## Remaining Work

The merge archive is still not safe to delete. Seventy `REVIEW_REQUIRED` rows remain and must receive file-level semantic port decisions or verified supersession evidence first.
