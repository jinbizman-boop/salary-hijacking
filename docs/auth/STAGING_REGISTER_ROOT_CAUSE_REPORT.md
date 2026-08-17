# Staging Register Root Cause Report

Status: PASS
Timestamp: 2026-08-17T10:45:17.0464780Z
Base URL: https://api-staging.salaryhijacking.com

Root causes verified and fixed:
- RLS bootstrap drift: staging lacked users_service_all and uth_identities_service_all service policies required for pre-auth registration inserts under the non-BYPASSRLS app role.
- Workers WebCrypto drift: PBKDF2-SHA256 iteration count 310000 exceeded Cloudflare Workers support; Phase 3 contract is now PBKDF2-SHA256 with 100000 iterations.
- Users self-collection auth policy drift: /api/v1/users/consents was interpreted as /users/{userId} with consents as a mismatched owner id; self-collection segments are excluded from explicit owner-id hints.

Fixes:
- database/migrations/0015_auth_preauth_rls_bootstrap.sql
- database/migrations/0016_apple_oauth_nonce_binding.sql
- services/api/src/routes/auth.routes.ts
- services/api/src/repositories/auth.repository.ts
- services/api/src/middlewares/auth.middleware.ts

Staging deployment evidence:
- latest staging Worker version deployed during closure: 0360ff28-7e88-408e-9640-378a4d42b0a6

Register repeat:
- Requested: 10
- Success: 10/10
- Attempts: 11
- Rate-limit responses honored: 1
- AUTH_ROUTE_INTERNAL_ERROR: 0

Evidence JSON: docs/auth/STAGING_REGISTER_REPEAT_EVIDENCE.json


No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored in this evidence.
