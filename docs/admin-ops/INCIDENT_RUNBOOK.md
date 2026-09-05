# Phase 7 Incident Runbook

INCIDENT_RUNBOOK_STATUS=PASS_INTERNAL

## Scope

This runbook covers admin, ads, and operations incidents without mutating production during Phase 7.

## Intake

- Capture requestId/correlationId, affected surface, severity, and first observed time.
- Do not paste secrets, access tokens, passwords, MFA factors, raw salary, raw expense, or raw PII into incident notes.
- Classify affected area using AUTH, PAYROLL, BUDGET, EXPENSE, SAVINGS, NOTIFICATION, LEVEL_UP, COMMUNITY, ADS_PARTNER, ADMIN, API, DB, INFRA, SECURITY, RELEASE, or UNKNOWN.

## Triage

- Verify /health and /api/v1/ready before deeper diagnosis.
- For admin failures, verify the /admin/api/v1 route on the API host and distinguish it from admin web static hosting paths.
- For ads failures, verify ad_campaigns/ad_events privacy constraints before enabling any campaign.
- For permission failures, inspect role membership and server-side permission resolution; UI visibility is not evidence.

## Containment

- Prefer read-only fallback for admin dashboards before disabling user-facing systems.
- Disable or pause only the smallest affected campaign/notice/admin operation.
- Production traffic/DNS/deploy changes require explicit user approval outside Phase 7.

## Evidence

- Store no-secret summaries in docs/admin-ops.
- Redact raw PII and raw financial amounts.
- Link DB object names and request IDs, not credential values.
