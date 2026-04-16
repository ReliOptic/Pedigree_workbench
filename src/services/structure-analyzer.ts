import type { Individual } from '../types/pedigree.types';

/**
 * Result of analyzing a freshly-imported dataset.
 * Used to drive the Import Summary overlay and auto mode selection.
 */
export interface StructureAnalysis {
  totalIndividuals: number;
  parentLinkCount: number;
  parentLinkRatio: number;
  generationDepth: number;
  orphanReferences: number;
  litterGroupCount: number;
  missingSex: number;
  missingGenotype: number;
  /** Sorted distinct generation labels found in the dataset, e.g. ['F0', 'F1', 'F2'] */
  detectedGenerations: string[];
  recommendedMode: 'cohort' | 'pedigree';
}

/**
 * Analyzes a flat list of individuals immediately after CSV/Excel import.
 *
 * Determines:
 * 1. Relationship presence — parent link count/ratio, generation depth,
 *    orphan references, litter group count.
 * 2. Auto mode recommendation — 'pedigree' when sire/dam structure is
 *    detected; 'cohort' when the dataset is a single-generation litter
 *    collection with no parent links.
 * 3. Import summary stats — all numbers needed by the ImportSummary overlay.
 *
 * Complexity: O(n) over the individual list.
 */
export function analyzeStructure(individuals: readonly Individual[]): StructureAnalysis {
  const total = individuals.length;

  if (total === 0) {
    return {
      totalIndividuals: 0,
      parentLinkCount: 0,
      parentLinkRatio: 0,
      generationDepth: 0,
      orphanReferences: 0,
      litterGroupCount: 0,
      missingSex: 0,
      missingGenotype: 0,
      detectedGenerations: [],
      recommendedMode: 'cohort',
    };
  }

  const idSet = new Set<string>(individuals.map((i) => i.id));
  const generationSet = new Set<string>();
  const litterSet = new Set<string>();

  let parentLinkCount = 0;
  let orphanReferences = 0;
  let missingSex = 0;
  let missingGenotype = 0;

  for (const ind of individuals) {
    // --- Parent link detection ---
    const hasSire = ind.sire !== undefined && ind.sire !== '';
    const hasDam = ind.dam !== undefined && ind.dam !== '';

    if (hasSire || hasDam) {
      parentLinkCount++;
    }

    // Orphan references: parent IDs that are not present in the dataset
    if (hasSire && !idSet.has(ind.sire!)) {
      orphanReferences++;
    }
    if (hasDam && !idSet.has(ind.dam!)) {
      orphanReferences++;
    }

    // --- Generation tracking ---
    const gen = ind.generation?.trim();
    if (gen && gen !== '') {
      generationSet.add(gen);
    }

    // --- Litter / group tracking ---
    const grp = ind.group?.trim();
    if (grp && grp !== '') {
      litterSet.add(grp);
    }

    // --- Missing sex ---
    const sex = ind.sex?.trim();
    if (!sex || sex === '') {
      missingSex++;
    }

    // --- Missing genotype ---
    // A genotype is considered present if `sequence` is set OR if any
    // field key contains "genotype" / "CD163" (common locus names).
    const hasSequence = ind.sequence !== undefined && ind.sequence.trim() !== '';
    const hasGenotypeField = Object.keys(ind.fields).some((k) =>
      /genotype|CD163/i.test(k),
    );
    if (!hasSequence && !hasGenotypeField) {
      missingGenotype++;
    }
  }

  const parentLinkRatio = total > 0 ? parentLinkCount / total : 0;

  // Sorted generation labels — attempt natural sort (F0 < F1 < F2 …)
  const detectedGenerations = Array.from(generationSet).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );

  const generationDepth = detectedGenerations.length;
  const litterGroupCount = litterSet.size;

  // --- Auto mode decision (follows WORKBENCH_MODES.md rules) ---
  // Pedigree: any sire/dam links present → pedigree
  // Cohort:   no parent links + single generation (or no generation data) +
  //           litter/group values present → cohort
  // Default fallback: pedigree (richer editing surface)
  const recommendedMode: 'cohort' | 'pedigree' =
    parentLinkCount === 0 && generationDepth <= 1 && litterGroupCount > 0
      ? 'cohort'
      : 'pedigree';

  return {
    totalIndividuals: total,
    parentLinkCount,
    parentLinkRatio,
    generationDepth,
    orphanReferences,
    litterGroupCount,
    missingSex,
    missingGenotype,
    detectedGenerations,
    recommendedMode,
  };
}
