# Auth Session Security Report

Status: PARTIAL_STAGING_REGISTER_BLOCKED

Evidence:
- PBKDF2-SHA256 password hashing local contract test PASS.
- Legacy SHA-256 password verification remains backward-compatible.
- Successful legacy SHA-256 login now upgrades the active credential hash to PBKDF2-SHA256 in local contract and DB repository tests.
- Refresh rotation and reused refresh-token family revocation local route test PASS.
- Current-session logout accepts refresh-token based revocation without a bearer token local route test PASS.
- Staging lifecycle harness reached public API but synthetic register returned HTTP 500 `AUTH_ROUTE_INTERNAL_ERROR`, so downstream staging token/session flow was not attempted.
- Auth DB repository now opens auth operations with the auth-service DB context needed before a user session exists; staging redeploy/runtime verification remains required.

Remaining:
- Full staging session restore and all-session logout E2E remain blocked by staging register 500 until the auth repository fix is deployed/verified.
- OAuth provider runtime sessions remain external-provider/runtime unverified.

No raw tokens or credentials are stored in this report.
