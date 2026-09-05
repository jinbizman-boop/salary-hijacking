# Auth Cross-User Isolation Report

Status: PASS_STAGING_DIRECT_ID_RUNTIME
Timestamp: 2026-08-17T11:30:59.056Z

Evidence:
- docs/auth/CROSS_USER_DIRECT_ID_RUNTIME_MATRIX.csv
- docs/auth/CROSS_USER_RUNTIME_FINAL_REPORT.md

Result:
- CROSS_USER_AUTHZ=PASS
- CROSS_USER_DIRECT_ID_MATRIX=PASS
- CROSS_USER_DATA_LEAK=0
- RLS_CROSS_USER_ESCAPE=0 for live physical user-owned tables inspected.

Notes:
- The direct-ID staging matrix used two synthetic users and exact resource IDs where the public API exposes them.
- The notification preferences API is owner-scoped at runtime; live staging does not expose a separate physical notification_preferences table in the 41-table catalog.
- The notification device cross-user 500 was fixed to stable NOTIFICATION_DEVICE_NOT_FOUND before this final PASS run.

No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored in this evidence.
