import { useMemo, useState } from 'react';

import { Footer } from './components/Footer';
import { ImportModal } from './components/ImportModal';
import { NodeInspector } from './components/NodeInspector';
import { PedigreeCanvas } from './components/PedigreeCanvas';
import { TopBar } from './components/TopBar';
import { usePedigree } from './hooks/use-pedigree';
import { useSettings } from './hooks/use-settings';
import { summarize } from './services/pedigree-layout';
import { TRANSLATIONS } from './translations';

/**
 * Application shell. Composes the persistence hooks with presentational
 * components — no business logic lives here. The shell intentionally has no
 * knowledge of IndexedDB or import parsing; it only orchestrates state.
 */
export default function App(): React.JSX.Element {
  const { individuals, isLoading, error, refresh } = usePedigree();
  const { language, setLanguage, activeNav, setActiveNav, selectedId, setSelectedId } =
    useSettings();
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  const t = TRANSLATIONS[language];
  const summary = useMemo(() => summarize(individuals), [individuals]);
  const selected = useMemo(
    () => individuals.find((i) => i.id === selectedId) ?? null,
    [individuals, selectedId],
  );

  return (
    <div className="bg-slate-50 text-slate-900 font-sans overflow-hidden h-screen flex flex-col">
      <TopBar
        onUploadClick={() => setIsImportOpen(true)}
        language={language}
        setLanguage={setLanguage}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        t={t}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center font-mono text-xs text-slate-400">
            Loading pedigree…
          </div>
        ) : error !== null ? (
          <div className="flex-1 flex items-center justify-center font-mono text-xs text-red-600">
            {error}
          </div>
        ) : (
          <PedigreeCanvas
            individuals={individuals}
            selectedId={selectedId}
            onSelect={setSelectedId}
            t={t}
          />
        )}

        <NodeInspector individual={selected} onClose={() => setSelectedId(null)} t={t} />
      </main>

      <Footer t={t} summary={summary} />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={() => {
          setIsImportOpen(false);
          void refresh();
        }}
        t={t}
      />
    </div>
  );
}
