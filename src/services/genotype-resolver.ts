import type { Individual } from '../types/pedigree.types';
import type { GenotypeStatus } from '../types/breeding.types';

/**
 * Known locus field patterns — maps locus names to possible field key variations.
 * Plugins can register additional patterns via registerLocusPattern().
 */
const locusPatterns: Map<string, string[]> = new Map([
  ['CD163', ['CD163', 'cd163', 'CD163_KO', 'cd163_ko']],
  ['genotype', ['genotype', 'Genotype', 'GENOTYPE']],
]);

/** Register additional locus field patterns (for plugins) */
export function registerLocusPattern(locus: string, fieldKeys: string[]): void {
  const existing = locusPatterns.get(locus) ?? [];
  locusPatterns.set(locus, [...existing, ...fieldKeys]);
}

/** Remove a registered locus pattern */
export function unregisterLocusPattern(locus: string): void {
  locusPatterns.delete(locus);
}

/** Get all registered locus names */
export function getRegisteredLoci(): string[] {
  return Array.from(locusPatterns.keys());
}

/** Resolve all known locus values from an individual's fields */
export function resolveGenotype(ind: Individual): GenotypeStatus {
  const fields = ind.fields;
  const loci: Record<string, string> = {};

  for (const [locus, keys] of locusPatterns) {
    for (const key of keys) {
      const val = fields[key];
      if (val) {
        loci[locus] = val;
        break;
      }
    }
  }

  // Primary = first locus with a value
  const entries = Object.entries(loci);
  const [primaryLocus, primaryValue] = entries[0] ?? [undefined, undefined];

  return { loci, primaryLocus, primaryValue };
}

