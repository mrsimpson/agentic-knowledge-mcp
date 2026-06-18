# Docker Deployment

## Overview

The Docker image for `agentic-knowledge-mcp` is based on a volume-mount approach:
the MCP server runs inside the container, while the source data lives on the host and is bound in
via mounts. Docset initialization (symlinks + metadata) is handled by the entrypoint on first start.

## Why not initialize `local_folder` sources directly on a Windows host?

`local_folder` sources create symlinks under `.knowledge/docsets/{id}/`. On Windows, creating
symlinks requires elevated privileges (e.g. Developer Mode or an elevated shell), which makes
initialization on a Windows host impractical for reusable, versioned docsets.

Inside the container, Node.js runs on Linux/Alpine — there, regular `fs.symlink()` calls work
without elevated privileges. `init` is therefore executed **inside the container**, not on the
Windows host.

## Volume layout

```
docker run -i \
  -v <WORKSPACE>\.knowledge:/knowledge/.knowledge \
  -v <WORKSPACE>\my-docs:/knowledge/my-docs:ro \
  agentic-knowledge-mcp
```

| Mount | Purpose |
|---|---|
| `<WORKSPACE>\.knowledge` → `/knowledge/.knowledge` | `config.yaml` + persisted docsets (writable) |
| `<WORKSPACE>\my-docs` → `/knowledge/my-docs:ro` | Source files (docs, knowledge, tests) — read-only |

- Container WORKDIR: `/knowledge`
- Config discovery finds `/knowledge/.knowledge/config.yaml` (walk-up from CWD)
- Relative paths in `config.yaml` (e.g. `./my-docs`) resolve against `/knowledge`

> `<WORKSPACE>` is a placeholder for the root directory of your project; replace it with your own
> absolute path. `my-docs` is an example name for your source-data directory.

## Entrypoint logic

```
1. Check whether /knowledge/.knowledge/config.yaml exists
   → no: error message on stderr, exit 1

2. Extract docset IDs from config.yaml
   (grep/sed on lines of the form "- id:", CRLF stripped via `tr -d '\r'`)
   For each ID:
     node /app/packages/cli/dist/index.js init <id>
   - Idempotency is handled by the init command itself (skips already-initialized docsets)
   - All init output goes to stderr (1>&2 2>&1) so that stdout stays clean for the
     JSON-RPC stream
   - A failure of a single docset does not abort startup (|| true)

3. Start the MCP server (stdio):
   exec node /app/packages/mcp-server/dist/bin.js
```

The `init` command is idempotent: docsets that are already initialized (detected via
`.agentic-metadata.json`) are skipped. The entrypoint therefore calls `init` for all docsets on
every start — on the second container start this is effectively a no-op, because the metadata is
persisted in the writable `.knowledge` volume.

> Note: ID extraction is a simple grep/sed over lines of the form `- id:` and assumes that format
> in `config.yaml` (it is not a full YAML parser).

## Symlinks inside the container

- The container runs on Linux/Alpine → `fs.symlink()` works without elevated privileges ✅
- The Windows symlink-permission problem does not apply on Linux
- Symlinks point to mounted host paths, e.g. `/knowledge/my-docs/confluence/...`
- As long as the source volume is mounted, all symlinks are resolvable

## Files

| File | Purpose |
|---|---|
| `Dockerfile` ✅ | Multi-stage build: pnpm/turbo (build) → node:22-alpine (runtime) |
| `docker-entrypoint.sh` ✅ | Lazy init (see above) + MCP server start |
| `.dockerignore` ✅ | Excludes `node_modules`, `dist`, `.git`, `.turbo`, etc. |

### Dockerfile (structure)

**Stage 1 – build** (`node:22-alpine`):
- `corepack enable && corepack prepare pnpm@10.32.1 --activate`
- `pnpm install --frozen-lockfile` (incl. devDeps)
- `pnpm run build` (turbo builds all packages in parallel)

**Stage 2 – runtime** (`node:22-alpine`):
- `corepack enable && corepack prepare pnpm@10.32.1 --activate`
- `pnpm install --frozen-lockfile --prod --ignore-scripts`
- Copy the `dist/` directories of all packages from stage 1
- Unprivileged user `node`
- WORKDIR `/knowledge` (mount point)
- ENTRYPOINT `docker-entrypoint.sh`

## MCP configuration (example)

```json
{
  "mcpServers": {
    "knowledge": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "<WORKSPACE>\\.knowledge:/knowledge/.knowledge",
        "-v", "<WORKSPACE>\\my-docs:/knowledge/my-docs:ro",
        "agentic-knowledge-mcp"
      ]
    }
  }
}
```

## Open points

- CI/CD pipeline (GitHub Actions) for automated image builds: TBD
- Image registry and versioning strategy (`:latest` vs. `:2.2.0`): TBD
- Behavior on `init` failure in the entrypoint: **resolved** — single docset failures are
  tolerated (`|| true`) and the server still starts. It remains open whether a failed docset
  should be signaled more strongly (e.g. exit code / healthcheck): TBD
