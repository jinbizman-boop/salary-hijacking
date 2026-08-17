# Staging Auth Lifecycle E2E Report

Status: PASS_CORE_STAGING_RUNTIME
Harness result: core=PASS

Base URL: https://api-staging.salaryhijacking.com
Timestamp: 2026-08-17T10:41:09.310Z

## Results

| Check | Status |
| --- | --- |
| Register/login/refresh/logout core | PASS |
| Refresh reuse family revocation | PASS |
| Password reset request no raw token | PASS |
| Consent update/read | PASS |
| Privacy export request/list/detail | PASS |
| Support ticket create | PASS |
| Withdrawal request/confirm | PASS |

Evidence JSON: `docs/auth/STAGING_AUTH_LIFECYCLE_E2E_EVIDENCE.json`

No raw credentials, tokens, connection strings, PII, or financial values are stored.
