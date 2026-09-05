# Staging Register Transaction Report

Status: PASS_FOR_TESTED_STAGING_PATH
Timestamp: 2026-08-17T10:45:17.0464780Z

Register transaction path inspected:
1. request schema validation
2. email normalization
3. PBKDF2-SHA256 password hashing
4. users insert
5. auth_identities insert
6. auth_credentials insert
7. profile/settings bootstrap
8. consent insert
9. session creation
10. verification token creation
11. delivery challenge state
12. audit/runtime event
13. transaction commit

Root cause details:
- First staging blocker was RLS policy absence on users/uth_identities for controlled service bootstrap, not production DB or production secret state.
- Second staging blocker was Cloudflare Workers PBKDF2 iteration support. No password material was logged.

Atomicity evidence:
- Register repeat after fix produced 10/10 success and 0 internal errors.
- Staging DB aggregate readback confirmed synthetic users, credentials, sessions, verification rows, consent rows, privacy/support/withdrawal rows.
- No partial failed-register residue was observed through the closure evidence path.


No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored in this evidence.
