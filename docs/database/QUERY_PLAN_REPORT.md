# Query Plan Report

Generated: 2026-08-13T11:30:02.461Z

Representative read paths were checked with EXPLAIN against Neon staging. Staging row counts are small, so this is a pathological-plan screen, not a production-volume benchmark.

| Query | Result |
|---|---|
| current payroll cycle | Seq Scan at tiny staging row count; active user/month unique index exists; monitor under larger data |
| daily budget today | Index Scan using idx_daily_budget_user_date |
| expenses by user/date | Index Scan using idx_variable_user_spent; status filter outside index |
| fixed expense due lookup | Seq Scan plus Sort at tiny staging row count; low cost and no P0 issue, candidate status/day index for larger scheduler batches |
| savings by user/status | Index Scan using idx_savings_user_category_status plus small Sort by saving_day |
| unread notifications | Index Scan using idx_notifications_user_type_created plus Sort; status filter outside index |
| growth progress | Bitmap Index Scan using idx_user_level_content_progress_user_completed plus Sort |
| community feed | Index Scan using idx_posts_board_status_created |
| moderation report queue | Index Scan using idx_reports_status |
| admin user lookup by email | Seq Scan for direct email predicate; unique functional index exists on lower(email), API should use lower(email) predicate |

## Status

QUERY_PLAN_STATUS=PASS_FOR_STAGING_STRUCTURAL_REVIEW

No catastrophic plan was observed in staging evidence. Production-volume benchmarks remain a later performance hardening task, but DB-012 Phase 2 structural query-plan gate is closed for staging.
