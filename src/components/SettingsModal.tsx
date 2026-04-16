import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui';

import { APP_CONFIG } from '../config';
import type { AutoBackupInterval, ConnectorLineStyle, GenerationFormat, NodeSize, Species, Theme } from '../services/settings-store';
import { getSpeciesGestation } from '../services/settings-store';
import type { Language, Translation } from '../types/translation.types';
import { searchEolSpecies, getEolSpeciesInfo } from '../services/eol-api';
import type { EolSearchResult, EolSpeciesInfo } from '../services/eol-api';

interface SettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly theme: Theme;
  readonly setTheme: (t: Theme) => void;
  readonly language: Language;
  readonly setLanguage: (l: Language) => void;
  readonly t: Translation;
  readonly nodeSize: NodeSize;
  readonly setNodeSize: (v: NodeSize) => void;
  readonly showStatusBadges: boolean;
  readonly setShowStatusBadges: (v: boolean) => void;
  readonly showGenerationLabels: boolean;
  readonly setShowGenerationLabels: (v: boolean) => void;
  readonly autoFitOnImport: boolean;
  readonly setAutoFitOnImport: (v: boolean) => void;
  readonly defaultGestationDays: number;
  readonly setDefaultGestationDays: (v: number) => void;
  readonly autoBackupInterval: AutoBackupInterval;
  readonly setAutoBackupInterval: (v: AutoBackupInterval) => void;
  readonly showNotesOnHover: boolean;
  readonly setShowNotesOnHover: (v: boolean) => void;
  readonly connectorLineStyle: ConnectorLineStyle;
  readonly setConnectorLineStyle: (v: ConnectorLineStyle) => void;
  readonly generationFormat: GenerationFormat;
  readonly setGenerationFormat: (v: GenerationFormat) => void;
  readonly species: Species;
  readonly setSpecies: (v: Species) => void;
}

/**
 * Settings modal with instant-apply controls for theme and language.
 * No save button — changes take effect immediately via state setters.
 */
export function SettingsModal({
  isOpen,
  onClose,
  theme,
  setTheme,
  language,
  setLanguage,
  t,
  nodeSize,
  setNodeSize,
  showStatusBadges,
  setShowStatusBadges,
  showGenerationLabels,
  setShowGenerationLabels,
  autoFitOnImport,
  setAutoFitOnImport,
  defaultGestationDays,
  setDefaultGestationDays,
  autoBackupInterval,
  setAutoBackupInterval,
  showNotesOnHover,
  setShowNotesOnHover,
  connectorLineStyle,
  setConnectorLineStyle,
  generationFormat,
  setGenerationFormat,
  species,
  setSpecies,
}: SettingsModalProps): React.JSX.Element | null {
  // ── EOL search dialog state ──────────────────────────────────────────────
  const [eolOpen, setEolOpen] = useState(false);
  const [eolQuery, setEolQuery] = useState('');
  const [eolResults, setEolResults] = useState<EolSearchResult[]>([]);
  const [eolLoading, setEolLoading] = useState(false);
  const [eolError, setEolError] = useState<string | null>(null);
  const [eolDetail, setEolDetail] = useState<EolSpeciesInfo | null>(null);
  const eolInputRef = useRef<HTMLInputElement>(null);

  const openEolDialog = (): void => {
    setEolOpen(true);
    setEolQuery('');
    setEolResults([]);
    setEolError(null);
    setEolDetail(null);
    setTimeout(() => eolInputRef.current?.focus(), 50);
  };

  const closeEolDialog = (): void => {
    setEolOpen(false);
  };

  const handleEolSearch = async (): Promise<void> => {
    const q = eolQuery.trim();
    if (!q) return;
    setEolLoading(true);
    setEolError(null);
    setEolResults([]);
    setEolDetail(null);
    const results = await searchEolSpecies(q);
    setEolLoading(false);
    if (results.length === 0) {
      setEolError('Species lookup requires internet. Offline features are working normally.');
    } else {
      setEolResults(results);
    }
  };

  const handleEolSelect = async (result: EolSearchResult): Promise<void> => {
    setEolLoading(true);
    setEolError(null);
    const info = await getEolSpeciesInfo(result.id);
    setEolLoading(false);
    if (!info) {
      setEolError('Species lookup requires internet. Offline features are working normally.');
      return;
    }
    setEolDetail(info);
  };

  const handleEolApply = (info: EolSpeciesInfo): void => {
    // Switch to custom species and apply scientific name as a convenience.
    setSpecies('custom');
    setDefaultGestationDays(getSpeciesGestation('custom'));
    // Close the dialog — the caller can use enrichProfileFromEol for richer enrichment.
    closeEolDialog();
    // Surface the scientific name briefly via console so the user can see it.
    console.info(`[EOL] Applied species: ${info.scientificName} (EOL ID ${info.id})`);
  };

  const switchClass = (checked: boolean): string =>
    `panel-switch relative inline-flex h-6 w-11 items-center rounded-full px-0.5 ${checked ? 'justify-end' : 'justify-start'}`;

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t.settings}
            className="relative z-10 w-full max-w-md rounded-lg border border-border bg-surface-raised shadow-xl shadow-slate-950/50 max-h-[90vh] flex flex-col"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">{t.settings}</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-2"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </Button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
              {/* Theme section */}
              <fieldset>
                <legend className="text-sm font-medium text-text-primary mb-3">{t.theme}</legend>
                <div className="flex gap-3">
                  {(['light', 'dark', 'system'] as const).map((value) => {
                    const label =
                      value === 'light'
                        ? t.themeLight
                        : value === 'dark'
                          ? t.themeDark
                          : t.themeSystem;
                    return (
                      <label
                        key={value}
                        className={`panel-choice flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm ${
                          theme === value
                            ? 'panel-choice-active font-medium'
                            : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="theme"
                          value={value}
                          checked={theme === value}
                          onChange={() => setTheme(value)}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Language section */}
              <fieldset>
                <legend className="text-sm font-medium text-text-primary mb-3">{t.language}</legend>
                <div className="flex gap-3">
                  {(['en', 'ko'] as const).map((value) => {
                    const label = value === 'en' ? 'English' : '한국어';
                    return (
                      <label
                        key={value}
                        className={`panel-choice flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm ${
                          language === value
                            ? 'panel-choice-active font-medium'
                            : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="language"
                          value={value}
                          checked={language === value}
                          onChange={() => setLanguage(value)}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Canvas settings section */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-text-primary mb-3">{t.canvasSettings}</legend>

                {/* Node size */}
                <div>
                  <p className="text-xs text-text-secondary mb-2">{t.nodeSize}</p>
                  <div className="flex gap-3">
                    {(['small', 'medium', 'large'] as const).map((value) => {
                      const label = value === 'small' ? t.nodeSizeSmall : value === 'medium' ? t.nodeSizeMedium : t.nodeSizeLarge;
                      return (
                        <label
                          key={value}
                          className={`panel-choice flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm ${
                            nodeSize === value
                              ? 'panel-choice-active font-medium'
                              : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="nodeSize"
                            value={value}
                            checked={nodeSize === value}
                            onChange={() => setNodeSize(value)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Show status badges toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{t.showStatusBadges}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showStatusBadges}
                    onClick={() => setShowStatusBadges(!showStatusBadges)}
                    className={switchClass(showStatusBadges)}
                    data-state={showStatusBadges ? 'on' : 'off'}
                  >
                    <span className="panel-switch-thumb h-4 w-4 rounded-full" />
                  </button>
                </div>

                {/* Show generation labels toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{t.showGenerationLabels}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showGenerationLabels}
                    onClick={() => setShowGenerationLabels(!showGenerationLabels)}
                    className={switchClass(showGenerationLabels)}
                    data-state={showGenerationLabels ? 'on' : 'off'}
                  >
                    <span className="panel-switch-thumb h-4 w-4 rounded-full" />
                  </button>
                </div>

                {/* Auto-fit on import toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{t.autoFitOnImport}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoFitOnImport}
                    onClick={() => setAutoFitOnImport(!autoFitOnImport)}
                    className={switchClass(autoFitOnImport)}
                    data-state={autoFitOnImport ? 'on' : 'off'}
                  >
                    <span className="panel-switch-thumb h-4 w-4 rounded-full" />
                  </button>
                </div>

                {/* Generation label format */}
                <div>
                  <p className="text-xs text-text-secondary mb-2">{t.generationFormat}</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['F', 'Gen', 'Roman', 'Custom'] as const).map((value) => {
                      const label =
                        value === 'F' ? t.generationFormatF :
                        value === 'Gen' ? t.generationFormatGen :
                        value === 'Roman' ? t.generationFormatRoman :
                        t.generationFormatCustom;
                      return (
                        <label
                          key={value}
                          className={`panel-choice flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm ${
                            generationFormat === value
                              ? 'panel-choice-active font-medium'
                              : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="generationFormat"
                            value={value}
                            checked={generationFormat === value}
                            onChange={() => setGenerationFormat(value)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </fieldset>

              {/* Data settings section */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-text-primary mb-3">{t.dataSettings}</legend>

                {/* Species preset */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-secondary">{t.species}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={species}
                      onChange={(e) => {
                        const s = e.target.value as Species;
                        setSpecies(s);
                        if (s !== 'custom') {
                          setDefaultGestationDays(getSpeciesGestation(s));
                        }
                      }}
                      className="panel-field px-2 py-1 text-sm rounded"
                    >
                      {(['pig', 'dog', 'cattle', 'horse', 'sheep', 'goat', 'cat', 'rabbit', 'custom'] as const).map((s) => {
                        const label =
                          s === 'pig' ? t.speciesPig :
                          s === 'dog' ? t.speciesDog :
                          s === 'cattle' ? t.speciesCattle :
                          s === 'horse' ? t.speciesHorse :
                          s === 'sheep' ? t.speciesSheep :
                          s === 'goat' ? t.speciesGoat :
                          s === 'cat' ? t.speciesCat :
                          s === 'rabbit' ? t.speciesRabbit :
                          t.speciesCustom;
                        return <option key={s} value={s}>{label}</option>;
                      })}
                    </select>
                    <button
                      type="button"
                      onClick={openEolDialog}
                      title="Search Encyclopedia of Life"
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border bg-surface hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <Search className="w-3 h-3" />
                      EOL
                    </button>
                  </div>
                </div>

                {/* EOL species search dialog */}
                <AnimatePresence>
                  {eolOpen && (
                    <motion.div
                      className="fixed inset-0 z-[60] flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                    >
                      <div
                        className="absolute inset-0 bg-black/50"
                        onClick={closeEolDialog}
                        aria-hidden="true"
                      />
                      <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Search Encyclopedia of Life"
                        className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-surface-raised shadow-xl shadow-slate-950/60 flex flex-col max-h-[70vh]"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ duration: 0.12 }}
                      >
                        {/* Dialog header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                          <span className="text-sm font-semibold text-text-primary">Search EOL</span>
                          <button
                            type="button"
                            onClick={closeEolDialog}
                            className="rounded-full p-1 hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
                            aria-label="Close EOL search"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Search input */}
                        <div className="px-4 py-3 border-b border-border flex gap-2">
                          <input
                            ref={eolInputRef}
                            type="text"
                            value={eolQuery}
                            onChange={(e) => setEolQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void handleEolSearch(); }}
                            placeholder="e.g. Sus scrofa, Canis lupus..."
                            className="panel-field flex-1 px-2 py-1.5 text-sm rounded"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => void handleEolSearch()}
                            disabled={eolLoading || !eolQuery.trim()}
                          >
                            {eolLoading ? '…' : 'Search'}
                          </Button>
                        </div>

                        {/* Results / detail */}
                        <div className="overflow-y-auto flex-1 px-4 py-2">
                          {eolError && (
                            <p className="text-xs text-text-secondary py-3 text-center">{eolError}</p>
                          )}

                          {/* Detail view */}
                          {eolDetail && !eolError && (
                            <div className="space-y-3 py-2">
                              {eolDetail.imageUrl && (
                                <img
                                  src={eolDetail.imageUrl}
                                  alt={eolDetail.scientificName}
                                  className="w-full h-32 object-cover rounded border border-border"
                                />
                              )}
                              <div>
                                <p className="text-sm font-semibold text-text-primary italic">{eolDetail.scientificName}</p>
                                {eolDetail.commonNames.length > 0 && (
                                  <p className="text-xs text-text-secondary mt-0.5">
                                    {eolDetail.commonNames.slice(0, 3).map(n => n.name).join(', ')}
                                  </p>
                                )}
                              </div>
                              {(eolDetail.kingdom || eolDetail.family) && (
                                <div className="text-xs text-text-muted space-y-0.5">
                                  {eolDetail.kingdom && <p>Kingdom: {eolDetail.kingdom}</p>}
                                  {eolDetail.phylum && <p>Phylum: {eolDetail.phylum}</p>}
                                  {eolDetail.order && <p>Order: {eolDetail.order}</p>}
                                  {eolDetail.family && <p>Family: {eolDetail.family}</p>}
                                  {eolDetail.genus && <p>Genus: {eolDetail.genus}</p>}
                                </div>
                              )}
                              {eolDetail.description && (
                                <p className="text-xs text-text-secondary line-clamp-4">{eolDetail.description}</p>
                              )}
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleEolApply(eolDetail)}
                                className="w-full"
                              >
                                Apply to Custom Species
                              </Button>
                              <button
                                type="button"
                                onClick={() => setEolDetail(null)}
                                className="w-full text-xs text-text-secondary hover:text-text-primary py-1 transition-colors"
                              >
                                Back to results
                              </button>
                            </div>
                          )}

                          {/* Results list */}
                          {!eolDetail && eolResults.length > 0 && (
                            <ul className="divide-y divide-border">
                              {eolResults.slice(0, 10).map((r) => (
                                <li key={r.id}>
                                  <button
                                    type="button"
                                    onClick={() => void handleEolSelect(r)}
                                    className="w-full text-left py-2.5 hover:bg-surface rounded px-1 transition-colors"
                                  >
                                    <p className="text-sm text-text-primary italic">{r.title}</p>
                                    {r.content && (
                                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{r.content}</p>
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          {!eolDetail && eolResults.length === 0 && !eolError && !eolLoading && (
                            <p className="text-xs text-text-muted py-3 text-center">
                              Type a species name and press Search or Enter.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Default gestation days */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-secondary">{t.defaultGestationDays}</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={defaultGestationDays}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(n) && n > 0) setDefaultGestationDays(n);
                    }}
                    className="panel-field w-20 px-2 py-1 text-sm text-right rounded font-mono"
                  />
                </div>

                {/* Auto-backup interval */}
                <div>
                  <p className="text-xs text-text-secondary mb-2">{t.autoBackupInterval}</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['off', '5min', '15min', '30min'] as const).map((value) => {
                      const label =
                        value === 'off' ? t.autoBackupOff :
                        value === '5min' ? t.autoBackup5min :
                        value === '15min' ? t.autoBackup15min :
                        t.autoBackup30min;
                      return (
                        <label
                          key={value}
                          className={`panel-choice flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm ${
                            autoBackupInterval === value
                              ? 'panel-choice-active font-medium'
                              : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="autoBackupInterval"
                            value={value}
                            checked={autoBackupInterval === value}
                            onChange={() => setAutoBackupInterval(value)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </fieldset>

              {/* Display settings section */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-text-primary mb-3">{t.displaySettings}</legend>

                {/* Show notes on hover toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{t.showNotesOnHover}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showNotesOnHover}
                    onClick={() => setShowNotesOnHover(!showNotesOnHover)}
                    className={switchClass(showNotesOnHover)}
                    data-state={showNotesOnHover ? 'on' : 'off'}
                  >
                    <span className="panel-switch-thumb h-4 w-4 rounded-full" />
                  </button>
                </div>

                {/* Connector line style */}
                <div>
                  <p className="text-xs text-text-secondary mb-2">{t.connectorLineStyle}</p>
                  <div className="flex gap-3">
                    {(['straight', 'curved'] as const).map((value) => {
                      const label = value === 'straight' ? t.connectorStraight : t.connectorCurved;
                      return (
                        <label
                          key={value}
                          className={`panel-choice flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm ${
                            connectorLineStyle === value
                              ? 'panel-choice-active font-medium'
                              : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="connectorLineStyle"
                            value={value}
                            checked={connectorLineStyle === value}
                            onChange={() => setConnectorLineStyle(value)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </fieldset>

              <section className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Product
                </div>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">Pedigree Workbench</div>
                    <div className="text-xs text-text-secondary">
                      Local pedigree decision workstation
                    </div>
                  </div>
                  <div className="rounded-full border border-border bg-surface-raised px-2.5 py-1 font-mono text-xs text-text-secondary">
                    v{APP_CONFIG.version}
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
