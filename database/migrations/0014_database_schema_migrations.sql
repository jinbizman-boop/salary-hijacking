-- database/migrations/0014_database_schema_migrations.sql
-- Add a non-public migration metadata ledger without changing the canonical
-- public 41-table application schema denominator.

create schema if not exists db_meta;

create table if not exists db_meta.database_schema_migrations (
  migration_id text primary key,
  filename text not null,
  checksum_sha256 char(64) not null,
  applied_at timestamptz not null default now(),
  applied_by text not null default current_user,
  execution_duration_ms integer not null default 0,
  status text not null default 'VERIFIED_APPLIED',
  schema_version text not null default '2.0.0',
  verification_source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_database_schema_migrations_checksum
    check (checksum_sha256 ~ '^[A-F0-9]{64}$'),
  constraint chk_database_schema_migrations_duration
    check (execution_duration_ms >= 0),
  constraint chk_database_schema_migrations_status
    check (status in ('VERIFIED_APPLIED', 'VERIFIED_NOT_APPLIED', 'AMBIGUOUS', 'FAILED', 'SUPERSEDED'))
);

create index if not exists idx_database_schema_migrations_status
  on db_meta.database_schema_migrations (status, applied_at desc);
