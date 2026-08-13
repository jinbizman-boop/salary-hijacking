# DB Security Report

Generated: 2026-08-13T11:30:02.461Z

## Application Role

| Attribute | Value |
|---|---|
| role | salary_hijacking_staging_app |
| rolsuper | false |
| rolcreaterole | false |
| rolcreatedb | false |
| rolreplication | false |
| rolbypassrls | false |
| rolcanlogin | false |
| schema public USAGE | true |
| schema public CREATE | false |
| schema db_meta USAGE | false |
| schema db_meta CREATE | false |
| owner role membership | false |
| neon_superuser membership | false |

## RLS/FORCE

- RLS enabled: 41/41
- FORCE RLS: 30/41
- Policies: 75
- A/B isolation: PASS for representative user-owned domains

## Grants

The app role has broad SELECT/INSERT/UPDATE/DELETE grants on public tables. This is acceptable only because RLS/FORCE and non-BYPASSRLS app role are the enforcement boundary. This should remain under regression guard.

## SECURITY DEFINER

23 SECURITY DEFINER functions were found; all inspected catalog rows set `search_path=public`. Dedicated function-by-function escalation audit remains recommended.

## Default Privileges

Default ACL rows grant neon_superuser privileges for cloud_admin-created tables/sequences. No app-role default sequence grants were found.

DB_SECURITY_P0=0
DB_SECURITY_STATUS=PARTIAL

No P0 bypass was verified. App role catalog negative checks show public CREATE=false, db_meta USAGE/CREATE=false, owner membership=false, and neon_superuser membership=false. SECURITY DEFINER depth review remains a later hardening item, not a current P0 blocker.
