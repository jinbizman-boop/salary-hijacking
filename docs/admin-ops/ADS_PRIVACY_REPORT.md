# Ads Privacy Report

Phase 7 tightened the ad campaign route boundary so forbidden financial targeting fields are rejected before any repository implementation receives the request. This prevents a future DB-backed repository or test double from accidentally accepting raw salary, payroll, loan, savings, expense, hijack amount, financialTargeting, or financialSegment payloads.

## Evidence

- services/api/src/routes/admin.routes.ts
- services/api/tests/admin-rbac-audit-moderation-routes.test.ts

## Status

ADS_PRIVACY=PASS_LOCAL_ROUTE_GUARD
RAW_FINANCIAL_AD_TARGETING=0_FOR_TESTED_ROUTE_BOUNDARY
