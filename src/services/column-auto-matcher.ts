/**
 * column-auto-matcher.ts
 *
 * Standalone utility for automatically mapping CSV column headers to internal
 * field names used by the pedigree import pipeline.
 *
 * Confidence levels:
 *   - 'exact'  : header normalises to exactly the internal field name
 *   - 'alias'  : header is a known alternative spelling / synonym
 *   - 'fuzzy'  : header matches a species-specific field provided by the caller
 *
 * Unmatched headers are not returned by this function; callers should treat
 * any CSV column absent from the result as a custom / free field.
 */

export interface ColumnMatch {
  csvColumn: string;
  internalField: string;
  confidence: 'exact' | 'alias' | 'fuzzy';
}

// ---------------------------------------------------------------------------
// Internal field names (mirrors ReservedColumn in pedigree.types.ts)
// ---------------------------------------------------------------------------

/** Canonical internal field names — lower-cased and normalised. */
const INTERNAL_FIELDS = [
  'id',
  'sire',
  'dam',
  'sex',
  'generation',
  'group',
  'surrogate',
  'birth_date',
  'status',
  'label',
  'sequence',
  'sequence_source',
  'notes',
] as const;

type InternalField = (typeof INTERNAL_FIELDS)[number];

// ---------------------------------------------------------------------------
// Alias table
// ---------------------------------------------------------------------------

/**
 * Maps each internal field to a list of alternative header strings that should
 * be recognised as referring to that field.  All entries must be already
 * normalised (lowercase, underscores instead of spaces/hyphens).
 */
const FIELD_ALIASES: Record<InternalField, readonly string[]> = {
  id: ['animal_id', 'individual_id', 'record_id', 'tag_id'],
  sire: [
    'sire_id',
    'father',
    'father_id',
    'male_parent',
    'dad',
    // Korean aliases
    '아비',
    '부',
  ],
  dam: [
    'dam_id',
    'mother',
    'mother_id',
    'female_parent',
    'mom',
    // Korean aliases
    '어미',
    '모',
  ],
  sex: ['gender', 'sex_code', '성별'],
  generation: ['gen', 'generation_id', 'gen_number', '세대'],
  group: [
    'litter',
    'litter_id',
    'litter_group',
    'batch',
    'clutch',
    '그룹',
  ],
  surrogate: ['surrogate_id', 'foster', 'foster_mother', '대리모'],
  birth_date: [
    'dob',
    'birthdate',
    'birth_date',        // identity — harmless duplicate kept for readability
    'date_of_birth',
    'born',
    'birthday',
    '생년월일',
  ],
  status: ['상태'],
  label: ['name', 'animal_name', 'individual_name', 'tag', '이름', '라벨'],
  sequence: ['seq', 'dna_sequence', '염기서열'],
  sequence_source: ['seq_source', 'sequence_src'],
  notes: ['note', 'memo', 'remark', 'remarks', 'comment', 'comments'],
};

// Build a reverse lookup: normalised alias → internal field name
const ALIAS_TO_FIELD = new Map<string, InternalField>();
for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
  InternalField,
  readonly string[],
][]) {
  for (const alias of aliases) {
    ALIAS_TO_FIELD.set(alias, field);
  }
}

// ---------------------------------------------------------------------------
// Normalisation helper
// ---------------------------------------------------------------------------

/**
 * Normalise a header string for comparison:
 *   1. Trim surrounding whitespace
 *   2. Lowercase
 *   3. Replace spaces and hyphens with underscores
 */
function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Automatically map CSV column headers to internal field names.
 *
 * @param csvHeaders   - Array of raw header strings from the parsed CSV.
 * @param speciesFields - Optional list of species-specific field names to
 *                        also attempt matching against (fuzzy tier).
 * @returns An array of {@link ColumnMatch} objects for every header that could
 *          be matched.  Headers with no match are omitted — the caller should
 *          treat them as custom / free fields.
 *
 * Each internal field is assigned at most once; the first CSV column that
 * matches wins (preserving the order of `csvHeaders`).
 */
export function autoMatchColumns(
  csvHeaders: string[],
  speciesFields?: string[],
): ColumnMatch[] {
  const matches: ColumnMatch[] = [];
  const usedInternalFields = new Set<string>();

  // Pre-normalise species fields for O(1) lookup
  const normalisedSpeciesFields: Map<string, string> = new Map();
  if (speciesFields !== undefined) {
    for (const sf of speciesFields) {
      normalisedSpeciesFields.set(normalise(sf), sf);
    }
  }

  for (const csvColumn of csvHeaders) {
    const norm = normalise(csvColumn);

    // 1. Exact match against internal field names
    if ((INTERNAL_FIELDS as readonly string[]).includes(norm)) {
      const field = norm as InternalField;
      if (!usedInternalFields.has(field)) {
        usedInternalFields.add(field);
        matches.push({ csvColumn, internalField: field, confidence: 'exact' });
        continue;
      }
    }

    // 2. Alias match
    const aliasField = ALIAS_TO_FIELD.get(norm);
    if (aliasField !== undefined && !usedInternalFields.has(aliasField)) {
      usedInternalFields.add(aliasField);
      matches.push({ csvColumn, internalField: aliasField, confidence: 'alias' });
      continue;
    }

    // 3. Species-field fuzzy match
    if (normalisedSpeciesFields.size > 0) {
      const originalSpeciesField = normalisedSpeciesFields.get(norm);
      if (originalSpeciesField !== undefined && !usedInternalFields.has(originalSpeciesField)) {
        usedInternalFields.add(originalSpeciesField);
        matches.push({
          csvColumn,
          internalField: originalSpeciesField,
          confidence: 'fuzzy',
        });
        continue;
      }
    }

    // No match — caller treats this as a free / custom field; omit from results.
  }

  return matches;
}
