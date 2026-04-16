import type { PedigreePlugin } from '../plugin-api';
import { resolveUniprotId, KNOWN_PROTEINS } from '../../services/alphafold-api';

/** ESMFold protein structure prediction plugin — built-in */
export const esmfoldPlugin: PedigreePlugin = {
  id: 'built-in:esmfold',
  name: 'ESMFold Structure Prediction',
  version: '1.1.0',
  description:
    'Protein structure prediction via ESMFold API (DNA → ORF → Protein → PDB). ' +
    'Also surfaces AlphaFold DB reference structures for known gene-editing targets.',

  renderRequests: () => [
    {
      slot: 'inspector-panel',
      component: 'StructureViewer',
      priority: -10, // Low priority — show at bottom of inspector
    },
  ],

  analyze: (individual) => {
    if (!individual.sequence) return [];

    const results: import('../plugin-api').PluginAnalysisResult[] = [
      {
        pluginId: 'built-in:esmfold',
        label: 'Sequence Available',
        value: `${individual.sequence.length} bp`,
        severity: 'info',
        details: {
          length: individual.sequence.length,
          source: individual.sequenceSource ?? 'unknown',
        },
      },
    ];

    // Check whether this individual's label or group matches a known protein
    // for which AlphaFold DB provides a pre-computed reference structure.
    const candidateNames = [
      individual.label,
      individual.group,
      individual.id,
      ...Object.keys(individual.fields),
    ].filter((v): v is string => typeof v === 'string' && v.length > 0);

    // Also scan the field values for gene names.
    const fieldValues = Object.values(individual.fields).filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    candidateNames.push(...fieldValues);

    const knownGenes = Object.keys(KNOWN_PROTEINS);
    const matchedGene = candidateNames
      .flatMap((name) => name.split(/[\s,;|/]+/))
      .find((token) => resolveUniprotId(token) !== null);

    if (matchedGene !== undefined) {
      const uniprotId = resolveUniprotId(matchedGene);
      results.push({
        pluginId: 'built-in:esmfold',
        label: 'AlphaFold Reference',
        value: `${matchedGene} (${uniprotId ?? ''})`,
        severity: 'info',
        details: {
          gene: matchedGene,
          uniprotId: uniprotId ?? '',
          note: 'Pre-computed reference structure available from AlphaFold DB',
        },
      });
    } else {
      // Inform the user which genes have AlphaFold references available.
      results.push({
        pluginId: 'built-in:esmfold',
        label: 'AlphaFold Reference',
        value: 'None detected',
        severity: 'info',
        details: {
          note: `No known gene-editing target matched. Known proteins: ${knownGenes.join(', ')}`,
        },
      });
    }

    return results;
  },
};
