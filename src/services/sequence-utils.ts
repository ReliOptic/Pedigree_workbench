/**
 * DNA → Protein translation utilities.
 *
 * Provides codon translation, ORF finding, and DNA sequence cleaning
 * for the ESMFold structure-prediction workflow.
 */

/** Standard genetic code codon table. */
const CODON_TABLE: Readonly<Record<string, string>> = {
  'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
  'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
  'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
  'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
  'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
  'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
  'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
  'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
  'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
  'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
  'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
  'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
  'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
};

/**
 * Clean a raw DNA string: uppercase, remove whitespace/gaps/numbers,
 * convert U→T (RNA→DNA).
 */
export function cleanDna(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/U/g, 'T')
    .replace(/[\s\d\-]/g, '');
}

/**
 * Translate DNA to protein in a given reading frame (0, 1, or 2).
 * Translation stops at the first stop codon (*) which is NOT included
 * in the returned string. Unknown codons are skipped.
 */
export function translateDna(dna: string, frame: number = 0): string {
  const protein: string[] = [];
  for (let i = frame; i + 2 < dna.length; i += 3) {
    const codon = dna.substring(i, i + 3);
    const aa = CODON_TABLE[codon];
    if (aa === undefined) continue;
    if (aa === '*') break;
    protein.push(aa);
  }
  return protein.join('');
}

export interface OrfResult {
  readonly protein: string;
  readonly frame: number;
  readonly start: number;
  readonly end: number;
}

/**
 * Find the longest ORF across 3 forward reading frames.
 *
 * An ORF starts at ATG and runs to the next stop codon (TAA/TAG/TGA).
 * If no ATG is found in any frame, falls back to translating frame 0
 * from position 0 (partial ORF). Returns null for empty or too-short
 * sequences (< 3 nt).
 */
export function findLongestOrf(dna: string): OrfResult | null {
  if (dna.length < 3) return null;

  let best: OrfResult | null = null;

  for (let frame = 0; frame < 3; frame++) {
    for (let i = frame; i + 2 < dna.length; i += 3) {
      const codon = dna.substring(i, i + 3);
      if (codon !== 'ATG') continue;

      // Found a start codon — translate until stop.
      const protein: string[] = [];
      let end = i;
      for (let j = i; j + 2 < dna.length; j += 3) {
        const c = dna.substring(j, j + 3);
        const aa = CODON_TABLE[c];
        if (aa === undefined) continue;
        if (aa === '*') {
          end = j + 3;
          break;
        }
        protein.push(aa);
        end = j + 3;
      }

      const prot = protein.join('');
      if (best === null || prot.length > best.protein.length) {
        best = { protein: prot, frame, start: i, end };
      }
    }
  }

  // Fallback: no ATG found at all → translate frame 0 from position 0.
  if (best === null) {
    const protein = translateDna(dna, 0);
    if (protein.length === 0) return null;
    return { protein, frame: 0, start: 0, end: dna.length };
  }

  return best;
}
