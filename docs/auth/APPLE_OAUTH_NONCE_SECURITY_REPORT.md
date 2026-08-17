@"
# Apple OAuth Nonce Security Report

Status: PASS_INTERNAL_CODE_AND_STAGING_START
Timestamp: 2026-08-17T10:45:17.0464780Z

Verified internally:
- Apple OAuth start issues onc_ nonce.
- Raw nonce is returned only to the OAuth client runtime; DB stores only SHA-256 nonce hash.
- Apple authorization start binds nonce when provider authorization URL can be constructed.
- Apple callback rejects missing nonce.
- Apple callback rejects wrong nonce.
- Matching nonce is accepted once and state replay is rejected.

Staging evidence:
- Apple OAuth start returned an onc_ nonce on staging.
- Staging Apple authorizationUrl remains absent until Apple client external config is present.

Remaining external blocker:
- Actual Apple provider console/client id/redirect/runtime login verification.


No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored in this evidence.
