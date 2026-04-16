# Phase 0: Design Token + Component Reference — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the visual foundation (tokens, component reference, node dimensions, desktop decisions) that constrains all subsequent Phase 1-8 implementation.

**Architecture:** CSS variables in a single `design-tokens.css` file are the source of truth. Tailwind v4's `@theme` block references these variables. An HTML reference sheet demonstrates all base components using only these tokens. Canvas node dimensions are exported as TypeScript constants for the layout engine.

**Tech Stack:** CSS custom properties, Tailwind CSS v4 (`@theme`), static HTML, TypeScript constants, Inter font (bundled), Tauri 2.x window config.

**Spec:** `docs/superpowers/specs/2026-04-16-pedigree-workbench-design.md` — Phase 0 section.

---

## File Structure

```
src/
├── design-tokens.css              — CREATE: all CSS variables (:root dark-first, [data-theme="light"])
├── index.css                      — MODIFY: replace @theme block + .dark overrides with import of design-tokens.css
├── constants/
│   └── node-dimensions.ts         — CREATE: canvas node size/connector constants
├── assets/
│   └── fonts/
│       ├── Inter-Regular.woff2    — CREATE: bundled font file
│       ├── Inter-Medium.woff2     — CREATE: bundled font file
│       └── Inter-SemiBold.woff2   — CREATE: bundled font file
docs/
├── design/
│   └── component-reference.html   — CREATE: static HTML reference sheet
src-tauri/
├── tauri.conf.json                — MODIFY: titlebar, window constraints
```

---

### Task 1: Create design-tokens.css

**Files:**
- Create: `src/design-tokens.css`

- [ ] **Step 1: Create the token file with dark-first color system**

```css
/* src/design-tokens.css
 * Single source of truth for all visual tokens.
 * Dark mode is default. Light mode is opt-in via [data-theme="light"].
 *
 * Contrast targets (WCAG AA):
 *   --text-primary on --surface-base:     ≥4.5:1
 *   --text-secondary on --surface-base:   ≥4.5:1
 *   --text-muted on --surface-base:       ≥3.0:1
 */

:root {
  /* ── Surfaces ── */
  --surface-base: #0f1117;
  --surface-raised: #1a1d27;
  --surface-overlay: #252836;

  /* ── Borders ── */
  --border: #2e3244;
  --border-strong: #3d4458;

  /* ── Text ── */
  --text-primary: #e2e4e9;
  --text-secondary: #9ba1b0;
  --text-muted: #636980;

  /* ── Status (color = meaning only) ── */
  --status-ok: #34d399;
  --status-warn: #fbbf24;
  --status-error: #f87171;
  --status-active: #60a5fa;

  /* ── Node colors ── */
  --node-male-bg: #10233d;
  --node-male-border: #71a9dd;
  --node-female-bg: #311227;
  --node-female-border: #d889b2;
  --node-unknown-bg: #1a2330;
  --node-unknown-border: #b7c2d0;

  /* ── Canvas ── */
  --canvas-dot-grid: rgba(151, 165, 184, 0.22);
  --canvas-generation-band: rgba(13, 17, 23, 0.82);
  --canvas-hover-overlay: rgba(0, 0, 0, 0.4);
  --connector-default: #4a5568;
  --connector-sire: #60a5fa;
  --connector-dam: #f472b6;

  /* ── Typography ── */
  --font-family: 'Inter', system-ui, sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;

  /* ── Spacing (4px base) ── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ── Rounding ── */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-none: 0px;

  /* ── Shadows ── */
  --shadow-raised: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-overlay: 0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);

  /* ── Transitions ── */
  --transition-fast: 100ms ease;
  --transition-base: 150ms ease;
  --transition-slow: 200ms ease-out;
  --transition-layout: 300ms ease-out;

  /* ── Desktop ── */
  --titlebar-height: 40px;
  --min-click-target: 36px;
}

[data-theme="light"] {
  --surface-base: #ffffff;
  --surface-raised: #f8f9fa;
  --surface-overlay: #f0f1f3;

  --border: #e2e4e9;
  --border-strong: #cbd0d8;

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;

  --node-male-bg: #dbeafe;
  --node-male-border: #1d4ed8;
  --node-female-bg: #fce7f3;
  --node-female-border: #be185d;
  --node-unknown-bg: #f1f5f9;
  --node-unknown-border: #475569;

  --canvas-dot-grid: rgba(0, 59, 90, 0.22);
  --canvas-generation-band: rgba(248, 250, 252, 0.5);
  --canvas-hover-overlay: rgba(0, 0, 0, 0.15);
  --connector-default: #94a3b8;
  --connector-sire: #2563eb;
  --connector-dam: #db2777;

  --shadow-raised: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-overlay: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06);
}

/* ── Font face (bundled Inter) ── */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./assets/fonts/Inter-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./assets/fonts/Inter-Medium.woff2') format('woff2');
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('./assets/fonts/Inter-Regular.woff2') format('woff2');
}
```

- [ ] **Step 2: Verify contrast ratios**

Use this formula to check: for dark mode, `#e2e4e9` on `#0f1117` should be ≥4.5. `#9ba1b0` on `#0f1117` should be ≥4.5. `#636980` on `#0f1117` should be ≥3.0.

Run: open https://webaim.org/resources/contrastchecker/ and verify each pair manually, or use a CLI tool:

```bash
npx wcag-contrast "#e2e4e9" "#0f1117"
npx wcag-contrast "#9ba1b0" "#0f1117"
npx wcag-contrast "#636980" "#0f1117"
```

Expected: all pass their respective thresholds. Adjust values if any fail.

- [ ] **Step 3: Commit**

```bash
git add src/design-tokens.css
git commit -m "feat(phase-0): add design tokens CSS with dark-first color system"
```

---

### Task 2: Bundle Inter font

**Files:**
- Create: `src/assets/fonts/Inter-Regular.woff2`
- Create: `src/assets/fonts/Inter-Medium.woff2`
- Create: `src/assets/fonts/Inter-SemiBold.woff2`

- [ ] **Step 1: Download Inter woff2 files**

```bash
mkdir -p src/assets/fonts
curl -L -o src/assets/fonts/Inter-Regular.woff2 "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.woff2"
curl -L -o src/assets/fonts/Inter-Medium.woff2 "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.woff2"
curl -L -o src/assets/fonts/Inter-SemiBold.woff2 "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.woff2"
```

- [ ] **Step 2: Verify files exist and are not empty**

```bash
ls -la src/assets/fonts/
```

Expected: 3 woff2 files, each >20KB.

- [ ] **Step 3: Update Tauri CSP to allow font loading**

In `src-tauri/tauri.conf.json`, the CSP already has `font-src 'self' data:` which covers bundled fonts. No change needed.

- [ ] **Step 4: Commit**

```bash
git add src/assets/fonts/
git commit -m "feat(phase-0): bundle Inter font (Regular, Medium, SemiBold)"
```

---

### Task 3: Migrate index.css to use design-tokens.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace the @theme block and .dark overrides**

The current `index.css` has a `@theme { ... }` block with color variables and a `.dark { ... }` override block. Replace both with an import of the token file and a new `@theme` block that references the CSS variables.

Replace the entire contents of `src/index.css` with:

```css
@import "./design-tokens.css";
@import "tailwindcss";

@theme {
  --color-surface-base: var(--surface-base);
  --color-surface-raised: var(--surface-raised);
  --color-surface-overlay: var(--surface-overlay);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-status-ok: var(--status-ok);
  --color-status-warn: var(--status-warn);
  --color-status-error: var(--status-error);
  --color-status-active: var(--status-active);
  --color-node-male-bg: var(--node-male-bg);
  --color-node-male-border: var(--node-male-border);
  --color-node-female-bg: var(--node-female-bg);
  --color-node-female-border: var(--node-female-border);
  --color-node-unknown-bg: var(--node-unknown-bg);
  --color-node-unknown-border: var(--node-unknown-border);
  --color-canvas-dot-grid: var(--canvas-dot-grid);
  --color-canvas-generation-band: var(--canvas-generation-band);
}

@layer base {
  html {
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  html,
  body,
  #root {
    background: var(--surface-base);
    color: var(--text-primary);
  }

  *:focus {
    outline: none;
  }

  *:focus-visible {
    outline: 2px solid var(--status-active);
    outline-offset: 2px;
    border-radius: 2px;
  }
}

@layer components {
  /* ── Button ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: transform var(--transition-fast), background var(--transition-base), border-color var(--transition-base), color var(--transition-base);
    min-height: var(--min-click-target);
    padding: var(--space-2) var(--space-4);
  }

  .btn:active {
    transform: scale(0.97);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  /* variant: secondary (default) */
  .btn-secondary {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    color: var(--text-secondary);
  }

  .btn-secondary:hover:not(:disabled) {
    border-color: var(--border-strong);
    color: var(--text-primary);
  }

  /* variant: primary */
  .btn-primary {
    background: var(--status-active);
    border: 1px solid transparent;
    color: #ffffff;
  }

  .btn-primary:hover:not(:disabled) {
    background: #4d94f7;
  }

  /* variant: ghost */
  .btn-ghost {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-secondary);
  }

  .btn-ghost:hover:not(:disabled) {
    background: var(--surface-raised);
    color: var(--text-primary);
  }

  /* variant: danger */
  .btn-danger {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--status-error);
  }

  .btn-danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--status-error) 12%, transparent);
    border-color: var(--status-error);
  }

  /* size: sm */
  .btn-sm {
    min-height: 32px;
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
  }

  /* size: lg */
  .btn-lg {
    min-height: 40px;
    padding: var(--space-3) var(--space-6);
  }

  /* ── ListItem ── */
  .list-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-left: 2px solid transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: border-color var(--transition-base), background var(--transition-base), color var(--transition-base);
    min-height: var(--min-click-target);
  }

  .list-item:hover {
    background: var(--surface-raised);
    color: var(--text-primary);
  }

  .list-item[data-selected="true"] {
    border-left-color: var(--status-active);
    background: var(--surface-raised);
    color: var(--text-primary);
  }

  /* ── Panel ── */
  .panel-slide-right {
    transform: translateX(100%);
    transition: transform var(--transition-slow);
  }

  .panel-slide-right[data-open="true"] {
    transform: translateX(0);
  }

  .panel-slide-left {
    transform: translateX(-100%);
    transition: transform var(--transition-slow);
  }

  .panel-slide-left[data-open="true"] {
    transform: translateX(0);
  }

  /* ── Context Menu ── */
  .ctx-menu {
    background: var(--surface-overlay);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-overlay);
    padding: var(--space-1) 0;
    min-width: 200px;
  }

  .ctx-menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-4);
    height: 40px;
    font-size: var(--font-size-base);
    color: var(--text-primary);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .ctx-menu-item:hover {
    background: var(--surface-raised);
  }

  .ctx-menu-item[data-disabled="true"] {
    color: var(--text-muted);
    cursor: not-allowed;
  }

  .ctx-menu-item[data-danger="true"] {
    color: var(--status-error);
  }

  .ctx-menu-divider {
    height: 1px;
    background: var(--border);
    margin: var(--space-1) 0;
  }

  .ctx-menu-header {
    padding: var(--space-2) var(--space-4);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
  }

  /* ── Status Dot ── */
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot-ok { background: var(--status-ok); }
  .status-dot-warn { background: var(--status-warn); }
  .status-dot-error { background: var(--status-error); }
  .status-dot-muted { background: var(--text-muted); }

  /* ── Legacy compat aliases (remove during Phase 1 migration) ── */
  .panel-button { @apply btn btn-secondary btn-sm; }
  .panel-button-primary { @apply btn btn-primary btn-sm; }
}
```

- [ ] **Step 2: Verify build compiles**

```bash
npm run lint
```

Expected: no TypeScript errors (CSS changes don't affect TS, but verify no import breakage).

```bash
npm run build
```

Expected: build succeeds. Warnings about unused CSS classes are OK at this stage.

- [ ] **Step 3: Verify dark mode default**

Open the app. The default appearance should now be dark. To switch to light, `document.documentElement.setAttribute('data-theme', 'light')` in console.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(phase-0): migrate index.css to design-tokens, dark-first, base component classes"
```

---

### Task 4: Update theme toggle to data-theme attribute

**Files:**
- Modify: `src/services/settings-store.ts` (or wherever dark mode toggle lives)
- Modify: `src/App.tsx` (dark mode application)

- [ ] **Step 1: Find current dark mode implementation**

```bash
grep -rn "dark" src/ --include="*.ts" --include="*.tsx" -l
```

Identify where `.dark` class is added/removed from `<html>`.

- [ ] **Step 2: Replace .dark class toggle with data-theme attribute**

Find the code that does `document.documentElement.classList.add('dark')` or similar, and replace with:

```typescript
// Dark is default (no attribute needed). Light is opt-in.
function applyTheme(theme: 'dark' | 'light') {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}
```

- [ ] **Step 3: Update initial theme detection**

On first launch, check OS preference:

```typescript
function getInitialTheme(): 'dark' | 'light' {
  const saved = localStorage.getItem('pw-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
```

- [ ] **Step 4: Search and replace dark: prefix usage**

Many components use `dark:bg-slate-800` style Tailwind classes. These will need migration to use the new CSS variable-based classes. This is a Phase 1 task — for now, add backward compat:

In `src/design-tokens.css`, add at the bottom:

```css
/* Backward compat: map data-theme to .dark class until Phase 1 migration */
:root:not([data-theme="light"]) {
  color-scheme: dark;
}

:root:not([data-theme="light"]) * {
  /* This makes Tailwind dark: prefix work without .dark class */
}
```

Actually, the cleanest approach: keep `.dark` class AND set `data-theme` during the transition period. In Phase 1, remove all `dark:` prefixes.

```typescript
function applyTheme(theme: 'dark' | 'light') {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.add('dark');
  }
}
```

- [ ] **Step 5: Verify both modes work**

Launch app. Verify dark mode renders correctly. Switch to light. Verify light mode renders. Switch back.

- [ ] **Step 6: Commit**

```bash
git add src/services/settings-store.ts src/App.tsx
git commit -m "feat(phase-0): switch to data-theme attribute, dark-first with .dark compat"
```

---

### Task 5: Create canvas node dimension constants

**Files:**
- Create: `src/constants/node-dimensions.ts`

- [ ] **Step 1: Create the constants file**

```typescript
// src/constants/node-dimensions.ts
// Canvas node dimensions — single source of truth for layout engine.
// All values in pixels. Used by pedigree-layout.ts and PedigreeCanvas.tsx.

export const NODE = {
  /** Fixed width for all node shapes */
  WIDTH: 140,
  /** Height for square (male) and diamond (unknown) nodes */
  HEIGHT: 56,
  /** Radius for circle (female) nodes — equals HEIGHT/2 */
  RADIUS: 28,
  /** Max characters before truncation with ellipsis */
  MAX_NAME_CHARS: 20,
  /** Internal padding */
  PADDING: 8,
  /** Font size for node name */
  NAME_FONT_SIZE: 13,
  /** Font size for node ID / secondary text */
  ID_FONT_SIZE: 11,
  /** COI badge size */
  BADGE_SIZE: 20,
  /** Badge offset from top-right corner */
  BADGE_OFFSET: 4,
} as const;

export const CONNECTOR = {
  /** Default line thickness */
  THICKNESS: 1.5,
  /** Thickness on hover */
  THICKNESS_HOVER: 2.5,
  /** Mating node (×) diameter */
  MATING_NODE_SIZE: 12,
  /** Cubic bezier control point offset ratio (0-1) */
  BEZIER_CP_RATIO: 0.45,
  /** Litter bracket height */
  LITTER_BRACKET_HEIGHT: 16,
} as const;

export const GENERATION = {
  /** Vertical spacing between generation bands */
  BAND_SPACING: 120,
  /** Left margin for generation label */
  LABEL_MARGIN_LEFT: 16,
  /** Generation label font size */
  LABEL_FONT_SIZE: 12,
} as const;

export const CANVAS = {
  /** Minimum zoom level */
  ZOOM_MIN: 0.1,
  /** Maximum zoom level */
  ZOOM_MAX: 3.0,
  /** Zoom step per scroll tick */
  ZOOM_STEP: 0.1,
  /** Connection handle radius (visible on hover) */
  CONNECT_HANDLE_RADIUS: 4,
  /** Padding around all nodes for viewport calculation */
  VIEWPORT_PADDING: 80,
} as const;
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/constants/node-dimensions.ts
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/constants/node-dimensions.ts
git commit -m "feat(phase-0): add canvas node dimension constants"
```

---

### Task 6: Update Tauri config for desktop platform decisions

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Update window configuration**

The current config already has `minWidth: 1024, minHeight: 720`. Update to match spec:

In `src-tauri/tauri.conf.json`, update the windows section:

```json
{
  "app": {
    "windows": [
      {
        "title": "Pedigree Workbench",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 768,
        "resizable": true,
        "fullscreen": false,
        "center": true,
        "decorations": false
      }
    ]
  }
}
```

Key changes:
- `width`: 1440→1280, `height`: 900→800 (spec default)
- `minHeight`: 720→768 (spec minimum)
- `decorations`: false (enables custom titlebar)

- [ ] **Step 2: Verify Tauri config is valid JSON**

```bash
python3 -c "import json; json.load(open('src-tauri/tauri.conf.json'))"
```

Expected: no error.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat(phase-0): configure custom titlebar and window constraints"
```

---

### Task 7: Create component reference HTML

**Files:**
- Create: `docs/design/component-reference.html`

- [ ] **Step 1: Create the HTML reference sheet**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedigree Workbench — Component Reference</title>
  <link rel="stylesheet" href="../../src/design-tokens.css">
  <style>
    /* Reset + reference-specific styles only */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--surface-base);
      color: var(--text-primary);
      font-family: var(--font-family);
      font-size: var(--font-size-base);
      padding: 48px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 { font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); margin-bottom: 32px; }
    h2 { font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); margin-top: 48px; margin-bottom: 16px; color: var(--text-secondary); }
    h3 { font-size: var(--font-size-lg); font-weight: var(--font-weight-medium); margin-top: 24px; margin-bottom: 12px; }
    .section { margin-bottom: 48px; }
    .row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
    .label { font-size: var(--font-size-xs); color: var(--text-muted); margin-bottom: 4px; }
    .swatch { width: 48px; height: 48px; border-radius: var(--radius-sm); border: 1px solid var(--border); }
    .swatch-row { display: flex; gap: 8px; align-items: flex-end; }
    .swatch-info { font-size: var(--font-size-xs); color: var(--text-muted); }
    .demo-panel { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 16px; }

    /* Import component classes from design-tokens / index.css */
    /* Button */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      font-family: var(--font-family); font-size: var(--font-size-base); font-weight: var(--font-weight-medium);
      border-radius: var(--radius-sm); cursor: pointer; min-height: 36px; padding: 8px 16px;
      transition: transform 100ms ease, background 150ms ease, border-color 150ms ease, color 150ms ease;
    }
    .btn:active { transform: scale(0.97); }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .btn-secondary { background: var(--surface-raised); border: 1px solid var(--border); color: var(--text-secondary); }
    .btn-secondary:hover:not(:disabled) { border-color: var(--border-strong); color: var(--text-primary); }
    .btn-primary { background: var(--status-active); border: 1px solid transparent; color: #ffffff; }
    .btn-primary:hover:not(:disabled) { background: #4d94f7; }
    .btn-ghost { background: transparent; border: 1px solid transparent; color: var(--text-secondary); }
    .btn-ghost:hover:not(:disabled) { background: var(--surface-raised); color: var(--text-primary); }
    .btn-danger { background: transparent; border: 1px solid var(--border); color: var(--status-error); }
    .btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--status-error) 12%, transparent); border-color: var(--status-error); }
    .btn-sm { min-height: 32px; padding: 4px 12px; font-size: var(--font-size-sm); }
    .btn-lg { min-height: 40px; padding: 12px 24px; }

    /* ListItem */
    .list-item {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      border-left: 2px solid transparent; color: var(--text-secondary); cursor: pointer;
      transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
      min-height: 36px;
    }
    .list-item:hover { background: var(--surface-raised); color: var(--text-primary); }
    .list-item[data-selected="true"] { border-left-color: var(--status-active); background: var(--surface-raised); color: var(--text-primary); }

    /* Context Menu */
    .ctx-menu { background: var(--surface-overlay); border: 1px solid var(--border-strong); border-radius: var(--radius-md); box-shadow: var(--shadow-overlay); padding: 4px 0; min-width: 200px; display: inline-block; }
    .ctx-menu-item { display: flex; align-items: center; gap: 8px; padding: 0 16px; height: 40px; font-size: var(--font-size-base); color: var(--text-primary); cursor: pointer; transition: background 100ms ease; }
    .ctx-menu-item:hover { background: var(--surface-raised); }
    .ctx-menu-item[data-disabled="true"] { color: var(--text-muted); cursor: not-allowed; }
    .ctx-menu-item[data-danger="true"] { color: var(--status-error); }
    .ctx-menu-divider { height: 1px; background: var(--border); margin: 4px 0; }
    .ctx-menu-header { padding: 8px 16px; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--text-secondary); }

    /* Status Dot */
    .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
    .status-dot-ok { background: var(--status-ok); }
    .status-dot-warn { background: var(--status-warn); }
    .status-dot-error { background: var(--status-error); }
    .status-dot-muted { background: var(--text-muted); }

    /* Node shapes (SVG reference) */
    .node-demo { display: inline-flex; flex-direction: column; align-items: center; gap: 8px; }
    .node-demo svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); }
  </style>
</head>
<body>

  <h1>Pedigree Workbench — Component Reference</h1>
  <p style="color: var(--text-secondary); margin-bottom: 32px;">
    Design tokens source: <code>src/design-tokens.css</code><br>
    This page imports tokens directly. Changes to the token file auto-reflect here.
  </p>

  <!-- ═══ COLORS ═══ -->
  <section class="section">
    <h2>Colors</h2>

    <h3>Surfaces</h3>
    <div class="row">
      <div>
        <div class="label">base</div>
        <div class="swatch" style="background: var(--surface-base);"></div>
        <div class="swatch-info">#0f1117</div>
      </div>
      <div>
        <div class="label">raised</div>
        <div class="swatch" style="background: var(--surface-raised);"></div>
        <div class="swatch-info">#1a1d27</div>
      </div>
      <div>
        <div class="label">overlay</div>
        <div class="swatch" style="background: var(--surface-overlay);"></div>
        <div class="swatch-info">#252836</div>
      </div>
    </div>

    <h3>Text</h3>
    <div class="row">
      <div>
        <div class="label">primary</div>
        <div class="swatch" style="background: var(--text-primary);"></div>
        <div class="swatch-info">#e2e4e9</div>
      </div>
      <div>
        <div class="label">secondary</div>
        <div class="swatch" style="background: var(--text-secondary);"></div>
        <div class="swatch-info">#9ba1b0</div>
      </div>
      <div>
        <div class="label">muted</div>
        <div class="swatch" style="background: var(--text-muted);"></div>
        <div class="swatch-info">#636980</div>
      </div>
    </div>

    <h3>Status</h3>
    <div class="row">
      <div>
        <div class="label">ok</div>
        <div class="swatch" style="background: var(--status-ok);"></div>
      </div>
      <div>
        <div class="label">warn</div>
        <div class="swatch" style="background: var(--status-warn);"></div>
      </div>
      <div>
        <div class="label">error</div>
        <div class="swatch" style="background: var(--status-error);"></div>
      </div>
      <div>
        <div class="label">active</div>
        <div class="swatch" style="background: var(--status-active);"></div>
      </div>
    </div>
  </section>

  <!-- ═══ TYPOGRAPHY ═══ -->
  <section class="section">
    <h2>Typography</h2>
    <div class="demo-panel">
      <p style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold);">24px SemiBold — Page Title</p>
      <p style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold); margin-top: 8px;">20px SemiBold — Section</p>
      <p style="font-size: var(--font-size-lg); font-weight: var(--font-weight-medium); margin-top: 8px;">16px Medium — Subsection</p>
      <p style="font-size: var(--font-size-base); margin-top: 8px;">14px Regular — Body text</p>
      <p style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-top: 8px;">13px — Secondary</p>
      <p style="font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 8px;">12px — Caption / Muted</p>
    </div>
    <p style="font-feature-settings: 'tnum'; color: var(--text-secondary); margin-top: 8px;">
      Tabular nums: 0123456789 — COI: 0.0625 — F=0.125
    </p>
  </section>

  <!-- ═══ BUTTONS ═══ -->
  <section class="section">
    <h2>Button</h2>

    <h3>Variants</h3>
    <div class="row">
      <button class="btn btn-secondary">Secondary</button>
      <button class="btn btn-primary">Primary</button>
      <button class="btn btn-ghost">Ghost</button>
      <button class="btn btn-danger">Danger</button>
    </div>

    <h3>Sizes</h3>
    <div class="row">
      <button class="btn btn-secondary btn-sm">Small (32px)</button>
      <button class="btn btn-secondary">Medium (36px)</button>
      <button class="btn btn-secondary btn-lg">Large (40px)</button>
    </div>

    <h3>States</h3>
    <div class="row">
      <button class="btn btn-secondary">Default</button>
      <button class="btn btn-secondary" style="border-color: var(--border-strong); color: var(--text-primary);">Hover</button>
      <button class="btn btn-secondary" style="transform: scale(0.97);">Active</button>
      <button class="btn btn-secondary" disabled>Disabled</button>
    </div>
  </section>

  <!-- ═══ LIST ITEM ═══ -->
  <section class="section">
    <h2>ListItem</h2>
    <div class="demo-panel" style="padding: 0; overflow: hidden; max-width: 280px;">
      <div class="list-item">Default item</div>
      <div class="list-item" style="background: var(--surface-raised); color: var(--text-primary);">Hover state</div>
      <div class="list-item" data-selected="true">Selected item</div>
      <div class="list-item">Another item</div>
    </div>
  </section>

  <!-- ═══ CONTEXT MENU ═══ -->
  <section class="section">
    <h2>Context Menu</h2>
    <div class="row" style="align-items: flex-start;">
      <div class="ctx-menu">
        <div class="ctx-menu-header">♂ Boar-001</div>
        <div class="ctx-menu-divider"></div>
        <div class="ctx-menu-item">Assign Sire</div>
        <div class="ctx-menu-item">Assign Dam</div>
        <div class="ctx-menu-item" data-disabled="true">Remove Sire Link</div>
        <div class="ctx-menu-divider"></div>
        <div class="ctx-menu-item">Create Mating</div>
        <div class="ctx-menu-item">Add Offspring</div>
        <div class="ctx-menu-divider"></div>
        <div class="ctx-menu-item">Edit Details</div>
        <div class="ctx-menu-item" data-danger="true">Delete</div>
      </div>

      <div class="ctx-menu">
        <div class="ctx-menu-header">Empty canvas</div>
        <div class="ctx-menu-divider"></div>
        <div class="ctx-menu-item">Add Individual here</div>
        <div class="ctx-menu-item" data-disabled="true">Paste from clipboard</div>
        <div class="ctx-menu-divider"></div>
        <div class="ctx-menu-item">Fit to view</div>
        <div class="ctx-menu-item">Toggle grid</div>
      </div>
    </div>
  </section>

  <!-- ═══ STATUS DOT ═══ -->
  <section class="section">
    <h2>StatusDot</h2>
    <div class="row">
      <div style="display:flex; align-items:center; gap:8px;"><span class="status-dot status-dot-ok"></span> Active</div>
      <div style="display:flex; align-items:center; gap:8px;"><span class="status-dot status-dot-warn"></span> Hold</div>
      <div style="display:flex; align-items:center; gap:8px;"><span class="status-dot status-dot-error"></span> Culled</div>
      <div style="display:flex; align-items:center; gap:8px;"><span class="status-dot status-dot-muted"></span> Unknown</div>
    </div>
  </section>

  <!-- ═══ CANVAS NODES ═══ -->
  <section class="section">
    <h2>Canvas Nodes</h2>
    <p style="color: var(--text-secondary); margin-bottom: 16px;">
      Fixed width: 140px. Max name: 20 chars, then ellipsis. Hover shows full name.
    </p>
    <div class="row" style="gap: 32px;">
      <!-- Male: square -->
      <div class="node-demo">
        <svg width="140" height="56" viewBox="0 0 140 56">
          <rect x="1" y="1" width="138" height="54" rx="0" ry="0"
                fill="var(--node-male-bg)" stroke="var(--node-male-border)" stroke-width="2"/>
          <text x="70" y="22" text-anchor="middle" fill="var(--text-primary)"
                font-family="var(--font-family)" font-size="13" font-weight="500">Boar-042</text>
          <text x="70" y="40" text-anchor="middle" fill="var(--text-secondary)"
                font-family="var(--font-family)" font-size="11">♂ F0</text>
          <!-- COI badge -->
          <circle cx="126" cy="14" r="10" fill="var(--status-warn)" opacity="0.9"/>
          <text x="126" y="18" text-anchor="middle" fill="#000"
                font-family="var(--font-family)" font-size="8" font-weight="600">12%</text>
        </svg>
        <div class="label">Male (square, 140×56)</div>
      </div>

      <!-- Female: circle -->
      <div class="node-demo">
        <svg width="140" height="56" viewBox="0 0 140 56">
          <ellipse cx="70" cy="28" rx="69" ry="27"
                   fill="var(--node-female-bg)" stroke="var(--node-female-border)" stroke-width="2"/>
          <text x="70" y="24" text-anchor="middle" fill="var(--text-primary)"
                font-family="var(--font-family)" font-size="13" font-weight="500">Sow-017</text>
          <text x="70" y="40" text-anchor="middle" fill="var(--text-secondary)"
                font-family="var(--font-family)" font-size="11">♀ F0</text>
        </svg>
        <div class="label">Female (ellipse, 140×56)</div>
      </div>

      <!-- Unknown: diamond -->
      <div class="node-demo">
        <svg width="140" height="56" viewBox="0 0 140 56">
          <polygon points="70,2 138,28 70,54 2,28"
                   fill="var(--node-unknown-bg)" stroke="var(--node-unknown-border)" stroke-width="2"/>
          <text x="70" y="24" text-anchor="middle" fill="var(--text-primary)"
                font-family="var(--font-family)" font-size="13" font-weight="500">Pig-201</text>
          <text x="70" y="40" text-anchor="middle" fill="var(--text-secondary)"
                font-family="var(--font-family)" font-size="11">◆ F2</text>
        </svg>
        <div class="label">Unknown (diamond, 140×56)</div>
      </div>
    </div>

    <h3 style="margin-top: 24px;">Connectors</h3>
    <svg width="300" height="100" viewBox="0 0 300 100" style="margin-top: 8px;">
      <!-- Sire line -->
      <line x1="50" y1="20" x2="150" y2="20" stroke="var(--connector-sire)" stroke-width="1.5"/>
      <text x="160" y="24" fill="var(--text-muted)" font-family="var(--font-family)" font-size="11">Sire (1.5px, blue)</text>

      <!-- Dam line -->
      <line x1="50" y1="50" x2="150" y2="50" stroke="var(--connector-dam)" stroke-width="1.5"/>
      <text x="160" y="54" fill="var(--text-muted)" font-family="var(--font-family)" font-size="11">Dam (1.5px, pink)</text>

      <!-- Mating node -->
      <circle cx="50" cy="80" r="6" fill="var(--surface-overlay)" stroke="var(--connector-default)" stroke-width="1.5"/>
      <line x1="47" y1="77" x2="53" y2="83" stroke="var(--connector-default)" stroke-width="1.5"/>
      <line x1="53" y1="77" x2="47" y2="83" stroke="var(--connector-default)" stroke-width="1.5"/>
      <text x="65" y="84" fill="var(--text-muted)" font-family="var(--font-family)" font-size="11">Mating node (×, 12px)</text>
    </svg>
  </section>

  <!-- ═══ SPACING ═══ -->
  <section class="section">
    <h2>Spacing Scale (4px base)</h2>
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: var(--space-1); height: 16px; background: var(--status-active);"></div>
        <span class="swatch-info">4px (space-1)</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: var(--space-2); height: 16px; background: var(--status-active);"></div>
        <span class="swatch-info">8px (space-2)</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: var(--space-4); height: 16px; background: var(--status-active);"></div>
        <span class="swatch-info">16px (space-4)</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: var(--space-8); height: 16px; background: var(--status-active);"></div>
        <span class="swatch-info">32px (space-8)</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: var(--space-12); height: 16px; background: var(--status-active);"></div>
        <span class="swatch-info">48px (space-12)</span>
      </div>
    </div>
  </section>

  <!-- ═══ THEME TOGGLE ═══ -->
  <section class="section">
    <h2>Theme Toggle</h2>
    <button class="btn btn-secondary" onclick="
      const html = document.documentElement;
      if (html.getAttribute('data-theme') === 'light') {
        html.removeAttribute('data-theme');
        this.textContent = 'Switch to Light';
      } else {
        html.setAttribute('data-theme', 'light');
        this.textContent = 'Switch to Dark';
      }
    ">Switch to Light</button>
  </section>

</body>
</html>
```

- [ ] **Step 2: Open in browser and verify**

```bash
open docs/design/component-reference.html
# or on Linux:
xdg-open docs/design/component-reference.html
```

Verify:
- Dark mode renders correctly by default
- Theme toggle switches to light and back
- All color swatches are visible
- Button states look distinct
- ListItem selected state has blue left bar
- Context menu items are 40px height
- Node shapes render with correct colors
- Connectors show sire (blue), dam (pink), mating node (×)

- [ ] **Step 3: Commit**

```bash
git add docs/design/component-reference.html
git commit -m "feat(phase-0): add component reference HTML sheet with all base components"
```

---

### Task 8: Verification — full Phase 0 checklist

- [ ] **Step 1: Verify token file exists and is imported**

```bash
head -3 src/index.css
```

Expected: first line is `@import "./design-tokens.css";`

- [ ] **Step 2: Verify build succeeds**

```bash
npm run build
```

Expected: build completes without errors.

- [ ] **Step 3: Verify tests still pass**

```bash
npm test
```

Expected: all existing tests pass (token changes are CSS-only, should not break logic tests).

- [ ] **Step 4: Verify component reference loads**

Open `docs/design/component-reference.html` in browser. All components render. Theme toggle works.

- [ ] **Step 5: Verify node constants are importable**

```bash
node -e "import('./src/constants/node-dimensions.ts').catch(() => console.log('TS file, check with tsc'))"
npx tsc --noEmit
```

Expected: TypeScript compiles without errors.

- [ ] **Step 6: Verify tauri.conf.json is valid**

```bash
python3 -c "import json; f=json.load(open('src-tauri/tauri.conf.json')); w=f['app']['windows'][0]; print(f'min: {w[\"minWidth\"]}x{w[\"minHeight\"]}, default: {w[\"width\"]}x{w[\"height\"]}, decorations: {w.get(\"decorations\", True)}')"
```

Expected: `min: 1024x768, default: 1280x800, decorations: False`

- [ ] **Step 7: Final commit (if any uncommitted changes remain)**

```bash
git status
```

If clean: Phase 0 complete. If changes remain, commit them.
