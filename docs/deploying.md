# Deploying to Heroku

Each app under `apps/*` maps to its own Heroku app running on the
**cloud-native buildpack (CNB)** stack (`heroku/nodejs`). All deploys go
through pnpm scripts — you shouldn't need to run `git subtree` or the Heroku
CLI by hand.

| Command                      | What it does                                             |
| ---------------------------- | -------------------------------------------------------- |
| `pnpm deploy:heroku <app>`   | Recommended. Push a self-contained artifact (§1).        |
| `pnpm deploy:build <app>`    | Build that artifact locally without pushing (§1).        |
| `pnpm deploy:subtree <app>`  | Alternative. Push the app subtree; Heroku builds it (§2).|
| `pnpm deploy:lock <app>`     | Generate the lockfile a subtree deploy needs (§2).       |

> Our scripts live under the `deploy:*` namespace on purpose. Bare `pnpm deploy`
> (no colon) is a pnpm **built-in** that bundles one workspace package into a
> self-contained directory — `deploy:heroku` uses it internally (§1), so it must
> stay reachable. Naming our recommended script `deploy:heroku` rather than
> `deploy` keeps both callable without collision.

The Heroku app name resolves in this order for every command: an explicit
second argument, then `apps/<app>/.heroku-app` (a one-line file), then the
`HEROKU_APP_ENV` environment variable.

Prerequisites: an authenticated Heroku CLI (`heroku whoami` should succeed).
`--purge-cache` additionally needs the `heroku-builds` plugin
(`heroku plugins:install heroku-builds`).

---

## 1. `pnpm deploy:heroku` — self-contained artifact (recommended)

`scripts/deploy-heroku.sh` runs the pnpm **built-in** `pnpm deploy --legacy` to
produce a **self-contained artifact**: every `workspace:` protocol dependency is
resolved and the app's own `node_modules` is materialized into `deploy/<app>/`.
That directory is initialized as a throwaway git repo and force-pushed to the
Heroku remote.

```bash
pnpm deploy:heroku info-headless-360-mcp                # resolve .heroku-app, build, push
pnpm deploy:heroku info-headless-360-mcp my-heroku-app  # or name the Heroku app explicitly
pnpm deploy:build  info-headless-360-mcp                # build deploy/<app>/ only, don't push
```

Why this is the default: because the artifact ships resolved dependencies, it
works **regardless** of whether the app has cross-workspace (`workspace:`)
dependencies, and it doesn't depend on Heroku's buildpack re-resolving anything.

---

## 2. `pnpm deploy:subtree` — let Heroku build the app

`scripts/deploy-subtree.sh` splits `apps/<app>/` into a temporary branch whose
**root is the app directory**, then force-pushes it to the Heroku remote's
`main`. Heroku's Node.js buildpack then builds it in the cloud: `npm ci` →
`npm run build` → launch `npm start`.

```bash
pnpm deploy:subtree info-headless-360-mcp                 # split + force-push
pnpm deploy:subtree info-headless-360-mcp --purge-cache   # purge build cache first (see §2.2)
```

The script splits and force-pushes manually because `git subtree push` has no
`--force`, and each Heroku app's `main` carries divergent throwaway history —
so a fast-forward push is always rejected. It also refuses to run if the app
has uncommitted changes (a subtree deploys the *committed* tree, not your
working copy) or is missing its lockfile (see §2.1).

This method is only viable for an app that is **fully self-contained** — no
`workspace:` dependencies — because the subtree is pushed without any monorepo
context. `info-headless-360-mcp` qualifies; an app that imports a shared
workspace package does not (use §1 for those).

### 2.1 Why a subtree deploy needs an in-tree `package-lock.json`

This is the sharp edge of the subtree method, and it fails **silently**.

`git subtree` pushes only the app subdirectory. It leaves behind the
monorepo-root `pnpm-lock.yaml` — so the pushed tree has **no lockfile at all**.
The Heroku Node.js buildpack detects the package manager (and decides whether
to install and build) *from the presence of a lockfile*. With none, the build
log reads:

```
1 of 3 buildpacks participating
```

Only the Node engine runs — `npm ci` and `npm run build` are **skipped
entirely**. Worse, on the CNB stack Heroku then **relaunches the previous
cached image**. The push reports `deployed to Heroku` and the release count
increments, but the running app is stale (in our case it kept serving an
older, pre-Vite build). Nothing errors; you only notice by checking the live
site.

The fix is to commit a `package-lock.json` **inside the app directory** so it
travels with the subtree. Then the buildpack sees a lockfile, reports
`3 of 3 buildpacks participating`, and runs `npm ci` → `npm run build` →
`npm prune` as expected.

`pnpm deploy:subtree` fails fast with instructions if the lockfile is missing,
so you can't hit this trap unknowingly.

**Generating the lockfile** (`scripts/gen-lockfile.sh`, wrapped as
`pnpm deploy:lock`):

```bash
pnpm deploy:lock info-headless-360-mcp   # writes apps/<app>/package-lock.json — review + commit it
```

Two non-obvious reasons it's a script and not a bare `npm install`:

1. **Clean-room resolution.** Run inside the pnpm workspace, `npm install` sees
   pnpm's symlinked `node_modules` and emits a truncated lockfile (top-level
   deps only — ~15 entries, unusable by `npm ci`). The script resolves the full
   tree in a temp dir from `package.json` alone (~68 entries, all transitive
   deps and every platform's optional binaries — including the `linux-x64` ones
   Heroku's dynos need).
2. **`min-release-age` guard.** If a global npmrc sets `min-release-age` (or
   `before`), `npm` hides freshly published versions and resolution fails with
   `No matching version found … with a date before …`. The script sets
   `npm_config_min_release_age=0` for the resolution so recent releases are
   visible. (Heroku's registry has no such guard.)

Regenerating may pull newer patch versions of transitive deps — that's normal
npm behavior. Review the diff before committing so a deploy-prep step doesn't
smuggle in an unrelated dependency bump.

### 2.2 Recovering from a bad cached image

If a subtree push already cached a bad image (e.g. you pushed once without a
lockfile), purging the build cache alone is **not** enough — the missing
lockfile is the root cause, so fix that first (§2.1), then purge and re-push:

```bash
pnpm deploy:subtree info-headless-360-mcp --purge-cache
```

`--purge-cache` runs `heroku builds:cache:purge` before the push (needs the
`heroku-builds` plugin).

---

## Verifying a deploy

Check the **live site over HTTP**, not just the push output — a subtree deploy
can report success while serving stale code (§2.1):

```bash
curl -sI https://<heroku-app>.herokuapp.com/
curl -s  https://<heroku-app>.herokuapp.com/ | grep -o '/assets/index-[^"]*\.js'
```

Confirm the served asset hash matches your local `dist/assets/…` build.

Prefer HTTP checks over the CLI here: `heroku logs` and `heroku releases` were
observed hanging (>60s) against this app's Space, whereas HTTP responds
immediately.
