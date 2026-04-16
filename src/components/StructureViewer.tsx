import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Download, RefreshCw, RotateCcw, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { cleanDna, findLongestOrf } from '../services/sequence-utils';
import type { OrfResult } from '../services/sequence-utils';
import type { FoldResult } from '../services/esmfold-api';
import type { Translation } from '../types/translation.types';

// ── Modal (DNA-pipeline) variant ────────────────────────────────────────────

interface StructureViewerProps {
  readonly isOpen: boolean;
  readonly dnaSequence: string;
  readonly onClose: () => void;
  readonly t: Translation;
}

type Stage = 'translating' | 'folding' | 'rendering' | 'done' | 'error';

export function StructureViewer({
  isOpen,
  dnaSequence,
  onClose,
  t,
}: StructureViewerProps): React.JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const [stage, setStage] = useState<Stage>('translating');
  const [error, setError] = useState<string | null>(null);
  const [orf, setOrf] = useState<OrfResult | null>(null);
  const [pdbData, setPdbData] = useState<string | null>(null);

  const runPipeline = useCallback(async () => {
    setStage('translating');
    setError(null);
    setPdbData(null);
    setOrf(null);

    try {
      // Step 1: translate DNA → protein
      const cleaned = cleanDna(dnaSequence);
      const found = findLongestOrf(cleaned);
      if (found === null || found.protein.length === 0) {
        throw new Error('Could not find a translatable protein in this DNA sequence.');
      }
      setOrf(found);

      // Step 2: fold protein via ESMFold
      setStage('folding');
      const { foldProtein } = await import('../services/esmfold-api');
      const result: FoldResult = await foldProtein(found.protein);
      setPdbData(result.pdbData);

      // Step 3: render in 3Dmol
      setStage('rendering');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unknown error during structure prediction.');
      setStage('error');
    }
  }, [dnaSequence]);

  // Trigger pipeline when modal opens.
  useEffect(() => {
    if (isOpen) {
      void runPipeline();
    }
    return () => {
      viewerRef.current = null;
    };
  }, [isOpen, runPipeline]);

  // Render PDB data with 3Dmol once available.
  useEffect(() => {
    if (stage !== 'rendering' || pdbData === null || containerRef.current === null) return;

    let cancelled = false;

    void (async () => {
      try {
        const $3Dmol = await import('3dmol');
        if (cancelled || containerRef.current === null) return;

        // Clear previous viewer content.
        containerRef.current.innerHTML = '';

        const viewer = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: '#1e1e2e',
        });
        viewer.addModel(pdbData, 'pdb');
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
        viewer.zoomTo();
        viewer.render();
        viewerRef.current = viewer;
        setStage('done');
      } catch (cause) {
        if (!cancelled) {
          setError('Failed to initialize 3D viewer.');
          setStage('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stage, pdbData]);

  // Escape key handler.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleDownloadPdb = (): void => {
    if (pdbData === null) return;
    const blob = new Blob([pdbData], { type: 'chemical/x-pdb' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'predicted_structure.pdb';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const isLoading = stage === 'translating' || stage === 'folding' || stage === 'rendering';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={t.predictStructure}
          className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] h-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">{t.predictStructure}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-slate-400 hover:text-brand transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 3D Viewer area */}
            <div className="flex-1 relative bg-[#1e1e2e]">
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">
                    {stage === 'translating' && t.translatingDna}
                    {stage === 'folding' && t.foldingProtein}
                    {stage === 'rendering' && t.foldingProtein}
                  </p>
                </div>
              )}

              {stage === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                  <p className="text-sm font-medium text-red-400">{t.structureError}</p>
                  <p className="text-xs text-slate-400 text-center max-w-md">{error}</p>
                  <button
                    type="button"
                    onClick={() => void runPipeline()}
                    className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium bg-indigo-600 text-white rounded hover:brightness-110 transition"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    {t.retryFold}
                  </button>
                </div>
              )}

              <div
                ref={containerRef}
                className="w-full h-full min-h-[400px]"
                style={{ display: stage === 'done' ? 'block' : 'none' }}
              />

              {/* Controls hint */}
              {stage === 'done' && (
                <div className="absolute bottom-3 right-3 flex gap-2 text-[10px] text-slate-400 bg-black/40 rounded px-2 py-1 pointer-events-none select-none">
                  <span className="inline-flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" aria-hidden="true" /> Drag to rotate
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ZoomIn className="w-3 h-3" aria-hidden="true" /> Scroll to zoom
                  </span>
                </div>
              )}
            </div>

            {/* Metadata footer */}
            {orf !== null && (
              <div className="px-5 py-3 border-t border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <span>
                    <span className="font-medium">{t.proteinLength}:</span>{' '}
                    {orf.protein.length} {t.residues}
                  </span>
                  <span>
                    <span className="font-medium">{t.readingFrame}:</span> +{orf.frame}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-400 truncate max-w-full">
                  {orf.protein.length > 80
                    ? orf.protein.substring(0, 80) + '...'
                    : orf.protein}
                </div>
                {pdbData !== null && (
                  <button
                    type="button"
                    onClick={handleDownloadPdb}
                    className="inline-flex items-center gap-1.5 px-2 h-7 text-xs font-medium text-slate-700 border border-slate-200 rounded hover:bg-slate-100 transition"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    {t.downloadPdb}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Inline viewer — accepts PDB data directly (for inspector panel) ──────────

interface InlineStructureViewerProps {
  /** Pre-fetched PDB file content as a string */
  readonly pdbData: string;
  /** Display label (individual ID, sequence preview, etc.) */
  readonly label?: string;
  /** Container height in px (default 300) */
  readonly height?: number;
}

/**
 * Renders an already-fetched PDB structure inline.
 * Used by NodeInspector after the ESMFold prediction is cached.
 */
export function InlineStructureViewer({
  pdbData,
  label,
  height = 300,
}: InlineStructureViewerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const [ready, setReady] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current === null) return;
    let cancelled = false;

    const initViewer = async (): Promise<void> => {
      // Wait for the container to have non-zero dimensions before initializing.
      // 3Dmol needs a mounted element with explicit width/height.
      const el = containerRef.current;
      if (el === null) return;

      if (el.offsetWidth === 0 || el.offsetHeight === 0) {
        // Retry after a short delay to allow layout to complete.
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        if (cancelled) return;
      }

      // Second check after delay — if still 0, bail out with helpful message.
      if (el.offsetWidth === 0 || el.offsetHeight === 0) {
        if (!cancelled) {
          setViewerError('3D viewer container has no dimensions. Try resizing the panel.');
        }
        return;
      }

      try {
        const $3Dmol = await import('3dmol');
        if (cancelled || containerRef.current === null) return;

        containerRef.current.innerHTML = '';

        const viewer = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: '#1e1e2e',
        });
        viewer.addModel(pdbData, 'pdb');
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
        viewer.zoomTo();
        viewer.render();
        viewerRef.current = viewer;
        setReady(true);
      } catch (cause) {
        if (!cancelled) {
          const msg = cause instanceof Error ? cause.message : String(cause);
          setViewerError(`Failed to initialize 3D viewer: ${msg || 'unknown error'}. Try refreshing.`);
        }
      }
    };

    // Use requestAnimationFrame to ensure the DOM has been painted before init.
    const rafId = requestAnimationFrame(() => {
      void initViewer();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [pdbData]);

  const handleDownloadPdb = (): void => {
    const blob = new Blob([pdbData], { type: 'chemical/x-pdb' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label ?? 'structure'}.pdb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Viewer container */}
      <div
        className="relative w-full bg-[#1e1e2e]"
        style={{ height }}
      >
        {!ready && viewerError === null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
          </div>
        )}
        {viewerError !== null && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="text-xs text-red-400 text-center">{viewerError}</p>
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ display: ready ? 'block' : 'none' }}
        />
        {/* Controls hint overlay */}
        {ready && (
          <div className="absolute bottom-2 right-2 flex gap-2 text-[10px] text-slate-400 bg-black/40 rounded px-2 py-0.5 pointer-events-none select-none">
            <span className="inline-flex items-center gap-1">
              <RotateCcw className="w-3 h-3" aria-hidden="true" /> Drag to rotate
            </span>
            <span className="inline-flex items-center gap-1">
              <ZoomIn className="w-3 h-3" aria-hidden="true" /> Scroll to zoom
            </span>
          </div>
        )}
      </div>
      {/* Footer bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-raised border-t border-border">
        {label !== undefined && (
          <span className="font-mono text-[11px] text-text-muted truncate">{label}</span>
        )}
        <button
          type="button"
          onClick={handleDownloadPdb}
          className="ml-auto inline-flex items-center gap-1 px-2 h-6 text-[11px] text-text-secondary border border-border rounded hover:bg-surface transition"
        >
          <Download className="w-3 h-3" aria-hidden="true" />
          PDB
        </button>
      </div>
    </div>
  );
}
