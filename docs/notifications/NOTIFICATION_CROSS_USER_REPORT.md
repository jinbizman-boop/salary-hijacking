# Notification Cross-User Report

NOTIFICATION_CROSS_USER_LEAK=0
NOTIFICATION_RLS_ESCAPE=0_FOR_PHASE2_BASELINE_AND_API_DIRECT_ID_RUNTIME

Evidence:
- `docs/notifications/NOTIFICATION_DIRECT_ID_RUNTIME_MATRIX.csv` contains USER_B direct-ID attempts against USER_A notification and device resources; all returned denied/invisible semantics.
- `docs/notifications/STAGING_NOTIFICATION_RUNTIME_EVIDENCE.json` records staging API runtime status, stable 404 error codes, and requestIds without raw credentials/tokens.
- Phase 2 table-level RLS baseline remains PASS for notification-related live tables.

Neon SQL-level synthetic insertion under app context was attempted but produced no inserted rows because pre-insert app context could not be established through the read-only tool path; it is not used as PASS evidence.
