import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Plus, Minus, Focus } from 'lucide-react';
import { motion } from 'motion/react';

import { computeLayout } from '../services/pedigree-layout';
import { computeAllCOI } from '../services/kinship';
import { classifySex } from '../lib/sex-utils';
import { cn } from '../lib/utils';
import type { Individual, Mating } from '../types/pedigree.types';
import type { GenerationFormat } from '../services/settings-store';
import type { Translation } from '../types/translation.types';

/**
 * Imperative handle exposed by {@link PedigreeCanvas}. Parents attach a ref
 * to trigger view operations (zoom/fit) from outside the canvas — used by
 * the canvas right-click menu and keyboard shortcuts.
 */
export interface PedigreeCanvasHandle {
  readonly fit: () => void;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly focusGeneration: (generation: string) => void;
  readonly focusGroup: (groupId: string) => void;
}

interface PedigreeCanvasProps {
  readonly individuals: readonly Individual[];
  readonly matings?: readonly Mating[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onNodeContextMenu?: (id: string, position: { x: number; y: number }) => void;
  readonly onCanvasContextMenu?: (position: { x: number; y: number }) => void;
  readonly t: Translation;
  readonly searchQuery?: string;
  readonly showNotesOnHover?: boolean;
  readonly generationFormat?: GenerationFormat;
  readonly nodePositions?: Readonly<Record<string, { x: number; y: number }>>;
  readonly onNodeDrag?: (id: string, x: number, y: number) => void;
  readonly relationshipSourceId?: string | null;
  readonly interactionHint?: string | null;
  readonly activeGroupId?: string | null;
}

type StatusTone = {
  shell: string;
  badge: string;
};

const STATUS_TONES: Array<{ match: RegExp; tone: StatusTone }> = [
  { match: /교배예정|planned|candidate/i, tone: { shell: 'ring-green-400/45 ring-2 ring-offset-1 ring-offset-surface', badge: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-200 border-green-300 dark:border-green-800' } },
  { match: /합사|mated|paired/i, tone: { shell: 'ring-sky-400/45 ring-2 ring-offset-1 ring-offset-surface', badge: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-200 border-sky-300 dark:border-sky-800' } },
  { match: /폐사|사산|dead|died|stillbirth/i, tone: { shell: 'ring-red-400/45 ring-2 ring-offset-1 ring-offset-surface opacity-80', badge: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 border-red-300 dark:border-red-800' } },
  { match: /도태|기형|culled|discard/i, tone: { shell: 'ring-slate-400/40 ring-2 ring-offset-1 ring-offset-surface opacity-80', badge: 'bg-slate-100 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700' } },
];

function getStatusTone(status: string | undefined): StatusTone | null {
  if (status === undefined || status.trim().length === 0) return null;
  return STATUS_TONES.find((entry) => entry.match.test(status))?.tone ?? {
    shell: 'ring-amber-300/40 ring-2 ring-offset-1 ring-offset-surface',
    badge: 'bg-surface-raised text-text-secondary border-border',
  };
}

function getMissingFieldCount(ind: Individual): number {
  let count = 0;
  if (ind.sex === undefined || ind.sex.trim() === '') count += 1;
  if (ind.birthDate === undefined || ind.birthDate.trim() === '') count += 1;
  if (ind.generation === undefined || ind.generation.trim() === '') count += 1;
  const genotype = ind.fields['CD163'] ?? ind.fields['genotype'];
  if (genotype === undefined || genotype.trim() === '') count += 1;
  return count;
}

function toRoman(n: number): string {
  if (n <= 0) return String(n);
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  let rem = n;
  for (let i = 0; i < vals.length; i++) {
    while (rem >= vals[i]!) { result += syms[i]; rem -= vals[i]!; }
  }
  return result;
}

function formatGeneration(raw: string, format: GenerationFormat): string {
  const match = raw.match(/^(\D*)(-?\d+)$/);
  if (match === null) return raw;
  const n = Number.parseInt(match[2] ?? '0', 10);
  switch (format) {
    case 'F': return `F${n}`;
    case 'Gen': return `Gen ${n}`;
    case 'Roman': return toRoman(n);
    case 'Custom': return raw;
  }
}

const MATING_STATUS_COLOR: Record<string, string> = {
  planned: '#94a3b8',
  mated: '#3b82f6',
  pregnant: '#ec4899',
  delivered: '#22c55e',
  failed: '#ef4444',
};

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
/**
 * Cap applied only to the _initial_ auto-fit when the canvas first loads.
 * With only a handful of seed nodes, an unrestricted fit zooms way past
 * natural size and startles users. The manual Fit button keeps the full
 * ZOOM_MAX ceiling so users can still "fill the screen" on demand.
 */
const INITIAL_FIT_MAX = 1.0;
const ZOOM_STEP = 0.1;
const WHEEL_STEP = 0.1;
const PAN_STEP = 40;
const NODE_SIZE = 52; // px; matches compact node shell
const PADDING = 160; // fit-to-screen padding (extra room for labels below shapes)

type SexShape = 'male' | 'female' | 'unknown';

function describeSex(shape: SexShape): string {
  if (shape === 'male') return 'male';
  if (shape === 'female') return 'female';
  return 'unknown sex';
}

/**
 * Pan/zoom canvas for the pedigree graph.
 *
 * Layout math is delegated to {@link computeLayout}; this component is
 * responsible only for view transforms (pan/zoom), input handling
 * (mouse drag/wheel, keyboard), and SVG/DOM rendering.
 *
 * Accessibility:
 * - The viewport section is keyboard-focusable (tabIndex=0) and accepts
 *   arrow keys (pan), +/- (zoom), 0 (fit to screen), Escape (deselect).
 * - Node buttons use a roving tabindex — only the selected (or first) node
 *   is in the tab order, so a pedigree of N nodes doesn't create N tab stops.
 */
export const PedigreeCanvas = forwardRef<PedigreeCanvasHandle, PedigreeCanvasProps>(
  function PedigreeCanvas(
    {
      individuals,
      matings = [],
      selectedId,
      onSelect,
      onNodeContextMenu,
      onCanvasContextMenu,
      t,
      searchQuery,
      showNotesOnHover = true,
      generationFormat = 'F',
      nodePositions,
      onNodeDrag,
      relationshipSourceId = null,
      interactionHint = null,
      activeGroupId = null,
    },
    ref,
  ): React.JSX.Element {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hasFitOnce, setHasFitOnce] = useState<boolean>(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ nodeX: number; nodeY: number; mouseX: number; mouseY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(
    () => computeLayout(individuals, {}, matings, nodePositions),
    [individuals, matings, nodePositions],
  );
  const coiMap = useMemo(() => {
    const results = computeAllCOI(individuals);
    const map = new Map<string, { coefficient: number; risk: string }>();
    for (const r of results) {
      if (r.coefficient > 0) map.set(r.id, r);
    }
    return map;
  }, [individuals]);
  const inbredIds = useMemo(() => new Set(coiMap.keys()), [coiMap]);

  // Memoized id→individual map for O(1) lookups (used by hover tooltip).
  const individualsMap = useMemo(() => {
    const map = new Map<string, Individual>();
    for (const ind of individuals) map.set(ind.id, ind);
    return map;
  }, [individuals]);

  // Effective positions: layout positions with nodePositions overrides applied.
  const effectivePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of layout.nodes) {
      const override = nodePositions?.[node.id];
      map.set(node.id, override ?? { x: node.x, y: node.y });
    }
    return map;
  }, [layout.nodes, nodePositions]);

  const positionById = effectivePositions;

  // Set of individual IDs that match the current search query.
  const isSearching = searchQuery !== undefined && searchQuery.length > 0;
  const matchingIds = useMemo<Set<string>>(() => {
    if (!isSearching) return new Set<string>();
    const q = searchQuery!.toLowerCase();
    const matches = new Set<string>();
    for (const ind of individuals) {
      const haystack = [
        ind.id,
        ind.label,
        ind.sex,
        ind.generation,
        ind.group,
        ind.status,
        ind.sequence,
        ...Object.values(ind.fields),
      ];
      if (haystack.some((v) => v !== undefined && v.toLowerCase().includes(q))) {
        matches.add(ind.id);
      }
    }
    return matches;
  }, [individuals, isSearching, searchQuery]);

  // The id that should be in the tab order at any given moment.
  // Falls back to the first node if none is selected.
  const rovingId = useMemo<string | null>(() => {
    if (selectedId !== null && positionById.has(selectedId)) return selectedId;
    return individuals[0]?.id ?? null;
  }, [individuals, positionById, selectedId]);

  // Global mousemove/mouseup listeners for node dragging, throttled via RAF.
  useEffect(() => {
    if (draggingId === null) return;

    let rafId: number | null = null;
    let latestX = 0;
    let latestY = 0;

    const handleMouseMove = (e: MouseEvent): void => {
      if (dragStartRef.current === null || onNodeDrag === undefined) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      latestX = dragStartRef.current.nodeX + dx / zoom;
      latestY = dragStartRef.current.nodeY + dy / zoom;

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          onNodeDrag(draggingId, latestX, latestY);
          rafId = null;
        });
      }
    };
    const handleMouseUp = (): void => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        if (onNodeDrag !== undefined) {
          onNodeDrag(draggingId, latestX, latestY);
        }
      }
      setDraggingId(null);
      dragStartRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [draggingId, zoom, onNodeDrag]);

  // Compute fit-to-screen parameters for the current layout + viewport.
  // Anchors the content's top-left (F0 row, first node) to the top-left of
  // the viewport — F0 sits in the upper-left corner rather than being
  // centered, so users always know where the eldest generation lives.
  const computeFit = useCallback(
    (opts: { initial?: boolean } = {}): { zoom: number; offset: { x: number; y: number } } | null => {
      const viewport = viewportRef.current;
      if (viewport === null) return null;
      if (layout.nodes.length === 0) return null;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of layout.nodes) {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + NODE_SIZE > maxX) maxX = n.x + NODE_SIZE;
        if (n.y + NODE_SIZE > maxY) maxY = n.y + NODE_SIZE;
      }
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const vpW = viewport.clientWidth - PADDING;
      const vpH = viewport.clientHeight - PADDING;
      if (contentW <= 0 || contentH <= 0 || vpW <= 0 || vpH <= 0) return null;

      const rawZoom = Math.min(vpW / contentW, vpH / contentH);
      const ceiling = opts.initial === true ? INITIAL_FIT_MAX : ZOOM_MAX;
      const nextZoom = Math.min(ceiling, Math.max(ZOOM_MIN, rawZoom));

      // Leave breathing room on the left for generation labels, and a small
      // top margin above F0 so it doesn't kiss the header edge.
      const ANCHOR_X = 96;
      const ANCHOR_Y = 48;
      return {
        zoom: nextZoom,
        offset: { x: ANCHOR_X - minX * nextZoom, y: ANCHOR_Y - minY * nextZoom },
      };
    },
    [layout.nodes],
  );

  // Fit-to-screen on first render with non-empty layout.
  // Capped at INITIAL_FIT_MAX so small datasets don't start wildly zoomed in.
  useLayoutEffect(() => {
    if (hasFitOnce) return;
    if (layout.nodes.length === 0) return;
    const fit = computeFit({ initial: true });
    if (fit === null) return;
    setZoom(fit.zoom);
    setOffset(fit.offset);
    setHasFitOnce(true);
  }, [computeFit, hasFitOnce, layout.nodes.length]);

  const handleFit = useCallback((): void => {
    const fit = computeFit();
    if (fit === null) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    setZoom(fit.zoom);
    setOffset(fit.offset);
  }, [computeFit]);

  const handleZoomIn = useCallback(
    (): void => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX)),
    [],
  );
  const handleZoomOut = useCallback(
    (): void => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN)),
    [],
  );

  const handleFocusGeneration = useCallback((generation: string): void => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    const targets = individuals
      .filter((individual) => individual.generation === generation)
      .map((individual) => positionById.get(individual.id))
      .filter((pos): pos is { x: number; y: number } => pos !== undefined);
    if (targets.length === 0) return;

    const avgX = targets.reduce((sum, pos) => sum + pos.x, 0) / targets.length + NODE_SIZE / 2;
    const avgY = targets.reduce((sum, pos) => sum + pos.y, 0) / targets.length + NODE_SIZE / 2;

    setOffset({
      x: viewport.clientWidth * 0.42 - avgX * zoom,
      y: viewport.clientHeight * 0.28 - avgY * zoom,
    });
  }, [individuals, positionById, zoom]);

  const handleFocusGroup = useCallback((groupId: string): void => {
    const viewport = viewportRef.current;
    if (viewport === null) return;
    const targets = individuals
      .filter((individual) => individual.group === groupId)
      .map((individual) => positionById.get(individual.id))
      .filter((pos): pos is { x: number; y: number } => pos !== undefined);
    if (targets.length === 0) return;

    const avgX = targets.reduce((sum, pos) => sum + pos.x, 0) / targets.length + NODE_SIZE / 2;
    const avgY = targets.reduce((sum, pos) => sum + pos.y, 0) / targets.length + NODE_SIZE / 2;

    setOffset({
      x: viewport.clientWidth * 0.42 - avgX * zoom,
      y: viewport.clientHeight * 0.28 - avgY * zoom,
    });
  }, [individuals, positionById, zoom]);

  // Expose view operations to the parent (for canvas context menu).
  useImperativeHandle(
    ref,
    () => ({
      fit: handleFit,
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      focusGeneration: handleFocusGeneration,
      focusGroup: handleFocusGroup,
    }),
    [handleFit, handleZoomIn, handleZoomOut, handleFocusGeneration, handleFocusGroup],
  );

  // Mouse drag to pan (suppressed when a node drag is in progress).
  const handleMouseDown = (e: React.MouseEvent): void => {
    if (e.button === 0 && draggingId === null) setIsDragging(true);
  };
  const handleMouseMove = (e: React.MouseEvent): void => {
    if (!isDragging) return;
    setOffset((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
  };
  const handleMouseUp = (): void => setIsDragging(false);

  // Wheel zoom, anchored to the cursor position.
  const handleWheel = (e: React.WheelEvent): void => {
    e.preventDefault();
    const viewport = viewportRef.current;
    if (viewport === null) return;
    const rect = viewport.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    setZoom((prevZoom) => {
      const direction = e.deltaY < 0 ? 1 : -1;
      const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prevZoom + direction * WHEEL_STEP));
      if (nextZoom === prevZoom) return prevZoom;
      // Anchor the zoom around the cursor: keep world point under cursor fixed.
      setOffset((prevOffset) => {
        const worldX = (cx - prevOffset.x) / prevZoom;
        const worldY = (cy - prevOffset.y) / prevZoom;
        return { x: cx - worldX * nextZoom, y: cy - worldY * nextZoom };
      });
      return nextZoom;
    });
  };

  // Keyboard shortcuts on the viewport.
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setOffset((o) => ({ x: o.x, y: o.y + PAN_STEP }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setOffset((o) => ({ x: o.x, y: o.y - PAN_STEP }));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setOffset((o) => ({ x: o.x + PAN_STEP, y: o.y }));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setOffset((o) => ({ x: o.x - PAN_STEP, y: o.y }));
        break;
      case '+':
      case '=':
        e.preventDefault();
        handleZoomIn();
        break;
      case '-':
      case '_':
        e.preventDefault();
        handleZoomOut();
        break;
      case '0':
        e.preventDefault();
        handleFit();
        break;
      case 'Escape':
        if (selectedId !== null) {
          e.preventDefault();
          onSelect(null);
        }
        break;
      default:
        break;
    }
  };

  const handleCanvasContextMenu = (e: React.MouseEvent): void => {
    // Only fire when the right-click lands on empty canvas, not a node.
    if (e.target !== e.currentTarget) {
      // Event bubbled from a child that didn't handle it — still treat as canvas.
      // Nodes explicitly call stopPropagation + their own onContextMenu below.
    }
    if (onCanvasContextMenu === undefined) return;
    e.preventDefault();
    onCanvasContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <section
      data-testid="pedigree-canvas"
      ref={viewportRef}
      className="relative overflow-hidden bg-surface cursor-grab active:cursor-grabbing focus:outline-none"
      role="region"
      aria-label="Pedigree canvas"
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onContextMenu={handleCanvasContextMenu}
    >
      {/* Dot grid background — static pattern, pans/zooms visually via background-position. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, var(--color-dot-grid) 1px, transparent 1px)`,
          backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`,
        }}
        aria-hidden="true"
      />

      {/* Transformed canvas layer — everything inside tracks pan/zoom together. */}
      <div
        className="absolute"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Generation bands — alternating subtle backgrounds per row. */}
        {layout.generationLabels.map((gl, idx) => (
          idx % 2 === 1 ? (
            <div
              key={`band-${gl.label}`}
              className="absolute pointer-events-none"
              style={{
                left: 0,
                top: gl.y - 28 - 60,
                width: 5000,
                height: 240,
                background: 'var(--color-surface-band, rgba(248,250,252,0.5))',
              }}
              aria-hidden="true"
            />
          ) : null
        ))}

        {layout.groupLabels.map((group) => (
          <div
            key={`group-${group.label}`}
            className="absolute overflow-hidden rounded-2xl border border-border/90 bg-surface-raised/55 shadow-sm"
            style={{
              left: group.x - 12,
              top: group.y - 12,
              width: group.width + 24,
              height: group.height + 24,
            }}
            aria-hidden="true"
          >
            <div className="relative z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-border bg-surface/92 px-4 py-2">
              <span className="truncate font-mono text-xs font-semibold text-text-primary">
                {group.label}
              </span>
              <span className="shrink-0 rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                {group.count}
              </span>
            </div>
          </div>
        ))}

        {/* Connectors (parent-child). */}
        {(() => {
          const allX = layout.nodes.map((n) => n.x);
          const allY = layout.nodes.map((n) => n.y);
          const svgMinX = allX.length > 0 ? Math.min(...allX) - 100 : 0;
          const svgMinY = allY.length > 0 ? Math.min(...allY) - 100 : 0;
          const svgMaxX = allX.length > 0 ? Math.max(...allX) + 300 : 2000;
          const svgMaxY = allY.length > 0 ? Math.max(...allY) + 200 : 2000;
          const svgWidth = Math.max(svgMaxX - svgMinX, 2000);
          const svgHeight = Math.max(svgMaxY - svgMinY, 2000);
          return (
        <svg
          className="absolute pointer-events-none"
          width={svgWidth}
          height={svgHeight}
          style={{ left: svgMinX, top: svgMinY }}
          viewBox={`${svgMinX} ${svgMinY} ${svgWidth} ${svgHeight}`}
          aria-hidden="true"
        >
          <g stroke="var(--color-text-secondary)" strokeWidth="1.5" fill="none">
            {layout.connectors.map((c) => {
              const dimConnector = isSearching && !matchingIds.has(c.childId);
              return (
                <g key={`link-${c.childId}`} opacity={dimConnector ? 0.3 : 1}>
                  <path d={c.marriageD} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
                  <path d={c.dropD} vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
          </g>

          {/* Mating connection lines (from Mating records). */}
          {layout.matingConnections.map((mc) => {
            const color = MATING_STATUS_COLOR[mc.status] ?? '#94a3b8';
            const x1 = mc.sirePos.x + 28;
            const y1 = mc.sirePos.y + 28;
            const x2 = mc.damPos.x + 28;
            const y2 = mc.damPos.y + 28;
            return (
              <g key={`mating-${mc.id}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  vectorEffect="non-scaling-stroke"
                />
                {/* Diamond at midpoint */}
                <rect
                  x={mc.midX - 6}
                  y={mc.midY - 6}
                  width={12}
                  height={12}
                  fill={color}
                  transform={`rotate(45 ${mc.midX} ${mc.midY})`}
                />
                {/* Status label below midpoint */}
                <text
                  x={mc.midX}
                  y={mc.midY + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill={color}
                  fontWeight="600"
                >
                  {mc.status}
                </text>
              </g>
            );
          })}
        </svg>
          );
        })()}

        {/* Row labels — positioned in canvas space so they track with nodes. */}
        {layout.generationLabels.map((gl) => (
          <div
            key={gl.label}
            className="absolute flex items-center gap-2 pointer-events-none select-none"
            style={{ left: 0, top: gl.y - 10 }}
            aria-hidden="true"
          >
            <div className="flex max-w-[132px] items-center gap-1.5 rounded border border-border bg-surface-raised/92 px-2 py-1 shadow-md" style={{ borderLeft: '2px solid var(--color-brand)' }}>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                Gen
              </span>
              <span className="truncate font-mono text-sm font-bold text-text-primary tracking-wide">
                {formatGeneration(gl.label, generationFormat)}
              </span>
            </div>
            <span className="h-[1px] w-16 bg-border" />
          </div>
        ))}

        {/* Hover tooltip — rendered inside transform group so it pans/zooms with the canvas. */}
        {hoveredId !== null && hoverPos !== null && (() => {
          const hoveredInd = individualsMap.get(hoveredId);
          if (hoveredInd === undefined) return null;
          const notes = hoveredInd.notes?.trim();
          return (
            <div
              className="absolute z-50 max-w-72 rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-xs text-text-primary shadow-xl pointer-events-none"
              style={{
                left: hoverPos.x + NODE_SIZE / 2,
                top: hoverPos.y - 74,
                transform: 'translateX(-50%)',
              }}
              aria-hidden="true"
            >
              <div className="space-y-1">
                <p className="break-words font-semibold">{hoveredInd.label ?? hoveredInd.id}</p>
                {(hoveredInd.label ?? hoveredInd.id) !== hoveredInd.id && (
                  <p className="break-all font-mono text-[11px] text-text-secondary">{hoveredInd.id}</p>
                )}
                {showNotesOnHover && notes !== undefined && notes.length > 0 && (
                  <p className="max-h-28 whitespace-pre-wrap break-words overflow-hidden text-text-secondary">
                    {notes.length > 220 ? `${notes.slice(0, 220)}...` : notes}
                  </p>
                )}
              </div>
              {/* Caret pointing down */}
              <span
                className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid rgb(30 41 59)', // slate-800
                }}
              />
            </div>
          );
        })()}

        <div className="relative p-16">
          {individuals.map((ind) => {
            const pos = positionById.get(ind.id);
            if (pos === undefined) return null;
            const shape = classifySex(ind.sex);
            const display = ind.label ?? ind.id;
            const isSelected = selectedId === ind.id;
            const isRelationshipSource = relationshipSourceId === ind.id;
            const isMatch = isSearching && matchingIds.has(ind.id);
            const isGroupDimmed = activeGroupId !== null && ind.group !== activeGroupId;
            const isDimmed = (isSearching && !matchingIds.has(ind.id)) || isGroupDimmed;
            const isRoving = rovingId === ind.id;
            const isInbred = inbredIds.has(ind.id);
            const statusTone = getStatusTone(ind.status);
            const missingFieldCount = getMissingFieldCount(ind);
            const ariaLabel = `${display}, ${describeSex(shape)}${
              ind.generation !== undefined ? `, generation ${ind.generation}` : ''
            }`;
            const sexGlyph = shape === 'male' ? '♂' : shape === 'female' ? '♀' : '?';
            return (
              <motion.button
                key={ind.id}
                type="button"
                data-testid={`pedigree-node-${ind.id}`}
                tabIndex={isRoving ? 0 : -1}
                aria-pressed={isSelected}
                aria-label={ariaLabel}
                title={display !== ind.id ? `${display} (${ind.id})` : display}
                onMouseEnter={() => {
                  setHoveredId(ind.id);
                  setHoverPos({ x: pos.x, y: pos.y });
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  setHoverPos(null);
                }}
                onMouseDown={(e) => {
                  if (e.button !== 0 || onNodeDrag === undefined) return;
                  e.preventDefault();
                  e.stopPropagation();
                  dragStartRef.current = {
                    nodeX: pos.x,
                    nodeY: pos.y,
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                  };
                  setDraggingId(ind.id);
                  // Prevent canvas pan from starting.
                  setIsDragging(false);
                }}
                onClick={(e) => {
                  // If a drag occurred (moved significantly), skip the click.
                  if (draggingId !== null) {
                    e.stopPropagation();
                    return;
                  }
                  e.stopPropagation();
                  onSelect(ind.id);
                }}
                onContextMenu={(e) => {
                  if (onNodeContextMenu === undefined) return;
                  e.preventDefault();
                  e.stopPropagation();
                  // Select the node on right-click so edit/delete act on the
                  // right target even if the user didn't left-click first.
                  onSelect(ind.id);
                  onNodeContextMenu(ind.id, { x: e.clientX, y: e.clientY });
                }}
                className={cn(
                  'flex flex-col items-center group bg-transparent border-none p-0 transition-opacity',
                  isDimmed && 'opacity-20',
                  draggingId === ind.id ? 'cursor-grabbing scale-105' : 'cursor-pointer',
                )}
                style={{ position: 'absolute', left: pos.x, top: pos.y }}
              >
                {/* Shape — no text inside, sex glyph overlay top-right. */}
                <div className="relative">
                  <div
                    className={cn(
                      'w-[52px] h-[52px] border-2 transition-transform group-hover:scale-[1.04] shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]',
                      shape === 'male' && 'bg-node-male-bg border-node-male-border',
                      shape === 'female' && 'bg-node-female-bg border-node-female-border rounded-full',
                      shape === 'unknown' &&
                        'bg-node-unknown-bg border-node-unknown-border [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]',
                      statusTone?.shell,
                      isSelected && 'ring-2 ring-brand/50 ring-offset-2 ring-offset-surface',
                      isRelationshipSource && !isSelected && 'ring-2 ring-brand/35 ring-offset-2 ring-offset-surface',
                      isMatch && !isSelected && 'ring-2 ring-brand/30 ring-offset-1 ring-offset-surface',
                      isInbred && !isSelected && 'ring-2 ring-indigo-300/60 ring-offset-1 ring-offset-surface',
                    )}
                  />
                  <span
                    className={cn(
                      'absolute -top-1 -right-1 h-[18px] w-[18px] rounded-full flex items-center justify-center text-[10px] font-bold bg-surface-raised border shadow-sm',
                      shape === 'male' && 'border-node-male-border text-node-male-border',
                      shape === 'female' && 'border-node-female-border text-node-female-border',
                      shape === 'unknown' && 'border-node-unknown-border text-node-unknown-border',
                    )}
                    aria-hidden="true"
                  >
                    {sexGlyph}
                  </span>
                  {isInbred && (
                    <span
                      className="absolute -bottom-1 -left-1 h-3.5 min-w-3.5 rounded-full bg-indigo-400 px-1 flex items-center justify-center text-[8px] text-white font-bold shadow-sm"
                      aria-label="Shared ancestry"
                      title="Shared ancestry detected"
                    >
                      i
                    </span>
                  )}
                  {missingFieldCount > 0 && (
                    <span
                      className="absolute -bottom-1.5 -right-1.5 h-4 min-w-4 rounded-full bg-amber-500 px-1 flex items-center justify-center text-[8px] text-white font-bold shadow-sm"
                      aria-label={`Missing ${missingFieldCount} key fields`}
                      title={`Missing ${missingFieldCount} key fields`}
                    >
                      !
                    </span>
                  )}
                  {/* COI badge — only show if individual has inbreeding */}
                  {(() => {
                    const coi = coiMap.get(ind.id);
                    if (!coi) return null;
                    const color = coi.risk === 'high' ? 'bg-red-500' : coi.risk === 'moderate' ? 'bg-amber-500' : 'bg-indigo-400';
                    return (
                      <span
                        className={`absolute -top-1 -left-1 ${color} text-white text-[8px] font-bold px-1 rounded-full shadow-sm`}
                        title={`COI: ${(coi.coefficient * 100).toFixed(1)}%`}
                      >
                        F:{(coi.coefficient * 100).toFixed(0)}%
                      </span>
                    );
                  })()}
                </div>
                {/* Primary label below the shape, truncated, full value in title tooltip. */}
                <span
                  className="mt-1.5 max-w-[92px] truncate text-[11px] font-semibold leading-tight text-text-primary"
                  aria-hidden="true"
                  title={display}
                >
                  {display}
                </span>
                {/* Secondary: id when it differs from the label, else group. */}
                {display !== ind.id && (
                  <span
                    className="max-w-[92px] truncate font-mono text-[10px] leading-tight text-text-secondary"
                    aria-hidden="true"
                    title={ind.id}
                  >
                    {ind.id}
                  </span>
                )}
                {ind.status !== undefined && (
                  <span className={cn(
                    'mt-1 max-w-[88px] truncate px-1.5 py-0.5 rounded-full text-[9px] font-semibold border',
                    statusTone?.badge ?? 'bg-surface-raised text-text-secondary border-border',
                  )}>
                    {ind.status}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Zoom toolbar — absolute within viewport, no fixed offsets. */}
      {interactionHint !== null && (
        <div className="absolute top-4 left-4 z-30 max-w-sm rounded-xl border border-brand/20 bg-surface-raised/95 px-4 py-3 shadow-xl backdrop-blur-md">
          <p className="text-xs font-medium leading-5 text-text-primary">{interactionHint}</p>
        </div>
      )}

      <div
        className="absolute bottom-4 left-20 flex gap-2 p-2 bg-surface-raised/92 backdrop-blur-md rounded border border-border shadow-xl z-30"
        role="toolbar"
        aria-label="Canvas zoom controls"
      >
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="panel-button p-2 rounded transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="w-[1px] bg-border" aria-hidden="true" />
        <span
          className="px-2 flex items-center justify-center font-mono text-xs min-w-[40px] text-text-secondary"
          aria-label={`Current zoom: ${Math.round(zoom * 100)} percent`}
        >
          {Math.round(zoom * 100)}%
        </span>
        <div className="w-[1px] bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="panel-button p-2 rounded transition-colors"
        >
          <Minus className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="w-[1px] bg-border ml-2" aria-hidden="true" />
        <button
          type="button"
          onClick={handleFit}
          aria-label="Fit to screen"
          className="panel-button p-2 rounded transition-colors"
        >
          <Focus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
  },
);
