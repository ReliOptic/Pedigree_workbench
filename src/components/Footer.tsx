import type { Translation } from '../types/translation.types';

interface FooterProps {
  readonly t: Translation;
  readonly summary: {
    readonly totalIndividuals: number;
    readonly generations: number;
    readonly groups?: number;
  };
}

/**
 * Status footer. Counts come from `summarize` so they reflect the live store.
 * In-flow grid row (no `fixed` positioning); the shell's grid reserves space.
 */
export function Footer({ t, summary }: FooterProps): React.JSX.Element {
  return (
    <footer
      role="contentinfo"
      className="flex justify-between items-center px-4 h-8 border-t border-border bg-surface text-brand"
    >
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs">
          {t.totalIndividuals}: {summary.totalIndividuals} · {t.generations}:{' '}
          {summary.generations}
          {summary.groups !== undefined ? ` · litters: ${summary.groups}` : ''}
        </span>
        <div className="h-3 w-[1px] bg-slate-300" aria-hidden="true" />
        <span
          className="font-mono text-xs text-green-600 flex items-center gap-1"
          aria-label={t.liveCanvasSync}
        >
          <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" aria-hidden="true" />
          {t.liveCanvasSync}
        </span>
      </div>
    </footer>
  );
}
