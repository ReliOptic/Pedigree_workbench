import { useCallback, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';

import { computeLayout } from '../services/pedigree-layout';
import { computeAllCOI } from '../services/kinship';
import { computePopulationStats } from '../services/population-genetics';
import { JOURNAL_PRESETS } from '../services/journal-presets';
import type { JournalPreset } from '../services/journal-presets';
import {
  renderFigureSvg,
  svgToCanvas,
  exportAsPng,
} from '../services/figure-renderer';
import type { FigureOptions } from '../services/figure-renderer';
import {
  generatePopulationTable,
  generateInbreedingTable,
  generateGenotypeTable,
  renderTableSvg,
} from '../services/stats-table-renderer';
import type { Individual } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';
import { NODE, CONNECTOR } from '../constants/node-dimensions';
import { Button } from './ui';

/** Predicted structure metadata for paper view display */
export interface PredictedStructureEntry {
  readonly individualId: string;
  readonly sequenceLength: number;
  readonly pdbData: string;
}

interface PaperViewProps {
  readonly individuals: readonly Individual[];
  readonly t: Translation;
  readonly workbenchMode?: 'pedigree' | 'cohort';
  /** Optional predicted structures from the inspector cache */
  readonly predictedStructures?: readonly PredictedStructureEntry[];
}

// ── SVG constants ─────────────────────────────────────────────────────────────

const PAPER_MARGIN = 48;
const HEADER_HEIGHT = 72;
const FOOTER_HEIGHT = 64;
const BAND_LABEL_WIDTH = 56;
const COI_FONT_SIZE = 10;
const COI_OFFSET = 14; // pixels below node bottom

// ── Helper: truncate label ───────────────────────────────────────────────────

function truncate(text: string | undefined | null, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// ── Pedigree SVG renderer ────────────────────────────────────────────────────

interface PedigreeChartProps {
  individuals: readonly Individual[];
  t: Translation;
}

function PedigreeSvg({ individuals, t }: PedigreeChartProps): React.JSX.Element {
  const layout = useMemo(
    () =>
      computeLayout(individuals, {
        originX: BAND_LABEL_WIDTH + PAPER_MARGIN,
        originY: HEADER_HEIGHT + PAPER_MARGIN,
        mode: 'pedigree',
      }),
    [individuals],
  );

  const coiMap = useMemo(() => {
    const results = computeAllCOI(individuals);
    const m = new Map<string, number>();
    for (const r of results) m.set(r.id, r.coefficient);
    return m;
  }, [individuals]);

  const indMap = useMemo(() => {
    const m = new Map<string, Individual>();
    for (const ind of individuals) m.set(ind.id, ind);
    return m;
  }, [individuals]);

  const stats = useMemo(() => computePopulationStats(individuals), [individuals]);

  // Compute canvas extents from node positions
  const { minX, minY, maxX, maxY } = useMemo(() => {
    if (layout.nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 400, maxY: 200 };
    }
    let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
    for (const n of layout.nodes) {
      mnX = Math.min(mnX, n.x);
      mnY = Math.min(mnY, n.y);
      mxX = Math.max(mxX, n.x + NODE.WIDTH);
      mxY = Math.max(mxY, n.y + NODE.HEIGHT);
    }
    return { minX: mnX, minY: mnY, maxX: mxX, maxY: mxY };
  }, [layout.nodes]);

  const svgWidth = Math.max(600, maxX + PAPER_MARGIN);
  const svgHeight = maxY + PAPER_MARGIN + FOOTER_HEIGHT + COI_OFFSET + 8;

  // Generation band y extents — pair each generation with next to get band height
  const bandData = useMemo(() => {
    const labels = layout.generationLabels;
    return labels.map((gl, i) => {
      const nextY = labels[i + 1]?.y ?? maxY + PAPER_MARGIN + 16;
      const bandTop = i === 0 ? (minY - 16) : (gl.y - (gl.y - (labels[i - 1]?.y ?? gl.y)) / 2);
      const bandBottom = i === labels.length - 1 ? (maxY + COI_OFFSET + 16) : nextY - 16;
      return { label: gl.label, y: gl.y, bandTop, bandBottom };
    });
  }, [layout.generationLabels, minX, minY, maxX, maxY]);

  const today = new Date().toLocaleDateString('en-GB');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{ background: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* ── Header ── */}
      <rect x={0} y={0} width={svgWidth} height={HEADER_HEIGHT} fill="#f8f8f8" />
      <line x1={0} y1={HEADER_HEIGHT} x2={svgWidth} y2={HEADER_HEIGHT} stroke="#e0e0e0" strokeWidth={1} />
      <text
        x={PAPER_MARGIN}
        y={28}
        fontSize={18}
        fontWeight="600"
        fill="#111"
      >
        {t.pedigreeChart}
      </text>
      <text x={PAPER_MARGIN} y={50} fontSize={12} fill="#666">
        {individuals.length} {t.individualsCount} · {t.generatedOn} {today}
      </text>

      {/* ── Generation bands ── */}
      {bandData.map((bd, i) => (
        <rect
          key={bd.label}
          x={0}
          y={bd.bandTop}
          width={svgWidth}
          height={bd.bandBottom - bd.bandTop}
          fill={i % 2 === 0 ? '#f9fafb' : '#ffffff'}
          opacity={0.7}
        />
      ))}

      {/* ── Generation labels (left edge) ── */}
      {layout.generationLabels.map((gl) => (
        <text
          key={gl.label}
          x={PAPER_MARGIN / 2}
          y={gl.y + 4}
          fontSize={11}
          fontWeight="500"
          fill="#999"
          textAnchor="middle"
        >
          {gl.label}
        </text>
      ))}

      {/* ── Connectors ── */}
      {layout.connectors.map((c) => (
        <g key={c.childId}>
          <path
            d={c.marriageD}
            fill="none"
            stroke="#bbb"
            strokeWidth={CONNECTOR.THICKNESS}
          />
          <path
            d={c.dropD}
            fill="none"
            stroke="#bbb"
            strokeWidth={CONNECTOR.THICKNESS}
          />
        </g>
      ))}

      {/* ── Nodes ── */}
      {layout.nodes.map((n) => {
        const ind = indMap.get(n.id);
        if (!ind) return null;
        const coi = coiMap.get(n.id) ?? 0;
        const label = truncate(ind.label ?? ind.id, NODE.MAX_NAME_CHARS);
        const idLabel = ind.label ? truncate(ind.id, 14) : '';
        const cx = n.x + NODE.WIDTH / 2;
        const cy = n.y + NODE.HEIGHT / 2;

        return (
          <g key={n.id}>
            {/* Shape */}
            {ind.sex === 'M' || ind.sex === 'm' || ind.sex?.toLowerCase() === 'male' ? (
              // Male: rectangle
              <rect
                x={n.x}
                y={n.y}
                width={NODE.WIDTH}
                height={NODE.HEIGHT}
                rx={3}
                fill="#fff"
                stroke="#333"
                strokeWidth={1.5}
              />
            ) : ind.sex === 'F' || ind.sex === 'f' || ind.sex?.toLowerCase() === 'female' ? (
              // Female: ellipse
              <ellipse
                cx={cx}
                cy={cy}
                rx={NODE.WIDTH / 2}
                ry={NODE.HEIGHT / 2}
                fill="#fff"
                stroke="#333"
                strokeWidth={1.5}
              />
            ) : (
              // Unknown: diamond
              <polygon
                points={`${cx},${n.y} ${n.x + NODE.WIDTH},${cy} ${cx},${n.y + NODE.HEIGHT} ${n.x},${cy}`}
                fill="#fff"
                stroke="#555"
                strokeWidth={1.5}
              />
            )}

            {/* Name */}
            <text
              x={cx}
              y={cy - (idLabel ? 6 : 2)}
              fontSize={NODE.NAME_FONT_SIZE}
              fontWeight="500"
              fill="#111"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label}
            </text>

            {/* ID (if label differs from id) */}
            {idLabel && (
              <text
                x={cx}
                y={cy + 10}
                fontSize={NODE.ID_FONT_SIZE}
                fill="#888"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {idLabel}
              </text>
            )}

            {/* COI badge below node */}
            {coi > 0 && (
              <text
                x={cx}
                y={n.y + NODE.HEIGHT + COI_OFFSET}
                fontSize={COI_FONT_SIZE}
                fill="#e53e3e"
                textAnchor="middle"
                fontWeight="500"
              >
                {`F=${(coi * 100).toFixed(1)}%`}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Footer ── */}
      <line
        x1={0}
        y1={svgHeight - FOOTER_HEIGHT}
        x2={svgWidth}
        y2={svgHeight - FOOTER_HEIGHT}
        stroke="#e0e0e0"
        strokeWidth={1}
      />

      {/* Legend */}
      <g transform={`translate(${PAPER_MARGIN}, ${svgHeight - FOOTER_HEIGHT + 14})`}>
        {/* Male */}
        <rect x={0} y={0} width={16} height={16} rx={2} fill="#fff" stroke="#333" strokeWidth={1.5} />
        <text x={22} y={12} fontSize={11} fill="#555">{t.legendMale}</text>

        {/* Female */}
        <ellipse cx={72} cy={8} rx={8} ry={8} fill="#fff" stroke="#333" strokeWidth={1.5} />
        <text x={86} y={12} fontSize={11} fill="#555">{t.legendFemale}</text>

        {/* Unknown */}
        <polygon points="148,0 156,8 148,16 140,8" fill="#fff" stroke="#555" strokeWidth={1.5} />
        <text x={162} y={12} fontSize={11} fill="#555">{t.legendUnknown}</text>

        {/* COI indicator */}
        <text x={240} y={12} fontSize={11} fill="#e53e3e" fontWeight="500">F=x%</text>
        <text x={270} y={12} fontSize={11} fill="#555">{t.legendInbreeding}</text>
      </g>

      {/* Summary stats */}
      <g transform={`translate(${PAPER_MARGIN}, ${svgHeight - FOOTER_HEIGHT + 38})`}>
        <text fontSize={11} fill="#777">
          <tspan>{t.statTotal}: {stats.populationSize}</tspan>
          <tspan dx={20}>{t.statFounders}: {stats.founderCount}</tspan>
          <tspan dx={20}>{t.statMeanCoi}: {(stats.meanCOI * 100).toFixed(2)}%</tspan>
          <tspan dx={20}>{t.statMaxCoi}: {(stats.maxCOI * 100).toFixed(2)}%</tspan>
        </text>
      </g>
    </svg>
  );
}

// ── Cohort HTML table renderer ───────────────────────────────────────────────

interface CohortReportProps {
  individuals: readonly Individual[];
  t: Translation;
}

function CohortReport({ individuals, t }: CohortReportProps): React.JSX.Element {
  const stats = useMemo(() => computePopulationStats(individuals), [individuals]);

  // Group by group field
  const groups = useMemo(() => {
    const m = new Map<string, Individual[]>();
    for (const ind of individuals) {
      const key = ind.group?.trim() || t.ungrouped;
      const arr = m.get(key) ?? [];
      arr.push(ind);
      m.set(key, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [individuals]);

  const maleCount = individuals.filter(
    (i) => i.sex === 'M' || i.sex === 'm' || i.sex?.toLowerCase() === 'male',
  ).length;
  const femaleCount = individuals.filter(
    (i) => i.sex === 'F' || i.sex === 'f' || i.sex?.toLowerCase() === 'female',
  ).length;

  const sexRatio =
    femaleCount > 0 ? `${maleCount}:${femaleCount}` : `${maleCount} males`;

  const candidates = individuals.filter(
    (i) => i.status === 'candidate' || i.status === 'breeding_candidate',
  );

  const today = new Date().toLocaleDateString('en-GB');

  return (
    <div
      style={{
        background: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#111',
        padding: '48px',
        minWidth: '640px',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{t.cohortReport}</h1>
        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
          {t.generatedOn} {today}
        </p>
      </div>

      {/* Summary row */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '6px',
          marginBottom: '28px',
          fontSize: '13px',
        }}
      >
        <div>
          <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>{t.statTotal}</div>
          <div style={{ fontWeight: 600 }}>{stats.populationSize}</div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>{t.sexRatio}</div>
          <div style={{ fontWeight: 600 }}>{sexRatio}</div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>{t.litterGroups}</div>
          <div style={{ fontWeight: 600 }}>{groups.length}</div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>{t.statMeanCoi}</div>
          <div style={{ fontWeight: 600 }}>{(stats.meanCOI * 100).toFixed(2)}%</div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: '11px', marginBottom: '2px' }}>{t.statMaxCoi}</div>
          <div style={{ fontWeight: 600 }}>{(stats.maxCOI * 100).toFixed(2)}%</div>
        </div>
      </div>

      {/* Litter/group tables */}
      {groups.map(([groupName, members]) => (
        <div key={groupName} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: '#333' }}>
            {groupName}
            <span style={{ fontWeight: 400, color: '#888', marginLeft: '8px', fontSize: '12px' }}>
              ({members.length} individuals)
            </span>
          </h2>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
            }}
          >
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                {[t.colId, t.colName, t.colSex, t.colDob, t.colStatus, t.colGeneration].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: 'left',
                      padding: '6px 10px',
                      fontWeight: 600,
                      color: '#555',
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((ind, i) => (
                <tr
                  key={ind.id}
                  style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                >
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', color: '#666' }}>
                    {ind.id}
                  </td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0', fontWeight: 500 }}>
                    {ind.label ?? '—'}
                  </td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0' }}>
                    {ind.sex ?? '—'}
                  </td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0' }}>
                    {ind.birthDate ?? '—'}
                  </td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0' }}>
                    {ind.status ?? '—'}
                  </td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #f0f0f0' }}>
                    {ind.generation ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Breeding candidates */}
      {candidates.length > 0 && (
        <div style={{ marginTop: '32px', borderTop: '1px solid #e0e0e0', paddingTop: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>
            {t.breedingCandidatesSection} ({candidates.length})
          </h2>
          <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: '12px', color: '#444' }}>
            {candidates.map((c) => (
              <li key={c.id} style={{ marginBottom: '4px' }}>
                {c.label ?? c.id}
                {c.sex && ` · ${c.sex}`}
                {c.group && ` · ${c.group}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Download helpers ─────────────────────────────────────────────────────────

function downloadSvgContent(svgContent: string, filename: string): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPngFromSvg(svgContent: string, filename: string): void {
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth * 2;
    canvas.height = img.naturalHeight * 2;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (blob === null) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };
  img.src = url;
}

// ── Protein structure summary card (static, for paper output) ───────────────

interface StructureSummaryCardProps {
  entry: PredictedStructureEntry;
}

/**
 * Static summary card for a predicted protein structure.
 * Shows individual ID, sequence length, and atom/residue counts parsed from PDB.
 * Does NOT render the 3D viewer — suitable for print/paper output.
 */
function StructureSummaryCard({ entry }: StructureSummaryCardProps): React.JSX.Element {
  // Parse basic stats from PDB text (ATOM records).
  const { atomCount, residueCount } = useMemo(() => {
    const lines = entry.pdbData.split('\n');
    const atomLines = lines.filter((l) => l.startsWith('ATOM'));
    const residues = new Set(atomLines.map((l) => `${l.slice(21, 22).trim()}_${l.slice(22, 26).trim()}`));
    return { atomCount: atomLines.length, residueCount: residues.size };
  }, [entry.pdbData]);

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 text-xs space-y-2">
      {/* Header */}
      <div className="font-bold text-slate-800 font-mono truncate">{entry.individualId}</div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-600">
        <span className="text-slate-400">Sequence</span>
        <span className="font-mono">{entry.sequenceLength.toLocaleString()} bp</span>

        <span className="text-slate-400">Residues</span>
        <span className="font-mono">{residueCount}</span>

        <span className="text-slate-400">Atoms</span>
        <span className="font-mono">{atomCount.toLocaleString()}</span>
      </div>

      {/* Source badge */}
      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] text-indigo-700 font-medium">
        ESMFold predicted
      </div>

      {/* PDB snippet preview */}
      <pre className="mt-1 font-mono text-[9px] leading-tight text-slate-400 overflow-hidden max-h-16 whitespace-pre-wrap break-all">
        {entry.pdbData.slice(0, 200)}
      </pre>
    </div>
  );
}

// ── Figure config panel ──────────────────────────────────────────────────────

const DEFAULT_PRESET_ID = 'nature';

const DEFAULT_OPTIONS: FigureOptions = {
  preset: (JOURNAL_PRESETS.find(p => p.id === DEFAULT_PRESET_ID) ?? JOURNAL_PRESETS[0])!,
  caption: '',
  showCoi: true,
  showGenotype: false,
  labelMode: 'id-name',
  generationStyle: 'f-prefix',
  legendPosition: 'bottom',
  symbolFill: 'standard',
};

interface FigureConfigPanelProps {
  options: FigureOptions;
  onChange: (opts: FigureOptions) => void;
  includeTables: { population: boolean; coi: boolean; genotype: boolean };
  onIncludeTablesChange: (v: { population: boolean; coi: boolean; genotype: boolean }) => void;
}

function FigureConfigPanel({ options, onChange, includeTables, onIncludeTablesChange }: FigureConfigPanelProps): React.JSX.Element {
  const isCustom = options.preset.id === 'custom';

  const handlePresetChange = (id: string) => {
    const preset = (JOURNAL_PRESETS.find(p => p.id === id) ?? JOURNAL_PRESETS[0])!;
    onChange({ ...options, preset });
  };

  const patchPreset = (patch: Partial<JournalPreset>) => {
    onChange({ ...options, preset: { ...options.preset, ...patch } });
  };

  return (
    <div className="shrink-0 border-b border-border bg-surface px-4 py-3 space-y-2 text-xs">
      {/* Row 1: preset + label + gen style + symbol */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-text-muted">
          Preset:
          <select
            value={options.preset.id}
            onChange={e => handlePresetChange(e.target.value)}
            className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface text-text"
          >
            {JOURNAL_PRESETS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-text-muted">
          Label:
          <select
            value={options.labelMode}
            onChange={e => onChange({ ...options, labelMode: e.target.value as FigureOptions['labelMode'] })}
            className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface text-text"
          >
            <option value="id">ID only</option>
            <option value="name">Name only</option>
            <option value="id-name">ID + Name</option>
            <option value="id-genotype">ID + Genotype</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-text-muted">
          Gen style:
          <select
            value={options.generationStyle}
            onChange={e => onChange({ ...options, generationStyle: e.target.value as FigureOptions['generationStyle'] })}
            className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface text-text"
          >
            <option value="f-prefix">F0, F1, F2</option>
            <option value="arabic">1, 2, 3</option>
            <option value="roman">I, II, III</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-text-muted">
          Symbol:
          <select
            value={options.symbolFill}
            onChange={e => onChange({ ...options, symbolFill: e.target.value as FigureOptions['symbolFill'] })}
            className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface text-text"
          >
            <option value="standard">Standard</option>
            <option value="affected">Affected (KO/HET)</option>
          </select>
        </label>
      </div>

      {/* Row 2: checkboxes + legend + caption */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1 text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={options.showCoi}
            onChange={e => onChange({ ...options, showCoi: e.target.checked })}
            className="rounded"
          />
          Show COI
        </label>

        <label className="flex items-center gap-1 text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={options.showGenotype}
            onChange={e => onChange({ ...options, showGenotype: e.target.checked })}
            className="rounded"
          />
          Show genotype
        </label>

        <label className="flex items-center gap-1.5 text-text-muted">
          Legend:
          <select
            value={options.legendPosition}
            onChange={e => onChange({ ...options, legendPosition: e.target.value as FigureOptions['legendPosition'] })}
            className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface text-text"
          >
            <option value="bottom">Bottom</option>
            <option value="right">Right</option>
            <option value="none">None</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-text-muted flex-1 min-w-[200px]">
          Caption:
          <input
            type="text"
            value={options.caption}
            onChange={e => onChange({ ...options, caption: e.target.value })}
            placeholder="Fig. 1. Pedigree of CD163..."
            className="flex-1 text-xs border border-border rounded px-2 py-0.5 bg-surface text-text placeholder:text-text-muted"
          />
        </label>
      </div>

      {/* Row 3: custom preset overrides (only when Custom selected) */}
      {isCustom && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-border/50">
          <span className="text-text-muted font-medium">Custom:</span>

          <label className="flex items-center gap-1 text-text-muted">
            Width (mm):
            <input
              type="number"
              value={options.preset.figureWidth}
              onChange={e => patchPreset({ figureWidth: Number(e.target.value) })}
              className="w-16 text-xs border border-border rounded px-1 py-0.5 bg-surface text-text"
            />
          </label>

          <label className="flex items-center gap-1 text-text-muted">
            DPI:
            <input
              type="number"
              value={options.preset.dpi}
              onChange={e => patchPreset({ dpi: Number(e.target.value) })}
              className="w-16 text-xs border border-border rounded px-1 py-0.5 bg-surface text-text"
            />
          </label>

          <label className="flex items-center gap-1 text-text-muted">
            Font (pt):
            <input
              type="number"
              value={options.preset.fontSize}
              onChange={e => patchPreset({ fontSize: Number(e.target.value) })}
              className="w-12 text-xs border border-border rounded px-1 py-0.5 bg-surface text-text"
            />
          </label>

          <label className="flex items-center gap-1 text-text-muted">
            Line (px):
            <input
              type="number"
              step="0.1"
              value={options.preset.lineWidth}
              onChange={e => patchPreset({ lineWidth: Number(e.target.value) })}
              className="w-12 text-xs border border-border rounded px-1 py-0.5 bg-surface text-text"
            />
          </label>

          <label className="flex items-center gap-1 text-text-muted">
            Node scale:
            <input
              type="number"
              step="0.05"
              value={options.preset.nodeScale}
              onChange={e => patchPreset({ nodeScale: Number(e.target.value) })}
              className="w-14 text-xs border border-border rounded px-1 py-0.5 bg-surface text-text"
            />
          </label>
        </div>
      )}

      {/* Row 4: include tables + download buttons */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-border/50">
        <span className="text-text-muted font-medium">Include tables:</span>

        <label className="flex items-center gap-1 text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={includeTables.population}
            onChange={e => onIncludeTablesChange({ ...includeTables, population: e.target.checked })}
            className="rounded"
          />
          Population
        </label>

        <label className="flex items-center gap-1 text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={includeTables.coi}
            onChange={e => onIncludeTablesChange({ ...includeTables, coi: e.target.checked })}
            className="rounded"
          />
          COI
        </label>

        <label className="flex items-center gap-1 text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={includeTables.genotype}
            onChange={e => onIncludeTablesChange({ ...includeTables, genotype: e.target.checked })}
            className="rounded"
          />
          Genotype
        </label>
      </div>
    </div>
  );
}

// ── Rendered figure preview ──────────────────────────────────────────────────

interface FigurePreviewProps {
  individuals: readonly Individual[];
  options: FigureOptions;
  includeTables: { population: boolean; coi: boolean; genotype: boolean };
  t: Translation;
}

function FigurePreview({ individuals, options, includeTables, t }: FigurePreviewProps): React.JSX.Element {
  const layout = useMemo(
    () => computeLayout(individuals, { mode: 'pedigree' }),
    [individuals],
  );

  const coiMap = useMemo(() => {
    const results = computeAllCOI(individuals);
    const m = new Map<string, number>();
    for (const r of results) m.set(r.id, r.coefficient);
    return m;
  }, [individuals]);

  const figureSvg = useMemo(
    () => renderFigureSvg(individuals, layout, options, coiMap),
    [individuals, layout, options, coiMap],
  );

  const populationTableSvg = useMemo(() => {
    if (!includeTables.population) return null;
    const tbl = generatePopulationTable(individuals, t);
    return renderTableSvg(tbl, { width: 480, fontSize: options.preset.fontSize, fontFamily: options.preset.fontFamily });
  }, [individuals, t, includeTables.population, options.preset]);

  const coiTableSvg = useMemo(() => {
    if (!includeTables.coi) return null;
    const tbl = generateInbreedingTable(individuals, t);
    return renderTableSvg(tbl, { width: 480, fontSize: options.preset.fontSize, fontFamily: options.preset.fontFamily });
  }, [individuals, t, includeTables.coi, options.preset]);

  const genotypeTableSvg = useMemo(() => {
    if (!includeTables.genotype) return null;
    const tbl = generateGenotypeTable(individuals, t);
    return renderTableSvg(tbl, { width: 480, fontSize: options.preset.fontSize, fontFamily: options.preset.fontFamily });
  }, [individuals, t, includeTables.genotype, options.preset]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-fit">
      {/* Figure */}
      <div
        className="rounded-xl border border-border bg-white shadow-sm overflow-auto"
        dangerouslySetInnerHTML={{ __html: figureSvg }}
      />

      {/* Tables */}
      {populationTableSvg && (
        <div
          className="rounded-xl border border-border bg-white shadow-sm overflow-auto p-4"
          dangerouslySetInnerHTML={{ __html: populationTableSvg }}
        />
      )}
      {coiTableSvg && (
        <div
          className="rounded-xl border border-border bg-white shadow-sm overflow-auto p-4"
          dangerouslySetInnerHTML={{ __html: coiTableSvg }}
        />
      )}
      {genotypeTableSvg && (
        <div
          className="rounded-xl border border-border bg-white shadow-sm overflow-auto p-4"
          dangerouslySetInnerHTML={{ __html: genotypeTableSvg }}
        />
      )}
    </div>
  );
}

// ── PaperView ────────────────────────────────────────────────────────────────

export function PaperView({ individuals, t, workbenchMode = 'pedigree', predictedStructures }: PaperViewProps): React.JSX.Element {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const isPedigree = workbenchMode === 'pedigree';

  // Figure options state (pedigree mode only)
  const [figureOptions, setFigureOptions] = useState<FigureOptions>(DEFAULT_OPTIONS);
  const [includeTables, setIncludeTables] = useState({ population: true, coi: true, genotype: false });

  // ── Derived layout + coi for download helpers ──
  const layout = useMemo(
    () => computeLayout(individuals, { mode: 'pedigree' }),
    [individuals],
  );

  const coiMap = useMemo(() => {
    const results = computeAllCOI(individuals);
    const m = new Map<string, number>();
    for (const r of results) m.set(r.id, r.coefficient);
    return m;
  }, [individuals]);

  // ── Legacy cohort helpers ──
  const getSvgContent = useCallback((): string | null => {
    if (!isPedigree) return null;
    const el = svgContainerRef.current?.querySelector('svg');
    if (!el) return null;
    return new XMLSerializer().serializeToString(el);
  }, [isPedigree]);

  const handleDownloadCohortSvg = useCallback(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const w = el.scrollWidth;
    const h = el.scrollHeight;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<foreignObject width="100%" height="100%">
<div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
</foreignObject>
</svg>`;
    downloadSvgContent(svg, 'cohort-report.svg');
  }, []);

  const handleDownloadCohortPng = useCallback(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const w = el.scrollWidth;
    const h = el.scrollHeight;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<foreignObject width="100%" height="100%">
<div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
</foreignObject>
</svg>`;
    downloadPngFromSvg(svg, 'cohort-report.png');
  }, []);

  // ── Figure download handlers ──
  const handleDownloadFigureSvg = useCallback(() => {
    const svgStr = renderFigureSvg(individuals, layout, figureOptions, coiMap);
    downloadSvgContent(svgStr, 'pedigree-figure.svg');
  }, [individuals, layout, figureOptions, coiMap]);

  const handleDownloadFigurePng = useCallback((dpi: number) => {
    const svgStr = renderFigureSvg(individuals, layout, figureOptions, coiMap);
    svgToCanvas(svgStr, dpi).then(canvas => {
      exportAsPng(canvas).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pedigree-figure-${dpi}dpi.png`;
        a.click();
        URL.revokeObjectURL(url);
      }).catch(console.error);
    }).catch(console.error);
  }, [individuals, layout, figureOptions, coiMap]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isPedigree ? (
        <>
          {/* Figure configuration panel */}
          <FigureConfigPanel
            options={figureOptions}
            onChange={setFigureOptions}
            includeTables={includeTables}
            onIncludeTablesChange={setIncludeTables}
          />

          {/* Download action bar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface shrink-0">
            <span className="text-xs text-text-muted mr-1">Download:</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadFigureSvg}
              className="inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              SVG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDownloadFigurePng(300)}
              className="inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              PNG 300 dpi
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDownloadFigurePng(600)}
              className="inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              TIFF 600 dpi
            </Button>
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto flex items-start justify-center bg-surface-raised/40 p-8">
            <FigurePreview
              individuals={individuals}
              options={figureOptions}
              includeTables={includeTables}
              t={t}
            />

            {/* Protein Structures section */}
            {predictedStructures !== undefined && predictedStructures.length > 0 && (
              <div className="rounded-xl border border-border bg-white shadow-sm p-6 mt-6">
                <h2 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  {t.proteinStructures}
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {predictedStructures.map((entry) => (
                    <StructureSummaryCard key={entry.individualId} entry={entry} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Cohort mode: original action bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadCohortSvg}
              className="inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {t.downloadSvg}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadCohortPng}
              className="inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {t.downloadPng}
            </Button>
            <span className="ml-2 text-xs text-text-muted">{t.cohortReport}</span>
          </div>

          {/* Cohort output area */}
          <div className="flex-1 overflow-auto flex items-start justify-center bg-surface-raised/40 p-8">
            <div
              ref={svgContainerRef}
              className="rounded-xl border border-border bg-white shadow-sm overflow-auto"
            >
              <CohortReport individuals={individuals} t={t} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
