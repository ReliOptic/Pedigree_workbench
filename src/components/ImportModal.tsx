import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Upload, AlertTriangle, FileUp, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { usePedigree } from '../hooks/use-pedigree';
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
import { ColumnMapper } from './ColumnMapper';
import { PedigreeImportError } from '../types/error.types';
import type { Individual } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';

interface ImportModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onImported: () => void;
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
const SAMPLE_CSV = [
  'id,label,sex,generation,sire,dam,group,surrogate,birth_date,status,CD163,Germline',
  'SNUDB #1-1,1-1,수컷,F0,,,G1,14-84,2025-07-13,교배예정돈,100.00%,─',
  'SNUDB #1-2,1-2,수컷,F0,,,G1,14-84,2025-07-13,,100.00%,',
  'SNUDB #2-1,2-1,암컷,F0,,,G2,06-31,2025-07-20,,80.00%,',
  'SNUDB #2-2,2-2,수컷,F0,,,G2,06-31,2025-07-20,폐사,80.00%,',
  'F1-1,F1-1,M,F1,SNUDB #1-1,SNUDB #2-1,,,,,,',
  'F1-2,F1-2,F,F1,SNUDB #1-1,SNUDB #2-1,,,,,,',
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

type Step = 'input' | 'mapping' | 'confirm';

function formatWarning(w: ImportWarning): string {
  switch (w.kind) {
    case 'orphan-sire':
      return `${w.id} → missing sire "${w.detail ?? ''}"`;
    case 'orphan-dam':
      return `${w.id} → missing dam "${w.detail ?? ''}"`;
    case 'duplicate-id':
      return `duplicate id "${w.id}"`;
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
  onImported,
  t,
}: ImportModalProps): React.JSX.Element | null {
  const { replaceAll } = usePedigree();
  const [raw, setRaw] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [step, setStep] = useState<Step>('input');
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<readonly ColumnMapping[]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
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

  const commit = useCallback(
    async (individuals: readonly Individual[]): Promise<void> => {
      await replaceAll(individuals);
      logger.info('import-modal.success', { count: individuals.length });
      setRaw('');
      setPending(null);
      setCsvResult(null);
      setColumnMapping([]);
      setStep('input');
      onImported();
    },
    [replaceAll, onImported],
  );

  /** Process a file based on its extension. */
  const processFile = useCallback(
    (file: File): void => {
      setError(null);
      const reader = new FileReader();
      reader.onload = (): void => {
        const text = reader.result as string;
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

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
      const warnings = analyzePedigreeWarnings(parsed);
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
      const warnings = analyzePedigreeWarnings(individuals);
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

  if (!isOpen) return null;

  const hasPending = pending !== null;

  const renderInputStep = (): React.JSX.Element => (
    <>
      <div
        className={`flex-1 overflow-y-auto p-6 space-y-4 transition-colors ${
          isDragOver ? 'bg-blue-50 border-2 border-dashed border-blue-400' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File upload zone */}
        <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-brand transition-colors">
          {isDragOver ? (
            <p className="text-sm font-medium text-blue-600">{t.dropFileHere}</p>
          ) : (
            <>
              <FileUp className="w-8 h-8 text-slate-400" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 text-sm font-medium bg-brand text-white rounded hover:brightness-110 transition"
                >
                  {t.browseFile}
                </button>
                <span className="text-xs text-slate-400">.json, .csv, .tsv</span>
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
            accept=".json,.csv,.tsv"
            onChange={handleFileChange}
            className="hidden"
            data-testid="import-file-input"
          />
        </div>

        <p className="text-xs text-center text-slate-400">{t.orPasteJson}</p>

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
          className="w-full h-48 p-3 font-mono text-xs bg-slate-50 border border-border rounded resize-none"
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
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 text-sm font-medium text-slate-500 hover:text-brand transition-colors"
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
              ? 'px-8 py-2 text-sm font-medium bg-amber-500 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition rounded flex items-center gap-2'
              : 'px-8 py-2 text-sm font-medium bg-brand text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition rounded flex items-center gap-2'
          }
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          {hasPending ? 'Import with warnings' : t.importData}
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
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-between gap-3 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setStep('mapping');
              setPending(null);
            }}
            className="px-6 py-2 text-sm font-medium text-slate-500 hover:text-brand transition-colors"
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
            className="px-8 py-2 text-sm font-medium bg-amber-500 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition rounded flex items-center gap-2"
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
          className="bg-white w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] rounded-lg overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 id="import-title" className="text-lg font-bold text-brand">
                {step === 'mapping' || step === 'confirm' ? t.csvImport : t.importGeneticData}
              </h2>
              <p className="text-xs text-slate-500">
                {step === 'mapping' || step === 'confirm' ? t.mapColumns : t.importDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close import dialog"
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {step === 'input' && renderInputStep()}
          {step === 'mapping' && renderMappingStep()}
          {step === 'confirm' && renderConfirmStep()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
