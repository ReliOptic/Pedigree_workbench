import type { Individual } from '../types/pedigree.types';

/**
 * Pure layout helpers for the pedigree canvas.
 *
 * Extracted from `PedigreeCanvas.tsx` so the geometry logic is unit
 * testable and free of React state. The view layer is responsible only
 * for translating these coordinates into SVG/DOM.
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

export interface LayoutResult {
  readonly nodes: readonly NodePosition[];
  readonly connectors: readonly ConnectorPath[];
  readonly generations: readonly number[];
}

export interface LayoutOptions {
  readonly horizontalGap: number;
  readonly verticalGap: number;
  readonly originX: number;
  readonly originY: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  horizontalGap: 80,
  verticalGap: 200,
  originX: 100,
  originY: 100,
};

/**
 * Computes positions and connectors for a flat list of individuals.
 *
 * Layout strategy is intentionally simple — generations are stacked
 * vertically, individuals within a generation are placed in stable input
 * order. A real layout engine (e.g. Sugiyama) is out of scope for v1.
 */
export function computeLayout(
  individuals: readonly Individual[],
  options: Partial<LayoutOptions> = {},
): LayoutResult {
  const opts: LayoutOptions = { ...DEFAULT_OPTIONS, ...options };

  const indexById = new Map<string, number>();
  individuals.forEach((ind, idx) => indexById.set(ind.id, idx));

  const nodes: NodePosition[] = individuals.map((ind, idx) => ({
    id: ind.id,
    x: idx * opts.horizontalGap + opts.originX,
    y: (ind.generation - 1) * opts.verticalGap + opts.originY,
  }));

  const positionFor = (id: string | undefined): NodePosition | null => {
    if (id === undefined) return null;
    const idx = indexById.get(id);
    if (idx === undefined) return null;
    const node = nodes[idx];
    return node ?? null;
  };

  const connectors: ConnectorPath[] = [];
  for (const ind of individuals) {
    const sirePos = positionFor(ind.sireId);
    const damPos = positionFor(ind.damId);
    const childPos = positionFor(ind.id);
    if (sirePos === null || damPos === null || childPos === null) continue;

    const marriageD = `M ${sirePos.x + 20} ${sirePos.y + 40} L ${sirePos.x + 20} ${sirePos.y + 60} L ${damPos.x + 20} ${damPos.y + 60} L ${damPos.x + 20} ${damPos.y + 40}`;
    const midX = (sirePos.x + damPos.x) / 2 + 20;
    const dropD = `M ${midX} ${sirePos.y + 60} L ${midX} ${childPos.y - 20} L ${childPos.x + 20} ${childPos.y - 20} L ${childPos.x + 20} ${childPos.y}`;
    connectors.push({ childId: ind.id, marriageD, dropD });
  }

  const generations = Array.from(new Set(individuals.map((i) => i.generation))).sort(
    (a, b) => a - b,
  );

  return { nodes, connectors, generations };
}

/**
 * Aggregate counts surfaced by the footer status bar.
 */
export function summarize(individuals: readonly Individual[]): {
  readonly totalIndividuals: number;
  readonly generations: number;
} {
  const generations = new Set(individuals.map((i) => i.generation));
  return { totalIndividuals: individuals.length, generations: generations.size };
}
