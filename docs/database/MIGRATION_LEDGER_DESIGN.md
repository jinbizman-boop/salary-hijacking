# Migration Ledger Design

Generated: 2026-08-13T11:30:02.461Z

## Location

The staging migration ledger lives outside the public application schema:

- schema: `db_meta`
- table: `db_meta.database_schema_migrations`

This preserves the canonical public table denominator at 41.

## Columns

- `migration_id`
- `filename`
- `checksum_sha256`
- `applied_at`
- `applied_by`
- `execution_duration_ms`
- `status`
- `schema_version`
- `verification_source`
- `created_at`
- `updated_at`

## Current State

- MIGRATION_COUNT=14
- VERIFIED_APPLIED=14
- AMBIGUOUS=0
- CHECKSUM_MATCH=14

Existing migrations 0001-0013 were backfilled as a verified baseline using live schema evidence and migration-specific object presence. Migration 0014 introduces the ledger itself and is recorded as the baseline import marker.

## Production

No production database mutation was performed in Phase 2 remediation. Production application of this ledger must be handled as a separate approved DB change.
