import * as XLSX from 'xlsx';
import type { CsvParseResult, ColumnMapping } from './pedigree-import-csv';

export interface ExcelParseResult {
  /** Available sheet names in the workbook */
  readonly sheetNames: readonly string[];
  /** Parsed result for the selected sheet (same format as CsvParseResult) */
  readonly result: CsvParseResult;
}

/**
 * Mapping from common header names (lowercased) to reserved column identifiers.
 * Mirrors the aliases used in pedigree-import-csv so Excel import auto-detects
 * the same column names.
 */
import type { ReservedColumn } from '../types/pedigree.types';

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

function buildSuggestedMapping(headers: readonly string[]): readonly ColumnMapping[] {
  const usedReserved = new Set<ReservedColumn>();
  return headers.map((h) => {
    const suggestion = suggestMapping(h);
    if (suggestion !== 'free' && !usedReserved.has(suggestion)) {
      usedReserved.add(suggestion);
      return { fileColumn: h, targetField: suggestion };
    }
    return { fileColumn: h, targetField: 'free' as const };
  });
}

/**
 * Parse an Excel file (.xlsx/.xls) into the same format used by CSV import.
 * Returns sheet names so the user can pick which sheet to import.
 */
export function parseExcel(data: ArrayBuffer, sheetName?: string): ExcelParseResult {
  const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
  const selectedSheet = sheetName ?? workbook.SheetNames[0] ?? '';
  const worksheet = workbook.Sheets[selectedSheet];

  if (worksheet === undefined) {
    throw new Error(`Sheet "${selectedSheet}" not found.`);
  }

  // Convert sheet to array of arrays (all values as strings)
  const rows: string[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][];

  if (rows.length === 0) {
    throw new Error('Sheet is empty.');
  }

  // First row = headers
  const headers = (rows[0] ?? []).map((h) => String(h).trim());
  const dataRows = rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell).trim() !== ''));

  // Build record rows — same shape as PapaParse output used by pedigree-import-csv
  const recordRows: Record<string, string>[] = dataRows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = String(row[i] ?? '').trim();
    });
    return record;
  });

  const suggestedMapping = buildSuggestedMapping(headers);

  return {
    sheetNames: workbook.SheetNames,
    result: {
      headers,
      rows: recordRows,
      suggestedMapping,
    },
  };
}
