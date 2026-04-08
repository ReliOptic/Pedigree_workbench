import { describe, expect, it } from 'vitest';

import { parsePedigreeImport } from '../../src/services/pedigree-import';
import { PedigreeImportError } from '../../src/types/error.types';

const validPayload = JSON.stringify([
  { id: 'A', label: 'a', gender: 'male', generation: 1 },
  { id: 'B', label: 'b', gender: 'female', generation: 2, sireId: 'A' },
]);

describe('parsePedigreeImport', () => {
  it('parses a flat array payload', () => {
    const result = parsePedigreeImport(validPayload);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('A');
  });

  it('parses an object payload with individuals[]', () => {
    const wrapped = JSON.stringify({ individuals: JSON.parse(validPayload) });
    const result = parsePedigreeImport(wrapped);
    expect(result).toHaveLength(2);
  });

  it('rejects empty payload', () => {
    expect(() => parsePedigreeImport('')).toThrow(PedigreeImportError);
  });

  it('rejects invalid JSON', () => {
    try {
      parsePedigreeImport('{not json');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PedigreeImportError);
      expect((err as PedigreeImportError).kind).toBe('invalid-json');
    }
  });

  it('rejects schema violations and reports issues', () => {
    const bad = JSON.stringify([{ id: 'A', label: 'a', gender: 'alien', generation: 1 }]);
    try {
      parsePedigreeImport(bad);
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(PedigreeImportError);
      const importErr = err as PedigreeImportError;
      expect(importErr.kind).toBe('schema-violation');
      expect(importErr.issues?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('rejects oversized payloads', () => {
    const huge = 'x'.repeat(6 * 1024 * 1024);
    try {
      parsePedigreeImport(huge);
      expect.fail('expected throw');
    } catch (err) {
      expect((err as PedigreeImportError).kind).toBe('too-large');
    }
  });
});
