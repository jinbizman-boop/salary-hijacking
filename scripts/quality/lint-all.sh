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

pnpm_bin run check:scripts
pnpm_bin run format:check
pnpm_bin turbo run lint --concurrency="${TURBO_CONCURRENCY:-1}"
