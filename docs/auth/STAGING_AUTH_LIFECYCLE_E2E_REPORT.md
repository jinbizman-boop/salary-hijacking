# Staging Auth Lifecycle E2E Report

Status: BLOCKED_STAGING_REGISTER_INTERNAL_ERROR

Base URL: https://api-staging.salaryhijacking.com
Timestamp: 2026-08-17T10:06:32.809Z

First failing step: `register_user_a`
HTTP status: 500
Stable error code: `AUTH_ROUTE_INTERNAL_ERROR`
RequestId: `phase3-7213ed574fd50729`

The public staging API did not return access/refresh tokens for a synthetic registration, so downstream login/refresh/privacy/support/withdrawal E2E was not attempted in this run.

Evidence JSON: `docs/auth/STAGING_AUTH_LIFECYCLE_E2E_EVIDENCE.json`

No raw credentials, tokens, connection strings, PII, or financial values are stored.
