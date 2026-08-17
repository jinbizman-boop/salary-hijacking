# Staging Account Lifecycle Final Report

Status: PASS_CORE_STAGING_RUNTIME
Timestamp: 2026-08-17T10:45:17.0464780Z

Core lifecycle result:
- Harness: 
ode scripts/e2e/auth-staging-lifecycle.mjs
- Result: core=PASS
- Steps: 27
- Evidence: docs/auth/STAGING_AUTH_LIFECYCLE_E2E_EVIDENCE.json

Verified runtime steps include:
- health / ready
- register A/B/C
- auth/me and users/me bootstrap
- refresh rotation R1 to R2
- old refresh reuse rejected with AUTH_REFRESH_TOKEN_REUSED
- rotated family revocation verified by R2 rejection
- relogin after reuse detection
- current logout by refresh token
- logout-all
- password reset request accepted without exposing a raw delivery token
- onboarding complete
- consent get/update/get
- privacy export request/list
- support ticket create
- withdrawal request/confirm

Assertions:
- coreRegisterLoginRefreshLogout=True
- passwordResetRequestNoRawToken=True
- consentRuntime=True
- privacyExportRuntime=True
- supportRuntime=True
- withdrawalRuntime=True


No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored in this evidence.
