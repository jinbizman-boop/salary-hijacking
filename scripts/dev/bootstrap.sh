#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

pnpm_bin() {
  if command -v pnpm.cmd >/dev/null 2>&1; then
    pnpm.cmd "$@"
  else
    pnpm "$@"
  fi
}

"$ROOT_DIR/scripts/dev/check-env.sh"

if [[ "${SKIP_INSTALL:-0}" == "1" ]]; then
  echo "[bootstrap] SKIP_INSTALL=1, dependency install skipped."
else
  pnpm_bin install --frozen-lockfile
fi

if [[ "${RUN_BOOTSTRAP_VALIDATION:-1}" == "1" ]]; then
  pnpm_bin run format:check
  pnpm_bin turbo run typecheck --concurrency="${TURBO_CONCURRENCY:-1}"
else
  echo "[bootstrap] RUN_BOOTSTRAP_VALIDATION=0, validation skipped."
fi

echo "[bootstrap] workspace bootstrap checks completed."
