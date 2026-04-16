import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { APP_CONFIG } from '../config';
import type { AutoBackupInterval, ConnectorLineStyle, GenerationFormat, NodeSize, Species, Theme } from '../services/settings-store';
import { getSpeciesGestation } from '../services/settings-store';
import type { Language, Translation } from '../types/translation.types';

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
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="panel-button rounded-full p-2"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
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
                </div>

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
