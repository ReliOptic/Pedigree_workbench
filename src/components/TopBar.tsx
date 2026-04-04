import React from 'react';
import { Search, PlusSquare, Upload, Settings, HelpCircle, Languages } from 'lucide-react';
import { Language } from '../translations';
import { cn } from '../lib/utils';

interface TopBarProps {
  onUploadClick: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
  t: any;
}

export function TopBar({ onUploadClick, language, setLanguage, activeNav, setActiveNav, t }: TopBarProps) {
  return (
    <header className="flex justify-between items-center w-full px-6 h-16 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 z-50">
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold text-[#003b5a] dark:text-white tracking-tight">{t.appName}</span>
        <nav className="hidden md:flex gap-6 ml-8">
          <button 
            onClick={() => setActiveNav('workbench')}
            className={cn(
              "text-sm font-semibold px-2 py-1 transition-colors",
              activeNav === 'workbench' ? "text-[#003b5a] dark:text-[#9bccf6]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            )}
          >
            {t.workbench}
          </button>
          <button 
            onClick={() => setActiveNav('cohort')}
            className={cn(
              "text-sm font-semibold px-2 py-1 transition-colors",
              activeNav === 'cohort' ? "text-[#003b5a] dark:text-[#9bccf6]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            )}
          >
            {t.cohortAnalysis}
          </button>
          <button 
            onClick={() => setActiveNav('reporting')}
            className={cn(
              "text-sm font-semibold px-2 py-1 transition-colors",
              activeNav === 'reporting' ? "text-[#003b5a] dark:text-[#9bccf6]" : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            )}
          >
            {t.reporting}
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative mr-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            className="bg-slate-200 dark:bg-slate-800 border-none h-9 pl-10 pr-4 text-xs font-mono w-64 focus:ring-2 focus:ring-[#003b5a] rounded" 
            placeholder={t.searchGenotypes} 
            type="text"
          />
        </div>
        
        {/* Language Toggle */}
        <button 
          onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
          className="flex items-center gap-2 px-3 h-9 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <Languages className="w-4 h-4" />
          {language === 'en' ? 'KO' : 'EN'}
        </button>

        <button className="bg-slate-200 dark:bg-slate-800 text-[#1A5276] px-4 h-9 text-sm font-medium transition-all active:scale-95 flex items-center gap-2 rounded">
          <PlusSquare className="w-4 h-4" />
          {t.addNode}
        </button>
        <button 
          onClick={onUploadClick}
          className="bg-[#003b5a] text-white px-4 h-9 text-sm font-medium transition-all active:scale-95 flex items-center gap-2 rounded"
        >
          <Upload className="w-4 h-4" />
          {t.upload}
        </button>
        <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
        <button className="text-slate-500 hover:bg-slate-200 p-2 rounded transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button className="text-slate-500 hover:bg-slate-200 p-2 rounded transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
