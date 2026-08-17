# Withdrawal E2E Report

Status: PARTIAL_STAGING_REGISTER_BLOCKED

Evidence:
- Account lifecycle endpoints are registered and protected by auth middleware/ownership policy.
- Session revoke primitives exist and are exercised by password reset and refresh reuse tests.
- Staging harness includes synthetic withdrawal request and confirm steps, but these were not reached because synthetic registration failed first.

Remaining:
- Full synthetic staging withdrawal lifecycle, cleanup/anonymization and session invalidation E2E remains blocked by staging register 500.
