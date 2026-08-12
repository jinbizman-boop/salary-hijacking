# API Contract Final

Generated: 2026-08-12T16:14:37.814Z

Top SSOT:
- Function/performance PDF: C:/Users/PC/Downloads/급여납치_풀스택_기능_성능_정의서_v2.0_최종본.pdf
- Process PDF: C:/Users/PC/Downloads/급여납치_전체_개발_단계_작업_프로세스_v2.0_최종본.pdf

PHASE 0 precondition: PASS.

## Exact Endpoint Inventory

Exact endpoint count: 234

The canonical endpoint registry is `docs/architecture/API_ENDPOINT_REGISTRY.csv`. It is derived from the actual route manifests in `services/api/src/routes/*.routes.ts` plus public gateway endpoints in `services/api/src/app.ts`.

## Common Envelope

Canonical success envelope:

```json
{ "ok": true, "data": {}, "meta": { "requestId": "..." } }
```

Canonical collection envelope:

```json
{ "ok": true, "data": { "items": [] }, "meta": { "requestId": "...", "pageInfo": { "limit": 20, "hasNextPage": false } } }
```

Canonical error envelope:

```json
{ "ok": false, "error": { "code": "VALIDATION_FIELD_INVALID", "message": "safe message" }, "meta": { "requestId": "..." } }
```

Backward-compatible adapters may accept existing route-level `success` responses during migration, but PHASE 1 freezes `ok/data/meta` as the shared contract target.

## Authentication Boundary

Public allowlist is limited to preflight, health/readiness, auth entry points, refresh, public app config and legal/static endpoints. All user-owned write/read endpoints require an authenticated principal created by `auth.middleware`.

Access token TTL is 15 minutes. Refresh token TTL target is 30 days with rotation, reuse detection, session revoke, logout-current and logout-all behavior. Admin auth requires MFA for privileged operations.

## Authorization Boundary

All user-owned data requires authenticated user equals resource owner, unless a server-enforced privileged permission explicitly applies. UI visibility is not authorization.

Final admin role contract is frozen in `AUTHORIZATION_MATRIX.csv`: SUPER_ADMIN, OPS_ADMIN, MODERATOR, CONTENT_ADMIN, SUPPORT, ADS_PARTNER_ADMIN and AUDITOR_READONLY.

## Pagination And Search

Collection APIs use cursor pagination unless a documented compatibility endpoint still exposes page/pageSize. Default limit is 20, max limit is 100, stable sort is `createdAt desc, id desc`, cursor is opaque, and invalid cursor returns `VALIDATION_CURSOR_INVALID`.

Search uses exact/filter first, ILIKE for small admin/operator lists, trigram/GIN/FTS only where PHASE 2/4 explicitly provisions indexes.

## Compatibility

`/api/v1` remains the compatibility line. Changes are additive by default. Breaking changes require ADR/RFC, minimum mobile version policy, deprecation window, and consumer/provider compatibility tests.

## Ownership

Provider owner: services/api.
Consumer owners: apps/mobile and apps/admin.
Shared schema owner: packages/api-contract.
DB contract owner: packages/db and database/migrations.
