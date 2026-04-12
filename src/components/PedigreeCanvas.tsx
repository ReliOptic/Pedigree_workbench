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
const NODE_SIZE = 56; // px; matches w-14 h-14
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
    { individuals, matings = [], selectedId, onSelect, onNodeContextMenu, onCanvasContextMenu, t, searchQuery, showNotesOnHover = true, generationFormat = 'F', nodePositions, onNodeDrag },
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

  // Expose view operations to the parent (for canvas context menu).
  useImperativeHandle(
    ref,
    () => ({
      fit: handleFit,
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
    }),
    [handleFit, handleZoomIn, handleZoomOut],
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
            <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-border shadow-sm" style={{ borderLeft: '2px solid var(--color-brand)' }}>
              <span className="font-mono text-base font-bold text-slate-700 dark:text-slate-300 tracking-wide">
                {t.generation}
              </span>
              <span className="font-mono text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-wide">
                {formatGeneration(gl.label, generationFormat)}
              </span>
            </div>
            <span className="h-[1px] w-16 bg-slate-300" />
          </div>
        ))}

        {/* Notes tooltip — rendered inside transform group so it pans/zooms with the canvas. */}
        {showNotesOnHover && hoveredId !== null && hoverPos !== null && (() => {
          const hoveredInd = individualsMap.get(hoveredId);
          const notes = hoveredInd?.notes;
          if (notes === undefined || notes.trim().length === 0) return null;
          const truncated = notes.length > 200 ? `${notes.slice(0, 200)}...` : notes;
          return (
            <div
              className="absolute z-50 max-w-64 bg-slate-800 text-white text-xs rounded shadow-lg p-2 pointer-events-none whitespace-pre-wrap break-words"
              style={{
                left: hoverPos.x + NODE_SIZE / 2,
                top: hoverPos.y - 60,
                transform: 'translateX(-50%)',
              }}
              aria-hidden="true"
            >
              {truncated}
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
            const isMatch = isSearching && matchingIds.has(ind.id);
            const isDimmed = isSearching && !matchingIds.has(ind.id);
            const isRoving = rovingId === ind.id;
            const isInbred = inbredIds.has(ind.id);
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
                title={ind.id}
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
                  isDimmed && 'opacity-30',
                  draggingId === ind.id ? 'cursor-grabbing scale-105' : 'cursor-grab',
                )}
                style={{ position: 'absolute', left: pos.x, top: pos.y }}
              >
                {/* Shape — no text inside, sex glyph overlay top-right. */}
                <div className="relative">
                  <div
                    className={cn(
                      'w-14 h-14 border-2 transition-transform group-hover:scale-110 shadow-sm',
                      shape === 'male' && 'bg-node-male-bg border-node-male-border',
                      shape === 'female' && 'bg-node-female-bg border-node-female-border rounded-full',
                      shape === 'unknown' &&
                        'bg-node-unknown-bg border-node-unknown-border [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]',
                      isSelected && 'ring-4 ring-yellow-400 ring-offset-2',
                      isMatch && !isSelected && 'ring-2 ring-yellow-500/70',
                      isInbred && !isSelected && 'ring-2 ring-indigo-400 ring-offset-1',
                    )}
                  />
                  <span
                    className={cn(
                      'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-white border shadow-sm',
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
                      className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-indigo-400 flex items-center justify-center text-[9px] text-white font-bold shadow-sm"
                      aria-label="Shared ancestry"
                      title="Shared ancestry detected"
                    >
                      i
                    </span>
                  )}
                  {/* COI badge — only show if individual has inbreeding */}
                  {(() => {
                    const coi = coiMap.get(ind.id);
                    if (!coi) return null;
                    const color = coi.risk === 'high' ? 'bg-red-500' : coi.risk === 'moderate' ? 'bg-amber-500' : 'bg-indigo-400';
                    return (
                      <span
                        className={`absolute -top-1 -left-1 ${color} text-white text-[9px] font-bold px-1 rounded-full`}
                        title={`COI: ${(coi.coefficient * 100).toFixed(1)}%`}
                      >
                        F:{(coi.coefficient * 100).toFixed(0)}%
                      </span>
                    );
                  })()}
                </div>
                {/* Primary label below the shape, truncated, full value in title tooltip. */}
                <span
                  className="mt-2 max-w-[96px] truncate text-xs font-semibold text-text-primary"
                  aria-hidden="true"
                >
                  {display}
                </span>
                {/* Secondary: id when it differs from the label, else group. */}
                {display !== ind.id && (
                  <span
                    className="max-w-[96px] truncate font-mono text-[11px] text-text-secondary"
                    aria-hidden="true"
                  >
                    {ind.id}
                  </span>
                )}
                {ind.status !== undefined && (
                  <span className={cn(
                    'mt-0.5 px-1.5 py-0 rounded-full text-[10px] font-bold border',
                    ind.status === '\uD3D0\uC0AC' && 'bg-red-50 text-red-700 border-red-300',
                    ind.status === '\uAD50\uBC30\uC608\uC815\uB3C8' && 'bg-green-50 text-green-700 border-green-300',
                    ind.status !== '\uD3D0\uC0AC' && ind.status !== '\uAD50\uBC30\uC608\uC815\uB3C8' && 'bg-slate-50 text-slate-600 border-slate-300',
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
      <div
        className="absolute bottom-4 left-20 flex gap-2 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded border border-border shadow-xl z-30"
        role="toolbar"
        aria-label="Canvas zoom controls"
      >
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="w-[1px] bg-slate-200" aria-hidden="true" />
        <span
          className="px-2 flex items-center justify-center font-mono text-xs min-w-[40px] text-slate-700"
          aria-label={`Current zoom: ${Math.round(zoom * 100)} percent`}
        >
          {Math.round(zoom * 100)}%
        </span>
        <div className="w-[1px] bg-slate-200" aria-hidden="true" />
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
        >
          <Minus className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="w-[1px] bg-slate-200 ml-2" aria-hidden="true" />
        <button
          type="button"
          onClick={handleFit}
          aria-label="Fit to screen"
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
        >
          <Focus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
  },
);
