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
            className="flex items-center gap-2 px-3 h-9 text-sm font-medium border border-border rounded hover:bg-slate-100 transition max-w-[200px]"
            aria-label={t.projects}
          >
            <FolderOpen className="w-4 h-4 text-text-secondary flex-shrink-0" aria-hidden="true" />
            <span className="truncate">
              {activeProject?.name ?? t.noProjects}
            </span>
            <ChevronDown className="w-3 h-3 text-text-secondary flex-shrink-0" aria-hidden="true" />
          </button>
          {isProjectMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-surface-raised border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                {projects.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-400">{t.noProjects}</p>
                ) : (
                  projects.map((proj) => (
                    <div
                      key={proj.id}
                      className={`flex items-center justify-between px-4 py-2 hover:bg-slate-100 transition cursor-pointer group ${
                        proj.id === activeProjectId ? 'bg-blue-50' : ''
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
                          <span className="text-xs text-slate-400 flex-shrink-0">
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
                          className="p-1 rounded hover:bg-blue-100 transition"
                          aria-label={`${t.renameProject}: ${proj.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(proj.id);
                            if (projects.length <= 1) setIsProjectMenuOpen(false);
                          }}
                          className="p-1 rounded hover:bg-red-100 transition"
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
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-brand hover:bg-slate-50 transition"
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
                : 'text-slate-500 border-transparent hover:text-brand'
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
                : 'text-slate-500 border-transparent hover:text-brand'
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
                : 'text-slate-500 border-transparent hover:text-brand'
            }`}
          >
            {t.paperView}
          </button>
        </nav>

        {/* Search input */}
        <div className="relative ml-2 hidden md:flex items-center">
          <Search
            className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchGenotypes}
            data-testid="search-input"
            className="bg-slate-200 border-none h-9 pl-10 pr-4 text-xs font-mono w-64 rounded focus:outline-none focus:ring-2 focus:ring-brand/40"
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
          className="flex items-center justify-center w-9 h-9 border border-border rounded hover:bg-surface transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Undo2 className="w-4 h-4 text-text-secondary" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={t.redo}
          data-testid="redo-button"
          className="flex items-center justify-center w-9 h-9 border border-border rounded hover:bg-surface transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Redo2 className="w-4 h-4 text-text-secondary" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
          aria-label={`Language: ${language === 'en' ? 'English' : 'Korean'}. Click to switch.`}
          className="flex items-center gap-2 px-3 h-9 text-xs font-medium border border-border rounded hover:bg-slate-100 transition"
        >
          <Languages className="w-4 h-4" aria-hidden="true" />
          {language === 'en' ? 'KO' : 'EN'}
        </button>

        <button
          type="button"
          onClick={onSettingsClick}
          aria-label={t.settings}
          className="flex items-center justify-center w-9 h-9 border border-border rounded hover:bg-surface transition"
        >
          <Settings className="w-5 h-5 text-text-secondary" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onAddNodeClick}
          aria-label={t.addNode}
          data-testid="add-node-button"
          className="flex items-center gap-2 px-3 h-9 text-sm font-medium border border-brand text-brand bg-surface-raised rounded hover:bg-surface transition"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {t.addNode}
        </button>

        <button
          type="button"
          onClick={onExportClick}
          aria-label={t.exportCsv}
          data-testid="export-csv-button"
          className="flex items-center gap-2 px-3 h-9 text-sm font-medium border border-border text-text-secondary rounded hover:bg-slate-100 transition"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          {t.exportCsv}
        </button>

        <button
          type="button"
          onClick={onBackupProject}
          aria-label={t.backupProject}
          data-testid="backup-project-button"
          className="flex items-center gap-2 px-3 h-9 text-sm font-medium border border-border text-text-secondary rounded hover:bg-slate-100 transition"
        >
          <HardDriveDownload className="w-4 h-4" aria-hidden="true" />
          {t.backupProject}
        </button>

        <button
          ref={uploadButtonRef}
          type="button"
          onClick={onUploadClick}
          aria-label={t.upload}
          className="bg-brand text-white px-4 h-9 text-sm font-medium transition active:scale-95 flex items-center gap-2 rounded hover:brightness-110"
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
      className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded transition-opacity ${
        status === 'saving'
          ? 'text-amber-600 bg-amber-50'
          : 'text-green-600 bg-green-50'
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
