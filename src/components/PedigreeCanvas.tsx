import { useMemo, useRef, useState } from 'react';
import { Plus, Minus, Focus } from 'lucide-react';
import { motion } from 'motion/react';

import { computeLayout } from '../services/pedigree-layout';
import { cn } from '../lib/utils';
import type { Individual } from '../types/pedigree.types';
import type { Translation } from '../types/translation.types';

interface PedigreeCanvasProps {
  readonly individuals: readonly Individual[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
  readonly t: Translation;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;

type SexShape = 'male' | 'female' | 'unknown';

/**
 * Maps a free-form `sex` column value onto one of the three PRD shapes.
 * "수컷"/"M" → square, "암컷"/"F" → circle, everything else → diamond.
 */
function classifySex(value: string | undefined): SexShape {
  if (value === undefined) return 'unknown';
  const normalized = value.trim().toLowerCase();
  if (normalized === '수컷' || normalized === 'm' || normalized === 'male') return 'male';
  if (normalized === '암컷' || normalized === 'f' || normalized === 'female') return 'female';
  return 'unknown';
}

/**
 * Pan/zoom canvas for the pedigree graph.
 *
 * Layout math is delegated to {@link computeLayout}; this component is
 * responsible only for view transforms (pan/zoom) and SVG/DOM rendering.
 */
export function PedigreeCanvas({
  individuals,
  selectedId,
  onSelect,
  t,
}: PedigreeCanvasProps): React.JSX.Element {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => computeLayout(individuals), [individuals]);
  const positionById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of layout.nodes) map.set(node.id, { x: node.x, y: node.y });
    return map;
  }, [layout.nodes]);

  const handleMouseDown = (e: React.MouseEvent): void => {
    if (e.button === 0) setIsDragging(true);
  };
  const handleMouseMove = (e: React.MouseEvent): void => {
    if (!isDragging) return;
    setOffset((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
  };
  const handleMouseUp = (): void => setIsDragging(false);

  const handleZoomIn = (): void => setZoom((z) => Math.min(z + 0.1, ZOOM_MAX));
  const handleZoomOut = (): void => setZoom((z) => Math.max(z - 0.1, ZOOM_MIN));
  const handleReset = (): void => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      data-testid="pedigree-canvas"
      className="flex-1 overflow-hidden bg-slate-50 relative cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      ref={canvasRef}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle, #003b5a 1px, transparent 1px)`,
          backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`,
        }}
      />

      <div className="fixed left-0 top-16 bottom-8 w-16 bg-slate-100 dark:bg-slate-900 flex flex-col items-center py-12 gap-[200px] border-r border-slate-200 dark:border-slate-800 z-10">
        {layout.generations.map((gen) => (
          <span
            key={gen}
            className="font-mono text-[10px] tracking-widest text-slate-400 -rotate-90 origin-center whitespace-nowrap"
          >
            {t.generation} {gen}
          </span>
        ))}
      </div>

      <div
        className="absolute transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <svg className="absolute pointer-events-none" width="5000" height="5000">
          <g stroke="#94a3b8" strokeWidth="1.5" fill="none">
            {layout.connectors.map((c) => (
              <g key={`link-${c.childId}`}>
                <path d={c.marriageD} strokeDasharray="4 4" />
                <path d={c.dropD} />
              </g>
            ))}
          </g>
        </svg>

        <div className="relative p-24">
          {individuals.map((ind) => {
            const pos = positionById.get(ind.id);
            if (pos === undefined) return null;
            const shape = classifySex(ind.sex);
            const display = ind.label ?? ind.id;
            return (
              <motion.button
                key={ind.id}
                type="button"
                layoutId={ind.id}
                data-testid={`pedigree-node-${ind.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(ind.id);
                }}
                className="flex flex-col items-center gap-2 cursor-pointer group bg-transparent border-none p-0"
                style={{ position: 'absolute', left: pos.x, top: pos.y }}
              >
                <div
                  className={cn(
                    'w-12 h-12 border-2 flex items-center justify-center transition-all group-hover:scale-110',
                    shape === 'male' && 'bg-blue-100 border-blue-600',
                    shape === 'female' && 'bg-pink-100 border-pink-600 rounded-full',
                    shape === 'unknown' &&
                      'bg-slate-100 border-slate-600 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]',
                    selectedId === ind.id && 'ring-4 ring-yellow-400 ring-offset-2',
                  )}
                >
                  <span
                    className={cn(
                      'font-mono text-[10px] font-bold',
                      shape === 'male' && 'text-blue-900',
                      shape === 'female' && 'text-pink-900',
                      shape === 'unknown' && 'text-slate-900',
                    )}
                  >
                    {display}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">{ind.id}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-12 left-20 flex gap-2 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded border border-slate-200 dark:border-slate-800 shadow-xl z-30">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-[1px] bg-slate-200 dark:bg-slate-800" />
        <button
          type="button"
          className="px-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors font-mono text-xs min-w-[40px]"
        >
          {Math.round(zoom * 100)}%
        </button>
        <div className="w-[1px] bg-slate-200 dark:bg-slate-800" />
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="w-[1px] bg-slate-200 dark:bg-slate-800 ml-2" />
        <button
          type="button"
          onClick={handleReset}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
        >
          <Focus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
