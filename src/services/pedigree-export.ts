import type { Individual } from '../types/pedigree.types';

/**
 * Export pedigree data as a CSV string.
 *
 * Columns: all reserved fields in a fixed order, then every unique free-form
 * key found across individuals (sorted alphabetically). Values are
 * double-quoted and inner quotes escaped per RFC 4180.
 */
export function toCsv(individuals: readonly Individual[]): string {
  const reservedCols = [
    'id',
    'label',
    'sex',
    'generation',
    'sire',
    'dam',
    'group',
    'surrogate',
    'birth_date',
    'status',
    'sequence',
    'sequence_source',
  ] as const;

  // Collect every unique free-form key.
  const freeKeys = new Set<string>();
  for (const ind of individuals) {
    for (const k of Object.keys(ind.fields)) freeKeys.add(k);
  }
  const sortedFreeKeys = Array.from(freeKeys).sort();

  const allCols = [...reservedCols, ...sortedFreeKeys];

  function escape(val: string | undefined): string {
    if (val === undefined || val.length === 0) return '""';
    const escaped = val.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function getReserved(ind: Individual, col: string): string | undefined {
    switch (col) {
      case 'id':
        return ind.id;
      case 'label':
        return ind.label;
      case 'sex':
        return ind.sex;
      case 'generation':
        return ind.generation;
      case 'sire':
        return ind.sire;
      case 'dam':
        return ind.dam;
      case 'group':
        return ind.group;
      case 'surrogate':
        return ind.surrogate;
      case 'birth_date':
        return ind.birthDate;
      case 'status':
        return ind.status;
      case 'sequence':
        return ind.sequence;
      case 'sequence_source':
        return ind.sequenceSource;
      default:
        return undefined;
    }
  }

  const header = allCols.join(',');
  const rows = individuals.map((ind) => {
    return allCols
      .map((col) => {
        const reserved = getReserved(ind, col);
        if (reserved !== undefined) return escape(reserved);
        // Free-form field.
        return escape(ind.fields[col]);
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

/** Trigger a browser download of text content as a file. */
export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
