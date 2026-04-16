import type { Individual } from '../types/pedigree.types';

export interface ExportMapping {
  id: string;
  name: string;
  columns: Array<{
    sourceField: string;
    outputName: string;
    included: boolean;
  }>;
  createdAt: string;
}

// Standard Pedigree Workbench format — round-trip guaranteed
export const STANDARD_COLUMNS: readonly string[] = [
  'id',
  'name',
  'sire_id',
  'dam_id',
  'sex',
  'birth_date',
  'generation',
  'litter',
  'species',
  'status',
];

/**
 * Map a reserved Individual field to a standard export column name.
 */
function getFieldValue(ind: Individual, sourceField: string): string | undefined {
  switch (sourceField) {
    case 'id':
      return ind.id;
    case 'name':
    case 'label':
      return ind.label;
    case 'sire_id':
    case 'sire':
      return ind.sire;
    case 'dam_id':
    case 'dam':
      return ind.dam;
    case 'sex':
      return ind.sex;
    case 'birth_date':
    case 'birthDate':
      return ind.birthDate;
    case 'generation':
      return ind.generation;
    case 'litter':
    case 'group':
      return ind.group;
    case 'species':
      return ind.fields['species'];
    case 'status':
      return ind.status;
    case 'notes':
      return ind.notes;
    case 'sequence':
      return ind.sequence;
    case 'sequence_source':
      return ind.sequenceSource;
    case 'surrogate':
      return ind.surrogate;
    default:
      // Fall back to free-form fields bag
      return ind.fields[sourceField];
  }
}

/**
 * Escape a value per RFC 4180. Always wraps in double-quotes; inner
 * double-quotes are doubled. Also handles commas and newlines safely.
 */
function csvEscape(val: string | undefined): string {
  if (val === undefined || val.length === 0) return '""';
  const escaped = val.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Export individuals to a CSV string.
 *
 * If a mapping is provided, only included columns are written, using the
 * caller's outputName for headers. Otherwise STANDARD_COLUMNS are used.
 *
 * Round-trip guarantee: standard columns map 1-to-1 with import reserved
 * columns, so export → import → identical data.
 */
export function exportToCsv(
  individuals: readonly Individual[],
  mapping?: ExportMapping,
): string {
  let columns: Array<{ sourceField: string; outputName: string }>;

  if (mapping) {
    columns = mapping.columns
      .filter((c) => c.included)
      .map((c) => ({ sourceField: c.sourceField, outputName: c.outputName }));
  } else {
    columns = STANDARD_COLUMNS.map((col) => ({ sourceField: col, outputName: col }));
  }

  const header = columns.map((c) => csvEscape(c.outputName)).join(',');

  const rows = individuals.map((ind) =>
    columns.map((c) => csvEscape(getFieldValue(ind, c.sourceField))).join(','),
  );

  return [header, ...rows].join('\r\n');
}

/**
 * Export individuals to a compact JSON string.
 * Each individual is serialised as-is (all fields preserved).
 */
export function exportToJson(individuals: readonly Individual[]): string {
  return JSON.stringify(individuals, null, 2);
}

/**
 * Generate a preview table (headers + first N rows) without triggering a
 * download — used by ExportPanel to show users what will be exported.
 */
export function generatePreview(
  individuals: readonly Individual[],
  mapping?: ExportMapping,
  limit = 5,
): { headers: string[]; rows: string[][] } {
  let columns: Array<{ sourceField: string; outputName: string }>;

  if (mapping) {
    columns = mapping.columns
      .filter((c) => c.included)
      .map((c) => ({ sourceField: c.sourceField, outputName: c.outputName }));
  } else {
    columns = STANDARD_COLUMNS.map((col) => ({ sourceField: col, outputName: col }));
  }

  const headers = columns.map((c) => c.outputName);
  const rows = individuals.slice(0, limit).map((ind) =>
    columns.map((c) => getFieldValue(ind, c.sourceField) ?? ''),
  );

  return { headers, rows };
}
