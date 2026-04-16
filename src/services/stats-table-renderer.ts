import type { Individual } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';
import { computePopulationStats } from './population-genetics';
import { computeAllCOI } from './kinship';

// ── Public types ──────────────────────────────────────────────────────────────

export interface StatsTable {
  title: string;
  headers: string[];
  rows: string[][];
  footnotes?: string[];
}

export interface TableRenderOptions {
  width: number;
  fontSize: number;
  fontFamily: string;
}

// ── Table generators ─────────────────────────────────────────────────────────

/** Generate a population summary table (n, founders, sex ratio, COI stats). */
export function generatePopulationTable(individuals: readonly Individual[], t: Translation): StatsTable {
  const stats = computePopulationStats(individuals);
  const maleCount = individuals.filter(i => {
    const s = i.sex?.toLowerCase() ?? '';
    return s === 'm' || s === 'male';
  }).length;
  const femaleCount = individuals.filter(i => {
    const s = i.sex?.toLowerCase() ?? '';
    return s === 'f' || s === 'female';
  }).length;
  const unknownCount = individuals.length - maleCount - femaleCount;

  return {
    title: t.populationGenetics ?? 'Population Statistics',
    headers: ['Metric', 'Value'],
    rows: [
      [t.statTotal ?? 'Total individuals',          String(stats.populationSize)],
      [t.statFounders ?? 'Founders',                String(stats.founderCount)],
      ['Males',                                      String(maleCount)],
      ['Females',                                    String(femaleCount)],
      ['Unknown sex',                                String(unknownCount)],
      [t.statMeanCoi ?? 'Mean COI',                 `${(stats.meanCOI * 100).toFixed(2)}%`],
      [t.statMaxCoi ?? 'Max COI',                   `${(stats.maxCOI * 100).toFixed(2)}%`],
      ['Inbred proportion',                          `${(stats.inbredProportion * 100).toFixed(1)}%`],
      ['Mean ancestor count',                        stats.meanAncestorCount.toFixed(1)],
      ['Ancestor loss coefficient',                  stats.ancestorLossCoefficient.toFixed(3)],
    ],
    footnotes: [
      'COI = Coefficient of Inbreeding (Wright, 1922).',
      'Founders: individuals with no known parents in the dataset.',
    ],
  };
}

/** Generate a per-individual inbreeding table sorted by COI descending. */
export function generateInbreedingTable(individuals: readonly Individual[], _t: Translation): StatsTable {
  const coiResults = computeAllCOI(individuals);
  const coiMap = new Map(coiResults.map(r => [r.id, r.coefficient]));

  const sortedInds = [...individuals].sort((a, b) => {
    const ca = coiMap.get(a.id) ?? 0;
    const cb = coiMap.get(b.id) ?? 0;
    return cb - ca;
  });

  return {
    title: 'Inbreeding Coefficients',
    headers: ['ID', 'Label', 'Generation', 'Sire', 'Dam', 'F (%)'],
    rows: sortedInds.map(ind => [
      ind.id,
      ind.label ?? '—',
      ind.generation ?? '—',
      ind.sire ?? '—',
      ind.dam ?? '—',
      `${((coiMap.get(ind.id) ?? 0) * 100).toFixed(2)}%`,
    ]),
    footnotes: ['Sorted by COI descending. F = 0.00% indicates non-inbred.'],
  };
}

/** Generate a genotype distribution table (locus × genotype class counts). */
export function generateGenotypeTable(individuals: readonly Individual[], _t: Translation): StatsTable {
  const lociSet = new Set<string>();
  for (const ind of individuals) {
    for (const key of Object.keys(ind.fields)) {
      const kl = key.toLowerCase();
      if (['genotype', 'cd163', 'anpep', 'coat_color'].includes(kl) ||
          kl.includes('genotype') || kl.includes('allele')) {
        lociSet.add(key);
      }
    }
  }
  const loci = Array.from(lociSet);

  if (loci.length === 0) {
    return {
      title: 'Genotype Distribution',
      headers: ['Locus', 'Genotype', 'Count', '%'],
      rows: [['—', 'No genotype data', '0', '—']],
    };
  }

  const rows: string[][] = [];
  for (const locus of loci) {
    const counts = new Map<string, number>();
    for (const ind of individuals) {
      const val = ind.fields[locus]?.trim() ?? '';
      if (!val) continue;
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    const sorted = Array.from(counts.entries()).sort(([, a], [, b]) => b - a);
    for (const [geno, count] of sorted) {
      rows.push([locus, geno, String(count), `${((count / total) * 100).toFixed(1)}%`]);
    }
  }

  return {
    title: 'Genotype Distribution',
    headers: ['Locus', 'Genotype', 'Count', '%'],
    rows,
    footnotes: ['Counts based on available genotype data.'],
  };
}

// ── SVG table renderer ────────────────────────────────────────────────────────

/**
 * Render a StatsTable as an SVG string using academic journal style:
 * - Horizontal rules only (top, below header, bottom)
 * - No vertical rules
 * - Right-aligned numbers (last numeric columns auto-detected)
 */
export function renderTableSvg(table: StatsTable, options: TableRenderOptions): string {
  const { width, fontSize: fs, fontFamily } = options;
  const rowH = fs * 2.4;
  const headerH = rowH + 4;
  const titleH = fs * 2;
  const ruleW = 0.8;
  const colPad = 8;

  const nCols = table.headers.length;
  const firstColW = Math.round(width * 0.4);
  const restColW = nCols > 1 ? Math.round((width - firstColW) / (nCols - 1)) : 0;
  const colWidths = [firstColW, ...Array<number>(nCols - 1).fill(restColW)];
  const colX: number[] = [];
  let cx = 0;
  for (const w of colWidths) { colX.push(cx); cx += w; }

  const isNumericCol = (colIdx: number) => {
    if (colIdx === 0) return false;
    return table.rows.some(row => /^-?[\d.,]+%?$/.test((row[colIdx] ?? '').trim()));
  };

  const footnoteLines = table.footnotes ?? [];
  const footnoteH = footnoteLines.length * (fs * 1.6 + 2) + (footnoteLines.length ? 6 : 0);
  const svgH = titleH + headerH + table.rows.length * rowH + footnoteH + fs * 2;

  const parts: string[] = [];
  parts.push(`<rect x="0" y="0" width="${width}" height="${svgH}" fill="#fff"/>`);

  // Title
  parts.push(`<text x="0" y="${fs * 1.2}" font-size="${fs + 1}" font-family="${fontFamily}" fill="#111" font-weight="600">${escapeXml(table.title)}</text>`);

  const tableTop = titleH;

  // Top rule
  parts.push(`<line x1="0" y1="${tableTop}" x2="${width}" y2="${tableTop}" stroke="#111" stroke-width="${(ruleW * 1.5).toFixed(1)}"/>`);

  // Header row
  for (let ci = 0; ci < nCols; ci++) {
    const x = (colX[ci] ?? 0) + (isNumericCol(ci) ? (colWidths[ci] ?? 0) - colPad : colPad);
    const textAnchor = isNumericCol(ci) ? 'end' : 'start';
    parts.push(`<text x="${x}" y="${tableTop + headerH - 6}" font-size="${fs}" font-family="${fontFamily}" fill="#111" font-weight="600" text-anchor="${textAnchor}">${escapeXml(table.headers[ci] ?? '')}</text>`);
  }

  // Header rule
  const headerRuleY = tableTop + headerH;
  parts.push(`<line x1="0" y1="${headerRuleY}" x2="${width}" y2="${headerRuleY}" stroke="#111" stroke-width="${ruleW.toFixed(1)}"/>`);

  // Data rows
  for (let ri = 0; ri < table.rows.length; ri++) {
    const rowY = headerRuleY + ri * rowH;
    const rowBaseY = rowY + rowH - 6;
    if (ri % 2 !== 0) {
      parts.push(`<rect x="0" y="${rowY}" width="${width}" height="${rowH}" fill="#f9fafb"/>`);
    }
    for (let ci = 0; ci < nCols; ci++) {
      const cell = table.rows[ri]?.[ci] ?? '';
      const x = (colX[ci] ?? 0) + (isNumericCol(ci) ? (colWidths[ci] ?? 0) - colPad : colPad);
      const textAnchor = isNumericCol(ci) ? 'end' : 'start';
      parts.push(`<text x="${x}" y="${rowBaseY}" font-size="${fs}" font-family="${fontFamily}" fill="#222" text-anchor="${textAnchor}">${escapeXml(cell)}</text>`);
    }
  }

  // Bottom rule
  const bottomRuleY = headerRuleY + table.rows.length * rowH;
  parts.push(`<line x1="0" y1="${bottomRuleY}" x2="${width}" y2="${bottomRuleY}" stroke="#111" stroke-width="${(ruleW * 1.5).toFixed(1)}"/>`);

  // Footnotes
  for (let fi = 0; fi < footnoteLines.length; fi++) {
    const fy = bottomRuleY + 6 + fi * (fs * 1.6 + 2) + fs * 1.2;
    parts.push(`<text x="0" y="${fy}" font-size="${Math.max(fs - 1, 6)}" font-family="${fontFamily}" fill="#666" font-style="italic">${escapeXml(footnoteLines[fi] ?? '')}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${svgH}" viewBox="0 0 ${width} ${svgH}" style="background:#fff">\n${parts.join('\n')}\n</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
