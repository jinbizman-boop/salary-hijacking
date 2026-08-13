# RLS A/B Isolation Report

Generated: 2026-08-13T11:30:02.461Z

## Target

- Project: salary-hijacking
- Branch: staging
- Database: neondb
- Application role: salary_hijacking_staging_app

## Result

AB_ISOLATION=PASS

Synthetic users A/B were created on staging, tested through `SET LOCAL ROLE salary_hijacking_staging_app` with `app.current_user_id` and `app.is_admin=false`, and cleaned up. No secret, real PII, or real financial data was persisted in evidence.

## Domains Tested

- users/profile
- payroll
- daily budgets
- fixed expenses
- variable expenses
- savings
- notifications
- growth/progress
- community
- support/privacy

## Operations

- A create
- A read
- B read invisible
- B update denied/0 rows
- B delete denied/0 rows
- ownership spoof insert blocked

## Cleanup

Residue check after isolation and duplicate-guard tests: 0 synthetic rows after cleanup.

## Notes

Community posts intentionally used DRAFT rows because PUBLISHED/LOCKED posts are public-readable by policy. This verifies owner-private write-state isolation without misclassifying public community read policy as a leak.
