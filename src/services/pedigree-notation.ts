/**
 * Academic pedigree chart notation system.
 *
 * Implements generation label formatting and node fill/shape conventions
 * per standard genetics/animal science publication guidelines.
 */

import type { Individual } from '../types/pedigree.types';
import { resolveGenotype } from './genotype-resolver';

// ---------------------------------------------------------------------------
// Generation label formatting
// ---------------------------------------------------------------------------

export type GenerationStyle = 'roman' | 'arabic' | 'f-prefix';

/** Roman numeral table — sufficient for pedigree depths encountered in practice. */
const ROMAN_NUMERALS: readonly [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'],  [90,  'XC'], [50,  'L'], [40,  'XL'],
  [10,  'X'],  [9,   'IX'], [5,   'V'], [4,   'IV'],
  [1,   'I'],
];

function toRoman(n: number): string {
  if (n < 1) return String(n);
  let result = '';
  let remaining = n;
  for (const [value, numeral] of ROMAN_NUMERALS) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }
  return result;
}

/**
 * Parse a generation string into a zero-based integer index.
 * Handles formats: 'F0', 'F1', 'Gen 0', 'Gen 1', raw integers, etc.
 * Returns 0 for unrecognised input.
 */
function parseGenerationIndex(gen: string): number {
  // Strip common prefixes: F, Gen, G (case-insensitive)
  const stripped = gen.trim().replace(/^[FfGg][Ee][Nn]?\s*/i, '').replace(/^[Ff]/i, '');
  const parsed = parseInt(stripped, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a generation label according to the requested style.
 *
 * @example
 * formatGenerationLabel('F0', 'roman')    // 'I'
 * formatGenerationLabel('F1', 'roman')    // 'II'
 * formatGenerationLabel('F0', 'arabic')   // '1'
 * formatGenerationLabel('F2', 'arabic')   // '3'
 * formatGenerationLabel('F0', 'f-prefix') // 'F0'
 */
export function formatGenerationLabel(gen: string, style: GenerationStyle): string {
  if (style === 'f-prefix') return gen;

  const index = parseGenerationIndex(gen);
  const oneBased = index + 1; // generations are conventionally 1-based in publications

  if (style === 'roman') return toRoman(oneBased);
  if (style === 'arabic') return String(oneBased);

  return gen;
}

// ---------------------------------------------------------------------------
// Node fill determination
// ---------------------------------------------------------------------------

export type SymbolFillMode = 'standard' | 'affected';

export interface NodeFill {
  type: 'empty' | 'filled' | 'half-left' | 'half-right' | 'quarter' | 'strikethrough';
  label?: string;
}

/** Normalise a raw genotype value string for classification. */
function normaliseGenotypeValue(value: string): 'ko' | 'het' | 'wt' | 'unknown' {
  const v = value.trim().toUpperCase();

  // KO / homozygous edited patterns
  if (
    v === 'KO' ||
    v === 'HOM' ||
    v === 'HOMOZYGOUS' ||
    v === '-/-' ||
    v === 'KO/KO' ||
    v.startsWith('KO')
  ) return 'ko';

  // HET / heterozygous patterns
  if (
    v === 'HET' ||
    v === 'HETEROZYGOUS' ||
    v === '+/-' ||
    v === 'WT/KO' ||
    v === 'KO/WT' ||
    v === 'HET' ||
    v.startsWith('HET')
  ) return 'het';

  // WT / wild-type patterns
  if (
    v === 'WT' ||
    v === 'WILDTYPE' ||
    v === 'WILD-TYPE' ||
    v === 'WILD_TYPE' ||
    v === '+/+' ||
    v === 'WT/WT' ||
    v.startsWith('WT')
  ) return 'wt';

  return 'unknown';
}

/**
 * Determine the fill pattern for a pedigree node.
 *
 * In 'standard' mode every node is rendered as an empty outline (standard
 * pedigree convention when genotype data is absent or irrelevant).
 *
 * In 'affected' mode the node fill encodes genotype/status:
 *   - KO / homozygous edited  → filled (solid black)
 *   - HET / heterozygous      → half-left (left half filled)
 *   - WT / wild-type          → empty
 *   - deceased                → strikethrough diagonal
 *   - unknown genotype        → quarter fill with '?' label
 */
export function determineNodeFill(individual: Individual, mode: SymbolFillMode): NodeFill {
  if (mode === 'standard') {
    // Standard mode: outline only; mark deceased with strikethrough
    if (individual.status?.toLowerCase() === 'deceased') {
      return { type: 'strikethrough' };
    }
    return { type: 'empty' };
  }

  // affected mode
  const deceased = individual.status?.toLowerCase() === 'deceased';

  const genotype = resolveGenotype(individual);
  const primaryValue = genotype.primaryValue;

  let fillType: NodeFill['type'] = 'empty';
  let label: string | undefined;

  if (primaryValue) {
    const classification = normaliseGenotypeValue(primaryValue);
    switch (classification) {
      case 'ko':
        fillType = 'filled';
        break;
      case 'het':
        fillType = 'half-left';
        break;
      case 'wt':
        fillType = 'empty';
        break;
      case 'unknown':
      default:
        fillType = 'quarter';
        label = '?';
        break;
    }
  } else {
    // No genotype data at all
    fillType = 'quarter';
    label = '?';
  }

  // Deceased overrides with strikethrough (the fill still shows underneath
  // in a real SVG renderer, but for the type we return strikethrough so the
  // renderer can draw the diagonal line on top).
  if (deceased) {
    return { type: 'strikethrough', label };
  }

  return { type: fillType, label };
}

// ---------------------------------------------------------------------------
// SVG shape renderer
// ---------------------------------------------------------------------------

/**
 * Render an SVG string representing a pedigree node shape with the given fill.
 *
 * Conventions:
 *   - Male   → square (rect)
 *   - Female → circle
 *   - Unknown sex → diamond (rotated square)
 *
 * The returned string is a fragment of SVG elements that can be embedded
 * inside an `<svg>` or `<g>` tag.  All coordinates are relative to (0, 0).
 *
 * @param sex    Individual sex string ('M'/'male'/'♂', 'F'/'female'/'♀', or other)
 * @param fill   NodeFill produced by {@link determineNodeFill}
 * @param width  Bounding box width  in SVG user units
 * @param height Bounding box height in SVG user units
 */
export function renderNodeShape(
  sex: string,
  fill: NodeFill,
  width: number,
  height: number,
): string {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2;

  const sexNorm = sex?.trim().toLowerCase() ?? '';
  const isMale = sexNorm === 'm' || sexNorm === 'male' || sexNorm === '♂';
  const isFemale = sexNorm === 'f' || sexNorm === 'female' || sexNorm === '♀';

  const stroke = 'black';
  const strokeWidth = 1.5;
  const fillBlack = 'black';
  const fillWhite = 'white';
  const fillNone = 'none';

  const parts: string[] = [];

  // --- Build outline shape ---
  if (isMale) {
    // Square
    const baseRect = `<rect x="0" y="0" width="${width}" height="${height}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillWhite}" />`;

    if (fill.type === 'empty') {
      parts.push(baseRect);
    } else if (fill.type === 'filled') {
      parts.push(`<rect x="0" y="0" width="${width}" height="${height}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillBlack}" />`);
    } else if (fill.type === 'half-left') {
      parts.push(baseRect);
      parts.push(`<rect x="0" y="0" width="${cx}" height="${height}" fill="${fillBlack}" />`);
      // Redraw outline on top so stroke is visible
      parts.push(`<rect x="0" y="0" width="${width}" height="${height}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillNone}" />`);
    } else if (fill.type === 'half-right') {
      parts.push(baseRect);
      parts.push(`<rect x="${cx}" y="0" width="${cx}" height="${height}" fill="${fillBlack}" />`);
      parts.push(`<rect x="0" y="0" width="${width}" height="${height}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillNone}" />`);
    } else if (fill.type === 'quarter') {
      parts.push(baseRect);
      parts.push(`<rect x="0" y="${cy}" width="${cx}" height="${cy}" fill="${fillBlack}" />`);
      parts.push(`<rect x="0" y="0" width="${width}" height="${height}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillNone}" />`);
    } else if (fill.type === 'strikethrough') {
      parts.push(baseRect);
      parts.push(`<line x1="0" y1="${height}" x2="${width}" y2="0" stroke="${stroke}" stroke-width="${strokeWidth}" />`);
    }
  } else if (isFemale) {
    // Circle
    const baseCircle = `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillWhite}" />`;

    if (fill.type === 'empty') {
      parts.push(baseCircle);
    } else if (fill.type === 'filled') {
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillBlack}" />`);
    } else if (fill.type === 'half-left') {
      parts.push(baseCircle);
      // Clip left half using a path (pie slice left)
      const halfPath = `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} Z`;
      parts.push(`<path d="${halfPath}" fill="${fillBlack}" />`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillNone}" />`);
    } else if (fill.type === 'half-right') {
      parts.push(baseCircle);
      const halfPath = `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`;
      parts.push(`<path d="${halfPath}" fill="${fillBlack}" />`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillNone}" />`);
    } else if (fill.type === 'quarter') {
      parts.push(baseCircle);
      // Bottom-left quarter
      const qPath = `M ${cx} ${cy} L ${cx} ${cy + r} A ${r} ${r} 0 0 0 ${cx - r} ${cy} Z`;
      parts.push(`<path d="${qPath}" fill="${fillBlack}" />`);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillNone}" />`);
    } else if (fill.type === 'strikethrough') {
      parts.push(baseCircle);
      // Diagonal line through circle
      const offset = r * 0.707; // 45 degrees
      parts.push(`<line x1="${cx - offset}" y1="${cy + offset}" x2="${cx + offset}" y2="${cy - offset}" stroke="${stroke}" stroke-width="${strokeWidth}" />`);
    }
  } else {
    // Unknown sex → diamond (rotated 45° square)
    const diamond = `M ${cx} 0 L ${width} ${cy} L ${cx} ${height} L 0 ${cy} Z`;
    const baseDiamond = `<path d="${diamond}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillWhite}" />`;

    if (fill.type === 'empty') {
      parts.push(baseDiamond);
    } else if (fill.type === 'filled') {
      parts.push(`<path d="${diamond}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillBlack}" />`);
    } else if (fill.type === 'half-left') {
      parts.push(baseDiamond);
      const halfPath = `M ${cx} 0 L 0 ${cy} L ${cx} ${height} Z`;
      parts.push(`<path d="${halfPath}" fill="${fillBlack}" />`);
      parts.push(`<path d="${diamond}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillNone}" />`);
    } else if (fill.type === 'half-right') {
      parts.push(baseDiamond);
      const halfPath = `M ${cx} 0 L ${width} ${cy} L ${cx} ${height} Z`;
      parts.push(`<path d="${halfPath}" fill="${fillBlack}" />`);
      parts.push(`<path d="${diamond}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillNone}" />`);
    } else if (fill.type === 'quarter') {
      parts.push(baseDiamond);
      const qPath = `M ${cx} ${cy} L 0 ${cy} L ${cx} ${height} Z`;
      parts.push(`<path d="${qPath}" fill="${fillBlack}" />`);
      parts.push(`<path d="${diamond}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fillNone}" />`);
    } else if (fill.type === 'strikethrough') {
      parts.push(baseDiamond);
      parts.push(`<line x1="0" y1="${cy}" x2="${width}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeWidth}" />`);
    }
  }

  // Optional label (e.g. '?')
  if (fill.label) {
    parts.push(
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" ` +
      `font-size="${Math.min(width, height) * 0.45}" fill="${fill.type === 'filled' ? fillWhite : fillBlack}" ` +
      `font-family="serif">${fill.label}</text>`,
    );
  }

  return parts.join('\n');
}
