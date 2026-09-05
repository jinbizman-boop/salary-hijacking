# Community Trust And Safety Runtime Report

Timestamp: 2026-08-26T15:24:35.527Z

Status: PASS_STAGING_RUNTIME

Evidence: docs/growth-community/PHASE_6_STAGING_RUNTIME_EVIDENCE.json

Root cause closed:
- DB-backed community create path previously discarded route-level moderationStatus and stored risky posts as visible.
- Repository now persists route moderationStatus in canonical and live 41-table legacy schema paths.
- Staging abuse fixture using canonical risky Korean finance-fraud wording resulted in held content status.

Runtime result:
- report create status: 201
- abuse post status: HIDDEN
- hard-delete by report brigading: not performed; report creates moderation queue state only in Phase 6 scope.
