import React from 'react';
import { X, Dna, Stethoscope, Microscope, History, Edit3 } from 'lucide-react';
import { Individual } from '../types';
import { cn } from '../lib/utils';

import { motion, AnimatePresence } from 'motion/react';

interface NodeInspectorProps {
  individual: Individual | null;
  onClose: () => void;
  t: any;
}

export function NodeInspector({ individual, onClose, t }: NodeInspectorProps) {
  const [activeTab, setActiveTab] = React.useState('details');

  return (
    <AnimatePresence>
      {individual && (
        <motion.aside 
          initial={{ x: 360 }}
          animate={{ x: 0 }}
          exit={{ x: 360 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-[360px] flex flex-col z-40 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          <div className="p-6 pt-20 border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-sm font-bold">{t.nodeInspector}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-[#003b5a]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="font-mono text-xs text-slate-500">{t.individualId}: {individual.id}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab('details')}
          className={cn(
            "flex-1 py-3 text-[10px] font-mono flex flex-col items-center gap-1 transition-colors",
            activeTab === 'details' ? "border-l-4 border-[#1A5276] bg-slate-100 dark:bg-slate-800 text-[#1A5276]" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Dna className="w-4 h-4" />
          {t.details}
        </button>
        <button 
          onClick={() => setActiveTab('clinical')}
          className={cn(
            "flex-1 py-3 text-[10px] font-mono flex flex-col items-center gap-1 transition-colors",
            activeTab === 'clinical' ? "border-l-4 border-[#1A5276] bg-slate-100 dark:bg-slate-800 text-[#1A5276]" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Stethoscope className="w-4 h-4" />
          {t.clinical}
        </button>
        <button 
          onClick={() => setActiveTab('genetics')}
          className={cn(
            "flex-1 py-3 text-[10px] font-mono flex flex-col items-center gap-1 transition-colors",
            activeTab === 'genetics' ? "border-l-4 border-[#1A5276] bg-slate-100 dark:bg-slate-800 text-[#1A5276]" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <Microscope className="w-4 h-4" />
          {t.genetics}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex-1 py-3 text-[10px] font-mono flex flex-col items-center gap-1 transition-colors",
            activeTab === 'history' ? "border-l-4 border-[#1A5276] bg-slate-100 dark:bg-slate-800 text-[#1A5276]" : "text-slate-400 hover:text-slate-600"
          )}
        >
          <History className="w-4 h-4" />
          {t.history}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-16 h-16 border-2 flex items-center justify-center",
            individual.gender === 'male' ? "bg-blue-100 border-blue-600" : 
            individual.gender === 'female' ? "bg-pink-100 border-pink-600 rounded-full" : 
            "bg-slate-100 border-slate-600 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]"
          )}>
            <span className="font-mono text-xl font-bold text-slate-900">{individual.label}</span>
          </div>
          <div>
            <h3 className="text-sm font-bold">Liam G. Robertson</h3>
            <span className="text-[10px] bg-blue-100 text-[#003b5a] px-2 py-0.5 rounded font-mono">
              {t[individual.gender]} | {individual.isProband ? t.proband : t.individual}
            </span>
          </div>
        </div>

        {/* Attributes Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">{t.birthDate}</p>
            <p className="font-mono text-xs">{individual.birthDate || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">{t.karyotype}</p>
            <p className="font-mono text-xs">{individual.karyotype || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">{t.phenotype}</p>
            <p className="font-mono text-xs">{individual.phenotype || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">{t.consanguinity}</p>
            <p className={cn("font-mono text-xs", individual.consanguinity ? "text-red-600" : "text-slate-600")}>
              {individual.consanguinity ? t.true : t.false}
            </p>
          </div>
        </div>

        {/* Bio / Notes */}
        <div className="space-y-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">{t.investigatorNotes}</p>
          <div className="bg-slate-100 dark:bg-slate-800 p-3 font-sans text-xs leading-relaxed text-slate-600 dark:text-slate-400 rounded">
            {individual.notes || 'No notes available.'}
          </div>
        </div>

        {/* HPO Terms */}
        <div className="space-y-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">{t.hpoAnnotations}</p>
          <div className="flex flex-wrap gap-2">
            {individual.hpoAnnotations?.map(term => (
              <span key={term} className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300 rounded">
                {term}
              </span>
            )) || <span className="text-xs text-slate-400">None</span>}
          </div>
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button className="w-full h-10 bg-[#006397] text-white font-medium text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2 rounded">
          <Edit3 className="w-4 h-4" />
          {t.editPedigreeNode}
        </button>
      </div>
    </motion.aside>
  )}
</AnimatePresence>
  );
}
