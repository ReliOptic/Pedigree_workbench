# Workbench Modes

## Why Modes Exist

Pedigree Workbench serves two different jobs that look similar on screen but are not the same task.

### 1. Cohort Work

This is the right model when users are working with:

- F0-only founder cohorts
- litter or group-based intake files
- status review
- genotype completeness review
- breeding candidate screening

The user is not primarily reading a pedigree tree yet. The user is reading a managed cohort.

### 2. Pedigree Construction

This is the right model when users are working with:

- sire or dam assignment
- F0 to F1 and later generation structure
- multi-generation lineage review
- pedigree risk and ancestry inspection
- mating and offspring planning

The user is reading relationships first.

## Product Rule

Pedigree Workbench must not force one layout model to carry both jobs.

If the app uses cohort layout for relationship-heavy work, the pedigree concept collapses.

If the app uses pedigree layout for large unlinked F0 intake files, the workbench becomes a flat strip of nodes and stops being readable.

The product therefore needs explicit workbench modes.

## Modes

### Auto

Auto is the default.

The app recommends the mode based on dataset structure:

- `Cohort` when the project is effectively a founder-only intake set
- `Pedigree` when relationship structure is present

### Cohort

Use cohort mode when the project is being reviewed as an operational founder set.

Primary reading order:

- litter or group
- status
- sex completeness
- genotype completeness
- breeding readiness

Expected visual structure:

- group or litter cards
- card-level counts
- dense but readable node grids
- reduced emphasis on relationship lines

### Pedigree

Use pedigree mode when the user is constructing or reviewing lineage.

Primary reading order:

- sire and dam relationships
- generation depth
- offspring structure
- ancestry and lineage risk

Expected visual structure:

- generation-first layout
- relationship lines as first-class signals
- litter as metadata or filter, not layout owner

## Automatic Transition Rules

The app should use these rules in order:

1. If the dataset has no parent links, only one practical generation, and multiple litter or group values, `Auto` resolves to `Cohort`.
2. If the dataset contains sire or dam links, or explicit mating structure, `Auto` resolves to `Pedigree`.
3. If the user manually chooses `Pedigree`, keep pedigree layout.
4. If the user manually chooses `Cohort`, only honor it when the dataset is still founder-cohort shaped.
5. If the user tries to stay in `Cohort` after meaningful pedigree structure exists, the app should fall back to `Pedigree`.

## Interaction Expectations

### Cohort Mode Panel

The panel should help with:

- generation focus
- litter focus
- missing data review
- candidate selection
- cohort quality inspection

### Pedigree Mode Panel

The panel should help with:

- add child
- assign sire
- assign dam
- create mating
- navigate generations
- inspect lineage consequences

## Design Constraint

Modes must feel like two working surfaces in one professional tool, not like unrelated visual themes.

That means:

- the same project can move between modes
- filters and selection should survive the mode change when possible
- users must understand why the mode changed

## User Fit

This mode model is designed for:

- biologists handling founder cohorts
- breeders planning lineage and mating work
- veterinarians reviewing population structure and record quality
- zoo and wildlife managers maintaining traceable lineage records

The point is not to make the product abstractly flexible.

The point is to preserve the meaning of pedigree work while still supporting the reality that many users begin with cohort-like intake data before true pedigree structure exists.
