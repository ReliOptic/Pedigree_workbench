import { Save, Loader2 } from 'lucide-react';

import type { SaveStatus } from '../hooks/use-pedigree';
import type { Translation } from '../types/translation.types';

interface FooterProps {
  readonly t: Translation;
  readonly summary: {
    readonly totalIndividuals: number;
    readonly generations: number;
    readonly groups?: number;
  };
  readonly saveStatus: SaveStatus;
}

/**
 * Status footer. Counts come from `summarize` so they reflect the live store.
 * In-flow grid row (no `fixed` positioning); the shell's grid reserves space.
 */
export function Footer({ t, summary, saveStatus }: FooterProps): React.JSX.Element {
  return (
    <footer
      role="contentinfo"
      className="flex justify-between items-center px-4 h-8 border-t border-border bg-surface text-brand"
    >
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs">
          {t.totalIndividuals}: {summary.totalIndividuals} · {t.generations}:{' '}
          {summary.generations}
          {summary.groups !== undefined ? ` · ${t.litters}: ${summary.groups}` : ''}
        </span>
        <div className="h-3 w-[1px] bg-slate-300" aria-hidden="true" />
        {saveStatus === 'saving' ? (
          <span
            className="font-mono text-xs text-amber-600 flex items-center gap-1"
            role="status"
            aria-label={t.saving}
          >
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
            {t.saving}
          </span>
        ) : saveStatus === 'saved' ? (
          <span
            className="font-mono text-xs text-green-600 flex items-center gap-1"
            role="status"
            aria-label={t.allChangesSaved}
          >
            <Save className="w-3 h-3" aria-hidden="true" />
            {t.saved}
          </span>
        ) : (
          <span
            className="font-mono text-xs text-green-600 flex items-center gap-1"
            aria-label={t.liveCanvasSync}
          >
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" aria-hidden="true" />
            {t.liveCanvasSync}
          </span>
        )}
      </div>
      <span className="font-mono text-xs text-text-secondary">
        {t.pressQuestionForHelp}
      </span>
    </footer>
  );
}
