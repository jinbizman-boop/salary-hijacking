---
codex_context: true
priority: P0
scope: financial-calculation
last_verified: 2026-06-29
---

# Server Authority Rules

## Core Rule

The server is the source of truth for payroll, budget, expense, savings, notification eligibility, growth rewards, and moderation state.

Mobile and Admin may show optimistic or fallback UI, but must not become authoritative for financial state.

## Money Rules

- Currency is KRW.
- Store authoritative money as integer values.
- Reject negative authoritative amounts unless a domain explicitly models reversal/refund through a separate action.
- Reject fractional authoritative amounts.
- Do not infer financial values from ad, analytics, or community data.

## Time Rules

- Store timestamps in UTC.
- Display Korean user-facing time in Asia/Seoul where needed.
- Scheduler jobs should be explicit about Asia/Seoul business logic and UTC storage.

## Calculation Boundaries

Authoritative formulas must live in API/DB/service logic, not client-only screens.

Existing formula intent:

- planned total expense = fixed expense + daily living budget + planned other expense
- expected hijack = max(0, expected salary - planned total expense)
- today remaining budget = max(0, daily limit - today variable expense)
- monthly actual hijack = max(0, actual income + carry over - actual expense - actual savings)

## Client Fallback Rule

Mobile fallback seed data is allowed only for offline/demo resilience. It must be visually and logically treated as non-authoritative until refreshed from `/api/v1`.

## Endpoint Alignment Rule

Before adding or changing a mobile/admin call, compare it with the API route manifest in `services/api/src/routes`.

Current mobile alignment verified on 2026-06-29:

- Mobile bootstrap uses `/api/v1/mobile/bootstrap`; API worker app exposes it and `services/api/tests/mobile-bootstrap.test.ts` covers the protected and trusted-auth-context paths.
- Mobile payroll plan screens use `/api/v1/payroll/current` and `POST /api/v1/payroll/recalculate`; API payroll manifest exposes both.
- Mobile profile screen uses `GET /api/v1/users/me/profile`, `POST /api/v1/users/me/privacy-export`, and request-only `POST /api/v1/users/me/withdrawal-request`; API users routes expose these compatibility aliases and `services/api/tests/mobile-profile-contract.test.ts` covers the mobile payload, privacy export action, and non-destructive withdrawal request.
- `services/api/tests/mobile-route-manifest-contract.test.ts` guards the current mobile payroll, profile, growth, notification, and fixed-expense route manifest contract.
- Mobile community screens mark unsupported bookmark endpoints as not used; community API remains centered on boards, posts, comments, likes, reports, and moderation.

Remaining alignment risks:

- Admin references `/admin/api/v1/dashboard/readiness`, `/banners`, `/metrics`, `/events`; current admin API manifest centers on dashboard, users, community posts, reports, notices, ads, growth tasks, audit logs, role members.
