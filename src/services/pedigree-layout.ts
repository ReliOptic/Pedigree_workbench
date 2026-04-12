import dagre from 'dagre';
import type { Individual, Mating } from '../types/pedigree.types';
import { computeAllCOI } from './kinship';

/**
 * Pure layout helpers for the pedigree canvas.
 *
 * Layout math lives here so it is unit-testable in isolation from React.
 * The view layer is responsible only for translating these coordinates
 * into SVG/DOM.
 *
 * Uses dagre's Sugiyama hierarchical layout (rankdir: TB) for clean
 * generation-separated positioning with parent pairs adjacent to each other.
 */

export interface NodePosition {
  readonly id: string;
  x: number;
  y: number;
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

export interface MatingConnection {
  readonly id: string;
  readonly sireId: string;
  readonly damId: string;
  readonly status: string;
  readonly midX: number;
  readonly midY: number;
  readonly sirePos: { x: number; y: number };
  readonly damPos: { x: number; y: number };
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
  readonly matingConnections: readonly MatingConnection[];
}

export interface LayoutOptions {
  readonly horizontalGap?: number;
  readonly verticalGap?: number;
  readonly originX?: number;
  readonly originY?: number;
  readonly nodePositions?: Readonly<Record<string, { x: number; y: number }>>;
}

/** Node dimensions — must match the w-14 h-14 (56px) shape in PedigreeCanvas. */
const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;

/** Bottom edge offset from node top (node shape height = 56px). */
const NODE_BOTTOM = 56;
/** How far below the node bottom to draw the horizontal marriage line. */
const MARRIAGE_OFFSET = 30;
/** Half the rendered node size — used to center connectors and row labels. */
const NODE_HALF = 28;

const UNSPECIFIED_GENERATION = '__unspecified__';

function parseGenerationOrder(label: string): number | null {
  const match = label.match(/-?\d+/);
  if (match === null) return null;
  const n = Number.parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Computes positions and connectors for a flat list of individuals using
 * dagre's Sugiyama hierarchical layout.
 *
 * Strategy:
 *  - Build a dagre graph with virtual "mating nodes" so sire+dam pairs are
 *    placed horizontally adjacent and their children are centered below.
 *  - Generation strings (F0, F1, …) are used to pin individuals to the
 *    correct rank in the hierarchy.
 *  - positionOverrides allow per-node manual positions (from drag).
 *  - Emit a marriage/drop connector for each child whose sire AND dam
 *    resolve to nodes in the result.
 */
export function computeLayout(
  individuals: readonly Individual[],
  options: Partial<LayoutOptions> = {},
  matings: readonly Mating[] = [],
  positionOverrides?: Readonly<Record<string, { x: number; y: number }>>,
): LayoutResult {
  const hGap = options.horizontalGap ?? 160;
  const vGap = options.verticalGap ?? 240;
  const originX = options.originX ?? 100;
  const originY = options.originY ?? 100;

  // ── Build dagre graph ────────────────────────────────────────────────────
  const g = new dagre.graphlib.Graph({ multigraph: false, compound: false });
  g.setGraph({
    rankdir: 'TB',
    nodesep: hGap,
    ranksep: vGap,
    marginx: originX,
    marginy: originY,
    ranker: 'network-simplex',
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Map individual IDs to their parsed generation rank (null = unknown).
  const individualIds = new Set(individuals.map((i) => i.id));

  // Collect all individuals that have both sire and dam in our dataset.
  // We'll use virtual mating nodes for these.
  const matingNodeIds = new Set<string>();
  const matingToParents = new Map<string, { sireId: string; damId: string }>();

  // Identify unique sire+dam pairs with children in our dataset.
  const pairKey = (sireId: string, damId: string): string =>
    `__mating__${sireId}__${damId}__`;

  for (const ind of individuals) {
    if (ind.sire === undefined || ind.dam === undefined) continue;
    if (!individualIds.has(ind.sire) || !individualIds.has(ind.dam)) continue;
    const key = pairKey(ind.sire, ind.dam);
    if (!matingToParents.has(key)) {
      matingToParents.set(key, { sireId: ind.sire, damId: ind.dam });
      matingNodeIds.add(key);
    }
  }

  // ── Determine generation rank per individual ──────────────────────────────
  // Parse generation strings to numeric ranks.
  const generationRank = new Map<string, number>();
  const genStrings = new Map<string, string>(); // id → raw generation string

  for (const ind of individuals) {
    if (ind.generation !== undefined) {
      genStrings.set(ind.id, ind.generation);
      const rank = parseGenerationOrder(ind.generation);
      if (rank !== null) {
        generationRank.set(ind.id, rank);
      }
    }
  }

  // Normalize ranks so minimum is 0.
  const rankValues = Array.from(generationRank.values());
  const minRank = rankValues.length > 0 ? Math.min(...rankValues) : 0;
  for (const [id, rank] of generationRank) {
    generationRank.set(id, rank - minRank);
  }

  // ── Add individual nodes ──────────────────────────────────────────────────
  for (const ind of individuals) {
    const nodeLabel: dagre.Label = { width: NODE_WIDTH, height: NODE_HEIGHT };
    const rank = generationRank.get(ind.id);
    if (rank !== undefined) {
      (nodeLabel as Record<string, unknown>)['rank'] = rank;
    }
    g.setNode(ind.id, nodeLabel);
  }

  // ── Add virtual mating nodes and edges ───────────────────────────────────
  for (const [key, { sireId, damId }] of matingToParents) {
    // Virtual mating node: tiny, sits between sire and dam.
    g.setNode(key, { width: 1, height: 1 });
    g.setEdge(sireId, key, {});
    g.setEdge(damId, key, {});
  }

  // Connect mating nodes to children.
  for (const ind of individuals) {
    if (ind.sire === undefined || ind.dam === undefined) continue;
    if (!individualIds.has(ind.sire) || !individualIds.has(ind.dam)) continue;
    const key = pairKey(ind.sire, ind.dam);
    g.setEdge(key, ind.id, {});
  }

  // Connect individuals with only one known parent directly.
  for (const ind of individuals) {
    const hasBothParents =
      ind.sire !== undefined &&
      ind.dam !== undefined &&
      individualIds.has(ind.sire) &&
      individualIds.has(ind.dam);
    if (hasBothParents) continue;

    if (ind.sire !== undefined && individualIds.has(ind.sire)) {
      g.setEdge(ind.sire, ind.id, {});
    }
    if (ind.dam !== undefined && individualIds.has(ind.dam)) {
      g.setEdge(ind.dam, ind.id, {});
    }
  }

  // ── Run dagre layout ──────────────────────────────────────────────────────
  dagre.layout(g);

  // ── Extract node positions ────────────────────────────────────────────────
  // dagre centers nodes, so node.x/y are centers. Convert to top-left coords.
  const nodes: NodePosition[] = [];
  const positionById = new Map<string, NodePosition>();

  for (const ind of individuals) {
    const dagreNode = g.node(ind.id);
    if (dagreNode === undefined) continue;
    const x = dagreNode.x - NODE_WIDTH / 2;
    const y = dagreNode.y - NODE_HEIGHT / 2;
    const node: NodePosition = { id: ind.id, x, y };
    nodes.push(node);
    positionById.set(ind.id, node);
  }

  // ── Apply manual position overrides ──────────────────────────────────────
  if (positionOverrides !== undefined) {
    for (const node of nodes) {
      const override = positionOverrides[node.id];
      if (override !== undefined) {
        node.x = override.x;
        node.y = override.y;
        positionById.set(node.id, node);
      }
    }
  }

  // ── Build connectors (parent→child paths) ────────────────────────────────
  const connectors: ConnectorPath[] = [];

  for (const ind of individuals) {
    if (ind.sire === undefined || ind.dam === undefined) continue;
    const sirePos = positionById.get(ind.sire);
    const damPos = positionById.get(ind.dam);
    const childPos = positionById.get(ind.id);
    if (sirePos === undefined || damPos === undefined || childPos === undefined) continue;

    const sireX = sirePos.x + NODE_HALF;
    const damX = damPos.x + NODE_HALF;
    const marriageY = Math.max(sirePos.y, damPos.y) + NODE_BOTTOM + MARRIAGE_OFFSET;

    // Marriage line: descend from each parent bottom, then draw horizontal bar.
    const marriageD = `M ${sireX} ${sirePos.y + NODE_BOTTOM} L ${sireX} ${marriageY} L ${damX} ${marriageY} L ${damX} ${damPos.y + NODE_BOTTOM}`;

    // Drop line: from marriage bar midpoint down to child top, using bezier curves.
    const midX = (sireX + damX) / 2;
    const childCenterX = childPos.x + NODE_HALF;
    const childTopY = childPos.y;

    const cpOffset = Math.max(20, (childTopY - marriageY) * 0.45);
    const dropD = `M ${midX} ${marriageY} C ${midX} ${marriageY + cpOffset} ${childCenterX} ${childTopY - cpOffset} ${childCenterX} ${childTopY}`;

    connectors.push({ childId: ind.id, marriageD, dropD });
  }

  // ── Compute generation labels from layout y-positions ────────────────────
  // Group individuals by their generation string and compute a representative
  // y for each row.
  const genLabelMap = new Map<string, number[]>(); // gen string → list of node y-values

  for (const node of nodes) {
    const ind = individuals.find((i) => i.id === node.id);
    const gen = ind?.generation;
    if (gen === undefined) continue;
    const arr = genLabelMap.get(gen) ?? [];
    arr.push(node.y);
    genLabelMap.set(gen, arr);
  }

  // Order generation labels by parsed rank (same as before).
  const firstSeen = new Map<string, number>();
  individuals.forEach((ind, idx) => {
    const key = ind.generation ?? UNSPECIFIED_GENERATION;
    if (!firstSeen.has(key)) firstSeen.set(key, idx);
  });

  const orderedGenKeys = Array.from(genLabelMap.keys()).sort((a, b) => {
    const na = parseGenerationOrder(a);
    const nb = parseGenerationOrder(b);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    if (na !== null && nb === null) return -1;
    if (na === null && nb !== null) return 1;
    return (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0);
  });

  const generations: string[] = orderedGenKeys;

  const generationLabels: GenerationLabel[] = orderedGenKeys.map((key) => {
    const ys = genLabelMap.get(key) ?? [];
    const avgY = ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
    return { label: key, y: avgY + NODE_HALF };
  });

  // ── Mating connections (from explicit Mating records) ─────────────────────
  const matingConnections: MatingConnection[] = [];

  for (const mating of matings) {
    const sirePos = positionById.get(mating.sireId);
    const damPos = positionById.get(mating.damId);
    if (sirePos === undefined || damPos === undefined) continue;
    const midX = (sirePos.x + damPos.x) / 2 + NODE_HALF;
    const midY = (sirePos.y + damPos.y) / 2 + NODE_HALF;
    matingConnections.push({
      id: mating.id,
      sireId: mating.sireId,
      damId: mating.damId,
      status: mating.status,
      midX,
      midY,
      sirePos: { x: sirePos.x, y: sirePos.y },
      damPos: { x: damPos.x, y: damPos.y },
    });
  }

  return { nodes, connectors, generations, generationLabels, matingConnections };
}

/**
 * Returns IDs of individuals that have a non-zero inbreeding coefficient (F > 0).
 * Uses Wright's path coefficient method via computeAllCOI.
 */
export function detectInbreeding(individuals: readonly Individual[]): string[] {
  const results = computeAllCOI(individuals);
  return results.filter(r => r.coefficient > 0).map(r => r.id);
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
