import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
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
  Heart,
  StickyNote,
  LayoutGrid,
} from 'lucide-react';

import { AddNodeModal } from './components/AddNodeModal';
import { MateModal } from './components/MateModal';
import { SettingsModal } from './components/SettingsModal';
import { ContextMenu, type MenuEntry } from './components/ContextMenu';
import { Footer } from './components/Footer';
import { ImportModal } from './components/ImportModal';
import { toCsv, downloadFile } from './services/pedigree-export';
import { exportProject, parseProjectFile } from './services/project-io';
import { NodeInspector } from './components/NodeInspector';
import { ShortcutOverlay } from './components/ShortcutOverlay';
import { PaperView } from './components/PaperView';
import {
  PedigreeCanvas,
  type PedigreeCanvasHandle,
} from './components/PedigreeCanvas';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { WorkbenchSidebar } from './components/WorkbenchSidebar';
import { computeCohortStats, detectMissingData } from './services/cohort-analyzer';
import { usePedigree } from './hooks/use-pedigree';
import { useMatings } from './hooks/use-matings';
import { useProjects } from './hooks/use-projects';
import { useUndo } from './hooks/use-undo';
import { useSettings } from './hooks/use-settings';
import { isFounderCohortLayoutCandidate, summarize } from './services/pedigree-layout';
import { getNodePositions, setNodePositions } from './services/settings-store';
import type { Species } from './services/settings-store';
import { TRANSLATIONS } from './translations';
import type { Individual } from './types/pedigree.types';
import { useCanvasStore } from './stores/canvas-store';
import { useUIStore } from './stores/ui-store';
import { initBuiltInPlugins } from './plugins';
import { isMale, isFemale } from './lib/sex-utils';
import { computePopulationStats } from './services/population-genetics';
import { validatePedigree } from './services/pedigree-validation';
import { getSpeciesProfile } from './services/species-profiles';

// Initialize built-in plugins on app start
initBuiltInPlugins();

type CtxMenu =
  | { readonly kind: 'node'; readonly id: string; readonly x: number; readonly y: number }
  | { readonly kind: 'canvas'; readonly x: number; readonly y: number };

/**
 * Best-effort "next generation" calculator for pre-filling Add Child.
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
 */
function prevGeneration(current: string | undefined): string | undefined {
  if (current === undefined) return undefined;
  const match = current.match(/^(\D*)(-?\d+)$/);
  if (match === null) return current;
  const prefix = match[1] ?? '';
  const n = Number.parseInt(match[2] ?? '0', 10);
  return `${prefix}${n - 1}`;
}

function buildAddParentPrefill(target: Individual): Partial<Individual> {
  return {
    generation: prevGeneration(target.generation),
    ...(target.group !== undefined ? { group: target.group } : {}),
  };
}

function buildAddChildPrefill(parent: Individual): Partial<Individual> {
  return {
    ...(isMale(parent) ? { sire: parent.id } : {}),
    ...(isFemale(parent) ? { dam: parent.id } : {}),
    generation: nextGeneration(parent.generation),
    ...(parent.group !== undefined ? { group: parent.group } : {}),
  };
}

function buildAddSiblingPrefill(target: Individual): Partial<Individual> {
  return {
    ...(target.sire !== undefined ? { sire: target.sire } : {}),
    ...(target.dam !== undefined ? { dam: target.dam } : {}),
    ...(target.generation !== undefined ? { generation: target.generation } : {}),
    ...(target.group !== undefined ? { group: target.group } : {}),
  };
}

export default function App(): React.JSX.Element {
  const { individuals, isLoading, error, saveStatus, refresh, replaceAll, updateOne, deleteOne, addOne } = usePedigree();
  const {
    language, setLanguage,
    activeNav, setActiveNav,
    selectedId, setSelectedId,
    theme, setTheme,
    nodeSize, setNodeSize,
    showStatusBadges, setShowStatusBadges,
    showGenerationLabels, setShowGenerationLabels,
    autoFitOnImport, setAutoFitOnImport,
    defaultGestationDays, setDefaultGestationDays,
    autoBackupInterval, setAutoBackupInterval,
    showNotesOnHover, setShowNotesOnHover,
    connectorLineStyle, setConnectorLineStyle,
    generationFormat, setGenerationFormat,
    species, setSpecies,
    workbenchMode, setWorkbenchMode,
  } = useSettings();
  const { matings, addMating, updateMating, deleteMating, replaceAllMatings } = useMatings();

  const {
    projects,
    activeProjectId,
    switchProject,
    createProject,
    removeProject,
    renameProject,
    refreshProjects,
    saveCurrentProject,
  } = useProjects(refresh, replaceAllMatings);

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
  // Canvas store: node positions and search
  const {
    nodePositions,
    setNodePositions: setStoreNodePositions,
    updateNodePosition,
    searchQuery,
    setSearchQuery,
  } = useCanvasStore();

  // UI store: modals and shortcut overlay
  const {
    showImportModal,
    openImportModal,
    closeImportModal,
    showAddModal,
    openAddModal,
    closeAddModal,
    showSettingsModal,
    openSettingsModal,
    closeSettingsModal,
    showMateModal,
    openMateModal,
    closeMateModal,
    showShortcutOverlay,
    toggleShortcutOverlay,
  } = useUIStore();

  // Load node positions when the active project changes.
  useEffect(() => {
    if (activeProjectId === null) {
      setStoreNodePositions({});
      return;
    }
    setStoreNodePositions(getNodePositions(activeProjectId));
  }, [activeProjectId, setStoreNodePositions]);

  // Persist node positions whenever they change.
  useEffect(() => {
    if (activeProjectId === null) return;
    setNodePositions(activeProjectId, nodePositions);
  }, [nodePositions, activeProjectId]);

  const handleNodeDrag = useCallback(
    (id: string, x: number, y: number) => {
      updateNodePosition(id, x, y);
    },
    [updateNodePosition],
  );

  type ActiveView = 'dashboard' | 'workbench' | 'paper';
  const VALID_VIEWS: readonly ActiveView[] = ['dashboard', 'workbench', 'paper'];
  const activeView: ActiveView = VALID_VIEWS.includes(activeNav as ActiveView) ? (activeNav as ActiveView) : 'workbench';
  const {
    addNodePrefill,
    addParentTarget,
    mateModalPrefillSireId,
    mateModalPrefillDamId,
  } = useUIStore();
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [showWorkbenchSidebar, setShowWorkbenchSidebar] = useState<boolean>(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [relationshipMode, setRelationshipMode] = useState<
    | { readonly kind: 'idle' }
    | { readonly kind: 'assign-parent'; readonly parentRole: 'sire' | 'dam'; readonly sourceId: string }
    | { readonly kind: 'create-mating'; readonly sourceId: string }
  >({ kind: 'idle' });
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<PedigreeCanvasHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[language];
  const summary = useMemo(() => summarize(individuals), [individuals]);
  const cohortStats = useMemo(() => computeCohortStats(individuals), [individuals]);
  const missingAlerts = useMemo(() => detectMissingData(individuals), [individuals]);
  const populationStats = useMemo(() => computePopulationStats(individuals), [individuals]);
  const validation = useMemo(() => validatePedigree(individuals), [individuals]);
  const speciesProfile = useMemo(() => getSpeciesProfile(species), [species]);
  const hasPedigreeStructure = useMemo(
    () => individuals.some((individual) => (individual.sire?.trim() ?? '') !== '' || (individual.dam?.trim() ?? '') !== '') || matings.length > 0,
    [individuals, matings.length],
  );
  const founderCohortCandidate = useMemo(
    () => isFounderCohortLayoutCandidate(individuals),
    [individuals],
  );
  const effectiveWorkbenchMode = useMemo<'cohort' | 'pedigree'>(() => {
    if (workbenchMode === 'pedigree') return 'pedigree';
    if (workbenchMode === 'cohort') {
      return founderCohortCandidate && !hasPedigreeStructure ? 'cohort' : 'pedigree';
    }
    return founderCohortCandidate && !hasPedigreeStructure ? 'cohort' : 'pedigree';
  }, [founderCohortCandidate, hasPedigreeStructure, workbenchMode]);

  const selected = useMemo(
    () => individuals.find((i) => i.id === selectedId) ?? null,
    [individuals, selectedId],
  );
  const relationshipSource = useMemo(
    () => relationshipMode.kind === 'idle'
      ? null
      : individuals.find((i) => i.id === relationshipMode.sourceId) ?? null,
    [individuals, relationshipMode],
  );

  useEffect(() => {
    if (relationshipMode.kind === 'idle') return;
    if (!individuals.some((individual) => individual.id === relationshipMode.sourceId)) {
      setRelationshipMode({ kind: 'idle' });
    }
  }, [individuals, relationshipMode]);

  useEffect(() => {
    if (activeGroupId === null) return;
    if (!individuals.some((individual) => individual.group === activeGroupId)) {
      setActiveGroupId(null);
    }
  }, [activeGroupId, individuals]);

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

  // Auto-save active project periodically (on every mutation, the hook
  // already persists to IndexedDB; this saves the project snapshot).
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (activeProjectId === null) return;
    if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveCurrentProject();
    }, 1000);
    return () => {
      if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    };
  }, [individuals, activeProjectId, saveCurrentProject]);

  // Global keyboard shortcuts for search and undo/redo.
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
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
    if (
      e.key === '?' &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
      toggleShortcutOverlay();
      return;
    }
    if (
      e.key === '/' &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }
    if (e.key === 'Escape' && e.target === searchInputRef.current) {
      e.preventDefault();
      setSearchQuery('');
      searchInputRef.current?.blur();
      return;
    }
    if (e.key === 'Escape' && relationshipMode.kind !== 'idle') {
      e.preventDefault();
      setRelationshipMode({ kind: 'idle' });
    }
  }, [undo, redo, toggleShortcutOverlay, setSearchQuery, relationshipMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  const relationshipHint = useMemo(() => {
    if (relationshipMode.kind === 'assign-parent') {
      return relationshipMode.parentRole === 'sire'
        ? 'Click a child node to assign the selected individual as sire.'
        : 'Click a child node to assign the selected individual as dam.';
    }
    if (relationshipMode.kind === 'create-mating') {
      return 'Click a partner node to start a mating record with the selected individual.';
    }
    return null;
  }, [relationshipMode]);

  const handleWorkbenchSelect = useCallback((id: string | null): void => {
    if (id === null) {
      setSelectedId(null);
      return;
    }

    if (relationshipMode.kind === 'assign-parent') {
      if (id === relationshipMode.sourceId) {
        setSelectedId(id);
        return;
      }

      void trackedUpdateOne(
        id,
        relationshipMode.parentRole === 'sire'
          ? { sire: relationshipMode.sourceId }
          : { dam: relationshipMode.sourceId },
      );
      setSelectedId(id);
      setRelationshipMode({ kind: 'idle' });
      return;
    }

    if (relationshipMode.kind === 'create-mating') {
      if (id === relationshipMode.sourceId) {
        setSelectedId(id);
        return;
      }

      const source = individuals.find((individual) => individual.id === relationshipMode.sourceId);
      const target = individuals.find((individual) => individual.id === id);
      if (source !== undefined && target !== undefined) {
        if (isFemale(source) && !isFemale(target)) {
          openMateModal(target.id, source.id);
        } else if (isFemale(target) && !isFemale(source)) {
          openMateModal(source.id, target.id);
        } else {
          openMateModal(source.id, target.id);
        }
      } else {
        openMateModal();
      }
      setSelectedId(id);
      setRelationshipMode({ kind: 'idle' });
      return;
    }

    setSelectedId(id);
  }, [individuals, openMateModal, relationshipMode, trackedUpdateOne, setSelectedId]);

  const showWorkbenchChrome =
    activeView === 'workbench' && !isLoading && error === null && individuals.length > 0;

  // Apply theme: dark is default (no data-theme attr). Light is opt-in.
  // .dark class kept for backward compat until Phase 1 migration.
  useEffect(() => {
    const apply = (prefersDark: boolean): void => {
      const shouldBeDark =
        theme === 'dark' || (theme === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
      if (shouldBeDark) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
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
    if (prevOpenRef.current && !showImportModal) {
      uploadButtonRef.current?.focus();
    }
    prevOpenRef.current = showImportModal;
  }, [showImportModal]);

  return (
    <div className="bg-surface text-text-primary font-sans h-dvh grid grid-rows-[auto_1fr_auto] overflow-hidden">
      <TopBar
        uploadButtonRef={uploadButtonRef}
        onUploadClick={() => openImportModal()}
        onExportClick={() => {
          const csv = toCsv(individuals);
          const projName = projects.find((p) => p.id === activeProjectId)?.name ?? 'pedigree';
          const date = new Date().toISOString().slice(0, 10);
          downloadFile(csv, `${projName}-${date}.csv`, 'text/csv');
        }}
        onAddNodeClick={() => {
          setActiveNav('workbench');
          openAddModal();
        }}
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
        onSettingsClick={() => openSettingsModal()}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        saveStatus={saveStatus}
        projects={projects}
        activeProjectId={activeProjectId}
        onSwitchProject={(id) => void switchProject(id)}
        onNewProject={() => {
          setActiveNav('workbench');
          void createProject(t.untitledProject, []);
        }}
        onDeleteProject={(id) => void removeProject(id)}
        onRenameProject={(id, name) => void renameProject(id, name)}
        onBackupProject={() => {
          const projName = projects.find((p) => p.id === activeProjectId)?.name ?? 'pedigree';
          const date = new Date().toISOString().slice(0, 10);
          const backup = exportProject(projName, individuals, matings, nodePositions, species);
          downloadFile(backup, `${projName}-backup-${date}.json`, 'application/json');
        }}
        onRestoreProject={() => restoreInputRef.current?.click()}
        hasMissingDataAlerts={missingAlerts.length > 0}
      />

      <main className={`grid min-h-0 overflow-hidden relative ${
        showWorkbenchChrome
          ? (showWorkbenchSidebar ? 'grid-cols-[320px_1fr_auto]' : 'grid-cols-[1fr_auto]')
          : 'grid-cols-[1fr_auto]'
      }`}>
        {activeView === 'paper' ? (
          <PaperView individuals={individuals} t={t} />
        ) : activeView === 'dashboard' ? (
          isLoading ? (
            <LoadingState />
          ) : error !== null ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
          ) : (
            <Dashboard
              stats={cohortStats}
              missingAlerts={missingAlerts}
              t={t}
              projectName={projects.find((p) => p.id === activeProjectId)?.name}
              individuals={individuals}
              onSelectIndividual={setSelectedId}
              populationStats={populationStats}
              validation={validation}
              speciesProfile={speciesProfile}
              language={language}
            />
          )
        ) : isLoading ? (
          <LoadingState />
        ) : error !== null ? (
          <ErrorState message={error} onRetry={() => void refresh()} />
        ) : individuals.length === 0 ? (
          <EmptyState
            onImportClick={() => openImportModal()}
            onAddNodeClick={() => openAddModal()}
            t={t}
          />
        ) : (
          <>
            {showWorkbenchSidebar ? (
              <WorkbenchSidebar
                selected={selected}
                stats={cohortStats}
                missingAlerts={missingAlerts}
                populationStats={populationStats}
                validation={validation}
                speciesProfile={speciesProfile}
                individuals={individuals}
                language={language}
                relationshipMode={relationshipMode}
                onAddChild={() => {
                  if (selected === null) return;
                  setActiveNav('workbench');
                  openAddModal(buildAddChildPrefill(selected));
                }}
                onStartAssignSire={() => {
                  if (selected === null) return;
                  setRelationshipMode({ kind: 'assign-parent', parentRole: 'sire', sourceId: selected.id });
                }}
                onStartAssignDam={() => {
                  if (selected === null) return;
                  setRelationshipMode({ kind: 'assign-parent', parentRole: 'dam', sourceId: selected.id });
                }}
                onStartMating={() => {
                  if (selected === null) return;
                  setRelationshipMode({ kind: 'create-mating', sourceId: selected.id });
                }}
                onCancelRelationshipMode={() => setRelationshipMode({ kind: 'idle' })}
                onSelectIndividual={(id) => {
                  setActiveNav('workbench');
                  setSelectedId(id);
                }}
                onFocusGeneration={(generation) => {
                  setActiveNav('workbench');
                  canvasRef.current?.focusGeneration(generation);
                }}
                activeGroupId={activeGroupId}
                onFocusGroup={(groupId) => {
                  setActiveNav('workbench');
                  setActiveGroupId(groupId);
                  if (groupId === null) {
                    canvasRef.current?.fit();
                    return;
                  }
                  canvasRef.current?.focusGroup(groupId);
                }}
                preferredWorkbenchMode={workbenchMode}
                effectiveWorkbenchMode={effectiveWorkbenchMode}
                onWorkbenchModeChange={setWorkbenchMode}
              />
            ) : null}
            <PedigreeCanvas
              ref={canvasRef}
              individuals={individuals}
              matings={matings}
              selectedId={selectedId}
              onSelect={handleWorkbenchSelect}
              onNodeContextMenu={(id, pos) => setCtxMenu({ kind: 'node', id, x: pos.x, y: pos.y })}
              onCanvasContextMenu={(pos) => setCtxMenu({ kind: 'canvas', x: pos.x, y: pos.y })}
              t={t}
              searchQuery={searchQuery}
              showNotesOnHover={showNotesOnHover}
              generationFormat={generationFormat}
              nodePositions={nodePositions}
              onNodeDrag={handleNodeDrag}
              relationshipSourceId={relationshipSource?.id ?? null}
              interactionHint={relationshipHint}
              activeGroupId={activeGroupId}
              layoutMode={effectiveWorkbenchMode}
            />
            <button
              type="button"
              onClick={() => setShowWorkbenchSidebar((open) => !open)}
              aria-label={showWorkbenchSidebar
                ? (language === 'ko' ? '좌측 패널 접기' : 'Collapse sidebar')
                : (language === 'ko' ? '좌측 패널 열기' : 'Expand sidebar')}
              title={showWorkbenchSidebar
                ? (language === 'ko' ? '좌측 패널 접기' : 'Hide tools panel')
                : (language === 'ko' ? '좌측 패널 열기' : 'Show tools panel')}
              className="absolute top-1/2 z-40 flex h-16 w-6 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-border bg-surface/96 text-text-secondary shadow-lg backdrop-blur-sm transition-all hover:w-7 hover:border-[var(--color-border-strong)] hover:text-text-primary"
              style={{
                left: showWorkbenchSidebar ? 320 : 0,
              }}
            >
              {showWorkbenchSidebar ? (
                <ChevronLeft className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
            </button>
          </>
        )}

        {activeView === 'workbench' && (
          <NodeInspector
            individual={selected}
            allIndividuals={individuals}
            onClose={() => setSelectedId(null)}
            onUpdate={trackedUpdateOne}
            onDelete={trackedDeleteOne}
            t={t}
            matings={matings}
            onDeleteMating={(id) => void deleteMating(id)}
            onUpdateMating={(m) => void updateMating(m)}
            species={species}
            language={language}
          />
        )}
      </main>

      <Footer t={t} summary={summary} saveStatus={saveStatus} />

      {/* Live region announcing selection changes to assistive tech. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {selected !== null ? `${selected.id} selected` : ''}
      </div>

      <ImportModal
        isOpen={showImportModal}
        onClose={() => closeImportModal()}
        existingIndividuals={individuals}
        activeProjectName={projects.find((project) => project.id === activeProjectId)?.name}
        onImported={async ({ projectName, individuals: importedIndividuals, mode }) => {
          pushSnapshot(individuals);
          closeImportModal();
          setActiveNav('workbench');
          if (mode === 'merge') {
            await replaceAll(importedIndividuals);
            await saveCurrentProject();
            await refreshProjects();
            return;
          }
          await createProject(projectName, importedIndividuals);
        }}
        t={t}
      />

      <input
        ref={restoreInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file === undefined) return;
          void file.text().then(async (json) => {
            const parsed = parseProjectFile(json);
            const projectId = await createProject(
              parsed.project.name,
              parsed.project.individuals,
              parsed.project.matings,
            );
            setNodePositions(projectId, parsed.project.nodePositions);
            setStoreNodePositions(parsed.project.nodePositions);
            if (parsed.project.species !== undefined) {
              setSpecies(parsed.project.species as Species);
            }
            setActiveNav('workbench');
            await refreshProjects();
          }).catch((cause) => {
            console.error('Failed to restore project', cause);
          }).finally(() => {
            event.target.value = '';
          });
        }}
      />

      <AddNodeModal
        isOpen={showAddModal}
        allIndividuals={individuals}
        prefill={addNodePrefill}
        onClose={() => {
          closeAddModal();
        }}
        onAdd={trackedAddOne}
        onAdded={(id, individual) => {
          if (addParentTarget !== null) {
            const field = isFemale(individual) ? 'dam' : 'sire';
            void trackedUpdateOne(addParentTarget, { [field]: id });
          }
          closeAddModal();
          setActiveNav('workbench');
          setSelectedId(id);
        }}
        generationFormat={generationFormat}
        t={t}
      />

      <MateModal
        isOpen={showMateModal}
        onClose={() => {
          closeMateModal();
        }}
        onSubmit={(mating) => void addMating(mating)}
        allIndividuals={individuals}
        prefillSireId={mateModalPrefillSireId}
        prefillDamId={mateModalPrefillDamId}
        defaultGestationDays={defaultGestationDays}
        t={t}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => closeSettingsModal()}
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
        t={t}
        nodeSize={nodeSize}
        setNodeSize={setNodeSize}
        showStatusBadges={showStatusBadges}
        setShowStatusBadges={setShowStatusBadges}
        showGenerationLabels={showGenerationLabels}
        setShowGenerationLabels={setShowGenerationLabels}
        autoFitOnImport={autoFitOnImport}
        setAutoFitOnImport={setAutoFitOnImport}
        defaultGestationDays={defaultGestationDays}
        setDefaultGestationDays={setDefaultGestationDays}
        autoBackupInterval={autoBackupInterval}
        setAutoBackupInterval={setAutoBackupInterval}
        showNotesOnHover={showNotesOnHover}
        setShowNotesOnHover={setShowNotesOnHover}
        connectorLineStyle={connectorLineStyle}
        setConnectorLineStyle={setConnectorLineStyle}
        generationFormat={generationFormat}
        setGenerationFormat={setGenerationFormat}
        species={species}
        setSpecies={setSpecies}
      />

      <ShortcutOverlay
        isOpen={showShortcutOverlay}
        onClose={() => toggleShortcutOverlay()}
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
                    openAddModal(prefill);
                  },
                  onAddSibling: (prefill) => {
                    openAddModal(prefill);
                  },
                  onAddParent: (prefill) => {
                    openAddModal(prefill, ctxMenu.id);
                  },
                  onCopyId: () => {
                    void navigator.clipboard?.writeText(ctxMenu.id).catch(() => {});
                  },
                  onDelete: async () => {
                    try {
                      await trackedDeleteOne(ctxMenu.id);
                      if (selectedId === ctxMenu.id) setSelectedId(null);
                    } catch {
                      // Errors are surfaced in the inspector the next time it opens.
                    }
                  },
                  onAddMate: () => {
                    const target = individuals.find((i) => i.id === ctxMenu.id);
                    if (target !== undefined) {
                      if (isFemale(target)) {
                        openMateModal(undefined, ctxMenu.id);
                      } else {
                        openMateModal(ctxMenu.id, undefined);
                      }
                    } else {
                      openMateModal();
                    }
                  },
                  onNote: () => {
                    setSelectedId(ctxMenu.id);
                  },
                })
              : buildCanvasMenu({
                  onAddNode: () => {
                    openAddModal();
                  },
                  onFit: () => canvasRef.current?.fit(),
                  onZoomIn: () => canvasRef.current?.zoomIn(),
                  onZoomOut: () => canvasRef.current?.zoomOut(),
                  onResetLayout: () => setStoreNodePositions({}),
                })
        }
      />
    </div>
  );
}

function buildNodeMenu(args: {
  readonly target: Individual;
  readonly onEdit: () => void;
  readonly onAddChild: (prefill: Partial<Individual>) => void;
  readonly onAddSibling: (prefill: Partial<Individual>) => void;
  readonly onAddParent: (prefill: Partial<Individual>) => void;
  readonly onCopyId: () => void;
  readonly onDelete: () => void;
  readonly onAddMate: () => void;
  readonly onNote: () => void;
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
    { kind: 'separator', id: 'sep-mate' },
    {
      kind: 'item',
      id: 'add-mate',
      label: 'Add Mate',
      icon: Heart,
      shortcut: 'M',
      onSelect: args.onAddMate,
    },
    {
      kind: 'item',
      id: 'note',
      label: 'Note',
      icon: StickyNote,
      shortcut: 'N',
      onSelect: args.onNote,
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

function buildCanvasMenu(args: {
  readonly onAddNode: () => void;
  readonly onFit: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onResetLayout: () => void;
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
    { kind: 'separator', id: 'sep-layout' },
    {
      kind: 'item',
      id: 'reset-layout',
      label: 'Reset Layout',
      icon: LayoutGrid,
      onSelect: args.onResetLayout,
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
      <div className="w-12 h-12 rounded-full border-2 border-border bg-surface-raised animate-pulse" />
      <div className="w-12 h-12 rounded-full border-2 border-border bg-surface-raised animate-pulse [animation-delay:150ms]" />
      <div className="w-12 h-12 rounded-full border-2 border-border bg-surface-raised animate-pulse [animation-delay:300ms]" />
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
          className="text-text-muted"
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
        <p className="text-sm text-text-muted">No individuals yet.</p>
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
