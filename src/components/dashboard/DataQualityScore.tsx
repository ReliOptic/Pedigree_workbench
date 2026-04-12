/**
 * DataQualityScore — circular gauge (0-100) with color-coded ring and
 * a collapsible issue list grouped by severity.
 */

import { useState } from 'react';
import type { DataQualityScore as DQScore, DataIssue } from '../../services/data-quality';

interface DataQualityScoreProps {
  readonly score: DQScore;
}

// ---------------------------------------------------------------------------
// SVG ring gauge
// ---------------------------------------------------------------------------

function ringColor(overall: number): string {
  if (overall >= 75) return '#22c55e'; // green-500
  if (overall >= 50) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

function ScoreRing({ overall }: { readonly overall: number }): React.JSX.Element {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const filled = (overall / 100) * circumference;
  const color = ringColor(overall);

  return (
    <svg width="96" height="96" viewBox="0 0 96 96" aria-label={`Data quality score: ${overall}%`}>
      {/* Track */}
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-slate-200 dark:text-slate-700"
      />
      {/* Fill */}
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference / 4} /* start at top */
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      {/* Label */}
      <text
        x="48"
        y="44"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="20"
        fontWeight="bold"
        fill={color}
      >
        {overall}
      </text>
      <text
        x="48"
        y="62"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10"
        fill="#94a3b8"
      >
        / 100
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Issue row
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<DataIssue['severity'], string> = {
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200',
  info: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300',
};

const SEVERITY_BADGE: Record<DataIssue['severity'], string> = {
  error: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-slate-400 text-white',
};

function IssueRow({ issue }: { readonly issue: DataIssue }): React.JSX.Element {
  return (
    <div className={`flex flex-col gap-0.5 px-3 py-2 rounded border text-xs ${SEVERITY_STYLES[issue.severity]}`}>
      <div className="flex items-start gap-2">
        <span className={`flex-shrink-0 text-[9px] font-bold uppercase px-1 py-0.5 rounded ${SEVERITY_BADGE[issue.severity]}`}>
          {issue.severity}
        </span>
        <span className="flex-1 leading-snug">{issue.message}</span>
      </div>
      {issue.suggestion !== undefined && (
        <p className="text-[10px] opacity-75 pl-1 leading-snug">{issue.suggestion}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DataQualityScore({ score }: DataQualityScoreProps): React.JSX.Element {
  const [expanded, setExpanded] = useState<boolean>(score.issues.length > 0 && score.overall < 80);

  const errorCount = score.issues.filter((i) => i.severity === 'error').length;
  const warningCount = score.issues.filter((i) => i.severity === 'warning').length;
  const infoCount = score.issues.filter((i) => i.severity === 'info').length;

  return (
    <div className="flex flex-col gap-3">
      {/* Gauge row */}
      <div className="flex items-center gap-4">
        <ScoreRing overall={score.overall} />
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 w-24">Completeness</span>
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full w-24 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400 transition-all"
                style={{ width: `${score.completeness}%` }}
              />
            </div>
            <span className="font-mono text-slate-600 w-8 text-right">{score.completeness}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 w-24">Consistency</span>
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full w-24 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all"
                style={{ width: `${score.consistency}%` }}
              />
            </div>
            <span className="font-mono text-slate-600 w-8 text-right">{score.consistency}%</span>
          </div>
        </div>
      </div>

      {/* Issue summary toggle */}
      {score.issues.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors self-start"
        >
          <span className="font-medium">{expanded ? 'Hide' : 'Show'} issues</span>
          {errorCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-mono">
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-mono">
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
          {infoCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
              {infoCount} info
            </span>
          )}
          <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </button>
      )}

      {/* Issue list */}
      {expanded && (
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
          {score.issues.map((issue, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <IssueRow key={`${issue.severity}-${issue.field}-${issue.individualId ?? ''}-${idx}`} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
