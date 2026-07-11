# LV UP content engine implementation plan

Date: 2026-07-11 KST

## Goal

Implement the first server-authoritative LV UP content slice across docs, database/API repository behavior, mobile API contract, and mobile UI guardrails.

## Target Paths

- `docs/final-documents/`
- `database/migrations/`
- `services/api/src/routes/growth.routes.ts`
- `services/api/src/repositories/growth.repository.ts`
- `services/api/tests/`
- `apps/mobile/src/features/level/`
- `apps/mobile/src/shared/styles/clean-fintech-screens.tsx`
- `apps/mobile/src/shared/styles/__tests__/clean-fintech-theme.test.ts`
- `docs/codex/08_FILE_COMPLETION_LOG.md`

## Implementation Items

1. Add LV UP content policy documentation for reading/news/English/health.
2. Add an implementation plan document for the first slice.
3. Add API repository tests proving DB-backed content list returns published curated cards.
4. Add API repository tests proving content completion writes a per-user progress record and returns mobile-safe XP.
5. Add mobile API tests for `listContents`.
6. Add mobile API tests rejecting unsafe content payloads such as full article/body text or missing source/license/safety flags.
7. Add mobile UI contract tests requiring record input and offline-preview labeling.
8. Run the new targeted tests and confirm they fail for the expected missing behavior.
9. Add a SQL migration for curated LV UP content and user content progress.
10. Implement DB-backed `listContents` in the Neon growth repository.
11. Implement DB-backed `completeContent` with record requirement, idempotency, and XP response.
12. Extend growth route content types for READING, NEWS, ENGLISH, and HEALTH while preserving existing content route compatibility.
13. Extend mobile level types with curated content item/list contracts.
14. Implement mobile `listContents` with safe URL options, response parsing, and privacy validation.
15. Wire LV UP detail screen toward server content where practical in this slice.
16. Add record-input guardrails for detail content completion.
17. Add or preserve accessibility labels for completion disabled/completed states.
18. Update the completion log with file-level document/theoretical completeness, verified completeness, and project-wide readiness separation.
19. Run targeted API/mobile tests.
20. Run typecheck or closest available validation for touched packages.

## Checkpoints

- Checkpoint 1: docs and failing tests added.
- Checkpoint 2: DB/API implementation passes targeted API tests.
- Checkpoint 3: mobile API/UI tests pass.
- Checkpoint 4: completion log updated and validation status reported.

## Known Constraints

- Current workspace does not expose a `.git` directory, so commit/branch operations cannot be performed from this folder.
- Native mobile E2E remains dependent on APK/build credentials and should not be claimed complete unless separately verified.
- Production readiness remains blocked until release evidence gates pass.
