# Pedigree Workbench — Product Design Spec

Date: 2026-04-16

## Product Position

Pedigree Workbench is a modern offline-first pedigree decision workstation. It replaces legacy pedigree software (BreedMate, ZooEasy, Breeders Assistant) with better readability, stronger bulk-data interpretation, and modern UX while preserving their domain depth.

**PMF**: Import legacy CSV/Excel data, visualize it as meaningful pedigree structure, fix missing relationships on canvas, export clean data. The tool removes the friction of manual individual editing by making bulk data immediately readable and correctable.

**Target users**: European breeders, worldwide zoo/aquarium managers, genetics research labs.

## Design Benchmarks

**Linear + Figma only.** Data-dense domain tool with canvas + inspector model. High information density, right-click driven, restrained color use. Notion and Arc are excluded — their wide-margin, content-first philosophy does not fit a tool where 247 individuals must be readable on one screen.

## Architecture

### 3 Surfaces, 1 Data Layer

```
┌─────────────────────────────────────────────┐
│              Data Layer (Zustand)            │
│  individuals, matings, projects, species     │
│  pedigree-store (IndexedDB persistence)      │
└──────────┬──────────┬──────────┬────────────┘
           │          │          │
    ┌──────▼──┐  ┌───▼────┐  ┌─▼────────┐
    │ Canvas  │  │ Dash-  │  │  Paper    │
    │ (primary│  │ board  │  │  View     │
    │  stage) │  │(summary│  │ (output)  │
    └─────────┘  └────────┘  └──────────┘
```

- **Canvas**: Primary work surface. Two layout modes (Cohort / Pedigree) on the same SVG canvas. Layout algorithm swaps; interaction system stays the same.
- **Dashboard**: Summary surface. Project health, validation, population stats. Jump links to Canvas.
- **Paper View**: Output surface. Publication-quality pedigree charts and cohort reports. SVG/PNG/PDF export.

### Data Flow

```
CSV/Excel → ImportEngine (structure inference)
         → DataLayer (Zustand + IndexedDB)
         → LayoutEngine (Cohort or Pedigree)
         → Canvas (visualization + editing)
         → ExportEngine (custom column mapping)
         → PaperView (output rendering)
```

## Import + Structure Inference

### Pipeline

```
File select → Parse → Column mapping → Structure inference → Canvas
```

### StructureAnalyzer

Runs immediately after import. Determines three things:

**1) Relationship detection**
- Parent link presence and ratio
- Generation depth
- Orphan node ratio (referenced parent IDs not in dataset)

**2) Auto mode decision**
- No parent links + single generation + litter/group values → Cohort
- Sire/dam links or mating structure present → Pedigree
- Follows WORKBENCH_MODES.md transition rules

**3) Import Summary overlay**

Displayed on canvas after import:

```
Total individuals: 247
Detected generations: 4 (F0-F3)
Parent links: 189/247 (76%)
Orphan references: 12
Litter groups: 31
Missing sex: 8
Missing genotype: 45

Recommended mode: Pedigree

[Start in Workbench]
```

### Column Mapping

- Species profile `defaultFields` added as mapping candidates
- Auto-match common column names: sire, dam, father, mother, sex, gender, litter, dob
- Unmapped columns preserved as custom fields (no data loss)

### Opinionated Default

Import always lands on Canvas. No "would you like to go to dashboard?" prompt.

## Canvas Layout Engine

### computeLayout(data, mode: 'pedigree' | 'cohort', options)

### Pedigree Layout

Based on dagre Sugiyama with pedigree-specific constraints:

- **Mating pair constraint**: sire + dam always same rank, horizontally adjacent
- **Litter grouping**: same-litter offspring placed consecutively with shared drop line
- **Generation bands**: full-width background stripes with sticky left-edge labels
- **Standard symbols**: male = square, female = circle, unknown = diamond
- **Connectors**: parent → mating node → litter bracket → offspring

```
  ┌───┐       ╭───╮
  │ S │───✕───│ D │      Generation F0
  └───┘       ╰───╯
         │
    ┌────┴────┐
    │  litter │           litter bracket
    ├────┬────┤
  ┌─┴─┐┌─┴─┐┌─┴─┐
  │ C1 ││ C2 ││ C3 │    Generation F1
  └───┘└───┘└───┘
```

### Cohort Layout

Grid card view for F0 cohorts and litter-based work.

- **Grouping priority** (user-configurable): litter > sex > status
- **Card structure**: header (litter name, head count, sex ratio) + node tiles + parent summary footer
- **Node tiles**: minimum 120x100px. Name, DOB, primary locus result, status dot.
- **Status dots**: green = active, yellow = hold, red = culled, warning icon = data missing
- **Rendering**: SVG foreignObject with HTML cards (Tailwind reuse)

### Mode Transition

- Zoom: reset to fit-to-view
- Selection state: preserved
- Filters: preserved
- Animation: 300ms ease-out node position transition

## Canvas Relationship Editing

### Design Principle: Mouse First

Right-click context menu is the primary interaction path. Keyboard shortcuts are secondary. All click targets minimum 36x36px.

### Context Menus

**Node right-click:**
```
♂ Boar-001
─────────────────
Assign Sire
Assign Dam
Change Sire (current: Boar-042)  ← shows current if assigned
Remove Dam Link
─────────────────
Create Mating
Add Offspring
─────────────────
Edit Details
Delete
```

Menu item height: 40px. Font: 14px. Logical groups separated by dividers. Context-sensitive: shows "Change Sire" instead of "Assign Sire" when already connected.

**Connection line right-click:**
```
Sire link: Boar-042 → Piglet-01
─────────────────
Remove this link
Change to different sire
Inspect sire
Inspect offspring
```

**Empty canvas right-click:**
```
Add Individual here
Paste from clipboard
─────────────────
Fit to view
Toggle grid
```

### Pick Mode

Entered from context menu "Assign Sire/Dam":

1. Wide guidance bar at top: "Select a sire — click a male individual (ESC to cancel)"
2. Non-candidate nodes: opacity 30%
3. Valid candidates: border glow + pointer cursor
4. Click candidate → connection complete → auto-exit pick mode
5. ESC or cancel button → exit pick mode

### Drag Connection (Power User)

No separate connect mode needed:

- Small connection handle on node top edge (visible on hover only, 8px circle)
- Drag from handle → connection line mode
- Drop on parent node → auto-determine sire/dam by sex
- Select mode and connect coexist without mode switching

### Visual Feedback

- **Drag in progress**: dashed line, blue (sire) / red (dam)
- **Valid drop target**: border glow + scale(1.05)
- **Invalid drop**: self, duplicate role, cycle → red X
- **Pick mode**: selectable nodes bright, rest opacity 30%
- **Connection complete**: pulse animation (200ms)

### Node Hover (Overlay Method)

Performance-safe approach for large datasets:

1. Insert semi-transparent overlay on entire canvas (rgba(0,0,0,0.4))
2. Raise z-index of hovered node + directly connected nodes (above overlay)
3. Raise z-index of connecting lines + increase thickness

Changes: 1 overlay element + 2-5 related nodes. 246 other nodes untouched. 60fps safe.

### Validation on Edit

Every relationship change triggers:
- `detectCycles()` — reject and show contextual error if circular
- COI recalculation — update node badges
- Layout recomputation with animation

### Inspector Panel

Left-click node → Inspector slides in from right (200ms ease-out). Assign Sire/Dam buttons available (enter same pick mode). Button minimum: 36px height, 120px width.

### Inline Node Creation

Double-click empty canvas → inline form at click position (not modal). Minimum fields: ID, sex. Immediately connectable after creation.

## Cohort Mode

### Problem Solved

Pedigree layout with F0-only data = meaningless flat strip. Cohort mode makes this data operationally readable.

### Card Grid

Cards grouped by litter/group with:
- **Header**: litter name, head count, sex ratio
- **Tiles**: individual nodes (120x100px min), name, DOB, locus result, status dot
- **Footer**: sire/dam summary, DOB

### Cohort Context Menus

**Individual tile:**
- Edit Details
- Assign to Litter
- View Genotype
- Mark as Breeding Candidate / Culled
- View in Pedigree Mode (switches mode centered on this individual)
- Delete

**Card header:**
- Litter Summary
- Add Individual to Litter
- Rename Litter
- View Litter in Pedigree

### Cohort Sidebar

- Cohort Summary: total, sex ratio, genotype completion rate
- Missing Data: unset sex, genotype, parents
- Breeding Candidates: auto-recommended by filter criteria
- Quick Filters: by genotype, status, litter

### Cohort → Pedigree Transition

When sire/dam links are added to cohort data:
1. Sidebar notification: "Relationship structure detected. Switch to Pedigree mode?"
2. User confirms to switch (never forced)
3. Breeding candidate marks, status preserved across modes

## Species Profile System

### Architecture: Template System, Not Hardcoded List

Fixed species list is impossible. Instead:

**Step 1: Reproduction type (3)**
- Viviparous (live birth) — litter-based
- Oviparous (egg-laying) — clutch-based
- Marsupial — joey-based with pouch time

This choice determines UI terminology and workflows.

**Step 2: Preset selection (searchable)**

~25 bundled presets across categories:

| Category | Species |
|----------|---------|
| Livestock | Swine, Cattle, Equine, Ovine, Caprine |
| Companion | Canine, Feline, Rabbit |
| Avian | Parrot, Penguin, Raptor, Poultry, Ratite (ostrich) |
| Marine | Cetacean, Pinniped, Sea Turtle |
| Primate | Primate, Great Ape |
| Large mammals | Big Cat, Elephant, Bear, Hippo, Rhino |
| Marsupial | Kangaroo, Koala, Wombat |
| Regional | Asian Bear, Cervidae, Giraffe |
| Other | Custom |

Presets stored as JSON files. Users can create/edit/export/import custom profiles.

**Step 3: Parameter adjustment**

All values overridable after preset selection.

### Data Structure

```typescript
interface SpeciesProfile {
  id: string;
  name: string;
  icon: string;
  
  reproductionType: 'viviparous' | 'oviparous' | 'marsupial';
  gestationOrIncubation: number;  // days
  pouchDays?: number;             // marsupial only
  offspringTerm: string;          // litter | clutch | joey
  typicalOffspringCount: { min: number; max: number };
  breedingAge: { male: number; female: number };  // days
  
  sexTerms: { male: string; female: string };
  defaultFields: string[];
  importAliases: Record<string, string[]>;
  
  isBuiltIn: boolean;
}
```

### Profile Scope

- **Project level**: default species set at project creation
- **Individual level**: optional `species?: string` override per individual
- Different-species individuals get subtle visual distinction (node border color)

### UI Impact

Species profile affects: node display terms, inspector fields, mating validation (gestation timing), cohort cards (offspring term), import mapping candidates, Paper View conventions.

## Export System

### Opinionated Default

Export button opens minimal panel:

```
247 individuals · CSV

      [ Export Now ]

Other format or mapping ▾    ← collapsed
```

- Default: last-used format + last-used mapping
- First use: CSV, Pedigree Workbench standard format
- Expand shows: segment control (CSV | JSON) + mapping selector

### Standard Format

```csv
id,name,sire_id,dam_id,sex,birth_date,generation,litter,species,status
```

Round-trip guaranteed: export → import → identical data.

### Custom Column Mapping

```typescript
interface ExportMapping {
  id: string;
  name: string;
  columns: Array<{
    sourceField: string;
    outputName: string;
    included: boolean;
  }>;
  createdAt: string;
}
```

Saved to IndexedDB. Reusable across exports.

### Scope Filter

- All individuals (default)
- Current filter applied (if active)
- Selected individuals only

### Preview

Before export: first 5 rows displayed as table for verification.

## Paper View

### Role

Render canvas work at publication/print quality. Replaces current Mermaid-based rendering with custom SVG.

### Output Modes

**1) Pedigree Chart** (default when canvas is in Pedigree mode)

For academic papers, pedigree certificates, registry submissions:
- Standard pedigree symbols (square/circle/diamond)
- Generation-aligned layout with COI display
- Project metadata, legend, summary statistics
- Custom SVG rendering (Mermaid removed)

**2) Cohort Report** (default when canvas is in Cohort mode)

For research reports, facility management, internal review:
- Summary table (totals, sex ratio, genotype completion)
- Litter-grouped individual tables
- Breeding candidate list, validation summary

### Export Formats

- **SVG**: vector, for paper insertion (default)
- **PNG**: 2x resolution, for presentations
- **PDF**: print-ready, page layout (A4/Letter). Generated via Tauri webview print API (native OS print dialog with "Save as PDF" option), no additional PDF library dependency.

### Service Integration

- `pedigree-certificate.ts`: ancestor tree data
- `population-genetics.ts`: summary statistics
- `pedigree-validation.ts`: warning/error summary
- `species-profiles.ts`: species terms + symbol conventions

## App Design Tone

### Opinionated Defaults

The app has opinions. It does not present all options equally.

- Import → always Canvas, never asks
- Auto mode → enters immediately, no prompt
- Export → one button visible, options collapsed
- Project creation → top 5 species prominent, rest searchable

### Micro-interactions (Built Into Base Components)

**Button**
```css
.btn { transition: transform 100ms ease, background 150ms ease; }
.btn:active { transform: scale(0.97); }
```

**ListItem**
```css
.list-item { border-left: 2px solid transparent; transition: border-color 150ms ease, background 150ms ease; }
.list-item[data-selected="true"] { border-left-color: var(--status-active); background: var(--surface-raised); }
```

**Panel**
```css
.inspector-panel { transform: translateX(100%); transition: transform 200ms ease-out; }
.inspector-panel[data-open="true"] { transform: translateX(0); }
```

**Canvas node hover**: overlay method (semi-transparent layer + z-index raise for related nodes)

**Connection line hover**: thickness 1.5px → 2.5px, subtle glow on both endpoint nodes

**Generation band labels**: sticky to left edge during pan

These behaviors are built into base components. Raw `<button>` or `<div onClick>` is caught in code review.

### Color System

- Dark mode is default. Light mode derived via `[data-theme="light"]`.
- First launch: follow OS preference. After explicit switch: persist user choice.
- Base UI: monochrome (slate/zinc). Color only for status: green=ok, yellow=warn, red=error, blue=active/selected.

### Accessibility

- `--text-primary` on `--surface-base`: minimum 4.5:1 (WCAG AA)
- `--text-secondary` on `--surface-base`: minimum 4.5:1 (AA)
- `--text-muted` on `--surface-base`: minimum 3:1 (AA large text)
- Primary vs secondary differentiation: weight and size, not color alone

### Error Tone: Context + Choice

No "An error occurred" messages. Every error states what happened and offers next actions.

**Import error:**
```
Row 3: sire_id "BOR-099" not found in dataset.
This may be an externally sourced sire.
[Create as new individual]  [Skip this row]  [Edit manually]
```

**Circular reference:**
```
Circular pedigree: A-001 → B-003 → A-001
A-001 is set as parent of B-003, which is an ancestor of A-001.
[Remove A-001 → B-003 link]  [Remove B-003 → A-001 link]
```

**File parse failure:**
```
Cannot read this file.
The encoding is not UTF-8 or the file may be corrupted.
Re-saving as Excel (.xlsx) often resolves this.
[Choose another file]
```

**Offline plugin:**
```
This feature requires an internet connection.
All offline analyses are working normally.
```

## Implementation Phases

### Phase 0: Design Token + Component Reference

**No code. Design only.**

Deliverables:
1. **Token file** (design-tokens.css): CSS variables in `:root` block. Color (surface 3-level, text 3-level, status 4-color, border), typography (Inter bundled, size scale 12/13/14/16/20/24), spacing (4px base), rounding (4/6/8/0), shadow (2 levels). Tailwind config references these via `var(--surface-base)` in `theme.extend.colors`. No JSON-to-CSS build step — CSS is the source of truth.
2. **Component reference sheet** (HTML static page): imports design-tokens.css directly. Button (default/hover/active/disabled × 4 variants), ListItem (default/hover/selected), Panel (closed→open), ContextMenu (items, dividers, disabled, danger), StatusDot (4 states). HTML format so AI can replicate at code level, not interpret from image. Token changes auto-reflect in reference sheet.
3. **Canvas node design**: exact dimensions for male (square) / female (circle) / unknown (diamond) nodes. Fixed width with text truncation — max width 140px, names longer than ~20 chars get ellipsis with full name on hover tooltip. Internal text layout (name, ID, badge positions), connector thickness/color, mating node size, litter bracket shape, generation band appearance. These dimensions become constants in layout engine.
4. **Desktop platform decisions**:
   - Titlebar: custom (Linear/Figma style). Height accommodates Windows caption buttons (46×32px). Drag region and traffic lights (macOS) / min-max-close (Windows) positions defined.
   - Font: Inter bundled with app. No system font fallback. Eliminates cross-platform rendering variance (Segoe UI vs SF Pro).
   - Minimum window: 1024×768. Default: 1280×800. No mobile/narrow-screen responsive work.
   - Context menu: custom (not native OS). Full design control, consistent cross-platform. Includes animation, edge collision repositioning, keyboard navigation.
   - Save: local file system via Tauri FS API. Auto-save on change (debounced 2s). No network status indicators.

**Done when**: Tailwind config has custom theme tokens from design-tokens.css. 5 base components have HTML visual reference that imports the token file. Canvas node dimensions are constants ready for layout engine. Desktop platform decisions documented and titlebar height/window constraints configured in tauri.conf.json.

**Not done here**: full screen mockups, Export panel layout, Dashboard widget arrangement.

### Phase 1: Base Components + Theme

Build base components from Phase 0 tokens. Replace raw elements across existing codebase.

**Done when**: existing UI renders with base components, dark/light toggle works.

### Phase 2: Import + Structure Analysis

StructureAnalyzer service, column mapping improvements, Import Summary overlay, error tone.

**Done when**: 250-individual CSV → structure analysis in <3s → canvas render.

### Phase 3: Pedigree Layout + Basic Editing

Mating pair constraints, litter grouping, generation bands, standard symbols, connectors, overlay hover. Plus basic relationship editing: node/line/canvas right-click context menus, assign/remove sire/dam, validation on edit (cycle detection, COI recalculation).

**Done when**: 3-generation pedigree reads like a textbook pedigree chart. Users can right-click to assign/remove sire and dam connections.

### Phase 5: Cohort Mode (parallel with Phase 3)

Card grid layout, cohort context menus (including basic relationship editing within cohort), cohort sidebar, mode transition.

**Done when**: F0-only data displayed as litter cards. Breeding candidates selectable. Basic sire/dam assignment works in cohort mode.

### Phase 4: Advanced Relationship Editing (after Phase 3 + 5)

Drag connection (node handle), pick mode with guidance bar, inline node creation (double-click canvas), Inspector panel Assign buttons linked to pick mode.

**Done when**: power users can drag-connect nodes without context menu. New individuals creatable inline without modal.

### Phase 6: Species Profile Templates (independent)

Reproduction types, ~25 bundled presets, project creation UI, per-individual override, terminology propagation.

**Done when**: ostrich breeder can select profile and work in clutch units.

### Phase 7: Export + Paper View

Opinionated export panel, custom column mapping, Pedigree Chart SVG, Cohort Report, PDF export, Mermaid removal.

**Done when**: Pedigree Chart exportable as SVG insertable into academic paper.

### Phase 8: Integration + Polish

Dashboard-Canvas jump links, plugin UI surfaces, Tauri native menus, 500+ individual performance, E2E tests.

**Done when**: 500-individual dataset loads, pans, and edits at 60fps. All surfaces (Canvas, Dashboard, Paper View) connected. E2E tests cover import → edit → export round-trip.

### Dependency Graph

```
Phase 0 → Phase 1 → Phase 2 ─┬─→ Phase 3 (pedigree + basic edit) ─┬─→ Phase 4 (advanced edit)
                              │                                     │
                              └─→ Phase 5 (cohort + basic edit) ───┘
                                                                    │
                    Phase 6 (independent) ──────────────────────────┤
                                                                    │
                                                              Phase 7 → Phase 8
```

Phase 3 includes basic right-click relationship editing. Phase 5 includes the same basic editing in cohort context. Phase 4 adds power-user features (drag connect, pick mode, inline creation) after both modes have basic editing working.
