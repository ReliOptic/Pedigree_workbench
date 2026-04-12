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

export interface GenotypeStatus {
  readonly cd163?: string; // KO efficiency (0-1 numeric)
  readonly genotype?: string; // raw bp del/ins pattern
}
