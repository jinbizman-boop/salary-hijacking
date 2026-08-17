@"
# Consent Versioning Report

Status: PASS_CORE_STAGING_RUNTIME
Timestamp: 2026-08-17T10:45:17.0464780Z

Verified:
- Consent get before update returned HTTP 200 after middleware owner-hint fix.
- Consent update returned HTTP 200.
- Consent get after update returned HTTP 200.
- Consent runtime assertion is true in latest staging lifecycle evidence.
- DB aggregate readback confirms consent rows for synthetic Phase 3 users.

Covered consent fields:
- termsAccepted
- privacyAccepted
- marketingAccepted
- contentRecommendationAccepted
- adPartnerAccepted
- analyticsAccepted
- sensitiveFinancialTargetingAccepted=false
- consentVersion


No raw password, access token, refresh token, reset token, verification token, OAuth token, MFA secret, connection string, production data, raw PII, or financial source value is stored in this evidence.
