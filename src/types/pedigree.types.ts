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
  | 'label';

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
] as const;

/**
 * Aggregate snapshot of a pedigree dataset, used for status displays.
 */
export interface PedigreeSummary {
  readonly totalIndividuals: number;
  readonly generations: number;
  readonly groups: number;
}
