import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, Focus } from 'lucide-react';
import { Individual } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface PedigreeCanvasProps {
  individuals: Individual[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  t: any;
}

export function PedigreeCanvas({ individuals, selectedId, onSelect, t }: PedigreeCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Simple layout logic: group by generation
  const generations = Array.from(new Set(individuals.map(i => i.generation))).sort();
  
  const NODE_WIDTH = 40;
  const NODE_HEIGHT = 40;
  const HORIZONTAL_GAP = 80;
  const VERTICAL_GAP = 200;

  return (
    <div 
      className="flex-1 overflow-hidden bg-slate-50 relative cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      ref={canvasRef}
    >
      {/* Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle, #003b5a 1px, transparent 1px)`,
          backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`
        }}
      />

      {/* Generation Labels */}
      <div className="fixed left-0 top-16 bottom-8 w-16 bg-slate-100 dark:bg-slate-900 flex flex-col items-center py-12 gap-[200px] border-r border-slate-200 dark:border-slate-800 z-10">
        {generations.map(gen => (
          <span key={gen} className="font-mono text-[10px] tracking-widest text-slate-400 -rotate-90 origin-center whitespace-nowrap">
            {t.generation} {gen}
          </span>
        ))}
      </div>

      {/* Canvas Content */}
      <div 
        className="absolute transition-transform duration-75 ease-out"
        style={{ 
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        <svg className="absolute pointer-events-none" width="5000" height="5000">
          <g stroke="#94a3b8" strokeWidth="1.5" fill="none">
            {individuals.map(ind => {
              if (ind.sireId || ind.damId) {
                const sire = individuals.find(i => i.id === ind.sireId);
                const dam = individuals.find(i => i.id === ind.damId);
                
                // This is a very simplified connector logic
                // In a real app, we'd need a more robust layout engine
                if (sire && dam) {
                  const sireX = individuals.indexOf(sire) * HORIZONTAL_GAP + 100;
                  const sireY = (sire.generation - 1) * VERTICAL_GAP + 100;
                  const damX = individuals.indexOf(dam) * HORIZONTAL_GAP + 100;
                  const damY = (dam.generation - 1) * VERTICAL_GAP + 100;
                  const indX = individuals.indexOf(ind) * HORIZONTAL_GAP + 100;
                  const indY = (ind.generation - 1) * VERTICAL_GAP + 100;

                  return (
                    <g key={`link-${ind.id}`}>
                      <path d={`M ${sireX + 20} ${sireY + 40} L ${sireX + 20} ${sireY + 60} L ${damX + 20} ${damY + 60} L ${damX + 20} ${damY + 40}`} strokeDasharray="4 4" />
                      <path d={`M ${(sireX + damX) / 2 + 20} ${sireY + 60} L ${(sireX + damX) / 2 + 20} ${indY - 20} L ${indX + 20} ${indY - 20} L ${indX + 20} ${indY}`} />
                    </g>
                  );
                }
              }
              return null;
            })}
          </g>
        </svg>

        <div className="relative p-24 flex flex-wrap gap-x-20 gap-y-40">
          {individuals.map((ind, idx) => (
            <motion.div 
              key={ind.id}
              layoutId={ind.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(ind.id);
              }}
              className="flex flex-col items-center gap-2 cursor-pointer group"
              style={{
                position: 'absolute',
                left: idx * HORIZONTAL_GAP + 100,
                top: (ind.generation - 1) * VERTICAL_GAP + 100
              }}
            >
              <div className={cn(
                "w-10 h-10 border-2 flex items-center justify-center transition-all group-hover:scale-110",
                ind.gender === 'male' ? "bg-blue-100 border-blue-600" : 
                ind.gender === 'female' ? "bg-pink-100 border-pink-600 rounded-full" : 
                "bg-slate-100 border-slate-600 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]",
                selectedId === ind.id && "ring-4 ring-yellow-400 ring-offset-2",
                !ind.label && "opacity-40"
              )}>
                {ind.label && (
                  <span className={cn(
                    "font-mono text-[10px] font-bold",
                    ind.gender === 'male' ? "text-blue-900" : 
                    ind.gender === 'female' ? "text-pink-900" : 
                    "text-slate-900"
                  )}>
                    {ind.label}
                  </span>
                )}
              </div>
              {ind.label && <span className="font-mono text-[10px] text-slate-500">{ind.id}</span>}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Floating Controls */}
      <div className="fixed bottom-12 left-20 flex gap-2 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded border border-slate-200 dark:border-slate-800 shadow-xl z-30">
        <button onClick={handleZoomIn} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-[1px] bg-slate-200 dark:bg-slate-800"></div>
        <button className="px-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors font-mono text-xs min-w-[40px]">
          {Math.round(zoom * 100)}%
        </button>
        <div className="w-[1px] bg-slate-200 dark:bg-slate-800"></div>
        <button onClick={handleZoomOut} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
          <Minus className="w-4 h-4" />
        </button>
        <div className="w-[1px] bg-slate-200 dark:bg-slate-800 ml-2"></div>
        <button onClick={handleReset} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
          <Focus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
