# Docker Deployment

> ⚠️ **Scope (ADR-003): the image serves only pre-materialized `local_folder` docsets.**
> The container is a **"mount & serve"** runtime — it creates Linux symlinks for bind-mounted
> folders and searches them. It does **not** fetch or extract docsets at startup: `git_repo` and
> `archive` sources are **rejected** by the entrypoint (clear error, exit 1). Materialize those on
> the **host** (clone/unzip) and mount the result as `local_folder`. The `git_repo`/`archive`
> loaders stay available in the npm package / CLI. Consequence: the runtime image ships **without
> `git`** and needs **no network at startup**. See **ADR-003** and **ADR-002**.

## Overview

The Docker image for `agentic-knowledge-mcp` uses a volume-mount approach: the MCP server runs
inside the container, while the (already materialized) source data lives on the host and is bound in
via mounts. On first start the entrypoint initializes each configured **`local_folder`** docset —
i.e. it creates the symlinks + metadata under `.knowledge/`. Per **ADR-003** that is the only
supported source type inside the image (see the scope note above).

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

### Write permissions on the `.knowledge` volume (uid 1000)

The container runs as the unprivileged `node` user (**uid 1000**, see `Dockerfile`). The writable
`.knowledge` mount — where the config lives and where `init_docset` creates docset directories and
symlinks — must therefore be **writable by uid 1000**. Common pitfalls:

- **Host bind mount owned by another uid** → `init-all` fails with `EACCES` and (being fail-fast)
  the container does not start. Fix: `chown -R 1000:1000 <WORKSPACE>/.knowledge` on the host, or
  use a **named volume** (Docker/Podman initializes its ownership from the image, so uid 1000 can
  write).
- **Podman (rootless)** maps container uid 1000 to a subordinate host uid; a host-owned bind mount
  is typically not writable. Prefer a named volume, or run with `--userns=keep-id`.
- **SELinux hosts** → append `:Z` (private) or `:z` (shared) to the bind mount so the volume is
  relabeled, e.g. `-v <WORKSPACE>/.knowledge:/knowledge/.knowledge:Z`.

> On Windows the writable `.knowledge` cache must additionally sit on a **Linux-native filesystem**
> (named volume or WSL2 distro fs), never a `C:\` bind mount — symlink _creation_ is unreliable
> there. See **ADR-002**.

## Entrypoint logic

`docker-entrypoint.sh` is a two-liner under `set -e`:

```sh
#!/bin/sh
set -e
node /app/packages/cli/dist/index.js init-all   # 1. initialize all configured docsets
exec node /app/packages/mcp-server/dist/bin.js   # 2. hand over to the MCP server (stdio)
```

1. **`init-all`** (CLI subcommand, `packages/cli/src/commands/init-all.ts`) loads the config via
   the `ConfigManager` (a real YAML parser; config discovery walks up from the working directory
   `/knowledge` to find `/knowledge/.knowledge/config.yaml`), then calls `initDocset` for every
   configured docset.
   - **Idempotent**: docsets already initialized (detected via `.agentic-metadata.json`) are
     skipped. The metadata persists in the writable `.knowledge` volume, so on the second container
     start `init-all` is effectively a no-op.
   - **R1-clean**: all progress and error output goes to **stderr** (`process.stderr.write`), so
     stdout stays free for the JSON-RPC stream.
   - **`local_folder` only (ADR-003)**: before initializing anything, `init-all` scans every
     docset's `sources[]`. If any source is `git_repo` or `archive`, it writes a clear error to
     stderr (naming the docset and the offending type) and exits 1 — the server does **not** start.
     Materialize such sources on the host and mount them as `local_folder` (see the scope note at the
     top).
   - **No docsets configured** → a message on stderr and exit 0; the server still starts.

2. **`exec`** replaces the shell with the MCP server process, so signals (SIGTERM/SIGINT) reach the
   server directly.

> Replaced the earlier `grep`/`sed` ID extraction (with manual CRLF stripping) with the `init-all`
> subcommand — config parsing now goes through the same YAML parser as the rest of the system, so
> the CRLF/format assumptions no longer apply.

### Startup failure behaviour (fail-fast)

`init-all` is **fail-fast**: if loading the config fails, or if **any** docset fails to initialize,
it exits non-zero (`process.exit(1)`). Because the entrypoint runs under `set -e`, a non-zero
`init-all` aborts the script **before** the server starts — the container does not come up.

This is a deliberate choice: a failed docset at startup is an _infrastructure/input_ problem
(unreachable git remote, bad URL, missing source mount, proxy required), and surfacing it loudly at
container start is preferable to silently serving a half-initialized server whose `search_docs`
returns incomplete results. The cost is that one bad docset blocks startup for all of them.

> Trade-off note: an earlier draft tolerated single-docset failures (`|| true`) and started the
> server anyway. The current behaviour is the opposite. If partial startup becomes desirable (e.g.
> many independent docsets where one bad source should not take the server down), change `init-all`
> to log per-docset failures and continue, and decide separately whether the process should still
> exit non-zero. See **Open points**.

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

- Supported source types in the image: **decided — `local_folder` only** (ADR-003). `git_repo`/
  `archive` are rejected by the entrypoint; the runtime image ships without `git`. Host-side use of
  those loaders via the CLI is unaffected.
- CI/CD pipeline (GitHub Actions) for automated image builds: TBD
- Image registry and versioning strategy (`:latest` vs. `:2.2.0`): TBD
- Startup behaviour on docset-init failure: **decided — fail-fast** (see _Startup failure
  behaviour_ above). The container does not start if any docset fails to initialize. Whether a
  partial-startup mode (tolerate single failures, still serve the rest) should be offered as an
  opt-in remains open: TBD.
