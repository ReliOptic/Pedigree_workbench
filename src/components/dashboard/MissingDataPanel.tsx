/**
 * Missing Data Panel — shows data completeness with progress bars
 * and "fix suggestion" text for high-severity gaps.
 */

import type { MissingDataAlert } from '../../types/breeding.types';

interface MissingDataPanelProps {
  readonly missingAlerts: readonly MissingDataAlert[];
  readonly onJumpToWorkbench?: (individualId?: string) => void;
}

const BAR_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-green-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
};

const LABEL_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
};

function fixSuggestion(alert: MissingDataAlert): string | null {
  if (alert.severity !== 'high') return null;
  return `${alert.missingCount} individuals missing ${alert.field} data`;
}

export function MissingDataPanel({ missingAlerts, onJumpToWorkbench }: MissingDataPanelProps): React.JSX.Element {
  if (missingAlerts.length === 0) {
    return (
      <p className="text-xs text-green-600 font-medium">All fields complete</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {missingAlerts.map((alert) => {
        const completenessRate = 1 - alert.rate;
        const suggestion = fixSuggestion(alert);
        return (
          <div key={alert.field} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${LABEL_COLOR[alert.severity]}`}>
                {alert.field}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">
                  {alert.totalCount - alert.missingCount}/{alert.totalCount} &nbsp;
                  <span className="font-medium">{Math.round(completenessRate * 100)}%</span>
                </span>
                {alert.severity === 'high' && onJumpToWorkbench !== undefined && (
                  <button
                    type="button"
                    onClick={() => onJumpToWorkbench()}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800/60 transition-colors whitespace-nowrap"
                  >
                    View in Workbench
                  </button>
                )}
              </div>
            </div>
            {/* Completeness bar (filled = present data) */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${BAR_COLOR[alert.severity]}`}
                style={{ width: `${completenessRate * 100}%` }}
              />
            </div>
            {suggestion !== null && (
              <p className="text-[10px] text-red-600 flex items-center gap-1">
                <span aria-hidden="true">!</span>
                {suggestion}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
