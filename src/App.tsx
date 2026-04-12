import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  Users,
  UserPlus,
  Copy as CopyIcon,
  Focus,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { AddNodeModal } from './components/AddNodeModal';
import { SettingsModal } from './components/SettingsModal';
import { ContextMenu, type MenuEntry } from './components/ContextMenu';
import { Footer } from './components/Footer';
import { ImportModal } from './components/ImportModal';
import { toCsv, downloadFile } from './services/pedigree-export';
import { NodeInspector } from './components/NodeInspector';
import { ShortcutOverlay } from './components/ShortcutOverlay';
import { PaperView } from './components/PaperView';
import {
  PedigreeCanvas,
  type PedigreeCanvasHandle,
} from './components/PedigreeCanvas';
import { TopBar } from './components/TopBar';
import { usePedigree } from './hooks/use-pedigree';
import { useUndo } from './hooks/use-undo';
import { useSettings } from './hooks/use-settings';
import { summarize } from './services/pedigree-layout';
import { TRANSLATIONS } from './translations';
import type { Individual } from './types/pedigree.types';

type CtxMenu =
  | { readonly kind: 'node'; readonly id: string; readonly x: number; readonly y: number }
  | { readonly kind: 'canvas'; readonly x: number; readonly y: number };

/**
 * Best-effort "next generation" calculator for pre-filling Add Child.
 * Parses a numeric suffix (e.g. "F0" → 0) and increments. Unrecognized
 * formats fall back to the original label so the user can edit freely.
 */
function nextGeneration(current: string | undefined): string | undefined {
  if (current === undefined) return undefined;
  const match = current.match(/^(\D*)(-?\d+)$/);
  if (match === null) return current;
  const prefix = match[1] ?? '';
  const n = Number.parseInt(match[2] ?? '0', 10);
  return `${prefix}${n + 1}`;
}

/**
 * Best-effort "previous generation" calculator for pre-filling Add Parent.
 * Parses a numeric suffix (e.g. "F1" → 1) and decrements. Unrecognized
 * formats fall back to the original label so the user can edit freely.
 */
function prevGeneration(current: string | undefined): string | undefined {
  if (current === undefined) return undefined;
  const match = current.match(/^(\D*)(-?\d+)$/);
  if (match === null) return current;
  const prefix = match[1] ?? '';
  const n = Number.parseInt(match[2] ?? '0', 10);
  return `${prefix}${n - 1}`;
}

/**
 * Build an AddNodeModal prefill representing "add parent of this individual".
 * Pre-fills generation to the previous generation. Sire/dam are left empty
 * because the new parent's parents are unknown.
 */
function buildAddParentPrefill(target: Individual): Partial<Individual> {
  return {
    generation: prevGeneration(target.generation),
    ...(target.group !== undefined ? { group: target.group } : {}),
  };
}

/**
 * Build an AddNodeModal prefill representing "add child of this individual".
 * Uses sex to pick sire vs dam slot when possible.
 */
function buildAddChildPrefill(parent: Individual): Partial<Individual> {
  const sexLower = (parent.sex ?? '').trim().toLowerCase();
  const isMale = sexLower === '수컷' || sexLower === 'm' || sexLower === 'male';
  const isFemale = sexLower === '암컷' || sexLower === 'f' || sexLower === 'female';
  return {
    ...(isMale ? { sire: parent.id } : {}),
    ...(isFemale ? { dam: parent.id } : {}),
    generation: nextGeneration(parent.generation),
    ...(parent.group !== undefined ? { group: parent.group } : {}),
  };
}

/** Build "add sibling of this" — same parents and generation. */
function buildAddSiblingPrefill(target: Individual): Partial<Individual> {
  return {
    ...(target.sire !== undefined ? { sire: target.sire } : {}),
    ...(target.dam !== undefined ? { dam: target.dam } : {}),
    ...(target.generation !== undefined ? { generation: target.generation } : {}),
    ...(target.group !== undefined ? { group: target.group } : {}),
  };
}

/**
 * Application shell. Composes the persistence hooks with presentational
 * components — no business logic lives here. The shell intentionally has no
 * knowledge of IndexedDB or import parsing; it only orchestrates state.
 *
 * Layout: a 3-row CSS grid (header / main / footer). No fixed positioning,
 * so components never need to know each other's height. The inspector is an
 * in-flow sibling of the canvas and collapses out of flow when null.
 */
export default function App(): React.JSX.Element {
  const { individuals, isLoading, error, refresh, replaceAll, updateOne, deleteOne, addOne } = usePedigree();
  const { language, setLanguage, activeNav, setActiveNav, selectedId, setSelectedId, theme, setTheme } = useSettings();

  // Stable ref so undo/redo can read current individuals without stale closures.
  const individualsRef = useRef<readonly Individual[]>(individuals);
  individualsRef.current = individuals;
  const getIndividuals = useCallback(() => individualsRef.current, []);

  const { canUndo, canRedo, undo, redo, pushSnapshot } = useUndo(replaceAll, getIndividuals);

  // Tracked mutations that push a snapshot before modifying state.
  const trackedAddOne = useCallback(
    async (ind: Individual) => {
      pushSnapshot(individuals);
      await addOne(ind);
    },
    [pushSnapshot, individuals, addOne],
  );
  const trackedUpdateOne = useCallback(
    async (id: string, patch: Partial<Individual>) => {
      pushSnapshot(individuals);
      await updateOne(id, patch);
    },
    [pushSnapshot, individuals, updateOne],
  );
  const trackedDeleteOne = useCallback(
    async (id: string) => {
      pushSnapshot(individuals);
      await deleteOne(id);
    },
    [pushSnapshot, individuals, deleteOne],
  );
  const activeView = (activeNav === 'paper' ? 'paper' : 'workbench') as 'workbench' | 'paper';
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [addNodePrefill, setAddNodePrefill] = useState<Partial<Individual> | undefined>(undefined);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [addParentTarget, setAddParentTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isShortcutOpen, setIsShortcutOpen] = useState<boolean>(false);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<PedigreeCanvasHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[language];
  const summary = useMemo(() => summarize(individuals), [individuals]);
  const selected = useMemo(
    () => individuals.find((i) => i.id === selectedId) ?? null,
    [individuals, selectedId],
  );

  // Search match count.
  const matchCount = useMemo(() => {
    if (searchQuery.length === 0) return 0;
    const q = searchQuery.toLowerCase();
    return individuals.filter((ind) => {
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
      return haystack.some((v) => v !== undefined && v.toLowerCase().includes(q));
    }).length;
  }, [individuals, searchQuery]);

  // Global keyboard shortcuts for search and undo/redo.
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+Z → undo (skip if inside input/textarea).
    if (
      e.key === 'z' &&
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
      void undo();
      return;
    }
    // Ctrl+Shift+Z or Ctrl+Y → redo (skip if inside input/textarea).
    if (
      ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'y' && (e.ctrlKey || e.metaKey))) &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
      void redo();
      return;
    }
    // "?" toggles keyboard shortcuts overlay — skip if inside input/textarea.
    if (
      e.key === '?' &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
      setIsShortcutOpen((prev) => !prev);
      return;
    }
    // "/" focuses search (like GitHub/Slack) — skip if already in an input/textarea.
    if (
      e.key === '/' &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }
    // Escape inside the search input clears query and blurs.
    if (e.key === 'Escape' && e.target === searchInputRef.current) {
      e.preventDefault();
      setSearchQuery('');
      searchInputRef.current?.blur();
    }
  }, [undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Apply dark mode class to <html> based on theme preference.
  useEffect(() => {
    const apply = (prefersDark: boolean): void => {
      const shouldBeDark =
        theme === 'dark' || (theme === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
    };

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    apply(mq.matches);

    if (theme === 'system') {
      const handler = (e: MediaQueryListEvent): void => apply(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    return undefined;
  }, [theme]);

  // Return focus to the Upload button after the modal closes.
  const prevOpenRef = useRef<boolean>(false);
  useEffect(() => {
    if (prevOpenRef.current && !isImportOpen) {
      uploadButtonRef.current?.focus();
    }
    prevOpenRef.current = isImportOpen;
  }, [isImportOpen]);

  return (
    <div className="bg-surface text-text-primary font-sans h-dvh grid grid-rows-[auto_1fr_auto] overflow-hidden">
      <TopBar
        uploadButtonRef={uploadButtonRef}
        onUploadClick={() => setIsImportOpen(true)}
        onExportClick={() => {
          const csv = toCsv(individuals);
          const date = new Date().toISOString().slice(0, 10);
          downloadFile(csv, `pedigree-export-${date}.csv`, 'text/csv');
        }}
        onAddNodeClick={() => setIsAddNodeOpen(true)}
        language={language}
        setLanguage={setLanguage}
        t={t}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchInputRef={searchInputRef}
        matchCount={matchCount}
        totalCount={individuals.length}
        activeView={activeView}
        setActiveView={setActiveNav}
        onSettingsClick={() => setIsSettingsOpen(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
      />

      <main className="grid grid-cols-[1fr_auto] min-h-0 overflow-hidden relative">
        {activeView === 'paper' ? (
          <PaperView individuals={individuals} t={t} />
        ) : isLoading ? (
          <LoadingState />
        ) : error !== null ? (
          <ErrorState message={error} onRetry={() => void refresh()} />
        ) : individuals.length === 0 ? (
          <EmptyState
            onImportClick={() => setIsImportOpen(true)}
            onAddNodeClick={() => setIsAddNodeOpen(true)}
            t={t}
          />
        ) : (
          <PedigreeCanvas
            ref={canvasRef}
            individuals={individuals}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNodeContextMenu={(id, pos) => setCtxMenu({ kind: 'node', id, x: pos.x, y: pos.y })}
            onCanvasContextMenu={(pos) => setCtxMenu({ kind: 'canvas', x: pos.x, y: pos.y })}
            t={t}
            searchQuery={searchQuery}
          />
        )}

        {activeView === 'workbench' && (
          <NodeInspector
            individual={selected}
            allIndividuals={individuals}
            onClose={() => setSelectedId(null)}
            onUpdate={trackedUpdateOne}
            onDelete={trackedDeleteOne}
            t={t}
          />
        )}
      </main>

      <Footer t={t} summary={summary} />

      {/* Live region announcing selection changes to assistive tech. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {selected !== null ? `${selected.id} selected` : ''}
      </div>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={() => {
          pushSnapshot(individuals);
          setIsImportOpen(false);
          void refresh();
        }}
        t={t}
      />

      <AddNodeModal
        isOpen={isAddNodeOpen}
        allIndividuals={individuals}
        prefill={addNodePrefill}
        onClose={() => {
          setIsAddNodeOpen(false);
          setAddNodePrefill(undefined);
          setAddParentTarget(null);
        }}
        onAdd={trackedAddOne}
        onAdded={(id, individual) => {
          if (addParentTarget !== null) {
            const sexLower = (individual.sex ?? '').trim().toLowerCase();
            const isFemale = sexLower === '암컷' || sexLower === 'f' || sexLower === 'female';
            const field = isFemale ? 'dam' : 'sire';
            void trackedUpdateOne(addParentTarget, { [field]: id });
            setAddParentTarget(null);
          }
          setSelectedId(id);
        }}
        t={t}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
        t={t}
      />

      <ShortcutOverlay
        isOpen={isShortcutOpen}
        onClose={() => setIsShortcutOpen(false)}
        t={t}
      />

      <ContextMenu
        open={ctxMenu !== null}
        position={ctxMenu === null ? null : { x: ctxMenu.x, y: ctxMenu.y }}
        onClose={() => setCtxMenu(null)}
        ariaLabel={ctxMenu?.kind === 'node' ? 'Node actions' : 'Canvas actions'}
        items={
          ctxMenu === null
            ? []
            : ctxMenu.kind === 'node'
              ? buildNodeMenu({
                  target:
                    individuals.find((i) => i.id === ctxMenu.id) ?? {
                      id: ctxMenu.id,
                      fields: {},
                    },
                  onEdit: () => setSelectedId(ctxMenu.id),
                  onAddChild: (prefill) => {
                    setAddNodePrefill(prefill);
                    setIsAddNodeOpen(true);
                  },
                  onAddSibling: (prefill) => {
                    setAddNodePrefill(prefill);
                    setIsAddNodeOpen(true);
                  },
                  onAddParent: (prefill) => {
                    setAddParentTarget(ctxMenu.id);
                    setAddNodePrefill(prefill);
                    setIsAddNodeOpen(true);
                  },
                  onCopyId: () => {
                    void navigator.clipboard?.writeText(ctxMenu.id).catch(() => {});
                  },
                  onDelete: async () => {
                    // Direct delete on context-menu action — the node is already
                    // selected by the right-click handler.
                    try {
                      await trackedDeleteOne(ctxMenu.id);
                      if (selectedId === ctxMenu.id) setSelectedId(null);
                    } catch {
                      // Errors are surfaced in the inspector the next time it opens.
                    }
                  },
                })
              : buildCanvasMenu({
                  onAddNode: () => {
                    setAddNodePrefill(undefined);
                    setIsAddNodeOpen(true);
                  },
                  onFit: () => canvasRef.current?.fit(),
                  onZoomIn: () => canvasRef.current?.zoomIn(),
                  onZoomOut: () => canvasRef.current?.zoomOut(),
                })
        }
      />
    </div>
  );
}

/**
 * Node right-click menu — informed by GenoPro, Progeny, and Cyrillic's
 * established conventions. Kept flat (no submenus) to match the current
 * {@link ContextMenu} primitive. Add-relative items carry a short prefill
 * hint in the shortcut column so users see which relation they're making.
 */
function buildNodeMenu(args: {
  readonly target: Individual;
  readonly onEdit: () => void;
  readonly onAddChild: (prefill: Partial<Individual>) => void;
  readonly onAddSibling: (prefill: Partial<Individual>) => void;
  readonly onAddParent: (prefill: Partial<Individual>) => void;
  readonly onCopyId: () => void;
  readonly onDelete: () => void;
}): readonly MenuEntry[] {
  return [
    {
      kind: 'item',
      id: 'edit',
      label: 'Edit',
      icon: Pencil,
      shortcut: 'E',
      onSelect: args.onEdit,
    },
    { kind: 'separator', id: 'sep-edit' },
    {
      kind: 'item',
      id: 'add-child',
      label: 'Add child',
      icon: Plus,
      shortcut: 'C',
      onSelect: () => args.onAddChild(buildAddChildPrefill(args.target)),
    },
    {
      kind: 'item',
      id: 'add-sibling',
      label: 'Add sibling',
      icon: Users,
      shortcut: 'S',
      onSelect: () => args.onAddSibling(buildAddSiblingPrefill(args.target)),
    },
    {
      kind: 'item',
      id: 'add-parent',
      label: 'Add parent',
      icon: UserPlus,
      shortcut: 'P',
      onSelect: () => args.onAddParent(buildAddParentPrefill(args.target)),
    },
    { kind: 'separator', id: 'sep-add' },
    {
      kind: 'item',
      id: 'copy-id',
      label: 'Copy ID',
      icon: CopyIcon,
      shortcut: '⌘C',
      onSelect: args.onCopyId,
    },
    { kind: 'separator', id: 'sep-clipboard' },
    {
      kind: 'item',
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      shortcut: 'Del',
      destructive: true,
      onSelect: args.onDelete,
    },
  ];
}

/** Canvas right-click menu (empty background). */
function buildCanvasMenu(args: {
  readonly onAddNode: () => void;
  readonly onFit: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
}): readonly MenuEntry[] {
  return [
    {
      kind: 'item',
      id: 'add-individual',
      label: 'Add individual',
      icon: Plus,
      shortcut: 'A',
      onSelect: args.onAddNode,
    },
    { kind: 'separator', id: 'sep-add' },
    {
      kind: 'item',
      id: 'fit-view',
      label: 'Fit to screen',
      icon: Focus,
      shortcut: '0',
      onSelect: args.onFit,
    },
    {
      kind: 'item',
      id: 'zoom-in',
      label: 'Zoom in',
      icon: ZoomIn,
      shortcut: '+',
      onSelect: args.onZoomIn,
    },
    {
      kind: 'item',
      id: 'zoom-out',
      label: 'Zoom out',
      icon: ZoomOut,
      shortcut: '−',
      onSelect: args.onZoomOut,
    },
  ];
}

function LoadingState(): React.JSX.Element {
  return (
    <div
      className="flex items-center justify-center gap-4"
      role="status"
      aria-label="Loading pedigree"
    >
      <div className="w-12 h-12 rounded-full border-2 border-slate-300 bg-slate-200 animate-pulse" />
      <div className="w-12 h-12 rounded-full border-2 border-slate-300 bg-slate-200 animate-pulse [animation-delay:150ms]" />
      <div className="w-12 h-12 rounded-full border-2 border-slate-300 bg-slate-200 animate-pulse [animation-delay:300ms]" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-center" role="alert">
      <div className="max-w-md p-6 bg-surface-raised border border-red-200 rounded shadow-sm flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="w-8 h-8 text-red-600" aria-hidden="true" />
        <p className="text-sm font-mono text-red-700 break-words">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 px-4 h-9 text-sm font-medium bg-brand text-white rounded hover:brightness-110 transition"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  onImportClick,
  onAddNodeClick,
  t,
}: {
  readonly onImportClick: () => void;
  readonly onAddNodeClick: () => void;
  readonly t: { readonly upload: string; readonly addNode: string };
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-center">
      <div className="max-w-md p-8 text-center flex flex-col items-center gap-4">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          aria-hidden="true"
          className="text-slate-300"
        >
          <rect x="10" y="10" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="60" cy="20" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M 20 30 L 20 50 L 50 50 L 50 60"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
          <rect x="40" y="60" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <p className="text-sm text-slate-500">No individuals yet.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAddNodeClick}
            className="inline-flex items-center gap-2 px-4 h-9 text-sm font-medium border border-brand text-brand bg-surface-raised rounded hover:bg-surface transition"
          >
            {t.addNode}
          </button>
          <button
            type="button"
            onClick={onImportClick}
            className="inline-flex items-center gap-2 px-4 h-9 text-sm font-medium bg-brand text-white rounded hover:brightness-110 transition"
          >
            {t.upload}
          </button>
        </div>
      </div>
    </div>
  );
}
