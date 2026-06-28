# ADR-003: Container image serves only pre-materialized `local_folder` docsets

**Date:** 2026-06-28  
**Status:** Accepted  
**Deciders:** Detlev Detleffsen  
**Technical Story:** Decide which docset source types the **Docker/Podman image** initializes at
container start, after observing that `git_repo`/`archive` auto-init pulls a chain of runtime
dependencies (git binary, boot-time network/proxy, writable `/knowledge/.tmp`) into the image.

---

## Context and Problem Statement

A docset source (`DocsetConfig.sources[]`, `packages/core/src/types.ts`) is one of three types:

| Type           | What init does                                                  | Lands in `.knowledge` as | Runtime needs                                          |
| -------------- | --------------------------------------------------------------- | ------------------------ | ------------------------------------------------------ |
| `local_folder` | `createSymlinks` links a mounted folder                         | **live symlinks**        | nothing                                                |
| `archive`      | download/read + extract into a scratch dir, copy filtered files | **materialized copy**    | network (remote) + writable `cwd/.tmp`                 |
| `git_repo`     | `git ls-remote` + `git clone` (`execSync`)                      | **materialized copy**    | **`git` binary** + network/proxy + writable `cwd/.tmp` |

The container's `docker-entrypoint.sh` runs `init-all` at startup, which initializes **every**
configured docset. For `git_repo`/`archive` that means the container performs, **at boot**, the same
materialization a user could do once on the host:

- **`git` binary** must be baked into the image (it is not — see the original B1 finding; `node:22-alpine` has no git).
- **Network egress / `HTTP(S)_PROXY`** must be reachable _at container start_, not just on demand.
- A **writable `cwd/.tmp`** (`/knowledge/.tmp`, created by `ArchiveLoader`/`GitRepoLoader`) is
  required, but `/knowledge` is the image-owned `WORKDIR` (root, mode 755); under `USER node`
  (uid 1000) the writable mount only sits one level down at `/knowledge/.knowledge` → `EACCES` risk.
- `init-all` is **fail-fast** under `set -e`: one unreachable remote blocks startup for all docsets.

Crucially, this contradicts the container's _raison d'être_: **ADR-002** chose container-only Windows
runtime **solely** to get Linux `fs.symlink` semantics — i.e. the `local_folder` path. `git_repo`
and `archive` produce a plain copy that needs none of the container's symlink machinery; they can be
materialized on any host, before the container ever runs.

The question: **should the image materialize `git_repo`/`archive` at boot, or should it be a pure
"mount pre-materialized docsets and serve" runtime?**

---

## Decision Drivers

| #   | Criterion                                                   | Weight | Rationale                                                                 |
| --- | ----------------------------------------------------------- | :----: | ------------------------------------------------------------------------- |
| 1   | **Startup robustness on locked-down / corporate hosts**     |   5    | No git, no boot-time network/proxy, no `/knowledge/.tmp` write dependency |
| 2   | **Startup predictability & honesty**                        |   5    | No silent incompleteness, no cryptic mid-boot failure; deterministic      |
| 3   | **Image simplicity & attack surface**                       |   3    | No `git` binary, smaller image, fewer CVEs                                |
| 4   | **Consistency with the container's purpose (ADR-002)**      |   4    | The container exists for Linux symlink semantics = `local_folder`         |
| 5   | **Self-describing reproducibility** (config alone → docset) |   4    | What we give up: `git_repo` config + URL reproduces a docset anywhere     |

Total weight: **21**

---

## Considered Options

### Option A — Image supports all three source types (status-quo intent)

`init-all` materializes `git_repo`/`archive` at boot. Requires `apk add git`, boot-time network/proxy,
and a writable scratch dir. The baseline.

### Option B — Image = `local_folder` only; entrypoint **rejects** `git_repo`/`archive` (variant a)

Docsets must be **pre-materialized** (cloned/extracted on the host, by hand or a host-side script)
and bind-mounted, then configured as `local_folder`. If a `git_repo`/`archive` source is present in
`config.yaml`, `init-all` exits non-zero with a clear, actionable message and the server does not
start. The `git_repo`/`archive` loaders remain fully available in the **npm package / CLI** for
host-side use — no product/API change.

### Option C — Image = `local_folder` default; **tolerate** `git_repo`/`archive` by skipping with a warning (variant b)

Same as B, but instead of failing, `init-all` skips non-`local_folder` sources with a stderr warning
and still starts the server with whatever `local_folder` docsets initialized.

---

## Decision Outcome

**Chosen option: Option B — `local_folder`-only image, entrypoint rejects `git_repo`/`archive`.**

The container becomes a pure **"mount pre-materialized docsets and serve"** runtime. Consequences:

- The runtime image needs **no `git`** and does **no network fetch at startup** — the original B1
  gap (missing `apk add git`) is resolved _by scope_, not by adding git.
- `init-all` gains a guard: it inspects every docset's `sources[]`; if any is `git_repo` or
  `archive`, it writes a clear error to **stderr** (R1) and `process.exit(1)` **before** initializing
  anything, so the failure is deterministic and explained.
- `git_repo`/`archive` stay in the npm package/CLI (`init_docset`, `ade-knowledge init`), so users
  who want self-describing fetch keep it on the host — no capability is removed from the product.

### Rationale

Option B aligns the image with exactly the reason the container exists (ADR-002, driver 4) and strips
the boot-time fragility — git binary, network/proxy, `/knowledge/.tmp` writability, fail-fast on a
remote (drivers 1–3). The honest cost is **driver 5**: a `local_folder` docset is not self-describing,
so the materialized data must be provided/mounted alongside `config.yaml`. For the corporate,
mount-and-serve deployment this ADR targets, that is an accepted trade.

B beats C on **driver 2**: C would start the server with silently incomplete docsets (a `search_docs`
that quietly misses content), whereas B fails loudly and tells the operator what to fix — consistent
with the project's fail-fast startup stance and the R2 "infra/input error ≠ silent result" spirit.

### Positive Consequences

- No `git` in the image; no boot-time network/proxy dependency; smaller attack surface.
- Deterministic startup: the only init work is creating Linux symlinks for mounted folders.
- The `/knowledge/.tmp` uid-1000 writability question disappears (no extraction/clone at runtime).
- Single, clear image contract that matches ADR-002.

### Negative Consequences

- `local_folder` docsets are **not self-describing**: the materialized source must be produced on
  the host and bind-mounted; `config.yaml` alone is not enough to reproduce a docset.
- Users who relied on the container cloning a `git_repo` must move that step to the host (one-time
  `git clone`/unzip, or a small host-side prep script), then mount the result.
- A misconfigured docset (`git_repo`/`archive`) fails the whole container start (by design).

---

## Pugh Matrix

**Scoring:** −1 = worse than baseline, 0 = same, +1 = better.  
**Baseline:** Option A (image supports all three types).

| Criterion                                    | Weight | A (Baseline) | B (reject, variant a) | C (skip, variant b) |
| -------------------------------------------- | :----: | :----------: | --------------------- | ------------------- |
| Startup robustness (corporate/locked-down)   |   5    |      0       | +1 × 5 = **+5**       | +1 × 5 = **+5**     |
| Startup predictability & honesty             |   5    |      0       | +1 × 5 = **+5**       | 0 × 5 = **0** ¹     |
| Image simplicity & attack surface            |   3    |      0       | +1 × 3 = **+3**       | +1 × 3 = **+3**     |
| Consistency with container purpose (ADR-002) |   4    |      0       | +1 × 4 = **+4**       | +1 × 4 = **+4**     |
| Self-describing reproducibility              |   4    |      0       | −1 × 4 = **−4** ²     | −1 × 4 = **−4** ²   |
| **Weighted total**                           | **21** |    **0**     | **+13**               | **+8**              |

**Notes:**

¹ Skipping silently starts a server whose docsets are incomplete; `search_docs` returns partial
results with no signal → not an improvement in predictability over the baseline.  
² Both B and C drop the config-only-reproduces-a-docset property that `git_repo` gives; the
materialized data must be mounted.

Option B wins; the qualitative tiebreaker over C is **driver 2** — fail loud and actionable beats
serve-silently-incomplete.

---

## Implementation Notes

1. **Entrypoint guard** — `packages/cli/src/commands/init-all.ts` checks each docset's `sources[]`
   before initializing. On any `git_repo`/`archive` source: one stderr line naming the docset and the
   offending type, a pointer to mount it as `local_folder`, then `process.exit(1)`.
2. **No `git` in the image** — the runtime `Dockerfile` stage deliberately omits `apk add git`.
3. **Docs** — `docs/docker.md` states the contract (materialize on host → mount RO → configure as
   `local_folder`); `docs/docker-deployment-design.md` scope narrowed accordingly; CLAUDE.md drops
   the "runtime + git" note.
4. **Package unchanged** — `git_repo`/`archive` loaders remain in `content-loader` and the CLI for
   host-side materialization; this ADR constrains only the _container image_ contract.

---

## Links

- **ADR-002** — Windows runtime container-only (the symlink-semantics rationale this ADR builds on)
- `docs/docker.md` — container delivery (operational reference)
- `docs/docker-deployment-design.md` — Docker deployment design
- `packages/content-loader/src/content/git-repo-loader.ts`, `archive-loader.ts` — the loaders kept in the package
- [Nygard ADR template](https://github.com/joelparkerhenderson/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md)
