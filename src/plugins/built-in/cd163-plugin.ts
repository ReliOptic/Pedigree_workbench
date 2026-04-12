import type { PedigreePlugin } from '../plugin-api';

/** CD163 gene editing analysis plugin — built-in */
export const cd163Plugin: PedigreePlugin = {
  id: 'built-in:cd163',
  name: 'CD163 Gene Editing',
  version: '1.0.0',
  description: 'CD163 KO efficiency tracking for gene-edited livestock',

  loci: [
    {
      name: 'CD163',
      fieldKeys: ['CD163', 'cd163', 'CD163_KO', 'cd163_ko'],
      description: 'CD163 knockout efficiency (0-100%)',
      parser: (raw: string) => {
        // Parse percentage values like "100.00%", "80%", "0.95"
        const cleaned = raw.replace('%', '').trim();
        const num = parseFloat(cleaned);
        if (isNaN(num)) return { efficiency: null, raw };
        // If > 1, treat as percentage; otherwise as decimal
        const efficiency = num > 1 ? num / 100 : num;
        return { efficiency, raw };
      },
    },
    {
      name: 'genotype',
      fieldKeys: ['genotype', 'Genotype', 'GENOTYPE'],
      description: 'Genotype pattern (e.g., "3bp del/1bp ins")',
    },
  ],

  analyze: (individual, _allIndividuals) => {
    const cd163 = individual.fields['CD163'] ?? individual.fields['cd163'] ??
                  individual.fields['CD163_KO'] ?? individual.fields['cd163_ko'];
    if (!cd163) return [];

    const cleaned = cd163.replace('%', '').trim();
    const num = parseFloat(cleaned);
    if (isNaN(num)) return [];

    const efficiency = num > 1 ? num / 100 : num;

    return [{
      pluginId: 'built-in:cd163',
      locus: 'CD163',
      label: 'CD163 KO Efficiency',
      value: efficiency,
      severity: efficiency >= 0.9 ? 'info' : efficiency >= 0.5 ? 'warning' : 'error',
      details: { raw: cd163, efficiency },
    }];
  },
};
