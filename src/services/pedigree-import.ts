import { z } from 'zod';

import { APP_CONFIG } from '../config';
import { PedigreeImportError } from '../types/error.types';
import {
  SEQUENCE_REGEX,
  SEQUENCE_SOURCES,
  type Individual,
  type SequenceSource,
} from '../types/pedigree.types';
import { logger } from './logger';

/**
 * Pedigree import service — JSON lane.
 *
 * Validates user-supplied JSON before it reaches the data access layer.
 * PRD v3.1 allows arbitrary free-form columns, so the schema is
 * intentionally permissive: only `id` is required, every other field is
 * optional, and unknown keys land under `fields`.
 *
 * Two stages:
 *   1. {@link parsePedigreeImport} — syntactic + schema validation. Throws
 *      on hard failures (bad JSON, schema violation, oversized payload).
 *   2. {@link analyzePedigreeWarnings} — semantic integrity check on the
 *      parsed dataset (orphan parents, duplicate ids, self-reference).
 *      Returns warnings the UI can surface before committing.
 *
 * CSV/Excel lanes build Individuals directly via the column-mapping UI
 * in a sibling module (Step 2 of the rewrite).
 */

export type ImportWarningKind =
  | 'orphan-sire'
  | 'orphan-dam'
  | 'duplicate-id'
  | 'self-reference';

export interface ImportWarning {
  readonly kind: ImportWarningKind;
  /** The id of the individual the warning concerns. */
  readonly id: string;
  /** Optional extra context, e.g. the missing parent id. */
  readonly detail?: string;
}

/**
 * Inspects a parsed dataset for semantic integrity issues. Does not throw —
 * returns an (empty or populated) list of warnings so the caller can decide
 * whether to block the import, confirm with the user, or just log them.
 *
 * Detected conditions:
 *  - `duplicate-id`: two rows share the same id (last one would overwrite).
 *  - `orphan-sire` / `orphan-dam`: parent id does not exist in the dataset.
 *  - `self-reference`: an individual lists itself as its own sire or dam.
 */
export function analyzePedigreeWarnings(
  individuals: readonly Individual[],
): readonly ImportWarning[] {
  const warnings: ImportWarning[] = [];
  const ids = new Set<string>();
  const seenDuplicates = new Set<string>();

  for (const ind of individuals) {
    if (ids.has(ind.id)) {
      if (!seenDuplicates.has(ind.id)) {
        warnings.push({ kind: 'duplicate-id', id: ind.id });
        seenDuplicates.add(ind.id);
      }
    } else {
      ids.add(ind.id);
    }
  }

  for (const ind of individuals) {
    if (ind.sire !== undefined) {
      if (ind.sire === ind.id) {
        warnings.push({ kind: 'self-reference', id: ind.id, detail: 'sire' });
      } else if (!ids.has(ind.sire)) {
        warnings.push({ kind: 'orphan-sire', id: ind.id, detail: ind.sire });
      }
    }
    if (ind.dam !== undefined) {
      if (ind.dam === ind.id) {
        warnings.push({ kind: 'self-reference', id: ind.id, detail: 'dam' });
      } else if (!ids.has(ind.dam)) {
        warnings.push({ kind: 'orphan-dam', id: ind.id, detail: ind.dam });
      }
    }
  }

  return warnings;
}

const rawIndividualSchema = z
  .object({
    id: z.string().min(1).max(128),
    sire: z.string().max(128).optional(),
    dam: z.string().max(128).optional(),
    sex: z.string().max(64).optional(),
    generation: z.string().max(64).optional(),
    group: z.string().max(128).optional(),
    surrogate: z.string().max(128).optional(),
    birth_date: z.string().max(64).optional(),
    status: z.string().max(256).optional(),
    label: z.string().max(128).optional(),
    sequence: z
      .string()
      .max(100_000)
      .regex(SEQUENCE_REGEX, 'sequence must contain only IUPAC nucleotide codes')
      .optional(),
    sequence_source: z.enum(SEQUENCE_SOURCES as readonly [SequenceSource, ...SequenceSource[]]).optional(),
    fields: z.record(z.string(), z.string()).optional(),
  })
  .catchall(z.unknown());

const payloadSchema = z.union([
  z.array(rawIndividualSchema).max(10_000),
  z.object({ individuals: z.array(rawIndividualSchema).max(10_000) }),
]);

const RESERVED_KEYS = new Set([
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
  'fields',
]);

function toIndividual(raw: z.infer<typeof rawIndividualSchema>): Individual {
  const fields: Record<string, string> = {};
  // Merge any explicit `fields` map.
  if (raw.fields !== undefined) {
    for (const [k, v] of Object.entries(raw.fields)) {
      fields[k] = v;
    }
  }
  // Collect unrecognized top-level keys into `fields` so free columns survive.
  for (const [k, v] of Object.entries(raw)) {
    if (RESERVED_KEYS.has(k)) continue;
    if (typeof v === 'string') fields[k] = v;
    else if (typeof v === 'number' || typeof v === 'boolean') fields[k] = String(v);
  }

  const individual: Individual = {
    id: raw.id,
    ...(raw.sire !== undefined ? { sire: raw.sire } : {}),
    ...(raw.dam !== undefined ? { dam: raw.dam } : {}),
    ...(raw.sex !== undefined ? { sex: raw.sex } : {}),
    ...(raw.generation !== undefined ? { generation: raw.generation } : {}),
    ...(raw.group !== undefined ? { group: raw.group } : {}),
    ...(raw.surrogate !== undefined ? { surrogate: raw.surrogate } : {}),
    ...(raw.birth_date !== undefined ? { birthDate: raw.birth_date } : {}),
    ...(raw.status !== undefined ? { status: raw.status } : {}),
    ...(raw.label !== undefined ? { label: raw.label } : {}),
    ...(raw.sequence !== undefined ? { sequence: raw.sequence } : {}),
    ...(raw.sequence_source !== undefined ? { sequenceSource: raw.sequence_source } : {}),
    fields,
  };
  return individual;
}

/**
 * Parses and validates an import payload string.
 *
 * @throws {PedigreeImportError} when the payload is empty, oversized,
 *   not valid JSON, or fails schema validation.
 */
export function parsePedigreeImport(raw: string): Individual[] {
  if (raw.length === 0) {
    throw new PedigreeImportError('empty-payload', 'Import payload is empty.');
  }
  if (raw.length > APP_CONFIG.maxImportBytes) {
    logger.warn('pedigree-import.too-large', { size: raw.length });
    throw new PedigreeImportError(
      'too-large',
      `Import payload exceeds ${APP_CONFIG.maxImportBytes} bytes.`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (cause) {
    logger.warn('pedigree-import.invalid-json', { cause: String(cause) });
    throw new PedigreeImportError('invalid-json', 'Payload is not valid JSON.');
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    logger.warn('pedigree-import.schema-violation', { issues });
    throw new PedigreeImportError('schema-violation', 'Payload failed validation.', issues);
  }

  const rawRows = Array.isArray(parsed.data) ? parsed.data : parsed.data.individuals;
  const individuals = rawRows.map(toIndividual);

  logger.info('pedigree-import.parsed', { count: individuals.length });
  return individuals;
}
