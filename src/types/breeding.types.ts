/**
 * Breeding intelligence domain types.
 *
 * These types support the Founder Cohort Dashboard and downstream
 * breeding analysis services introduced in the Breeding Intelligence Pivot.
 */

export type ActiveView = 'dashboard' | 'workbench' | 'paper';

export interface LitterGroup {
  readonly groupId: string;
  readonly surrogate?: string;
  readonly individuals: readonly string[]; // individual IDs
  readonly sexDistribution: { male: number; female: number; unknown: number };
}

export interface CohortStats {
  readonly totalCount: number;
  readonly sexDistribution: { male: number; female: number; unknown: number };
  readonly generationBreakdown: ReadonlyMap<string, number>;
  readonly litterGroups: readonly LitterGroup[];
  readonly statusDistribution: ReadonlyMap<string, number>;
  readonly breedingCandidateCount: number;
}

export interface MissingDataAlert {
  readonly field: string;
  readonly missingCount: number;
  readonly totalCount: number;
  readonly rate: number;
  readonly severity: 'low' | 'medium' | 'high';
}

/** Resolved genotype data for an individual — locus-agnostic */
export interface GenotypeStatus {
  /** All detected locus values from the individual's fields */
  loci: Record<string, string>;
  /** Legacy: primary locus value (first detected or user-configured) */
  primaryLocus?: string;
  primaryValue?: string;
}

export type KOEfficiency = number | null;

export interface NextStep {
  readonly label: string;
  readonly done: boolean;
}
