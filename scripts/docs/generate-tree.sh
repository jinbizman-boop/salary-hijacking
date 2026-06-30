#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

mkdir -p docs/generated

find . \
  -path "./.git" -prune -o \
  -path "*/node_modules" -prune -o \
  -path "*/.turbo" -prune -o \
  -path "*/dist" -prune -o \
  -path "*/build" -prune -o \
  -path "*/coverage" -prune -o \
  -path "*/.next" -prune -o \
  -path "*/.open-next" -prune -o \
  -path "*/.expo" -prune -o \
  -path "*/.wrangler" -prune -o \
  -path "*/web-build" -prune -o \
  -type f -print |
  sed "s#^\./##" |
  sort > docs/generated/repo-tree.txt

echo "[docs] wrote docs/generated/repo-tree.txt"
