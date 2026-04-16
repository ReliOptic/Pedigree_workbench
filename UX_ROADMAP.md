# Pedigree Workbench UX Roadmap

## Purpose

This roadmap translates `PRODUCT_PHILOSOPHY.md` into concrete UX and product work.

The goal is not to add more isolated features. The goal is to make Pedigree Workbench feel like the practical successor to legacy pedigree software while remaining easier to read, easier to trust, and easier to operate on real datasets.

## Current Diagnosis

The product already has meaningful analytical depth:

- pedigree layout engine
- COI calculation
- trial mating preview
- validation services
- species profiles
- certificate generation
- population genetics summaries
- plugin architecture for genetics workflows

The main weakness is not raw capability. The weakness is integration.

Users can feel that parts of the system exist, but they do not consistently feel like one coherent workbench.

## Product Objective

Turn Pedigree Workbench from a feature-rich pedigree viewer into a decision-first pedigree workstation.

## Guiding UX Principles

1. The workbench is the primary stage for action.
2. Imported data must become readable pedigree structure quickly.
3. Relationship editing is as important as node editing.
4. Visual accessibility outranks stylistic preference.
5. Analysis must help the user decide what to do next.
6. Exports and certificates are operational outputs, not secondary extras.

## Priority Order

## Phase A: Workflow Coherence

### A1. Keep Add/Edit Flows Inside The Workbench

Problem:

- users lose context when node creation or import workflows redirect them toward summary views

Outcome:

- node creation, editing, and relationship work keep the user inside the workbench by default

Actions:

- keep `Add Node` completion in the current workbench view
- avoid automatic switches to dashboard after local editing actions
- reserve dashboard switching for explicit user intent or clearly defined import heuristics

Success signal:

- users feel they are continuously editing the pedigree rather than being bounced between modes

### A2. Clarify View Roles

Problem:

- dashboard and workbench feel like competing first-class homes

Outcome:

- users understand what each view is for immediately

Actions:

- dashboard: summary, quality, warnings, cohort-level review
- workbench: lineage inspection, editing, relationship work
- paper: formal output and presentation

Success signal:

- users do not ask why they are in a given view

## Phase B: Visual Accessibility And Readability

### B1. Dark Mode Contrast Pass

Problem:

- current dark mode harms readability and confidence during long sessions

Outcome:

- high-contrast, specialist-tool dark theme with clear text, separators, states, and overlays

Actions:

- audit text/background contrast across top bar, inspector, dashboard cards, modals, overlays, badges, and canvas controls
- normalize state colors for warnings, errors, success, and neutral panels
- reduce low-contrast gray-on-gray combinations
- test dense screens, not just isolated components

Success signal:

- dark mode is usable for sustained work, not just visually acceptable in screenshots

### B2. Workbench Visual Hierarchy

Problem:

- important pedigree information competes with secondary UI chrome

Outcome:

- lineage, selection, warnings, and active edit context become visually dominant

Actions:

- strengthen selected-node state
- clarify relationship lines and parent/offspring reading order
- reduce decorative noise around toolbars and panels

Success signal:

- users can parse the pedigree structure faster without hunting for context

## Phase C: Large Dataset Interpretation

### C1. Bulk Import To Meaningful Structure

Problem:

- large imports can feel like a pile of nodes rather than a pedigree

Outcome:

- importing a large file produces a readable lineage-oriented first impression

Actions:

- improve initial framing and fit behavior for large datasets
- emphasize generations, groups, missing parents, and disconnected clusters
- provide import summary panels that explain what was detected
- highlight structural issues such as missing lineage anchors and validation failures

Success signal:

- users importing large files can immediately answer “what dataset did I just load?”

### C2. Project Intake For Real-World Files

Problem:

- users often start from operational spreadsheets, not clean pedigree-native datasets

Outcome:

- import feels like onboarding a pedigree project, not just reading a file

Actions:

- improve import messaging for F0-only, shallow-generation, and partially-linked datasets
- surface what the app can and cannot infer from the current file
- preserve trust by explaining missing pedigree depth rather than pretending it exists

Success signal:

- fewer cases where users feel the app “loaded the file but did not understand it”

## Phase D: Relationship Editing And Workbench Power

### D1. Better Relationship Editing

Problem:

- users want to work with lineage relationships directly, not only through forms

Outcome:

- pedigree editing feels closer to actual pedigree reasoning

Actions:

- define direct relationship-edit interactions for sire, dam, and mating links
- explore line-based or connection-based editing affordances
- allow quick correction of parent assignments from workbench context

Success signal:

- the app feels like a pedigree tool, not a node property editor

### D2. Workbench Actions Around Existing Analytics

Problem:

- analytics exist, but actions still feel detached

Outcome:

- users can move from warning to corrective action without mental context switching

Actions:

- let validation issues jump to the relevant record or cluster
- let breeding-risk views move directly into mating review
- let COI and pedigree warnings stay visible near workbench operations

Success signal:

- analysis shortens the path to action instead of creating another panel to read

## Phase E: Genetics Plugins As Real Product Surface

### E1. Make Plugin Results Visible And Predictable

Problem:

- plugin-capable architecture exists, but the plugin model is not yet a clear user-facing workflow

Outcome:

- users understand what genetics plugins do and where their results appear

Actions:

- define visible plugin zones in inspector and dashboard
- standardize plugin summaries, warnings, and locus displays
- separate offline plugins from online-optional plugins in product language

Success signal:

- the plugin system feels intentional rather than internal

### E2. Offline-First Genetics Workflow

Problem:

- the app needs a genetics model that respects local-first operation

Outcome:

- local pedigree work remains complete without network access

Actions:

- treat field mapping, genotype parsing, KO or marker interpretation, and local warnings as offline baseline features
- treat remote inference such as structure prediction as optional augmentation
- document plugin lifecycle from import to resolved locus to surfaced analysis

Success signal:

- users can trust the app as a serious offline pedigree workstation even when remote services are unavailable

## Phase F: Outputs And Operational Confidence

### F1. Certificates And Formal Outputs

Problem:

- exports exist but are not yet central to the product story

Outcome:

- users see backup, restore, certificate, and paper outputs as first-class deliverables

Actions:

- refine certificate export UX
- define official output formats for record exchange and review
- make backup and restore feel reliable and explicit

Success signal:

- users trust the app not just for working data, but for final pedigree artifacts

### F2. Validation As Trust Infrastructure

Problem:

- users need confidence that what they are seeing is structurally sound

Outcome:

- validation becomes part of product trust, not just debugging

Actions:

- distinguish hard errors from soft warnings clearly
- provide clear remediation paths
- connect validation to imports, project health, and workbench navigation

Success signal:

- users can tell whether the pedigree is safe to act on

## Recommended Immediate Sprint Order

1. Keep add/edit flows in the workbench
2. Run a dark-mode contrast overhaul
3. Improve large-import structure interpretation
4. Define direct relationship-editing interactions
5. Make plugin and genetics surfaces explicit

## Non-Goals For Now

- turning the product into a generic graph editor
- cloud-first collaboration as a core requirement
- decorative redesign before readability repair
- adding more analysis modules before current modules are operationally integrated

## Success Definition

Pedigree Workbench succeeds when a user can load a real pedigree dataset, understand the structure, spot risk and missing data, edit relationships confidently, and export useful pedigree outputs without fighting the interface.
