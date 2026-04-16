import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Upload, AlertTriangle, FileUp, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { logger } from '../services/logger';
import {
  analyzePedigreeWarnings,
  parsePedigreeImport,
  type ImportWarning,
} from '../services/pedigree-import';
import {
  applyMapping,
  parseCsv,
  type ColumnMapping,
  type CsvParseResult,
} from '../services/pedigree-import-csv';
import { parseExcel } from '../services/pedigree-import-excel';
import { ColumnMapper } from './ColumnMapper';
import { PedigreeImportError } from '../types/error.types';
import type { Individual } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';

interface ImportModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly existingIndividuals: readonly Individual[];
  readonly activeProjectName?: string;
  readonly onImported: (result: {
    projectName: string;
    individuals: readonly Individual[];
    mode: 'new-project' | 'merge';
  }) => Promise<void>;
  readonly t: Translation;
}

const PLACEHOLDER = `[
  { "id": "SNUDB #1-1", "sex": "수컷", "generation": "F0", "label": "1-1" },
  { "id": "SNUDB #2-1", "sex": "암컷", "generation": "F0", "label": "2-1" },
  { "id": "F1-1", "sex": "M", "generation": "F1", "sire": "SNUDB #1-1", "dam": "SNUDB #2-1", "label": "F1-1" }
]`;

/**
 * Sample CSV that users can download as a formatting reference.
 * Includes both English and Korean column headers (the column-mapper
 * auto-detects both), reserved fields, and free-form fields.
 */
/**
 * Sample CSV template. Contains:
 *  - Comment header block explaining each column and formatting rules
 *  - Column headers only (no real data)
 *  - Two example placeholder rows showing the expected format
 *
 * Lines starting with # are comments — PapaParse skips them automatically
 * because they produce rows with no valid 'id', which applyMapping filters out.
 */
const SAMPLE_CSV = [
  '# Pedigree Workbench - Sample CSV Template',
  '# =========================================',
  '#',
  '# Required columns:',
  '#   id          - Unique identifier for each individual (required)',
  '#',
  '# Optional reserved columns (auto-detected by the column mapper):',
  '#   label       - Display name shown on the canvas node',
  '#   sex         - Sex of the individual (M / F / 수컷 / 암컷 / male / female)',
  '#   generation  - Generation label (F0, F1, F2, ...)',
  '#   sire        - Father\'s id (must match an existing id in this file)',
  '#   dam         - Mother\'s id (must match an existing id in this file)',
  '#   group       - Litter or group identifier',
  '#   surrogate   - Surrogate mother identifier',
  '#   birth_date  - Birth date (YYYY-MM-DD recommended)',
  '#   status      - Current status (e.g. 교배예정돈, 폐사, active)',
  '#   sequence    - DNA sequence (IUPAC nucleotide codes: ACGTUN...)',
  '#   sequence_source - Sequence method (PCR / Sanger / NGS / Other)',
  '#',
  '# Custom columns:',
  '#   Any additional columns (e.g. CD163, Germline, notes) will be',
  '#   imported as free-form fields and displayed in the node inspector.',
  '#',
  '# Notes:',
  '#   - Save as UTF-8 CSV for Korean characters',
  '#   - sire/dam values must reference an id that exists in this file,',
  '#     otherwise a warning will appear during import',
  '#   - Empty cells are OK — all columns except id are optional',
  '#   - Column headers can be in English or Korean (auto-detected)',
  '#',
  'id,label,sex,generation,sire,dam,group,surrogate,birth_date,status',
  'EXAMPLE-001,Sample Parent 1,M,F0,,,,surrogate-id,2025-01-01,active',
  'EXAMPLE-002,Sample Parent 2,F,F0,,,,,2025-01-01,',
  'EXAMPLE-003,Sample Child,M,F1,EXAMPLE-001,EXAMPLE-002,,,,',
].join('\n');

function downloadSampleCsv(): void {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pedigree-sample.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface PendingImport {
  readonly individuals: readonly Individual[];
  readonly warnings: readonly ImportWarning[];
}

type Step = 'input' | 'sheet-select' | 'mapping' | 'confirm';
type ImportMode = 'new-project' | 'merge';

function formatWarning(w: ImportWarning): string {
  switch (w.kind) {
    case 'orphan-sire':
      return `${w.id} → missing sire "${w.detail ?? ''}"`;
    case 'orphan-dam':
      return `${w.id} → missing dam "${w.detail ?? ''}"`;
    case 'duplicate-id':
      return w.detail === 'existing-project'
        ? `existing project already contains "${w.id}"`
        : `duplicate id "${w.id}"`;
    case 'self-reference':
      return `${w.id} references itself as ${w.detail ?? 'parent'}`;
    default:
      return JSON.stringify(w);
  }
}

/**
 * Pedigree import modal.
 *
 * Multi-step flow:
 *   Step 1 (input): textarea for JSON paste + file drop zone + file picker
 *   Step 2 (mapping): ColumnMapper for CSV files
 *   Step 3 (confirm): warnings panel for two-stage submit
 *
 * JSON files skip directly to commit (or confirm if warnings).
 * CSV/TSV files go through the column mapping step first.
 */
export function ImportModal({
  isOpen,
  onClose,
  existingIndividuals,
  activeProjectName,
  onImported,
  t,
}: ImportModalProps): React.JSX.Element | null {
  const [raw, setRaw] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [step, setStep] = useState<Step>('input');
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<readonly ColumnMapping[]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [importFileName, setImportFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<readonly string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [pendingExcelBuffer, setPendingExcelBuffer] = useState<ArrayBuffer | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('new-project');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes.
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
      setPending(null);
      setError(null);
      setStep('input');
      setCsvResult(null);
      setColumnMapping([]);
      setIsDragOver(false);
      setImportFileName('');
      setSheetNames([]);
      setSelectedSheet('');
      setPendingExcelBuffer(null);
      setImportMode('new-project');
    }
  }, [isOpen]);

  // Reset pending confirmation when the user edits the payload.
  useEffect(() => {
    setPending(null);
  }, [raw]);

  // Escape closes the modal.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const getCollisionIds = useCallback(
    (incoming: readonly Individual[]): string[] => {
      if (importMode !== 'merge') return [];
      const existingIds = new Set(existingIndividuals.map((individual) => individual.id));
      return incoming
        .map((individual) => individual.id)
        .filter((id) => existingIds.has(id));
    },
    [existingIndividuals, importMode],
  );

  const buildFinalIndividuals = useCallback(
    (incoming: readonly Individual[]): readonly Individual[] => {
      if (importMode !== 'merge') return incoming;
      const merged = new Map(existingIndividuals.map((individual) => [individual.id, individual]));
      for (const individual of incoming) {
        merged.set(individual.id, individual);
      }
      return Array.from(merged.values());
    },
    [existingIndividuals, importMode],
  );

  const commit = useCallback(
    async (individuals: readonly Individual[]): Promise<void> => {
      // Derive project name from file name, or use a default.
      const projName = importFileName
        ? importFileName.replace(/\.(csv|tsv|json|xlsx|xls)$/i, '')
        : importMode === 'merge'
          ? activeProjectName ?? 'Current Project'
          : `Import ${new Date().toLocaleDateString()}`;
      const finalIndividuals = buildFinalIndividuals(individuals);
      logger.info('import-modal.success', {
        count: finalIndividuals.length,
        project: projName,
        mode: importMode,
      });
      setRaw('');
      setPending(null);
      setCsvResult(null);
      setColumnMapping([]);
      setImportFileName('');
      setSheetNames([]);
      setSelectedSheet('');
      setPendingExcelBuffer(null);
      setImportMode('new-project');
      setStep('input');
      await onImported({ projectName: projName, individuals: finalIndividuals, mode: importMode });
    },
    [activeProjectName, buildFinalIndividuals, importFileName, importMode, onImported],
  );

  /** Process a file based on its extension. */
  const processFile = useCallback(
    (file: File): void => {
      setError(null);
      setImportFileName(file.name);
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

      if (ext === 'xlsx' || ext === 'xls') {
        // Excel lane: read as ArrayBuffer, then parse.
        const reader = new FileReader();
        reader.onload = (): void => {
          try {
            const buffer = reader.result as ArrayBuffer;
            const excelResult = parseExcel(buffer);
            if (excelResult.sheetNames.length > 1) {
              // Multiple sheets — ask the user to pick one.
              setPendingExcelBuffer(buffer);
              setSheetNames(excelResult.sheetNames);
              setSelectedSheet(excelResult.sheetNames[0] ?? '');
              setStep('sheet-select');
            } else {
              // Single sheet — go straight to mapping.
              setCsvResult(excelResult.result);
              setColumnMapping(excelResult.result.suggestedMapping);
              setStep('mapping');
            }
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Failed to parse Excel file.');
            logger.warn('import-modal.excel-parse-failed', { cause: String(cause) });
          }
        };
        reader.onerror = (): void => {
          setError('Failed to read file.');
        };
        reader.readAsArrayBuffer(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (): void => {
        const text = reader.result as string;

        if (ext === 'json') {
          // JSON lane: set the textarea value and let the user hit import.
          setRaw(text);
          setStep('input');
        } else if (ext === 'csv' || ext === 'tsv') {
          // CSV/TSV lane: parse and go to mapping step.
          try {
            const result = parseCsv(text);
            setCsvResult(result);
            setColumnMapping(result.suggestedMapping);
            setStep('mapping');
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Failed to parse CSV.');
            logger.warn('import-modal.csv-parse-failed', { cause: String(cause) });
          }
        } else {
          setError(`Unsupported file type: .${ext}`);
        }
      };
      reader.onerror = (): void => {
        setError('Failed to read file.');
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (file !== undefined) processFile(file);
    },
    [processFile],
  );

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file !== undefined) processFile(file);
    },
    [processFile],
  );

  /** Handle JSON import (from textarea). */
  const handleJsonImport = useCallback(async (): Promise<void> => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (pending !== null) {
        await commit(pending.individuals);
        return;
      }
      const parsed = parsePedigreeImport(raw);
      const warnings = [...analyzePedigreeWarnings(parsed)];
      const collisionIds = getCollisionIds(parsed);
      for (const id of collisionIds) {
        warnings.push({ kind: 'duplicate-id', id, detail: 'existing-project' });
      }
      if (warnings.length > 0) {
        setPending({ individuals: parsed, warnings });
        logger.warn('import-modal.warnings', { count: warnings.length });
        return;
      }
      await commit(parsed);
    } catch (cause) {
      if (cause instanceof PedigreeImportError) {
        const detail = cause.issues !== undefined ? ` (${cause.issues.join('; ')})` : '';
        setError(`${cause.message}${detail}`);
      } else if (cause instanceof Error) {
        setError(cause.message);
      } else {
        setError('Unknown import failure.');
      }
      logger.warn('import-modal.failed', { cause: String(cause) });
    } finally {
      setIsSubmitting(false);
    }
  }, [raw, pending, commit]);

  /** Handle CSV mapping submit. */
  const handleCsvSubmit = useCallback(async (): Promise<void> => {
    if (csvResult === null) return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (pending !== null) {
        await commit(pending.individuals);
        return;
      }
      const individuals = applyMapping(csvResult.rows, columnMapping);
      if (individuals.length === 0) {
        setError('No valid rows found. Make sure the "id" column is mapped.');
        return;
      }
      const warnings = [...analyzePedigreeWarnings(individuals)];
      const collisionIds = getCollisionIds(individuals);
      for (const id of collisionIds) {
        warnings.push({ kind: 'duplicate-id', id, detail: 'existing-project' });
      }
      if (warnings.length > 0) {
        setPending({ individuals, warnings });
        setStep('confirm');
        logger.warn('import-modal.csv-warnings', { count: warnings.length });
        return;
      }
      await commit(individuals);
    } catch (cause) {
      if (cause instanceof Error) {
        setError(cause.message);
      } else {
        setError('Unknown import failure.');
      }
      logger.warn('import-modal.csv-failed', { cause: String(cause) });
    } finally {
      setIsSubmitting(false);
    }
  }, [csvResult, columnMapping, pending, commit]);

  const handleSheetSelect = useCallback((): void => {
    if (pendingExcelBuffer === null) return;
    setError(null);
    try {
      const excelResult = parseExcel(pendingExcelBuffer, selectedSheet);
      setCsvResult(excelResult.result);
      setColumnMapping(excelResult.result.suggestedMapping);
      setPendingExcelBuffer(null);
      setStep('mapping');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to parse Excel sheet.');
      logger.warn('import-modal.excel-sheet-parse-failed', { cause: String(cause) });
    }
  }, [pendingExcelBuffer, selectedSheet]);

  if (!isOpen) return null;

  const hasPending = pending !== null;
  const canMerge = activeProjectName !== undefined && activeProjectName.trim().length > 0;

  const renderInputStep = (): React.JSX.Element => (
    <>
      <div
        className={`flex-1 overflow-y-auto p-6 space-y-4 transition-colors ${
          isDragOver ? 'bg-surface border-2 border-dashed border-brand/50' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File upload zone */}
        <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-lg hover:border-[var(--color-border-strong)] transition-colors">
          {isDragOver ? (
            <p className="text-sm font-medium text-brand">{t.dropFileHere}</p>
          ) : (
            <>
              <FileUp className="w-8 h-8 text-text-muted" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="panel-button panel-button-primary px-4 py-1.5 text-sm font-medium rounded"
                >
                  {t.browseFile}
                </button>
                <span className="text-xs text-text-muted">.json, .csv, .tsv, .xlsx, .xls</span>
              </div>
              <button
                type="button"
                onClick={downloadSampleCsv}
                data-testid="download-sample-csv"
                className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline transition"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                {t.downloadSampleCsv}
              </button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.tsv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            data-testid="import-file-input"
          />
        </div>

        <section className="rounded-xl border border-border bg-surface px-4 py-3 space-y-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Import destination
            </div>
            <div className="mt-1 text-sm text-text-secondary">
              Choose whether this import creates a separate project or merges into the current one.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className={`panel-choice flex items-center gap-2 rounded px-3 py-2 text-sm cursor-pointer ${importMode === 'new-project' ? 'panel-choice-active font-medium' : ''}`}>
              <input
                type="radio"
                name="import-mode"
                checked={importMode === 'new-project'}
                onChange={() => setImportMode('new-project')}
                className="sr-only"
              />
              Create new project
            </label>
            <label className={`panel-choice flex items-center gap-2 rounded px-3 py-2 text-sm cursor-pointer ${importMode === 'merge' ? 'panel-choice-active font-medium' : ''} ${!canMerge ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="radio"
                name="import-mode"
                checked={importMode === 'merge'}
                onChange={() => {
                  if (canMerge) setImportMode('merge');
                }}
                disabled={!canMerge}
                className="sr-only"
              />
              Merge into current project
            </label>
          </div>
          <div className="text-xs text-text-muted">
            {importMode === 'merge'
              ? `Imported rows will overwrite matching IDs in ${activeProjectName ?? 'the current project'}.`
              : 'Imported rows will be stored in a separate project.'}
          </div>
        </section>

        <p className="text-xs text-center text-text-muted">{t.orPasteJson}</p>

        {/* JSON textarea */}
        <label htmlFor="import-textarea" className="sr-only">
          Pedigree JSON
        </label>
        <textarea
          id="import-textarea"
          data-testid="import-textarea"
          ref={textareaRef}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          className="w-full h-48 p-3 font-mono text-xs bg-surface text-text-primary border border-border rounded resize-none"
        />

        {error !== null && (
          <p
            data-testid="import-error"
            role="alert"
            className="text-xs text-red-600 font-mono break-words"
          >
            {error}
          </p>
        )}
        {hasPending && (
          <div
            data-testid="import-warnings"
            role="alert"
            className="flex gap-3 p-3 bg-amber-50 border border-amber-300 rounded text-amber-900"
          >
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">
                {pending.warnings.length}{' '}
                {pending.warnings.length === 1 ? 'warning' : 'warnings'}. Click Import again to
                commit anyway.
              </p>
              <ul className="text-xs font-mono list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                {pending.warnings.map((w, i) => (
                  <li key={`${w.kind}-${w.id}-${i}`}>{formatWarning(w)}</li>
                ))}
              </ul>
              {importMode === 'merge' && (
                <p className="text-xs">
                  Matching IDs in the current project will be overwritten by the imported rows.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-border flex justify-end gap-3 bg-surface">
        <button
          type="button"
          onClick={onClose}
          className="panel-button px-6 py-2 text-sm font-medium rounded"
        >
          {t.cancel}
        </button>
        <button
          type="button"
          data-testid="import-submit"
          disabled={isSubmitting || raw.trim().length === 0}
          onClick={() => {
            void handleJsonImport();
          }}
          className={
            hasPending
              ? 'panel-button px-8 py-2 text-sm font-medium rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-amber-200 border-amber-700'
              : 'panel-button panel-button-primary px-8 py-2 text-sm font-medium rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
          }
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          {hasPending ? 'Import with warnings' : t.importData}
        </button>
      </div>
    </>
  );

  const renderSheetSelectStep = (): React.JSX.Element => (
    <>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {error !== null && (
          <p
            data-testid="import-error"
            role="alert"
            className="text-xs text-red-600 font-mono break-words"
          >
            {error}
          </p>
        )}
        <p className="text-sm text-text-secondary">
          {sheetNames.length} {t.sheetsFound}. {t.selectSheet}:
        </p>
        <ul className="space-y-2">
          {sheetNames.map((name) => (
            <li key={name}>
              <label className="panel-button flex items-center gap-3 p-3 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="sheet-select"
                  value={name}
                  checked={selectedSheet === name}
                  onChange={() => setSelectedSheet(name)}
                  className="accent-brand"
                />
                <span className="text-sm font-medium text-text-primary">{name}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-6 border-t border-border flex justify-between gap-3 bg-surface">
        <button
          type="button"
          onClick={() => {
            setStep('input');
            setSheetNames([]);
            setSelectedSheet('');
            setPendingExcelBuffer(null);
            setError(null);
          }}
          className="panel-button px-6 py-2 text-sm font-medium rounded"
        >
          {t.back}
        </button>
        <button
          type="button"
          disabled={selectedSheet === ''}
          onClick={handleSheetSelect}
          className="panel-button panel-button-primary px-8 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed rounded flex items-center gap-2"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          {t.selectSheet}
        </button>
      </div>
    </>
  );

  const renderMappingStep = (): React.JSX.Element | null => {
    if (csvResult === null) return null;
    return (
      <>
        <div className="flex-1 overflow-y-auto p-6">
          {error !== null && (
            <p
              data-testid="import-error"
              role="alert"
              className="text-xs text-red-600 font-mono break-words mb-4"
            >
              {error}
            </p>
          )}
          <ColumnMapper
            csvResult={csvResult}
            mapping={columnMapping}
            onMappingChange={setColumnMapping}
            onBack={() => {
              setStep('input');
              setCsvResult(null);
              setColumnMapping([]);
              setError(null);
            }}
            onSubmit={() => {
              void handleCsvSubmit();
            }}
            t={t}
          />
        </div>
      </>
    );
  };

  const renderConfirmStep = (): React.JSX.Element | null => {
    if (pending === null) return null;
    return (
      <>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div
            data-testid="import-warnings"
            role="alert"
            className="flex gap-3 p-3 bg-amber-50 border border-amber-300 rounded text-amber-900"
          >
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">
                {pending.warnings.length}{' '}
                {pending.warnings.length === 1 ? 'warning' : 'warnings'}. Click Import again to
                commit anyway.
              </p>
              <ul className="text-xs font-mono list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                {pending.warnings.map((w, i) => (
                  <li key={`${w.kind}-${w.id}-${i}`}>{formatWarning(w)}</li>
                ))}
              </ul>
              {importMode === 'merge' && (
                <p className="text-xs">
                  Matching IDs in the current project will be overwritten by the imported rows.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-between gap-3 bg-surface">
          <button
            type="button"
            onClick={() => {
              setStep('mapping');
              setPending(null);
            }}
            className="panel-button px-6 py-2 text-sm font-medium rounded"
          >
            {t.back}
          </button>
          <button
            type="button"
            data-testid="import-submit"
            disabled={isSubmitting}
            onClick={() => {
              void handleCsvSubmit();
            }}
            className="panel-button px-8 py-2 text-sm font-medium rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-amber-200 border-amber-700"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            Import with warnings
          </button>
        </div>
      </>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-title"
          className="bg-surface-raised w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] rounded-lg overflow-hidden"
        >
          <div className="p-6 border-b border-border flex justify-between items-center">
            <div>
              <h2 id="import-title" className="text-lg font-bold text-brand">
                {step === 'sheet-select'
                  ? t.excelImport
                  : step === 'mapping' || step === 'confirm'
                    ? t.csvImport
                    : t.importGeneticData}
              </h2>
              <p className="text-xs text-text-muted">
                {step === 'sheet-select'
                  ? t.selectSheet
                  : step === 'mapping' || step === 'confirm'
                    ? t.mapColumns
                    : t.importDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close import dialog"
              className="panel-button p-2 rounded-full"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {step === 'input' && renderInputStep()}
          {step === 'sheet-select' && renderSheetSelectStep()}
          {step === 'mapping' && renderMappingStep()}
          {step === 'confirm' && renderConfirmStep()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
