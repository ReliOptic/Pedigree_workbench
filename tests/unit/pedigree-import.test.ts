import { describe, expect, it } from 'vitest';

import {
  analyzePedigreeWarnings,
  parsePedigreeImport,
} from '../../src/services/pedigree-import';
import { PedigreeImportError } from '../../src/types/error.types';
import type { Individual } from '../../src/types/pedigree.types';

const validPayload = JSON.stringify([
  { id: 'A', sex: 'M', generation: 'F0', label: '01' },
  { id: 'B', sex: 'F', generation: 'F1', sire: 'A', label: '02' },
]);

describe('parsePedigreeImport', () => {
  it('parses a flat array payload', () => {
    const result = parsePedigreeImport(validPayload);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('A');
    expect(result[1]?.sire).toBe('A');
  });

  it('parses an object payload with individuals[]', () => {
    const wrapped = JSON.stringify({ individuals: JSON.parse(validPayload) });
    const result = parsePedigreeImport(wrapped);
    expect(result).toHaveLength(2);
  });

  it('maps birth_date → birthDate and every row has a fields object', () => {
    const payload = JSON.stringify([{ id: 'X', birth_date: '2025-07-13' }]);
    const [row] = parsePedigreeImport(payload);
    expect(row?.birthDate).toBe('2025-07-13');
    expect(row?.fields).toEqual({});
  });

  it('captures unknown columns into fields', () => {
    const payload = JSON.stringify([{ id: 'X', CD163: '100.00%', 부: 'DD' }]);
    const [row] = parsePedigreeImport(payload);
    expect(row?.fields).toEqual({ CD163: '100.00%', 부: 'DD' });
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

  it('rejects schema violations (missing id) and reports issues', () => {
    const bad = JSON.stringify([{ sex: 'M' }]);
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

describe('analyzePedigreeWarnings', () => {
  const row = (id: string, extra: Partial<Individual> = {}): Individual => ({
    id,
    fields: {},
    ...extra,
  });

  it('returns no warnings for a clean dataset', () => {
    expect(
      analyzePedigreeWarnings([
        row('A', { sex: 'M' }),
        row('B', { sex: 'F' }),
        row('C', { sire: 'A', dam: 'B' }),
      ]),
    ).toEqual([]);
  });

  it('flags orphan sire references', () => {
    const warnings = analyzePedigreeWarnings([
      row('A'),
      row('B', { sire: 'missing-dad' }),
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.kind).toBe('orphan-sire');
    expect(warnings[0]?.id).toBe('B');
    expect(warnings[0]?.detail).toBe('missing-dad');
  });

  it('flags orphan dam references', () => {
    const warnings = analyzePedigreeWarnings([
      row('A'),
      row('B', { dam: 'missing-mom' }),
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.kind).toBe('orphan-dam');
    expect(warnings[0]?.detail).toBe('missing-mom');
  });

  it('flags duplicate ids exactly once', () => {
    const warnings = analyzePedigreeWarnings([row('X'), row('X'), row('X')]);
    const dup = warnings.filter((w) => w.kind === 'duplicate-id');
    expect(dup).toHaveLength(1);
    expect(dup[0]?.id).toBe('X');
  });

  it('flags self-references instead of treating them as orphans', () => {
    const warnings = analyzePedigreeWarnings([row('A', { sire: 'A' })]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.kind).toBe('self-reference');
    expect(warnings[0]?.detail).toBe('sire');
  });
});
