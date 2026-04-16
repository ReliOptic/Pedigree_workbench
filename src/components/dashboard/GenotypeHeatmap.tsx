/**
 * CD163 KO efficiency heatmap.
 * One cell per individual, colored by KO efficiency (0=red, 0.5=yellow, 1=green).
 * Uses resolveGenotype() from genotype-resolver.ts for all field access.
 */

import type { Individual } from '../../types/pedigree.types';
import { resolveGenotype } from '../../services/genotype-resolver';

interface GenotypeHeatmapProps {
  readonly individuals: readonly Individual[];
  readonly onSelectIndividual?: (id: string) => void;
}

/** Interpolate between red→yellow→green based on efficiency 0-1 */
function efficiencyToColor(eff: number): string {
  if (eff <= 0.5) {
    // red → yellow
    const t = eff / 0.5;
    const r = 239;
    const g = Math.round(68 + (234 - 68) * t);
    const b = 68;
    return `rgb(${r},${g},${b})`;
  } else {
    // yellow → green
    const t = (eff - 0.5) / 0.5;
    const r = Math.round(234 - (234 - 34) * t);
    const g = Math.round(234 - (234 - 197) * t);
    const b = Math.round(68 - (68 - 94) * t);
    return `rgb(${r},${g},${b})`;
  }
}

function parseEfficiency(raw: string): number | null {
  const n = parseFloat(raw);
  if (!isNaN(n) && n >= 0 && n <= 1) return n;
  return null;
}

export function GenotypeHeatmap({ individuals, onSelectIndividual }: GenotypeHeatmapProps): React.JSX.Element {
  if (individuals.length === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">No individuals loaded</p>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {individuals.map((ind) => {
        const { loci } = resolveGenotype(ind);
        const cd163 = loci['CD163'];
        const genotype = loci['genotype'];
        const eff = cd163 !== undefined ? parseEfficiency(cd163) : null;
        const label = ind.label ?? ind.id;

        let bgColor = 'var(--surface-overlay)'; // N/A
        let title = `${label}\nCD163: N/A`;
        let textColor = 'var(--text-muted)';

        if (eff !== null) {
          bgColor = efficiencyToColor(eff);
          title = `${label}\nCD163 KO efficiency: ${(eff * 100).toFixed(0)}%`;
          if (genotype) title += `\nGenotype: ${genotype}`;
          textColor = 'var(--text-primary)';
        }

        return (
          <button
            key={ind.id}
            type="button"
            onClick={() => onSelectIndividual?.(ind.id)}
            className="w-8 h-8 rounded text-[9px] font-mono flex items-center justify-center border border-white/20 hover:ring-2 hover:ring-brand transition-all cursor-pointer overflow-hidden"
            style={{ backgroundColor: bgColor, color: textColor }}
            title={title}
            aria-label={title}
          >
            {eff !== null ? `${Math.round(eff * 100)}` : 'N/A'}
          </button>
        );
      })}
    </div>
  );
}
