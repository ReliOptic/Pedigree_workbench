/**
 * Encyclopedia of Life (EOL) Classic API client.
 *
 * Provides species search and detail lookup using the EOL public API.
 * Results are cached in module-level Maps to avoid repeated requests.
 * All network errors are caught and returned as null — the app is
 * primarily offline and graceful degradation is required.
 *
 * API reference: https://eol.org/docs/what-is-eol/classic-apis
 */

const EOL_BASE = 'https://eol.org/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EolSearchResult {
  id: number;
  title: string;    // scientific name
  link: string;
  content: string;  // snippet
}

export interface EolSpeciesInfo {
  id: number;
  scientificName: string;
  commonNames: Array<{ name: string; language: string }>;
  taxonomicRank: string;
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  imageUrl: string | null;
  description: string | null;
}

// ── Internal response shapes ───────────────────────────────────────────────────

interface EolRawSearchResult {
  id: number;
  title: string;
  link: string;
  content: string;
}

interface EolRawSearchResponse {
  results?: EolRawSearchResult[];
}

interface EolRawCommonName {
  vernacularName?: string;
  language?: string;
}

interface EolRawDataObject {
  dataType?: string;
  mimeType?: string;
  mediaURL?: string;
  description?: string;
}

interface EolRawTaxonConcept {
  scientificName?: string;
  taxonRank?: string;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  vernacularNames?: EolRawCommonName[];
}

interface EolRawPageResponse {
  identifier?: number;
  taxonConcepts?: EolRawTaxonConcept[];
  dataObjects?: EolRawDataObject[];
}

// ── Module-level caches ────────────────────────────────────────────────────────

const searchCache = new Map<string, EolSearchResult[]>();
const detailCache = new Map<number, EolSpeciesInfo>();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if the data object is an image we can display. */
function isImage(obj: EolRawDataObject): boolean {
  return (
    (obj.dataType?.includes('StillImage') === true ||
      obj.mimeType?.startsWith('image/') === true) &&
    typeof obj.mediaURL === 'string' &&
    obj.mediaURL.length > 0
  );
}

/** Returns true if the data object is a text description. */
function isDescription(obj: EolRawDataObject): boolean {
  return (
    (obj.dataType?.includes('Text') === true ||
      obj.mimeType === 'text/html' ||
      obj.mimeType === 'text/plain') &&
    typeof obj.description === 'string' &&
    obj.description.length > 0
  );
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Search for species by name.
 *
 * GET https://eol.org/api/search/1.0.json?q={query}&page=1&exact=false
 *
 * Returns an empty array on network failure — never throws.
 */
export async function searchEolSpecies(query: string): Promise<EolSearchResult[]> {
  const key = query.trim().toLowerCase();
  if (!key) return [];

  const cached = searchCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const url = new URL(`${EOL_BASE}/search/1.0.json`);
    url.searchParams.set('q', query.trim());
    url.searchParams.set('page', '1');
    url.searchParams.set('exact', 'false');

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(`[EOL] Search failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = (await response.json()) as EolRawSearchResponse;
    const results: EolSearchResult[] = (data.results ?? []).map((r) => ({
      id: r.id,
      title: r.title ?? '',
      link: r.link ?? '',
      content: r.content ?? '',
    }));

    searchCache.set(key, results);
    return results;
  } catch (err) {
    console.warn(
      '[EOL] Species lookup requires internet. Offline features are working normally.',
      err,
    );
    return [];
  }
}

/**
 * Get detailed species info by EOL page ID.
 *
 * GET https://eol.org/api/pages/1.0/{id}.json?details=true&common_names=true&images_per_page=1
 *
 * Returns null on network failure — never throws.
 */
export async function getEolSpeciesInfo(eolId: number): Promise<EolSpeciesInfo | null> {
  const cached = detailCache.get(eolId);
  if (cached !== undefined) return cached;

  try {
    const url = new URL(`${EOL_BASE}/pages/1.0/${eolId}.json`);
    url.searchParams.set('details', 'true');
    url.searchParams.set('common_names', 'true');
    url.searchParams.set('images_per_page', '1');

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[EOL] Page fetch failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as EolRawPageResponse;

    // The first taxon concept carries the primary classification.
    const taxon: EolRawTaxonConcept = data.taxonConcepts?.[0] ?? {};

    const commonNames: EolSpeciesInfo['commonNames'] = (taxon.vernacularNames ?? [])
      .filter((n) => n.vernacularName && n.language)
      .map((n) => ({ name: n.vernacularName!, language: n.language! }));

    // Find first usable image.
    const imageObj = (data.dataObjects ?? []).find(isImage);
    const imageUrl = imageObj?.mediaURL ?? null;

    // Find first usable text description.
    const descObj = (data.dataObjects ?? []).find(isDescription);
    // Strip basic HTML tags for plain text storage.
    const rawDesc = descObj?.description ?? null;
    const description = rawDesc
      ? rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      : null;

    const info: EolSpeciesInfo = {
      id: data.identifier ?? eolId,
      scientificName: taxon.scientificName ?? '',
      commonNames,
      taxonomicRank: taxon.taxonRank ?? '',
      kingdom: taxon.kingdom ?? '',
      phylum: taxon.phylum ?? '',
      class: taxon.class ?? '',
      order: taxon.order ?? '',
      family: taxon.family ?? '',
      genus: taxon.genus ?? '',
      imageUrl,
      description,
    };

    detailCache.set(eolId, info);
    return info;
  } catch (err) {
    console.warn(
      '[EOL] Species lookup requires internet. Offline features are working normally.',
      err,
    );
    return null;
  }
}

/**
 * Convenience: search by name and return the first result's full details.
 *
 * Returns null when offline, no results, or on any error.
 */
export async function lookupSpecies(name: string): Promise<EolSpeciesInfo | null> {
  const results = await searchEolSpecies(name);
  if (results.length === 0) return null;

  // results[0] is guaranteed by the length check above.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return getEolSpeciesInfo(results[0]!.id);
}
