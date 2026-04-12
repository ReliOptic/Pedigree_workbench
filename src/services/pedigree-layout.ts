import type { Individual } from '../types/pedigree.types';

/**
 * Pure layout helpers for the pedigree canvas.
 *
 * Layout math lives here so it is unit-testable in isolation from React.
 * The view layer is responsible only for translating these coordinates
 * into SVG/DOM.
 *
 * Generations in PRD v3.1 are free-form strings ("F0", "F1", etc.). We
 * bucket individuals by exact generation string and order buckets by
 * parsed numeric suffix when available, falling back to first-seen order.
 */

export interface NodePosition {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface ConnectorPath {
  readonly childId: string;
  readonly /** Top-down "marriage line" path through the parents. */ marriageD: string;
  readonly /** Drop line from the marriage to the child. */ dropD: string;
}

export interface GenerationLabel {
  /** Raw generation string from the data, e.g. "F0". */
  readonly label: string;
  /** Absolute y-coordinate (in canvas space) where the row is centered. */
  readonly y: number;
}

export interface LayoutResult {
  readonly nodes: readonly NodePosition[];
  readonly connectors: readonly ConnectorPath[];
  /** Ordered generation labels (strings from the data). */
  readonly generations: readonly string[];
  /**
   * Positioned row labels that live inside canvas space — render these
   * inside the transformed layer so they track pan/zoom with their row.
   */
  readonly generationLabels: readonly GenerationLabel[];
}

export interface LayoutOptions {
  readonly horizontalGap: number;
  readonly verticalGap: number;
  readonly originX: number;
  readonly originY: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  horizontalGap: 140,
  verticalGap: 240,
  originX: 100,
  originY: 100,
};

/** Half the rendered node size — used to center row labels vertically. */
const NODE_HALF = 28;

const UNSPECIFIED_GENERATION = '__unspecified__';

function parseGenerationOrder(label: string): number | null {
  const match = label.match(/-?\d+/);
  if (match === null) return null;
  const n = Number.parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Computes positions and connectors for a flat list of individuals.
 *
 * Strategy:
 *  - Group by `generation` string (missing → synthetic bucket).
 *  - Order generations by parsed integer suffix, then first-seen order.
 *  - Within a row, place individuals in stable input order.
 *  - Emit a marriage/drop connector for each child whose sire AND dam
 *    resolve to nodes in the result.
 */
export function computeLayout(
  individuals: readonly Individual[],
  options: Partial<LayoutOptions> = {},
): LayoutResult {
  const opts: LayoutOptions = { ...DEFAULT_OPTIONS, ...options };

  const buckets = new Map<string, Individual[]>();
  const firstSeen = new Map<string, number>();
  individuals.forEach((ind, idx) => {
    const key = ind.generation ?? UNSPECIFIED_GENERATION;
    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = [];
      buckets.set(key, bucket);
      firstSeen.set(key, idx);
    }
    bucket.push(ind);
  });

  const orderedKeys = Array.from(buckets.keys()).sort((a, b) => {
    const na = parseGenerationOrder(a);
    const nb = parseGenerationOrder(b);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    if (na !== null && nb === null) return -1;
    if (na === null && nb !== null) return 1;
    return (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0);
  });

  const nodes: NodePosition[] = [];
  const positionById = new Map<string, NodePosition>();

  orderedKeys.forEach((key, rowIdx) => {
    const bucket = buckets.get(key) ?? [];
    bucket.forEach((ind, colIdx) => {
      const node: NodePosition = {
        id: ind.id,
        x: colIdx * opts.horizontalGap + opts.originX,
        y: rowIdx * opts.verticalGap + opts.originY,
      };
      nodes.push(node);
      positionById.set(ind.id, node);
    });
  });

  const connectors: ConnectorPath[] = [];
  for (const ind of individuals) {
    if (ind.sire === undefined || ind.dam === undefined) continue;
    const sirePos = positionById.get(ind.sire);
    const damPos = positionById.get(ind.dam);
    const childPos = positionById.get(ind.id);
    if (sirePos === undefined || damPos === undefined || childPos === undefined) continue;

    const marriageD = `M ${sirePos.x + 20} ${sirePos.y + 40} L ${sirePos.x + 20} ${sirePos.y + 60} L ${damPos.x + 20} ${damPos.y + 60} L ${damPos.x + 20} ${damPos.y + 40}`;
    const midX = (sirePos.x + damPos.x) / 2 + 20;
    const dropD = `M ${midX} ${sirePos.y + 60} L ${midX} ${childPos.y - 20} L ${childPos.x + 20} ${childPos.y - 20} L ${childPos.x + 20} ${childPos.y}`;
    connectors.push({ childId: ind.id, marriageD, dropD });
  }

  const generations = orderedKeys.filter((k) => k !== UNSPECIFIED_GENERATION);

  const generationLabels: GenerationLabel[] = [];
  orderedKeys.forEach((key, rowIdx) => {
    if (key === UNSPECIFIED_GENERATION) return;
    generationLabels.push({
      label: key,
      y: rowIdx * opts.verticalGap + opts.originY + NODE_HALF,
    });
  });

  return { nodes, connectors, generations, generationLabels };
}

/** Aggregate counts surfaced by the footer status bar. */
export function summarize(individuals: readonly Individual[]): {
  readonly totalIndividuals: number;
  readonly generations: number;
  readonly groups: number;
} {
  const generations = new Set<string>();
  const groups = new Set<string>();
  for (const ind of individuals) {
    if (ind.generation !== undefined) generations.add(ind.generation);
    if (ind.group !== undefined) groups.add(ind.group);
  }
  return {
    totalIndividuals: individuals.length,
    generations: generations.size,
    groups: groups.size,
  };
}
