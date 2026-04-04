import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { Footer } from './components/Footer';
import { NodeInspector } from './components/NodeInspector';
import { PedigreeCanvas } from './components/PedigreeCanvas';
import { ImportModal } from './components/ImportModal';
import { MOCK_INDIVIDUALS } from './constants';
import { Language, TRANSLATIONS } from './translations';

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>('GEN-0942');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [activeNav, setActiveNav] = useState('workbench');

  const t = TRANSLATIONS[language];
  const selectedIndividual = MOCK_INDIVIDUALS.find(i => i.id === selectedId) || null;

  return (
    <div className="bg-slate-50 text-slate-900 font-sans overflow-hidden h-screen flex flex-col">
      <TopBar 
        onUploadClick={() => setIsImportModalOpen(true)} 
        language={language}
        setLanguage={setLanguage}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        t={t}
      />
      
      <main className="flex-1 flex overflow-hidden relative">
        <PedigreeCanvas 
          individuals={MOCK_INDIVIDUALS} 
          selectedId={selectedId} 
          onSelect={setSelectedId} 
          t={t}
        />
        
        <NodeInspector 
          individual={selectedIndividual} 
          onClose={() => setSelectedId(null)} 
          t={t}
        />
      </main>

      <Footer t={t} />

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        t={t}
      />
    </div>
  );
}
