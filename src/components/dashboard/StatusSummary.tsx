/**
 * Visual summary of all statuses — horizontal stacked bar + legend.
 * Pure SVG rendering, no chart library.
 */

const STATUS_COLORS: Record<string, string> = {
  '교배예정돈': '#22c55e',   // green
  '폐사': '#ef4444',         // red
  '압사': '#f97316',         // orange-red
  '사산': '#dc2626',         // dark red
  '체미돈': '#f59e0b',       // amber
  '기형': '#6b7280',         // gray
  '도태': '#9ca3af',         // lighter gray
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#94a3b8';
}

interface StatusSummaryProps {
  readonly statusDistribution: ReadonlyMap<string, number>;
  readonly totalCount: number;
}

export function StatusSummary({ statusDistribution, totalCount }: StatusSummaryProps): React.JSX.Element {
  if (statusDistribution.size === 0 || totalCount === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">No status data</p>;
  }

  const entries = Array.from(statusDistribution.entries()).sort((a, b) => b[1] - a[1]);

  // SVG stacked bar
  const BAR_H = 20;
  const BAR_W = 200;
  let xOffset = 0;
  const segments = entries.map(([status, count]) => {
    const w = (count / totalCount) * BAR_W;
    const seg = { status, count, x: xOffset, w };
    xOffset += w;
    return seg;
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Stacked bar */}
      <svg width="100%" height={BAR_H} viewBox={`0 0 ${BAR_W} ${BAR_H}`} preserveAspectRatio="none" className="rounded overflow-hidden">
        {segments.map((seg) => (
          <rect
            key={seg.status}
            x={seg.x}
            y={0}
            width={seg.w}
            height={BAR_H}
            fill={getStatusColor(seg.status)}
          >
            <title>{seg.status}: {seg.count}</title>
          </rect>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-1.5">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: getStatusColor(status) }}
              />
              <span className="text-text-primary truncate max-w-[140px]">{status}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(count / totalCount) * 100}%`, backgroundColor: getStatusColor(status) }}
                />
              </div>
              <span className="w-5 text-right">{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
