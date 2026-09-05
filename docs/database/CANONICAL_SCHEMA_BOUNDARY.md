# Canonical Schema Boundary

Generated: 2026-08-13T11:30:02.461Z

## Decision

The canonical production/staging physical schema for v2.0 is the 41 public base-table set listed in `packages/db/src/index.ts#canonicalProductionTableNames` and `docs/database/DB_TABLE_REGISTRY_41.csv`.

The broader `packages/db/src/schema/*.schema.ts` surface exports 72 `DbTableSpec` contracts. Those exports are not automatically physical runtime tables. `docs/database/STATIC_SCHEMA_72_RECONCILIATION.csv` classifies every export, with UNKNOWN=0.

## Counts

- CANONICAL_TABLES=41
- STATIC_SCHEMA_EXPORTS=72
- STATIC_EXPORTS_OVERLAPPING_CANONICAL=22
- NONCANONICAL_STATIC_EXPORTS=50
- UNKNOWN_EXPORTS=0

## Guard

Future migrations must update all three surfaces together:

1. SQL migration files under `database/migrations`
2. live staging DB after approved migration
3. `canonicalProductionTableNames` and the database audit registry

Noncanonical static exports must remain outside the 41 denominator until migration-backed and live-verified.
