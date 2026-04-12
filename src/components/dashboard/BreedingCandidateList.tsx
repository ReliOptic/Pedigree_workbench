/**
 * Lists individuals with breeding-ready status.
 * "Ready for mating" if sex + CD163 genotype are present.
 * Uses resolveGenotype() for all genotype field access.
 */

import type { Individual } from '../../types/pedigree.types';
import { resolveGenotype } from '../../services/genotype-resolver';

interface BreedingCandidateListProps {
  readonly individuals: readonly Individual[];
  readonly onSelectIndividual?: (id: string) => void;
}

function isBreedingCandidate(ind: Individual): boolean {
  if (!ind.status) return false;
  return (
    ind.status === '교배예정돈' ||
    ind.status.toLowerCase().includes('breeding')
  );
}

function sexLabel(sex: string | undefined): string {
  if (!sex) return '?';
  const s = sex.trim().toLowerCase();
  if (s === 'm' || s === 'male' || s === '수컷') return 'M';
  if (s === 'f' || s === 'female' || s === '암컷') return 'F';
  return '?';
}

export function BreedingCandidateList({
  individuals,
  onSelectIndividual,
}: BreedingCandidateListProps): React.JSX.Element {
  const candidates = individuals.filter(isBreedingCandidate);

  if (candidates.length === 0) {
    return <p className="text-xs text-slate-400">No breeding candidates</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {candidates.map((ind) => {
        const { loci } = resolveGenotype(ind);
        const cd163 = loci['CD163'];
        const genotype = loci['genotype'];
        const hasSex = !!ind.sex && ind.sex.trim() !== '';
        const hasGenotype = !!cd163 || !!genotype;
        const ready = hasSex && hasGenotype;
        const label = ind.label ?? ind.id;
        const sx = sexLabel(ind.sex);

        return (
          <button
            key={ind.id}
            type="button"
            onClick={() => onSelectIndividual?.(ind.id)}
            className="w-full text-left flex items-center justify-between px-3 py-2 bg-surface border border-border rounded-lg hover:border-brand transition-colors group"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-primary group-hover:text-brand">{label}</span>
                <span className={`text-[10px] font-mono px-1 rounded ${sx === 'M' ? 'bg-blue-100 text-blue-700' : sx === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-500'}`}>
                  {sx}
                </span>
                {ind.group !== undefined && (
                  <span className="text-[10px] text-slate-400">{ind.group}</span>
                )}
              </div>
              {(cd163 ?? genotype) !== undefined && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {cd163 !== undefined && `CD163: ${cd163}`}
                  {cd163 !== undefined && genotype !== undefined && ' · '}
                  {genotype !== undefined && genotype}
                </span>
              )}
            </div>
            <div className="flex-shrink-0">
              {ready ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 font-medium">
                  Ready
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-medium">
                  Needs data
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
