# DB Capability Matrix

Generated: 2026-08-13T11:30:02.461Z

| Capability | Target | Current Evidence | Status |
|---|---|---|---|
| Staging branch isolation | staging branch, not main | Project salary-hijacking, branch staging, database neondb | PASS |
| RLS | 41/41 | 41/41 live catalog | PASS |
| FORCE RLS | required user-owned/sensitive tables | 30 live catalog FORCE RLS rows | PASS |
| App role BYPASSRLS | false | salary_hijacking_staging_app rolbypassrls=false | PASS |
| A/B isolation | representative domains | PASS synthetic test, residue 0 | PASS |
| PITR | RPO<=15min | Plan/capability not available through no-secret evidence; Neon docs state history window depends on plan and can range up to 30 days | EXTERNAL_CAPABILITY_GAP |
| Recovery | RTO<=2h | Forward recovery and transaction rollback scenarios verified; actual PITR restore blocked by capability evidence | PASS_INTERNAL |
| Performance | no pathological critical plan | 10 representative EXPLAIN paths reviewed; no P0 plan issue found in staging | PASS_STRUCTURAL |
| Migration checksums | recorded DB checksums | db_meta.database_schema_migrations records 14/14 file checksums | PASS |
