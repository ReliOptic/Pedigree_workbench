import { useEffect, useRef, useState } from 'react';
import { X, Heart } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { MATING_STATUSES, type Individual, type Mating, type MatingStatus } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';

interface MateModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (mating: Mating) => void;
  readonly allIndividuals: readonly Individual[];
  readonly prefillSireId?: string;
  readonly prefillDamId?: string;
  readonly defaultGestationDays?: number;
  readonly t: Translation;
}

interface FormState {
  sireId: string;
  damId: string;
  status: MatingStatus;
  matingDate: string;
  dueDate: string;
  gestationDays: string;
  notes: string;
}

function initialForm(prefillSireId?: string, prefillDamId?: string, defaultGestationDays?: number): FormState {
  return {
    sireId: prefillSireId ?? '',
    damId: prefillDamId ?? '',
    status: 'planned',
    matingDate: '',
    dueDate: '',
    gestationDays: defaultGestationDays !== undefined ? String(defaultGestationDays) : '',
    notes: '',
  };
}

function calcDueDate(matingDate: string, gestationDays: string): string {
  const days = Number.parseInt(gestationDays, 10);
  if (matingDate.length === 0 || Number.isNaN(days) || days <= 0) return '';
  const date = new Date(matingDate);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function MateModal({
  isOpen,
  onClose,
  onSubmit,
  allIndividuals,
  prefillSireId,
  prefillDamId,
  defaultGestationDays,
  t,
}: MateModalProps): React.JSX.Element | null {
  const [form, setForm] = useState<FormState>(() => initialForm(prefillSireId, prefillDamId, defaultGestationDays));
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm(prefillSireId, prefillDamId, defaultGestationDays));
      setError(null);
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
  }, [isOpen, prefillSireId, prefillDamId, defaultGestationDays]);

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

  const sexLower = (ind: Individual): string => (ind.sex ?? '').trim().toLowerCase();
  const isMale = (ind: Individual): boolean =>
    sexLower(ind) === '수컷' || sexLower(ind) === 'm' || sexLower(ind) === 'male';
  const isFemale = (ind: Individual): boolean =>
    sexLower(ind) === '암컷' || sexLower(ind) === 'f' || sexLower(ind) === 'female';

  const sireOptions = allIndividuals.filter((i) => isMale(i) || (!isFemale(i)));
  const damOptions = allIndividuals.filter((i) => isFemale(i) || (!isMale(i)));

  const patch =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
      const value = e.target.value;
      setForm((f) => {
        const next = { ...f, [key]: value };
        // Auto-calculate due date when gestation days or mating date changes.
        if (key === 'gestationDays' || key === 'matingDate') {
          const mDate = key === 'matingDate' ? value : f.matingDate;
          const gDays = key === 'gestationDays' ? value : f.gestationDays;
          const computed = calcDueDate(mDate, gDays);
          if (computed.length > 0) {
            next.dueDate = computed;
          }
        }
        return next;
      });
    };

  const handleSubmit = (): void => {
    if (form.sireId.trim().length === 0 || form.damId.trim().length === 0) {
      setError('Both sire and dam are required.');
      return;
    }
    const mating: Mating = {
      id: `mate_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sireId: form.sireId.trim(),
      damId: form.damId.trim(),
      status: form.status,
      ...(form.matingDate.trim().length > 0 ? { matingDate: form.matingDate.trim() } : {}),
      ...(form.dueDate.trim().length > 0 ? { dueDate: form.dueDate.trim() } : {}),
      ...(form.gestationDays.trim().length > 0
        ? { gestationDays: Number.parseInt(form.gestationDays.trim(), 10) }
        : {}),
      ...(form.notes.trim().length > 0 ? { notes: form.notes.trim() } : {}),
    };
    onSubmit(mating);
    onClose();
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
          aria-labelledby="mate-modal-title"
          className="bg-surface-raised w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] rounded-lg overflow-hidden"
        >
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h2 id="mate-modal-title" className="text-lg font-bold text-brand">
              {t.addMate}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close mate dialog"
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  sire *
                </span>
                <select
                  ref={firstFieldRef}
                  value={form.sireId}
                  onChange={patch('sireId')}
                  className="w-full p-2 text-sm bg-surface-raised border border-border rounded font-mono"
                >
                  <option value="">— {t.selectMate} —</option>
                  {sireOptions.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.id}{ind.sex !== undefined ? ` (${ind.sex})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  dam *
                </span>
                <select
                  value={form.damId}
                  onChange={patch('damId')}
                  className="w-full p-2 text-sm bg-surface-raised border border-border rounded font-mono"
                >
                  <option value="">— {t.selectMate} —</option>
                  {damOptions.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.id}{ind.sex !== undefined ? ` (${ind.sex})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                {t.matingStatus}
              </span>
              <select
                value={form.status}
                onChange={patch('status')}
                className="w-full p-2 text-sm bg-surface-raised border border-border rounded font-mono"
              >
                {MATING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t[s]}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  {t.matingDate}
                </span>
                <input
                  type="date"
                  value={form.matingDate}
                  onChange={patch('matingDate')}
                  className="w-full p-2 text-sm bg-surface-raised border border-border rounded font-mono"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                  {t.gestationDays}
                </span>
                <input
                  type="number"
                  value={form.gestationDays}
                  onChange={patch('gestationDays')}
                  min={1}
                  placeholder="e.g. 63"
                  className="w-full p-2 text-sm bg-surface-raised border border-border rounded font-mono"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                {t.dueDate}
              </span>
              <input
                type="date"
                value={form.dueDate}
                onChange={patch('dueDate')}
                className="w-full p-2 text-sm bg-surface-raised border border-border rounded font-mono"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                {t.notes}
              </span>
              <textarea
                value={form.notes}
                onChange={patch('notes')}
                rows={3}
                placeholder={t.noNotes}
                className="w-full p-2 text-sm bg-surface-raised border border-border rounded font-mono resize-y"
              />
            </label>

            {error !== null && (
              <p role="alert" className="text-xs text-red-600 font-mono break-words">
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
              onClick={handleSubmit}
              disabled={form.sireId.trim().length === 0 || form.damId.trim().length === 0}
              className="px-6 py-2 text-sm font-medium bg-brand text-white rounded hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <Heart className="w-4 h-4" aria-hidden="true" />
              {t.addMate}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
