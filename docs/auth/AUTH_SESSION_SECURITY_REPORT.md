@"
# Auth Session Security Report

Status: PASS_STAGING_RUNTIME_FOR_CORE_SESSION
Timestamp: 2026-08-17T10:45:17.0464780Z

Refresh/session evidence:
- Login issued a session-backed refresh token.
- Refresh R1 to R2 returned HTTP 200.
- Reuse of R1 returned HTTP 401 AUTH_REFRESH_TOKEN_REUSED.
- R2 after family revocation returned HTTP 401 AUTH_REFRESH_TOKEN_REUSED.
- Current-session logout revoked the session through refresh-token context without bearer-token exposure.
- Logout-all revoked remaining sessions and subsequent refresh failed.

Password hash evidence:
- New accounts use PBKDF2-SHA256 with Workers-compatible 100000 iterations.
- Legacy SHA-256 verification remains backward-compatible in local contract tests.
- Legacy successful login rehashes to PBKDF2-SHA256 in local/DB contract tests.
- legacy credential compatibility and upgrade remain covered by regression tests.

Remaining session scope:
- Native Android secure-storage/session bootstrap runtime remains tracked by D-026/Phase 9/13, not this server-side closure.


No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored in this evidence.
