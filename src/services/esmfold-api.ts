/**
 * ESMFold API client.
 *
 * Calls Meta's public ESMFold endpoint to predict protein 3D structure
 * from an amino-acid sequence. Returns PDB-format text.
 */

const ESMFOLD_URL = 'https://api.esmatlas.com/foldSequence/v1/pdb/';

export interface FoldResult {
  readonly pdbData: string;
  readonly sequenceLength: number;
}

/**
 * Call ESMFold's public API to predict protein structure.
 *
 * Accepts a protein sequence (single-letter amino acid codes, no gaps).
 * Returns PDB-format text.
 *
 * Constraints:
 * - Max ~400 residues (API limitation)
 * - Requires internet connectivity
 * - Rate-limited (not documented, be respectful)
 */
export async function foldProtein(proteinSequence: string): Promise<FoldResult> {
  if (proteinSequence.length === 0) {
    throw new Error('Empty protein sequence.');
  }
  if (proteinSequence.length > 400) {
    throw new Error('Sequence too long (max 400 residues for ESMFold).');
  }

  const response = await fetch(ESMFOLD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: proteinSequence,
  });

  if (!response.ok) {
    throw new Error(`ESMFold API error: ${response.status} ${response.statusText}`);
  }

  const pdbData = await response.text();
  return { pdbData, sequenceLength: proteinSequence.length };
}
