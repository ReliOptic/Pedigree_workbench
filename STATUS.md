# Pedigree Workbench Status

> Working status snapshot kept for recovery and continuity.

## Date

2026-04-12

## Work Items

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Remove seeded sample data and start from an empty canvas | Done | Removed `ensureSeeded()`, introduced empty canvas and `EmptyState` |
| 2 | Project system for CSV-specific workspaces | Done | Added IndexedDB `projects` store and project-switching UI |
| 3 | Saved and unsaved state indicator | Done | Added `Saving...` and `Saved` feedback in top bar and footer |
| 4 | Export improvements | Done | Added UTF-8 BOM, quoted headers, and CRLF line endings |
| 5 | Write `STATUS.md` | Done | Current file |

## Verification

- `tsc --noEmit`: passing
- `vitest run`: 110 tests passed across 14 files
- `vite build`: successful

## Changed Files

- `src/types/pedigree.types.ts` — added `Project` interface
- `src/types/translation.types.ts` — added translation keys
- `src/translations.ts` — expanded Korean and English translations
- `src/services/pedigree-store.ts` — DB v2 with `projects` store, removed `ensureSeeded`
- `src/services/pedigree-export.ts` — BOM, quoted headers, CRLF output
- `src/services/settings-store.ts` — added `activeProjectId`
- `src/hooks/use-pedigree.ts` — removed seeding, added `saveStatus`
- `src/hooks/use-projects.ts` — added project management hook
- `src/components/TopBar.tsx` — project selector and save-status indicator
- `src/components/Footer.tsx` — save-status indicator
- `src/components/ImportModal.tsx` — pass project name during import
- `src/App.tsx` — integrated project system and auto-save
- `tests/unit/pedigree-store.test.ts` — project-related tests
- `tests/integration/*.test.tsx` — manual seeding for integration coverage

## Completed Earlier Work

- Tauri release builds completed for Windows NSIS and MSI
- README v1.0 rewrite completed
- ESMFold API CSP allowance added
- keyboard shortcut overlay
- undo and redo snapshot history
- dark mode and settings modal
- add-parent context menu with automatic linking
- CSV export and top-bar download button
