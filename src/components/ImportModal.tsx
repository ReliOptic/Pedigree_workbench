import React from 'react';
import { X, FileUp, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: any;
}

export function ImportModal({ isOpen, onClose, t }: ImportModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-8"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] rounded-lg overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#003b5a] dark:text-white">{t.importGeneticData}</h2>
              <p className="text-xs text-slate-500">{t.importDescription}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Dropzone */}
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-8 text-center flex flex-col items-center justify-center gap-2 rounded-lg">
              <FileUp className="w-12 h-12 text-slate-300" />
              <p className="text-sm font-medium text-[#003b5a] dark:text-white">pedigree_export_v2.csv</p>
              <p className="text-xs text-slate-400">142 {t.rowsDetected}</p>
            </div>

            {/* Preview & Mapping Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800">
                    <th className="p-3 border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-400 uppercase">{t.fileColumn}</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-400 uppercase">{t.mapToField}</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold text-slate-400 uppercase">{t.previewRow1}</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono">
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="p-3 text-slate-600 dark:text-slate-400">indiv_id</td>
                    <td className="p-3">
                      <select className="w-full text-[10px] bg-slate-100 dark:bg-slate-800 border-none focus:ring-1 ring-[#003b5a] rounded">
                        <option selected>{t.individualId}</option>
                        <option>Sire ID</option>
                        <option>Dam ID</option>
                      </select>
                    </td>
                    <td className="p-3 text-[#003b5a] dark:text-[#9bccf6] font-bold">GEN-001</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="p-3 text-slate-600 dark:text-slate-400">paternal_ref</td>
                    <td className="p-3">
                      <select className="w-full text-[10px] bg-slate-100 dark:bg-slate-800 border-none focus:ring-1 ring-[#003b5a] rounded">
                        <option>{t.individualId}</option>
                        <option selected>Sire ID</option>
                        <option>Dam ID</option>
                      </select>
                    </td>
                    <td className="p-3 text-slate-500">S-001</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="p-3 text-slate-600 dark:text-slate-400">maternal_ref</td>
                    <td className="p-3">
                      <select className="w-full text-[10px] bg-slate-100 dark:bg-slate-800 border-none focus:ring-1 ring-[#003b5a] rounded">
                        <option>{t.individualId}</option>
                        <option>Sire ID</option>
                        <option selected>Dam ID</option>
                      </select>
                    </td>
                    <td className="p-3 text-slate-500">D-001</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="p-3 text-slate-600 dark:text-slate-400">gender_code</td>
                    <td className="p-3">
                      <select className="w-full text-[10px] bg-slate-100 dark:bg-slate-800 border-none focus:ring-1 ring-[#003b5a] rounded">
                        <option selected>Sex</option>
                        <option>{t.generation}</option>
                      </select>
                    </td>
                    <td className="p-3 text-slate-500">M</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900">
            <button 
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-slate-500 hover:text-[#003b5a] transition-colors"
            >
              {t.cancel}
            </button>
            <button className="px-8 py-2 text-sm font-medium bg-[#003b5a] text-white hover:brightness-110 transition-all rounded flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {t.importData}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
