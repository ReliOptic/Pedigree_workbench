import type { PedigreePlugin } from '../plugin-api';

/** ESMFold protein structure prediction plugin — built-in */
export const esmfoldPlugin: PedigreePlugin = {
  id: 'built-in:esmfold',
  name: 'ESMFold Structure Prediction',
  version: '1.0.0',
  description: 'Protein structure prediction via ESMFold API (DNA → ORF → Protein → PDB)',

  renderRequests: () => [
    {
      slot: 'inspector-panel',
      component: 'StructureViewer',
      priority: -10,  // Low priority — show at bottom of inspector
    },
  ],

  analyze: (individual) => {
    if (!individual.sequence) return [];

    return [{
      pluginId: 'built-in:esmfold',
      label: 'Sequence Available',
      value: `${individual.sequence.length} bp`,
      severity: 'info',
      details: {
        length: individual.sequence.length,
        source: individual.sequenceSource ?? 'unknown',
      },
    }];
  },
};
