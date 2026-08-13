# Migration Checksum Governance

Generated: 2026-08-13T11:30:02.461Z

## Rule

Applied migration files are immutable. Any change to an applied file's SHA-256 is a governance failure and must be replaced by a new forward migration.

## Validator

`scripts/audit/validate-migration-checksums.mjs` verifies:

- duplicate migration id = 0
- migration order stable
- every SQL migration appears in `docs/database/MIGRATION_LEDGER.csv`
- every ledger row has a matching file
- file SHA-256 equals the ledger checksum
- DB-recorded checksum equals file checksum for verified rows

## Current Result

MIGRATION_CHECKSUM_STATUS=PASS
MIGRATION_AMBIGUOUS_COUNT=0
