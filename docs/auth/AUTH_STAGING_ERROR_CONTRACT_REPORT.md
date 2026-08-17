# Auth Staging Error Contract Report

Status: PASS_FOR_REGISTER_ROOT_CAUSE
Timestamp: 2026-08-17T10:45:17.0464780Z

Register error contract after remediation:
- Successful synthetic register returns HTTP 201.
- Duplicate/business validation errors remain stable domain errors.
- Unexpected errors continue to return generic internal error envelopes only.
- Safe diagnostic logging records request id, path, error name, and redacted message only.

Root-cause diagnostic safety:
- The temporary diagnostic path did not print raw password, token, credential, connection string, email address, or financial values.
- Worker diagnostic surfaced NotSupportedError for PBKDF2 iteration support without secret exposure.

Representative runtime evidence:
- Register repeat: 10/10, internalError=0
- Rate-limit behavior observed and honored: 1 RATE_LIMIT_EXCEEDED responses with retry-after.


No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored in this evidence.
