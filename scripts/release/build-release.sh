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

mkdir -p release/artifacts

pnpm_bin run check:scripts
pnpm_bin run format:check
pnpm_bin turbo run typecheck --concurrency="${TURBO_CONCURRENCY:-1}"
pnpm_bin turbo run test --concurrency="${TURBO_CONCURRENCY:-1}"
pnpm_bin turbo run build --concurrency="${TURBO_CONCURRENCY:-1}"

{
  echo "Salary Hijacking local release build"
  echo "timestamp_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "format_check=PASS"
  echo "typecheck=PASS"
  echo "test=PASS"
  echo "build=PASS"
  echo "publish_step=NOT_RUN"
} > release/artifacts/local-release-summary.txt

echo "[release] wrote release/artifacts/local-release-summary.txt"
