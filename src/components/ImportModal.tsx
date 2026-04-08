import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { usePedigree } from '../hooks/use-pedigree';
import { logger } from '../services/logger';
import { parsePedigreeImport } from '../services/pedigree-import';
import { PedigreeImportError } from '../types/error.types';
import type { Translation } from '../types/translation.types';

interface ImportModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onImported: () => void;
  readonly t: Translation;
}

const PLACEHOLDER = `[
  { "id": "S-001", "label": "01", "gender": "male", "generation": 1 },
  { "id": "D-001", "label": "02", "gender": "female", "generation": 1 },
  { "id": "C-001", "label": "03", "gender": "male", "generation": 2, "sireId": "S-001", "damId": "D-001" }
]`;

/**
 * Pedigree import modal.
 *
 * Accepts JSON pasted into a textarea, validates it via the import service,
 * and writes the resulting individuals through `usePedigree.replaceAll`.
 * Displays validation errors inline; never throws to the boundary.
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

  if (!isOpen) return null;

  const handleImport = async (): Promise<void> => {
    setError(null);
    setIsSubmitting(true);
    try {
      const parsed = parsePedigreeImport(raw);
      await replaceAll(parsed);
      logger.info('import-modal.success', { count: parsed.length });
      setRaw('');
      onImported();
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
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-8"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] rounded-lg overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#003b5a] dark:text-white">
                {t.importGeneticData}
              </h2>
              <p className="text-xs text-slate-500">{t.importDescription}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <textarea
              data-testid="import-textarea"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              className="w-full h-64 p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded resize-none focus:outline-none focus:ring-2 focus:ring-[#003b5a]"
            />
            {error !== null && (
              <p
                data-testid="import-error"
                className="text-xs text-red-600 font-mono break-words"
              >
                {error}
              </p>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-slate-500 hover:text-[#003b5a] transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              data-testid="import-submit"
              disabled={isSubmitting || raw.trim().length === 0}
              onClick={() => {
                void handleImport();
              }}
              className="px-8 py-2 text-sm font-medium bg-[#003b5a] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {t.importData}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
