import type { Individual } from '../types/pedigree.types';
import type { GenotypeStatus } from '../types/breeding.types';

/**
 * Unified genotype field resolution.
 * The real data has TWO distinct columns:
 *   - CD163: KO efficiency (numeric 0-1)
 *   - genotype: bp del/ins pattern (e.g., "3bp del (5/15)")
 * This resolver handles case-insensitive key lookup in the fields bag.
 */
export function resolveGenotype(ind: Individual): GenotypeStatus {
  const fields = ind.fields;
  const cd163 = fields['CD163'] ?? fields['cd163'] ?? fields['CD163_KO'] ?? fields['cd163_ko'];
  const genotype = fields['genotype'] ?? fields['Genotype'] ?? fields['GENOTYPE'];
  return {
    cd163: cd163 || undefined,
    genotype: genotype || undefined,
  };
}
