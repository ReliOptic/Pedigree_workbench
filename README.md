# Pedigree Workbench

[![GitHub Repo](https://img.shields.io/badge/GitHub-ReliOptic%2FPedigree__workbench-181717?logo=github)](https://github.com/ReliOptic/Pedigree_workbench)
![Desktop](https://img.shields.io/badge/Desktop-Tauri%202-24C8DB)
![Docs](https://img.shields.io/badge/Docs-English--first-1F6FEB)

[English](README.md) | [한국어](README.ko.md)

Offline desktop workbench for pedigree and lineage analysis. The product is aimed at breeding, livestock, and genetics workflows where users need to inspect relationships visually, import structured records quickly, and keep sensitive data on their own machine.

<p align="center">
  <img src="src-tauri/icons/icon.png" alt="Pedigree Workbench icon" width="120">
</p>

> Local pedigree analysis environment  
> Designed for breeding operations, genetics teams, and lineage-heavy research workflows

English is the canonical documentation language for this repository.

Links: [Repository](https://github.com/ReliOptic/Pedigree_workbench) · [Product Philosophy](PRODUCT_PHILOSOPHY.md) · [UX Roadmap](UX_ROADMAP.md) · [Changelog](CHANGELOG.md)

| Platform | Support | Notes |
|---|---|---|
| Browser dev mode | Ready | Fast iteration with Vite |
| Windows desktop build | Ready | Tauri packaging supported |
| macOS and Linux builds | Supported | Additional system prerequisites required |

## Customer Value

- Visualize lineage networks without relying on a cloud platform
- Edit pedigree data directly on an interactive canvas
- Import JSON, CSV, and TSV records with validation safeguards
- Attach sequence data and run structure-oriented analysis workflows

## Product Highlights

- Pan and zoom pedigree canvas with generation-aware layout
- Add, edit, and remove individuals with undo and redo support
- Import pipeline with column mapping, validation, and template download
- Mermaid-based paper view for publication-oriented exports
- DNA sequence capture plus ESMFold-driven structure workflow

## Best Fit

- Livestock and breeding program record management
- Genetics teams who need visual lineage review
- Researchers preparing diagrams and exports for reporting or publication

## Quick Start

For browser development:

```bash
npm install
npm run dev
```

For quality checks:

```bash
npm run lint
npm run test
npm run build
```

## Desktop Packaging

Tauri builds are supported across major platforms.

Windows:

```powershell
npm run tauri:build
```

macOS:

```bash
xcode-select --install
npm run tauri:build
```

Linux:

```bash
sudo apt install -y libwebkit2gtk-4.1-dev build-essential librsvg2-dev patchelf
npm run tauri:build
```

## Stack

- Tauri 2
- React 19
- TypeScript
- Tailwind CSS v4
- Mermaid
- 3Dmol.js
- PapaParse
- IndexedDB

## Validation Snapshot

- `tsc --noEmit` passing
- `vitest run` passing with 110 tests according to current status tracking
- `vite build` successful in the latest recorded project state
