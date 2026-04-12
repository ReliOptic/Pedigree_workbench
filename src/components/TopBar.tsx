import type { RefObject } from 'react';
import { Upload, Download, Languages, Plus, Search } from 'lucide-react';

import type { Language, Translation } from '../types/translation.types';

type ActiveView = 'workbench' | 'paper';

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
}

/**
 * Application header: brand, add-node, language toggle, upload.
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
}: TopBarProps): React.JSX.Element {
  return (
    <header
      role="banner"
      className="flex justify-between items-center w-full px-6 h-16 border-b border-border bg-surface"
    >
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold text-brand tracking-tight">{t.appName}</span>
        <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="View switcher">
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
        <div className="relative ml-4 hidden md:flex items-center">
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
          onClick={onAddNodeClick}
          aria-label={t.addNode}
          data-testid="add-node-button"
          className="flex items-center gap-2 px-3 h-9 text-sm font-medium border border-brand text-brand bg-white rounded hover:bg-slate-100 transition"
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
