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

| Mount                                              | Purpose                                           |
| -------------------------------------------------- | ------------------------------------------------- |
| `<WORKSPACE>\.knowledge` → `/knowledge/.knowledge` | `config.yaml` + persisted docsets (writable)      |
| `<WORKSPACE>\my-docs` → `/knowledge/my-docs:ro`    | Source files (docs, knowledge, tests) — read-only |

- Container WORKDIR: `/knowledge`
- Config discovery finds `/knowledge/.knowledge/config.yaml` (walk-up from CWD)
- Relative paths in `config.yaml` (e.g. `./my-docs`) resolve against `/knowledge`

> `<WORKSPACE>` is a placeholder for the root directory of your project; replace it with your own
> absolute path. `my-docs` is an example name for your source-data directory.

## Entrypoint logic

```
1. Check whether /knowledge/.knowledge/config.yaml exists
   → no: error message on stderr, exit 1

2. Run `init-all` — a CLI subcommand that:
   a. Loads config.yaml using js-yaml (proper YAML parsing)
   b. Validates that all docsets use `local_folder` sources (ADR-003)
      → rejects `git_repo`/`archive` with a clear error and exits 1
   c. Initializes each docset (idempotent: skips already-initialized ones)
   d. Fails fast on any error (set -e in entrypoint)

3. Start the MCP server (stdio):
   exec node /app/packages/mcp-server/dist/bin.js
```

The `init-all` command is idempotent: docsets that are already initialized (detected via
`.agentic-metadata.json`) are skipped. The entrypoint therefore calls `init-all` on every
container start — on the second start this is effectively a no-op, because the metadata is
persisted in the writable `.knowledge` volume.

## Source type support (ADR-003)

The container image only supports `local_folder` docsets. If a `git_repo` or `archive` source
is detected in `config.yaml`, `init-all` exits with code 1 and a clear error message pointing
the user to materialize the docset on the host first.

`git_repo` and `archive` loaders remain fully available in the npm package / CLI for host-side
use — no product API change.

## Symlinks inside the container

- The container runs on Linux/Alpine → `fs.symlink()` works without elevated privileges ✅
- The Windows symlink-permission problem does not apply on Linux
- Symlinks point to mounted host paths, e.g. `/knowledge/my-docs/confluence/...`
- As long as the source volume is mounted, all symlinks are resolvable

## Files

| File                      | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `Dockerfile` ✅           | Multi-stage build: pnpm/turbo (build) → node:22-alpine (runtime) |
| `docker-entrypoint.sh` ✅ | Lazy init (see above) + MCP server start                         |
| `.dockerignore` ✅        | Excludes `node_modules`, `dist`, `.git`, `.turbo`, etc.          |

### Dockerfile (structure)

**Stage 1 – build** (`node:22-alpine`):

- `corepack enable && corepack prepare pnpm@10.32.1 --activate`
- `pnpm install --frozen-lockfile` (incl. devDeps)
- `pnpm run build` (turbo builds all packages in parallel)

**Stage 2 – runtime** (`node:22-alpine`):

- `corepack enable && corepack prepare pnpm@10.32.1 --activate`
- `pnpm install --frozen-lockfile --production --ignore-scripts`
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
        "run",
        "--rm",
        "-i",
        "-v",
        "<WORKSPACE>\\.knowledge:/knowledge/.knowledge",
        "-v",
        "<WORKSPACE>\\my-docs:/knowledge/my-docs:ro",
        "agentic-knowledge-mcp"
      ]
    }
  }
}
```

## Open points

- CI/CD pipeline (GitHub Actions) for automated image builds: TBD
- Image registry and versioning strategy (`:latest` vs. `:2.3.0`): TBD
- Wrapper script to auto-extract `local_folder` paths from `config.yaml` and
  generate `docker run` volume mounts: [issue #53](https://github.com/mrsimpson/agentic-knowledge-mcp/issues/53)
