#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -d "$REPO_ROOT/.git" ]]; then
  echo "Elara deploy error: cPanel repository checkout is missing .git" >&2
  exit 1
fi

SHA="$(git -C "$REPO_ROOT" rev-parse --verify HEAD)"
if [[ ! "$SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "Elara deploy error: invalid HEAD SHA" >&2
  exit 1
fi

PHP_BIN="${ELARA_PHP_BIN:-$(command -v php || true)}"
if [[ -z "$PHP_BIN" ]]; then
  echo "Elara deploy error: PHP CLI is required" >&2
  exit 1
fi

exec "$PHP_BIN" "$REPO_ROOT/deploy/server/cli-deploy.php" \
  --source="$REPO_ROOT" \
  --sha="${SHA,,}"
