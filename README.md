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

## Adding a new deployed app

1. Create `apps/<slug>/` with a `package.json` exposing `dev`, `build`, `start`.
2. Add an entry to `apps/directory/public/demos.json` so the directory site
   picks it up.
3. Wire up a Heroku app pointing at that subdirectory (handled outside this repo).
