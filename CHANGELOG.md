# Changelog

All notable changes to Pedigree Workbench are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-08

### Added
- Tauri-based offline desktop shell (Windows MSI/NSIS via GitHub Actions).
- IndexedDB-backed pedigree store with first-run seeding.
- localStorage-backed UI preferences (language, last selected node, navigation).
- JSON paste-import flow with Zod validation, 5 MB size guard, and inline error reporting.
- React `ErrorBoundary` plus global `error` / `unhandledrejection` handlers wired to a structured JSON logger.
- Vitest unit + integration suites covering store, settings, import, layout, and the import-to-canvas flow.

### Changed
- Refactored monolithic UI into a layered architecture: `components` → `hooks` → `services` → `types`.
- Replaced ad-hoc `t: any` props with the strongly typed `Translation` contract.
- Extracted pedigree layout math into a pure, unit-tested `pedigree-layout` module.
- TypeScript compiler options upgraded to `strict` plus `noUncheckedIndexedAccess`.

### Removed
- Unused runtime dependencies: `@google/genai`, `express`, `dotenv`, `@types/express`, `tsx`.
- AI Studio Gemini integration scaffolding and hard-coded `MOCK_INDIVIDUALS` import path.

[1.0.0]: https://github.com/ReliOptic/Pedigree_workbench/releases/tag/v1.0.0
