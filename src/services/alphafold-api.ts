/**
 * AlphaFold Database API client.
 *
 * Fetches pre-computed protein structure predictions by UniProt accession ID
 * from the EMBL-EBI AlphaFold Database (https://alphafold.ebi.ac.uk).
 *
 * Unlike ESMFold (which computes on-demand), AlphaFold DB serves cached
 * predictions — responses are fast and do not consume GPU quota.
 */

const ALPHAFOLD_API_BASE = 'https://alphafold.ebi.ac.uk/api';
const ALPHAFOLD_FILES_BASE = 'https://alphafold.ebi.ac.uk/files';

export interface AlphaFoldPrediction {
  entryId: string;
  uniprotAccession: string;
  uniprotId: string;
  uniprotDescription: string;
  taxId: number;
  organismScientificName: string;
  pdbUrl: string;
  cifUrl: string;
  bcifUrl: string;
  paeImageUrl: string;
  amAnnotationsUrl: string;
}

/**
 * Known protein UniProt IDs for common gene-editing targets in livestock.
 * Maps gene/locus name → UniProt accession.
 */
export const KNOWN_PROTEINS: Record<string, string> = {
  'CD163': 'Q2VLH6',   // Porcine CD163 (Sus scrofa) — PRRSV resistance target
  'MSTN': 'Q9GZV8',    // Myostatin (Bos taurus) — muscle growth regulator
  'BMPR1B': 'O00238',  // BMP receptor 1B (sheep/goat) — prolificacy
  'GDF8': 'O14793',    // Growth differentiation factor 8 (human)
  'PRLR': 'P16471',    // Prolactin receptor — reproduction
  'SRY': 'Q05066',     // Sex-determining region Y protein
};

/** Module-level cache: uniprotAccession → prediction metadata */
const predictionCache = new Map<string, AlphaFoldPrediction>();

/** Module-level cache: uniprotAccession → PDB text */
const pdbCache = new Map<string, string>();

/**
 * Fetch prediction metadata from AlphaFold DB for a given UniProt accession.
 *
 * The API returns an array; we take the first entry (usually only one for
 * canonical accessions).
 *
 * @throws if the network request fails or no prediction is found.
 */
export async function fetchAlphaFoldPrediction(
  uniprotId: string,
): Promise<AlphaFoldPrediction> {
  const key = uniprotId.toUpperCase();

  const cached = predictionCache.get(key);
  if (cached !== undefined) return cached;

  const url = `${ALPHAFOLD_API_BASE}/prediction/${key}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `No AlphaFold prediction found for UniProt ID "${uniprotId}". ` +
          'Verify the accession at https://alphafold.ebi.ac.uk.',
      );
    }
    throw new Error(
      `AlphaFold API error: ${response.status} ${response.statusText}`,
    );
  }

  // The endpoint returns an array of prediction objects.
  const data = (await response.json()) as AlphaFoldPrediction[];
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`AlphaFold returned no predictions for "${uniprotId}".`);
  }

  // data.length > 0 is guaranteed by the guard above.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const prediction = data[0]!;
  predictionCache.set(key, prediction);
  return prediction;
}

/**
 * Fetch PDB-format structure data from AlphaFold DB.
 *
 * Uses the canonical file URL pattern (v4 model). Falls back to pdbUrl from
 * metadata if the direct URL fails.
 *
 * @throws if the network request fails.
 */
export async function fetchAlphaFoldPdb(uniprotId: string): Promise<string> {
  const key = uniprotId.toUpperCase();

  const cached = pdbCache.get(key);
  if (cached !== undefined) return cached;

  // Try the canonical direct URL first (avoids an extra metadata round-trip).
  const directUrl = `${ALPHAFOLD_FILES_BASE}/AF-${key}-F1-model_v4.pdb`;
  let response = await fetch(directUrl);

  if (!response.ok) {
    // Fall back: fetch metadata to get the actual pdbUrl.
    const prediction = await fetchAlphaFoldPrediction(key);
    response = await fetch(prediction.pdbUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download AlphaFold PDB for "${uniprotId}": ` +
          `${response.status} ${response.statusText}`,
      );
    }
  }

  const pdbData = await response.text();
  pdbCache.set(key, pdbData);
  return pdbData;
}

/**
 * Try to resolve a gene/locus name to a UniProt accession ID.
 *
 * Matching is case-insensitive. Returns null when the gene is not in the
 * KNOWN_PROTEINS map.
 */
export function resolveUniprotId(geneName: string): string | null {
  const upper = geneName.trim().toUpperCase();
  return KNOWN_PROTEINS[upper] ?? null;
}
