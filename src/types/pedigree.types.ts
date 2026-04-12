/**
 * Domain types for the Pedigree Workbench (PRD v3.1).
 *
 * Design principle: the app does not interpret user data. Only three
 * fields are required (`id`, `sire`, `dam`); the rest are optional
 * conveniences the canvas and drawer know how to render when present.
 * All other user columns land in `fields` verbatim and are surfaced in
 * the drawer as raw key/value pairs.
 */

/**
 * A single individual parsed from an imported row.
 *
 * `id` is the only strictly-required field. `sire`/`dam` are string IDs
 * referencing other individuals; when they reference an unknown id the
 * canvas renders a "?" placeholder node.
 *
 * `fields` holds every non-reserved column from the source file so the
 * drawer can display them without losing information.
 */
/** Source of a DNA/RNA sequence attached to an individual. */
export type SequenceSource = 'PCR' | 'Sanger' | 'NGS' | 'Other';

export const SEQUENCE_SOURCES: readonly SequenceSource[] = [
  'PCR',
  'Sanger',
  'NGS',
  'Other',
] as const;

/**
 * IUPAC nucleotide regex (IUPAC codes + gap + whitespace for wrapping).
 * Accepts A/C/G/T/U/N plus degenerate codes R Y S W K M B D H V, case-insensitive.
 */
export const SEQUENCE_REGEX = /^[ACGTUNRYSWKMBDHVacgtunryswkmbdhv\s\-]*$/;

export interface Individual {
  readonly id: string;
  readonly sire?: string;
  readonly dam?: string;
  readonly sex?: string;
  readonly generation?: string;
  readonly group?: string;
  readonly surrogate?: string;
  readonly birthDate?: string;
  readonly status?: string;
  readonly label?: string;
  /** Raw nucleotide sequence (e.g. PCR result). IUPAC codes allowed. */
  readonly sequence?: string;
  /** Provenance label for {@link Individual.sequence}. */
  readonly sequenceSource?: SequenceSource;
  readonly fields: Readonly<Record<string, string>>;
}

/** Reserved column identifiers used by the column-mapping UI. */
export type ReservedColumn =
  | 'id'
  | 'sire'
  | 'dam'
  | 'sex'
  | 'generation'
  | 'group'
  | 'surrogate'
  | 'birth_date'
  | 'status'
  | 'label'
  | 'sequence'
  | 'sequence_source';

export const RESERVED_COLUMNS: readonly ReservedColumn[] = [
  'id',
  'sire',
  'dam',
  'sex',
  'generation',
  'group',
  'surrogate',
  'birth_date',
  'status',
  'label',
  'sequence',
  'sequence_source',
] as const;

/**
 * Aggregate snapshot of a pedigree dataset, used for status displays.
 */
export interface PedigreeSummary {
  readonly totalIndividuals: number;
  readonly generations: number;
  readonly groups: number;
}

/**
 * A named project containing a snapshot of pedigree data.
 * Projects are stored in IndexedDB and allow users to maintain
 * multiple independent datasets (one per CSV import, for example).
 */
export interface Project {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly data: readonly Individual[];
}
