# Schema Drift Report

Generated: 2026-08-13T11:30:02.461Z

## Compared Sources

- Live Neon staging branch: staging (br-fragrant-sky-aj5kk2c3), database neondb
- SQL migrations: 14 files under database/migrations
- packages/db static schema files: 72 DbTableSpec exports

## Summary

| Drift | Status | Evidence | Severity |
|---|---|---|---|
| Live staging table count | MATCH | 41 public base tables | PASS |
| Migration materialized schema | MATCH_BY_LIVE_EVIDENCE | 41 live tables include 0012 growth_content_items and 0013 FORCE RLS effects | PASS |
| Canonical packages/db schema boundary | MATCH | canonicalProductionTableNames defines 41 physical runtime tables | PASS |
| packages/db broad static contract surface | SAFE_ADDITIVE_DRIFT | packages/db exports 72 DbTableSpec contracts; 50 are explicitly noncanonical/future contract surface | PASS |
| Migration DB checksum ledger | MATCH | db_meta.database_schema_migrations has 14/14 VERIFIED_APPLIED rows with matching SHA-256 checksums | PASS |
| RLS | MATCH | 41/41 tables RLS enabled | PASS |
| FORCE RLS | MATCH_WITH_EXCEPTIONS | 30 FORCE RLS; exceptions documented in RLS_MATRIX.csv | PASS |
| Policies | MATCH | 75 live policies | PASS |

SCHEMA_DRIFT_P0=0

## packages/db Noncanonical Static Exports

- community_audit_events (FUTURE)
- community_boards (FUTURE)
- community_bookmarks (FUTURE)
- community_idempotency_records (FUTURE)
- community_moderation_actions (FUTURE)
- community_post_attachments (FUTURE)
- community_post_metrics_daily (FUTURE)
- community_post_tags (FUTURE)
- community_shares (FUTURE)
- community_tags (FUTURE)
- community_user_sanctions (FUTURE)
- daily_budget_periods (FUTURE)
- expense_audit_events (FUTURE)
- expense_budget_snapshots (FUTURE)
- expense_categories (FUTURE)
- expense_events (FUTURE)
- expense_idempotency_records (FUTURE)
- expense_import_batches (FUTURE)
- expense_import_items (FUTURE)
- expense_post_attachments (FUTURE)
- expense_reconciliations (FUTURE)
- expense_refunds (FUTURE)
- fixed_expense_occurrences (FUTURE)
- fixed_expense_rules (FUTURE)
- growth_audit_events (FUTURE)
- growth_categories (FUTURE)
- growth_daily_summaries (FUTURE)
- growth_exp_events (FUTURE)
- growth_idempotency_records (FUTURE)
- growth_level_rules (FUTURE)
- growth_proof_attachments (FUTURE)
- growth_streaks (FUTURE)
- growth_task_schedules (FUTURE)
- monthly_expense_periods (ORPHAN_SCHEMA)
- notification_audit_events (FUTURE)
- notification_dedupe_records (FUTURE)
- notification_dispatch_jobs (FUTURE)
- notification_preferences (FUTURE)
- notification_push_tokens (FUTURE)
- notification_templates (FUTURE)
- payroll_adjustments (FUTURE)
- payroll_allocations (FUTURE)
- payroll_audit_events (FUTURE)
- payroll_cycles (FUTURE)
- payroll_idempotency_records (FUTURE)
- payroll_income_events (FUTURE)
- payroll_month_closures (FUTURE)
- payroll_settings (FUTURE)
- user_audit_events (FUTURE)
- user_idempotency_records (FUTURE)

## Decision

PHASE 2 closes the P0 schema drift by separating the canonical 41 physical runtime boundary from the broader packages/db future contract surface. No noncanonical export is deleted or counted as a live table until migration-backed.
