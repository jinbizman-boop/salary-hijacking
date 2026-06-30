#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${CONFIRM_DB_MIGRATE:-}" != "YES" ]]; then
  echo "[db:migrate] set CONFIRM_DB_MIGRATE=YES to run migrations." >&2
  exit 2
fi

if [[ -z "${DATABASE_URL:-}" && -z "${DIRECT_DATABASE_URL:-}" ]]; then
  echo "[db:migrate] DATABASE_URL or DIRECT_DATABASE_URL is required." >&2
  exit 2
fi

if [[ "${APP_ENV:-local}" == "production" && "${ALLOW_PRODUCTION_DB_MIGRATE:-}" != "YES" ]]; then
  echo "[db:migrate] production migration is blocked unless ALLOW_PRODUCTION_DB_MIGRATE=YES." >&2
  exit 2
fi

if command -v pnpm.cmd >/dev/null 2>&1; then
  pnpm.cmd run db:migrate
else
  pnpm run db:migrate
fi
