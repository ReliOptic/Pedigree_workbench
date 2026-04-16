import { useEffect, useMemo, useState } from 'react';
import { computeInbreedingCoefficient } from '../services/kinship';
import { X, Pencil, Check, Trash2, Copy as CopyIcon, FlaskConical, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { StructureViewer } from './StructureViewer';

import {
  SEQUENCE_REGEX,
  SEQUENCE_SOURCES,
  type Individual,
  type Mating,
  type SequenceSource,
} from '../types/pedigree.types';
import type { Language, Translation } from '../types/translation.types';
import { generateCertificate } from '../services/pedigree-certificate';
import { downloadFile } from '../services/pedigree-export';

interface NodeInspectorProps {
  readonly individual: Individual | null;
  readonly allIndividuals: readonly Individual[];
  readonly onClose: () => void;
  readonly onUpdate: (id: string, patch: Partial<Individual>) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly t: Translation;
  readonly matings: readonly Mating[];
  readonly onDeleteMating: (id: string) => void;
  readonly onUpdateMating: (mating: Mating) => void;
  readonly species: string;
  readonly language: Language;
}

interface FormState {
  sex: string;
  generation: string;
  sire: string;
  dam: string;
  group: string;
  surrogate: string;
  birthDate: string;
  status: string;
  label: string;
  sequence: string;
  sequenceSource: string;
}

function initialForm(ind: Individual): FormState {
  return {
    sex: ind.sex ?? '',
    generation: ind.generation ?? '',
    sire: ind.sire ?? '',
    dam: ind.dam ?? '',
    group: ind.group ?? '',
    surrogate: ind.surrogate ?? '',
    birthDate: ind.birthDate ?? '',
    status: ind.status ?? '',
    label: ind.label ?? '',
    sequence: ind.sequence ?? '',
    sequenceSource: ind.sequenceSource ?? '',
  };
}

/** Builds the patch to send to `updateOne`. Undefined values clear the column. */
function buildPatch(form: FormState): Partial<Individual> {
  const sanitized = form.sequence.replace(/\s+/g, '').toUpperCase();
  return {
    sex: form.sex.trim() === '' ? undefined : form.sex.trim(),
    generation: form.generation.trim() === '' ? undefined : form.generation.trim(),
    sire: form.sire.trim() === '' ? undefined : form.sire.trim(),
    dam: form.dam.trim() === '' ? undefined : form.dam.trim(),
    group: form.group.trim() === '' ? undefined : form.group.trim(),
    surrogate: form.surrogate.trim() === '' ? undefined : form.surrogate.trim(),
    birthDate: form.birthDate.trim() === '' ? undefined : form.birthDate.trim(),
    status: form.status.trim() === '' ? undefined : form.status.trim(),
    label: form.label.trim() === '' ? undefined : form.label.trim(),
    sequence: sanitized === '' ? undefined : sanitized,
    sequenceSource:
      form.sequenceSource.trim() === ''
        ? undefined
        : (form.sequenceSource.trim() as SequenceSource),
  };
}

/**
 * Right-side inspector for a single individual.
 *
 * Read mode: displays every reserved + free-form field as key/value rows
 * plus a PCR sequence section (when present) with length, monospace body,
 * Copy button, and a stub "View in AlphaFold" button wired for the future.
 *
 * Edit mode: form inputs for all reserved fields, `<select>` for sire/dam
 * populated from other individuals, textarea for the sequence. Save calls
 * `onUpdate`; Delete triggers a confirmation then `onDelete`.
 */
export function NodeInspector({
  individual,
  allIndividuals,
  onClose,
  onUpdate,
  onDelete,
  t,
  matings,
  onDeleteMating,
  onUpdateMating,
  species,
  language,
}: NodeInspectorProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<boolean>(false);
  const [copiedAt, setCopiedAt] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showStructureViewer, setShowStructureViewer] = useState<boolean>(false);
  const [notesOpen, setNotesOpen] = useState<boolean>(false);
  const [notesValue, setNotesValue] = useState<string>('');
  const [matingsOpen, setMatingsOpen] = useState<boolean>(false);

  // Reset edit state whenever the selection changes.
  useEffect(() => {
    setIsEditing(false);
    setForm(null);
    setFormError(null);
    setConfirmingDelete(false);
    setShowStructureViewer(false);
    setNotesOpen(false);
    setNotesValue(individual?.notes ?? '');
  }, [individual?.id, individual?.notes]);

  const parentOptions = useMemo(
    () => allIndividuals.filter((i) => i.id !== individual?.id).map((i) => i.id),
    [allIndividuals, individual?.id],
  );

  const sequenceLen = useMemo(
    () => (individual?.sequence !== undefined ? individual.sequence.replace(/\s/g, '').length : 0),
    [individual?.sequence],
  );

  const coi = useMemo(() => {
    if (individual === null) return 0;
    return computeInbreedingCoefficient(individual.id, allIndividuals);
  }, [individual, allIndividuals]);

  const certificate = useMemo(() => {
    if (individual === null) return null;
    return generateCertificate(individual, allIndividuals, { species, language });
  }, [individual, allIndividuals, species, language]);

  const beginEdit = (): void => {
    if (individual === null) return;
    setForm(initialForm(individual));
    setIsEditing(true);
    setFormError(null);
  };

  const cancelEdit = (): void => {
    setIsEditing(false);
    setForm(null);
    setFormError(null);
  };

  const saveEdit = async (): Promise<void> => {
    if (individual === null || form === null) return;
    // Validate sequence before sending to the store.
    const rawSeq = form.sequence.replace(/\s+/g, '');
    if (rawSeq.length > 0 && !SEQUENCE_REGEX.test(rawSeq)) {
      setFormError('Sequence must contain only IUPAC nucleotide codes (ACGTUN...).');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdate(individual.id, buildPatch(form));
      setIsEditing(false);
      setForm(null);
      setFormError(null);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (individual === null) return;
    try {
      await onDelete(individual.id);
      onClose();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Failed to delete.');
      setConfirmingDelete(false);
    }
  };

  const handleCopySequence = async (): Promise<void> => {
    if (individual?.sequence === undefined) return;
    try {
      await navigator.clipboard.writeText(individual.sequence);
      setCopiedAt(Date.now());
    } catch {
      // Clipboard may be unavailable in some contexts (iframe, old browsers).
    }
  };

  return (
    <AnimatePresence>
      {individual !== null && (
        <motion.aside
          role="complementary"
          aria-labelledby="inspector-title"
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="h-full w-[400px] flex flex-col bg-surface border-l border-border shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-border">
            <div className="flex justify-between items-start mb-2">
              <h2 id="inspector-title" className="text-sm font-bold">
                {t.nodeInspector}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close inspector"
                className="text-text-muted hover:text-brand transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <p className="font-mono text-sm text-text-primary font-bold break-all">
              {individual.id}
              {individual.generation !== undefined ? ` (${individual.generation})` : ''}
            </p>
            {individual.label !== undefined && (
              <p
                data-testid="inspector-label-display"
                className="font-mono text-xs text-text-secondary"
              >
                {individual.label}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => void saveEdit()}
                    disabled={isSaving}
                    data-testid="inspector-save"
                    className="panel-button panel-button-primary inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                    {t.save}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="panel-button inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded"
                  >
                    {t.cancel}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={beginEdit}
                    data-testid="inspector-edit"
                    className="panel-button panel-button-primary inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded"
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                    {t.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    data-testid="inspector-delete"
                    className="panel-button inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded text-red-600 dark:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    {t.delete}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {formError !== null && (
              <div role="alert" className="p-2 text-xs text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded">
                {formError}
              </div>
            )}

            {isEditing && form !== null ? (
              <EditForm
                form={form}
                setForm={setForm}
                parentOptions={parentOptions}
              />
            ) : (
              <ReadRows ind={individual} />
            )}

            {/* COI Section */}
            {individual !== null && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-surface-raised border border-border">
                <div className="text-xs font-semibold text-text-muted mb-1">
                  Inbreeding Coefficient (COI)
                </div>
                <div className={`text-lg font-bold ${
                  coi >= 0.125 ? 'text-red-600 dark:text-red-400' :
                  coi >= 0.0625 ? 'text-amber-600 dark:text-amber-400' :
                  coi > 0 ? 'text-indigo-600 dark:text-indigo-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {(coi * 100).toFixed(2)}%
                </div>
                {coi >= 0.0625 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {coi >= 0.125
                      ? '⚠ High inbreeding — increased genetic risk'
                      : 'Caution: moderate inbreeding level'
                    }
                  </div>
                )}
              </div>
            )}

            {certificate !== null && (
              <section className="pt-2 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                    Pedigree Certificate
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      downloadFile(
                        JSON.stringify(certificate, null, 2),
                        `${certificate.subject.id}-certificate.json`,
                        'application/json',
                      );
                    }}
                    className="panel-button inline-flex items-center gap-1.5 px-2 h-7 text-xs font-medium rounded"
                  >
                    <CopyIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    Export JSON
                  </button>
                </div>
                <div className="rounded-lg bg-surface-raised border border-border px-3 py-2 text-xs text-text-secondary space-y-1">
                  <div><span className="font-semibold">Species:</span> {certificate.speciesName}</div>
                  <div><span className="font-semibold">Ancestor slots:</span> {certificate.ancestors.length}</div>
                  <div><span className="font-semibold">COI:</span> {(certificate.coi * 100).toFixed(2)}%</div>
                  <div><span className="font-semibold">Generated:</span> {new Date(certificate.generatedAt).toLocaleString()}</div>
                </div>
              </section>
            )}

            {/* Notes section */}
            <section aria-labelledby="notes-heading" className="pt-2 border-t border-border">
              <button
                type="button"
                id="notes-heading"
                onClick={() => setNotesOpen((prev) => !prev)}
                className="flex items-center gap-1.5 w-full text-xs font-bold text-text-secondary uppercase tracking-wide mb-2 hover:text-brand transition-colors"
                aria-expanded={notesOpen}
              >
                {notesOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {t.notes}
              </button>
              {notesOpen && (
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onBlur={() => {
                    if (individual !== null) {
                      void onUpdate(individual.id, {
                        notes: notesValue.trim().length > 0 ? notesValue : undefined,
                      });
                    }
                  }}
                  placeholder={t.noNotes}
                  rows={4}
                  className="w-full p-2 text-xs bg-surface-raised text-text-primary border border-border rounded resize-y font-mono"
                />
              )}
            </section>

            {/* Matings section */}
            <IndividualMatings
              individual={individual}
              allIndividuals={allIndividuals}
              matings={matings}
              isOpen={matingsOpen}
              onToggle={() => setMatingsOpen((prev) => !prev)}
              onDeleteMating={onDeleteMating}
              onUpdateMating={onUpdateMating}
              t={t}
            />

            {/* Sequence section */}
            <section aria-labelledby="sequence-heading" className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <h3
                  id="sequence-heading"
                  className="text-xs font-bold text-text-secondary uppercase tracking-wide"
                >
                  {t.sequence} (PCR)
                </h3>
                {!isEditing && individual.sequence !== undefined && (
                  <span className="font-mono text-xs text-text-secondary">
                    {t.sequenceLength}: {sequenceLen.toLocaleString()} bp
                    {individual.sequenceSource !== undefined ? ` · ${individual.sequenceSource}` : ''}
                  </span>
                )}
              </div>
              {isEditing && form !== null ? (
                <div className="space-y-2">
                  <select
                    value={form.sequenceSource}
                    onChange={(e) =>
                      setForm((f) => (f === null ? f : { ...f, sequenceSource: e.target.value }))
                    }
                    className="w-full p-2 text-xs bg-surface-raised text-text-primary border border-border rounded"
                    aria-label={t.sequenceSource}
                  >
                    <option value="">— {t.none} —</option>
                    {SEQUENCE_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <textarea
                    data-testid="inspector-sequence"
                    value={form.sequence}
                    onChange={(e) =>
                      setForm((f) => (f === null ? f : { ...f, sequence: e.target.value }))
                    }
                    placeholder="ATGCGTA... (IUPAC codes, whitespace ignored)"
                    spellCheck={false}
                    rows={6}
                    className="w-full p-2 font-mono text-xs bg-surface-raised text-text-primary border border-border rounded resize-y"
                  />
                </div>
              ) : individual.sequence !== undefined ? (
                <div className="space-y-2">
                  <pre className="p-2 font-mono text-[11px] leading-snug text-text-secondary bg-surface-raised border border-border rounded max-h-40 overflow-auto break-all whitespace-pre-wrap">
                    {individual.sequence}
                  </pre>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopySequence()}
                      className="panel-button inline-flex items-center gap-1.5 px-2 h-7 text-xs font-medium rounded"
                    >
                      <CopyIcon className="w-3.5 h-3.5" aria-hidden="true" />
                      {Date.now() - copiedAt < 1500 ? t.copied : t.copy}
                    </button>
                    <button
                      type="button"
                      data-testid="predict-structure"
                      onClick={() => setShowStructureViewer(true)}
                      className="panel-button inline-flex items-center gap-1.5 px-2 h-7 text-xs font-medium rounded"
                    >
                      <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                      {t.predictStructure}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">— {t.none} —</p>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border bg-surface-raised text-[11px] font-mono text-text-muted text-center">
            {t.individualId}: {individual.id}
          </div>

          {/* Structure viewer modal */}
          {individual.sequence !== undefined && individual.sequence.length > 0 && (
            <StructureViewer
              isOpen={showStructureViewer}
              dnaSequence={individual.sequence}
              onClose={() => setShowStructureViewer(false)}
              t={t}
            />
          )}

          {/* Delete confirmation overlay */}
          {confirmingDelete && (
            <div
              role="alertdialog"
              aria-labelledby="confirm-delete-title"
              className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <div className="max-w-xs text-center space-y-4">
                <Trash2 className="w-8 h-8 text-red-600 mx-auto" aria-hidden="true" />
                <p id="confirm-delete-title" className="text-sm text-text-primary">
                  {t.confirmDelete}
                </p>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="panel-button px-3 h-8 text-xs font-medium rounded"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmDelete()}
                    data-testid="inspector-confirm-delete"
                    className="px-3 h-8 text-xs font-medium bg-red-600 text-white rounded hover:brightness-110 transition"
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/* ------------------------ subcomponents ------------------------ */

function ReadRows({ ind }: { readonly ind: Individual }): React.JSX.Element {
  const entries: Array<[string, string | undefined]> = [
    ['sex', ind.sex],
    ['birth_date', ind.birthDate],
    ['sire', ind.sire],
    ['dam', ind.dam],
    ['group', ind.group],
    ['surrogate', ind.surrogate],
    ['status', ind.status],
  ];
  return (
    <table className="w-full text-xs font-mono">
      <tbody>
        {entries.map(([key, value]) => (
          <tr
            key={key}
            className="border-b border-border"
            data-testid={`inspector-row-${key}`}
          >
            <th
              scope="row"
              className="py-1.5 pr-3 text-text-muted uppercase tracking-tight whitespace-nowrap align-top text-left font-normal"
            >
              {key}
            </th>
            <td className="py-1.5 text-text-secondary break-words">
              {value !== undefined && value.length > 0 ? value : '─'}
            </td>
          </tr>
        ))}
        {Object.entries(ind.fields).map(([k, v]) => (
          <tr key={`f-${k}`} className="border-b border-border" data-testid={`inspector-row-${k}`}>
            <th
              scope="row"
              className="py-1.5 pr-3 text-text-muted uppercase tracking-tight whitespace-nowrap align-top text-left font-normal"
            >
              {k}
            </th>
            <td className="py-1.5 text-text-secondary break-words">
              {v.length > 0 ? v : '─'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EditForm({
  form,
  setForm,
  parentOptions,
}: {
  readonly form: FormState;
  readonly setForm: (updater: (prev: FormState | null) => FormState | null) => void;
  readonly parentOptions: readonly string[];
}): React.JSX.Element {
  const patch =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      const value = e.target.value;
      setForm((f) => (f === null ? f : { ...f, [key]: value }));
    };
  return (
    <div className="grid grid-cols-1 gap-3">
      <Field label="label">
        <input
          type="text"
          value={form.label}
          onChange={patch('label')}
          className="w-full p-1.5 text-xs bg-surface-raised text-text-primary border border-border rounded font-mono"
        />
      </Field>
      <Field label="sex">
        <input
          type="text"
          value={form.sex}
          onChange={patch('sex')}
          placeholder="수컷 / 암컷 / M / F"
          className="w-full p-1.5 text-xs bg-surface-raised text-text-primary border border-border rounded font-mono"
        />
      </Field>
      <Field label="generation">
        <input
          type="text"
          value={form.generation}
          onChange={patch('generation')}
          placeholder="F0 / F1 / F2 ..."
          className="w-full p-1.5 text-xs bg-surface-raised text-text-primary border border-border rounded font-mono"
        />
      </Field>
      <Field label="sire">
        <select
          value={form.sire}
          onChange={patch('sire')}
          className="w-full p-1.5 text-xs bg-surface-raised text-text-primary border border-border rounded font-mono"
        >
          <option value="">— none —</option>
          {parentOptions.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </Field>
      <Field label="dam">
        <select
          value={form.dam}
          onChange={patch('dam')}
          className="w-full p-1.5 text-xs bg-surface-raised text-text-primary border border-border rounded font-mono"
        >
          <option value="">— none —</option>
          {parentOptions.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </Field>
      <Field label="group">
        <input
          type="text"
          value={form.group}
          onChange={patch('group')}
          className="w-full p-1.5 text-xs bg-surface-raised text-text-primary border border-border rounded font-mono"
        />
      </Field>
      <Field label="surrogate">
        <input
          type="text"
          value={form.surrogate}
          onChange={patch('surrogate')}
          className="w-full p-1.5 text-xs bg-surface-raised text-text-primary border border-border rounded font-mono"
        />
      </Field>
      <Field label="birth_date">
        <input
          type="text"
          value={form.birthDate}
          onChange={patch('birthDate')}
          placeholder="YYYY-MM-DD"
          className="w-full p-1.5 text-xs bg-surface-raised text-text-primary border border-border rounded font-mono"
        />
      </Field>
      <Field label="status">
        <input
          type="text"
          value={form.status}
          onChange={patch('status')}
          className="w-full p-1.5 text-xs bg-surface-raised text-text-primary border border-border rounded font-mono"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-text-muted uppercase tracking-tight">{label}</span>
      {children}
    </label>
  );
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  planned: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100',
  mated: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-200',
  pregnant: 'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-200',
  delivered: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-200',
  failed: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-200',
};

function IndividualMatings({
  individual,
  allIndividuals,
  matings,
  isOpen,
  onToggle,
  onDeleteMating,
  onUpdateMating,
  t,
}: {
  readonly individual: Individual | null;
  readonly allIndividuals: readonly Individual[];
  readonly matings: readonly Mating[];
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onDeleteMating: (id: string) => void;
  readonly onUpdateMating: (mating: Mating) => void;
  readonly t: Translation;
}): React.JSX.Element | null {
  if (individual === null) return null;

  const myMatings = matings.filter(
    (m) => m.sireId === individual.id || m.damId === individual.id,
  );

  const getPartnerName = (m: Mating): string => {
    const partnerId = m.sireId === individual.id ? m.damId : m.sireId;
    const partner = allIndividuals.find((i) => i.id === partnerId);
    return partner?.label ?? partner?.id ?? partnerId;
  };

  return (
    <section aria-labelledby="matings-heading" className="pt-2 border-t border-border">
      <button
        type="button"
        id="matings-heading"
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full text-xs font-bold text-text-secondary uppercase tracking-wide mb-2 hover:text-brand transition-colors"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        {t.matings}
        {myMatings.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 rounded-full font-mono">
            {myMatings.length}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="space-y-2">
          {myMatings.length === 0 ? (
            <p className="text-xs text-text-muted italic">— {t.noMatings} —</p>
          ) : (
            myMatings.map((m) => (
              <div
                key={m.id}
                className="p-2 bg-surface-raised border border-border rounded text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-medium text-text-secondary truncate">
                    {getPartnerName(m)}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${STATUS_BADGE_CLASSES[m.status] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100'}`}
                  >
                    {t[m.status]}
                  </span>
                </div>
                {m.matingDate !== undefined && (
                  <p className="text-text-muted font-mono">{m.matingDate}</p>
                )}
                {m.dueDate !== undefined && (
                  <p className="text-text-muted font-mono">{t.dueDate}: {m.dueDate}</p>
                )}
                {m.notes !== undefined && (
                  <p className="text-text-muted italic">{m.notes}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <select
                    value={m.status}
                    onChange={(e) =>
                      onUpdateMating({ ...m, status: e.target.value as Mating['status'] })
                    }
                    className="flex-1 p-1 text-[11px] bg-surface-raised text-text-primary border border-border rounded font-mono"
                    aria-label={t.matingStatus}
                  >
                    {(['planned', 'mated', 'pregnant', 'delivered', 'failed'] as const).map((s) => (
                      <option key={s} value={s}>
                        {t[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onDeleteMating(m.id)}
                    className="p-1 text-red-500 hover:text-red-700 transition"
                    aria-label={`${t.delete} mating`}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
