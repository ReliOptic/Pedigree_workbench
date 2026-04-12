/**
 * Kinship computation service.
 *
 * Implements Wright's coefficient of relationship (r) using an ancestor path
 * approach. This is NOT the inbreeding coefficient (F) — it is the probability
 * that a random allele drawn from individual A is identical-by-descent to a
 * random allele drawn from individual B.
 *
 * For F0 founders (no sire/dam in the dataset), all pairs have r = 0
 * (assumed unrelated by convention).
 *
 * Returns only pairs where coefficient > 0 to keep the matrix sparse.
 */

import type { Individual } from '../types/pedigree.types';

export interface KinshipPair {
  readonly id1: string;
  readonly id2: string;
  /** Wright's coefficient of relationship, 0–1. */
  readonly coefficient: number;
  /** Human-readable relationship label. */
  readonly relationship: string;
  /** IDs of shared ancestors. */
  readonly commonAncestors: readonly string[];
}

// ---------------------------------------------------------------------------
// Relationship classification
// ---------------------------------------------------------------------------

/**
 * Classify a Wright's coefficient of relationship into a human-readable label.
 * These thresholds are approximate for diploid organisms.
 */
export function classifyRelationship(coefficient: number): string {
  if (coefficient >= 0.5) return 'parent-child / full-siblings';
  if (coefficient >= 0.25) return 'half-siblings / grandparent';
  if (coefficient >= 0.125) return 'first cousins';
  if (coefficient > 0) return 'distant relatives';
  return 'unrelated';
}

// ---------------------------------------------------------------------------
// Ancestor map builder
// ---------------------------------------------------------------------------

/**
 * Build a map from individual ID to all ancestor IDs (inclusive of self),
 * with the depth from the individual to each ancestor.
 */
function buildAncestorDepths(
  id: string,
  parentMap: ReadonlyMap<string, readonly string[]>,
  cache: Map<string, Map<string, number>>,
): Map<string, number> {
  const cached = cache.get(id);
  if (cached !== undefined) return cached;

  const result = new Map<string, number>();
  result.set(id, 0);

  const parents = parentMap.get(id) ?? [];
  for (const parentId of parents) {
    const parentAncestors = buildAncestorDepths(parentId, parentMap, cache);
    for (const [anc, depth] of parentAncestors) {
      const existing = result.get(anc);
      const newDepth = depth + 1;
      if (existing === undefined || newDepth < existing) {
        result.set(anc, newDepth);
      }
    }
  }

  cache.set(id, result);
  return result;
}

// ---------------------------------------------------------------------------
// Path coefficient computation
// ---------------------------------------------------------------------------

/**
 * Compute Wright's coefficient of relationship between two individuals using
 * the path coefficient method:
 *   r(A,B) = Σ_k  (1/2)^(n_A + n_B + 1)
 * where the sum is over common ancestors k, and n_A / n_B are the number of
 * steps from A / B to ancestor k respectively.
 *
 * We use the simplified form that ignores inbreeding of the common ancestor
 * itself (F_k = 0 assumption), which is appropriate for F0 founder cohorts.
 */
function computeCoefficient(
  depthsA: ReadonlyMap<string, number>,
  depthsB: ReadonlyMap<string, number>,
  selfId: string,
  otherId: string,
): { coefficient: number; commonAncestors: string[] } {
  // Common ancestors: present in both depth maps, but NOT the individuals themselves
  const commons: string[] = [];
  let r = 0;

  for (const [anc, depthA] of depthsA) {
    if (anc === selfId || anc === otherId) continue;
    if (!depthsB.has(anc)) continue;
    const depthB = depthsB.get(anc)!;
    // Path coefficient contribution: (1/2)^(depthA + depthB + 1)
    r += Math.pow(0.5, depthA + depthB + 1);
    if (!commons.includes(anc)) commons.push(anc);
  }

  return { coefficient: r, commonAncestors: commons };
}

// ---------------------------------------------------------------------------
// Inbreeding coefficient helpers
// ---------------------------------------------------------------------------

/**
 * Compute the inbreeding coefficient (F) for a single individual.
 * F = f(sire, dam) where f is the kinship coefficient between parents.
 * computeCoefficient returns the kinship coefficient (not relationship r).
 * Returns 0 if either parent is unknown or not in the dataset.
 */
export function computeInbreedingCoefficient(
  id: string,
  individuals: readonly Individual[],
): number {
  const ind = individuals.find(i => i.id === id);
  if (!ind?.sire || !ind?.dam) return 0;

  const idSet = new Set(individuals.map(i => i.id));
  const sireInDataset = idSet.has(ind.sire);
  const damInDataset = idSet.has(ind.dam);
  if (!sireInDataset || !damInDataset) return 0;

  // Build parent map for ancestor traversal.
  const parentMap = new Map<string, string[]>();
  for (const i of individuals) {
    const parents: string[] = [];
    if (i.sire && i.sire.trim() !== '' && idSet.has(i.sire)) parents.push(i.sire);
    if (i.dam && i.dam.trim() !== '' && idSet.has(i.dam)) parents.push(i.dam);
    parentMap.set(i.id, parents);
  }

  const ancestorCache = new Map<string, Map<string, number>>();
  const depthsSire = buildAncestorDepths(ind.sire, parentMap, ancestorCache);
  const depthsDam = buildAncestorDepths(ind.dam, parentMap, ancestorCache);
  const { coefficient } = computeCoefficient(depthsSire, depthsDam, ind.sire, ind.dam);
  return coefficient;
}

export interface COIResult {
  id: string;
  coefficient: number;  // 0 to 1
  risk: 'none' | 'low' | 'moderate' | 'high';
}

function classifyCOIRisk(f: number): 'none' | 'low' | 'moderate' | 'high' {
  if (f < 0.0001) return 'none';
  if (f < 0.0625) return 'low';
  if (f < 0.125) return 'moderate';
  return 'high';
}

export function computeAllCOI(individuals: readonly Individual[]): COIResult[] {
  return individuals.map(ind => {
    const coefficient = computeInbreedingCoefficient(ind.id, individuals);
    return { id: ind.id, coefficient, risk: classifyCOIRisk(coefficient) };
  });
}

/**
 * Predict the inbreeding coefficient of a hypothetical offspring.
 * F(offspring) = f(sire, dam) where f is the kinship coefficient.
 */
export function predictOffspringCOI(
  sireId: string,
  damId: string,
  individuals: readonly Individual[],
): number {
  const idSet = new Set(individuals.map(i => i.id));
  const sireExists = idSet.has(sireId);
  const damExists = idSet.has(damId);
  if (!sireExists || !damExists) return 0;

  const parentMap = new Map<string, string[]>();
  for (const i of individuals) {
    const parents: string[] = [];
    if (i.sire && i.sire.trim() !== '' && idSet.has(i.sire)) parents.push(i.sire);
    if (i.dam && i.dam.trim() !== '' && idSet.has(i.dam)) parents.push(i.dam);
    parentMap.set(i.id, parents);
  }

  const ancestorCache = new Map<string, Map<string, number>>();
  const depthsSire = buildAncestorDepths(sireId, parentMap, ancestorCache);
  const depthsDam = buildAncestorDepths(damId, parentMap, ancestorCache);
  const { coefficient } = computeCoefficient(depthsSire, depthsDam, sireId, damId);
  return coefficient;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute all pairwise kinship pairs for a cohort.
 * Returns only pairs where coefficient > 0 (related individuals).
 *
 * Time complexity: O(N^2 * A) where A is the average number of ancestors.
 * Suitable for cohorts up to ~500 individuals.
 */
export function computeKinshipMatrix(individuals: readonly Individual[]): KinshipPair[] {
  if (individuals.length < 2) return [];

  const idSet = new Set(individuals.map((i) => i.id));

  // Build parent map: id -> [sire, dam] (only known parents in dataset)
  const parentMap = new Map<string, string[]>();
  for (const ind of individuals) {
    const parents: string[] = [];
    if (ind.sire && ind.sire.trim() !== '' && idSet.has(ind.sire)) {
      parents.push(ind.sire);
    }
    if (ind.dam && ind.dam.trim() !== '' && idSet.has(ind.dam)) {
      parents.push(ind.dam);
    }
    parentMap.set(ind.id, parents);
  }

  // If no individual has any known parent, all are founders → all unrelated
  const hasAnyParent = [...parentMap.values()].some((p) => p.length > 0);
  if (!hasAnyParent) return [];

  // Build ancestor depth maps (cached)
  const ancestorCache = new Map<string, Map<string, number>>();
  const depthMaps = new Map<string, Map<string, number>>();
  for (const ind of individuals) {
    depthMaps.set(ind.id, buildAncestorDepths(ind.id, parentMap, ancestorCache));
  }

  const pairs: KinshipPair[] = [];
  const ids = individuals.map((i) => i.id);

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const id1 = ids[i]!;
      const id2 = ids[j]!;
      const depthsA = depthMaps.get(id1)!;
      const depthsB = depthMaps.get(id2)!;
      const { coefficient, commonAncestors } = computeCoefficient(depthsA, depthsB, id1, id2);

      if (coefficient > 0) {
        pairs.push({
          id1,
          id2,
          coefficient: Math.round(coefficient * 10000) / 10000,
          relationship: classifyRelationship(coefficient),
          commonAncestors,
        });
      }
    }
  }

  return pairs;
}
