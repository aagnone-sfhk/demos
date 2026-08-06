#!/usr/bin/env bash
#
# Deploy a workspace app in apps/<name> to Heroku via CNB.
#
# Uses `pnpm deploy` to produce a self-contained artifact with all
# workspace: protocols resolved, then pushes that artifact as a
# throwaway git repo to the Heroku remote.
#
# Invoke via `pnpm deploy:heroku <app>`. (Named deploy:heroku, not deploy, so it
# doesn't collide with the pnpm built-in `deploy` it calls internally.) This is
# the recommended deploy path; scripts/deploy-subtree.sh is the alternative.
# See docs/deploying.md for details.
#
# Usage:
#   scripts/deploy-heroku.sh <app-name> [heroku-app-name] [--build-only]
#
# Examples:
#   scripts/deploy-heroku.sh headless-360-mcp
#   scripts/deploy-heroku.sh headless-360-mcp my-heroku-app-name
#   scripts/deploy-heroku.sh headless-360-mcp --build-only
#
# Heroku app resolution order:
#   1. Second positional arg
#   2. apps/<app-name>/.heroku-app file (single line, app name)
#   3. HEROKU_APP env var
#
# Requirements: pnpm, git, heroku CLI (only for push; skipped with --build-only)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BUILD_ONLY=false
APP_NAME=""
HEROKU_APP=""
for arg in "$@"; do
  case "$arg" in
    --build-only) BUILD_ONLY=true ;;
    -*)           echo "error: unknown flag $arg" >&2; exit 1 ;;
    *)
      if [[ -z "$APP_NAME" ]]; then
        APP_NAME="$arg"
      elif [[ -z "$HEROKU_APP" ]]; then
        HEROKU_APP="$arg"
      else
        echo "error: unexpected extra arg: $arg" >&2
        exit 1
      fi
      ;;
  esac
done

if [[ -z "$APP_NAME" ]]; then
  echo "error: app name required" >&2
  echo "usage: scripts/deploy-heroku.sh <app-name> [heroku-app-name] [--build-only]" >&2
  exit 1
fi

APP_DIR="apps/$APP_NAME"
if [[ ! -d "$APP_DIR" ]]; then
  echo "error: $APP_DIR not found" >&2
  exit 1
fi

if ! $BUILD_ONLY; then
  if [[ -z "$HEROKU_APP" && -f "$APP_DIR/.heroku-app" ]]; then
    HEROKU_APP="$(head -n1 "$APP_DIR/.heroku-app" | tr -d '[:space:]')"
  fi
  if [[ -z "$HEROKU_APP" && -n "${HEROKU_APP_ENV:-}" ]]; then
    HEROKU_APP="$HEROKU_APP_ENV"
  fi
  if [[ -z "$HEROKU_APP" ]]; then
    echo "error: heroku app name not resolved" >&2
    echo "  provide it as arg 2, in $APP_DIR/.heroku-app, or via HEROKU_APP_ENV" >&2
    exit 1
  fi
fi

DEPLOY_DIR="deploy/$APP_NAME"

echo "==> cleaning $DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"
mkdir -p "$(dirname "$DEPLOY_DIR")"

# Build the app in-place BEFORE packaging. pnpm deploy copies the app dir into
# $DEPLOY_DIR verbatim, including whatever dist/ is currently there. If we don't
# refresh dist/ first we ship stale bundles — the CNB stack here has no lockfile
# in the artifact, so Heroku won't (re)build for us. Do it locally, with pnpm,
# so the deploy is deterministic and always matches the source we just wrote.
echo "==> pnpm --filter $APP_NAME build (refresh dist/ before packaging)"
pnpm --filter "$APP_NAME" build

echo "==> pnpm deploy --filter $APP_NAME -> $DEPLOY_DIR"
# --legacy: pnpm 10 requires either injected workspace packages or this flag.
# Safe for apps without workspace: deps; still works if you add them later.
pnpm --filter "$APP_NAME" deploy --legacy "$DEPLOY_DIR"

if [[ ! -f "$DEPLOY_DIR/package.json" ]]; then
  echo "error: pnpm deploy did not produce $DEPLOY_DIR/package.json" >&2
  exit 1
fi

# Copy the app's in-tree npm lockfile into the artifact. Without ANY lockfile,
# Heroku's Node CNB detects no package manager, skips both dependency install
# and any build script, AND (crucially) relaunches the previously cached image
# instead of our freshly pushed source. Deploys report success, releases
# increment, and the live site keeps serving stale bundles — a trap documented
# in docs/deploying.md §2.1. Shipping the lockfile makes the buildpack respect
# the new push.
if [[ -f "$APP_DIR/package-lock.json" ]]; then
  cp "$APP_DIR/package-lock.json" "$DEPLOY_DIR/package-lock.json"
  echo "==> copied package-lock.json into artifact (prevents CNB stale-image trap)"
else
  echo "warn: $APP_DIR/package-lock.json missing — Heroku may serve a cached image" >&2
  echo "      generate one with: pnpm deploy:lock $APP_NAME" >&2
fi

if $BUILD_ONLY; then
  echo "==> build-only: artifact ready at $DEPLOY_DIR"
  exit 0
fi

# Purge the CNB build cache BEFORE the push. Observed on this stack: even with
# the lockfile copied into the artifact, Heroku's CNB sometimes still relaunches
# a cached image (or serves the previous dist) after a fresh push — the layer
# content-hash logic matches too eagerly against cached layers. Purging first
# means the incoming push builds against a clean cache, so the served bundle
# deterministically matches what we just pushed. Costs ~3s. Skips silently if
# the heroku-builds plugin isn't installed.
if heroku plugins 2>/dev/null | grep -q heroku-builds; then
  echo "==> purging CNB build cache before push (avoids stale-image reuse)"
  heroku builds:cache:purge -a "$HEROKU_APP" --confirm "$HEROKU_APP" >/dev/null 2>&1 \
    || echo "warn: cache purge failed (continuing)"
else
  echo "note: heroku-builds plugin not installed; skipping cache purge"
  echo "      install with: heroku plugins:install heroku-builds"
fi

echo "==> initializing throwaway git repo in $DEPLOY_DIR"
(
  cd "$DEPLOY_DIR"
  git init -q -b main
  git add -A
  git -c user.email=deploy@local -c user.name=deploy \
    commit -q -m "deploy $APP_NAME @ $(date -u +%Y-%m-%dT%H:%M:%SZ)"

  HEROKU_GIT_URL="https://git.heroku.com/${HEROKU_APP}.git"
  echo "==> pushing to $HEROKU_GIT_URL (force)"
  git remote add heroku "$HEROKU_GIT_URL"
  git push --force heroku main
)

echo "==> deployed $APP_NAME to $HEROKU_APP"
