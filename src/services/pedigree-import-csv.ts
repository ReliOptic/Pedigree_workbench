import Papa from 'papaparse';
import type { Individual, ReservedColumn } from '../types/pedigree.types';

export interface ColumnMapping {
  readonly fileColumn: string;
  readonly targetField: ReservedColumn | 'ignore' | 'free';
}

export interface CsvParseResult {
  readonly headers: readonly string[];
  readonly rows: readonly Record<string, string>[];
  readonly suggestedMapping: readonly ColumnMapping[];
}

/**
 * Mapping from common header names (lowercased) to reserved column identifiers.
 * Supports English and Korean aliases.
 */
const HEADER_ALIASES: ReadonlyMap<string, ReservedColumn> = new Map([
  ['id', 'id'],
  ['개체번호', 'id'],
  ['sire', 'sire'],
  ['아비', 'sire'],
  ['부', 'sire'],
  ['father', 'sire'],
  ['dam', 'dam'],
  ['어미', 'dam'],
  ['모', 'dam'],
  ['mother', 'dam'],
  ['sex', 'sex'],
  ['성별', 'sex'],
  ['gender', 'sex'],
  ['generation', 'generation'],
  ['세대', 'generation'],
  ['gen', 'generation'],
  ['group', 'group'],
  ['그룹', 'group'],
  ['litter', 'group'],
  ['surrogate', 'surrogate'],
  ['대리모', 'surrogate'],
  ['birth_date', 'birth_date'],
  ['birthdate', 'birth_date'],
  ['생년월일', 'birth_date'],
  ['status', 'status'],
  ['상태', 'status'],
  ['label', 'label'],
  ['라벨', 'label'],
  ['이름', 'label'],
  ['sequence', 'sequence'],
  ['염기서열', 'sequence'],
  ['sequence_source', 'sequence_source'],
]);

function suggestMapping(header: string): ReservedColumn | 'free' {
  const normalised = header.trim().toLowerCase();
  return HEADER_ALIASES.get(normalised) ?? 'free';
}

/** Parse CSV text via PapaParse, return headers + rows + auto-suggested mapping. */
export function parseCsv(text: string): CsvParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const headers: string[] = result.meta.fields ?? [];
  const rows: Record<string, string>[] = result.data;

  // Track which reserved columns have already been assigned so we don't
  // map two file columns to the same reserved field.
  const usedReserved = new Set<ReservedColumn>();
  const suggestedMapping: ColumnMapping[] = headers.map((h) => {
    const suggestion = suggestMapping(h);
    if (suggestion !== 'free' && !usedReserved.has(suggestion)) {
      usedReserved.add(suggestion);
      return { fileColumn: h, targetField: suggestion };
    }
    return { fileColumn: h, targetField: 'free' as const };
  });

  return { headers, rows, suggestedMapping };
}

/**
 * Map from {@link ReservedColumn} identifiers to the corresponding
 * property key on {@link Individual}. Most are identical except for
 * the two snake_case → camelCase conversions.
 */
const RESERVED_TO_PROP: Record<ReservedColumn, keyof Omit<Individual, 'fields'>> = {
  id: 'id',
  sire: 'sire',
  dam: 'dam',
  sex: 'sex',
  generation: 'generation',
  group: 'group',
  surrogate: 'surrogate',
  birth_date: 'birthDate',
  status: 'status',
  label: 'label',
  sequence: 'sequence',
  sequence_source: 'sequenceSource',
  notes: 'notes',
};

/** Apply a column mapping to raw rows, producing Individual records. */
export function applyMapping(
  rows: readonly Record<string, string>[],
  mapping: readonly ColumnMapping[],
): Individual[] {
  return rows
    .filter((row) => {
      // Skip rows that have no id mapping or empty id value
      const idMapping = mapping.find((m) => m.targetField === 'id');
      if (idMapping === undefined) return false;
      const idValue = row[idMapping.fileColumn];
      return idValue !== undefined && idValue.trim().length > 0;
    })
    .map((row) => {
      const reserved: Record<string, string> = {};
      const fields: Record<string, string> = {};

      for (const m of mapping) {
        const value = row[m.fileColumn];
        if (value === undefined || value.trim().length === 0) continue;

        if (m.targetField === 'ignore') continue;
        if (m.targetField === 'free') {
          fields[m.fileColumn] = value;
        } else {
          const propKey = RESERVED_TO_PROP[m.targetField];
          reserved[propKey] = value;
        }
      }

      return {
        id: reserved['id'] ?? '',
        ...(reserved['sire'] !== undefined ? { sire: reserved['sire'] } : {}),
        ...(reserved['dam'] !== undefined ? { dam: reserved['dam'] } : {}),
        ...(reserved['sex'] !== undefined ? { sex: reserved['sex'] } : {}),
        ...(reserved['generation'] !== undefined ? { generation: reserved['generation'] } : {}),
        ...(reserved['group'] !== undefined ? { group: reserved['group'] } : {}),
        ...(reserved['surrogate'] !== undefined ? { surrogate: reserved['surrogate'] } : {}),
        ...(reserved['birthDate'] !== undefined ? { birthDate: reserved['birthDate'] } : {}),
        ...(reserved['status'] !== undefined ? { status: reserved['status'] } : {}),
        ...(reserved['label'] !== undefined ? { label: reserved['label'] } : {}),
        ...(reserved['sequence'] !== undefined ? { sequence: reserved['sequence'] } : {}),
        ...(reserved['sequenceSource'] !== undefined
          ? { sequenceSource: reserved['sequenceSource'] as Individual['sequenceSource'] }
          : {}),
        fields,
      } satisfies Individual;
    });
}
