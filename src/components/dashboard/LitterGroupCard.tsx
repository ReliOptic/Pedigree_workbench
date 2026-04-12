import type { LitterGroup } from '../../types/breeding.types';

interface LitterGroupCardProps {
  readonly group: LitterGroup;
  readonly onSelectIndividual?: (id: string) => void;
}

const STATUS_BADGE: Record<string, string> = {
  '교배예정돈': 'bg-green-100 text-green-800 border-green-300',
  '폐사': 'bg-red-100 text-red-800 border-red-300',
  '압사': 'bg-red-100 text-red-800 border-red-300',
  '사산': 'bg-red-100 text-red-800 border-red-300',
  '체미돈': 'bg-amber-100 text-amber-800 border-amber-300',
  '기형': 'bg-slate-100 text-slate-600 border-slate-300',
  '도태': 'bg-slate-100 text-slate-600 border-slate-300',
};

function getStatusBadgeClass(status: string | undefined): string {
  if (!status) return '';
  return STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600 border-slate-300';
}

/**
 * Displays one litter group as a card with sex distribution bar
 * and clickable individual chips.
 */
export function LitterGroupCard({ group, onSelectIndividual }: LitterGroupCardProps): React.JSX.Element {
  const { groupId, surrogate, individuals, sexDistribution } = group;
  const total = individuals.length;
  const maleW = total > 0 ? (sexDistribution.male / total) * 100 : 0;
  const femaleW = total > 0 ? (sexDistribution.female / total) * 100 : 0;
  const unknownW = total > 0 ? (sexDistribution.unknown / total) * 100 : 0;

  return (
    <div className="bg-surface-raised border border-border rounded-lg p-3 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">{groupId}</span>
        <div className="flex items-center gap-2">
          {surrogate !== undefined && (
            <span className="text-xs text-indigo-500 font-mono">S:{surrogate}</span>
          )}
          <span className="text-xs text-slate-500">{total} ind.</span>
        </div>
      </div>

      {/* Sex distribution bar */}
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden gap-px" title={`M:${sexDistribution.male} F:${sexDistribution.female} ?:${sexDistribution.unknown}`}>
          {maleW > 0 && (
            <div className="bg-blue-400 rounded-l-full" style={{ width: `${maleW}%` }} />
          )}
          {femaleW > 0 && (
            <div className="bg-pink-400" style={{ width: `${femaleW}%` }} />
          )}
          {unknownW > 0 && (
            <div className="bg-slate-300 rounded-r-full" style={{ width: `${unknownW}%` }} />
          )}
        </div>
      )}

      {/* Sex counts */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {sexDistribution.male > 0 && <span className="text-blue-600">{sexDistribution.male}M</span>}
        {sexDistribution.female > 0 && <span className="text-pink-600">{sexDistribution.female}F</span>}
        {sexDistribution.unknown > 0 && <span className="text-slate-400">{sexDistribution.unknown}?</span>}
      </div>

      {/* Individual chips */}
      <div className="flex flex-wrap gap-1">
        {individuals.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectIndividual?.(id)}
            className="px-2 py-0.5 text-xs bg-surface border border-border rounded-full text-text-primary hover:border-brand hover:text-brand transition-colors"
          >
            {id}
          </button>
        ))}
      </div>
    </div>
  );
}
