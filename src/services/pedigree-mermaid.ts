import type { Individual } from '../types/pedigree.types';

/**
 * Sanitize an individual ID for use as a Mermaid node identifier.
 * Replaces non-alphanumeric characters with underscores and prepends "n_"
 * to avoid leading digits (which Mermaid rejects).
 */
function sanitizeId(id: string): string {
  return 'n_' + id.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Determine the sex category from the raw sex string.
 * Recognises Korean (수컷/암컷), single-letter (M/F), and English (male/female).
 */
function classifySex(sex: string | undefined): 'male' | 'female' | 'unknown' {
  const s = (sex ?? '').trim().toLowerCase();
  if (s === '수컷' || s === 'm' || s === 'male') return 'male';
  if (s === '암컷' || s === 'f' || s === 'female') return 'female';
  return 'unknown';
}

/**
 * Build a display label for a node.  Includes name/id, sex symbol,
 * generation (when available), and status (when available).
 */
function buildLabel(ind: Individual): string {
  const sexClass = classifySex(ind.sex);
  const symbol = sexClass === 'male' ? '\u2642' : sexClass === 'female' ? '\u2640' : '?';
  const name = ind.label ?? ind.id;
  const parts = [name];

  const genPart = ind.generation !== undefined ? `${symbol} ${ind.generation}` : symbol;
  parts.push(genPart);

  if (ind.status !== undefined && ind.status.length > 0) {
    parts.push(ind.status);
  }

  return parts.join('<br/>');
}

/**
 * Wrap a label in the correct Mermaid shape brackets based on sex.
 *   Male   -> square brackets  `["..."]`
 *   Female -> round brackets   `("...")`
 *   Unknown -> diamond braces  `{"..."}`
 */
function wrapShape(sanitized: string, label: string, sexClass: 'male' | 'female' | 'unknown'): string {
  const escaped = `"${label}"`;
  switch (sexClass) {
    case 'male':
      return `${sanitized}[${escaped}]`;
    case 'female':
      return `${sanitized}(${escaped})`;
    case 'unknown':
      return `${sanitized}{${escaped}}`;
  }
}

/**
 * Convert an array of {@link Individual} records into a Mermaid flowchart
 * string suitable for rendering with `mermaid.render()`.
 */
export function toMermaid(individuals: readonly Individual[]): string {
  const lines: string[] = ['flowchart TD'];

  // Build sanitized-ID lookup.
  const idMap = new Map<string, string>();
  for (const ind of individuals) {
    idMap.set(ind.id, sanitizeId(ind.id));
  }

  // Node declarations.
  for (const ind of individuals) {
    const san = idMap.get(ind.id)!;
    const sexClass = classifySex(ind.sex);
    const label = buildLabel(ind);
    lines.push(`  ${wrapShape(san, label, sexClass)}:::${sexClass}`);
  }

  // Edges.
  for (const ind of individuals) {
    const childSan = idMap.get(ind.id)!;
    const hasSire = ind.sire !== undefined && ind.sire.length > 0;
    const hasDam = ind.dam !== undefined && ind.dam.length > 0;

    if (hasSire && hasDam) {
      const sireSan = idMap.get(ind.sire!) ?? sanitizeId(ind.sire!);
      const damSan = idMap.get(ind.dam!) ?? sanitizeId(ind.dam!);
      lines.push(`  ${sireSan} & ${damSan} --> ${childSan}`);
    } else if (hasSire) {
      const sireSan = idMap.get(ind.sire!) ?? sanitizeId(ind.sire!);
      lines.push(`  ${sireSan} --> ${childSan}`);
    } else if (hasDam) {
      const damSan = idMap.get(ind.dam!) ?? sanitizeId(ind.dam!);
      lines.push(`  ${damSan} --> ${childSan}`);
    }
  }

  // Class definitions.
  lines.push('  classDef male fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px');
  lines.push('  classDef female fill:#fce7f3,stroke:#be185d,stroke-width:2px');
  lines.push('  classDef unknown fill:#f1f5f9,stroke:#475569,stroke-width:2px');

  return lines.join('\n');
}
