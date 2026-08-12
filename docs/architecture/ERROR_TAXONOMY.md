# Error Taxonomy

Generated: 2026-08-12T16:14:37.814Z

Canonical registry: `docs/architecture/ERROR_TAXONOMY_REGISTRY.csv`.

Required namespaces are frozen: AUTH_*, AUTHZ_*, VALIDATION_*, FINANCE_*, NOT_FOUND_*, CONFLICT_*, IDEMPOTENCY_*, RATE_LIMIT_*, UPLOAD_*, COMMUNITY_*, ADMIN_*, DEPENDENCY_* and INTERNAL_*.

Every error code has an HTTP status, retry policy, user-facing visibility, log severity and owning domain. Client responses must not expose stack traces, SQL internals, secrets, raw PII, raw push tokens or raw financial source data.
