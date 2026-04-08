import { z } from 'zod';

import { APP_CONFIG } from '../config';
import { PedigreeImportError } from '../types/error.types';
import type { Individual } from '../types/pedigree.types';
import { logger } from './logger';

/**
 * Pedigree import service.
 *
 * Validates user-supplied JSON before it reaches the data access layer.
 * Validation is the security boundary for offline imports — it rejects
 * oversized payloads, malformed JSON, and shapes that violate the
 * {@link Individual} contract.
 */

const genderSchema = z.enum(['male', 'female', 'unknown']);

const individualSchema = z.object({
  id: z.string().min(1).max(128),
  label: z.string().max(64),
  gender: genderSchema,
  generation: z.number().int().min(0).max(64),
  isProband: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  birthDate: z.string().max(64).optional(),
  karyotype: z.string().max(64).optional(),
  phenotype: z.string().max(128).optional(),
  consanguinity: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  hpoAnnotations: z.array(z.string().max(32)).max(64).optional(),
  sireId: z.string().max(128).optional(),
  damId: z.string().max(128).optional(),
});

const payloadSchema = z.union([
  z.array(individualSchema).max(10_000),
  z.object({ individuals: z.array(individualSchema).max(10_000) }),
]);

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

  const individuals: Individual[] = Array.isArray(parsed.data)
    ? parsed.data
    : parsed.data.individuals;

  logger.info('pedigree-import.parsed', { count: individuals.length });
  return individuals;
}
