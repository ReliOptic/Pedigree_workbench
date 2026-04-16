import { type RefObject, useState, useRef, useEffect } from 'react';
import {
  Upload,
  Download,
  Languages,
  Plus,
  Search,
  Settings,
  Undo2,
  Redo2,
  FolderOpen,
  ChevronDown,
  Trash2,
  Check,
  Save,
  Loader2,
  HardDriveDownload,
  HardDriveUpload,
  Pencil,
} from 'lucide-react';

import type { SaveStatus } from '../hooks/use-pedigree';
import type { Project } from '../types/pedigree.types';
import type { Language, Translation } from '../types/translation.types';

type ActiveView = 'dashboard' | 'workbench' | 'paper';

interface TopBarProps {
  readonly uploadButtonRef: RefObject<HTMLButtonElement | null>;
  readonly onUploadClick: () => void;
  readonly onExportClick: () => void;
  readonly onAddNodeClick: () => void;
  readonly language: Language;
  readonly setLanguage: (lang: Language) => void;
  readonly t: Translation;
  readonly searchQuery: string;
  readonly setSearchQuery: (q: string) => void;
  readonly searchInputRef: RefObject<HTMLInputElement | null>;
  readonly matchCount: number;
  readonly totalCount: number;
  readonly activeView: ActiveView;
  readonly setActiveView: (v: ActiveView) => void;
  readonly onSettingsClick: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly saveStatus: SaveStatus;
  readonly projects: readonly Project[];
  readonly activeProjectId: string | null;
  readonly onSwitchProject: (id: string) => void;
  readonly onNewProject: () => void;
  readonly onDeleteProject: (id: string) => void;
  readonly onRenameProject: (id: string, name: string) => void;
  readonly onBackupProject: () => void;
  readonly onRestoreProject: () => void;
  readonly hasMissingDataAlerts?: boolean;
}

/**
 * Application header: brand, project selector, add-node, language toggle, upload.
 */
export function TopBar({
  uploadButtonRef,
  onUploadClick,
  onExportClick,
  onAddNodeClick,
  language,
  setLanguage,
  t,
  searchQuery,
  setSearchQuery,
  searchInputRef,
  matchCount,
  totalCount,
  activeView,
  setActiveView,
  onSettingsClick,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveStatus,
  projects,
  activeProjectId,
  onSwitchProject,
  onNewProject,
  onDeleteProject,
  onRenameProject,
  onBackupProject,
  onRestoreProject,
  hasMissingDataAlerts = false,
}: TopBarProps): React.JSX.Element {
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Close project menu on outside click.
  useEffect(() => {
    if (!isProjectMenuOpen) return;
    const handler = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsProjectMenuOpen(false);
        setRenamingId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isProjectMenuOpen]);

  // Focus rename input when it appears.
  useEffect(() => {
    if (renamingId !== null) {
      setTimeout(() => renameInputRef.current?.focus(), 0);
    }
  }, [renamingId]);

  const commitRename = (): void => {
    if (renamingId !== null && renameValue.trim().length > 0) {
      onRenameProject(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <header
      role="banner"
      className="flex justify-between items-center w-full px-6 h-16 border-b border-border bg-surface"
    >
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold text-brand tracking-tight">{t.appName}</span>

        {/* Project selector */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsProjectMenuOpen((prev) => !prev)}
            className="panel-button flex items-center gap-2 px-3 h-9 text-sm font-medium rounded max-w-[200px]"
            aria-label={t.projects}
          >
            <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" aria-hidden="true" />
            <span className="truncate">
              {activeProject?.name ?? t.noProjects}
            </span>
            <ChevronDown className="w-3 h-3 text-text-secondary flex-shrink-0" aria-hidden="true" />
          </button>
          {isProjectMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-surface-raised border border-border rounded-lg shadow-lg shadow-slate-950/40 z-50 overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                {projects.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-text-muted">{t.noProjects}</p>
                ) : (
                  projects.map((proj) => (
                    <div
                      key={proj.id}
                        className={`flex items-center justify-between px-4 py-2 hover:bg-surface transition cursor-pointer group ${
                        proj.id === activeProjectId ? 'bg-blue-50 dark:bg-sky-950/50' : ''
                      }`}
                    >
                      {renamingId === proj.id ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 min-w-0 px-1 py-0.5 text-sm border border-brand rounded font-mono focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchProject(proj.id);
                            setIsProjectMenuOpen(false);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(proj.id);
                            setRenameValue(proj.name);
                          }}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          title={t.renameProject}
                        >
                          {proj.id === activeProjectId && (
                            <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" aria-hidden="true" />
                          )}
                          <span className="text-sm truncate">{proj.name}</span>
                          <span className="text-xs text-text-muted flex-shrink-0">
                            {proj.data.length}
                          </span>
                        </button>
                      )}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(proj.id);
                            setRenameValue(proj.name);
                          }}
                          className="panel-button p-1 rounded"
                          aria-label={`${t.renameProject}: ${proj.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(proj.id);
                            if (projects.length <= 1) setIsProjectMenuOpen(false);
                          }}
                          className="panel-button p-1 rounded text-red-500"
                          aria-label={`${t.deleteProject}: ${proj.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    onNewProject();
                    setIsProjectMenuOpen(false);
                  }}
                  className="panel-button panel-button-primary flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  {t.newProject}
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="View switcher">
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className={`relative px-3 py-1 text-sm font-medium border-b-2 transition ${
              activeView === 'dashboard'
                ? 'text-brand font-bold border-brand'
                : 'text-text-muted border-transparent hover:text-brand'
            }`}
          >
            {t.dashboard}
            {hasMissingDataAlerts && activeView !== 'dashboard' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('workbench')}
            className={`px-3 py-1 text-sm font-medium border-b-2 transition ${
              activeView === 'workbench'
                ? 'text-brand font-bold border-brand'
                : 'text-text-muted border-transparent hover:text-brand'
            }`}
          >
            {t.workbench}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('paper')}
            className={`px-3 py-1 text-sm font-medium border-b-2 transition ${
              activeView === 'paper'
                ? 'text-brand font-bold border-brand'
                : 'text-text-muted border-transparent hover:text-brand'
            }`}
          >
            {t.paperView}
          </button>
        </nav>

        {/* Search input */}
        <div className="relative ml-2 hidden md:flex items-center">
          <Search
            className="absolute left-3 w-4 h-4 text-text-muted pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchGenotypes}
            data-testid="search-input"
            className="bg-surface-raised text-text-primary placeholder:text-text-muted border border-border h-9 pl-10 pr-4 text-xs font-mono w-64 rounded focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-[var(--color-border-strong)]"
          />
          {searchQuery.length > 0 && (
            <span
              className="ml-2 px-2 py-0.5 text-xs font-mono bg-yellow-100 text-yellow-800 border border-yellow-300 rounded whitespace-nowrap"
              data-testid="search-match-count"
            >
              {matchCount} / {totalCount}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Save status indicator */}
        <SaveIndicator status={saveStatus} t={t} />

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t.undo}
          data-testid="undo-button"
          className="panel-button flex items-center justify-center w-9 h-9 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 className="w-4 h-4 text-text-secondary" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={t.redo}
          data-testid="redo-button"
          className="panel-button flex items-center justify-center w-9 h-9 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Redo2 className="w-4 h-4 text-text-secondary" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
          aria-label={`Language: ${language === 'en' ? 'English' : 'Korean'}. Click to switch.`}
          className="panel-button flex items-center gap-2 px-3 h-9 text-xs font-medium rounded"
        >
          <Languages className="w-4 h-4" aria-hidden="true" />
          {language === 'en' ? 'KO' : 'EN'}
        </button>

        <button
          type="button"
          onClick={onSettingsClick}
          aria-label={t.settings}
          className="panel-button flex items-center justify-center w-9 h-9 rounded"
        >
          <Settings className="w-5 h-5 text-text-secondary" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onAddNodeClick}
          aria-label={t.addNode}
          data-testid="add-node-button"
          className="panel-button panel-button-primary flex items-center gap-2 px-3 h-9 text-sm font-medium rounded"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {t.addNode}
        </button>

        <button
          type="button"
          onClick={onExportClick}
          aria-label={t.exportCsv}
          data-testid="export-csv-button"
          className="panel-button flex items-center gap-2 px-3 h-9 text-sm font-medium rounded"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          {t.exportCsv}
        </button>

        <button
          type="button"
          onClick={onBackupProject}
          aria-label={t.backupProject}
          data-testid="backup-project-button"
          className="panel-button flex items-center gap-2 px-3 h-9 text-sm font-medium rounded"
        >
          <HardDriveDownload className="w-4 h-4" aria-hidden="true" />
          {t.backupProject}
        </button>

        <button
          type="button"
          onClick={onRestoreProject}
          aria-label={t.restoreBackup}
          data-testid="restore-project-button"
          className="panel-button flex items-center gap-2 px-3 h-9 text-sm font-medium rounded"
        >
          <HardDriveUpload className="w-4 h-4" aria-hidden="true" />
          {t.restoreBackup}
        </button>

        <button
          ref={uploadButtonRef}
          type="button"
          onClick={onUploadClick}
          aria-label={t.upload}
          className="panel-button panel-button-primary px-4 h-9 text-sm font-medium active:scale-[0.99] flex items-center gap-2 rounded"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          {t.upload}
        </button>
      </div>
    </header>
  );
}

function SaveIndicator({
  status,
  t,
}: {
  readonly status: SaveStatus;
  readonly t: Translation;
}): React.JSX.Element | null {
  if (status === 'idle') return null;
  return (
    <span
      className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded border transition-opacity ${
        status === 'saving'
          ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-700'
          : 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-700'
      }`}
      role="status"
      aria-live="polite"
    >
      {status === 'saving' ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
          {t.saving}
        </>
      ) : (
        <>
          <Save className="w-3 h-3" aria-hidden="true" />
          {t.saved}
        </>
      )}
    </span>
  );
}
