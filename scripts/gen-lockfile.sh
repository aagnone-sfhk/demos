#!/usr/bin/env bash
#
# Generate a complete, in-tree package-lock.json for a workspace app.
#
# A subtree deploy (scripts/deploy-subtree.sh) needs the app to carry its own
# npm lockfile — see docs/deploying.md. This produces one CLEAN-ROOM: run inside
# the pnpm workspace, `npm install` sees the symlinked node_modules and emits an
# incomplete lockfile, so we resolve the tree in a temp dir from package.json
# alone, then copy the result back.
#
# Usage:
#   scripts/gen-lockfile.sh <app-name>
#
# Requirements: npm, git (for a clean temp workdir).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

APP_NAME="${1:-}"
if [[ -z "$APP_NAME" ]]; then
  echo "error: app name required" >&2
  echo "usage: scripts/gen-lockfile.sh <app-name>" >&2
  exit 1
fi

APP_DIR="apps/$APP_NAME"
if [[ ! -f "$APP_DIR/package.json" ]]; then
  echo "error: $APP_DIR/package.json not found" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

cp "$APP_DIR/package.json" "$TMP/"

echo "==> resolving full dependency tree (clean-room) for $APP_NAME"
# min-release-age=0 overrides any global npmrc "supply-chain age" guard that
# would otherwise hide freshly published versions and fail resolution.
( cd "$TMP" && npm_config_min_release_age=0 npm install --package-lock-only --no-audit --no-fund )

if [[ ! -f "$TMP/package-lock.json" ]]; then
  echo "error: npm did not produce a package-lock.json" >&2
  exit 1
fi

ENTRIES="$(node -e "const l=require('$TMP/package-lock.json');console.log(Object.keys(l.packages||{}).length)")"
cp "$TMP/package-lock.json" "$APP_DIR/package-lock.json"
echo "==> wrote $APP_DIR/package-lock.json ($ENTRIES package entries)"
echo "    review + commit it, then: pnpm deploy:subtree $APP_NAME"
