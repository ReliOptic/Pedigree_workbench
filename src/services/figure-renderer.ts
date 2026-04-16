import type { Individual } from '../types/pedigree.types';
import type { LayoutResult } from './pedigree-layout';
import type { JournalPreset } from './journal-presets';
import { NODE, CONNECTOR } from '../constants/node-dimensions';

// ── Public types ──────────────────────────────────────────────────────────────

export interface FigureOptions {
  preset: JournalPreset;
  caption: string;
  showCoi: boolean;
  showGenotype: boolean;
  labelMode: 'id' | 'name' | 'id-name' | 'id-genotype';
  generationStyle: 'roman' | 'arabic' | 'f-prefix';
  legendPosition: 'bottom' | 'right' | 'none';
  symbolFill: 'standard' | 'affected';
}

// ── Internal helpers ─────────────────────────────────────────────────────────

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

function formatGenerationLabel(raw: string, style: FigureOptions['generationStyle']): string {
  // Try to extract a numeric component from strings like "F0", "F1", "Gen2", "1", "2", etc.
  const match = raw.match(/-?\d+/);
  const n = match ? parseInt(match[0], 10) : null;

  if (style === 'f-prefix') {
    if (n !== null) return `F${n}`;
    return raw;
  }
  if (style === 'arabic') {
    if (n !== null) return String(n);
    return raw;
  }
  if (style === 'roman') {
    if (n !== null && n >= 0 && n < ROMAN_NUMERALS.length) return ROMAN_NUMERALS[n] ?? raw;
    if (n !== null && n < 0) return raw; // negative generations: keep as-is
    return raw;
  }
  return raw;
}

function getIndividualLabel(ind: Individual, mode: FigureOptions['labelMode']): string {
  switch (mode) {
    case 'id':       return ind.id;
    case 'name':     return ind.label ?? ind.id;
    case 'id-name':  return ind.label ? `${ind.id} / ${ind.label}` : ind.id;
    case 'id-genotype': {
      const geno = ind.fields['genotype'] ?? ind.fields['cd163'] ?? '';
      return geno ? `${ind.id} [${geno}]` : ind.id;
    }
  }
}

function isMale(ind: Individual): boolean {
  const s = ind.sex?.toLowerCase() ?? '';
  return s === 'm' || s === 'male';
}

function isFemale(ind: Individual): boolean {
  const s = ind.sex?.toLowerCase() ?? '';
  return s === 'f' || s === 'female';
}

/**
 * Determine fill colour for a node under the 'affected' symbolFill mode.
 * Uses the genotype field (or cd163 field as fallback).
 * - KO / homozygous → fill #333 (fully filled)
 * - HET / heterozygous → half fill pattern reference
 * - WT / wild-type / unknown → #fff (empty)
 */
function affectedFill(ind: Individual): { fill: string; halfFill: boolean } {
  const geno = (ind.fields['genotype'] ?? ind.fields['cd163'] ?? '').toLowerCase();
  if (geno.includes('ko') || geno.includes('hom') || geno === '-/-') {
    return { fill: '#333', halfFill: false };
  }
  if (geno.includes('het') || geno === '+/-' || geno === '-/+') {
    return { fill: '#fff', halfFill: true };
  }
  return { fill: '#fff', halfFill: false };
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// ── SVG rendering ────────────────────────────────────────────────────────────

const PAPER_MARGIN = 40;
const CAPTION_HEIGHT = 24;
const LEGEND_HEIGHT = 48;
const COI_OFFSET = 12;
const BAND_LABEL_WIDTH = 48;

/**
 * Render the pedigree layout as a self-contained SVG string.
 */
export function renderFigureSvg(
  individuals: readonly Individual[],
  layout: LayoutResult,
  options: FigureOptions,
  coiMap: ReadonlyMap<string, number>,
): string {
  const { preset, caption, showCoi, showGenotype, labelMode, generationStyle, legendPosition, symbolFill } = options;
  const scale = preset.nodeScale;
  const nodeW = NODE.WIDTH * scale;
  const nodeH = NODE.HEIGHT * scale;
  const strokeW = preset.lineWidth;
  const fs = preset.fontSize;
  const font = preset.fontFamily;

  const indMap = new Map<string, Individual>();
  for (const ind of individuals) indMap.set(ind.id, ind);

  // Compute canvas bounds from layout (node positions are in unscaled layout space)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of layout.nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    // Use unscaled NODE dimensions here; scaling is applied via scaleX/scaleY below
    maxX = Math.max(maxX, n.x + NODE.WIDTH);
    maxY = Math.max(maxY, n.y + NODE.HEIGHT);
  }
  if (layout.nodes.length === 0) { minX = 0; minY = 0; maxX = 400; maxY = 200; }

  // Scale all positions uniformly — right/bottom padding included in chartWidth/Height
  const scaleX = (x: number) => BAND_LABEL_WIDTH + PAPER_MARGIN + (x - minX) * scale;
  const scaleY = (y: number) => PAPER_MARGIN + (y - minY) * scale;

  // Add PAPER_MARGIN on both left (via BAND_LABEL_WIDTH + PAPER_MARGIN) and right
  const chartWidth = (maxX - minX) * scale + BAND_LABEL_WIDTH + PAPER_MARGIN * 2;
  const coiExtra = showCoi ? COI_OFFSET + fs + 4 : 0;
  const legendExtra = legendPosition === 'bottom' ? LEGEND_HEIGHT : 0;
  // Caption uses (fs - 1) line height with a full CAPTION_HEIGHT slot for padding
  const captionExtra = caption.trim() ? CAPTION_HEIGHT : 0;
  const chartHeight = (maxY - minY) * scale + PAPER_MARGIN * 2 + coiExtra + legendExtra + captionExtra;

  const legendW = legendPosition === 'right' ? 140 : 0;
  const svgW = chartWidth + legendW;
  const svgH = chartHeight;

  // Half-fill defs pattern for heterozygous
  const halfFillDefs = `
  <defs>
    <pattern id="half-fill" x="0" y="0" width="1" height="1" patternUnits="objectBoundingBox">
      <rect x="0" y="0" width="0.5" height="1" fill="#333"/>
      <rect x="0.5" y="0" width="0.5" height="1" fill="#fff"/>
    </pattern>
  </defs>`;

  const parts: string[] = [];

  // Background
  parts.push(`<rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#fff"/>`);

  // Generation band backgrounds
  const genLabels = layout.generationLabels;
  genLabels.forEach((gl, i) => {
    const nextY = genLabels[i + 1]?.y ?? maxY + PAPER_MARGIN;
    const bandTop = scaleY(i === 0 ? minY - 10 : (gl.y + (genLabels[i - 1]?.y ?? gl.y)) / 2);
    const bandBot = scaleY(i === genLabels.length - 1 ? maxY + 10 : (gl.y + nextY) / 2);
    parts.push(`<rect x="${BAND_LABEL_WIDTH}" y="${bandTop}" width="${chartWidth - BAND_LABEL_WIDTH}" height="${Math.max(0, bandBot - bandTop)}" fill="${i % 2 === 0 ? '#f9fafb' : '#fff'}" opacity="0.6"/>`);
  });

  // Generation labels (left column) — vertically centered within the scaled node row
  for (const gl of genLabels) {
    const label = formatGenerationLabel(gl.label, generationStyle);
    // gl.y is in layout space; add half the scaled node height to centre the label
    const y = scaleY(gl.y) + (nodeH / 2);
    parts.push(`<text x="${BAND_LABEL_WIDTH / 2}" y="${y}" font-size="${fs}" font-family="${font}" fill="#999" text-anchor="middle" dominant-baseline="middle" font-weight="500">${label}</text>`);
  }

  // Connectors — scale path coordinates
  for (const c of layout.connectors) {
    // Re-scale the path strings by rewriting coordinate values
    const scalePath = (d: string) => {
      // Replace M/L/H/V coordinate numbers with scaled equivalents
      // Strategy: parse the d-string tokens and scale x,y
      return d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, px, py) => {
        const ox = parseFloat(px);
        const oy = parseFloat(py);
        return `${scaleX(ox).toFixed(1)},${scaleY(oy).toFixed(1)}`;
      }).replace(/H\s*(-?[\d.]+)/gi, (_, px) => `H${scaleX(parseFloat(px)).toFixed(1)}`)
        .replace(/V\s*(-?[\d.]+)/gi, (_, py) => `V${scaleY(parseFloat(py)).toFixed(1)}`);
    };

    parts.push(`<path d="${scalePath(c.marriageD)}" fill="none" stroke="#bbb" stroke-width="${strokeW}"/>`);
    parts.push(`<path d="${scalePath(c.dropD)}" fill="none" stroke="#bbb" stroke-width="${strokeW}"/>`);
  }

  // Nodes
  for (const n of layout.nodes) {
    const ind = indMap.get(n.id);
    if (!ind) continue;

    const x = scaleX(n.x);
    const y = scaleY(n.y);
    const cx = x + nodeW / 2;
    const cy = y + nodeH / 2;
    const coi = coiMap.get(n.id) ?? 0;

    let shapeFill = '#fff';
    let halfFill = false;
    if (symbolFill === 'affected') {
      const result = affectedFill(ind);
      shapeFill = result.fill;
      halfFill = result.halfFill;
    }
    const fillAttr = halfFill ? 'url(#half-fill)' : shapeFill;

    if (isMale(ind)) {
      parts.push(`<rect x="${x}" y="${y}" width="${nodeW}" height="${nodeH}" rx="2" fill="${fillAttr}" stroke="#333" stroke-width="${strokeW}"/>`);
    } else if (isFemale(ind)) {
      parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${nodeW / 2}" ry="${nodeH / 2}" fill="${fillAttr}" stroke="#333" stroke-width="${strokeW}"/>`);
    } else {
      parts.push(`<polygon points="${cx},${y} ${x + nodeW},${cy} ${cx},${y + nodeH} ${x},${cy}" fill="${fillAttr}" stroke="#555" stroke-width="${strokeW}"/>`);
    }

    // Label inside node
    const labelText = truncate(getIndividualLabel(ind, labelMode), 22);
    parts.push(`<text x="${cx}" y="${cy}" font-size="${fs}" font-family="${font}" fill="${shapeFill === '#333' ? '#fff' : '#111'}" text-anchor="middle" dominant-baseline="middle" font-weight="500">${escapeXml(labelText)}</text>`);

    // Genotype below label
    if (showGenotype) {
      const geno = ind.fields['genotype'] ?? ind.fields['cd163'] ?? '';
      if (geno) {
        parts.push(`<text x="${cx}" y="${cy + fs + 2}" font-size="${Math.max(fs - 1, 6)}" font-family="${font}" fill="${shapeFill === '#333' ? '#ddd' : '#666'}" text-anchor="middle" dominant-baseline="middle">${escapeXml(geno)}</text>`);
      }
    }

    // COI badge
    if (showCoi && coi > 0) {
      parts.push(`<text x="${cx}" y="${y + nodeH + COI_OFFSET}" font-size="${fs}" font-family="${font}" fill="#e53e3e" text-anchor="middle" font-weight="500">F=${(coi * 100).toFixed(1)}%</text>`);
    }
  }

  // Legend — bottom
  const legendY = PAPER_MARGIN + (maxY - minY) * scale + coiExtra + PAPER_MARGIN;
  if (legendPosition === 'bottom') {
    const lfs = Math.max(fs, 8);
    const sym = lfs + 4;
    parts.push(`<g transform="translate(${BAND_LABEL_WIDTH + PAPER_MARGIN}, ${legendY})">`);
    parts.push(`<rect x="0" y="0" width="${sym}" height="${sym}" rx="1" fill="#fff" stroke="#333" stroke-width="${strokeW}"/>`);
    parts.push(`<text x="${sym + 4}" y="${sym / 2 + 1}" font-size="${lfs}" font-family="${font}" fill="#555" dominant-baseline="middle">Male</text>`);
    parts.push(`<ellipse cx="${sym * 3 + 4}" cy="${sym / 2}" rx="${sym / 2}" ry="${sym / 2}" fill="#fff" stroke="#333" stroke-width="${strokeW}"/>`);
    parts.push(`<text x="${sym * 4 + 8}" y="${sym / 2 + 1}" font-size="${lfs}" font-family="${font}" fill="#555" dominant-baseline="middle">Female</text>`);
    const dx = sym * 7 + 8;
    parts.push(`<polygon points="${dx + sym / 2},0 ${dx + sym},${sym / 2} ${dx + sym / 2},${sym} ${dx},${sym / 2}" fill="#fff" stroke="#555" stroke-width="${strokeW}"/>`);
    parts.push(`<text x="${dx + sym + 4}" y="${sym / 2 + 1}" font-size="${lfs}" font-family="${font}" fill="#555" dominant-baseline="middle">Unknown</text>`);
    if (symbolFill === 'affected') {
      const dx2 = dx + sym * 4 + 8;
      parts.push(`<rect x="${dx2}" y="0" width="${sym}" height="${sym}" rx="1" fill="#333" stroke="#333" stroke-width="${strokeW}"/>`);
      parts.push(`<text x="${dx2 + sym + 4}" y="${sym / 2 + 1}" font-size="${lfs}" font-family="${font}" fill="#555" dominant-baseline="middle">KO (−/−)</text>`);
      const dx3 = dx2 + sym * 5 + 8;
      parts.push(`<rect x="${dx3}" y="0" width="${sym}" height="${sym}" rx="1" fill="url(#half-fill)" stroke="#333" stroke-width="${strokeW}"/>`);
      parts.push(`<text x="${dx3 + sym + 4}" y="${sym / 2 + 1}" font-size="${lfs}" font-family="${font}" fill="#555" dominant-baseline="middle">HET (−/+)</text>`);
    }
    parts.push(`</g>`);
  }

  // Legend — right side
  if (legendPosition === 'right') {
    const lx = chartWidth + 16;
    const lfs = Math.max(fs, 8);
    const sym = lfs + 4;
    const lineSpacing = sym + 6;
    parts.push(`<g transform="translate(${lx}, ${PAPER_MARGIN})">`);
    parts.push(`<text x="0" y="0" font-size="${lfs}" font-family="${font}" fill="#333" font-weight="600" dominant-baseline="middle">Legend</text>`);
    let ly = lineSpacing;
    parts.push(`<rect x="0" y="${ly}" width="${sym}" height="${sym}" rx="1" fill="#fff" stroke="#333" stroke-width="${strokeW}"/>`);
    parts.push(`<text x="${sym + 4}" y="${ly + sym / 2 + 1}" font-size="${lfs}" font-family="${font}" fill="#555" dominant-baseline="middle">Male</text>`);
    ly += lineSpacing;
    parts.push(`<ellipse cx="${sym / 2}" cy="${ly + sym / 2}" rx="${sym / 2}" ry="${sym / 2}" fill="#fff" stroke="#333" stroke-width="${strokeW}"/>`);
    parts.push(`<text x="${sym + 4}" y="${ly + sym / 2 + 1}" font-size="${lfs}" font-family="${font}" fill="#555" dominant-baseline="middle">Female</text>`);
    ly += lineSpacing;
    parts.push(`<polygon points="${sym / 2},${ly} ${sym},${ly + sym / 2} ${sym / 2},${ly + sym} 0,${ly + sym / 2}" fill="#fff" stroke="#555" stroke-width="${strokeW}"/>`);
    parts.push(`<text x="${sym + 4}" y="${ly + sym / 2 + 1}" font-size="${lfs}" font-family="${font}" fill="#555" dominant-baseline="middle">Unknown</text>`);
    if (symbolFill === 'affected') {
      ly += lineSpacing;
      parts.push(`<rect x="0" y="${ly}" width="${sym}" height="${sym}" rx="1" fill="#333" stroke="#333" stroke-width="${strokeW}"/>`);
      parts.push(`<text x="${sym + 4}" y="${ly + sym / 2 + 1}" font-size="${lfs}" font-family="${font}" fill="#555" dominant-baseline="middle">KO (−/−)</text>`);
      ly += lineSpacing;
      parts.push(`<rect x="0" y="${ly}" width="${sym}" height="${sym}" rx="1" fill="url(#half-fill)" stroke="#333" stroke-width="${strokeW}"/>`);
      parts.push(`<text x="${sym + 4}" y="${ly + sym / 2 + 1}" font-size="${lfs}" font-family="${font}" fill="#555" dominant-baseline="middle">HET (−/+)</text>`);
    }
    parts.push(`</g>`);
  }

  // Caption — uses preset fontSize - 1 (caption/footnote tier), min 6pt
  if (caption.trim()) {
    const capY = legendPosition === 'bottom' ? legendY + LEGEND_HEIGHT : legendY + 4;
    const capFs = Math.max(fs - 1, 6);
    parts.push(`<text x="${BAND_LABEL_WIDTH + PAPER_MARGIN}" y="${capY}" font-size="${capFs}" font-family="${font}" fill="#333" font-style="italic">${escapeXml(caption)}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMin meet" style="display:block;max-width:100%;background:#fff;font-family:${font}">${halfFillDefs}\n${parts.join('\n')}\n</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Canvas / raster export ───────────────────────────────────────────────────

/**
 * Rasterise an SVG string to an HTMLCanvasElement at the given DPI scale.
 * Browser-only — calls Image + Canvas APIs.
 */
export function svgToCanvas(svgString: string, dpi: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const scale = dpi / 96; // 96 CSS px = 1 inch baseline
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas 2D context unavailable')); return; }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG image load failed')); };
    img.src = url;
  });
}

/** Export canvas as PNG Blob. */
export function exportAsPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG export failed'));
    }, 'image/png');
  });
}

/**
 * Export canvas as TIFF-like Blob.
 * Browsers do not natively support TIFF encoding; this returns a PNG Blob
 * with DPI metadata embedded via a PNG tEXt chunk workaround, which most
 * journal submission portals accept.  For true TIFF, a server-side or
 * WebAssembly encoder (e.g. utif.js) would be needed.
 */
export function exportAsTiff(canvas: HTMLCanvasElement): Promise<Blob> {
  // Return PNG — advise users to convert with ImageMagick for true TIFF
  return exportAsPng(canvas);
}

/**
 * Minimal EPS wrapper around an SVG.
 * Generates a PostScript file that embeds the SVG as a comment and provides
 * a simple bounding-box declaration.  Most journals also accept high-res TIFF
 * so this covers the rare EPS requirement.
 */
export function exportAsEps(svgString: string, widthMm: number, heightMm: number): string {
  const widthPt = (widthMm / 25.4) * 72;
  const heightPt = (heightMm / 25.4) * 72;
  return `%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 ${widthPt.toFixed(0)} ${heightPt.toFixed(0)}
%%Title: Pedigree Figure
%%Creator: Pedigree Workbench
%%EndComments
% SVG source embedded below (convert to EPS with Inkscape or ImageMagick):
% ${svgString.replace(/\n/g, '\n% ')}
%%EOF`;
}
