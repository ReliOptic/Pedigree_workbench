import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import type { Theme } from '../services/settings-store';
import type { Language, Translation } from '../types/translation.types';

interface SettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly theme: Theme;
  readonly setTheme: (t: Theme) => void;
  readonly language: Language;
  readonly setLanguage: (l: Language) => void;
  readonly t: Translation;
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
}: SettingsModalProps): React.JSX.Element | null {
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
            className="relative z-10 w-full max-w-md rounded-lg border border-border bg-surface-raised shadow-xl"
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
                className="p-1 rounded hover:bg-surface transition"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-6">
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
                        className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition text-sm ${
                          theme === value
                            ? 'border-brand bg-brand/10 text-brand font-medium'
                            : 'border-border text-text-secondary hover:border-border-strong'
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
                        className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition text-sm ${
                          language === value
                            ? 'border-brand bg-brand/10 text-brand font-medium'
                            : 'border-border text-text-secondary hover:border-border-strong'
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
