import React from 'react';

interface FooterProps {
  t: any;
}

export function Footer({ t }: FooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-between items-center px-4 h-8 border-t border-slate-200 dark:border-slate-800 bg-[#f3f4f5] dark:bg-slate-950 text-[#003b5a] dark:text-[#9bccf6]">
      <div className="flex items-center gap-4">
        <span className="font-mono text-[11px]">{t.totalIndividuals}: 142 | {t.generations}: 5 | {t.filtered}: {t.none}</span>
        <div className="h-3 w-[1px] bg-slate-300"></div>
        <span className="font-mono text-[11px] text-green-600 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
          {t.liveCanvasSync}
        </span>
      </div>
      <div className="flex items-center gap-6">
        <button className="font-mono text-[11px] text-slate-500 hover:text-[#1A5276]">{t.canvasZoom}</button>
        <button className="font-mono text-[11px] text-slate-500 hover:text-[#1A5276]">{t.resetView}</button>
        <button className="font-mono text-[11px] text-[#006397] font-bold hover:text-[#1A5276]">{t.exportCsv}</button>
      </div>
    </footer>
  );
}
