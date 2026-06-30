---
codex_context: true
priority: P1
scope: coding-conventions
last_verified: 2026-06-25
---

# Coding Conventions

## General

- Prefer existing package and route patterns.
- Keep edits scoped.
- Do not introduce new architecture while fixing local verification unless the user asks.
- Avoid changing generated-looking metadata unless needed for correctness.
- Do not remove user changes without explicit permission.

## TypeScript

- Preserve strict TypeScript intent.
- Use explicit types around public contracts.
- Prefer domain schemas/contracts already present in packages.
- Avoid `any` unless a boundary truly requires it and explain why.

## Mobile

- Be careful with the existing no-static-import/no-JSX style in large mobile screens.
- Do not assume empty feature modules are implemented.
- Verify endpoint paths before adding new mobile API calls.
- Treat seed/fallback data as non-authoritative.

## Admin

- Existing admin pages often return `null` and manually mount HTML into DOM.
- This is not idiomatic React, but it is the current local pattern.
- Do not refactor to component-based React unless the task is explicitly to modernize Admin UI.

## API

- Keep route manifests updated when adding endpoints.
- Preserve middleware boundaries: auth, audit, rate limit, error handling, security headers.
- Do not expose raw financial values in response shapes meant for ads, logs, analytics, or public export.
- Prefer DB-backed repositories for production behavior; in-memory repositories are acceptable for tests/dry-run only.

## Docs

- Use plain, direct Korean or English.
- Avoid "100%" claims unless the validation scope is named.
- Keep `docs/codex` operational and concise.
