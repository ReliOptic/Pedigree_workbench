import type { Individual } from '../types/pedigree.types';
import { computeAllCOI } from './kinship';

export interface PopulationStats {
  /** Total number of individuals */
  populationSize: number;
  /** Number of unique founders (individuals with no known parents in dataset) */
  founderCount: number;
  /** Average COI across all individuals */
  meanCOI: number;
  /** Maximum COI in the population */
  maxCOI: number;
  /** Proportion of individuals with COI > 0 */
  inbredProportion: number;
  /** Mean number of known ancestors per individual */
  meanAncestorCount: number;
  /** Ancestor Loss Coefficient: actual unique ancestors / theoretical max */
  ancestorLossCoefficient: number;
  /** Generation statistics */
  generationStats: GenerationStat[];
}

export interface GenerationStat {
  generation: string;
  count: number;
  meanCOI: number;
  founderCount: number;
}

/**
 * Identify founders — individuals with no known parents in the dataset.
 */
export function findFounders(individuals: readonly Individual[]): Individual[] {
  const idSet = new Set(individuals.map(i => i.id));
  return individuals.filter(ind => {
    const hasSire = ind.sire && idSet.has(ind.sire);
    const hasDam = ind.dam && idSet.has(ind.dam);
    return !hasSire && !hasDam;
  });
}

/**
 * Count unique ancestors for an individual.
 */
function countUniqueAncestors(
  id: string,
  individuals: readonly Individual[],
): number {
  const idMap = new Map<string, Individual>();
  for (const ind of individuals) idMap.set(ind.id, ind);

  const ancestors = new Set<string>();
  const queue = [id];

  while (queue.length > 0) {
    const current = queue.pop()!;
    const ind = idMap.get(current);
    if (!ind) continue;

    if (ind.sire && idMap.has(ind.sire) && !ancestors.has(ind.sire)) {
      ancestors.add(ind.sire);
      queue.push(ind.sire);
    }
    if (ind.dam && idMap.has(ind.dam) && !ancestors.has(ind.dam)) {
      ancestors.add(ind.dam);
      queue.push(ind.dam);
    }
  }

  return ancestors.size;
}

/**
 * Compute the theoretical maximum ancestors for a given depth.
 * Depth 1 = 2 parents, depth 2 = 2+4=6, depth 3 = 2+4+8=14, etc.
 */
function theoreticalMaxAncestors(depth: number): number {
  let total = 0;
  for (let d = 1; d <= depth; d++) {
    total += Math.pow(2, d);
  }
  return total;
}

/**
 * Compute comprehensive population genetics statistics.
 */
export function computePopulationStats(
  individuals: readonly Individual[],
): PopulationStats {
  const founders = findFounders(individuals);
  const coiResults = computeAllCOI(individuals);

  const coefficients = coiResults.map(r => r.coefficient);
  const meanCOI = coefficients.length > 0
    ? coefficients.reduce((a, b) => a + b, 0) / coefficients.length
    : 0;
  const maxCOI = coefficients.length > 0 ? Math.max(...coefficients) : 0;
  const inbredCount = coefficients.filter(c => c > 0).length;

  // Ancestor counts
  const ancestorCounts = individuals.map(ind => countUniqueAncestors(ind.id, individuals));
  const meanAncestorCount = ancestorCounts.length > 0
    ? ancestorCounts.reduce((a, b) => a + b, 0) / ancestorCounts.length
    : 0;

  // Determine max depth from generations
  const generations = new Set(individuals.map(i => i.generation).filter(Boolean));
  const maxDepth = generations.size > 0 ? generations.size - 1 : 0;
  const theoreticalMax = theoreticalMaxAncestors(maxDepth);
  const totalActualAncestors = ancestorCounts.reduce((a, b) => a + b, 0);
  const totalTheoreticalAncestors = individuals.length * theoreticalMax;
  const ancestorLossCoefficient = totalTheoreticalAncestors > 0
    ? totalActualAncestors / totalTheoreticalAncestors
    : 1;

  // Per-generation stats
  const genMap = new Map<string, Individual[]>();
  for (const ind of individuals) {
    const gen = ind.generation ?? 'unknown';
    const list = genMap.get(gen) ?? [];
    list.push(ind);
    genMap.set(gen, list);
  }

  const idSet = new Set(individuals.map(i => i.id));
  const generationStats: GenerationStat[] = Array.from(genMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([generation, inds]) => {
      const genCOIs = inds.map(ind =>
        coiResults.find(r => r.id === ind.id)?.coefficient ?? 0
      );
      const genFounders = inds.filter(ind => {
        const hasSire = ind.sire && idSet.has(ind.sire);
        const hasDam = ind.dam && idSet.has(ind.dam);
        return !hasSire && !hasDam;
      });

      return {
        generation,
        count: inds.length,
        meanCOI: genCOIs.reduce((a, b) => a + b, 0) / genCOIs.length,
        founderCount: genFounders.length,
      };
    });

  return {
    populationSize: individuals.length,
    founderCount: founders.length,
    meanCOI,
    maxCOI,
    inbredProportion: individuals.length > 0 ? inbredCount / individuals.length : 0,
    meanAncestorCount,
    ancestorLossCoefficient,
    generationStats,
  };
}
