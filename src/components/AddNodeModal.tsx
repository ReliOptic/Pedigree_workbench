import { useEffect, useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { logger } from '../services/logger';
import type { Individual } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';

interface AddNodeModalProps {
  readonly isOpen: boolean;
  readonly allIndividuals: readonly Individual[];
  /** Pre-fill values for the form when the modal opens. */
  readonly prefill?: Partial<Individual>;
  readonly onClose: () => void;
  readonly onAdd: (ind: Individual) => Promise<void>;
  readonly onAdded: (id: string) => void;
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

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    const id = form.id.trim();
    if (id.length === 0) {
      setError('ID is required.');
      firstFieldRef.current?.focus();
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
      onAdded(id);
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
          className="bg-white w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] rounded-lg overflow-hidden"
        >
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h2 id="add-node-title" className="text-lg font-bold text-brand">
              {t.addNode}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close add node dialog"
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                id *
              </span>
              <input
                ref={firstFieldRef}
                type="text"
                data-testid="add-node-id"
                value={form.id}
                onChange={patch('id')}
                placeholder="e.g. SNUDB #3-1"
                className="w-full p-2 text-sm bg-white border border-border rounded font-mono"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                label
              </span>
              <input
                type="text"
                value={form.label}
                onChange={patch('label')}
                className="w-full p-2 text-sm bg-white border border-border rounded font-mono"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  sex
                </span>
                <input
                  type="text"
                  value={form.sex}
                  onChange={patch('sex')}
                  placeholder="수컷 / 암컷 / M / F"
                  className="w-full p-2 text-sm bg-white border border-border rounded font-mono"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  generation
                </span>
                <input
                  type="text"
                  value={form.generation}
                  onChange={patch('generation')}
                  placeholder="F0 / F1 ..."
                  className="w-full p-2 text-sm bg-white border border-border rounded font-mono"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  sire
                </span>
                <select
                  value={form.sire}
                  onChange={patch('sire')}
                  className="w-full p-2 text-sm bg-white border border-border rounded font-mono"
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
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  dam
                </span>
                <select
                  value={form.dam}
                  onChange={patch('dam')}
                  className="w-full p-2 text-sm bg-white border border-border rounded font-mono"
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
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  group
                </span>
                <input
                  type="text"
                  value={form.group}
                  onChange={patch('group')}
                  className="w-full p-2 text-sm bg-white border border-border rounded font-mono"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  birth_date
                </span>
                <input
                  type="text"
                  value={form.birthDate}
                  onChange={patch('birthDate')}
                  placeholder="YYYY-MM-DD"
                  className="w-full p-2 text-sm bg-white border border-border rounded font-mono"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                status
              </span>
              <input
                type="text"
                value={form.status}
                onChange={patch('status')}
                className="w-full p-2 text-sm bg-white border border-border rounded font-mono"
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

          <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-brand transition"
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
              className="px-6 py-2 text-sm font-medium bg-brand text-white rounded hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
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
