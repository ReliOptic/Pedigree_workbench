import { useEffect, useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { logger } from '../services/logger';
import type { GenerationFormat } from '../services/settings-store';
import type { Individual } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';

interface AddNodeModalProps {
  readonly isOpen: boolean;
  readonly allIndividuals: readonly Individual[];
  /** Pre-fill values for the form when the modal opens. */
  readonly prefill?: Partial<Individual>;
  readonly onClose: () => void;
  readonly onAdd: (ind: Individual) => Promise<void>;
  readonly onAdded: (id: string, individual: Individual) => void;
  readonly generationFormat: GenerationFormat;
  readonly t: Translation;
}

interface FormState {
  id: string;
  label: string;
  sex: string;
  generation: string;
  sire: string;
  dam: string;
  group: string;
  birthDate: string;
  status: string;
}


/**
 * Modal form for adding a new individual.
 *
 * Only `id` is required — everything else is optional. `sire` and `dam`
 * are dropdowns populated from the current dataset to prevent typos and
 * orphan references. On success, calls `onAdded(newId)` so the parent
 * can focus the new node in the inspector.
 */
function prefillToForm(prefill: Partial<Individual> | undefined): FormState {
  return {
    id: '',
    label: prefill?.label ?? '',
    sex: prefill?.sex ?? '',
    generation: prefill?.generation ?? '',
    sire: prefill?.sire ?? '',
    dam: prefill?.dam ?? '',
    group: prefill?.group ?? '',
    birthDate: prefill?.birthDate ?? '',
    status: prefill?.status ?? '',
  };
}

export function AddNodeModal({
  isOpen,
  allIndividuals,
  prefill,
  onClose,
  onAdd,
  onAdded,
  generationFormat,
  t,
}: AddNodeModalProps): React.JSX.Element | null {
  const [form, setForm] = useState<FormState>(() => prefillToForm(prefill));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(prefillToForm(prefill));
      setError(null);
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  if (!isOpen) return null;

  const patch =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      const value = e.target.value;
      setForm((f) => ({ ...f, [key]: value }));
    };

  const validateGeneration = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0 || generationFormat === 'Custom') return null;
    if (generationFormat === 'F' && /^F-?\d+$/i.test(trimmed)) return null;
    if (generationFormat === 'Gen' && /^Gen\s*-?\d+$/i.test(trimmed)) return null;
    if (generationFormat === 'Roman' && /^(?=[IVXLCDM]+$)[IVXLCDM]+$/i.test(trimmed)) return null;
    if (generationFormat === 'F') return 'Generation must look like F0, F1, F2.';
    if (generationFormat === 'Gen') return 'Generation must look like Gen 0, Gen 1.';
    return 'Generation must use Roman numerals in the current setting.';
  };

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    const id = form.id.trim();
    if (id.length === 0) {
      setError('ID is required.');
      firstFieldRef.current?.focus();
      return;
    }
    const generationError = validateGeneration(form.generation);
    if (generationError !== null) {
      setError(generationError);
      return;
    }
    const next: Individual = {
      id,
      ...(form.sire.trim() !== '' ? { sire: form.sire.trim() } : {}),
      ...(form.dam.trim() !== '' ? { dam: form.dam.trim() } : {}),
      ...(form.sex.trim() !== '' ? { sex: form.sex.trim() } : {}),
      ...(form.generation.trim() !== '' ? { generation: form.generation.trim() } : {}),
      ...(form.group.trim() !== '' ? { group: form.group.trim() } : {}),
      ...(form.birthDate.trim() !== '' ? { birthDate: form.birthDate.trim() } : {}),
      ...(form.status.trim() !== '' ? { status: form.status.trim() } : {}),
      ...(form.label.trim() !== '' ? { label: form.label.trim() } : {}),
      fields: {},
    };
    setIsSubmitting(true);
    try {
      await onAdd(next);
      logger.info('add-node-modal.success', { id });
      onAdded(id, next);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to add node.');
      logger.warn('add-node-modal.failed', { id, cause: String(cause) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentOptions = allIndividuals.map((i) => i.id);

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
          aria-labelledby="add-node-title"
          className="bg-surface-raised w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] rounded-xl overflow-hidden border border-border"
        >
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h2 id="add-node-title" className="text-lg font-semibold text-text-primary">
              {t.addNode}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close add node dialog"
              className="panel-button rounded-full p-2"
            >
              <X className="w-5 h-5 text-text-secondary" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-tight">
                id *
              </span>
              <input
                ref={firstFieldRef}
                type="text"
                data-testid="add-node-id"
                value={form.id}
                onChange={patch('id')}
                placeholder="e.g. SNUDB #3-1"
                className="panel-field w-full rounded px-3 py-2 text-sm font-mono"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-tight">
                label
              </span>
              <input
                type="text"
                value={form.label}
                onChange={patch('label')}
                className="panel-field w-full rounded px-3 py-2 text-sm font-mono"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-tight">
                  sex
                </span>
                <select
                  value={form.sex}
                  onChange={patch('sex')}
                  className="panel-field w-full rounded px-3 py-2 text-sm font-mono"
                >
                  <option value="">— none —</option>
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-tight">
                  generation
                </span>
                <input
                  type="text"
                  value={form.generation}
                  onChange={patch('generation')}
                  placeholder={
                    generationFormat === 'F'
                      ? 'F0 / F1 / F2'
                      : generationFormat === 'Gen'
                        ? 'Gen 0 / Gen 1'
                        : generationFormat === 'Roman'
                          ? 'I / II / III'
                          : 'Custom generation label'
                  }
                  className="panel-field w-full rounded px-3 py-2 text-sm font-mono"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-tight">
                  sire
                </span>
                <select
                  value={form.sire}
                  onChange={patch('sire')}
                  className="panel-field w-full rounded px-3 py-2 text-sm font-mono"
                >
                  <option value="">— none —</option>
                  {parentOptions.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-tight">
                  dam
                </span>
                <select
                  value={form.dam}
                  onChange={patch('dam')}
                  className="panel-field w-full rounded px-3 py-2 text-sm font-mono"
                >
                  <option value="">— none —</option>
                  {parentOptions.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-tight">
                  group
                </span>
                <input
                  type="text"
                  value={form.group}
                  onChange={patch('group')}
                  className="panel-field w-full rounded px-3 py-2 text-sm font-mono"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-tight">
                  birth_date
                </span>
                <input
                  type="text"
                  value={form.birthDate}
                  onChange={patch('birthDate')}
                  placeholder="YYYY-MM-DD"
                  className="panel-field w-full rounded px-3 py-2 text-sm font-mono"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-tight">
                status
              </span>
              <input
                type="text"
                value={form.status}
                onChange={patch('status')}
                className="panel-field w-full rounded px-3 py-2 text-sm font-mono"
              />
            </label>

            {error !== null && (
              <p
                data-testid="add-node-error"
                role="alert"
                className="text-xs text-red-600 font-mono break-words"
              >
                {error}
              </p>
            )}
          </div>

          <div className="p-5 border-t border-border flex justify-end gap-3 bg-surface">
            <button
              type="button"
              onClick={onClose}
              className="panel-button rounded px-4 py-2 text-sm font-medium"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              data-testid="add-node-submit"
              disabled={isSubmitting || form.id.trim().length === 0}
              onClick={() => {
                void handleSubmit();
              }}
              className="panel-button panel-button-primary rounded px-6 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {t.addNode}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
