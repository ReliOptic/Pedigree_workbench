import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import type { Individual } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';

interface NodeInspectorProps {
  readonly individual: Individual | null;
  readonly onClose: () => void;
  readonly t: Translation;
}

interface Row {
  readonly key: string;
  readonly value: string;
}

/**
 * Collects the fields surfaced in the drawer card body for a given
 * individual. Reserved fields come first in a fixed order, followed by
 * every free-form field from `individual.fields`. Empty values render as
 * "─" per PRD §5.2.
 */
function collectRows(ind: Individual): readonly Row[] {
  const rows: Row[] = [];
  const push = (key: string, value: string | undefined): void => {
    rows.push({ key, value: value !== undefined && value.length > 0 ? value : '─' });
  };
  push('sex', ind.sex);
  push('birth_date', ind.birthDate);
  push('sire', ind.sire);
  push('dam', ind.dam);
  push('group', ind.group);
  push('surrogate', ind.surrogate);
  push('status', ind.status);
  for (const [k, v] of Object.entries(ind.fields)) {
    rows.push({ key: k, value: v.length > 0 ? v : '─' });
  }
  return rows;
}

/**
 * Right-side inspector for a single individual.
 *
 * Displays every column the import left on the record. Reserved fields
 * take known positions; the rest are rendered as raw key/value pairs so
 * the app never silently drops data. Read-only in v1.
 */
export function NodeInspector({ individual, onClose, t }: NodeInspectorProps): React.JSX.Element {
  const rows = individual !== null ? collectRows(individual) : [];
  return (
    <AnimatePresence>
      {individual !== null && (
        <motion.aside
          initial={{ x: 360 }}
          animate={{ x: 0 }}
          exit={{ x: 360 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-[360px] flex flex-col z-40 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          <div className="p-6 pt-20 border-b border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-sm font-bold">{t.nodeInspector}</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-[#003b5a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="font-mono text-xs text-slate-900 font-bold">
              {individual.id}
              {individual.generation !== undefined ? ` (${individual.generation})` : ''}
            </p>
            {individual.label !== undefined && (
              <p className="font-mono text-[11px] text-slate-500">{individual.label}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            <table className="w-full text-xs font-mono">
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-slate-100 dark:border-slate-800"
                    data-testid={`inspector-row-${row.key}`}
                  >
                    <td className="py-1 pr-3 text-slate-400 uppercase tracking-tight whitespace-nowrap align-top">
                      {row.key}
                    </td>
                    <td className="py-1 text-slate-700 dark:text-slate-200 break-words">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-mono text-slate-400 text-center">
            {t.individualId}: {individual.id}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
