/**
 * Rule-based mating recommendation engine.
 *
 * Scores all valid sire × dam pairs and returns them sorted by score
 * (highest = best match). ALL pairs are included — including high-kinship
 * ones — because researchers may intentionally inbreed. Kinship is surfaced
 * as informational, not as a disqualifier.
 *
 * No AI required. Pure deterministic rules.
 */

import type { Individual, Mating } from '../types/pedigree.types';
import type { KinshipPair } from './kinship';
import { classifyRelationship } from './kinship';
import { resolveGenotype } from './genotype-resolver';

export interface MatingCandidate {
  readonly sireId: string;
  readonly damId: string;
  /** Wright's coefficient of relationship (0 = unrelated). */
  readonly kinshipCoefficient: number;
  /** Human-readable relationship label. */
  readonly relationship: string;
  /** 0–100, higher = better match per scoring rules. */
  readonly score: number;
  /** Positive factors. */
  readonly reasons: readonly string[];
  /** Informational notes (not disqualifiers). */
  readonly warnings: readonly string[];
  /** True if a Mating record already exists for this pair (either direction). */
  readonly alreadyMated: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isMale(ind: Individual): boolean {
  const s = (ind.sex ?? '').trim().toLowerCase();
  return s === 'm' || s === 'male' || s === '수컷';
}

function isFemale(ind: Individual): boolean {
  const s = (ind.sex ?? '').trim().toLowerCase();
  return s === 'f' || s === 'female' || s === '암컷';
}

function isBreedingCandidate(ind: Individual): boolean {
  if (!ind.status) return false;
  return (
    ind.status === '교배예정돈' ||
    ind.status.toLowerCase().includes('breeding')
  );
}

function hasGenotype(ind: Individual): boolean {
  const g = resolveGenotype(ind);
  return Boolean(g.loci['CD163'] || g.loci['genotype']);
}

function pairKey(sireId: string, damId: string): string {
  // Canonical key regardless of argument order
  return [sireId, damId].sort().join('::');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate mating recommendations for all valid sire × dam pairs.
 *
 * Scoring (0–100):
 *   Base:            50
 *   Breeding status: +15 each (max +30)
 *   Genotype known:  +10 each (max +20)
 *   Unrelated (r=0): +10
 *   Already mated:   no score penalty (informational flag only)
 *
 * @param individuals   Full cohort
 * @param kinshipPairs  Pre-computed kinship pairs (from computeKinshipMatrix)
 * @param existingMatings  Existing mating records (to flag already-mated pairs)
 */
export function recommendMatings(
  individuals: readonly Individual[],
  kinshipPairs: readonly KinshipPair[],
  existingMatings: readonly Mating[],
): MatingCandidate[] {
  // Build fast kinship lookup
  const kinshipMap = new Map<string, KinshipPair>();
  for (const pair of kinshipPairs) {
    kinshipMap.set(pairKey(pair.id1, pair.id2), pair);
  }

  // Build fast existing-matings lookup
  const matedPairs = new Set<string>();
  for (const m of existingMatings) {
    matedPairs.add(pairKey(m.sireId, m.damId));
  }

  const sires = individuals.filter(isMale);
  const dams = individuals.filter(isFemale);

  const candidates: MatingCandidate[] = [];

  for (const sire of sires) {
    for (const dam of dams) {
      const key = pairKey(sire.id, dam.id);
      const kinshipPair = kinshipMap.get(key);
      const kinshipCoefficient = kinshipPair?.coefficient ?? 0;
      const relationship = classifyRelationship(kinshipCoefficient);

      const reasons: string[] = [];
      const warnings: string[] = [];
      let score = 50;

      // Breeding candidate status
      if (isBreedingCandidate(sire)) {
        score += 15;
        reasons.push(`${sire.label ?? sire.id} is a breeding candidate`);
      }
      if (isBreedingCandidate(dam)) {
        score += 15;
        reasons.push(`${dam.label ?? dam.id} is a breeding candidate`);
      }

      // Genotype data available
      if (hasGenotype(sire)) {
        score += 10;
        reasons.push(`${sire.label ?? sire.id} has genotype data`);
      }
      if (hasGenotype(dam)) {
        score += 10;
        reasons.push(`${dam.label ?? dam.id} has genotype data`);
      }

      // Kinship bonus for unrelated pairs
      if (kinshipCoefficient === 0) {
        score += 10;
        reasons.push('No shared ancestry detected (unrelated)');
      } else {
        // Informational — not a disqualifier
        warnings.push(`Shared ancestry: ${relationship} (r = ${kinshipCoefficient.toFixed(4)})`);
        if (kinshipPair !== undefined && kinshipPair.commonAncestors.length > 0) {
          warnings.push(
            `Common ancestor${kinshipPair.commonAncestors.length > 1 ? 's' : ''}: ${kinshipPair.commonAncestors.join(', ')}`,
          );
        }
      }

      // Missing data warnings (informational)
      if (!sire.sex || sire.sex.trim() === '') {
        warnings.push(`${sire.label ?? sire.id} has no sex recorded`);
      }
      if (!dam.sex || dam.sex.trim() === '') {
        warnings.push(`${dam.label ?? dam.id} has no sex recorded`);
      }
      if (!hasGenotype(sire)) {
        warnings.push(`${sire.label ?? sire.id} has no genotype data`);
      }
      if (!hasGenotype(dam)) {
        warnings.push(`${dam.label ?? dam.id} has no genotype data`);
      }

      candidates.push({
        sireId: sire.id,
        damId: dam.id,
        kinshipCoefficient,
        relationship,
        score: Math.min(100, Math.max(0, score)),
        reasons,
        warnings,
        alreadyMated: matedPairs.has(key),
      });
    }
  }

  // Sort by score descending, then by ID for stable ordering
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.sireId.localeCompare(b.sireId) || a.damId.localeCompare(b.damId);
  });

  return candidates;
}
