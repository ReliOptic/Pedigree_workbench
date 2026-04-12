import { describe, expect, it } from 'vitest';
import { computeInbreedingCoefficient, computeAllCOI, predictOffspringCOI } from '../../src/services/kinship';
import type { Individual } from '../../src/types/pedigree.types';

// Test pedigree: Full-sibling mating
// F0: Sire(S), Dam(D)  — unrelated founders
// F1: Son(A, sire=S, dam=D), Daughter(B, sire=S, dam=D) — full siblings
// F2: Child(C, sire=A, dam=B) — offspring of full siblings, expected F=0.25
const fullSibMating: Individual[] = [
  { id: 'S', sex: 'M', generation: 'F0', fields: {} },
  { id: 'D', sex: 'F', generation: 'F0', fields: {} },
  { id: 'A', sex: 'M', generation: 'F1', sire: 'S', dam: 'D', fields: {} },
  { id: 'B', sex: 'F', generation: 'F1', sire: 'S', dam: 'D', fields: {} },
  { id: 'C', sex: 'M', generation: 'F2', sire: 'A', dam: 'B', fields: {} },
];

// Test pedigree: Half-sibling mating
// F0: Sire(S), Dam1(D1), Dam2(D2) — unrelated
// F1: Son(A, sire=S, dam=D1), Daughter(B, sire=S, dam=D2) — half siblings
// F2: Child(C, sire=A, dam=B) — expected F=0.125
const halfSibMating: Individual[] = [
  { id: 'S', sex: 'M', generation: 'F0', fields: {} },
  { id: 'D1', sex: 'F', generation: 'F0', fields: {} },
  { id: 'D2', sex: 'F', generation: 'F0', fields: {} },
  { id: 'A', sex: 'M', generation: 'F1', sire: 'S', dam: 'D1', fields: {} },
  { id: 'B', sex: 'F', generation: 'F1', sire: 'S', dam: 'D2', fields: {} },
  { id: 'C', sex: 'M', generation: 'F2', sire: 'A', dam: 'B', fields: {} },
];

describe('computeInbreedingCoefficient', () => {
  it('returns 0 for founders (no known parents)', () => {
    expect(computeInbreedingCoefficient('S', fullSibMating)).toBe(0);
    expect(computeInbreedingCoefficient('D', fullSibMating)).toBe(0);
  });

  it('returns 0 for individuals whose parents are unrelated', () => {
    expect(computeInbreedingCoefficient('A', fullSibMating)).toBe(0);
  });

  it('returns ~0.25 for offspring of full siblings', () => {
    // Textbook: F(full-sib offspring) = 0.25
    const f = computeInbreedingCoefficient('C', fullSibMating);
    expect(f).toBeCloseTo(0.25, 2);
  });

  it('returns ~0.125 for offspring of half siblings', () => {
    // Textbook: F(half-sib offspring) = 0.125
    const f = computeInbreedingCoefficient('C', halfSibMating);
    expect(f).toBeCloseTo(0.125, 3);
  });

  it('returns 0 for non-existent individual', () => {
    expect(computeInbreedingCoefficient('MISSING', fullSibMating)).toBe(0);
  });

  it('returns 0 when parents are not in dataset', () => {
    const orphan: Individual[] = [
      { id: 'X', sire: 'unknown1', dam: 'unknown2', fields: {} },
    ];
    expect(computeInbreedingCoefficient('X', orphan)).toBe(0);
  });
});

describe('computeAllCOI', () => {
  it('returns results for all individuals', () => {
    const results = computeAllCOI(fullSibMating);
    expect(results).toHaveLength(5);
  });

  it('classifies risk correctly', () => {
    const results = computeAllCOI(fullSibMating);
    const cResult = results.find(r => r.id === 'C');
    // F=0.25 >= 0.125 → 'high'
    expect(cResult?.coefficient).toBeCloseTo(0.25, 2);
    expect(cResult?.risk).toBe('high');

    const sResult = results.find(r => r.id === 'S');
    expect(sResult?.risk).toBe('none');
  });

  it('classifies half-sib offspring as moderate (F=0.125)', () => {
    const results = computeAllCOI(halfSibMating);
    const cResult = results.find(r => r.id === 'C');
    // F(half-sib offspring) = 0.125 → 'high' (>= 0.125)
    expect(cResult?.coefficient).toBeCloseTo(0.125, 3);
    expect(cResult?.risk).toBe('high');
  });

  it('classifies first-cousin offspring as moderate', () => {
    // First-cousin mating: F(offspring) = 0.0625
    const firstCousinMating: Individual[] = [
      { id: 'GP1', sex: 'M', generation: 'F0', fields: {} },
      { id: 'GP2', sex: 'F', generation: 'F0', fields: {} },
      { id: 'UR1', sex: 'F', generation: 'F0', fields: {} },
      { id: 'UR2', sex: 'F', generation: 'F0', fields: {} },
      { id: 'P1', sex: 'M', generation: 'F1', sire: 'GP1', dam: 'GP2', fields: {} },
      { id: 'P2', sex: 'F', generation: 'F1', sire: 'GP1', dam: 'GP2', fields: {} },
      { id: 'U', sex: 'M', generation: 'F2', sire: 'P1', dam: 'UR1', fields: {} },
      { id: 'CO', sex: 'F', generation: 'F2', sire: 'P2', dam: 'UR2', fields: {} },
      { id: 'O', sex: 'M', generation: 'F3', sire: 'U', dam: 'CO', fields: {} },
    ];
    const results = computeAllCOI(firstCousinMating);
    const oResult = results.find(r => r.id === 'O');
    expect(oResult?.coefficient).toBeCloseTo(0.0625, 4);
    expect(oResult?.risk).toBe('moderate');
  });
});

describe('predictOffspringCOI', () => {
  it('predicts COI for full-sibling mating', () => {
    // Textbook: F(offspring of full siblings) = 0.25
    const f = predictOffspringCOI('A', 'B', fullSibMating);
    expect(f).toBeCloseTo(0.25, 2);
  });

  it('predicts 0 for unrelated pair', () => {
    const f = predictOffspringCOI('S', 'D', fullSibMating);
    expect(f).toBe(0);
  });

  it('returns 0 when either parent is missing', () => {
    expect(predictOffspringCOI('S', 'MISSING', fullSibMating)).toBe(0);
    expect(predictOffspringCOI('MISSING', 'D', fullSibMating)).toBe(0);
  });
});
