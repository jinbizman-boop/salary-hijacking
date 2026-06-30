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

pnpm_bin turbo run typecheck --concurrency="${TURBO_CONCURRENCY:-1}"
pnpm_bin turbo run test --concurrency="${TURBO_CONCURRENCY:-1}"

if [[ "${RUN_NATIVE_E2E:-0}" == "1" ]]; then
  pnpm_bin turbo run test:e2e --concurrency="${TURBO_CONCURRENCY:-1}"
else
  echo "[test-all] RUN_NATIVE_E2E=0, native E2E skipped."
fi
