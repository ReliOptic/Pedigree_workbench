import { ArrowLeft, Upload } from 'lucide-react';

import { RESERVED_COLUMNS, type ReservedColumn } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';
import type { ColumnMapping, CsvParseResult } from '../services/pedigree-import-csv';

interface ColumnMapperProps {
  readonly csvResult: CsvParseResult;
  readonly mapping: readonly ColumnMapping[];
  readonly onMappingChange: (mapping: readonly ColumnMapping[]) => void;
  readonly onBack: () => void;
  readonly onSubmit: () => void;
  readonly t: Translation;
}

const PREVIEW_ROW_COUNT = 3;

/**
 * Column-mapping UI for CSV import.
 *
 * Displays a table of detected CSV headers with dropdowns to assign each
 * to a reserved field, "free field", or "ignore". Shows a preview of the
 * first 3 rows so the user can verify their mapping before importing.
 */
export function ColumnMapper({
  csvResult,
  mapping,
  onMappingChange,
  onBack,
  onSubmit,
  t,
}: ColumnMapperProps): React.JSX.Element {
  const previewRows = csvResult.rows.slice(0, PREVIEW_ROW_COUNT);

  const handleChange = (index: number, value: string): void => {
    const updated = mapping.map((m, i) => {
      if (i !== index) return m;
      return { ...m, targetField: value as ColumnMapping['targetField'] };
    });
    onMappingChange(updated);
  };

  // Compute which reserved columns are already taken (by other rows) so we
  // can disable them in each dropdown.
  const usedReserved = new Set(
    mapping
      .filter(
        (m) =>
          m.targetField !== 'ignore' &&
          m.targetField !== 'free',
      )
      .map((m) => m.targetField),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand">{t.mapColumns}</h3>
        <span className="text-xs text-slate-500">
          {csvResult.rows.length} {t.rowsDetected}
        </span>
      </div>

      {/* Mapping table */}
      <div className="overflow-x-auto border border-border rounded">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-border">
              <th className="text-left p-2 font-medium text-slate-600">CSV Column</th>
              <th className="text-left p-2 font-medium text-slate-600">{t.mapColumns}</th>
              {previewRows.map((_, i) => (
                <th key={i} className="text-left p-2 font-medium text-slate-400">
                  {t.preview} {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mapping.map((m, idx) => (
              <tr key={m.fileColumn} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="p-2 font-mono text-slate-700">{m.fileColumn}</td>
                <td className="p-2">
                  <select
                    value={m.targetField}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    className="w-full p-1 text-xs border border-border rounded bg-white"
                    data-testid={`column-mapper-select-${idx}`}
                  >
                    <option value="free">{t.freeField}</option>
                    <option value="ignore">{t.ignoreColumn}</option>
                    {RESERVED_COLUMNS.map((rc: ReservedColumn) => (
                      <option
                        key={rc}
                        value={rc}
                        disabled={usedReserved.has(rc) && m.targetField !== rc}
                      >
                        {rc}
                      </option>
                    ))}
                  </select>
                </td>
                {previewRows.map((row, ri) => (
                  <td key={ri} className="p-2 text-slate-500 truncate max-w-[120px]">
                    {row[m.fileColumn] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-brand transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t.back}
        </button>
        <button
          type="button"
          data-testid="column-mapper-submit"
          onClick={onSubmit}
          className="px-8 py-2 text-sm font-medium bg-brand text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition rounded flex items-center gap-2"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          {t.importData} ({csvResult.rows.length})
        </button>
      </div>
    </div>
  );
}
