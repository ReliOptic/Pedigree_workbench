# Pedigree Workbench Product Philosophy

## Position

Pedigree Workbench is a modern local pedigree decision workstation.

It is not meant to replace the analytical strengths of legacy pedigree software with a simplified visual demo. It exists to carry forward the practical value of those legacy tools while removing the setup friction, weak readability, and data-to-judgment gap that older applications still leave in day-to-day use.

The benchmark is not "can it display nodes?" The benchmark is "can a breeder, geneticist, or pedigree operator make a better decision faster on a real dataset?"

## Legacy Continuity

Legacy pedigree applications remain relevant because they solved real domain problems:

- maintaining multi-generation records
- reviewing sire and dam relationships
- checking inbreeding risk
- comparing potential matings
- generating certificates and formal pedigree outputs
- keeping custom animal, breeding, and registry fields in one place

Pedigree Workbench should explicitly inherit that mission.

What it must preserve from legacy software:

- pedigree as a working structure, not just a report
- relationship-first thinking
- support for species-specific workflows
- strong import and record-keeping capability
- practical outputs such as certificates, review summaries, and validation flags

What it must improve over legacy software:

- lower setup friction
- better readability for long working sessions
- stronger bulk-data interpretation
- clearer distinction between summary, editing, and decision surfaces
- easier integration of genetics-aware analysis without forcing users into a brittle data model

## Core Belief

Users do not open pedigree software because they want to manage a database.

They open it because they need to answer questions like:

- Who is related to whom?
- Is this mating risky?
- What information is missing before I can trust this record?
- What does this imported dataset actually mean as a pedigree?
- Can I export a defensible record or certificate from this work?

The product therefore exists to convert raw pedigree data into a decision surface.

## Product Definition

Pedigree Workbench is:

- a local-first workstation
- a relationship analysis environment
- a validation and review surface
- a bridge between legacy pedigree practice and modern usability

Pedigree Workbench is not:

- a generic graph editor
- a dashboard-first BI app
- a cloud database admin tool
- a decorative visualization layer over spreadsheets

## Primary Users

### 1. Breeding and husbandry operators

They need to review lineage, mating suitability, animal groups, and record quality on real operational datasets.

### 2. Genetics and research teams

They need to combine pedigree structure with genotype or gene-editing information, without losing the practical readability of the pedigree itself.

### 3. Registry and documentation workflows

They need to generate pedigree summaries, certificates, and traceable outputs from maintained lineage data.

## Main Product Promise

Import a real pedigree dataset, understand it as a pedigree, identify risk or missing information, and continue working without leaving the workbench.

That promise has four implications:

1. Bulk import must become structure, not a pile of nodes.
2. Workbench editing must remain in the workbench.
3. Analysis must support action, not just display metrics.
4. Visual design must serve legibility before style.

## UX Principles

### 1. The Workbench Is The Primary Stage

The dashboard is a summary surface. The workbench is the primary operational surface.

If the user is adding, editing, connecting, or reviewing animals, they should remain in the workbench unless they explicitly choose another view.

Implication:

- adding a node must not bounce the user to the dashboard
- import should typically land the user in a structure-oriented workbench state

### 2. Structure Before Metrics

When a large file is imported, the first responsibility of the product is to help the user read the pedigree structure.

Metrics, summaries, and warnings help only after the user can see the lineage clearly.

Implication:

- bulk upload should emphasize generation grouping, parent gaps, clusters, and relationship meaning
- dashboard metrics should not replace pedigree readability

### 3. Relationship Editing Is A First-Class Action

Pedigree software is fundamentally about relationships, not just entities.

If users want to directly shape or inspect links, the product must treat that as a core workflow rather than a side effect of form editing.

Implication:

- sire, dam, mating, and lineage edits should feel direct
- future interaction design should support easier relationship editing in-canvas or near-canvas

### 4. Dark Mode Must Optimize For Long-Session Readability

This is a specialist tool, not a marketing page.

Any theme mode must maintain strong contrast, clear state colors, readable labels, and accessible interaction targets.

Implication:

- readability wins over atmosphere
- state colors, text, panel surfaces, and overlays must be tested for accessibility and practical fatigue

### 5. Analysis Must Collapse Into Decisions

COI, validation, species profiles, genotype interpretation, and population statistics are only useful if they guide the next action.

Implication:

- analysis should be attached to the record, mating, or project where the decision is made
- warnings and summaries should answer "what should I inspect next?"

### 6. Certificates And Exports Are Operational Outputs

Exports are not a bonus feature. In many lineage workflows, the product is only complete when it can produce a usable record outside the app.

Implication:

- backup, restore, certificate generation, and formal export paths should be stable, explicit, and predictable

## View Roles

### Dashboard

Purpose:

- summarize project health
- show validation issues
- show population-level metrics
- help the user identify what deserves attention

Dashboard should answer:

- Is this dataset healthy enough to trust?
- Where are the missing or risky areas?
- Which generation or group needs review?

### Workbench

Purpose:

- inspect lineage
- edit individuals and relationships
- review direct consequences of changes
- stay close to the pedigree structure

Workbench should answer:

- What is the actual pedigree here?
- What changed when I add or modify a record?
- How do these individuals relate?

### Paper / Export Views

Purpose:

- generate presentation and record outputs
- support publication, documentation, or registry-style export

## Genetics Plugin Philosophy

### Why Plugins Exist

Pedigree Workbench should not hard-code one genetics workflow forever.

Different teams care about different loci, assays, species, and research conventions. The plugin model exists so the core app remains a pedigree workstation while locus-specific logic can be layered on top.

### Current State In Code

The current plugin system already has:

- a registry
- a plugin API with analysis and render slots
- built-in plugins for `CD163` and `ESMFold`
- locus registration into `genotype-resolver`

Current built-in plugin examples:

- `built-in:cd163`
- `built-in:esmfold`

### Offline Operating Model

Because this is a local-first app, the default plugin model should be:

- local registration
- local field mapping
- local parsing and scoring
- local rendering of derived insights

That means the normal plugin path should not require cloud connectivity.

Examples of offline-capable plugin behavior:

- register acceptable field names for a locus
- parse raw genotype strings from CSV or JSON imports
- classify genotype or KO efficiency
- attach warnings or summaries to records
- provide dashboard widgets or inspector panels based on local calculations

### Online-Optional Model

Some analysis is inherently remote, such as large structure-prediction APIs.

Those features should be treated as optional online augmentations, not core assumptions.

Rule:

- the app remains fully useful without network access
- remote plugins are additive, not foundational
- any remote plugin must clearly declare that it is online-dependent

`ESMFold` belongs in this second category.

### Practical Plugin Lifecycle

The intended lifecycle should be:

1. Import data with raw locus fields.
2. Plugin registers field aliases with the genotype resolver.
3. Core app resolves known loci locally.
4. Plugin returns analysis results for individuals or projects.
5. UI surfaces those results in inspector, dashboard, canvas, or toolbar slots.

### Plugin Boundaries

Plugins should own:

- locus-specific parsing
- locus-specific analysis
- optional locus-specific UI surfaces
- optional export enrichments

The core app should own:

- pedigree structure
- projects, import, backup, restore
- general lineage editing
- general validation
- general layout and readability

## Product Consequences

If this philosophy is accepted, the next UX and implementation priorities become clearer:

1. Keep add/edit flows inside the workbench.
2. Improve dark-mode contrast systematically.
3. Make large imports resolve into meaningful structure faster.
4. Strengthen relationship editing, not just node editing.
5. Move genetics plugins from hidden service logic toward visible, decision-support UI.

## One-Sentence Summary

Pedigree Workbench should feel like the modern successor to legacy pedigree software: equally serious about lineage work, but much better at helping users read, validate, and act on real pedigree data.
