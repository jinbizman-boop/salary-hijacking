---
codex_context: true
priority: P0
scope: security-privacy-ads
last_verified: 2026-06-25
---

# Privacy, Ads, And Security

## Sensitive Data

Never place the following raw values in ads, partner targeting, analytics, logs, public exports, push payloads, or unauthenticated responses:

- salary, income, expense, savings, hijack amount,
- account number, card number, loan data,
- resident/private identity data,
- phone, email,
- auth/session/refresh token,
- push token,
- raw device identifier,
- private key, service account, DB URL, JWT secret, FCM server key.

## Ads And Partner Rules

- Default ads/partner model is contextual-only.
- Financial amount/source based targeting is forbidden.
- Ad/partner content must be clearly labeled.
- Ad event payloads must not include raw financial or raw identity data.

## Notification Rules

- Raw push tokens must not be logged.
- Use token hashes where tracking is required.
- Push payloads must not contain salary/expense/savings/hijack amounts.
- Marketing push requires consent checks.

## Admin Rules

- Mutating admin actions require admin reason.
- RBAC and MFA-sensitive boundaries must be preserved.
- Exports should be redacted/masked.
- Admin screen fetches should use no-store behavior.
- Audit logs should be sanitized and should not include raw financial data.

## Current Security-Related Assets

- `security/threat-model.md`
- `security/privacy-impact-assessment.md`
- `security/security-checklist.md`
- `security/vulnerability-response.md`
- `qa/security/security-test-checklist.md`
- `packages/security`
- security and privacy checks in package scripts

## Verification Warning

The presence of policy text or package metadata is not enough. Treat privacy/security as verified only when relevant tests, scans, code review, and runtime behavior have been checked.
