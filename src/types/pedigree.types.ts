/**
 * Domain types for the Pedigree Workbench.
 *
 * These types are the contract between the data-access layer
 * (`src/services/pedigree-store.ts`) and the presentation layer
 * (`src/components/**`). They are intentionally framework-free.
 */

export type Gender = 'male' | 'female' | 'unknown';

/**
 * A single individual in a pedigree graph. Identifiers are caller-supplied
 * strings (typically lab identifiers) and must be unique within a dataset.
 */
export interface Individual {
  readonly id: string;
  readonly label: string;
  readonly gender: Gender;
  readonly generation: number;
  readonly isProband?: boolean;
  readonly isVerified?: boolean;
  readonly birthDate?: string;
  readonly karyotype?: string;
  readonly phenotype?: string;
  readonly consanguinity?: boolean;
  readonly notes?: string;
  readonly hpoAnnotations?: readonly string[];
  readonly sireId?: string;
  readonly damId?: string;
}

/**
 * Aggregate snapshot of a pedigree dataset, used for status displays.
 */
export interface PedigreeSummary {
  readonly totalIndividuals: number;
  readonly generations: number;
}
