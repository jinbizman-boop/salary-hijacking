#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

missing=0

require_command() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    echo "[env] found command: $name"
  else
    echo "[env] missing command: $name" >&2
    missing=1
  fi
}

require_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    echo "[env] found file: $path"
  else
    echo "[env] missing file: $path" >&2
    missing=1
  fi
}

optional_command() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    echo "[env] optional command available: $name"
  else
    echo "[env] optional command unavailable: $name"
  fi
}

optional_env() {
  local name="$1"
  if [[ -n "${!name:-}" ]]; then
    echo "[env] optional env set: $name"
  else
    echo "[env] optional env unset: $name"
  fi
}

require_command node
if command -v pnpm.cmd >/dev/null 2>&1; then
  echo "[env] found command: pnpm.cmd"
elif command -v pnpm >/dev/null 2>&1; then
  echo "[env] found command: pnpm"
else
  echo "[env] missing command: pnpm or pnpm.cmd" >&2
  missing=1
fi

require_file package.json
require_file pnpm-workspace.yaml
require_file turbo.json
require_file apps/mobile/package.json
require_file services/api/package.json
require_file apps/admin/package.json

optional_env ANDROID_SDK_ROOT
optional_env ANDROID_HOME
optional_env DATABASE_URL
optional_env EXPO_PUBLIC_API_BASE_URL
optional_env NEXT_PUBLIC_API_BASE_URL
optional_env CLOUDFLARE_ACCOUNT_ID
optional_env EXPO_TOKEN
optional_command adb
optional_command emulator

if [[ "$missing" -ne 0 ]]; then
  echo "[env] required checks failed." >&2
  exit 1
fi

echo "[env] required checks passed."
