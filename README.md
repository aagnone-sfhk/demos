# demos

Anthony's collection of Salesforce demos, structured as a Turborepo monorepo.

## Layout

```
apps/                   # Deployable applications (each maps to its own Heroku app)
  headless-360-mcp/     # Walkthrough of the Headless 360 MCP Server
  directory/            # Landing page listing every deployed demo

experiments/            # Scratch / non-deployable work — not part of the workspace graph
```

Only `apps/*` are pnpm workspace members. Anything in `experiments/` is standalone
and left untouched by `pnpm install` / `turbo run`.

## Getting started

```bash
pnpm install
pnpm dev --filter headless-360-mcp   # or: --filter directory
```

## Common tasks

| Task    | Command                                    |
| ------- | ------------------------------------------ |
| Dev     | `pnpm dev --filter <app>`                  |
| Build   | `pnpm build --filter <app>`                |
| Prod    | `PORT=8080 pnpm start --filter <app>`      |
| All     | `pnpm build` (runs every app in parallel)  |

## Deploying to Heroku

Each `apps/*` maps to its own Heroku app. Deploy commands (Heroku app name
resolves from `apps/<app>/.heroku-app`):

| Task                        | Command                          |
| --------------------------- | -------------------------------- |
| Deploy (recommended)        | `pnpm deploy:heroku <app>`       |
| Build artifact only         | `pnpm deploy:build <app>`        |
| Deploy via `git subtree`    | `pnpm deploy:subtree <app>`      |
| Regenerate subtree lockfile | `pnpm deploy:lock <app>`         |

See [docs/deploying.md](docs/deploying.md) for how each method works, when to
use which, and the subtree lockfile requirement.

## Adding a new deployed app

1. Create `apps/<slug>/` with a `package.json` exposing `dev`, `build`, `start`.
2. Add an entry to `apps/directory/public/demos.json` so the directory site
   picks it up.
3. Create the Heroku app and record its name in `apps/<slug>/.heroku-app`.

See [docs/deploying.md](docs/deploying.md) for deploy details.
