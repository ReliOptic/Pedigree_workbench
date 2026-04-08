# Pedigree Workbench

A professional pedigree analysis workbench for visualizing family lineages and
genetic data. Distributed as a fully offline desktop application — no network
calls, no telemetry, no API keys.

## Features
- Interactive pan/zoom pedigree canvas with generation lanes and connector lines
- Persistent IndexedDB store seeded on first launch
- JSON paste-import with Zod schema validation and 5 MB size guard
- Inspector panel for clinical, genetic, and phenotype attributes
- English / Korean UI (extensible via `src/types/translation.types.ts`)
- Layered architecture: `components` → `hooks` → `services` → `types`
- React `ErrorBoundary` plus structured JSON logging on every side effect

## Architecture
```
src/
  components/   # Presentation only — pure props in, JSX out
  hooks/        # use-pedigree, use-settings (binds React to services)
  services/     # pedigree-store (IndexedDB), settings-store (localStorage),
                # pedigree-import (Zod), pedigree-layout (pure layout math),
                # logger (structured JSON)
  types/        # pedigree, translation, error contracts
  config/       # build-time configuration
  ui/           # error boundary
src-tauri/      # Tauri desktop shell (Rust)
tests/
  unit/         # vitest + fake-indexeddb
  integration/  # @testing-library/react end-to-end import flow
```

## Prerequisites

### Development
| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| npm | ≥ 10 |

### Desktop build (Tauri)
| Tool | Notes |
|---|---|
| Rust stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Windows: WebView2 + MSVC build tools | Bundled by `npm run tauri:build` on Windows |
| macOS: Xcode Command Line Tools | `xcode-select --install` |
| Linux: webkit2gtk + build essentials | See https://tauri.app/start/prerequisites |

## Environment variables
The desktop bundle is fully offline and requires **no runtime secrets**.

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_APP_VERSION` | Build time, optional | Override the version string surfaced by `src/config/index.ts`. |
| `DISABLE_HMR` | Dev server, optional | Set to `true` to disable Vite HMR (used by headless agent harnesses). |

## Local development
```sh
npm install
npm run dev          # http://localhost:3000
npm run lint         # tsc --noEmit
npm run test         # vitest run
npm run build        # static dist/
npm run tauri:dev    # native desktop window
```

## Production builds
```sh
npm run tauri:build  # native installer for the host OS
```
Artifacts land under `src-tauri/target/release/bundle/`.

## Windows release pipeline
The Windows installer is built by GitHub Actions, not from the developer
workstation. The workflow lives at `.github/workflows/release.yml` and triggers
on tag push or manual dispatch.

To cut a Windows release:
```sh
git tag v1.0.0
git push origin v1.0.0
```
The job runs lint, tests, and `tauri build --target x86_64-pc-windows-msvc`,
then publishes the resulting `.msi` and NSIS `.exe` to a GitHub Release.

## Data import format
Pedigrees are imported via the **Upload** modal as JSON. Both shapes are
accepted:
```json
[
  { "id": "S-001", "label": "01", "gender": "male",   "generation": 1 },
  { "id": "D-001", "label": "02", "gender": "female", "generation": 1 },
  { "id": "C-001", "label": "03", "gender": "male",   "generation": 2,
    "sireId": "S-001", "damId": "D-001" }
]
```
or:
```json
{ "individuals": [ /* same shape */ ] }
```
The full schema is defined in `src/services/pedigree-import.ts`. Imports
replace the entire dataset inside a single IndexedDB transaction; partial
writes are not possible.

## Testing
- `npm run test` — runs the full vitest suite (unit + integration)
- `npm run test:watch` — watch mode
- Integration tests use a Map-backed `localStorage` shim and `fake-indexeddb`,
  configured in `tests/setup.ts`

## License
Proprietary — © 2026 ReliOptic.
