# PHASE 8 Analytics Schema

STATUS=PASS_INTERNAL

The canonical analytics contract is implemented in `packages/api-contract/src/analytics/analytics.schema.ts` and exported through `@salary-hijacking/api-contract/analytics`.

## Event Contract

Every event uses snake_case `eventName`, integer `eventVersion`, ISO `occurredAt`, source platform, identifier policy, consent class, and privacy-safe parameters only.

## Canonical Events

- screen_view v1: essential_operational; params=page_id; referrer_class; source_platform
- signup_completed v1: product_analytics; params=auth_method; source_platform
- login_completed v1: essential_operational; params=auth_method; source_platform
- payroll_setup_completed v1: product_analytics; params=setup_step_count; source_platform
- plan_saved v1: product_analytics; params=plan_type; source_platform
- daily_budget_viewed v1: product_analytics; params=budget_status; source_platform
- expense_created v1: product_analytics; params=expense_frequency_bucket; source_platform
- saving_created v1: product_analytics; params=saving_type_bucket; source_platform
- mission_completed v1: product_analytics; params=mission_type; streak_bucket
- community_post_created v1: product_analytics; params=board_type; anonymous_mode
- ad_impression v1: advertising_or_personalized; params=ad_slot; campaign_class; frequency_bucket
- ad_click v1: advertising_or_personalized; params=ad_slot; campaign_class
- partner_inquiry_started v1: product_analytics; params=source_page
- partner_inquiry_submitted v1: product_analytics; params=source_page; inquiry_type
- experiment_exposed v1: product_analytics; params=experiment_id; variant; guardrail_class

## Privacy Prohibitions

Raw salary, income, expense amount, saving amount, budget amount, hijacked amount, debt, email, phone, name, tokens, post/comment bodies, and arbitrary free text are prohibited from analytics payloads.

Financial behavior analytics uses only buckets or status classes such as `budget_status`, `goal_completion_bucket`, and `expense_frequency_bucket`.

## Consent Boundary

Essential operational analytics is limited to service integrity and security. Product analytics requires the product analytics consent class. Advertising or personalized analytics is separated and must not use raw financial source data.

## Retention And Withdrawal

D1/D7/D30 and weekly engagement are aggregate measurement contracts. User withdrawal must detach or delete user-identifiable joins where technically supported; aggregate metrics must not preserve raw PII or raw financial values.

## Data Quality

Schema validation, event versioning, duplicate event detection by event identity, timestamp validation, and unknown field rejection are covered by `packages/api-contract/src/analytics/analytics.schema.test.ts`.
