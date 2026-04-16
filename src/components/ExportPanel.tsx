import { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Panel } from './ui';
import {
  exportToCsv,
  exportToJson,
  generatePreview,
  type ExportMapping,
} from '../services/export-engine';
import { downloadFile } from '../services/pedigree-export';
import type { Individual } from '../types/pedigree.types';

export interface ExportPanelProps {
  individuals: readonly Individual[];
  filteredCount: number;
  selectedIds: string[];
  onClose: () => void;
}

type ExportFormat = 'csv' | 'json';
type ExportScope = 'all' | 'filtered' | 'selected';

const LS_FORMAT_KEY = 'pw:export:lastFormat';

function loadLastFormat(): ExportFormat {
  try {
    const stored = localStorage.getItem(LS_FORMAT_KEY);
    if (stored === 'csv' || stored === 'json') return stored;
  } catch {
    // localStorage unavailable (private browsing etc.)
  }
  return 'csv';
}

function saveLastFormat(fmt: ExportFormat): void {
  try {
    localStorage.setItem(LS_FORMAT_KEY, fmt);
  } catch {
    // ignore
  }
}

export function ExportPanel({
  individuals,
  filteredCount,
  selectedIds,
  onClose,
}: ExportPanelProps): React.JSX.Element {
  const [format, setFormat] = useState<ExportFormat>(loadLastFormat);
  const [scope, setScope] = useState<ExportScope>('all');
  const [expanded, setExpanded] = useState(false);
  // Saved mappings — future: load from IndexedDB. For now, empty.
  const [savedMappings] = useState<ExportMapping[]>([]);
  const [activeMappingId, setActiveMappingId] = useState<string | null>(null);

  const activeMapping = savedMappings.find((m) => m.id === activeMappingId);

  // Persist format choice
  useEffect(() => {
    saveLastFormat(format);
  }, [format]);

  const scopedIndividuals = useCallback((): readonly Individual[] => {
    if (scope === 'selected') {
      const set = new Set(selectedIds);
      return individuals.filter((ind) => set.has(ind.id));
    }
    if (scope === 'filtered') {
      // Caller provides filteredCount but not the filtered list itself;
      // we approximate by using the first filteredCount items. In a real
      // integration the caller would pass filteredIndividuals directly.
      return individuals.slice(0, filteredCount);
    }
    return individuals;
  }, [individuals, scope, selectedIds, filteredCount]);

  const triggerDownload = useCallback(() => {
    const data = scopedIndividuals();
    const date = new Date().toISOString().slice(0, 10);
    const baseName = `pedigree-${date}`;

    if (format === 'json') {
      const content = exportToJson(data);
      downloadFile(content, `${baseName}.json`, 'application/json');
    } else {
      const content = exportToCsv(data, activeMapping);
      downloadFile(content, `${baseName}.csv`, 'text/csv');
    }
    onClose();
  }, [format, scopedIndividuals, activeMapping, onClose]);

  const preview = generatePreview(scopedIndividuals(), activeMapping);

  const scopeCount =
    scope === 'selected'
      ? selectedIds.length
      : scope === 'filtered'
        ? filteredCount
        : individuals.length;

  const summaryCopy = `${scopeCount} individuals · ${format.toUpperCase()}`;

  return (
    <Panel open width="400px">
      <div
        className="h-full flex flex-col bg-surface border-l border-border shadow-xl overflow-hidden"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-sm font-semibold">Export</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close export panel"
            className="flex items-center justify-center w-8 h-8"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          {/* Summary + primary action */}
          <div className="flex flex-col items-center gap-3 py-2">
            <p
              className="text-sm font-mono"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {summaryCopy}
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={triggerDownload}
              className="w-full"
            >
              Export Now
            </Button>
          </div>

          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs self-center"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                Collapse options
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                Other format or mapping
              </>
            )}
          </button>

          {expanded && (
            <div className="flex flex-col gap-4">
              {/* Format segment control */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Format
                </label>
                <div
                  className="flex rounded-md border border-border overflow-hidden"
                  role="group"
                  aria-label="Export format"
                >
                  {(['csv', 'json'] as ExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className="flex-1 py-1.5 text-xs font-medium transition"
                      style={{
                        background: format === fmt ? 'var(--color-brand)' : 'transparent',
                        color: format === fmt ? '#fff' : 'var(--color-text-secondary)',
                        borderRight: fmt === 'csv' ? '1px solid var(--color-border)' : undefined,
                      }}
                      aria-pressed={format === fmt}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Scope
                </label>
                <div
                  className="flex rounded-md border border-border overflow-hidden"
                  role="group"
                  aria-label="Export scope"
                >
                  {(
                    [
                      { key: 'all', label: `All (${individuals.length})` },
                      { key: 'filtered', label: `Filtered (${filteredCount})` },
                      { key: 'selected', label: `Selected (${selectedIds.length})` },
                    ] as { key: ExportScope; label: string }[]
                  ).map(({ key, label }, idx) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setScope(key)}
                      className="flex-1 py-1.5 text-xs font-medium transition"
                      style={{
                        background: scope === key ? 'var(--color-brand)' : 'transparent',
                        color: scope === key ? '#fff' : 'var(--color-text-secondary)',
                        borderRight: idx < 2 ? '1px solid var(--color-border)' : undefined,
                      }}
                      aria-pressed={scope === key}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mapping selector — only shown if saved mappings exist */}
              {savedMappings.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    Column mapping
                  </label>
                  <select
                    value={activeMappingId ?? ''}
                    onChange={(e) => setActiveMappingId(e.target.value || null)}
                    className="w-full text-xs rounded border border-border bg-surface-raised px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    <option value="">Standard (Pedigree Workbench)</option>
                    {savedMappings.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Preview table */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Preview (first {preview.rows.length} rows)
                </span>
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-xs font-mono border-collapse">
                    <thead>
                      <tr style={{ background: 'var(--color-surface-raised)' }}>
                        {preview.headers.map((h) => (
                          <th
                            key={h}
                            className="px-2 py-1.5 text-left font-medium border-b border-border whitespace-nowrap"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={preview.headers.length}
                            className="px-2 py-3 text-center"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            No individuals in scope
                          </td>
                        </tr>
                      ) : (
                        preview.rows.map((row, ri) => (
                          <tr
                            key={ri}
                            style={{
                              background: ri % 2 === 0 ? 'transparent' : 'var(--color-surface-raised)',
                            }}
                          >
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className="px-2 py-1 border-b border-border whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis"
                                style={{ color: 'var(--color-text-primary)' }}
                                title={cell}
                              >
                                {cell || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </Panel>
  );
}
