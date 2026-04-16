import type { Individual } from '../types/pedigree.types';
import { resolveGenotype } from '../services/genotype-resolver';
import { COHORT_TILE } from '../services/pedigree-layout';

// ─── helpers ─────────────────────────────────────────────────────────────────

function normalizeSex(sex: string | undefined): 'male' | 'female' | 'unknown' {
  const s = (sex ?? '').trim().toLowerCase();
  if (s === 'm' || s === 'male' || s === '수컷') return 'male';
  if (s === 'f' || s === 'female' || s === '암컷') return 'female';
  return 'unknown';
}

function sexIcon(sex: 'male' | 'female' | 'unknown'): string {
  if (sex === 'male') return '♂';
  if (sex === 'female') return '♀';
  return '?';
}

/** Compute sex ratio string, e.g. "♂3 ♀2" */
function sexRatio(individuals: readonly Individual[]): string {
  let m = 0;
  let f = 0;
  for (const ind of individuals) {
    const s = normalizeSex(ind.sex);
    if (s === 'male') m++;
    else if (s === 'female') f++;
  }
  const parts: string[] = [];
  if (m > 0) parts.push(`♂${m}`);
  if (f > 0) parts.push(`♀${f}`);
  return parts.join(' ') || '—';
}

/**
 * Status dot color.
 * green = active, yellow = hold/pending, red = culled, orange = data missing.
 */
function statusColor(ind: Individual): string {
  const status = (ind.status ?? '').toLowerCase();
  if (status === '' || status === 'active' || status === '활성') {
    // Check data completeness: missing sex or genotype → warn
    const gt = resolveGenotype(ind);
    const hasSex = ind.sex !== undefined && ind.sex.trim() !== '';
    const hasGenotype = gt.primaryValue !== undefined;
    if (!hasSex || !hasGenotype) return 'var(--status-warn)';
    return 'var(--status-ok)';
  }
  if (status.includes('hold') || status.includes('보류') || status.includes('pending')) {
    return 'var(--status-warn)';
  }
  if (
    status.includes('cull') ||
    status.includes('도태') ||
    status.includes('dead') ||
    status.includes('사망')
  ) {
    return 'var(--status-error)';
  }
  return 'var(--status-active)';
}

// ─── props ───────────────────────────────────────────────────────────────────

export interface CohortCardProps {
  readonly groupName: string;
  readonly individuals: readonly Individual[];
  readonly position: { x: number; y: number };
  readonly cardWidth: number;
  readonly cardHeight: number;
  readonly onIndividualClick: (id: string) => void;
  readonly selectedId: string | null;
}

// Card layout constants (must mirror pedigree-layout.ts COHORT_* values).
const HEADER_H = 40;
const PAD_X = 16;
const PAD_Y = 12;
const TILE_W = COHORT_TILE.WIDTH;
const TILE_H = COHORT_TILE.HEIGHT;
const TILE_GAP_X = 12;
const TILE_GAP_Y = 12;
const TILES_PER_ROW = 3;

// ─── component ───────────────────────────────────────────────────────────────

/**
 * Renders a single litter/group card on the SVG canvas using foreignObject
 * so we can use HTML + CSS variables from design-tokens.css.
 *
 * Each card contains:
 *  - Header: group name, head count, sex ratio
 *  - Grid of individual tiles: name, sex icon, status dot, primary genotype
 */
export function CohortCard({
  groupName,
  individuals,
  position,
  cardWidth,
  cardHeight,
  onIndividualClick,
  selectedId,
}: CohortCardProps): React.JSX.Element {
  const ratio = sexRatio(individuals);

  return (
    <foreignObject
      x={position.x}
      y={position.y}
      width={cardWidth}
      height={cardHeight}
      style={{ overflow: 'visible' }}
    >
      {/*
        xmlns is required for foreignObject HTML content in SVG.
        Tailwind classes are used where they match design tokens;
        inline styles are used for CSS variable references.
      */}
      <div
        // @ts-expect-error — xmlns is valid on the root HTML element inside SVG foreignObject
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
          background: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-raised)',
          fontFamily: 'var(--font-family)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Card header ─────────────────────────────────────────────────── */}
        <div
          style={{
            height: `${HEADER_H}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-overlay)',
            borderRadius: '8px 8px 0 0',
            gap: '8px',
          }}
        >
          <span
            title={groupName}
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: '1 1 0',
            }}
          >
            {groupName}
          </span>
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {individuals.length} · {ratio}
          </span>
        </div>

        {/* ── Tile grid ──────────────────────────────────────────────────── */}
        <div
          style={{
            padding: `${PAD_Y}px ${PAD_X}px`,
            display: 'grid',
            gridTemplateColumns: `repeat(${TILES_PER_ROW}, ${TILE_W}px)`,
            gap: `${TILE_GAP_Y}px ${TILE_GAP_X}px`,
          }}
        >
          {individuals.map((ind) => (
            <IndividualTile
              key={ind.id}
              individual={ind}
              isSelected={selectedId === ind.id}
              onClick={onIndividualClick}
            />
          ))}
        </div>
      </div>
    </foreignObject>
  );
}

// ─── IndividualTile ───────────────────────────────────────────────────────────

interface IndividualTileProps {
  readonly individual: Individual;
  readonly isSelected: boolean;
  readonly onClick: (id: string) => void;
}

function IndividualTile({
  individual,
  isSelected,
  onClick,
}: IndividualTileProps): React.JSX.Element {
  const sex = normalizeSex(individual.sex);
  const icon = sexIcon(sex);
  const dotColor = statusColor(individual);
  const gt = resolveGenotype(individual);
  const displayName = individual.label ?? individual.id;

  // Sex-matched node background colors from design tokens.
  const bgColor =
    sex === 'male'
      ? 'var(--node-male-bg)'
      : sex === 'female'
        ? 'var(--node-female-bg)'
        : 'var(--node-unknown-bg)';
  const borderColor = isSelected
    ? 'var(--status-active)'
    : sex === 'male'
      ? 'var(--node-male-border)'
      : sex === 'female'
        ? 'var(--node-female-border)'
        : 'var(--node-unknown-border)';

  return (
    <button
      type="button"
      onClick={() => onClick(individual.id)}
      title={`${displayName} (${individual.id})`}
      style={{
        width: `${TILE_W}px`,
        height: `${TILE_H}px`,
        background: bgColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: '6px',
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        cursor: 'pointer',
        boxSizing: 'border-box',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        boxShadow: isSelected ? `0 0 0 2px var(--status-active)` : 'none',
        fontFamily: 'var(--font-family)',
        textAlign: 'left',
      }}
    >
      {/* Top row: sex icon + status dot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '4px',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
        {/* Status dot */}
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
          }}
        />
      </div>

      {/* Name */}
      <span
        title={displayName}
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          lineHeight: 1.2,
        }}
      >
        {displayName}
      </span>

      {/* Primary genotype (if available) */}
      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          color: gt.primaryValue !== undefined ? 'var(--text-secondary)' : 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          lineHeight: 1,
        }}
      >
        {gt.primaryValue !== undefined
          ? `${gt.primaryLocus ?? 'GT'}: ${gt.primaryValue}`
          : '—'}
      </span>
    </button>
  );
}
