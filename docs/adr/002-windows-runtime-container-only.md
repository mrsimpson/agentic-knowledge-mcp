# ADR-002: Windows Runtime — Container-Only (Docker/Podman), no native execution

**Date:** 2026-06-08  
**Status:** Accepted  
**Deciders:** Detlev Detleffsen  
**Technical Story:** Decide how the MCP server runs on Windows, and whether the native-Windows symlink fallback (`fix/windows-symlink-support`, commit `4ca5566`) is needed

---

## Context and Problem Statement

`local_folder` docsets are not copied into `.knowledge/`; they are exposed via **symlinks**. `createSymlinks` (`packages/core/src/paths/symlinks.ts`) links each top-level entry of the source folder into `.knowledge/docsets/{id}/`, and the searcher walks those links (see commit `147e18d`, which made `walkFiles` follow symlinks). The rest of the system depends on these being _live_ links:

- `refresh` skips `local_folder` sources entirely ("they are symlinked", `refresh.ts:174`).
- `removeSymlinks`/`cleanup` only remove entries where `entry.isSymbolicLink()` is true.

On **native Windows** this breaks down. `fs.symlink()` for a _file_ requires the `SeCreateSymbolicLinkPrivilege`, which by default only Administrators hold. Commit `4ca5566` worked around this with a platform branch: junctions for directories, **`copyFile` for files**. That copy fallback is a poor fit for the codebase:

1. **Stale snapshots** — a copied file is a point-in-time copy; edits to the source never appear (and `refresh` skips `local_folder`, so they never get refreshed).
2. **Leaks on cleanup** — `removeSymlinks` skips non-symlink entries, so copied files are never removed.
3. **Inconsistent semantics** — half the entries (dirs) are live junctions, the other half (files) are dead copies.

The upstream author wants the copy fallback removed. The alternative for native Windows — "Developer Mode + plain symlink" — restores live semantics but requires the user to **enable Windows Developer Mode** (a one-time action that itself needs admin rights and is frequently disabled by corporate group policy).

This raises the underlying question: **must the server run natively on Windows at all, or is a container the supported Windows runtime?**

---

## Decision Drivers

| #   | Criterion                                              | Weight | Rationale                                                                          |
| --- | ------------------------------------------------------ | :----: | ---------------------------------------------------------------------------------- |
| 1   | **Symlink correctness & consistency** (live, no stale) |   5    | The system assumes live links; stale copies + cleanup leaks are latent data bugs   |
| 2   | **Works on locked-down / corporate Windows**           |   5    | No admin, no group-policy assumptions; Developer Mode is often GPO-blocked         |
| 3   | **Implementation & maintenance burden**                |   4    | Platform-specific code paths are a recurring cost and a source of the bugs above   |
| 4   | **`local_folder` data-access correctness at runtime**  |   4    | The source folder must be reachable, with the right path, wherever the server runs |
| 5   | **Operational / setup complexity for the user**        |   3    | One-time enablement steps, volume layout, proxy config                             |
| 6   | **File-walk performance**                              |   2    | Search walks many small files; mount/filesystem choice affects latency             |

Total weight: **23**

---

## Considered Options

### Option A — Native Windows with junction/copy fallback (commit `4ca5566`)

Run the server natively (`node`/`npx`) on Windows. Directories are linked as junctions (no elevation needed); files are `copyFile`-d into the docset directory.

### Option B — Native Windows with Developer Mode + plain symlink

Run the server natively on Windows, but require the user to enable **Developer Mode**. Then `fs.symlink` works for both files and directories without elevation, so `createSymlinks` collapses back to a single plain `fs.symlink` for all platforms (current `main` behaviour).

### Option C — Container-only runtime (Docker/Podman), `.knowledge/` on a Linux-native volume

Do not support native-Windows execution. On Windows the server runs **exclusively inside the Docker/Podman image** (`feat(docker)`, commit `f06dc4a`). Inside the container `process.platform === "linux"`, so plain `fs.symlink` always applies — no junction, no copy, no Developer Mode. The writable cache (`.knowledge/`, where symlinks are created) lives on a Linux-native filesystem (a named volume or the WSL2 distro filesystem), never on a `C:\` bind mount.

---

## Decision Outcome

**Chosen option: Option C — Container-only runtime (Docker/Podman).**

Native-Windows execution is explicitly **out of scope**. Consequences for the code base:

- **Do not merge** `fix/windows-symlink-support` / commit `4ca5566`. `createSymlinks` stays as the plain `fs.symlink` on `main` (no `win32` branch, no junction, no copy).
- The Windows runtime is the container; the symlink mechanics are therefore always the Linux path.

### Rationale

Inside the container the entire Windows symlink-privilege problem **disappears** — there is no `SeCreateSymbolicLinkPrivilege`, no Developer Mode, no junction/copy special-casing. That gives the same _live_-symlink semantics the rest of the system already assumes (driver 1) and keeps a **single code path** (driver 3), eliminating the stale-copy and cleanup-leak bugs in one move.

Option B also restores live semantics and removes the platform branch, but it hard-depends on Developer Mode, which needs admin to enable and is commonly **disabled by group policy on managed corporate machines** (driver 2) — exactly the environment this is used in. Container-only avoids that dependency entirely. Podman (rootless) is an acceptable, corporate-friendly runtime alongside Docker Desktop.

The honest cost of Option C is **driver 4**: `local_folder` sources must now be made reachable _inside_ the container with a matching path, and the writable cache must sit on a Linux-native filesystem. These are operational requirements, captured below — not blockers.

### Positive Consequences

- Single, platform-agnostic symlink code path; the `win32` branch and its latent bugs are dropped.
- No admin rights, no Developer Mode, no group-policy dependency on Windows.
- Live symlink semantics everywhere → `refresh` and `cleanup` behave as designed.
- Works identically under Docker Desktop and Podman.

### Negative Consequences

- `local_folder` sources must be bind-mounted into the container and referenced by their **in-container** path (relative to the workspace mount), not a `C:\…` host path.
- The writable cache `.knowledge/` must live on a Linux-native filesystem (named volume or WSL2 fs). Putting it on a `C:\` bind mount makes symlink _creation_ fail or be unreliable (Docker Desktop / WSL2 mount drivers do not reliably support creating symlinks on Windows-backed mounts), and is slow for file walking.
- A container runtime must be installed and, on corporate networks, `init_docset`'s outbound git/https may need `HTTP_PROXY`/`HTTPS_PROXY`.
- No native-Windows fallback: if no container runtime is available, there is no supported Windows path (Linux/macOS native execution is unaffected).

---

## Pugh Matrix

**Scoring:** −1 = worse than baseline, 0 = same as baseline, +1 = better than baseline  
**Baseline:** Option A (native Windows, junction/copy fallback)

> Each score is multiplied by its criterion weight; column totals are weighted sums.

| Criterion                                | Weight | A (Baseline) | B (DevMode + symlink) | C (Container-only) |
| ---------------------------------------- | :----: | :----------: | --------------------- | ------------------ |
| Symlink correctness & consistency        |   5    |      0       | +1 × 5 = **+5**       | +1 × 5 = **+5**    |
| Works on locked-down / corporate Windows |   5    |      0       | −1 × 5 = **−5** ¹     | 0 × 5 = **0** ²    |
| Implementation & maintenance burden      |   4    |      0       | +1 × 4 = **+4**       | +1 × 4 = **+4** ³  |
| `local_folder` data-access correctness   |   4    |      0       | 0 × 4 = **0**         | −1 × 4 = **−4** ⁴  |
| Operational / setup complexity           |   3    |      0       | −1 × 3 = **−3** ⁵     | −1 × 3 = **−3** ⁶  |
| File-walk performance                    |   2    |      0       | 0 × 2 = **0**         | 0 × 2 = **0** ⁷    |
| **Weighted total**                       | **23** |    **0**     | **+1**                | **+2**             |

**Notes:**

¹ Developer Mode needs admin to enable and is frequently disabled by corporate group policy → may be impossible for the target user. Junction/copy (baseline) needs no admin, hence baseline scores higher here.  
² The container needs no symlink privilege at all; a runtime must be installed, but Podman runs rootless. Roughly parity with the no-admin baseline.  
³ No `win32` branch (plain `fs.symlink`); the only added artifact is documentation of the volume layout, not code.  
⁴ Sources must be mounted into the container with a matching path, and `.knowledge/` must be on a Linux-native fs — genuine extra moving parts vs. direct native file access.  
⁵ One-time Developer Mode enablement (admin, possibly policy-blocked).  
⁶ Install a container runtime; configure named volume + bind mount; pass proxy env on corporate networks.  
⁷ Placement-dependent: on a Linux-native volume, parity with native; on a `C:\` bind mount, worse — avoided by the volume-layout requirement.

Option C wins on the high-weight drivers (correctness, corporate-Windows viability, maintenance) at the cost of runtime data-access setup. The qualitative tiebreaker over B is **driver 2**: on a locked-down corporate machine, Developer Mode may simply not be available, whereas a container does not depend on it.

---

## Implementation Notes (volume layout on Windows)

1. **`.knowledge/` on a Linux-native filesystem** — use a Docker/Podman **named volume** for the workspace/cache, or keep the project inside the **WSL2 distro filesystem** (`\\wsl$\…`). Do _not_ place the writable `.knowledge/` on a `C:\` bind mount: symlink creation is unreliable and file walking is slow.
2. **`local_folder` sources** — bind-mount the source directory into the container and reference it by its in-container path (e.g. relative to the `/knowledge` workspace mount, the container `WORKDIR`) in `config.yaml`. A symlink _target_ may point into a read-only host bind mount (reading through it works); only symlink _creation_ must happen on the Linux-native fs.
3. **Podman specifics** — append `:Z`/`:z` to bind mounts on SELinux hosts; the mounted workspace must be writable by uid 1000 (`USER node`).
4. **Outbound network** — `init_docset` clones via git/https; on corporate networks pass `HTTP_PROXY`/`HTTPS_PROXY` (and any TLS settings) via `-e`.

---

## Links

- Commit `4ca5566` — `fix(core): support Windows symlinks via junction/copy fallback` (the rejected native-Windows fallback)
- Commit `147e18d` — `fix(search): follow symlinks when walking docset directories`
- Commit `f06dc4a` — `feat(docker): ship the MCP server as a Docker image`
- `docs/docker-deployment-design.md` — Docker deployment design
- [Windows: Enable your device for development (Developer Mode)](https://learn.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development)
- [Nygard ADR template](https://github.com/joelparkerhenderson/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md)
