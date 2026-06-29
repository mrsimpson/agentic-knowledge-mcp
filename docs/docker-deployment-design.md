# Design: Docker-Auslieferung für agentic-knowledge-mcp

> Status: **Draft** · 2026-06-05 · committed for review — finale Form noch mit dem Tool-Autor
> abzustimmen (s. ADR-003)
> Referenz-Setup: `bruno-mcp` (funktionierendes Multi-Stage-Alpine-Image)
>
> **Scope-Update (ADR-003):** Das Image bedient ausschließlich **vor-materialisierte
> `local_folder`-Docsets** ("mount & serve"). `git_repo`/`archive` werden vom Entrypoint
> abgelehnt und auf dem **Host** materialisiert (bleiben im npm-Paket/CLI verfügbar). Folge:
> **kein `git` im Runtime-Image**, kein Netz beim Start. Die git/archive-bezogenen Passagen unten
> beschreiben das Paket-/Host-Verhalten, **nicht** das Image.

## 1. Ziel & Scope

Den MCP-Server `@codemcp/knowledge` (Paket `@codemcp/knowledge-server`) als
eigenständiges Docker-Image ausliefern, das über **stdio** (JSON-RPC) von einem
MCP-Client (`docker run -i`) angesprochen wird.

**In Scope (dieser Schritt):**

- Multi-Stage-Dockerfile (Build mit pnpm/turbo → schlankes Runtime-Image).
- `.dockerignore`.
- Lokaler Build + Smoke-Test über stdio (`initialize` / `tools/list`).
- `mcp.json`-Beispiel + README-Abschnitt.

**Out of Scope (später):**

- Registry-Push (GHCR/Docker Hub), CI-Workflow, Versions-Tags/OCI-Labels in CI.
- Voll vorinitialisierte Docset-Images ("baked-in").

## 2. Datenmodell-Entscheidung: Laufzeit-Init + beschreibbares Volume

Gewählt: **generisches Image, Docsets werden zur Laufzeit geladen.** Begründung
ergibt sich aus dem Laufzeitverhalten des Servers:

| Verhalten                                                                                                             | Quelle                                       | Konsequenz fürs Image                                                                      |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Config-Discovery läuft per **cwd-Aufwärtssuche** nach `.knowledge/config.yaml`                                        | `core/config/discovery.ts`                   | Container-`WORKDIR` = Mount-Punkt; Nutzer mountet sein Projekt dorthin                     |
| `init_docset` nutzt `process.cwd()`; Docsets landen relativ zur Config (`projectRoot = dirname(dirname(configPath))`) | `mcp-server/server.ts`, `git-repo-loader.ts` | Volume muss **read-write** sein und persistieren                                           |
| Git-Clone/`ls-remote` via `execSync("git …")`; Temp unter `cwd/.tmp`                                                  | `content-loader/git-repo-loader.ts`          | nur **Host/Paket** — im Image **nicht** unterstützt (ADR-003); kein `git` im Runtime-Image |
| Archive: `tar` (gebündelt) + `adm-zip` (external)                                                                     | `archive-loader.ts`                          | s. Dependency-Analyse                                                                      |

→ Das Image bleibt **domänen-agnostisch**: keine Collection-/Docset-Namen, keine
Config eingebacken. Genau wie heute via `npx`, nur mit gebündeltem Node (ohne `git` —
Image bedient nur `local_folder`, ADR-003).

## 3. Dependency-Analyse (entscheidet die Runtime-Schlankheit)

`packages/mcp-server/tsup.config.ts`:

```ts
bundle: true,
external:   ["@modelcontextprotocol/sdk", "adm-zip"],
noExternal: ["@codemcp/knowledge-core", "@codemcp/knowledge-content-loader"],
```

`bundle: true` + `noExternal` → `core` und `content-loader` (und transitiv ihre
nicht-externalisierten Deps: `js-yaml`, `minisearch`, `tar`, `simple-git`) werden
**in `dist/bin.js` gebündelt**. Die **einzigen** echten Laufzeit-`node_modules`
sind die beiden Externals:

- `@modelcontextprotocol/sdk`
- `adm-zip`

Bestätigung über das npm-Distributionsmodell: das publizierte Paket liefert nur
`packages/*/dist` + die Sub-Paket-Deps (sdk, adm-zip, commander) — alles andere
steckt im Bundle. Damit ist die Runtime sehr klein.

**`git`-CLI-Binary:** `content-loader` clont per `execSync("git …")` — aber nur für
`git_repo`-Quellen. Per **ADR-003** unterstützt das Image diese nicht (sie werden auf dem Host
materialisiert), daher **kein `apk add git`** im Runtime-Image. Das `git`-Binary ist nur für die
Host-/Paket-Nutzung der CLI relevant.

## 4. Build-Architektur (Multi-Stage)

Die konkrete Stage-Struktur des `Dockerfile` (Build → Runtime, kopierte `dist/`,
ENTRYPOINT) steht in **`docs/docker.md`** → _Dockerfile (structure)_ und wird hier
nicht dupliziert. Dieser Abschnitt hält nur die **Begründungen** fest.

Designentscheidungen:

- **Basis `node:22-alpine`** — gespiegelt vom funktionierenden bruno-mcp-Setup
  (Projekt verlangt `node >= 20`).
- **`corepack`** aktiviert exakt `pnpm@10.32.1` (aus `packageManager`-Feld).
- **`HUSKY=0`** beim Install — `prepare: husky` würde sonst ohne `.git` brechen.
  **Kein** `--ignore-scripts` (esbuild/tsup brauchen ihren Postinstall).
- **Runtime-`node_modules`**: ursprünglich war `pnpm deploy --prod` vorgesehen
  (flacht symlink-basierte node_modules zu einem prod-only Verzeichnis).
  **Umgesetzt wurde der dokumentierte Fallback**: im Runtime-Stage erneut
  `pnpm install --frozen-lockfile --prod --ignore-scripts` über die kopierten
  `package.json` + Lockfile, dann die gebauten `packages/*/dist` aus dem
  Build-Stage kopieren. Die CLI/Server-Bundles ziehen `core`/`content-loader`
  ohnehin per tsup `noExternal` ein; echte Runtime-Externals sind nur
  sdk/adm-zip/commander.
- **Entrypoint statt direktem `node bin.js`**: `docker-entrypoint.sh` ruft erst
  `init-all` (Laufzeit-Init aller Docsets, idempotent, fail-fast unter `set -e`),
  dann `exec node …/bin.js`. Details in `docs/docker.md`.
- **`WORKDIR /knowledge`** statt `/etc/bruno` — read-**write** Mount, weil
  Docsets geschrieben/gecacht werden (anders als bruno: read-only).
- **`USER node` (uid 1000)** — gemountetes Volume muss für uid 1000 schreibbar
  sein (in Doku vermerken).

## 5. Netzwerk

Per **ADR-003** lädt das Image beim Start nichts nach (`local_folder`-only,
mount & serve) → es benötigt **kein Netzwerk beim Start**. Anders als bruno-mcp
(brauchte `--network host`, um eine lokale API zu erreichen) ist hier weder
Host-Networking noch Egress nötig.

Das Klonen öffentlicher Git-Repos (`execSync("git …")`) braucht Standard-Egress —
das passiert aber **auf dem Host** über die CLI/das npm-Paket, nicht im Image.

## 6. Nutzung (Soll)

Design-relevante Eigenschaft: unter dem (beschreibbaren) `.knowledge`-Mount liegt
`config.yaml`; Config-Discovery läuft aufwärts ab `WORKDIR /knowledge`, und
`init_docset` lädt Docsets in dasselbe persistente Volume.

Das konkrete `mcp.json`-Beispiel, Volume-Layout und die Schreibrechte-Details
(uid 1000) stehen in **`docs/docker.md`** (operative Referenz) — hier nicht
dupliziert.

## 7. R1 — stdout-Hygiene (übernommen)

Der MCP-Kanal _ist_ stdout. Server loggt bereits ausschließlich nach stderr
(`console.error`, s. `server.ts` / `bin.ts`). Git-`execSync` läuft mit
`stdio: "pipe"` → kein Fremd-Output auf stdout. Keine Code-Änderung nötig.

## 8. Akzeptanzkriterien (lokaler Schritt)

1. `docker build` erzeugt das Image ohne Fehler.
2. `initialize` + `tools/list` über `docker run -i` liefern valide JSON-RPC-
   Antworten; `tools/list` zeigt `search_docs`, `list_docsets`, `init_docset`.
3. Bei gemountetem Volume mit `.knowledge/config.yaml` erscheinen die
   konfigurierten Docsets in der Tool-Beschreibung.
4. Der Entrypoint (`init-all`) initialisiert die konfigurierten
   **`local_folder`**-Docsets (Symlinks + Metadata unter `.knowledge/`) und lehnt
   `git_repo`/`archive`-Quellen mit klarer Fehlermeldung ab (ADR-003).

> Git-/Archive-Materialisierung wird **auf dem Host** über die CLI getestet, nicht
> über das Image.

## 9. Risiken / offene Punkte

- `pnpm deploy`-Variabilität → **erledigt**: stattdessen Fallback (Runtime-`pnpm
install --prod` + `dist`-Copy) umgesetzt.
- Volume-Schreibrechte für uid 1000 (Host-Ownership) — typische Docker-Stolperfalle;
  dokumentiert in `docs/docker.md`.
- `tar`/`adm-zip` im Bundle vs. external: adm-zip bewusst external (CommonJS) —
  muss in Runtime-node_modules vorhanden sein (durch den prod-`pnpm install` abgedeckt).
- **`git`-Binary im Runtime-Image** — **erledigt durch ADR-003**: das Image bedient nur
  `local_folder`, `git_repo`/`archive` werden vom Entrypoint abgelehnt → bewusst **kein** `git`
  im Runtime-Image. Materialisierung von git/archive passiert auf dem Host (CLI/Paket).

```

```
