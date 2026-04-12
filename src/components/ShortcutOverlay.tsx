import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import type { Translation } from '../types/translation.types';

interface ShortcutOverlayProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly t: Translation;
}

interface ShortcutEntry {
  readonly keys: string;
  readonly description: string;
}

/**
 * Modal overlay listing all keyboard shortcuts in categorised sections.
 * Triggered by pressing `?` from the canvas. Follows the same AnimatePresence
 * modal pattern used by SettingsModal.
 */
export function ShortcutOverlay({
  isOpen,
  onClose,
  t,
}: ShortcutOverlayProps): React.JSX.Element | null {
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

  const sections: readonly {
    readonly title: string;
    readonly shortcuts: readonly ShortcutEntry[];
  }[] = [
    {
      title: t.shortcutCanvas,
      shortcuts: [
        { keys: 'Arrow keys', description: 'Pan canvas' },
        { keys: '+ / -', description: 'Zoom in / out' },
        { keys: '0', description: 'Fit to screen' },
        { keys: 'Scroll wheel', description: 'Zoom (cursor-anchored)' },
        { keys: 'Escape', description: 'Deselect node' },
      ],
    },
    {
      title: t.shortcutSearch,
      shortcuts: [
        { keys: '/', description: 'Focus search' },
        { keys: 'Escape', description: 'Clear & blur' },
      ],
    },
    {
      title: t.shortcutEdit,
      shortcuts: [
        { keys: 'Ctrl+Z', description: 'Undo' },
        { keys: 'Ctrl+Shift+Z', description: 'Redo' },
      ],
    },
    {
      title: t.shortcutContextMenu,
      shortcuts: [
        { keys: 'Right-click node', description: 'Node actions menu' },
        { keys: 'Right-click canvas', description: 'Canvas actions menu' },
        { keys: '\u2191 / \u2193', description: 'Navigate menu' },
        { keys: 'Enter', description: 'Select item' },
        { keys: 'Escape', description: 'Close menu' },
      ],
    },
    {
      title: t.shortcutGeneral,
      shortcuts: [{ keys: '?', description: 'Toggle this help' }],
    },
  ];

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
            aria-label={t.keyboardShortcuts}
            className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">
                {t.keyboardShortcuts}
              </h2>
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
              {sections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">
                    {section.title}
                  </h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {section.shortcuts.map((shortcut) => (
                        <tr key={shortcut.keys}>
                          <td className="py-1 pr-4 w-40 align-top">
                            <kbd className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-primary">
                              {shortcut.keys}
                            </kbd>
                          </td>
                          <td className="py-1 text-text-secondary">
                            {shortcut.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
