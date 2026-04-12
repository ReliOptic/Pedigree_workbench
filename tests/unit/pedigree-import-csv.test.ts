import { describe, expect, it } from 'vitest';

import { applyMapping, parseCsv, type ColumnMapping } from '../../src/services/pedigree-import-csv';

describe('parseCsv', () => {
  it('extracts headers, rows, and auto-suggests mapping for known columns', () => {
    const csv = 'id,sire,dam,sex,generation,color\nA,S1,D1,M,F0,red\nB,S2,D2,F,F1,blue';
    const result = parseCsv(csv);

    expect(result.headers).toEqual(['id', 'sire', 'dam', 'sex', 'generation', 'color']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ id: 'A', sire: 'S1', dam: 'D1', sex: 'M', generation: 'F0', color: 'red' });

    // Auto-suggested mapping should detect reserved fields
    const mapped = Object.fromEntries(result.suggestedMapping.map((m) => [m.fileColumn, m.targetField]));
    expect(mapped['id']).toBe('id');
    expect(mapped['sire']).toBe('sire');
    expect(mapped['dam']).toBe('dam');
    expect(mapped['sex']).toBe('sex');
    expect(mapped['generation']).toBe('generation');
    expect(mapped['color']).toBe('free');
  });

  it('auto-detects Korean column aliases', () => {
    const csv = '개체번호,아비,어미,성별\nA1,S1,D1,수컷';
    const result = parseCsv(csv);

    const mapped = Object.fromEntries(result.suggestedMapping.map((m) => [m.fileColumn, m.targetField]));
    expect(mapped['개체번호']).toBe('id');
    expect(mapped['아비']).toBe('sire');
    expect(mapped['어미']).toBe('dam');
    expect(mapped['성별']).toBe('sex');
  });

  it('handles alternative English aliases', () => {
    const csv = 'ID,father,mother,gender,gen,litter,birthDate\nX,P1,P2,M,F0,G1,2024-01-01';
    const result = parseCsv(csv);

    const mapped = Object.fromEntries(result.suggestedMapping.map((m) => [m.fileColumn, m.targetField]));
    expect(mapped['ID']).toBe('id');
    expect(mapped['father']).toBe('sire');
    expect(mapped['mother']).toBe('dam');
    expect(mapped['gender']).toBe('sex');
    expect(mapped['gen']).toBe('generation');
    expect(mapped['litter']).toBe('group');
    expect(mapped['birthDate']).toBe('birth_date');
  });

  it('does not map two columns to the same reserved field', () => {
    const csv = 'id,ID,name\nA,B,C';
    const result = parseCsv(csv);

    const idMappings = result.suggestedMapping.filter((m) => m.targetField === 'id');
    expect(idMappings).toHaveLength(1);

    // The second "ID" column should fall back to 'free'
    const secondColumn = result.suggestedMapping.find((m) => m.fileColumn === 'ID');
    expect(secondColumn?.targetField).toBe('free');
  });

  it('handles empty CSV gracefully', () => {
    const csv = '';
    const result = parseCsv(csv);
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.suggestedMapping).toEqual([]);
  });

  it('skips empty lines', () => {
    const csv = 'id,sex\nA,M\n\nB,F\n';
    const result = parseCsv(csv);
    expect(result.rows).toHaveLength(2);
  });
});

describe('applyMapping', () => {
  it('produces Individual records from mapped rows', () => {
    const rows = [
      { col_id: 'IND-1', col_sire: 'P1', col_dam: 'P2', col_sex: 'M', custom: 'value1' },
      { col_id: 'IND-2', col_sire: 'P3', col_dam: 'P4', col_sex: 'F', custom: 'value2' },
    ];
    const mapping: ColumnMapping[] = [
      { fileColumn: 'col_id', targetField: 'id' },
      { fileColumn: 'col_sire', targetField: 'sire' },
      { fileColumn: 'col_dam', targetField: 'dam' },
      { fileColumn: 'col_sex', targetField: 'sex' },
      { fileColumn: 'custom', targetField: 'free' },
    ];

    const result = applyMapping(rows, mapping);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'IND-1',
      sire: 'P1',
      dam: 'P2',
      sex: 'M',
      fields: { custom: 'value1' },
    });
    expect(result[1]).toEqual({
      id: 'IND-2',
      sire: 'P3',
      dam: 'P4',
      sex: 'F',
      fields: { custom: 'value2' },
    });
  });

  it('skips ignored columns', () => {
    const rows = [{ col_id: 'A', junk: 'discard', note: 'keep' }];
    const mapping: ColumnMapping[] = [
      { fileColumn: 'col_id', targetField: 'id' },
      { fileColumn: 'junk', targetField: 'ignore' },
      { fileColumn: 'note', targetField: 'free' },
    ];

    const result = applyMapping(rows, mapping);
    expect(result).toHaveLength(1);
    expect(result[0]!.fields).toEqual({ note: 'keep' });
    expect(result[0]!.fields).not.toHaveProperty('junk');
  });

  it('skips rows with empty or missing id', () => {
    const rows = [
      { col_id: 'A', name: 'first' },
      { col_id: '', name: 'second' },
      { col_id: '  ', name: 'third' },
    ];
    const mapping: ColumnMapping[] = [
      { fileColumn: 'col_id', targetField: 'id' },
      { fileColumn: 'name', targetField: 'free' },
    ];

    const result = applyMapping(rows, mapping);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('A');
  });

  it('maps birth_date to birthDate on Individual', () => {
    const rows = [{ col_id: 'A', bdate: '2024-01-15' }];
    const mapping: ColumnMapping[] = [
      { fileColumn: 'col_id', targetField: 'id' },
      { fileColumn: 'bdate', targetField: 'birth_date' },
    ];

    const result = applyMapping(rows, mapping);
    expect(result[0]!.birthDate).toBe('2024-01-15');
  });

  it('maps sequence_source to sequenceSource on Individual', () => {
    const rows = [{ col_id: 'A', src: 'PCR' }];
    const mapping: ColumnMapping[] = [
      { fileColumn: 'col_id', targetField: 'id' },
      { fileColumn: 'src', targetField: 'sequence_source' },
    ];

    const result = applyMapping(rows, mapping);
    expect(result[0]!.sequenceSource).toBe('PCR');
  });

  it('collects multiple free fields into fields record', () => {
    const rows = [{ col_id: 'A', color: 'red', weight: '10kg' }];
    const mapping: ColumnMapping[] = [
      { fileColumn: 'col_id', targetField: 'id' },
      { fileColumn: 'color', targetField: 'free' },
      { fileColumn: 'weight', targetField: 'free' },
    ];

    const result = applyMapping(rows, mapping);
    expect(result[0]!.fields).toEqual({ color: 'red', weight: '10kg' });
  });

  it('omits optional fields that have empty values', () => {
    const rows = [{ col_id: 'A', col_sire: '', col_dam: '  ' }];
    const mapping: ColumnMapping[] = [
      { fileColumn: 'col_id', targetField: 'id' },
      { fileColumn: 'col_sire', targetField: 'sire' },
      { fileColumn: 'col_dam', targetField: 'dam' },
    ];

    const result = applyMapping(rows, mapping);
    expect(result[0]).toEqual({ id: 'A', fields: {} });
    expect(result[0]).not.toHaveProperty('sire');
    expect(result[0]).not.toHaveProperty('dam');
  });
});
