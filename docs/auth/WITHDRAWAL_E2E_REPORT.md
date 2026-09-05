@"
# Withdrawal E2E Report

Status: PASS_CORE_STAGING_RUNTIME
Timestamp: 2026-08-17T10:45:17.0464780Z

Verified:
- Synthetic staging user can request withdrawal.
- Synthetic staging user can confirm withdrawal.
- Confirm response marks status WITHDRAWN and records non-raw status metadata only.
- DB aggregate readback confirms withdrawal request rows for synthetic Phase 3 users.

Remaining:
- Long-term retention/anonymization policy is governed by Phase 2 retention and later legal/privacy release gates; no production user was modified.


No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored in this evidence.
