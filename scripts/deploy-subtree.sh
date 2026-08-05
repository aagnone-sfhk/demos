#!/usr/bin/env bash
#
# Deploy a workspace app in apps/<name> to Heroku via `git subtree`.
#
# Pushes apps/<name>/ as the repo root so Heroku's Node.js CNB builds it
# directly (npm ci -> npm run build -> npm start). This is an ALTERNATIVE to
# scripts/deploy-heroku.sh (`pnpm deploy:heroku`); see docs/deploying.md for
# when to use which, and why a subtree deploy needs an in-tree package-lock.json.
#
# Usage:
#   scripts/deploy-subtree.sh <app-name> [heroku-app-name] [--purge-cache]
#
# Examples:
#   scripts/deploy-subtree.sh info-headless-360-mcp
#   scripts/deploy-subtree.sh info-headless-360-mcp --purge-cache
#   scripts/deploy-subtree.sh info-headless-360-mcp my-heroku-app
#
# Heroku app resolution order (same as deploy-heroku.sh):
#   1. Second positional arg
#   2. apps/<app-name>/.heroku-app file (single line, app name)
#   3. HEROKU_APP_ENV env var
#
# --purge-cache: purge the CNB build cache before pushing (needs the
#   heroku-builds CLI plugin). Use this if a prior deploy cached a bad image.
#
# Requirements: git, heroku CLI (authenticated). heroku-builds plugin only for
# --purge-cache.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PURGE_CACHE=false
APP_NAME=""
HEROKU_APP=""
for arg in "$@"; do
  case "$arg" in
    --purge-cache) PURGE_CACHE=true ;;
    -*)            echo "error: unknown flag $arg" >&2; exit 1 ;;
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
  echo "usage: scripts/deploy-subtree.sh <app-name> [heroku-app-name] [--purge-cache]" >&2
  exit 1
fi

APP_DIR="apps/$APP_NAME"
if [[ ! -d "$APP_DIR" ]]; then
  echo "error: $APP_DIR not found" >&2
  exit 1
fi

# A subtree push strips the monorepo-root pnpm-lock.yaml, so the app MUST carry
# its own lockfile or the buildpack skips install+build and relaunches a stale
# cached image (see docs/deploying.md). Fail fast with a fix.
if [[ ! -f "$APP_DIR/package-lock.json" ]]; then
  echo "error: $APP_DIR/package-lock.json is missing." >&2
  echo "  A subtree deploy needs an in-tree lockfile. Generate one with:" >&2
  echo "    pnpm deploy:lock $APP_NAME" >&2
  exit 1
fi

# Refuse to deploy a dirty tree — subtree split works off committed history, so
# uncommitted changes would silently ship nothing (or the wrong thing).
if [[ -n "$(git status --porcelain -- "$APP_DIR")" ]]; then
  echo "error: uncommitted changes in $APP_DIR — commit them first." >&2
  echo "  subtree deploys the committed tree, not your working copy." >&2
  exit 1
fi

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

HEROKU_GIT_URL="https://git.heroku.com/${HEROKU_APP}.git"
SPLIT_BRANCH="heroku-subtree/$APP_NAME"

if $PURGE_CACHE; then
  echo "==> purging CNB build cache for $HEROKU_APP"
  if ! heroku builds:cache:purge -a "$HEROKU_APP" --confirm "$HEROKU_APP"; then
    echo "error: cache purge failed — is the heroku-builds plugin installed?" >&2
    echo "  heroku plugins:install heroku-builds" >&2
    exit 1
  fi
fi

echo "==> splitting subtree $APP_DIR -> $SPLIT_BRANCH"
git branch -D "$SPLIT_BRANCH" >/dev/null 2>&1 || true
git subtree split --prefix="$APP_DIR" -b "$SPLIT_BRANCH"

# git subtree push has no --force, and the Heroku app's main carries divergent
# history, so we force-push the split branch ourselves. This is a Heroku deploy
# remote (throwaway history), so force is expected.
echo "==> force-pushing $SPLIT_BRANCH -> $HEROKU_GIT_URL (main)"
cleanup() { git branch -D "$SPLIT_BRANCH" >/dev/null 2>&1 || true; }
trap cleanup EXIT
git push --force "$HEROKU_GIT_URL" "$SPLIT_BRANCH:main"

echo "==> deployed $APP_NAME to $HEROKU_APP"
echo "    verify: curl -sI https://${HEROKU_APP}.herokuapp.com/"
