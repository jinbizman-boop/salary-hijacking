#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ "${CONFIRM_DB_SEED:-}" != "YES" ]]; then
  echo "[db:seed] set CONFIRM_DB_SEED=YES to run seed data." >&2
  exit 2
fi

if [[ -z "${DATABASE_URL:-}" && -z "${DIRECT_DATABASE_URL:-}" ]]; then
  echo "[db:seed] DATABASE_URL or DIRECT_DATABASE_URL is required." >&2
  exit 2
fi

if [[ "${APP_ENV:-local}" == "production" && "${ALLOW_PRODUCTION_DB_SEED:-}" != "YES" ]]; then
  echo "[db:seed] production seed is blocked unless ALLOW_PRODUCTION_DB_SEED=YES." >&2
  exit 2
fi

if command -v pnpm.cmd >/dev/null 2>&1; then
  pnpm.cmd run db:seed
else
  pnpm run db:seed
fi
