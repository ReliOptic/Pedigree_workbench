export interface JournalPreset {
  id: string;
  name: string;
  description: string;
  figureWidth: number;   // mm
  figureHeight: number;  // mm, 0 = auto
  dpi: number;
  fontSize: number;      // pt for labels
  lineWidth: number;     // px for connectors
  nodeScale: number;     // multiplier vs default node size
  fontFamily: string;
  maxColumns: number;    // for multi-panel
}

export const JOURNAL_PRESETS: JournalPreset[] = [
  {
    id: 'nature',
    name: 'Nature / Nature Genetics',
    description: 'Single column 89mm, double 183mm',
    figureWidth: 183, figureHeight: 0, dpi: 300,
    fontSize: 7, lineWidth: 1, nodeScale: 0.8,
    fontFamily: 'Helvetica, Arial, sans-serif', maxColumns: 2,
  },
  {
    id: 'science',
    name: 'Science',
    description: 'Single column 85mm, full page 170mm',
    figureWidth: 170, figureHeight: 0, dpi: 300,
    fontSize: 8, lineWidth: 1, nodeScale: 0.8,
    fontFamily: 'Helvetica, Arial, sans-serif', maxColumns: 2,
  },
  {
    id: 'plos',
    name: 'PLOS ONE / PLOS Genetics',
    description: '5.2" single, 7.5" double column',
    figureWidth: 190, figureHeight: 0, dpi: 300,
    fontSize: 8, lineWidth: 1.2, nodeScale: 0.85,
    fontFamily: 'Arial, sans-serif', maxColumns: 2,
  },
  {
    id: 'animal-genetics',
    name: 'Animal Genetics',
    description: 'Full page width 170mm',
    figureWidth: 170, figureHeight: 0, dpi: 600,
    fontSize: 8, lineWidth: 1, nodeScale: 0.85,
    fontFamily: 'Times New Roman, serif', maxColumns: 1,
  },
  {
    id: 'genetics',
    name: 'Genetics (GSA)',
    description: 'Column 85mm, full 170mm',
    figureWidth: 170, figureHeight: 0, dpi: 300,
    fontSize: 8, lineWidth: 1, nodeScale: 0.85,
    fontFamily: 'Arial, sans-serif', maxColumns: 2,
  },
  {
    id: 'presentation',
    name: 'Presentation (16:9)',
    description: '1920×1080px, large text',
    figureWidth: 338, figureHeight: 190, dpi: 150,
    fontSize: 14, lineWidth: 2, nodeScale: 1.2,
    fontFamily: 'Inter, sans-serif', maxColumns: 3,
  },
  {
    id: 'poster',
    name: 'Scientific Poster (A0)',
    description: 'Large format, 600dpi',
    figureWidth: 400, figureHeight: 0, dpi: 600,
    fontSize: 12, lineWidth: 2, nodeScale: 1.5,
    fontFamily: 'Arial, sans-serif', maxColumns: 3,
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Set your own dimensions',
    figureWidth: 170, figureHeight: 0, dpi: 300,
    fontSize: 8, lineWidth: 1, nodeScale: 1,
    fontFamily: 'Arial, sans-serif', maxColumns: 2,
  },
];
